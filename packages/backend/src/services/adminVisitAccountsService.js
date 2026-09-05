const VISIT_STATUSES = new Set([
  "OPEN",
  "PARTIALLY_PAID",
  "PAID",
  "CLOSED",
  "CANCELLED",
]);
const ORDER_ITEM_TYPES = new Set(["SALE", "COURTESY"]);
const COURTESY_REASONS = new Set([
  "PROMOTION",
  "BIRTHDAY",
  "COMPENSATION",
  "LOYALTY",
  "EVENT",
  "OTHER",
]);

function serviceError(message, status = 400) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function normalizeInt(value) {
  if (value == null || value === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.trunc(parsed);
}

function normalizePositiveInt(value, fieldName) {
  const parsed = normalizeInt(value);
  if (!parsed || parsed <= 0) throw serviceError(`${fieldName} is required`);
  return parsed;
}

function normalizeText(value) {
  const text = String(value ?? "").trim();
  return text || null;
}

function normalizeUserId(user) {
  return normalizeInt(user?.id ?? user?.sub);
}

function isAdminUser(user) {
  return String(user?.role || "").toLowerCase() === "admin";
}

function isActiveBoolean(value) {
  return value === true || value === 1 || value === "1";
}

function isCourtesyAllowed(user) {
  const role = String(user?.role || "").toLowerCase();
  return (
    role === "admin" ||
    role === "game_master" ||
    user?.canCreateCourtesy === true ||
    user?.can_create_courtesy === true ||
    user?.canCreateCourtesy === 1 ||
    user?.can_create_courtesy === 1 ||
    user?.canCreateCourtesy === "1" ||
    user?.can_create_courtesy === "1"
  );
}

function normalizeStatus(value) {
  const status = String(value || "").trim().toUpperCase();
  if (!VISIT_STATUSES.has(status)) throw serviceError("Invalid status");
  return status;
}

function buildReservationDisplayName(reservation) {
  const fullName = [reservation?.first_name, reservation?.last_name]
    .map((part) => String(part || "").trim())
    .filter(Boolean)
    .join(" ");
  return fullName || null;
}

function buildReservationLocationLabel(reservation) {
  return normalizeText(reservation?.room_name) || null;
}

function decorateVisit(visit) {
  if (!visit) return null;
  const displayName = normalizeText(visit.display_name);
  const fallbackName = `Cuenta #${visit.id}`;
  const reservationName = [visit.first_name, visit.last_name]
    .map((part) => String(part || "").trim())
    .filter(Boolean)
    .join(" ");
  const name = displayName || reservationName || fallbackName;
  const location = normalizeText(visit.location_label) || visit.room_name || null;
  const titleParts = [name, location].filter(Boolean);
  if (visit.reservation_id) titleParts.push(`Reserva #${visit.reservation_id}`);

  return {
    ...visit,
    display_label: titleParts.join(" · "),
    visit_total: Number(visit.visit_total || 0),
    order_charged_total: Number(visit.order_charged_total || 0),
    courtesy_commercial_total: Number(visit.courtesy_commercial_total || 0),
    total_paid: Number(visit.total_paid || 0),
    pending_amount: Number(visit.pending_amount || 0),
  };
}

function assertVisitAllowsOrders(visit) {
  if (!visit) throw serviceError("Visit account not found", 404);
  if (["CLOSED", "CANCELLED"].includes(String(visit.status))) {
    throw serviceError("Visit account does not allow order changes", 409);
  }
}

function normalizeOrderType(value) {
  const type = String(value || "SALE").trim().toUpperCase();
  if (!ORDER_ITEM_TYPES.has(type)) throw serviceError("Invalid order item type");
  return type;
}

function normalizeCourtesyReason(value) {
  const reason = String(value || "").trim().toUpperCase();
  if (!COURTESY_REASONS.has(reason)) {
    throw serviceError("Invalid courtesy reason");
  }
  return reason;
}

function normalizeMoney(value, fieldName = "amount") {
  const parsed = normalizeInt(value);
  if (!parsed || parsed <= 0) throw serviceError(`${fieldName} is required`);
  return parsed;
}

function normalizeTimestamp(value, fallback) {
  if (value == null || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw serviceError("paidAt must be a positive timestamp");
  }
  return Math.trunc(parsed);
}

function normalizePaymentAllocations(inputAllocations, amount) {
  const allocations = Array.isArray(inputAllocations) ? inputAllocations : [];
  const normalized = allocations.map((allocation) => {
    const allocationAmount = normalizeMoney(allocation?.amount);
    const orderItemId = normalizeInt(
      allocation?.orderItemId ?? allocation?.order_item_id
    );
    return {
      orderItemId: orderItemId || null,
      component: orderItemId ? null : "VISIT_BALANCE",
      amount: allocationAmount,
    };
  });

  const allocated = normalized.reduce(
    (sum, allocation) => sum + allocation.amount,
    0
  );
  if (allocated > amount) {
    throw serviceError("Payment allocations exceed payment amount");
  }
  if (allocated < amount) {
    normalized.push({
      orderItemId: null,
      component: "VISIT_BALANCE",
      amount: amount - allocated,
    });
  }
  if (normalized.length === 0) {
    normalized.push({
      orderItemId: null,
      component: "VISIT_BALANCE",
      amount,
    });
  }
  return normalized;
}

function buildAdminVisitAccountsService(consumer) {
  async function listVisitAccounts(input = {}) {
    const status = input?.status ? normalizeStatus(input.status) : null;
    const rows = await consumer.listVisitAccounts({ status });
    return rows.map(decorateVisit);
  }

  async function listPaymentFinancialAccounts() {
    return consumer.listPaymentFinancialAccounts();
  }

  async function getVisitAccount(idInput) {
    const id = normalizePositiveInt(idInput, "visitAccountId");
    const visit = await consumer.getVisitAccountById(id);
    if (!visit) throw serviceError("Visit account not found", 404);
    return decorateVisit(visit);
  }

  async function createManualVisit(input, context = {}) {
    const created = await consumer.createVisitAccount({
      reservationId: null,
      displayName: normalizeText(input?.displayName ?? input?.display_name),
      locationLabel: normalizeText(input?.locationLabel ?? input?.location_label),
      notes: normalizeText(input?.notes),
      openedAt: Date.now(),
      openedBy: normalizeUserId(context?.user),
    });
    return decorateVisit(await consumer.getVisitAccountById(created.id));
  }

  async function openFromReservation(reservationIdInput, input = {}, context = {}) {
    const reservationId = normalizeInt(reservationIdInput);
    if (!reservationId) throw serviceError("reservationId is required");

    const reservation = await consumer.getReservationById(reservationId);
    if (!reservation) throw serviceError("Reservation not found", 404);

    const existing = await consumer.getActiveVisitByReservationId(reservationId);
    if (existing) {
      const err = serviceError("Reservation already has an active visit", 409);
      err.visitAccountId = existing.id;
      throw err;
    }

    const created = await consumer.createVisitAccount({
      reservationId,
      displayName:
        normalizeText(input?.displayName ?? input?.display_name) ||
        buildReservationDisplayName(reservation),
      locationLabel:
        normalizeText(input?.locationLabel ?? input?.location_label) ||
        buildReservationLocationLabel(reservation),
      notes: normalizeText(input?.notes),
      openedAt: Date.now(),
      openedBy: normalizeUserId(context?.user),
    });
    return decorateVisit(await consumer.getVisitAccountById(created.id));
  }

  async function updateVisitAccount(idInput, input) {
    const id = normalizeInt(idInput);
    if (!id) throw serviceError("id is required");

    const existing = await consumer.getVisitAccountById(id);
    if (!existing) throw serviceError("Visit account not found", 404);
    if (["CLOSED", "CANCELLED"].includes(String(existing.status))) {
      throw serviceError("Visit account is not editable", 409);
    }

    const updated = await consumer.updateVisitAccount(id, {
      displayName: normalizeText(input?.displayName ?? input?.display_name),
      locationLabel: normalizeText(input?.locationLabel ?? input?.location_label),
      notes: normalizeText(input?.notes),
    });
    return decorateVisit(await consumer.getVisitAccountById(updated.id));
  }

  async function closeVisitAccount(idInput, input = {}, context = {}) {
    const id = normalizeInt(idInput);
    if (!id) throw serviceError("id is required");

    const existing = decorateVisit(await consumer.getVisitAccountById(id));
    if (!existing) throw serviceError("Visit account not found", 404);
    if (String(existing.status) === "CLOSED") return existing;
    if (String(existing.status) === "CANCELLED") {
      throw serviceError("Cancelled visit accounts cannot be closed", 409);
    }

    const reason = normalizeText(input?.reason ?? input?.closeReason);
    if (existing.pending_amount > 0 && (!isAdminUser(context?.user) || !reason)) {
      throw serviceError("Pending balance requires admin reason", 409);
    }

    const updated = await consumer.setVisitStatus(id, {
      status: "CLOSED",
      closedAt: Date.now(),
      closedBy: normalizeUserId(context?.user),
      closeReason: reason,
    });
    return decorateVisit(await consumer.getVisitAccountById(updated.id));
  }

  async function cancelVisitAccount(idInput, input = {}, context = {}) {
    const id = normalizeInt(idInput);
    if (!id) throw serviceError("id is required");

    const existing = await consumer.getVisitAccountById(id);
    if (!existing) throw serviceError("Visit account not found", 404);
    if (String(existing.status) === "CLOSED") {
      throw serviceError("Closed visit accounts cannot be cancelled", 409);
    }
    if (String(existing.status) === "CANCELLED") return decorateVisit(existing);

    const reason = normalizeText(input?.reason ?? input?.closeReason);
    if (!reason) throw serviceError("reason is required");

    const updated = await consumer.setVisitStatus(id, {
      status: "CANCELLED",
      closedAt: Date.now(),
      closedBy: normalizeUserId(context?.user),
      closeReason: reason,
    });
    return decorateVisit(await consumer.getVisitAccountById(updated.id));
  }

  async function listOrderItems(visitAccountIdInput) {
    const visitAccountId = normalizePositiveInt(
      visitAccountIdInput,
      "visitAccountId"
    );
    const visit = await consumer.getVisitAccountById(visitAccountId);
    if (!visit) throw serviceError("Visit account not found", 404);
    return consumer.listOrderItems(visitAccountId);
  }

  async function createOrderItem(visitAccountIdInput, input = {}, context = {}) {
    const visitAccountId = normalizePositiveInt(
      visitAccountIdInput,
      "visitAccountId"
    );
    const visit = await consumer.getVisitAccountById(visitAccountId);
    assertVisitAllowsOrders(visit);

    const productId = normalizePositiveInt(
      input?.productId ?? input?.product_id,
      "productId"
    );
    const product = await consumer.getProductById(productId);
    if (!product) throw serviceError("Product not found", 404);
    if (
      product.available === false ||
      product.available === 0 ||
      product.available === "0"
    ) {
      throw serviceError("Product is not available", 409);
    }

    const quantity = normalizePositiveInt(input?.quantity, "quantity");
    const type = normalizeOrderType(input?.type);
    const notes = normalizeText(input?.notes);
    let courtesyReason = null;

    if (type === "COURTESY") {
      if (!isCourtesyAllowed(context?.user)) throw serviceError("Forbidden", 403);
      courtesyReason = normalizeCourtesyReason(
        input?.courtesyReason ?? input?.courtesy_reason
      );
      if (courtesyReason === "OTHER" && !notes) {
        throw serviceError("notes are required for OTHER courtesy reason");
      }
    }

    const unitPrice = normalizeInt(product.price) || 0;
    const commercialSubtotal = unitPrice * quantity;
    const chargedSubtotal = type === "COURTESY" ? 0 : commercialSubtotal;
    const createdAt = Date.now();

    return consumer.createOrderItem({
      visitAccountId,
      productId,
      productNameSnapshot: product.name,
      unitPriceSnapshot: unitPrice,
      quantity,
      commercialSubtotal,
      chargedSubtotal,
      type,
      courtesyReason,
      notes,
      createdAt,
      createdBy: normalizeUserId(context?.user),
    });
  }

  async function updateOrderItemQuantity(
    visitAccountIdInput,
    itemIdInput,
    input = {},
    context = {}
  ) {
    const visitAccountId = normalizePositiveInt(
      visitAccountIdInput,
      "visitAccountId"
    );
    const itemId = normalizePositiveInt(itemIdInput, "itemId");
    const visit = await consumer.getVisitAccountById(visitAccountId);
    assertVisitAllowsOrders(visit);
    const item = await consumer.getOrderItemById(visitAccountId, itemId);
    if (!item) throw serviceError("Order item not found", 404);
    if (String(item.status) !== "ACTIVE") {
      throw serviceError("Order item is not editable", 409);
    }
    if (Number(item.paid_allocated || 0) > 0) {
      throw serviceError("Paid order items cannot be modified directly", 409);
    }

    const quantity = normalizePositiveInt(input?.quantity, "quantity");
    const unitPrice = normalizeInt(item.unit_price_snapshot) || 0;
    const commercialSubtotal = unitPrice * quantity;
    const chargedSubtotal =
      String(item.type).toUpperCase() === "COURTESY" ? 0 : commercialSubtotal;
    const updated = await consumer.updateOrderItemQuantity({
      visitAccountId,
      itemId,
      quantity,
      commercialSubtotal,
      chargedSubtotal,
      updatedBy: normalizeUserId(context?.user),
      updatedAt: Date.now(),
    });
    if (!updated) throw serviceError("Order item not found", 404);
    return updated;
  }

  async function cancelOrderItem(
    visitAccountIdInput,
    itemIdInput,
    input = {},
    context = {}
  ) {
    const visitAccountId = normalizePositiveInt(
      visitAccountIdInput,
      "visitAccountId"
    );
    const itemId = normalizePositiveInt(itemIdInput, "itemId");
    const visit = await consumer.getVisitAccountById(visitAccountId);
    assertVisitAllowsOrders(visit);
    const item = await consumer.getOrderItemById(visitAccountId, itemId);
    if (!item) throw serviceError("Order item not found", 404);
    if (String(item.status) !== "ACTIVE") return item;
    if (Number(item.paid_allocated || 0) > 0) {
      throw serviceError("Paid order items cannot be cancelled directly", 409);
    }

    const reason = normalizeText(input?.reason ?? input?.cancelReason);
    if (!reason) throw serviceError("reason is required");

    const cancelled = await consumer.cancelOrderItem({
      visitAccountId,
      itemId,
      reason,
      cancelledAt: Date.now(),
      cancelledBy: normalizeUserId(context?.user),
    });
    if (!cancelled) throw serviceError("Order item not found", 404);
    return cancelled;
  }

  async function listVisitPayments(visitAccountIdInput) {
    const visitAccountId = normalizePositiveInt(
      visitAccountIdInput,
      "visitAccountId"
    );
    const visit = await consumer.getVisitAccountById(visitAccountId);
    if (!visit) throw serviceError("Visit account not found", 404);
    return consumer.listVisitPayments(visitAccountId);
  }

  async function createVisitPayment(visitAccountIdInput, input = {}, context = {}) {
    const visitAccountId = normalizePositiveInt(
      visitAccountIdInput,
      "visitAccountId"
    );
    const visit = decorateVisit(await consumer.getVisitAccountById(visitAccountId));
    if (!visit) throw serviceError("Visit account not found", 404);
    if (["CLOSED", "CANCELLED"].includes(String(visit.status))) {
      throw serviceError("Visit account does not allow payments", 409);
    }

    const amount = normalizeMoney(input?.amount);
    if (amount > visit.pending_amount) {
      throw serviceError("Payment exceeds visit pending amount", 409);
    }

    const financialAccountId = normalizePositiveInt(
      input?.financialAccountId ?? input?.financial_account_id,
      "financialAccountId"
    );
    const account = await consumer.getFinancialAccountForPayment(
      financialAccountId
    );
    if (!account) throw serviceError("Financial account not found", 404);
    if (
      !isActiveBoolean(account.active) ||
      !isActiveBoolean(account.available_for_customer_payments)
    ) {
      throw serviceError(
        "Financial account is not available for customer payments",
        409
      );
    }

    const allocations = normalizePaymentAllocations(input?.allocations, amount);
    const createdAt = Date.now();
    return consumer.createVisitPayment({
      visitAccountId,
      amount,
      financialAccountId,
      paidAt: normalizeTimestamp(input?.paidAt ?? input?.paid_at, createdAt),
      notes: normalizeText(input?.notes),
      createdBy: normalizeUserId(context?.user),
      createdAt,
      allocations,
    });
  }

  async function voidVisitPayment(
    visitAccountIdInput,
    paymentIdInput,
    input = {},
    context = {}
  ) {
    const visitAccountId = normalizePositiveInt(
      visitAccountIdInput,
      "visitAccountId"
    );
    const paymentId = normalizePositiveInt(paymentIdInput, "paymentId");
    if (!isAdminUser(context?.user)) throw serviceError("Forbidden", 403);
    const payment = await consumer.getVisitPaymentById(visitAccountId, paymentId);
    if (!payment) throw serviceError("Payment not found", 404);
    if (String(payment.status).toUpperCase() === "VOIDED") {
      throw serviceError("Payment is already voided", 409);
    }

    const reason = normalizeText(input?.reason ?? input?.voidReason);
    if (!reason) throw serviceError("reason is required");

    const voided = await consumer.voidVisitPayment({
      visitAccountId,
      paymentId,
      reason,
      voidedAt: Date.now(),
      voidedBy: normalizeUserId(context?.user),
    });
    if (!voided) throw serviceError("Payment not found", 404);
    return voided;
  }

  return {
    listVisitAccounts,
    listPaymentFinancialAccounts,
    getVisitAccount,
    createManualVisit,
    openFromReservation,
    updateVisitAccount,
    closeVisitAccount,
    cancelVisitAccount,
    listOrderItems,
    createOrderItem,
    updateOrderItemQuantity,
    cancelOrderItem,
    listVisitPayments,
    createVisitPayment,
    voidVisitPayment,
  };
}

module.exports = buildAdminVisitAccountsService;
