function buildAdminReservationsController(service) {
  async function listReservations(req, res) {
    try {
      const source = req.method === "POST" ? req.body : req.query;
      const rawFilters = source?.filters && typeof source.filters === "object" ? source.filters : null;
      const dateFrom = rawFilters?.dateFrom ?? rawFilters?.from ?? source?.dateFrom ?? source?.from;
      const dateTo = rawFilters?.dateTo ?? rawFilters?.to ?? source?.dateTo ?? source?.to;
      const date = rawFilters?.date ?? source?.date;
      const search = rawFilters?.search ?? source?.search ?? source?.name;
      const page = source?.page;
      const pageSize = source?.pageSize ?? source?.size;

      const payload = await service.listReservationsPage({
        filters: { dateFrom, dateTo, date, search },
        page,
        pageSize,
      });
      res.json(payload);
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
