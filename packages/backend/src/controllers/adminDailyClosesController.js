function buildAdminDailyClosesController(service) {
  async function preview(req, res) {
    try {
      const data = await service.preview(req.query);
      res.json(data);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }

  async function listCloses(req, res) {
    try {
      const data = await service.listCloses();
      res.json(data);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }

  async function listAccountMovements(req, res) {
    try {
      const data = await service.listAccountMovements(
        req.params.accountId,
        req.query,
      );
      res.json(data);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }

  async function createClose(req, res) {
    try {
      const data = await service.createClose(req.body, { user: req.user });
      res.status(201).json(data);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }

  return {
    preview,
    listCloses,
    listAccountMovements,
    createClose,
  };
}

module.exports = buildAdminDailyClosesController;
