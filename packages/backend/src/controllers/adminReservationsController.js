function buildAdminReservationsController(service) {
  async function listReservations(req, res) {
    try {
      const { date, name } = req.query;
      const rows = await service.listReservations({ date, name });
      res.json(rows);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }

  async function updateReservation(req, res) {
    try {
      const result = await service.updateReservation(req.params.id, req.body);
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

  return { listReservations, updateReservation, deleteReservation };
}

module.exports = buildAdminReservationsController;

