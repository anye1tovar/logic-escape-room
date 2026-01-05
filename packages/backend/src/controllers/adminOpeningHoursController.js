function buildAdminOpeningHoursController(service) {
  async function listOpeningHours(req, res) {
    try {
      const rows = await service.listOpeningHours();
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  async function upsertOpeningHour(req, res) {
    try {
      const result = await service.upsertOpeningHour(req.body);
      res.json(result);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }

  return { listOpeningHours, upsertOpeningHour };
}

module.exports = buildAdminOpeningHoursController;

