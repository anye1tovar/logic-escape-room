function badRequest(message) {
  const err = new Error(message);
  err.status = 400;
  return err;
}

function normalizeId(value, field) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw badRequest(`${field} is required`);
  return parsed;
}

function normalizeNumber(value, field) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw badRequest(`${field} is required`);
  return parsed;
}

function normalizeText(value) {
  if (value == null) return null;
  const text = String(value).trim();
  return text || null;
}

function normalizeTargetMargin(value) {
  const margin = value == null || value === "" ? 60 : normalizeNumber(value, "targetMarginPercent");
  if (margin <= 0 || margin >= 100) {
    throw badRequest("targetMarginPercent must be greater than 0 and less than 100");
  }
  return margin;
}

function normalizeItems(input) {
  const rawItems = Array.isArray(input?.items) ? input.items : [];
  const items = rawItems.map((item, index) => {
    const quantity = normalizeNumber(item?.quantity, `items[${index}].quantity`);
    const wastePercent =
      item?.wastePercent == null || item?.wastePercent === ""
        ? 0
        : normalizeNumber(item.wastePercent, `items[${index}].wastePercent`);
    if (quantity <= 0) throw badRequest(`items[${index}].quantity must be greater than 0`);
    if (wastePercent < 0 || wastePercent >= 100) {
      throw badRequest(`items[${index}].wastePercent must be between 0 and 99.999`);
    }
    return {
      supplyId: normalizeId(
        item?.supplyId ?? item?.supply_id,
        `items[${index}].supplyId`,
      ),
      quantity,
      wastePercent,
      notes: normalizeText(item?.notes),
    };
  });
  const ids = items.map((item) => item.supplyId);
  if (new Set(ids).size !== ids.length) {
    throw badRequest("A supply cannot be repeated in the same recipe");
  }
  return items;
}

function normalizeUserId(user) {
  const parsed = Number(user?.id ?? user?.sub);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
}

function normalizeRecipeInput(input, context = {}) {
  return {
    productId: normalizeId(input?.productId ?? input?.product_id, "productId"),
    targetMarginPercent: normalizeTargetMargin(
      input?.targetMarginPercent ?? input?.target_margin_percent,
    ),
    items: normalizeItems(input),
    userId: normalizeUserId(context?.user),
    now: Date.now(),
  };
}

function buildAdminRecipesService(consumer) {
  async function listProducts() {
    return consumer.listProducts();
  }

  async function getProductRecipes(productIdInput) {
    return consumer.getProductRecipes(normalizeId(productIdInput, "productId"));
  }

  async function preview(input) {
    const payload = normalizeRecipeInput(input);
    return consumer.calculatePreview(payload);
  }

  async function saveDraft(input, context = {}) {
    return consumer.saveDraft(normalizeRecipeInput(input, context));
  }

  async function activate(recipeIdInput, context = {}) {
    return consumer.activateRecipe({
      recipeId: normalizeId(recipeIdInput, "recipeId"),
      userId: normalizeUserId(context?.user),
      now: Date.now(),
    });
  }

  async function deleteDraft(recipeIdInput) {
    return consumer.deleteDraft(normalizeId(recipeIdInput, "recipeId"));
  }

  return { listProducts, getProductRecipes, preview, saveDraft, activate, deleteDraft };
}

module.exports = buildAdminRecipesService;
