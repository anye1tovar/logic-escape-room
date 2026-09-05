const ACCOUNT_TYPES = new Set(["CASH", "DIGITAL_WALLET", "BANK", "OTHER"]);
const MOVEMENT_TYPES = new Set([
  "INITIAL_BALANCE",
  "INCOME",
  "EXPENSE",
  "TRANSFER_IN",
  "TRANSFER_OUT",
  "OWNER_CONTRIBUTION",
  "ADJUSTMENT",
]);
const EXPENSE_CATEGORIES = new Set([
  "RENT",
  "UTILITIES",
  "SUPPLIES",
  "MAINTENANCE",
  "PAYROLL",
  "MARKETING",
  "COMMISSIONS",
  "OWNER_REIMBURSEMENT",
  "TAXES",
  "OTHER",
]);
const EXPENSE_COST_CENTERS = new Set([
  "ROOMS",
  "CAFETERIA",
  "ADMINISTRATION",
  "MARKETING",
  "MIXED",
]);
const EXPENSE_COST_CENTERS_WITH_UNASSIGNED = new Set([
  ...EXPENSE_COST_CENTERS,
  "UNASSIGNED",
]);
const EXPENSE_SOURCE_TYPES = new Set([
  "FINANCIAL_ACCOUNT",
  "OWNER_PERSONAL_FUNDS",
]);
const CONTRIBUTION_KINDS = new Set(["REIMBURSABLE", "NON_REIMBURSABLE"]);

function badRequest(message) {
  const err = new Error(message);
  err.status = 400;
  return err;
}

function normalizeInt(value, { allowNull = false } = {}) {
  if (value == null || value === "") return allowNull ? null : 0;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return allowNull ? null : 0;
  return Math.trunc(parsed);
}

function normalizeBoolean(value, fallback) {
  if (value == null) return fallback;
  const raw = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "y", "si"].includes(raw)) return true;
  if (["0", "false", "no", "n"].includes(raw)) return false;
  return fallback;
}

function normalizeText(value, { required = false } = {}) {
  const text = String(value ?? "").trim();
  if (!text && required) throw badRequest("text is required");
  return text || null;
}

function normalizeRequiredText(value, fieldName) {
  const text = normalizeText(value);
  if (!text) throw badRequest(`${fieldName} is required`);
  return text;
}

function normalizeAccountType(value) {
  const type = String(value || "").trim().toUpperCase();
  if (!ACCOUNT_TYPES.has(type)) throw badRequest("Invalid account type");
  return type;
}

function normalizeMovementType(value) {
  const type = String(value || "").trim().toUpperCase();
  if (!type) return null;
  if (!MOVEMENT_TYPES.has(type)) throw badRequest("Invalid movement type");
  return type;
}

function normalizeTimestamp(value, fallback) {
  if (value == null || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw badRequest("timestamp must be a positive number");
  }
  return Math.trunc(parsed);
}

function normalizeUserId(user) {
  return normalizeInt(user?.id ?? user?.sub, { allowNull: true });
}

function dateToStartMs(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    throw badRequest("dateFrom must be YYYY-MM-DD");
  }
  const ms = Date.parse(`${raw}T00:00:00-05:00`);
  if (!Number.isFinite(ms)) throw badRequest("Invalid dateFrom");
  return ms;
}

function dateToEndMs(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    throw badRequest("dateTo must be YYYY-MM-DD");
  }
  const ms = Date.parse(`${raw}T23:59:59.999-05:00`);
  if (!Number.isFinite(ms)) throw badRequest("Invalid dateTo");
  return ms;
}

