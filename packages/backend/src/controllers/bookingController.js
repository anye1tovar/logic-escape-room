function buildBookingController(service) {
  async function createBooking(req, res) {
    try {
      const payload = req.body;
      const booking = await service.createBooking(payload);
      res.status(201).json(booking);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }

  async function listBookings(req, res) {
    try {
      const list = await service.listBookings();
      res.json(list);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  async function getAvailability(req, res) {
    try {
      const { date } = req.query;
      const availability = await service.getAvailabilityByDate(date);
      res.json(availability);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }

  async function getQuote(req, res) {
    try {
      const { date, attendees } = req.query;
      const quote = await service.getBookingQuote({
        date,
        attendees: Number(attendees),
      });
      res.json(quote);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }

  async function getBooking(req, res) {
    try {
      const { id } = req.params;
      const booking = await service.getBooking(id);
      if (!booking) return res.status(404).json({ error: "Not found" });
      res.json(booking);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  return {
    createBooking,
    listBookings,
    getAvailability,
    getQuote,
    getBooking,
  };
}

module.exports = buildBookingController;
