function buildCafeteriaProductsService(consumer) {
  async function listProducts() {
    return consumer.listProducts();
  }

  async function listPromotions() {
    return consumer.listPromotions();
  }

  return { listProducts, listPromotions };
}

module.exports = buildCafeteriaProductsService;
