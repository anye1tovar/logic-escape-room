function buildCafeteriaProductsController(service) {
  async function listProducts(req, res) {
    try {
      const products = await service.listProducts();
      res.json(products);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  return { listProducts };
}

module.exports = buildCafeteriaProductsController;

