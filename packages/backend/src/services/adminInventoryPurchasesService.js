const SOURCE_TYPES = new Set(["FINANCIAL_ACCOUNT", "OWNER_PERSONAL_FUNDS"]);
const CONTRIBUTION_KINDS = new Set(["REIMBURSABLE", "NON_REIMBURSABLE"]);

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

function normalizeRequiredText(value, fieldName) {
  const text = normalizeText(value);
  if (!text) throw badRequest(`${fieldName} is required`);
  return text;
}

function normalizeInt(value) {
  if (value == null || value === "") return null;
  const num = Number(value);
  return Number.isFinite(num) ? Math.trunc(num) : null;
}

function normalizePositiveInt(value, fieldName) {
  const num = normalizeInt(value);
  if (!num || num <= 0) throw badRequest(`${fieldName} is required`);
  return num;
}

function normalizeDateMs(value, fallback = Date.now()) {
  const text = normalizeText(value);
  if (!text) return fallback;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    throw badRequest("receivedAt must be YYYY-MM-DD");
  }
  const ms = Date.parse(`${text}T12:00:00-05:00`);
  if (!Number.isFinite(ms)) throw badRequest("Invalid receivedAt");
  return ms;
}

function normalizeDate(value, fieldName) {
  const text = normalizeText(value);
  if (!text) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    throw badRequest(`${fieldName} must be YYYY-MM-DD`);
  }
  return text;
}

function normalizeEnum(value, allowed, fieldName) {
  const normalized = String(value || "").trim().toUpperCase();
  if (!allowed.has(normalized)) throw badRequest(`Invalid ${fieldName}`);
  return normalized;
}

function normalizeUserId(user) {
  return normalizeInt(user?.id ?? user?.sub);
}

function normalizeItems(input) {
  const items = Array.isArray(input?.items) ? input.items : [];
  if (items.length === 0) throw badRequest("items are required");
  return items.map((item, index) => {
    const quantity = normalizePositiveInt(item?.quantity, `items[${index}].quantity`);
    const lineTotal = normalizeInt(item?.lineTotal ?? item?.line_total);
    if (lineTotal != null && lineTotal < 0) {
      throw badRequest(`items[${index}].lineTotal must be >= 0`);
    }
    return {
      productId: normalizePositiveInt(
        item?.productId ?? item?.product_id,
        `items[${index}].productId`,
      ),
      quantity,
      lineTotal,
      expirationDate: normalizeDate(
        item?.expirationDate ?? item?.expiration_date,
        `items[${index}].expirationDate`,
      ),
      lotNumber: normalizeText(item?.lotNumber ?? item?.lot_number),
    };
  });
}

function normalizeAllocations(input, totalPaid) {
  const allocations = Array.isArray(input?.allocations) ? input.allocations : [];
  if (!totalPaid) return [];
  if (allocations.length === 0) {
    throw badRequest("allocations are required when totalPaid is present");
  }
  const normalized = allocations.map((allocation, index) => {
    const sourceType = normalizeEnum(
      allocation?.sourceType ?? allocation?.source_type,
      SOURCE_TYPES,
      `allocations[${index}].sourceType`,
    );
    return {
      sourceType,
      amount: normalizePositiveInt(allocation?.amount, `allocations[${index}].amount`),
      financialAccountId:
        sourceType === "FINANCIAL_ACCOUNT"
          ? normalizePositiveInt(
              allocation?.financialAccountId ?? allocation?.financial_account_id,
              `allocations[${index}].financialAccountId`,
            )
          : null,
      ownerName:
        sourceType === "OWNER_PERSONAL_FUNDS"
          ? normalizeRequiredText(
              allocation?.ownerName ?? allocation?.owner_name,
              `allocations[${index}].ownerName`,
            )
          : normalizeText(allocation?.ownerName ?? allocation?.owner_name),
      contributionKind:
        sourceType === "OWNER_PERSONAL_FUNDS"
          ? normalizeEnum(
              allocation?.contributionKind ?? allocation?.contribution_kind,
              CONTRIBUTION_KINDS,
              `allocations[${index}].contributionKind`,
            )
          : null,
    };
  });
  const sum = normalized.reduce((acc, allocation) => acc + allocation.amount, 0);
  if (sum !== totalPaid) {
    throw badRequest("Allocation total must match paid total");
  }
  return normalized;
}

function normalizePurchaseInput(input, context = {}) {
  const totalPaid = normalizeInt(input?.totalPaid ?? input?.total_paid);
  if (totalPaid != null && totalPaid <= 0) {
    throw badRequest("totalPaid must be greater than 0");
  }
  return {
    requestKey: normalizeText(input?.requestKey ?? input?.request_key),
    receivedAt: normalizeDateMs(input?.receivedAt ?? input?.received_at),
    supplier: normalizeText(input?.supplier),
    description: normalizeText(input?.description),
    totalPaid,
    items: normalizeItems(input),
    allocations: normalizeAllocations(input, totalPaid),
    createdBy: normalizeUserId(context?.user),
    createdAt: Date.now(),
  };
}

function buildAdminInventoryPurchasesService(consumer) {
  async function createPurchase(input, context = {}) {
    const payload = normalizePurchaseInput(input, context);
    return consumer.createInventoryPurchase(payload);
  }

  async function listPurchases() {
    return consumer.listInventoryPurchases();
  }

  return {
    createPurchase,
    listPurchases,
  };
}

module.exports = buildAdminInventoryPurchasesService;
