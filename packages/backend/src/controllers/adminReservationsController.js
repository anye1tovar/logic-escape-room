const { deflateRawSync } = require("zlib");

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createZip(files) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  for (const [name, content] of Object.entries(files)) {
    const nameBuffer = Buffer.from(name);
    const data = Buffer.from(content, "utf8");
    const compressed = deflateRawSync(data);
    const checksum = crc32(data);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0x800, 6);
    local.writeUInt16LE(8, 8);
    local.writeUInt32LE(checksum, 14);
    local.writeUInt32LE(compressed.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(nameBuffer.length, 26);
    localParts.push(local, nameBuffer, compressed);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0x800, 8);
    central.writeUInt16LE(8, 10);
    central.writeUInt32LE(checksum, 16);
    central.writeUInt32LE(compressed.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBuffer.length, 28);
    central.writeUInt32LE(offset, 42);
    centralParts.push(central, nameBuffer);
    offset += local.length + nameBuffer.length + compressed.length;
  }
  const centralDirectory = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(Object.keys(files).length, 8);
  end.writeUInt16LE(Object.keys(files).length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...localParts, centralDirectory, end]);
}

function buildAdminReservationsController(service) {
  async function exportCustomers(req, res) {
    try {
      const reservations = await service.listAllReservations();
      const rooms = await service.listRooms();
      const roomNames = new Map((rooms || []).map((room) => [Number(room.id), room.name]));
      const headers = ["#", "Fecha y Hora", "Sala", "Cliente", "Teléfono", "Pax", "Total", "Notas", "Estado", "Tiempo (mm:ss.hh)"];
      const rows = (reservations || []).map((r) => [
        r.id,
        `${r.date || ""} ${String(r.start_time || "").slice(0, 5)}`.trim(),
        roomNames.get(Number(r.room_id)) || `Room #${r.room_id}`,
        [r.first_name, r.last_name, r.consult_code].filter(Boolean).join(" "),
        r.phone || "",
        r.players,
        [`Total ${r.total == null ? "" : r.total}`, `Pagado ${r.total_paid || 0}`, `Pendiente ${r.pending_amount || 0}`].join(" | "),
        r.notes || "",
        r.status || "",
        formatDuration(r.actual_duration_ms),
      ]);
      const xmlEscape = (value) => String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&apos;");
      const columnName = (index) => {
        let name = "";
        for (let n = index + 1; n; n = Math.floor((n - 1) / 26)) name = String.fromCharCode(65 + ((n - 1) % 26)) + name;
        return name;
      };
      const allRows = [headers, ...rows];
      const sheetRows = allRows.map((row, rowIndex) => `<row r="${rowIndex + 1}">${row.map((value, columnIndex) => `<c r="${columnName(columnIndex)}${rowIndex + 1}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(value)}</t></is></c>`).join("")}</row>`).join("");
      const workbook = createZip({
        "[Content_Types].xml": `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`,
        "_rels/.rels": `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
        "xl/workbook.xml": `<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Reservas" sheetId="1" r:id="rId1"/></sheets></workbook>`,
        "xl/_rels/workbook.xml.rels": `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`,
        "xl/worksheets/sheet1.xml": `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheetRows}</sheetData></worksheet>`,
      });
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", 'attachment; filename="reservas.xlsx"');
      res.send(workbook);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }

  function formatDuration(value) {
    if (value == null || !Number.isFinite(Number(value))) return "";
    const ms = Math.max(0, Math.trunc(Number(value)));
    return `${String(Math.floor(ms / 60000)).padStart(2, "0")}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")}.${String(Math.floor((ms % 1000) / 10)).padStart(2, "0")}`;
  }

  async function listReservations(req, res) {
    try {
      const source = req.method === "POST" ? req.body : req.query;
      const rawFilters = source?.filters && typeof source.filters === "object" ? source.filters : null;
      const dateFrom = rawFilters?.dateFrom ?? rawFilters?.from ?? source?.dateFrom ?? source?.from;
      const dateTo = rawFilters?.dateTo ?? rawFilters?.to ?? source?.dateTo ?? source?.to;
      const date = rawFilters?.date ?? source?.date;
      const search = rawFilters?.search ?? source?.search ?? source?.name;
      const page = source?.page;
      const pageSize = source?.pageSize ?? source?.size;

      const payload = await service.listReservationsPage({
        filters: { dateFrom, dateTo, date, search },
        page,
        pageSize,
      });
      res.json(payload);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }

  async function updateReservation(req, res) {
    try {
      const result = await service.updateReservation(req.params.id, req.body, {
        user: req.user,
      });
      res.json(result);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }

  async function deleteReservation(req, res) {
    try {
      const result = await service.deleteReservation(req.params.id);
      res.json(result);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }

  async function listReservationPayments(req, res) {
    try {
      const payments = await service.listReservationPayments(req.params.id);
      res.json(payments);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }

  async function createReservationPayment(req, res) {
    try {
      const payment = await service.createReservationPayment(
        req.params.id,
        req.body,
        { user: req.user }
      );
      res.status(201).json(payment);
    } catch (err) {
      res
        .status(err.status || 500)
        .json({ error: err.message, code: err.code });
    }
  }

  async function voidReservationPayment(req, res) {
    try {
      const payment = await service.voidReservationPayment(
        req.params.id,
        req.params.paymentId,
        req.body,
        { user: req.user }
      );
      res.json(payment);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }

  async function startTimer(req, res) {
    try {
      const result = await service.startTimer(req.params.id, req.body);
      res.json(result);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }

  async function saveTimer(req, res) {
    try {
      const result = await service.saveTimer(req.params.id, req.body);
      res.json(result);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }

  return {
    exportCustomers,
    listReservations,
    updateReservation,
    deleteReservation,
    listReservationPayments,
    createReservationPayment,
    voidReservationPayment,
    startTimer,
    saveTimer,
  };
}

module.exports = buildAdminReservationsController;
