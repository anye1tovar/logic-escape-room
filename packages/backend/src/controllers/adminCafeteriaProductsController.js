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

  return { listProducts, createProduct, updateProduct, deleteProduct };
}

module.exports = buildAdminCafeteriaProductsController;
