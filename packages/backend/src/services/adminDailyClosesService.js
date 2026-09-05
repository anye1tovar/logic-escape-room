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

function normalizeInt(value) {
  if (value == null || value === "") return null;
  const num = Number(value);
  return Number.isFinite(num) ? Math.trunc(num) : null;
}

function normalizeBoolean(value, fallback = false) {
  if (value == null) return fallback;
  const raw = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "y", "si"].includes(raw)) return true;
  if (["0", "false", "no", "n"].includes(raw)) return false;
  return fallback;
}

function normalizeDate(value) {
  const text = normalizeText(value);
  if (!text) throw badRequest("date is required");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    throw badRequest("date must be YYYY-MM-DD");
  }
  return text;
}

function buildRange(businessDate) {
  const startMs = Date.parse(`${businessDate}T00:00:00-05:00`);
  const endMs = Date.parse(`${businessDate}T23:59:59.999-05:00`);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
    throw badRequest("Invalid date");
  }
  return { startMs, endMs };
}

function normalizeUserId(user) {
  return normalizeInt(user?.id ?? user?.sub);
}

function normalizeReconciliations(input = []) {
  if (!Array.isArray(input)) throw badRequest("reconciliations are required");
  return input.map((row, index) => {
    const financialAccountId = normalizeInt(
      row?.financialAccountId ?? row?.financial_account_id,
    );
    if (!financialAccountId || financialAccountId <= 0) {
      throw badRequest(`reconciliations[${index}].financialAccountId is required`);
    }
    const realBalance = normalizeInt(row?.realBalance ?? row?.real_balance);
    if (realBalance == null) {
      throw badRequest(`reconciliations[${index}].realBalance is required`);
    }
    const createAdjustment = normalizeBoolean(
      row?.createAdjustment ?? row?.create_adjustment,
    );
    const adjustmentReason = normalizeText(
      row?.adjustmentReason ?? row?.adjustment_reason,
    );
    if (createAdjustment && !adjustmentReason) {
      throw badRequest(
        `reconciliations[${index}].adjustmentReason is required`,
      );
    }
    return {
      financialAccountId,
      realBalance,
      observation: normalizeText(row?.observation),
      createAdjustment,
      adjustmentReason,
    };
  });
}

function buildAdminDailyClosesService(consumer) {
  async function preview(input = {}) {
    const businessDate = normalizeDate(input?.date);
    const range = buildRange(businessDate);
    const [existingClose, summary, accounts, movedAccounts] = await Promise.all([
      consumer.getExistingClose(businessDate),
      consumer.getDailySummary(range),
      consumer.getAccountReconciliationPreview(range),
      consumer.getMovedAccountsPreview(range),
    ]);
    return {
      businessDate,
      existingClose,
      summary,
      accounts,
      movedAccounts,
    };
  }

  async function listCloses() {
    return consumer.listDailyCloses();
  }

  async function listAccountMovements(accountIdInput, input = {}) {
    const accountId = normalizeInt(accountIdInput);
    if (!accountId || accountId <= 0) throw badRequest("accountId is required");
    const businessDate = normalizeDate(input?.date);
    return consumer.listAccountMovements(accountId, buildRange(businessDate));
  }

  async function createClose(input, context = {}) {
    const businessDate = normalizeDate(input?.date ?? input?.businessDate);
    const payload = {
      businessDate,
      range: buildRange(businessDate),
      notes: normalizeText(input?.notes),
      allowOpenBalances: normalizeBoolean(
        input?.allowOpenBalances ?? input?.allow_open_balances,
      ),
      allowDifferences: normalizeBoolean(
        input?.allowDifferences ?? input?.allow_differences,
      ),
      reconciliations: normalizeReconciliations(input?.reconciliations),
      closedBy: normalizeUserId(context?.user),
      closedAt: Date.now(),
    };
    return consumer.createDailyClose(payload);
  }

  return {
    preview,
    listCloses,
    listAccountMovements,
    createClose,
  };
}

module.exports = buildAdminDailyClosesService;
