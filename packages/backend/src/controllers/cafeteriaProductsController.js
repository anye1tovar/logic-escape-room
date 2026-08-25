function buildCafeteriaProductsController(service) {
  async function listProducts(req, res) {
    try {
      const products = await service.listProducts();
      res.json(products);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  async function listPromotions(req, res) {
    try {
      const promotions = await service.listPromotions();
      res.json(promotions);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  return { listProducts, listPromotions };
}

module.exports = buildCafeteriaProductsController;
