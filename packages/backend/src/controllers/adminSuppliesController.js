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

  async function listInventoryMovements(req, res) {
    try {
      res.json(await service.listInventoryMovements(req.params.id));
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }

  async function listBatches(req, res) {
    try { res.json(await service.listBatches(req.params.id)); }
    catch (err) { res.status(err.status || 500).json({ error: err.message }); }
  }
  async function updateBatch(req, res) {
    try { res.json(await service.updateBatch(req.params.id, req.params.batchId, req.body)); }
    catch (err) { res.status(err.status || 500).json({ error: err.message }); }
  }
  async function discardBatch(req, res) {
    try { res.json(await service.discardBatch(req.params.id, req.params.batchId, req.body, { user: req.user })); }
    catch (err) { res.status(err.status || 500).json({ error: err.message }); }
  }

  async function listSupplyRecipeUsages(req, res) {
    try {
      res.json(await service.listSupplyRecipeUsages(req.params.id));
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }

  async function getSupplyUsageDetails(req, res) {
    try {
      res.json(await service.getSupplyUsageDetails(req.params.id));
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }

  async function createInventoryMovement(req, res) {
    try {
      res.status(201).json(
        await service.createInventoryMovement(req.params.id, req.body, {
          user: req.user,
        }),
      );
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }

  async function setPhysicalCount(req, res) {
    try {
      res.status(201).json(
        await service.setPhysicalCount(req.params.id, req.body, {
          user: req.user,
        }),
      );
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
    listInventoryMovements,
    listBatches,
    updateBatch,
    discardBatch,
    listSupplyRecipeUsages,
    getSupplyUsageDetails,
    createInventoryMovement,
    setPhysicalCount,
    deleteSupply,
  };
}

module.exports = buildAdminSuppliesController;
