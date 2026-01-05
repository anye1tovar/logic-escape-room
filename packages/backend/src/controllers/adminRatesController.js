function buildAdminRatesController(service) {
  async function listRates(req, res) {
    try {
      const rates = await service.listRates();
      res.json(rates);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  async function createRate(req, res) {
    try {
      const created = await service.createRate(req.body);
      res.status(201).json(created);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }

  async function updateRate(req, res) {
    try {
      const updated = await service.updateRate(req.params.id, req.body);
      res.json(updated);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }

  async function deleteRate(req, res) {
    try {
      const result = await service.deleteRate(req.params.id);
      res.json(result);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }

  return { listRates, createRate, updateRate, deleteRate };
}

module.exports = buildAdminRatesController;