function normalizeAccountInput(input, context = {}) {
  const initialBalance = normalizeInt(input?.initialBalance ?? input?.initial_balance);
  if (initialBalance < 0) throw badRequest("initialBalance must be >= 0");

  return {
    name: normalizeText(input?.name, { required: true }),
    type: normalizeAccountType(input?.type),
    active: normalizeBoolean(input?.active, true),
    availableForCustomerPayments: normalizeBoolean(
      input?.availableForCustomerPayments ?? input?.available_for_customer_payments,
      true
    ),
    reconciliationEnabled: normalizeBoolean(
      input?.reconciliationEnabled ?? input?.reconciliation_enabled,
      false
    ),
    initialBalance,
    initialBalanceAt: normalizeTimestamp(
      input?.initialBalanceAt ?? input?.initial_balance_at,
      Date.now()
    ),
    initialBalanceNotes: normalizeText(
      input?.initialBalanceNotes ?? input?.initial_balance_notes
    ),
    createdAt: Date.now(),
    createdBy: normalizeUserId(context?.user),
  };
}

function normalizeAccountUpdateInput(input) {
  return {
    name: normalizeText(input?.name, { required: true }),
    type: normalizeAccountType(input?.type),
    active: normalizeBoolean(input?.active, true),
    availableForCustomerPayments: normalizeBoolean(
      input?.availableForCustomerPayments ?? input?.available_for_customer_payments,
      true
    ),
    reconciliationEnabled: normalizeBoolean(
      input?.reconciliationEnabled ?? input?.reconciliation_enabled,
      false
    ),
  };
}

function normalizeId(value) {
  const id = normalizeInt(value, { allowNull: true });
  if (!id || id <= 0) throw badRequest("id is required");
  return id;
}

function normalizePositiveMoney(value, fieldName = "amount") {
  const amount = normalizeInt(value, { allowNull: true });
  if (!amount || amount <= 0) throw badRequest(`${fieldName} is required`);
  return amount;
}

function normalizeEnum(value, allowed, fieldName) {
  const normalized = String(value || "").trim().toUpperCase();
  if (!allowed.has(normalized)) throw badRequest(`Invalid ${fieldName}`);
  return normalized;
}

function normalizeOccurredAt(input) {
  return normalizeTimestamp(input?.occurredAt ?? input?.occurred_at, Date.now());
}

function normalizeExpenseAllocations(input, totalAmount) {
  const allocations = Array.isArray(input?.allocations) ? input.allocations : [];
  if (allocations.length === 0) throw badRequest("allocations are required");
  const normalized = allocations.map((allocation) => {
    const sourceType = normalizeEnum(
      allocation?.sourceType ?? allocation?.source_type,
      EXPENSE_SOURCE_TYPES,
      "sourceType"
    );
    const amount = normalizePositiveMoney(allocation?.amount);
    const financialAccountId =
      sourceType === "FINANCIAL_ACCOUNT"
        ? normalizeId(
            allocation?.financialAccountId ?? allocation?.financial_account_id
          )
        : null;
    const ownerName =
      sourceType === "OWNER_PERSONAL_FUNDS"
        ? normalizeRequiredText(allocation?.ownerName ?? allocation?.owner_name, "ownerName")
        : normalizeText(allocation?.ownerName ?? allocation?.owner_name);
    const contributionKind =
      sourceType === "OWNER_PERSONAL_FUNDS"
        ? normalizeEnum(
            allocation?.contributionKind ?? allocation?.contribution_kind,
            CONTRIBUTION_KINDS,
            "contributionKind"
          )
        : null;

    return {
      sourceType,
      financialAccountId,
      ownerName,
      contributionKind,
      amount,
    };
  });
  const sum = normalized.reduce((acc, allocation) => acc + allocation.amount, 0);
  if (sum !== totalAmount) {
    throw badRequest("Expense allocation total must match expense total");
  }
  return normalized;
}

