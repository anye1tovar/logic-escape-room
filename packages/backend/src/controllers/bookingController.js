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
    getBooking,
  };
}

module.exports = buildBookingController;
