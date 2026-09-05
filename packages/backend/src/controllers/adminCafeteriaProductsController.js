function buildAdminCafeteriaProductsController(service) {
  async function listProducts(req, res) {
    try {
      const products = await service.listProducts();
      res.json(products);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  async function createProduct(req, res) {
    try {
      const created = await service.createProduct(req.body, { user: req.user });
      res.status(201).json(created);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }

  async function updateProduct(req, res) {
    try {
      const updated = await service.updateProduct(req.params.id, req.body);
      res.json(updated);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }

  async function deleteProduct(req, res) {
    try {
      const result = await service.deleteProduct(req.params.id);
      res.json(result);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }

  async function listInventoryMovements(req, res) {
    try {
      const movements = await service.listInventoryMovements(
        req.params.id,
        req.query,
      );
      res.json(movements);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }

  async function createInventoryMovement(req, res) {
    try {
      const movement = await service.createInventoryMovement(
        req.params.id,
        req.body,
        { user: req.user },
      );
      res.status(201).json(movement);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }

  async function setPhysicalCount(req, res) {
    try {
      const movement = await service.setPhysicalCount(req.params.id, req.body, {
        user: req.user,
      });
      res.status(201).json(movement);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }

  async function listInventoryBatches(req, res) {
    try {
      const batches = await service.listInventoryBatches(req.params.id);
      res.json(batches);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }

  async function writeOffExpiredBatches(req, res) {
    try {
      const movements = await service.writeOffExpiredBatches(
        req.params.id,
        req.body,
        { user: req.user },
      );
      res.status(201).json(movements);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }

  async function listCategories(req, res) {
    try {
      const categories = await service.listCategories();
      res.json(categories);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  async function createCategory(req, res) {
    try {
      const created = await service.createCategory(req.body);
      res.status(201).json(created);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }

  async function updateCategory(req, res) {
    try {
      const updated = await service.updateCategory(req.params.id, req.body);
      res.json(updated);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }

  async function deleteCategory(req, res) {
    try {
      const result = await service.deleteCategory(req.params.id);
      res.json(result);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }

  async function listPromotions(req, res) {
    try {
      res.json(await service.listPromotions());
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  async function createPromotion(req, res) {
    try {
      res.status(201).json(await service.createPromotion(req.body));
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }

  async function deletePromotion(req, res) {
    try {
      res.json(await service.deletePromotion(req.params.id));
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  }

  return {
    listProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    listInventoryMovements,
    createInventoryMovement,
    setPhysicalCount,
    listInventoryBatches,
    writeOffExpiredBatches,
    listCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    listPromotions,
    createPromotion,
    deletePromotion,
  };
}

module.exports = buildAdminCafeteriaProductsController;