function normalizeExpenseInput(input, context = {}) {
  const totalAmount = normalizePositiveMoney(input?.totalAmount ?? input?.total_amount);
  const costCenter = normalizeEnum(
    input?.costCenter ?? input?.cost_center,
    EXPENSE_COST_CENTERS,
    "costCenter"
  );
  const requestedAllocationSource = String(
    input?.allocationSource ?? input?.allocation_source ?? "MANUAL"
  ).trim().toUpperCase();
  if (
    costCenter === "MIXED" &&
    !["MANUAL", "RULE"].includes(requestedAllocationSource)
  ) {
    throw badRequest("Invalid allocationSource");
  }
  const allocationSource =
    costCenter === "MIXED" ? requestedAllocationSource : "DIRECT";
  const allocationMode =
    costCenter === "MIXED" && allocationSource === "MANUAL"
      ? "PERCENTAGE"
      : costCenter === "MIXED"
        ? "PENDING"
        : "DIRECT";
  const percentages = {
    rooms: 0,
    cafeteria: 0,
    admin: 0,
  };
  if (allocationSource === "MANUAL" && costCenter === "MIXED") {
    percentages.rooms = Number(
      input?.allocationPercentageRooms ?? input?.allocation_percentage_rooms ?? 0
    );
    percentages.cafeteria = Number(
      input?.allocationPercentageCafeteria ??
        input?.allocation_percentage_cafeteria ??
        0
    );
    percentages.admin = Number(
      input?.allocationPercentageAdmin ?? input?.allocation_percentage_admin ?? 0
    );
    const values = Object.values(percentages);
    if (values.some((value) => !Number.isFinite(value) || value < 0 || value > 100)) {
      throw badRequest("Expense percentages must be between 0 and 100");
    }
    const totalPercentage = values.reduce((sum, value) => sum + value, 0);
    if (Math.abs(totalPercentage - 100) > 0.001) {
      throw badRequest("Mixed expense percentages must add up to 100");
    }
  }
  return {
    category: normalizeEnum(input?.category, EXPENSE_CATEGORIES, "category"),
    costCenter,
    allocationMode,
    allocationSource,
    allocationPercentageRooms:
      allocationMode === "PERCENTAGE" ? percentages.rooms : null,
    allocationPercentageCafeteria:
      allocationMode === "PERCENTAGE" ? percentages.cafeteria : null,
    allocationPercentageAdmin:
      allocationMode === "PERCENTAGE" ? percentages.admin : null,
    description: normalizeRequiredText(input?.description, "description"),
    totalAmount,
    occurredAt: normalizeOccurredAt(input),
    notes: null,
    allocations: normalizeExpenseAllocations(input, totalAmount),
    createdBy: normalizeUserId(context?.user),
    createdAt: Date.now(),
  };
}

function normalizeOwnerContributionInput(input, context = {}) {
  const description = normalizeRequiredText(
    input?.description ?? input?.notes,
    "description"
  );
  return {
    financialAccountId: normalizeId(
      input?.financialAccountId ?? input?.financial_account_id
    ),
    ownerName: normalizeRequiredText(input?.ownerName ?? input?.owner_name, "ownerName"),
    contributionKind: normalizeEnum(
      input?.contributionKind ?? input?.contribution_kind,
      CONTRIBUTION_KINDS,
      "contributionKind"
    ),
    amount: normalizePositiveMoney(input?.amount),
    occurredAt: normalizeOccurredAt(input),
    notes: description,
    description,
    createdBy: normalizeUserId(context?.user),
    createdAt: Date.now(),
  };
}

function normalizeTransferInput(input, context = {}) {
  const description = normalizeRequiredText(
    input?.description ?? input?.notes,
    "description"
  );
  const fromFinancialAccountId = normalizeId(
    input?.fromFinancialAccountId ?? input?.from_financial_account_id
  );
  const toFinancialAccountId = normalizeId(
    input?.toFinancialAccountId ?? input?.to_financial_account_id
  );
  if (fromFinancialAccountId === toFinancialAccountId) {
    throw badRequest("Transfer source and target must be different");
  }
  return {
    fromFinancialAccountId,
    toFinancialAccountId,
    amount: normalizePositiveMoney(input?.amount),
    occurredAt: normalizeOccurredAt(input),
    notes: description,
    description,
    createdBy: normalizeUserId(context?.user),
    createdAt: Date.now(),
  };
}

function normalizeVoidInput(context = {}) {
  return {
    createdBy: normalizeUserId(context?.user),
    createdAt: Date.now(),
  };
}

