function buildAdminSuppliesController(service) {
  async function listSupplies(req, res) {
    try {
      res.json(await service.listSupplies());
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }

  async function listCategories(req, res) {
    try {
      res.json(await service.listCategories());
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }

  async function createSupply(req, res) {
    try {
      res.status(201).json(await service.createSupply(req.body, { user: req.user }));
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }

  async function updateSupply(req, res) {
    try {
      res.json(await service.updateSupply(req.params.id, req.body));
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }

  async function deleteSupply(req, res) {
    try {
      res.json(await service.deleteSupply(req.params.id));
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }

  return {
    listSupplies,
    listCategories,
    createSupply,
    updateSupply,
    deleteSupply,
  };
}

module.exports = buildAdminSuppliesController;
