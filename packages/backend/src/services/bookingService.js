/**
 * bookingService: contains business logic and uses a consumer for persistence.
 * The consumer must implement: createBooking({name,email,date}), getBookingById(id), listBookings()
 */

function buildBookingService(consumer) {
  function generateTimeSlots() {
    const slots = [];
    const start = new Date();
    start.setHours(14, 0, 0, 0);
    const end = new Date();
    end.setHours(21, 30, 0, 0);

    const slotMs = 90 * 60 * 1000;
    for (let t = start.getTime(); t <= end.getTime(); t += slotMs) {
      const d = new Date(t);
      const hh = d.getHours().toString().padStart(2, "0");
      const mm = d.getMinutes().toString().padStart(2, "0");
      slots.push(`${hh}:${mm}`);
    }
    return slots;
  }

  const TIME_SLOTS = generateTimeSlots();

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
    if (!date) {
      const err = new Error("Missing required query param: date");
      err.status = 400;
      throw err;
    }
    if (new Date(date) < new Date(new Date().setHours(0, 0, 0, 0))) {
      const err = new Error("Date cannot be in the past");
      err.status = 400;
      throw err;
    }

    const list = consumer.listBookingsByDate
      ? await consumer.listBookingsByDate(date)
      : await consumer.listBookings();

    const occupiedByRoom = new Map();
    for (const booking of list || []) {
      if (booking.date !== date) continue;
      const roomId = `${booking.room_id ?? booking.roomId ?? ""}`;
      const time = booking.start_time ?? booking.time ?? booking.startTime ?? null;
      if (!roomId || !time) continue;
      if (!occupiedByRoom.has(roomId)) occupiedByRoom.set(roomId, new Set());
      occupiedByRoom.get(roomId).add(time);
    }

    const rooms = Array.from(occupiedByRoom.entries()).map(
      ([roomId, occupiedSet]) => {
        const unavailable = Array.from(occupiedSet);
        const available = TIME_SLOTS.filter((slot) => !occupiedSet.has(slot));
        return { roomId, available, unavailable };
      }
    );

    return { date, timeSlots: TIME_SLOTS, rooms };
  }

  return {
    createBooking,
    listBookings,
    getBooking,
    getAvailabilityByDate,
  };
}

module.exports = buildBookingService;
