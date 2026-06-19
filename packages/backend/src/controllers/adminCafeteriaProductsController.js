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
      const created = await service.createProduct(req.body);
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

  return {
    listProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    listCategories,
    createCategory,
    updateCategory,
    deleteCategory,
  };
}

module.exports = buildAdminCafeteriaProductsController;
