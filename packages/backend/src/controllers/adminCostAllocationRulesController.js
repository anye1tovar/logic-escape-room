function buildAdminCostAllocationRulesController(service) {
  async function list(req, res) {
    try {
      res.json(await service.list(req.query));
    } catch (error) {
      res.status(error.status || 500).json({ error: error.message });
    }
  }

  async function create(req, res) {
    try {
      res.status(201).json(await service.create(req.body, { user: req.user }));
    } catch (error) {
      res.status(error.status || 500).json({ error: error.message });
    }
  }

  async function update(req, res) {
    try {
      res.json(await service.update(req.params.id, req.body, { user: req.user }));
    } catch (error) {
      res.status(error.status || 500).json({ error: error.message });
    }
  }

  async function simulate(req, res) {
    try {
      res.json(await service.simulate(req.body));
    } catch (error) {
      res.status(error.status || 500).json({ error: error.message });
    }
  }

  async function summary(req, res) {
    try {
      res.json(await service.summary(req.query));
    } catch (error) {
      res.status(error.status || 500).json({ error: error.message });
    }
  }

  return { list, create, update, simulate, summary };
}

module.exports = buildAdminCostAllocationRulesController;
