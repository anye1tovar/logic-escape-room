function badRequest(message) {
  const err = new Error(message);
  err.status = 400;
  return err;
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

function normalizeNumber(value) {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizePositiveNumber(value, field) {
  const parsed = normalizeNumber(value);
  if (parsed == null || parsed <= 0) throw badRequest(`${field} is required`);
  return parsed;
}

function normalizeUserId(user) {
  const parsed = Number(user?.id ?? user?.sub);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
}

function normalizeSupplyInput(input, { creating = false } = {}) {
  const name = normalizeText(input?.name);
  if (!name) throw badRequest("name is required");

  const purchaseUnit = normalizeText(input?.purchaseUnit ?? input?.purchase_unit);
  const consumptionUnit = normalizeText(
    input?.consumptionUnit ?? input?.consumption_unit,
  );
  if (!purchaseUnit) throw badRequest("purchaseUnit is required");
  if (!consumptionUnit) throw badRequest("consumptionUnit is required");

  const conversionFactor = normalizePositiveNumber(
    input?.conversionFactor ?? input?.conversion_factor,
    "conversionFactor",
  );
  const trackInventory = normalizeBoolean(
    input?.trackInventory ?? input?.track_inventory,
    true,
  );
  const trackExpiration = normalizeBoolean(
    input?.trackExpiration ?? input?.track_expiration,
    false,
  );
  const minimumStock = normalizeNumber(input?.minimumStock ?? input?.minimum_stock);
  if (minimumStock != null && minimumStock < 0) {
    throw badRequest("minimumStock must be >= 0");
  }
  const initialStock = normalizeNumber(input?.initialStock ?? input?.initial_stock);
  if (creating && initialStock != null && initialStock < 0) {
    throw badRequest("initialStock must be >= 0");
  }

  return {
    name,
    category: normalizeText(input?.category),
    purchaseUnit,
    consumptionUnit,
    conversionFactor,
    trackInventory,
    trackExpiration,
    minimumStock,
    active: normalizeBoolean(input?.active, true),
    initialStock: creating && trackInventory ? initialStock || 0 : 0,
  };
}

function buildAdminSuppliesService(consumer) {
  async function listSupplies() {
    return consumer.listSupplies();
  }

  async function listCategories() {
    return consumer.listCategories();
  }

  async function createSupply(input, context = {}) {
    const payload = {
      ...normalizeSupplyInput(input, { creating: true }),
      createdAt: Date.now(),
      createdBy: normalizeUserId(context?.user),
    };
    return consumer.createSupply(payload);
  }

  async function updateSupply(idInput, input) {
    const id = Number(idInput);
    if (!Number.isFinite(id) || id <= 0) throw badRequest("id is required");
    const updated = await consumer.updateSupply(
      Math.trunc(id),
      normalizeSupplyInput(input),
    );
    if (!updated) {
      const err = new Error("Not found");
      err.status = 404;
      throw err;
    }
    return updated;
  }

  async function deleteSupply(idInput) {
    const id = Number(idInput);
    if (!Number.isFinite(id) || id <= 0) throw badRequest("id is required");
    const result = await consumer.deactivateOrDeleteSupply(Math.trunc(id));
    if (!result.row) {
      const err = new Error("Not found");
      err.status = 404;
      throw err;
    }
    return { ok: true, deactivated: result.deactivated };
  }

  return {
    listSupplies,
    listCategories,
    createSupply,
    updateSupply,
    deleteSupply,
  };
}

module.exports = buildAdminSuppliesService;
