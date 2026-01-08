function buildAdminCafeteriaProductsService(consumer) {
  function normalizeInt(value) {
    if (value == null || value === "") return null;
    const num = Number(value);
    return Number.isFinite(num) ? Math.trunc(num) : null;
  }

  function normalizeText(value) {
    if (value == null) return null;
    const text = String(value).trim();
    return text ? text : null;
  }

  function normalizeProductInput(input) {
    const name = String(input?.name || "").trim();
    if (!name) {
      const err = new Error("name is required");
      err.status = 400;
      throw err;
    }

    const price = normalizeInt(input?.price);
    if (price == null || price < 0) {
      const err = new Error("price is required");
      err.status = 400;
      throw err;
    }

    return {
      name,
      price,
      description: normalizeText(input?.description),
      available:
        input?.available === 0 ||
        input?.available === false ||
        input?.available === "0"
          ? 0
          : 1,
      category: normalizeText(input?.category),
      image: normalizeText(input?.image),
    };
  }

  async function listProducts() {
    return consumer.listProducts();
  }

  async function createProduct(input) {
    const payload = normalizeProductInput(input);
    const created = await consumer.createProduct(payload);
    return { id: created.id, ...payload };
  }

  async function updateProduct(id, input) {
    const productId = normalizeInt(id);
    if (!productId) {
      const err = new Error("id is required");
      err.status = 400;
      throw err;
    }
    const payload = normalizeProductInput(input);
    const res = await consumer.updateProduct(productId, payload);
    if (!res?.changes) {
      const err = new Error("Not found");
      err.status = 404;
      throw err;
    }
    return { id: productId, ...payload };
  }

  async function deleteProduct(id) {
    const productId = normalizeInt(id);
    if (!productId) {
      const err = new Error("id is required");
      err.status = 400;
      throw err;
    }
    const res = await consumer.deleteProduct(productId);
    if (!res?.changes) {
      const err = new Error("Not found");
      err.status = 404;
      throw err;
    }
    return { ok: true };
  }

  return { listProducts, createProduct, updateProduct, deleteProduct };
}

module.exports = buildAdminCafeteriaProductsService;
