function buildAdminCafeteriaProductsService(consumer) {
  const INVENTORY_MOVEMENT_TYPES = new Set([
    "INITIAL_STOCK",
    "PURCHASE",
    "WASTE",
    "ADJUSTMENT_POSITIVE",
    "ADJUSTMENT_NEGATIVE",
  ]);

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

  function normalizeBoolean(value, fallback = false) {
    if (value == null) return fallback;
    const raw = String(value).trim().toLowerCase();
    if (["1", "true", "yes", "y", "si"].includes(raw)) return true;
    if (["0", "false", "no", "n"].includes(raw)) return false;
    return fallback;
  }

  function normalizeTimestampDate(value, endOfDay = false) {
    const text = normalizeText(value);
    if (!text) return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      const err = new Error("date must be YYYY-MM-DD");
      err.status = 400;
      throw err;
    }
    const time = endOfDay ? "23:59:59.999" : "00:00:00";
    const ms = Date.parse(`${text}T${time}-05:00`);
    if (!Number.isFinite(ms)) {
      const err = new Error("Invalid date");
      err.status = 400;
      throw err;
    }
    return ms;
  }

  function normalizeInventoryFilters(input = {}) {
    const type = normalizeText(input?.type);
    if (type && ![
      "INITIAL_STOCK",
      "PURCHASE",
      "SALE",
      "COURTESY",
      "WASTE",
      "ADJUSTMENT_POSITIVE",
      "ADJUSTMENT_NEGATIVE",
      "REVERSAL",
      "WASTE_EXPIRED",
    ].includes(type)) {
      const err = new Error("Invalid inventory movement type");
      err.status = 400;
      throw err;
    }
    const limit = Math.min(Math.max(normalizeInt(input?.limit) || 20, 1), 100);
    const offset = Math.max(normalizeInt(input?.offset) || 0, 0);
    const dateFromMs = normalizeTimestampDate(input?.dateFrom);
    const dateToMs = normalizeTimestampDate(input?.dateTo, true);
    if (dateFromMs != null && dateToMs != null && dateFromMs > dateToMs) {
      const err = new Error("dateFrom must be <= dateTo");
      err.status = 400;
      throw err;
    }
    return { type, limit, offset, dateFromMs, dateToMs };
  }

  function normalizeUserId(user) {
    return normalizeInt(user?.id ?? user?.sub);
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

    const trackExpiration = normalizeBoolean(
      input?.trackExpiration ?? input?.track_expiration,
      false,
    );
    const initialStock = Math.max(0, normalizeInt(input?.initialStock) || 0);
    const expirationDate = normalizeDate(input?.expirationDate);
    if (trackExpiration && initialStock > 0 && !expirationDate) {
      const err = new Error("expirationDate is required for initial stock");
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
      trackInventory: normalizeBoolean(
        input?.trackInventory ?? input?.track_inventory,
        false,
      ),
      minimumStock: normalizeInt(input?.minimumStock ?? input?.minimum_stock),
      unit: normalizeText(input?.unit) || "unidad",
      initialStock,
      trackExpiration,
      expirationAlertDays:
        normalizeInt(input?.expirationAlertDays ?? input?.expiration_alert_days) ?? 30,
      criticalExpirationAlertDays:
        normalizeInt(
          input?.criticalExpirationAlertDays ??
            input?.critical_expiration_alert_days,
        ) ?? 7,
      expirationDate,
      lotNumber: normalizeText(input?.lotNumber ?? input?.lot_number),
    };
  }

  function normalizeDate(value) {
    const text = normalizeText(value);
    if (!text) return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      const err = new Error("date must be YYYY-MM-DD");
      err.status = 400;
      throw err;
    }
    return text;
  }

  function normalizeInventoryMovementInput(input, context = {}) {
    const type = String(input?.type || "").trim().toUpperCase();
    if (!INVENTORY_MOVEMENT_TYPES.has(type)) {
      const err = new Error("Invalid inventory movement type");
      err.status = 400;
      throw err;
    }
    const quantity = normalizeInt(input?.quantity);
    if (!quantity || quantity <= 0) {
      const err = new Error("quantity is required");
      err.status = 400;
      throw err;
    }
    const negativeTypes = new Set(["WASTE", "ADJUSTMENT_NEGATIVE"]);
    const reason = normalizeText(input?.reason);
    if (["WASTE", "ADJUSTMENT_POSITIVE", "ADJUSTMENT_NEGATIVE"].includes(type) && !reason) {
      const err = new Error("reason is required");
      err.status = 400;
      throw err;
    }
    return {
      type,
      quantityDelta: negativeTypes.has(type) ? -quantity : quantity,
      occurredAt: Date.now(),
      sourceType: "MANUAL_INVENTORY",
      sourceId: null,
      reason,
      expirationDate: normalizeDate(input?.expirationDate ?? input?.expiration_date),
      lotNumber: normalizeText(input?.lotNumber ?? input?.lot_number),
      purchaseId: normalizeText(input?.purchaseId ?? input?.purchase_id),
      createdBy: normalizeUserId(context?.user),
      createdAt: Date.now(),
    };
  }

  async function normalizePhysicalCountInput(productId, input, context = {}) {
    const realCount = normalizeInt(input?.realCount ?? input?.real_count);
    if (realCount == null || realCount < 0) {
      const err = new Error("realCount is required");
      err.status = 400;
      throw err;
    }
    const reason = normalizeText(input?.reason);
    if (!reason) {
      const err = new Error("reason is required");
      err.status = 400;
      throw err;
    }
    const product = await consumer.getProductStock(productId);
    if (!product) {
      const err = new Error("Not found");
      err.status = 404;
      throw err;
    }
    if (
      product.track_expiration === true ||
      product.track_expiration === 1 ||
      product.track_expiration === "1"
    ) {
      const err = new Error("Physical count is not available for batched products");
      err.status = 409;
      throw err;
    }
    const currentStock = Number(product.current_stock || 0);
    const diff = realCount - currentStock;
    if (diff === 0) {
      const err = new Error("Physical count matches current stock");
      err.status = 409;
      throw err;
    }
    return {
      type: diff > 0 ? "ADJUSTMENT_POSITIVE" : "ADJUSTMENT_NEGATIVE",
      quantityDelta: diff,
      occurredAt: Date.now(),
      sourceType: "PHYSICAL_COUNT",
      sourceId: null,
      reason,
      createdBy: normalizeUserId(context?.user),
      createdAt: Date.now(),
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

  async function createProduct(input, context = {}) {
    const payload = {
      ...normalizeProductInput(input),
      createdAt: Date.now(),
      createdBy: normalizeUserId(context?.user),
    };
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

  async function listInventoryMovements(id, filtersInput = {}) {
    const productId = normalizeInt(id);
    if (!productId) {
      const err = new Error("id is required");
      err.status = 400;
      throw err;
    }
    const product = await consumer.getProductStock(productId);
    if (!product) {
      const err = new Error("Not found");
      err.status = 404;
      throw err;
    }
    return consumer.listInventoryMovements(
      productId,
      normalizeInventoryFilters(filtersInput),
    );
  }

  async function createInventoryMovement(id, input, context = {}) {
    const productId = normalizeInt(id);
    if (!productId) {
      const err = new Error("id is required");
      err.status = 400;
      throw err;
    }
    const product = await consumer.getProductStock(productId);
    if (!product) {
      const err = new Error("Not found");
      err.status = 404;
      throw err;
    }
    const payload = {
      productId,
      ...normalizeInventoryMovementInput(input, context),
    };
    const tracksExpiration =
      product.track_expiration === true ||
      product.track_expiration === 1 ||
      product.track_expiration === "1";
    if (tracksExpiration && payload.quantityDelta > 0 && !payload.expirationDate) {
      const err = new Error("expirationDate is required");
      err.status = 400;
      throw err;
    }
    return consumer.createInventoryMovement(payload);
  }

  async function setPhysicalCount(id, input, context = {}) {
    const productId = normalizeInt(id);
    if (!productId) {
      const err = new Error("id is required");
      err.status = 400;
      throw err;
    }
    const payload = {
      productId,
      ...(await normalizePhysicalCountInput(productId, input, context)),
    };
    return consumer.createInventoryMovement(payload);
  }

  async function listInventoryBatches(id) {
    const productId = normalizeInt(id);
    if (!productId) {
      const err = new Error("id is required");
      err.status = 400;
      throw err;
    }
    return consumer.listInventoryBatches(productId);
  }

  async function writeOffExpiredBatches(id, input = {}, context = {}) {
    const productId = normalizeInt(id);
    if (!productId) {
      const err = new Error("id is required");
      err.status = 400;
      throw err;
    }
    return consumer.writeOffExpiredBatches({
      productId,
      reason: normalizeText(input?.reason) || "Baja por vencimiento",
      createdBy: normalizeUserId(context?.user),
      createdAt: Date.now(),
    });
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

module.exports = buildAdminCafeteriaProductsService;
