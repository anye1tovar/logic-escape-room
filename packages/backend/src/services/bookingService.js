const crypto = require("crypto");

/**
 * bookingService: contains business logic and uses a consumer for persistence.
 * The consumer must implement: createBooking({name,date}), getBookingById(id), listBookings()
 */

function buildBookingService(consumer, deps = {}) {
  const TIMEZONE = "America/Bogota";
  const TIMEZONE_OFFSET_MINUTES = -5 * 60; // Bogota has fixed UTC-5
  const MIN_ADVANCE_MINUTES = 40;
  const SLOT_DURATION_MINUTES = 90;
  const MAX_CONSULT_CODE_LENGTH = 15;

  function pad2(value) {
    return String(value).padStart(2, "0");
  }

  function formatIsoWithFixedOffset(date, offsetMinutes) {
    const offsetSign = offsetMinutes < 0 ? "-" : "+";
    const abs = Math.abs(offsetMinutes);
    const oh = pad2(Math.floor(abs / 60));
    const om = pad2(abs % 60);

    const shifted = new Date(date.getTime() + offsetMinutes * 60_000);
    const yyyy = shifted.getUTCFullYear();
    const mm = pad2(shifted.getUTCMonth() + 1);
    const dd = pad2(shifted.getUTCDate());
    const hh = pad2(shifted.getUTCHours());
    const min = pad2(shifted.getUTCMinutes());
    const ss = pad2(shifted.getUTCSeconds());

    return `${yyyy}-${mm}-${dd}T${hh}:${min}:${ss}${offsetSign}${oh}:${om}`;
  }

  function bogotaNowIso() {
    return formatIsoWithFixedOffset(new Date(), TIMEZONE_OFFSET_MINUTES);
  }

  function bogotaTodayDateString() {
    const shifted = new Date(Date.now() + TIMEZONE_OFFSET_MINUTES * 60_000);
    const yyyy = shifted.getUTCFullYear();
    const mm = pad2(shifted.getUTCMonth() + 1);
    const dd = pad2(shifted.getUTCDate());
    return `${yyyy}-${mm}-${dd}`;
  }

  function parseDateParam(date) {
    if (typeof date !== "string") return null;
    const trimmed = date.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
    return trimmed;
  }

  function generateSlotStarts(dateString, startMinutes, endMinutes) {
    const slots = [];
    for (
      let minutes = startMinutes;
      minutes < endMinutes;
      minutes += SLOT_DURATION_MINUTES
    ) {
      const hh = pad2(Math.floor(minutes / 60));
      const mm = pad2(minutes % 60);
      slots.push(`${dateString}T${hh}:${mm}:00-05:00`);
    }
    return slots;
  }

  function normalizeBookingStartToIso(dateString, value) {
    if (!value) return null;
    const raw = String(value).trim();
    if (!raw) return null;
    if (raw.includes("T")) return raw;
    if (/^\d{2}:\d{2}$/.test(raw)) return `${dateString}T${raw}:00-05:00`;
    return null;
  }

  function isPrivilegedUser(user) {
    const role = String(user?.role || "").toLowerCase();
    return role === "admin" || role === "game_master";
  }

  function slugify(value) {
    return String(value)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  function randomBase32(length) {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    const bytes = crypto.randomBytes(length);
    let out = "";
    for (let i = 0; i < length; i += 1) {
      out += alphabet[bytes[i] % alphabet.length];
    }
    return out;
  }

  function generateConsultCode() {
    return `LG${randomBase32(13)}`;
  }

  function isUniqueViolation(err) {
    const code = err?.code || err?.sqlState || "";
    if (code === "23505") return true;
    const message = String(err?.message || "").toLowerCase();
    return (
      message.includes("consult_code") || message.includes("unique")
    );
  }

  function splitName(fullName) {
    const parts = String(fullName || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (parts.length === 0) return { firstName: "", lastName: "" };
    if (parts.length === 1) return { firstName: parts[0], lastName: "" };
    return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
  }

  function derivePublicRoomId(roomRow) {
    const cover = (
      roomRow?.coverImage ||
      roomRow?.cover_image ||
      ""
    ).trim();
    const match = cover.match(/([^/\\]+)\.(png|jpg|jpeg|webp)$/i);
    if (match?.[1]) return slugify(match[1]);
    return slugify(roomRow?.name || String(roomRow?.id ?? "room"));
  }

  function mapDifficulty(value) {
    if (typeof value === "string") return value;
    const num = Number(value);
    if (!Number.isFinite(num)) return "unknown";
    if (num <= 1) return "easy";
    if (num === 2) return "medium";
    return "hard";
  }

  async function listRoomsForAvailability() {
    const roomsService = deps.roomsService;
    const roomsConsumer = deps.roomsConsumer;

    if (roomsService?.listRooms) return roomsService.listRooms();
    if (roomsConsumer?.listRooms) return roomsConsumer.listRooms();

    const err = new Error(
      "Rooms provider is required for availability (roomsService or roomsConsumer)."
    );
    err.status = 500;
    throw err;
  }

  async function getOpeningHoursForDate(dateString) {
    const openingHoursConsumer = deps.openingHoursConsumer;
    if (!openingHoursConsumer?.getOpeningHoursByDayOfWeek) {
      const err = new Error(
        "openingHoursConsumer is required for availability slot generation."
      );
      err.status = 500;
      throw err;
    }

    const colombianHolidaysConsumer = deps.colombianHolidaysConsumer;
    if (!colombianHolidaysConsumer?.isHoliday) {
      const err = new Error(
        "colombianHolidaysConsumer is required for holiday availability rules."
      );
      err.status = 500;
      throw err;
    }

    const isHoliday = await colombianHolidaysConsumer.isHoliday(dateString);

    // Use midday in Bogota to avoid DST/day boundary issues.
    const actualDayOfWeek = new Date(
      `${dateString}T12:00:00-05:00`
    ).getUTCDay();
    const dayOfWeek = isHoliday ? 0 : actualDayOfWeek;

    const row = await openingHoursConsumer.getOpeningHoursByDayOfWeek(
      dayOfWeek
    );
    return row;
  }

  async function getDayTypeForDate(dateString) {
    const colombianHolidaysConsumer = deps.colombianHolidaysConsumer;
    if (!colombianHolidaysConsumer?.isHoliday) {
      const err = new Error(
        "colombianHolidaysConsumer is required for day type calculation."
      );
      err.status = 500;
      throw err;
    }

    const isHoliday = await colombianHolidaysConsumer.isHoliday(dateString);
    const actualDayOfWeek = new Date(
      `${dateString}T12:00:00-05:00`
    ).getUTCDay();
    const isWeekend =
      isHoliday ||
      actualDayOfWeek === 0 ||
      actualDayOfWeek === 5 ||
      actualDayOfWeek === 6;
    return { isHoliday, dayType: isWeekend ? "weekend" : "weekday" };
  }

  function pickRateForAttendees(rates, attendees) {
    const count = Number(attendees);
    if (!Number.isFinite(count) || count <= 0) return null;
    const list = Array.isArray(rates) ? rates : [];
    if (list.length === 0) return null;

    const exact = list.find((r) => Number(r.players) === count);
    if (exact) return exact;

    const sorted = [...list].sort(
      (a, b) => Number(b.players) - Number(a.players)
    );
    const floor = sorted.find((r) => Number(r.players) <= count);
    if (floor) return floor;

    return sorted[sorted.length - 1] || null;
  }

  async function getBookingQuote({ date, attendees }) {
    const requestedDate = parseDateParam(date);
    if (!requestedDate) {
      const err = new Error("Missing required query param: date");
      err.status = 400;
      throw err;
    }

    const { isHoliday, dayType } = await getDayTypeForDate(requestedDate);

    const ratesService = deps.ratesService;
    const ratesConsumer = deps.ratesConsumer;
    const listRates = ratesService?.listRates || ratesConsumer?.listRates;
    if (!listRates) {
      const err = new Error(
        "Rates provider is required for quote calculation."
      );
      err.status = 500;
      throw err;
    }

    const rates = await listRates(dayType);
    const rate = pickRateForAttendees(rates, attendees);
    if (!rate) {
      const err = new Error("No rate configured for this booking.");
      err.status = 400;
      throw err;
    }

    const pricePerPerson = Number(rate.price_per_person ?? rate.pricePerPerson);
    const players = Number(attendees);
    if (!Number.isFinite(pricePerPerson) || !Number.isFinite(players)) {
      const err = new Error("Invalid rate configuration.");
      err.status = 500;
      throw err;
    }

    return {
      date: requestedDate,
      dayType,
      isHoliday,
      players,
      currency: rate.currency || "COP",
      pricePerPerson,
      total: pricePerPerson * players,
    };
  }

  function timeToMinutes(value) {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    const match = trimmed.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return null;
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
    return hours * 60 + minutes;
  }

  function normalizeReservationSource(value) {
    const raw = String(value || "").trim().toLowerCase();
    if (!raw) return "web";
    if (raw === "walk_in" || raw === "walk-in" || raw === "walkin")
      return "walk_in";
    return "web";
  }

  async function createBooking(data, options = {}) {
    const {
      firstName,
      lastName,
      name,
      date,
      roomId,
      time,
      endTime,
      attendees,
      whatsapp,
      notes,
      isFirstTime,
    } = data;
    const reservationSource = normalizeReservationSource(
      data?.reservationSource ?? data?.reservation_source
    );
    const isWalkIn = reservationSource === "walk_in";
    const outOfHoursRaw = data?.outOfHours ?? data?.out_of_hours;
    const isOutOfHours =
      outOfHoursRaw === true ||
      outOfHoursRaw === "true" ||
      outOfHoursRaw === 1 ||
      outOfHoursRaw === "1";
    const user = options?.user ?? null;
    if (isWalkIn && !user) {
      const err = new Error("Unauthorized");
      err.status = 401;
      throw err;
    }
    if (isWalkIn && user && !isPrivilegedUser(user)) {
      const err = new Error("Forbidden");
      err.status = 403;
      throw err;
    }
    if (isOutOfHours && !user) {
      const err = new Error("Unauthorized");
      err.status = 401;
      throw err;
    }
    if (isOutOfHours && user && !isPrivilegedUser(user)) {
      const err = new Error("Forbidden");
      err.status = 403;
      throw err;
    }
    if (!date || !roomId || !time) {
      const err = new Error("Missing required fields: date, roomId, time");
      err.status = 400;
      throw err;
    }

    const requestedDate = parseDateParam(date);
    if (!requestedDate) {
      const err = new Error("Invalid date format. Use YYYY-MM-DD.");
      err.status = 400;
      throw err;
    }
    if (!isWalkIn && requestedDate < bogotaTodayDateString()) {
      const err = new Error("Date cannot be in the past");
      err.status = 400;
      throw err;
    }

    const startIso = normalizeBookingStartToIso(requestedDate, time);
    if (!startIso) {
      const err = new Error("Invalid time format.");
      err.status = 400;
      throw err;
    }

    const endIso =
      normalizeBookingStartToIso(requestedDate, endTime) ||
      formatIsoWithFixedOffset(
        new Date(Date.parse(startIso) + SLOT_DURATION_MINUTES * 60_000),
        TIMEZONE_OFFSET_MINUTES
      );

    let resolvedRoomName = null;
    let resolvedRoomDbId = null;
    let resolvedRoomRow = null;
    try {
      const rooms = await listRoomsForAvailability();
      const match =
        (rooms || []).find(
          (roomRow) => derivePublicRoomId(roomRow) === roomId
        ) || null;
      resolvedRoomRow = match;
      resolvedRoomName = match?.name || null;
      resolvedRoomDbId = match?.id != null ? Number(match.id) : null;
    } catch (err) {
      resolvedRoomName = null;
      resolvedRoomDbId = null;
      resolvedRoomRow = null;
    }

    if (!Number.isFinite(resolvedRoomDbId) || resolvedRoomDbId <= 0) {
      const err = new Error("Invalid roomId.");
      err.status = 400;
      throw err;
    }

    // Validate availability again on reservation create.
    if (!isOutOfHours) {
      const availability = await getAvailabilityByDate(requestedDate, {
        allowPast: isWalkIn,
        ignoreMinAdvance: isWalkIn,
      });
      const room = (availability?.rooms || []).find((r) => r.roomId === roomId);
      const slot = room?.slots?.find((s) => s.start === startIso) || null;
      if (!room || !slot) {
        const err = new Error(
          "Este horario no existe para la fecha seleccionada."
        );
        err.status = 400;
        throw err;
      }
      if (!slot.available) {
        const err = new Error("Este horario ya no esta disponible.");
        err.status = 409;
        throw err;
      }
    } else {
      const list = consumer.listBookingsByDate
        ? await consumer.listBookingsByDate(requestedDate)
        : await consumer.listBookings();
      const targetRoomId = String(resolvedRoomDbId);
      const normalizedStart = normalizeBookingStartToIso(
        requestedDate,
        startIso
      );
      const normalizedEnd = normalizeBookingStartToIso(requestedDate, endIso);
      const conflict = (list || []).some((booking) => {
        const bookingDate = booking.date ?? booking.booking_date ?? null;
        if (bookingDate && String(bookingDate) !== requestedDate) return false;
        const bookingRoomRaw = `${
          booking.room_id ?? booking.roomId ?? ""
        }`.trim();
        if (bookingRoomRaw !== targetRoomId) return false;
        const startRaw =
          booking.start_time ?? booking.time ?? booking.startTime ?? null;
        const endRaw =
          booking.end_time ?? booking.endTime ?? booking.time ?? null;
        const existingStart = normalizeBookingStartToIso(
          requestedDate,
          startRaw
        );
        const existingEnd =
          normalizeBookingStartToIso(requestedDate, endRaw) || existingStart;
        if (!existingStart || !existingEnd || !normalizedStart || !normalizedEnd)
          return false;
        const newStartMs = Date.parse(normalizedStart);
        const newEndMs = Date.parse(normalizedEnd);
        const existingStartMs = Date.parse(existingStart);
        const existingEndMs = Date.parse(existingEnd);
        if (
          Number.isNaN(newStartMs) ||
          Number.isNaN(newEndMs) ||
          Number.isNaN(existingStartMs) ||
          Number.isNaN(existingEndMs)
        )
          return false;
        return newStartMs < existingEndMs && newEndMs > existingStartMs;
      });
      if (conflict) {
        const err = new Error("Este horario ya no esta disponible.");
        err.status = 409;
        throw err;
      }
    }

    const players = Number(attendees);
    if (!Number.isFinite(players)) {
      const err = new Error("Invalid attendees value.");
      err.status = 400;
      throw err;
    }
    const minPlayers = Number(
      resolvedRoomRow?.min_players ?? resolvedRoomRow?.minPlayers
    );
    const maxPlayers = Number(
      resolvedRoomRow?.max_players ?? resolvedRoomRow?.maxPlayers
    );
    if (
      Number.isFinite(minPlayers) &&
      Number.isFinite(maxPlayers) &&
      (players < minPlayers || players > maxPlayers)
    ) {
      const err = new Error("NÃºmero de jugadores invÃ¡lido para esta sala.");
      err.status = 400;
      throw err;
    }

    const fullName = String(name || `${firstName || ""} ${lastName || ""}`)
      .trim()
      .replace(/\s+/g, " ");

    const nameParts = splitName(fullName);
    const safeFirstName =
      typeof firstName === "string" && firstName.trim()
        ? firstName.trim()
        : nameParts.firstName;
    const safeLastName =
      typeof lastName === "string" && lastName.trim()
        ? lastName.trim()
        : nameParts.lastName;

    const safeNotes =
      typeof notes === "string" && notes.trim() ? notes.trim() : null;

    const quote = await getBookingQuote({
      date: requestedDate,
      attendees: players,
    });
    const finalTotal = quote?.total ?? null;

    let lastErr = null;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const computedConsultCode = generateConsultCode();
      try {
        const booking = await consumer.createBooking({
          firstName: safeFirstName,
          lastName: safeLastName,
          name: fullName,
          whatsapp,
          date: requestedDate,
          roomId: resolvedRoomDbId,
          time: startIso,
          endTime: endIso,
          attendees,
          notes: safeNotes,
          total: finalTotal,
          sendReceipt: data.sendReceipt,
          consultCode: computedConsultCode,
          isFirstTime: Boolean(isFirstTime),
          reservationSource,
          outOfHours: isOutOfHours,
        });
        return { ...booking, reservationCode: booking.consultCode };
      } catch (err) {
        lastErr = err;
        if (isUniqueViolation(err) && attempt < 2) continue;
        throw err;
      }
    }

    throw lastErr || new Error("Failed to create booking");
  }

  async function listBookings() {
    return consumer.listBookings();
  }

  async function getBooking(id) {
    if (!id) return null;
    return consumer.getBookingById(id);
  }

  function isValidConsultCode(value) {
    if (typeof value !== "string") return false;
    const trimmed = value.trim();
    if (!trimmed) return false;
    if (trimmed.length > MAX_CONSULT_CODE_LENGTH) return false;
    return /^[a-zA-Z0-9\s-]+$/.test(trimmed);
  }

  async function resolveRoomName(roomId) {
    if (roomId == null) return null;

    const roomsService = deps.roomsService;
    const roomsConsumer = deps.roomsConsumer;
    const numericId = Number(roomId);
    const normalizedId = Number.isFinite(numericId) ? numericId : roomId;

    if (roomsService?.getRoom) {
      const room = await roomsService.getRoom(normalizedId);
      return room?.name || null;
    }

    if (roomsConsumer?.getRoomById) {
      const room = await roomsConsumer.getRoomById(normalizedId);
      return room?.name || null;
    }

    const listRooms = roomsService?.listRooms || roomsConsumer?.listRooms;
    if (!listRooms) return null;

    const rooms = await listRooms();
    const match = (rooms || []).find((room) => {
      if (room?.id == null) return false;
      return String(room.id) === String(normalizedId);
    });
    return match?.name || null;
  }

  async function getBookingStatusByConsultCode(code) {
    const consultCode = String(code || "").trim();
    if (!consultCode) {
      const err = new Error("Missing required query param: code");
      err.status = 400;
      throw err;
    }

    if (!isValidConsultCode(consultCode)) {
      const err = new Error("Invalid consultation code");
      err.status = 400;
      throw err;
    }

    if (!consumer.getBookingByConsultCode) {
      const err = new Error("Consultation code lookup not supported");
      err.status = 500;
      throw err;
    }

    const booking = await consumer.getBookingByConsultCode(consultCode);
    if (!booking) return null;

    const roomId = booking.room_id ?? booking.roomId ?? null;
    const roomName = await resolveRoomName(roomId);
    const date = booking.date ?? booking.booking_date ?? null;
    const time =
      booking.start_time ?? booking.time ?? booking.startTime ?? null;

    return {
      consultCode:
        booking.consult_code ?? booking.consultCode ?? String(consultCode),
      status: booking.status ?? null,
      roomId,
      roomName,
      date,
      time,
    };
  }

  async function getAvailabilityByDate(date, options = {}) {
    const requestedDate = parseDateParam(date);
    if (!requestedDate) {
      const err = new Error("Missing required query param: date");
      err.status = 400;
      throw err;
    }
    const allowPast = Boolean(options.allowPast);
    const ignoreMinAdvance = Boolean(options.ignoreMinAdvance);
    const allowOutOfHours = Boolean(options.allowOutOfHours);
    const ignoreReservationId =
      options.ignoreReservationId != null
        ? String(options.ignoreReservationId)
        : null;
    const useDbRoomId = Boolean(options.useDbRoomId);

    if (!allowPast && requestedDate < bogotaTodayDateString()) {
      const err = new Error("Date cannot be in the past");
      err.status = 400;
      throw err;
    }

    const { dayType, isHoliday } = await getDayTypeForDate(requestedDate);

    let rates = [];
    try {
      const ratesService = deps.ratesService;
      const ratesConsumer = deps.ratesConsumer;
      const listRates = ratesService?.listRates || ratesConsumer?.listRates;
      if (listRates) rates = await listRates(dayType);
    } catch (err) {
      rates = [];
    }

    const list = consumer.listBookingsByDate
      ? await consumer.listBookingsByDate(requestedDate)
      : await consumer.listBookings();

    const roomRows = await listRoomsForAvailability();
    const activeRooms = (roomRows || []).filter((room) => {
      const active = room.active;
      return (
        active === 1 || active === true || active === "1" || active == null
      );
    });

    const roomsByDbId = new Map(
      activeRooms.filter((r) => r && r.id != null).map((r) => [String(r.id), r])
    );

    const roomKeyByDbId = new Map(
      Array.from(roomsByDbId.entries()).map(([id, room]) => [
        id,
        useDbRoomId ? String(room.id) : derivePublicRoomId(room),
      ])
    );

    const bookedByRoom = new Map();
    for (const booking of list || []) {
      if (
        ignoreReservationId &&
        booking?.id != null &&
        String(booking.id) === ignoreReservationId
      ) {
        continue;
      }
      const bookingDate = booking.date ?? booking.booking_date ?? null;
      if (bookingDate && String(bookingDate) !== requestedDate) continue;

      const bookingRoomRaw = `${
        booking.room_id ?? booking.roomId ?? ""
      }`.trim();
      const bookingRoomId =
        roomKeyByDbId.get(bookingRoomRaw) || bookingRoomRaw;
      const startRaw =
        booking.start_time ?? booking.time ?? booking.startTime ?? null;
      const startIso = normalizeBookingStartToIso(requestedDate, startRaw);
      if (!bookingRoomId || !startIso) continue;

      if (!bookedByRoom.has(bookingRoomId))
        bookedByRoom.set(bookingRoomId, new Set());
      bookedByRoom.get(bookingRoomId).add(startIso);
    }

    const nowIso = bogotaNowIso();
    const nowMs = Date.parse(nowIso);
    const minAdvanceMs = MIN_ADVANCE_MINUTES * 60_000;
    let slotStarts = [];
    if (!allowOutOfHours) {
      const openingHours = await getOpeningHoursForDate(requestedDate);
      const isOpen = openingHours?.is_open;
      if (isOpen === 0 || isOpen === false || isOpen === "0") {
        const err = new Error(
          "Este dia no esta disponible. Por favor escoge otra fecha."
        );
        err.status = 400;
        err.code = "DAY_CLOSED";
        throw err;
      }

      const startMinutes = timeToMinutes(openingHours?.open_time);
      const endMinutes = timeToMinutes(openingHours?.close_time);
      if (
        startMinutes == null ||
        endMinutes == null ||
        Number(endMinutes) < Number(startMinutes)
      ) {
        const err = new Error(
          "No hay horario configurado para este dia. Por favor escoge otra fecha."
        );
        err.status = 400;
        err.code = "OPENING_HOURS_MISSING";
        throw err;
      }

      slotStarts = generateSlotStarts(
        requestedDate,
        startMinutes,
        endMinutes
      );
    }

    const rooms = activeRooms.map((roomRow) => {
      const roomKey = useDbRoomId
        ? String(roomRow.id)
        : derivePublicRoomId(roomRow);
      const booked = bookedByRoom.get(roomKey) ?? new Set();
      const slots = slotStarts.map((start) => {
        const startMs = Date.parse(start);
        const tooLate =
          !ignoreMinAdvance && startMs < nowMs + minAdvanceMs;
        const isBooked = booked.has(start);

        if (tooLate) return { start, available: false, reason: "too_late" };
        if (isBooked) return { start, available: false, reason: "booked" };
        return { start, available: true };
      });

      return {
        roomId: useDbRoomId ? Number(roomRow.id) : roomKey,
        name: roomRow.name,
        minPlayers: roomRow.min_players ?? roomRow.minPlayers ?? null,
        maxPlayers: roomRow.max_players ?? roomRow.maxPlayers ?? null,
        durationMinutes:
          roomRow.duration_minutes ?? roomRow.durationMinutes ?? null,
        difficulty: mapDifficulty(roomRow.difficulty),
        slots,
      };
    });

    return {
      date: requestedDate,
      dayType,
      isHoliday,
      rates,
      timezone: TIMEZONE,
      serverNow: nowIso,
      minAdvanceMinutes: MIN_ADVANCE_MINUTES,
      rooms,
    };
  }

  return {
    createBooking,
    listBookings,
    getBooking,
    getBookingStatusByConsultCode,
    getAvailabilityByDate,
    getBookingQuote,
  };
}

module.exports = buildBookingService;
