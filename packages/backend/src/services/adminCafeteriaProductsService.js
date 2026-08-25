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

  function normalizeTime(value) {
    const text = normalizeText(value);
    if (!text) return null;
    const match = text.match(/^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/);
    return match ? `${match[1]}:${match[2]}` : null;
  }

  function slugify(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
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
      categoryId: normalizeInt(input?.categoryId ?? input?.category_id),
      image: normalizeText(input?.image),
    };
  }

  function normalizeCategoryInput(input) {
    const name = String(input?.name || "").trim();
    if (!name) {
      const err = new Error("name is required");
      err.status = 400;
      throw err;
    }

    return {
      name,
      slug: normalizeText(input?.slug) || slugify(name),
      image: normalizeText(input?.image),
      sortOrder: normalizeInt(input?.sortOrder ?? input?.sort_order) ?? 0,
      active:
        input?.active === 0 || input?.active === false || input?.active === "0"
          ? 0
          : 1,
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

  async function listCategories() {
    return consumer.listCategories();
  }

  async function createCategory(input) {
    const payload = normalizeCategoryInput(input);
    const created = await consumer.createCategory(payload);
    return { id: created.id, ...payload };
  }

  async function updateCategory(id, input) {
    const categoryId = normalizeInt(id);
    if (!categoryId) {
      const err = new Error("id is required");
      err.status = 400;
      throw err;
    }
    const payload = normalizeCategoryInput(input);
    const res = await consumer.updateCategory(categoryId, payload);
    if (!res?.changes) {
      const err = new Error("Not found");
      err.status = 404;
      throw err;
    }
    return { id: categoryId, ...payload };
  }

  async function deleteCategory(id) {
    const categoryId = normalizeInt(id);
    if (!categoryId) {
      const err = new Error("id is required");
      err.status = 400;
      throw err;
    }
    const res = await consumer.deleteCategory(categoryId);
    if (!res?.changes) {
      const err = new Error("Not found");
      err.status = 404;
      throw err;
    }
    return { ok: true };
  }

  async function listPromotions() {
    return consumer.listPromotions();
  }

  async function createPromotion(input) {
    const name = String(input?.name || "").trim();
    const promotionalPrice = normalizeInt(input?.promotionalPrice);
    const rawItems = Array.isArray(input?.items) ? input.items : [];
    const items = rawItems.map((item) => ({
      productId: normalizeInt(item?.productId),
      quantity: normalizeInt(item?.quantity) ?? 1,
    }));
    const productIds = items.map((item) => item.productId);
    const uniqueProductIds = new Set(productIds);
    const rawDaysOfWeek = Array.isArray(input?.daysOfWeek)
      ? input.daysOfWeek
      : [];
    const daysOfWeek = rawDaysOfWeek.map((day) => normalizeInt(day));
    const uniqueDaysOfWeek = new Set(daysOfWeek);
    const startsTime = normalizeTime(input?.startsTime);
    const endsTime = normalizeTime(input?.endsTime);
    const hasRawTime =
      normalizeText(input?.startsTime) != null ||
      normalizeText(input?.endsTime) != null;
    if (
      !name ||
      promotionalPrice == null ||
      promotionalPrice < 0 ||
      !items.length ||
      items.some((item) => !item.productId || item.quantity <= 0) ||
      uniqueProductIds.size !== productIds.length ||
      daysOfWeek.some((day) => day == null || day < 0 || day > 6) ||
      uniqueDaysOfWeek.size !== daysOfWeek.length ||
      (hasRawTime && (!startsTime || !endsTime)) ||
      (startsTime && endsTime && startsTime >= endsTime)
    ) {
      const err = new Error("name, promotionalPrice and items are required");
      err.status = 400;
      throw err;
    }
    return consumer.createPromotion({
      name,
      description: normalizeText(input?.description),
      promotionalPrice,
      active: input?.active === false || input?.active === 0 ? 0 : 1,
      startsAt: normalizeText(input?.startsAt),
      endsAt: normalizeText(input?.endsAt),
      daysOfWeek,
      startsTime,
      endsTime,
      sortOrder: normalizeInt(input?.sortOrder) ?? 0,
      items,
    });
  }

  async function deletePromotion(id) {
    const promotionId = normalizeInt(id);
    if (!promotionId) {
      const err = new Error("id is required");
      err.status = 400;
      throw err;
    }
    const res = await consumer.deletePromotion(promotionId);
    if (!res?.changes) {
      const err = new Error("Not found");
      err.status = 404;
      throw err;
    }
    return { ok: true };
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
    listPromotions,
    createPromotion,
    deletePromotion,
  };
}

module.exports = buildAdminCafeteriaProductsService;
