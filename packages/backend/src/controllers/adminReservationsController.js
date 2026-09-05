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
      const result = await service.updateReservation(req.params.id, req.body, {
        user: req.user,
      });
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

  async function listReservationPayments(req, res) {
    try {
      const payments = await service.listReservationPayments(req.params.id);
      res.json(payments);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }

  async function createReservationPayment(req, res) {
    try {
      const payment = await service.createReservationPayment(
        req.params.id,
        req.body,
        { user: req.user }
      );
      res.status(201).json(payment);
    } catch (err) {
      res
        .status(err.status || 500)
        .json({ error: err.message, code: err.code });
    }
  }

  async function voidReservationPayment(req, res) {
    try {
      const payment = await service.voidReservationPayment(
        req.params.id,
        req.params.paymentId,
        req.body,
        { user: req.user }
      );
      res.json(payment);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }

  async function startTimer(req, res) {
    try {
      const result = await service.startTimer(req.params.id, req.body);
      res.json(result);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }

  async function saveTimer(req, res) {
    try {
      const result = await service.saveTimer(req.params.id, req.body);
      res.json(result);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }

  return {
    listReservations,
    updateReservation,
    deleteReservation,
    listReservationPayments,
    createReservationPayment,
    voidReservationPayment,
    startTimer,
    saveTimer,
  };
}

module.exports = buildAdminReservationsController;
