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
  if (!text && required) throw badRequest("name is required");
  return text || null;
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
    createdBy: normalizeInt(context?.user?.id, { allowNull: true }),
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

  return {
    listAccounts,
    createAccount,
    updateAccount,
    listMovements,
  };
}

module.exports = buildAdminFinancialAccountsService;
