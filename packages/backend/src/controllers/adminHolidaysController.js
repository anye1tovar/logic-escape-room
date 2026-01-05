function buildAdminHolidaysController(service) {
  async function listHolidays(req, res) {
    try {
      const rows = await service.listHolidays();
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  async function createHoliday(req, res) {
    try {
      const result = await service.createHoliday(req.body);
      res.status(201).json(result);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }

  async function deleteHoliday(req, res) {
    try {
      const result = await service.deleteHoliday(req.params.date);
      res.json(result);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }

  return { listHolidays, createHoliday, deleteHoliday };
}

module.exports = buildAdminHolidaysController;

