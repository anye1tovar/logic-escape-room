function buildCafeteriaProductsService(consumer) {
  async function listProducts() {
    return consumer.listProducts();
  }

  return { listProducts };
}

module.exports = buildCafeteriaProductsService;