function buildAdminFinancialAccountsService(consumer) {
  async function listAccounts() {
    return consumer.listAccounts();
  }

  async function createAccount(input, context = {}) {
    const payload = normalizeAccountInput(input, context);
    return consumer.createAccount(payload);
  }

  async function updateAccount(id, input) {
    const accountId = normalizeId(id);
    const existing = await consumer.getAccountById(accountId);
    if (!existing) {
      const err = new Error("Not found");
      err.status = 404;
      throw err;
    }
    const payload = normalizeAccountUpdateInput(input);
    return consumer.updateAccount(accountId, payload);
  }

  async function listMovements(accountIdInput, filtersInput = {}) {
    const accountId = normalizeId(accountIdInput);
    const existing = await consumer.getAccountById(accountId);
    if (!existing) {
      const err = new Error("Not found");
      err.status = 404;
      throw err;
    }

    const dateFromMs = dateToStartMs(filtersInput?.dateFrom ?? filtersInput?.from);
    const dateToMs = dateToEndMs(filtersInput?.dateTo ?? filtersInput?.to);
    if (dateFromMs != null && dateToMs != null && dateFromMs > dateToMs) {
      throw badRequest("dateFrom must be <= dateTo");
    }

    return consumer.listMovements(accountId, {
      type: normalizeMovementType(filtersInput?.type),
      dateFromMs,
      dateToMs,
    });
  }

  async function createExpense(input, context = {}) {
    return consumer.createExpense(normalizeExpenseInput(input, context));
  }

  async function updateExpense(id, input, context = {}) {
    return consumer.updateExpense(
      normalizeId(id),
      normalizeExpenseInput(input, context)
    );
  }

  async function voidExpense(id, context = {}) {
    return consumer.voidExpense(normalizeId(id), normalizeVoidInput(context));
  }

  async function listExpenses(input = {}) {
    const rawCategory = String(input?.category || "").trim().toUpperCase();
    const rawCostCenter = String(
      input?.costCenter ?? input?.cost_center ?? ""
    ).trim().toUpperCase();
    if (rawCategory && !EXPENSE_CATEGORIES.has(rawCategory)) {
      throw badRequest("Invalid category");
    }
    if (rawCostCenter && !EXPENSE_COST_CENTERS_WITH_UNASSIGNED.has(rawCostCenter)) {
      throw badRequest("Invalid costCenter");
    }
    return consumer.listExpenses({
      category: rawCategory || null,
      costCenter: rawCostCenter || null,
    });
  }

  async function createOwnerContribution(input, context = {}) {
    return consumer.createOwnerContribution(
      normalizeOwnerContributionInput(input, context)
    );
  }

  async function updateOwnerContribution(id, input, context = {}) {
    return consumer.updateOwnerContribution(
      normalizeId(id),
      normalizeOwnerContributionInput(input, context)
    );
  }

  async function voidOwnerContribution(id, context = {}) {
    return consumer.voidOwnerContribution(
      normalizeId(id),
      normalizeVoidInput(context)
    );
  }

  async function listOwnerContributions() {
    return consumer.listOwnerContributions();
  }

  async function createTransfer(input, context = {}) {
    return consumer.createTransfer(normalizeTransferInput(input, context));
  }

  async function updateTransfer(id, input, context = {}) {
    return consumer.updateTransfer(
      normalizeId(id),
      normalizeTransferInput(input, context)
    );
  }

  async function voidTransfer(id, context = {}) {
    return consumer.voidTransfer(normalizeId(id), normalizeVoidInput(context));
  }

  async function listTransfers() {
    return consumer.listTransfers();
  }

  return {
    listAccounts,
    createAccount,
    updateAccount,
    listMovements,
    createExpense,
    updateExpense,
    voidExpense,
    listExpenses,
    createOwnerContribution,
    updateOwnerContribution,
    voidOwnerContribution,
    listOwnerContributions,
    createTransfer,
    updateTransfer,
    voidTransfer,
    listTransfers,
  };
}

module.exports = buildAdminFinancialAccountsService;
