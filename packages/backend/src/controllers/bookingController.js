function buildBookingController(service, deps = {}) {
  const authConfig = deps.auth;
  const verifyToken = deps.verifyToken;

  function getUserFromRequest(req) {
    if (!verifyToken || !authConfig?.secret) return null;
    const authHeader = req.headers.authorization || "";
    const match = String(authHeader).match(/^Bearer\s+(.+)$/i);
    const token = match?.[1] || "";
    if (!token) return null;
    return verifyToken(token, authConfig.secret);
  }

  async function createBooking(req, res) {
    try {
      const payload = req.body;
      const user = getUserFromRequest(req);
      const booking = await service.createBooking(payload, { user });
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
      const allowPastRaw = req.query?.allowPast;
      const allowOutOfHoursRaw = req.query?.allowOutOfHours;
      const allowPast =
        allowPastRaw === "1" ||
        allowPastRaw === "true" ||
        allowPastRaw === 1 ||
        allowPastRaw === true;
      const allowOutOfHours =
        allowOutOfHoursRaw === "1" ||
        allowOutOfHoursRaw === "true" ||
        allowOutOfHoursRaw === 1 ||
        allowOutOfHoursRaw === true;
      const user = allowPast || allowOutOfHours ? getUserFromRequest(req) : null;
      const availability = await service.getAvailabilityByDate(date, {
        allowPast: Boolean(user) && allowPast,
        ignoreMinAdvance: Boolean(user) && allowPast,
        allowOutOfHours: Boolean(user) && allowOutOfHours,
      });
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

  async function getBookingStatusByConsultCode(req, res) {
    try {
      const { code } = req.params;
      const status = await service.getBookingStatusByConsultCode(code);
      if (!status) return res.status(404).json({ error: "Not found" });
      res.json(status);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }

  return {
    createBooking,
    listBookings,
    getAvailability,
    getQuote,
    getBooking,
    getBookingStatusByConsultCode,
  };
}

module.exports = buildBookingController;
