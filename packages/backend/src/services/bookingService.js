/**
 * bookingService: contains business logic and uses a consumer for persistence.
 * The consumer must implement: createBooking({name,email,date}), getBookingById(id), listBookings()
 */

function buildBookingService(consumer, deps = {}) {
  const TIMEZONE = "America/Bogota";
  const TIMEZONE_OFFSET_MINUTES = -5 * 60; // Bogota has fixed UTC-5
  const MIN_ADVANCE_MINUTES = 40;
  const SLOT_DURATION_MINUTES = 90;

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

  function slugify(value) {
    return String(value)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  function derivePublicRoomId(roomRow) {
    const cover = (roomRow?.coverImage || "").trim();
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
    const actualDayOfWeek = new Date(`${dateString}T12:00:00-05:00`).getUTCDay();
    const dayOfWeek = isHoliday ? 0 : actualDayOfWeek;

    const row = await openingHoursConsumer.getOpeningHoursByDayOfWeek(dayOfWeek);
    return row;
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

  async function createBooking(data) {
    const { firstName, lastName, name, email, date, roomId, time, attendees } =
      data;
    if (!email || !date || !roomId || !time) {
      const err = new Error(
        "Missing required fields: email, date, roomId, time"
      );
      err.status = 400;
      throw err;
    }

    // minimal business validations
    if (new Date(date) < new Date(new Date().setHours(0, 0, 0, 0))) {
      const err = new Error("Date cannot be in the past");
      err.status = 400;
      throw err;
    }

    const booking = await consumer.createBooking({
      firstName,
      lastName,
      name,
      email,
      date,
      roomId,
      time,
      attendees,
      sendReceipt: data.sendReceipt,
    });
    return booking;
  }

  async function listBookings() {
    return consumer.listBookings();
  }

  async function getBooking(id) {
    if (!id) return null;
    return consumer.getBookingById(id);
  }

  async function getAvailabilityByDate(date) {
    const requestedDate = parseDateParam(date);
    if (!requestedDate) {
      const err = new Error("Missing required query param: date");
      err.status = 400;
      throw err;
    }
    if (requestedDate < bogotaTodayDateString()) {
      const err = new Error("Date cannot be in the past");
      err.status = 400;
      throw err;
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

    const publicIdByDbId = new Map(
      Array.from(roomsByDbId.entries()).map(([id, room]) => [
        id,
        derivePublicRoomId(room),
      ])
    );

    const bookedByRoom = new Map();
    for (const booking of list || []) {
      const bookingDate = booking.date ?? booking.booking_date ?? null;
      if (bookingDate && String(bookingDate) !== requestedDate) continue;

      const bookingRoomRaw = `${
        booking.room_id ?? booking.roomId ?? ""
      }`.trim();
      const bookingRoomId =
        publicIdByDbId.get(bookingRoomRaw) || bookingRoomRaw;
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
    const openingHours = await getOpeningHoursForDate(requestedDate);
    const isOpen = openingHours?.is_open;
    if (isOpen === 0 || isOpen === false || isOpen === "0") {
      const err = new Error(
        "Este día no está disponible. Por favor escoge otra fecha."
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
        "No hay horario configurado para este día. Por favor escoge otra fecha."
      );
      err.status = 400;
      err.code = "OPENING_HOURS_MISSING";
      throw err;
    }

    const slotStarts = generateSlotStarts(
      requestedDate,
      startMinutes,
      endMinutes
    );

    const rooms = activeRooms.map((roomRow) => {
      const publicRoomId = derivePublicRoomId(roomRow);
      const booked = bookedByRoom.get(publicRoomId) ?? new Set();
      const slots = slotStarts.map((start) => {
        const startMs = Date.parse(start);
        const tooLate = startMs < nowMs + minAdvanceMs;
        const isBooked = booked.has(start);

        if (tooLate) return { start, available: false, reason: "too_late" };
        if (isBooked) return { start, available: false, reason: "booked" };
        return { start, available: true };
      });

      return {
        roomId: publicRoomId,
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
    getAvailabilityByDate,
  };
}

module.exports = buildBookingService;
