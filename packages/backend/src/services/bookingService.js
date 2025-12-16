/**
 * bookingService: contains business logic and uses a consumer for persistence.
 * The consumer must implement: createBooking({name,email,date}), getBookingById(id), listBookings()
 */

function buildBookingService(consumer) {
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

  return {
    createBooking,
    listBookings,
    getBooking,
  };
}

module.exports = buildBookingService;
