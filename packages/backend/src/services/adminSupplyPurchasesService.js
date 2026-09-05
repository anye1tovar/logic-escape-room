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
  return text || null;
}

function requiredText(value, field) {
  const text = normalizeText(value);
  if (!text) throw badRequest(`${field} is required`);
  return text;
}

function normalizeInteger(value) {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function positiveInteger(value, field) {
  const parsed = normalizeInteger(value);
  if (parsed == null || parsed <= 0) throw badRequest(`${field} must be greater than 0`);
  return parsed;
}

function positiveNumber(value, field) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw badRequest(`${field} must be greater than 0`);
  }
  return parsed;
}

function normalizeDate(value, field) {
  const text = normalizeText(value);
  if (!text) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    throw badRequest(`${field} must be YYYY-MM-DD`);
  }
  return text;
}

function normalizeReceivedAt(value) {
  const text = normalizeDate(value, "receivedAt");
  if (!text) return Date.now();
  const parsed = Date.parse(`${text}T12:00:00-05:00`);
  if (!Number.isFinite(parsed)) throw badRequest("Invalid receivedAt");
  return parsed;
}

function normalizeEnum(value, allowed, field) {
  const normalized = String(value || "").trim().toUpperCase();
  if (!allowed.has(normalized)) throw badRequest(`Invalid ${field}`);
  return normalized;
}

function normalizeItems(input) {
  const items = Array.isArray(input?.items) ? input.items : [];
  if (items.length === 0) throw badRequest("items are required");
  return items.map((item, index) => ({
    supplyId: positiveInteger(
      item?.supplyId ?? item?.supply_id,
      `items[${index}].supplyId`,
    ),
    purchasedQuantity: positiveNumber(
      item?.purchasedQuantity ?? item?.purchased_quantity,
      `items[${index}].purchasedQuantity`,
    ),
    lineTotal: positiveInteger(
      item?.lineTotal ?? item?.line_total,
      `items[${index}].lineTotal`,
    ),
    expirationDate: normalizeDate(
      item?.expirationDate ?? item?.expiration_date,
      `items[${index}].expirationDate`,
    ),
    lotNumber: normalizeText(item?.lotNumber ?? item?.lot_number),
  }));
}

function normalizeAllocations(input, totalPaid) {
  const allocations = Array.isArray(input?.allocations) ? input.allocations : [];
  if (totalPaid == null) {
    if (allocations.length > 0) throw badRequest("allocations require totalPaid");
    return [];
  }
  if (allocations.length === 0) throw badRequest("allocations are required when totalPaid is present");

  const normalized = allocations.map((allocation, index) => {
    const sourceType = normalizeEnum(
      allocation?.sourceType ?? allocation?.source_type,
      SOURCE_TYPES,
      `allocations[${index}].sourceType`,
    );
    return {
      sourceType,
      amount: positiveInteger(allocation?.amount, `allocations[${index}].amount`),
      financialAccountId:
        sourceType === "FINANCIAL_ACCOUNT"
          ? positiveInteger(
              allocation?.financialAccountId ?? allocation?.financial_account_id,
              `allocations[${index}].financialAccountId`,
            )
          : null,
      ownerName:
        sourceType === "OWNER_PERSONAL_FUNDS"
          ? requiredText(
              allocation?.ownerName ?? allocation?.owner_name,
              `allocations[${index}].ownerName`,
            )
          : null,
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
  const allocated = normalized.reduce((sum, item) => sum + item.amount, 0);
  if (allocated !== totalPaid) throw badRequest("Allocation total must match paid total");
  return normalized;
}

function normalizeUserId(user) {
  const parsed = Number(user?.id ?? user?.sub);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
}

function normalizeInput(input, context) {
  const items = normalizeItems(input);
  const totalAmount = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const rawTotalPaid = input?.totalPaid ?? input?.total_paid;
  const totalPaid = rawTotalPaid == null || rawTotalPaid === ""
    ? null
    : positiveInteger(rawTotalPaid, "totalPaid");
  if (totalPaid != null && totalPaid !== totalAmount) {
    throw badRequest("Paid total must match the sum of line totals");
  }
  return {
    requestKey: requiredText(input?.requestKey ?? input?.request_key, "requestKey"),
    receivedAt: normalizeReceivedAt(input?.receivedAt ?? input?.received_at),
    supplier: normalizeText(input?.supplier),
    description: normalizeText(input?.description),
    totalAmount,
    totalPaid,
    items,
    allocations: normalizeAllocations(input, totalPaid),
    createdBy: normalizeUserId(context?.user),
    createdAt: Date.now(),
  };
}

function buildAdminSupplyPurchasesService(consumer) {
  return {
    listPurchases: () => consumer.listPurchases(),
    createPurchase: (input, context = {}) =>
      consumer.createPurchase(normalizeInput(input, context)),
  };
}

module.exports = buildAdminSupplyPurchasesService;
