import { type SyntheticEvent, useCallback, useEffect, useMemo, useState } from "react";
import { adminRequest } from "../../../api/adminClient";
import {
  Alert,
  Button,
  ButtonGroup,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Menu,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import "../adminCrud.scss";

type VisitStatus = "OPEN" | "PARTIALLY_PAID" | "PAID" | "CLOSED" | "CANCELLED";

type VisitAccountRow = {
  id: number;
  reservation_id: number | null;
  display_name: string | null;
  location_label: string | null;
  status: VisitStatus;
  opened_at: number | string;
  closed_at: number | string | null;
  notes: string | null;
  room_name: string | null;
  reservation_date: string | null;
  reservation_start_time: string | null;
  first_name: string | null;
  last_name: string | null;
  players: number | null;
  reservation_total: number | string | null;
  reservation_total_paid?: number | string;
  order_charged_total?: number | string;
  courtesy_commercial_total?: number | string;
  visit_total: number | string;
  total_paid: number | string;
  pending_amount: number | string;
  display_label: string;
};

type ProductRow = {
  id: number;
  name: string;
  price: number;
  available: boolean | number | string;
  category_id: number | null;
  category: string | null;
  track_inventory?: boolean | number | string;
  track_expiration?: boolean | number | string;
  minimum_stock?: number | null;
  unit?: string | null;
  current_stock?: number | string;
  sellable_stock?: number | string;
  active_recipe_id?: number | null;
  active_recipe_version?: number | null;
  controlled_item_count?: number | string | null;
  recipe_max_quantity?: number | string | null;
};

type OrderItemRow = {
  id: number;
  visit_account_id: number;
  product_id: number;
  product_name_snapshot: string;
  unit_price_snapshot: number | string;
  quantity: number;
  commercial_subtotal: number | string;
  charged_subtotal: number | string;
  paid_allocated?: number | string;
  pending_amount?: number | string;
  type: "SALE" | "COURTESY";
  courtesy_reason: string | null;
  notes: string | null;
  status: "ACTIVE" | "CANCELLED";
  recipe_id?: number | null;
  recipe_version?: number | null;
  recipe_consumption?: Array<{
    supplyId: number;
    supplyName: string;
    quantity: number | string;
    unit: string;
  }>;
  unit_cost?: number | string | null;
  total_cost?: number | string | null;
  gross_profit?: number | string | null;
  gross_margin?: number | string | null;
  costing_method?: string | null;
  cost_incomplete?: boolean | number | string | null;
  cost_status?: "ACTIVE" | "VOIDED" | null;
  cost_components?: Array<{
    name: string;
    quantity: number | string;
    unitCost: number | string | null;
    totalCost: number | string;
    costingMethod: string | null;
    costIncomplete: boolean | number | string;
  }>;
};

type PayablePaymentItem = {
  key: string;
  orderItemId: number | null;
  label: string;
  quantity: number | string;
  pendingAmount: number;
};

type PaymentAccountRow = {
  id: number;
  name: string;
  type: string;
};

type VisitPaymentRow = {
  id: number;
  amount: number | string;
  financial_account_name: string | null;
  paid_at: number | string;
  notes: string | null;
  status: "CONFIRMED" | "VOIDED";
  allocations?: Array<{
    id: number;
    orderItemId: number | null;
    component: string | null;
    amount: number;
  }>;
};

type ReservationPaymentRow = {
  id: number;
  amount: number | string;
  financial_account_name: string | null;
  paid_at: number | string;
  status: "CONFIRMED" | "VOIDED";
};

type FormState = {
  displayName: string;
  locationLabel: string;
  notes: string;
};

type ConfirmAction = {
  visit: VisitAccountRow;
  action: "close" | "cancel";
  reason: string;
};

type StatusFilter = "OPEN_ACCOUNTS" | VisitStatus;

type StoredUser = {
  role?: string;
  canCreateCourtesy?: boolean;
};

const locationOptions = ["Mesa 1", "Mesa 2", "Mostrador", "Evento", "Otra"];
const courtesyReasons = [
  "PROMOTION",
  "BIRTHDAY",
  "COMPENSATION",
  "LOYALTY",
  "EVENT",
  "OTHER",
];
const visitStatusLabels: Record<VisitStatus, string> = {
  OPEN: "Pendiente por pagar",
  PARTIALLY_PAID: "Pago parcial",
  PAID: "Pagada",
  CLOSED: "Cerrada",
  CANCELLED: "Cancelada",
};
const visitStatusFilterOptions: Array<{
  value: StatusFilter;
  label: string;
}> = [
  { value: "OPEN_ACCOUNTS", label: "Abierta" },
  { value: "OPEN", label: visitStatusLabels.OPEN },
  { value: "PARTIALLY_PAID", label: visitStatusLabels.PARTIALLY_PAID },
  { value: "PAID", label: visitStatusLabels.PAID },
  { value: "CLOSED", label: visitStatusLabels.CLOSED },
  { value: "CANCELLED", label: visitStatusLabels.CANCELLED },
];
const visitStatusFilterValues = new Set<StatusFilter>(
  visitStatusFilterOptions.map((option) => option.value)
);
const groupedOpenStatuses: VisitStatus[] = [
  "OPEN",
  "PARTIALLY_PAID",
  "PAID",
];

function getStoredAdminUser(): StoredUser | null {
  const raw = localStorage.getItem("adminUser");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredUser;
  } catch {
    return null;
  }
}

function canCurrentUserCreateCourtesy() {
  const user = getStoredAdminUser();
  const role = String(user?.role || "").toLowerCase();
  return role === "admin" || role === "game_master" || user?.canCreateCourtesy === true;
}

function isCurrentUserAdmin() {
  return getStoredAdminUser()?.role === "admin";
}

function formatMoney(value: number | string | null) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function formatDateTime(value: number | string | null) {
  const ms = Number(value);
  if (!Number.isFinite(ms)) return "";
  return new Date(ms).toLocaleString("es-CO");
}

function isTruthy(value: boolean | number | string | undefined) {
  return value === true || value === 1 || value === "1" || value === "true";
}

function getOrderActionErrorMessage(err: unknown, fallback: string) {
  const message = err instanceof Error ? err.message : fallback;
  if (
    message === "Paid order items cannot be modified directly" ||
    message === "Paid order items cannot be cancelled directly"
  ) {
    return "Este item ya tiene un pago asignado. Primero anula o corrige el pago para poder editarlo o cancelarlo.";
  }
  return message;
}

function tracksInventory(product: ProductRow) {
  return isTruthy(product.track_inventory);
}

function getCurrentStock(product: ProductRow) {
  return isTruthy(product.track_expiration)
    ? Number(product.sellable_stock ?? product.current_stock ?? 0)
    : Number(product.current_stock || 0);
}

function reservationName(row: VisitAccountRow) {
  return [row.first_name, row.last_name]
    .map((part) => String(part || "").trim())
    .filter(Boolean)
    .join(" ");
}

function statusColor(status: VisitStatus) {
  if (status === "PAID" || status === "CLOSED") return "success";
  if (status === "PARTIALLY_PAID") return "warning";
  if (status === "CANCELLED") return "error";
  return "primary";
}

export default function AdminVisitAccounts() {
  const [rows, setRows] = useState<VisitAccountRow[]>([]);
  const [lastLoadedAt, setLastLoadedAt] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] =
    useState<StatusFilter>("OPEN_ACCOUNTS");
  const [status, setStatus] = useState<
    | { type: "idle" }
    | { type: "loading" }
    | { type: "error"; message: string }
    | { type: "success"; message: string }
  >({ type: "loading" });
  const [form, setForm] = useState<FormState>({
    displayName: "",
    locationLabel: "Mesa 1",
    notes: "",
  });
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [orderVisit, setOrderVisit] = useState<VisitAccountRow | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItemRow[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [orderStatus, setOrderStatus] = useState<
    "idle" | "loading" | "error"
  >("idle");
  const [orderError, setOrderError] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [orderQuantity, setOrderQuantity] = useState("1");
  const [courtesyReason, setCourtesyReason] = useState("BIRTHDAY");
  const [orderNotes, setOrderNotes] = useState("");
  const [paymentVisit, setPaymentVisit] = useState<VisitAccountRow | null>(null);
  const [paymentItems, setPaymentItems] = useState<OrderItemRow[]>([]);
  const [visitPayments, setVisitPayments] = useState<VisitPaymentRow[]>([]);
  const [reservationPayments, setReservationPayments] = useState<
    ReservationPaymentRow[]
  >([]);
  const [paymentAccounts, setPaymentAccounts] = useState<PaymentAccountRow[]>(
    []
  );
  const [selectedPaymentItems, setSelectedPaymentItems] = useState<Set<string>>(
    () => new Set()
  );
  const [paymentAllocationAmounts, setPaymentAllocationAmounts] = useState<
    Record<string, string>
  >({});
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentAccountId, setPaymentAccountId] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<
    "idle" | "loading" | "error"
  >("idle");
  const [actionMenu, setActionMenu] = useState<{
    visitId: number;
    anchorEl: HTMLElement;
  } | null>(null);
  const [snackbar, setSnackbar] = useState<{
    severity: "error" | "warning" | "success" | "info";
    message: string;
  } | null>(null);
  const canCreateCourtesy = useMemo(canCurrentUserCreateCourtesy, []);
  const canForceClosePendingBalance = useMemo(isCurrentUserAdmin, []);

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => Number(b.opened_at) - Number(a.opened_at));
  }, [rows]);

  const visibleRows = useMemo(() => {
    if (statusFilter !== "OPEN_ACCOUNTS") return sorted;
    return sorted.filter((row) => groupedOpenStatuses.includes(row.status));
  }, [sorted, statusFilter]);

  const actionsCellSx = {
    position: "sticky" as const,
    right: 0,
    minWidth: 300,
    backgroundColor: "rgba(17,24,39,0.98)",
    boxShadow: "-12px 0 18px rgba(15,23,42,0.32)",
    zIndex: 1,
  };

  function closeActionMenu() {
    setActionMenu(null);
  }

  function closeSnackbar(
    _event?: SyntheticEvent | Event,
    reason?: string
  ) {
    if (reason === "clickaway") return;
    setSnackbar(null);
  }

  const confirmActionPendingAmount = Number(
    confirmAction?.visit.pending_amount || 0
  );
  const isBlockedPendingClose =
    confirmAction?.action === "close" &&
    confirmActionPendingAmount > 0 &&
    !canForceClosePendingBalance;
  const requiresCloseReason =
    confirmAction?.action === "close" &&
    confirmActionPendingAmount > 0 &&
    canForceClosePendingBalance;

  const productCategories = useMemo(() => {
    return Array.from(
      new Set(
        products
          .map((product) => product.category)
          .filter((category): category is string => Boolean(category))
      )
    ).sort((a, b) => a.localeCompare(b));
  }, [products]);

  const filteredProducts = useMemo(() => {
    const search = productSearch.trim().toLocaleLowerCase("es-CO");
    return products
      .filter((product) => {
        const isAvailable =
          product.available === true ||
          product.available === 1 ||
          product.available === "1";
        if (!isAvailable) return false;
        if (categoryFilter !== "all" && product.category !== categoryFilter) {
          return false;
        }
        if (!search) return true;
        return product.name.toLocaleLowerCase("es-CO").includes(search);
      })
      .sort((a, b) => {
        const categoryCompare = String(a.category || "").localeCompare(
          String(b.category || "")
        );
        if (categoryCompare !== 0) return categoryCompare;
        return a.name.localeCompare(b.name);
      });
  }, [categoryFilter, productSearch, products]);

  const load = useCallback(async (nextStatusFilter = statusFilter) => {
    setStatus({ type: "loading" });
    try {
      const params = new URLSearchParams();
      if (nextStatusFilter !== "OPEN_ACCOUNTS") {
        params.set("status", nextStatusFilter);
      }
      const query = params.toString();
      const data = await adminRequest<VisitAccountRow[]>(
        `/api/admin/visit-accounts${query ? `?${query}` : ""}`
      );
      setRows(data || []);
      setLastLoadedAt(Date.now());
      setStatus({ type: "idle" });
    } catch {
      setStatus({
        type: "error",
        message: "No se pudieron cargar las cuentas abiertas.",
      });
    }
  }, [statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onFocus = () => void load();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [load]);

  async function createManualVisit() {
    setStatus({ type: "loading" });
    try {
      await adminRequest("/api/admin/visit-accounts", {
        method: "POST",
        body: {
          displayName: form.displayName || null,
          locationLabel: form.locationLabel || null,
          notes: form.notes || null,
        },
      });
      setForm({ displayName: "", locationLabel: "Mesa 1", notes: "" });
      setStatus({ type: "success", message: "Cuenta creada." });
      await load();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "No se pudo crear la cuenta.";
      setStatus({ type: "error", message });
    }
  }

  async function updateVisit(row: VisitAccountRow) {
    setStatus({ type: "loading" });
    try {
      await adminRequest(`/api/admin/visit-accounts/${row.id}`, {
        method: "PATCH",
        body: {
          displayName: row.display_name || null,
          locationLabel: row.location_label || null,
          notes: row.notes || null,
        },
      });
      setStatus({ type: "success", message: `Cuenta #${row.id} actualizada.` });
      await load();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "No se pudo actualizar la cuenta.";
      setStatus({ type: "error", message });
    }
  }

  async function confirmVisitAction() {
    if (!confirmAction) return;
    setStatus({ type: "loading" });
    try {
      await adminRequest(
        `/api/admin/visit-accounts/${confirmAction.visit.id}/${confirmAction.action}`,
        {
          method: "POST",
          body: { reason: confirmAction.reason || null },
        }
      );
      setConfirmAction(null);
      setStatus({
        type: "success",
        message:
          confirmAction.action === "close"
            ? "Cuenta cerrada."
            : "Cuenta cancelada.",
      });
      await load();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "No se pudo cambiar el estado.";
      setStatus({ type: "error", message });
    }
  }

  async function openOrders(row: VisitAccountRow) {
    setOrderVisit(row);
    setOrderStatus("loading");
    setOrderError("");
    try {
      const [itemsData, productData] = await Promise.all([
        adminRequest<OrderItemRow[]>(
          `/api/admin/visit-accounts/${row.id}/order-items`
        ),
        adminRequest<ProductRow[]>("/api/admin/cafeteria-products"),
      ]);
      setOrderItems(itemsData || []);
      setProducts(productData || []);
      setOrderStatus("idle");
    } catch (err) {
      setOrderStatus("error");
      setOrderError(err instanceof Error ? err.message : "No se pudo cargar el pedido.");
    }
  }

  async function reloadOrders() {
    if (!orderVisit) return;
    const [itemsData, productData] = await Promise.all([
      adminRequest<OrderItemRow[]>(
        `/api/admin/visit-accounts/${orderVisit.id}/order-items`
      ),
      adminRequest<ProductRow[]>("/api/admin/cafeteria-products"),
    ]);
    setOrderItems(itemsData || []);
    setProducts(productData || []);
    await load();
  }

  async function addOrderItem(product: ProductRow, type: "SALE" | "COURTESY") {
    if (!orderVisit) return;
    const quantity = Number(orderQuantity || 1);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setStatus({ type: "error", message: "La cantidad debe ser valida." });
      return;
    }
    setOrderStatus("loading");
    setOrderError("");
    try {
      await adminRequest(`/api/admin/visit-accounts/${orderVisit.id}/order-items`, {
        method: "POST",
        body: {
          productId: product.id,
          quantity,
          type,
          courtesyReason: type === "COURTESY" ? courtesyReason : null,
          notes: orderNotes || null,
        },
      });
      setOrderNotes("");
      setOrderStatus("idle");
      await reloadOrders();
    } catch (err) {
      setOrderStatus("error");
      setOrderError(err instanceof Error ? err.message : "No se pudo agregar el producto.");
    }
  }

  async function updateOrderQuantity(item: OrderItemRow, quantity: number) {
    if (!orderVisit || quantity <= 0) return;
    setOrderStatus("loading");
    setOrderError("");
    try {
      await adminRequest(
        `/api/admin/visit-accounts/${orderVisit.id}/order-items/${item.id}`,
        {
          method: "PATCH",
          body: { quantity },
        }
      );
      setOrderStatus("idle");
      await reloadOrders();
    } catch (err) {
      const message = getOrderActionErrorMessage(
        err,
        "No se pudo cambiar la cantidad."
      );
      setOrderStatus("error");
      setOrderError(message);
      setSnackbar({ severity: "warning", message });
    }
  }

  async function cancelOrderItem(item: OrderItemRow) {
    if (!orderVisit) return;
    const reason = window.prompt("Motivo de cancelacion del producto");
    if (!reason?.trim()) return;
    setOrderStatus("loading");
    setOrderError("");
    try {
      await adminRequest(
        `/api/admin/visit-accounts/${orderVisit.id}/order-items/${item.id}/cancel`,
        {
          method: "POST",
          body: { reason },
        }
      );
      setOrderStatus("idle");
      await reloadOrders();
    } catch (err) {
      const message = getOrderActionErrorMessage(
        err,
        "No se pudo cancelar el producto."
      );
      setOrderStatus("error");
      setOrderError(message);
      setSnackbar({ severity: "warning", message });
    }
  }

  const activeOrderItems = orderItems.filter((item) => item.status === "ACTIVE");
  const cancelledOrderItems = orderItems.filter(
    (item) => item.status === "CANCELLED"
  );
  const orderChargedTotal = activeOrderItems.reduce(
    (sum, item) => sum + Number(item.charged_subtotal || 0),
    0
  );

  const payableItems = paymentItems.filter(
    (item) =>
      item.status === "ACTIVE" &&
      item.type !== "COURTESY" &&
      Number(item.pending_amount ?? item.charged_subtotal) > 0
  );
  const payableProductTotal = payableItems.reduce(
    (sum, item) =>
      sum + Number(item.pending_amount ?? item.charged_subtotal ?? 0),
    0
  );
  const visitBalancePending = Math.max(
    Number(paymentVisit?.pending_amount || 0) - payableProductTotal,
    0
  );
  const payablePaymentItems: PayablePaymentItem[] = [
    ...(paymentVisit?.reservation_id && visitBalancePending > 0
      ? [
          {
            key: "visit-balance",
            orderItemId: null,
            label: paymentVisit.room_name
              ? `Sala de escape - ${paymentVisit.room_name}`
              : "Sala de escape",
            quantity: paymentVisit.players || 1,
            pendingAmount: visitBalancePending,
          },
        ]
      : []),
    ...payableItems.map((item) => ({
      key: `order:${item.id}`,
      orderItemId: item.id,
      label: item.product_name_snapshot,
      quantity: item.quantity,
      pendingAmount: Number(item.pending_amount ?? item.charged_subtotal ?? 0),
    })),
  ];
  const selectedPaymentTotal = payablePaymentItems.reduce((sum, item) => {
    if (!selectedPaymentItems.has(item.key)) return sum;
    const amount = Number(paymentAllocationAmounts[item.key] || 0);
    return sum + (Number.isFinite(amount) ? amount : 0);
  }, 0);
  const selectedPayableCount = payablePaymentItems.filter((item) =>
    selectedPaymentItems.has(item.key)
  ).length;
  const allPayableSelected =
    payablePaymentItems.length > 0 &&
    selectedPayableCount === payablePaymentItems.length;
  const somePayableSelected =
    selectedPayableCount > 0 && selectedPayableCount < payablePaymentItems.length;
  const suggestedPaymentAmount = selectedPaymentTotal || Number(paymentAmount || 0);
  const hasInvalidSelectedPaymentAmount = payablePaymentItems.some((item) => {
    if (!selectedPaymentItems.has(item.key)) return false;
    const amount = Number(paymentAllocationAmounts[item.key] || 0);
    return !Number.isFinite(amount) || amount <= 0 || amount > item.pendingAmount;
  });

  function toggleAllPayableItems(checked: boolean) {
    if (!checked) {
      setSelectedPaymentItems(new Set());
      setPaymentAllocationAmounts({});
      return;
    }
    setSelectedPaymentItems(new Set(payablePaymentItems.map((item) => item.key)));
    setPaymentAllocationAmounts(
      Object.fromEntries(
        payablePaymentItems.map((item) => [
          item.key,
          String(item.pendingAmount),
        ])
      )
    );
  }

  function togglePaymentItem(item: PayablePaymentItem, checked: boolean) {
    setSelectedPaymentItems((current) => {
      const next = new Set(current);
      if (checked) next.add(item.key);
      else next.delete(item.key);
      return next;
    });
    setPaymentAllocationAmounts((current) => {
      const next = { ...current };
      if (checked) next[item.key] = next[item.key] || String(item.pendingAmount);
      else delete next[item.key];
      return next;
    });
  }

  function updatePaymentItemAmount(item: PayablePaymentItem, value: string) {
    setPaymentAllocationAmounts((current) => ({
      ...current,
      [item.key]: value,
    }));
  }

  async function loadPaymentData(row: VisitAccountRow) {
    setPaymentStatus("loading");
    try {
      const [
        visitData,
        itemsData,
        visitPaymentsData,
        accountsData,
        reservationPaymentsData,
      ] =
        await Promise.all([
          adminRequest<VisitAccountRow>(`/api/admin/visit-accounts/${row.id}`),
          adminRequest<OrderItemRow[]>(
            `/api/admin/visit-accounts/${row.id}/order-items`
          ),
          adminRequest<VisitPaymentRow[]>(
            `/api/admin/visit-accounts/${row.id}/payments`
          ),
          adminRequest<PaymentAccountRow[]>(
            "/api/admin/visit-accounts/payment-accounts"
          ),
          row.reservation_id
            ? adminRequest<ReservationPaymentRow[]>(
                `/api/admin/reservations/${row.reservation_id}/payments`
              )
            : Promise.resolve([]),
        ]);
      setPaymentVisit(visitData);
      setPaymentItems(itemsData || []);
      setVisitPayments(visitPaymentsData || []);
      setPaymentAccounts(accountsData || []);
      setReservationPayments(reservationPaymentsData || []);
      setPaymentAccountId((current) => current || String(accountsData[0]?.id || ""));
      setPaymentStatus("idle");
    } catch {
      setPaymentStatus("error");
    }
  }

  async function openPayments(row: VisitAccountRow) {
    setPaymentVisit(row);
    setSelectedPaymentItems(new Set());
    setPaymentAllocationAmounts({});
    setPaymentAmount("");
    setPaymentNotes("");
    await loadPaymentData(row);
  }

  async function registerPayment() {
    if (!paymentVisit) return;
    const amount = selectedPaymentTotal || Number(paymentAmount || 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      setPaymentStatus("error");
      return;
    }
    if (!paymentAccountId) {
      setPaymentStatus("error");
      return;
    }
    const selectedAllocations = payablePaymentItems
      .filter((item) => selectedPaymentItems.has(item.key))
      .map((item) => {
        const allocationAmount = Number(paymentAllocationAmounts[item.key] || 0);
        return {
          item,
          amount: allocationAmount,
        };
      })
      .filter(({ amount }) => Number.isFinite(amount) && amount > 0);
    if (
      selectedAllocations.some(
        ({ item, amount }) => amount > item.pendingAmount
      )
    ) {
      setPaymentStatus("error");
      return;
    }
    const allocations = selectedAllocations.map(({ item, amount }) => ({
      orderItemId: item.orderItemId,
      component: item.orderItemId ? null : "VISIT_BALANCE",
      amount,
    }));

    setPaymentStatus("loading");
    try {
      await adminRequest(`/api/admin/visit-accounts/${paymentVisit.id}/payments`, {
        method: "POST",
        body: {
          amount,
          financialAccountId: Number(paymentAccountId),
          notes: paymentNotes || null,
          allocations,
        },
      });
      setSelectedPaymentItems(new Set());
      setPaymentAllocationAmounts({});
      setPaymentAmount("");
      setPaymentNotes("");
      await loadPaymentData(paymentVisit);
      await load();
    } catch {
      setPaymentStatus("error");
    }
  }

  async function voidPayment(payment: VisitPaymentRow) {
    if (!paymentVisit) return;
    const reason = window.prompt("Motivo de anulacion del pago");
    if (!reason?.trim()) return;
    setPaymentStatus("loading");
    try {
      await adminRequest(
        `/api/admin/visit-accounts/${paymentVisit.id}/payments/${payment.id}/void`,
        {
          method: "POST",
          body: { reason },
        }
      );
      await loadPaymentData(paymentVisit);
      await load();
    } catch {
      setPaymentStatus("error");
    }
  }
  const courtesyCommercialTotal = activeOrderItems.reduce(
    (sum, item) =>
      item.type === "COURTESY"
        ? sum + Number(item.commercial_subtotal || 0)
        : sum,
    0
  );

  return (
    <div className="admin-crud">
      <header className="admin-crud__header">
        <div>
          <Typography component="h1" className="admin-crud__title">
            Cuentas / visitas
          </Typography>
          <Typography className="admin-crud__subtitle">
            Administra las cuentas operativas abiertas en Logic.
          </Typography>
        </div>
        <div className="admin-crud__actions">
          <Button
            variant="outlined"
            onClick={() => void load()}
            disabled={status.type === "loading"}
          >
            Actualizar
          </Button>
        </div>
      </header>

      {status.type === "error" ? (
        <Alert severity="error">{status.message}</Alert>
      ) : null}
      {status.type === "success" ? (
        <Alert severity="success">{status.message}</Alert>
      ) : null}

      <Paper className="admin-crud__panel admin-crud__panel--accent">
        <div className="admin-crud__panel-inner admin-crud__grid">
          <div className="admin-crud__section-header">
            <div>
              <Typography component="h2" className="admin-crud__section-title">
                Crear cuenta manual
              </Typography>
              <Typography className="admin-crud__section-copy">
                Usala para mesas, mostrador o eventos sin reserva previa.
              </Typography>
            </div>
          </div>
          <div className="admin-crud__row">
            <TextField
              label="Nombre"
              value={form.displayName}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, displayName: e.target.value }))
              }
              placeholder="Andrea"
              size="small"
              fullWidth
            />
            <Select
              value={form.locationLabel}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  locationLabel: String(e.target.value),
                }))
              }
              size="small"
              fullWidth
            >
              {locationOptions.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
          </div>
          <TextField
            label="Observacion"
            value={form.notes}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, notes: e.target.value }))
            }
            size="small"
            fullWidth
          />
          <div className="admin-crud__actions">
            <Button
              variant="contained"
              onClick={() => void createManualVisit()}
              disabled={status.type === "loading"}
            >
              Crear cuenta
            </Button>
          </div>
        </div>
      </Paper>

      <Paper className="admin-crud__panel">
        <div className="admin-crud__panel-inner admin-crud__section-header">
          <div>
            <Typography component="h2" className="admin-crud__section-title">
              Cuentas
            </Typography>
            <Typography className="admin-crud__section-copy">
              {lastLoadedAt
                ? `Actualizado: ${formatDateTime(lastLoadedAt)}`
                : "Cargando cuentas."}
            </Typography>
          </div>
          <div className="admin-crud__meta">
            <Chip label={`${rows.length} cuentas`} size="small" />
            <Select
              value={statusFilter}
              onChange={(e) => {
                const next = e.target.value as StatusFilter;
                if (!visitStatusFilterValues.has(next)) return;
                setStatusFilter(next);
                void load(next);
              }}
              size="small"
            >
              {visitStatusFilterOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </div>
        </div>
        <TableContainer sx={{ overflowX: "auto" }}>
          <Table className="admin-crud__table admin-crud__table--comfortable">
            <TableHead>
              <TableRow>
                <TableCell>Cuenta</TableCell>
                <TableCell>Reserva</TableCell>
                <TableCell>Total</TableCell>
                <TableCell>Pagado</TableCell>
                <TableCell>Pendiente</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell>Notas</TableCell>
                <TableCell
                  sx={{ ...actionsCellSx, zIndex: 2 }}
                  aria-label="Acciones"
                >
                  Acciones
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {visibleRows.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell className="admin-crud__cell--wrap">
                    <Stack spacing={1}>
                      <Typography fontWeight={900}>
                        {row.display_label || `Cuenta #${row.id}`}
                      </Typography>
                      <Stack direction="row" spacing={1}>
                        <TextField
                          value={row.display_name ?? ""}
                          onChange={(e) =>
                            setRows((prev) =>
                              prev.map((item) =>
                                item.id === row.id
                                  ? { ...item, display_name: e.target.value }
                                  : item
                              )
                            )
                          }
                          placeholder={`Cuenta #${row.id}`}
                          size="small"
                        />
                        <TextField
                          value={row.location_label ?? ""}
                          onChange={(e) =>
                            setRows((prev) =>
                              prev.map((item) =>
                                item.id === row.id
                                  ? { ...item, location_label: e.target.value }
                                  : item
                              )
                            )
                          }
                          placeholder="Ubicacion"
                          size="small"
                        />
                      </Stack>
                      <Typography variant="body2" sx={{ opacity: 0.75 }}>
                        Abierta: {formatDateTime(row.opened_at)}
                      </Typography>
                    </Stack>
                  </TableCell>
                  <TableCell className="admin-crud__cell--wrap">
                    {row.reservation_id ? (
                      <Stack spacing={0.5}>
                        <Typography fontWeight={900}>
                          Reserva #{row.reservation_id}
                        </Typography>
                        <Typography variant="body2">
                          {reservationName(row)}
                        </Typography>
                        <Typography variant="body2" sx={{ opacity: 0.75 }}>
                          {[row.room_name, row.reservation_date, row.reservation_start_time]
                            .filter(Boolean)
                            .join(" · ")}
                        </Typography>
                      </Stack>
                    ) : (
                      "Manual"
                    )}
                  </TableCell>
                  <TableCell>{formatMoney(row.visit_total)}</TableCell>
                  <TableCell>{formatMoney(row.total_paid)}</TableCell>
                  <TableCell>{formatMoney(row.pending_amount)}</TableCell>
                  <TableCell>
                    <Chip
                      label={visitStatusLabels[row.status]}
                      color={statusColor(row.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell className="admin-crud__cell--wrap">
                    <TextField
                      value={row.notes ?? ""}
                      onChange={(e) =>
                        setRows((prev) =>
                          prev.map((item) =>
                            item.id === row.id
                              ? { ...item, notes: e.target.value }
                              : item
                          )
                        )
                      }
                      size="small"
                      fullWidth
                      multiline
                      minRows={2}
                    />
                  </TableCell>
                  <TableCell
                    className="admin-crud__cell--nowrap"
                    sx={actionsCellSx}
                  >
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Button
                        variant="contained"
                        size="small"
                        onClick={() => void updateVisit(row)}
                        disabled={["CLOSED", "CANCELLED"].includes(row.status)}
                      >
                        Guardar
                      </Button>
                      <ButtonGroup
                        variant="outlined"
                        size="small"
                        disabled={["CLOSED", "CANCELLED"].includes(row.status)}
                      >
                        <Button onClick={() => void openOrders(row)}>
                          Pedidos
                        </Button>
                        <Button
                          color="success"
                          onClick={() => void openPayments(row)}
                        >
                          Cobrar
                        </Button>
                        <Button
                          aria-label="Mas acciones"
                          aria-controls={
                            actionMenu?.visitId === row.id
                              ? `visit-actions-${row.id}`
                              : undefined
                          }
                          aria-expanded={
                            actionMenu?.visitId === row.id ? "true" : undefined
                          }
                          aria-haspopup="menu"
                          onClick={(event) =>
                            setActionMenu({
                              visitId: row.id,
                              anchorEl: event.currentTarget,
                            })
                          }
                        >
                          <ArrowDropDownIcon fontSize="small" />
                        </Button>
                      </ButtonGroup>
                      <Menu
                        id={`visit-actions-${row.id}`}
                        anchorEl={actionMenu?.anchorEl || null}
                        open={actionMenu?.visitId === row.id}
                        onClose={closeActionMenu}
                      >
                        <MenuItem
                          onClick={() => {
                            closeActionMenu();
                            setConfirmAction({
                              visit: row,
                              action: "close",
                              reason: "",
                            });
                          }}
                        >
                          Cerrar cuenta
                        </MenuItem>
                        <MenuItem
                          onClick={() => {
                            closeActionMenu();
                            setConfirmAction({
                              visit: row,
                              action: "cancel",
                              reason: "",
                            });
                          }}
                          sx={{ color: "error.main" }}
                        >
                          Cancelar cuenta
                        </MenuItem>
                      </Menu>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
              {visibleRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8}>Sin cuentas.</TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog
        open={confirmAction != null}
        onClose={() => setConfirmAction(null)}
        aria-labelledby="visit-account-action-title"
      >
        <DialogTitle id="visit-account-action-title">
          {confirmAction?.action === "close" ? "Cerrar cuenta" : "Cancelar cuenta"}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {confirmAction
              ? `${confirmAction.visit.display_label || `Cuenta #${confirmAction.visit.id}`}`
              : ""}
          </DialogContentText>
          {isBlockedPendingClose ? (
            <Alert severity="warning" sx={{ mt: 2 }}>
              Esta cuenta tiene un saldo pendiente de{" "}
              {formatMoney(confirmActionPendingAmount)}. Debes cobrar el saldo
              pendiente antes de cerrar la cuenta.
            </Alert>
          ) : null}
          {!isBlockedPendingClose ? (
            <TextField
              label="Motivo"
              value={confirmAction?.reason || ""}
              onChange={(e) =>
                setConfirmAction((prev) =>
                  prev ? { ...prev, reason: e.target.value } : prev
                )
              }
              fullWidth
              margin="dense"
              multiline
              minRows={2}
              required={
                confirmAction?.action === "cancel" || requiresCloseReason
              }
              helperText={
                requiresCloseReason
                  ? "Requerido para cerrar una cuenta con saldo pendiente."
                  : undefined
              }
            />
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setConfirmAction(null)}
            disabled={status.type === "loading"}
          >
            Volver
          </Button>
          {!isBlockedPendingClose ? (
            <Button
              variant="contained"
              color={confirmAction?.action === "cancel" ? "error" : "primary"}
              onClick={() => void confirmVisitAction()}
              disabled={
                status.type === "loading" ||
                ((confirmAction?.action === "cancel" || requiresCloseReason) &&
                  !confirmAction.reason.trim())
              }
            >
              Confirmar
            </Button>
          ) : null}
        </DialogActions>
      </Dialog>

      <Dialog
        open={orderVisit != null}
        onClose={() => setOrderVisit(null)}
        maxWidth="xl"
        fullWidth
        aria-labelledby="visit-orders-title"
      >
        <DialogTitle id="visit-orders-title">
          {orderVisit
            ? `Pedidos - ${orderVisit.display_label || `Cuenta #${orderVisit.id}`}`
            : "Pedidos"}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            {orderStatus === "error" ? (
              <Alert severity="error">
                {orderError || "No se pudo actualizar el pedido."}
              </Alert>
            ) : null}

            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Chip label={`Cafeteria ${formatMoney(orderChargedTotal)}`} />
              <Chip
                label={`Cortesias ${formatMoney(courtesyCommercialTotal)}`}
                color="secondary"
                variant="outlined"
              />
              <Chip label={`${activeOrderItems.length} activos`} size="small" />
            </Stack>

            <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
              <TextField
                label="Buscar producto"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                size="small"
                fullWidth
              />
              <Select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(String(e.target.value))}
                size="small"
                displayEmpty
              >
                <MenuItem value="all">Todas las categorias</MenuItem>
                {productCategories.map((category) => (
                  <MenuItem key={category} value={category}>
                    {category}
                  </MenuItem>
                ))}
              </Select>
              <TextField
                label="Cantidad"
                value={orderQuantity}
                onChange={(e) => setOrderQuantity(e.target.value)}
                type="number"
                inputProps={{ min: 1, step: 1, inputMode: "numeric" }}
                size="small"
              />
            </Stack>

            <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
              <Select
                value={courtesyReason}
                onChange={(e) => setCourtesyReason(String(e.target.value))}
                size="small"
                disabled={!canCreateCourtesy}
              >
                {courtesyReasons.map((reason) => (
                  <MenuItem key={reason} value={reason}>
                    {reason}
                  </MenuItem>
                ))}
              </Select>
              <TextField
                label="Notas"
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                size="small"
                fullWidth
              />
            </Stack>

            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Producto</TableCell>
                    <TableCell>Categoria</TableCell>
                    <TableCell>Precio</TableCell>
                    <TableCell>Stock</TableCell>
                    <TableCell>Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredProducts.slice(0, 30).map((product) => {
                    const requestedQuantity = Number(orderQuantity || 1);
                    const hasRecipe = Boolean(product.active_recipe_id);
                    const controlledRecipeItems = Number(
                      product.controlled_item_count || 0,
                    );
                    const recipeMaxQuantity = Number(
                      product.recipe_max_quantity || 0,
                    );
                    const hasEnoughStock = hasRecipe
                      ? controlledRecipeItems === 0 ||
                        recipeMaxQuantity >= requestedQuantity
                      : !tracksInventory(product) ||
                        getCurrentStock(product) >= requestedQuantity;
                    return (
                      <TableRow key={product.id} hover>
                        <TableCell>{product.name}</TableCell>
                        <TableCell>{product.category || ""}</TableCell>
                        <TableCell>{formatMoney(product.price)}</TableCell>
                        <TableCell>
                          {hasRecipe ? (
                            <Chip
                              label={
                                controlledRecipeItems === 0
                                  ? `Receta v${product.active_recipe_version} - sin control`
                                  : `${recipeMaxQuantity} porciones disponibles`
                              }
                              color={hasEnoughStock ? "success" : "error"}
                              size="small"
                            />
                          ) : tracksInventory(product) ? (
                            <Chip
                              label={`${getCurrentStock(product)} ${
                                product.unit || "unidad"
                              }`}
                              color={
                                product.minimum_stock != null &&
                                getCurrentStock(product) <=
                                  Number(product.minimum_stock)
                                  ? "warning"
                                  : "default"
                              }
                              size="small"
                            />
                          ) : (
                            <Chip label="Sin control" size="small" />
                          )}
                        </TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={1}>
                            <Button
                              variant="contained"
                              onClick={() => void addOrderItem(product, "SALE")}
                              disabled={
                                orderStatus === "loading" || !hasEnoughStock
                              }
                            >
                              + Venta
                            </Button>
                            {canCreateCourtesy ? (
                              <Button
                                variant="outlined"
                                onClick={() =>
                                  void addOrderItem(product, "COURTESY")
                                }
                                disabled={
                                  orderStatus === "loading" || !hasEnoughStock
                                }
                              >
                                Cortesia
                              </Button>
                            ) : null}
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {filteredProducts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5}>Sin productos.</TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </TableContainer>

            <Typography component="h3" fontWeight={900}>
              Items de la cuenta
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Producto</TableCell>
                    <TableCell>Tipo</TableCell>
                    <TableCell>Cantidad</TableCell>
                    <TableCell>Cobrado</TableCell>
                    <TableCell>Comercial</TableCell>
                    <TableCell>Notas</TableCell>
                    <TableCell>Consumo inventario</TableCell>
                    <TableCell>Costo / ganancia</TableCell>
                    <TableCell>Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {activeOrderItems.map((item) => (
                    <TableRow key={item.id} hover>
                      <TableCell>{item.product_name_snapshot}</TableCell>
                      <TableCell>
                        <Chip
                          label={
                            item.type === "COURTESY" ? "CORTESIA" : "VENTA"
                          }
                          color={item.type === "COURTESY" ? "secondary" : "primary"}
                          size="small"
                          variant={item.type === "COURTESY" ? "outlined" : "filled"}
                        />
                      </TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>{formatMoney(item.charged_subtotal)}</TableCell>
                      <TableCell>
                        {formatMoney(item.commercial_subtotal)}
                        {item.courtesy_reason ? ` · ${item.courtesy_reason}` : ""}
                      </TableCell>
                      <TableCell>{item.notes || ""}</TableCell>
                      <TableCell sx={{ minWidth: 190 }}>
                        {item.recipe_id ? (
                          <Stack spacing={0.25}>
                            <Chip
                              label={`Receta v${item.recipe_version}`}
                              size="small"
                              color="success"
                              variant="outlined"
                            />
                            {(item.recipe_consumption || []).map((consumption) => (
                              <Typography
                                key={consumption.supplyId}
                                variant="caption"
                              >
                                {consumption.supplyName}: {consumption.quantity}{" "}
                                {consumption.unit}
                              </Typography>
                            ))}
                          </Stack>
                        ) : (
                          "Producto directo"
                        )}
                      </TableCell>
                      <TableCell sx={{ minWidth: 175 }}>
                        {item.total_cost == null ? (
                          <Chip label="Sin snapshot" size="small" color="warning" />
                        ) : (
                          <Stack spacing={0.25}>
                            <Typography variant="caption">
                              Costo: {formatMoney(item.total_cost)}
                            </Typography>
                            <Typography variant="caption">
                              Ganancia: {formatMoney(item.gross_profit ?? 0)}
                            </Typography>
                            {isTruthy(item.cost_incomplete ?? undefined) ? (
                              <Stack spacing={0.25}>
                                <Chip label="Costo incompleto" size="small" color="warning" />
                                {(item.cost_components || [])
                                  .filter((component) => isTruthy(component.costIncomplete))
                                  .map((component, componentIndex) => (
                                    <Typography key={`${component.name}-${componentIndex}`} variant="caption" color="warning.main">
                                      Sin costo: {component.name}
                                    </Typography>
                                  ))}
                              </Stack>
                            ) : item.gross_margin != null ? (
                              <Chip
                                label={`${Number(item.gross_margin).toFixed(1)}% margen`}
                                size="small"
                                color={Number(item.gross_profit || 0) < 0 ? "error" : "success"}
                                variant="outlined"
                              />
                            ) : (
                              <Chip label="Sin ingreso" size="small" variant="outlined" />
                            )}
                          </Stack>
                        )}
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1}>
                          <Button
                            variant="outlined"
                            onClick={() =>
                              void updateOrderQuantity(item, item.quantity - 1)
                            }
                            disabled={item.quantity <= 1 || orderStatus === "loading"}
                          >
                            -
                          </Button>
                          <Button
                            variant="outlined"
                            onClick={() =>
                              void updateOrderQuantity(item, item.quantity + 1)
                            }
                            disabled={orderStatus === "loading"}
                          >
                            +
                          </Button>
                          <Button
                            variant="outlined"
                            color="error"
                            onClick={() => void cancelOrderItem(item)}
                            disabled={orderStatus === "loading"}
                          >
                            Cancelar
                          </Button>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                  {activeOrderItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9}>Sin items activos.</TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </TableContainer>

            {cancelledOrderItems.length > 0 ? (
              <Typography variant="body2" sx={{ opacity: 0.75 }}>
                Cancelados: {cancelledOrderItems.length}
              </Typography>
            ) : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setOrderVisit(null);
              setOrderItems([]);
            }}
          >
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={paymentVisit != null}
        onClose={() => setPaymentVisit(null)}
        maxWidth="lg"
        fullWidth
        aria-labelledby="visit-payment-title"
      >
        <DialogTitle id="visit-payment-title">
          {paymentVisit
            ? `Cobrar - ${paymentVisit.display_label || `Cuenta #${paymentVisit.id}`}`
            : "Cobrar"}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            {paymentStatus === "error" ? (
              <Alert severity="error">
                No se pudo registrar o actualizar el pago.
              </Alert>
            ) : null}

            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Chip
                label={`Total ${formatMoney(paymentVisit?.visit_total || 0)}`}
              />
              <Chip
                label={`Pagado ${formatMoney(paymentVisit?.total_paid || 0)}`}
                color="success"
                variant="outlined"
              />
              <Chip
                label={`Pendiente ${formatMoney(
                  paymentVisit?.pending_amount || 0
                )}`}
                color="warning"
                variant="outlined"
              />
              {paymentVisit?.reservation_id ? (
                <Chip
                  label={`Abonos reserva ${formatMoney(
                    paymentVisit.reservation_total_paid || 0
                  )}`}
                  size="small"
                  variant="outlined"
                />
              ) : null}
            </Stack>

            <Typography component="h3" fontWeight={900}>
              Conceptos pendientes
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>
                      <Checkbox
                        checked={allPayableSelected}
                        indeterminate={somePayableSelected}
                        onChange={(event) =>
                          toggleAllPayableItems(event.target.checked)
                        }
                        disabled={payablePaymentItems.length === 0}
                        inputProps={{
                          "aria-label": "Seleccionar todos los conceptos pendientes",
                        }}
                      />
                    </TableCell>
                    <TableCell>Concepto</TableCell>
                    <TableCell>Cantidad</TableCell>
                    <TableCell>Pendiente</TableCell>
                    <TableCell>Valor recibido</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {payablePaymentItems.map((item) => (
                    <TableRow key={item.key} hover>
                      <TableCell>
                        <Checkbox
                          checked={selectedPaymentItems.has(item.key)}
                          onChange={(event) => {
                            togglePaymentItem(item, event.target.checked);
                          }}
                        />
                      </TableCell>
                      <TableCell>{item.label}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>{formatMoney(item.pendingAmount)}</TableCell>
                      <TableCell sx={{ minWidth: 180 }}>
                        <TextField
                          value={paymentAllocationAmounts[item.key] || ""}
                          onChange={(event) =>
                            updatePaymentItemAmount(item, event.target.value)
                          }
                          disabled={!selectedPaymentItems.has(item.key)}
                          type="number"
                          inputProps={{
                            min: 1,
                            max: item.pendingAmount,
                            step: 1,
                            inputMode: "numeric",
                          }}
                          size="small"
                          fullWidth
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                  {payablePaymentItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5}>Sin conceptos pendientes.</TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </TableContainer>

            <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
              <TextField
                label={
                  selectedPaymentTotal > 0
                    ? "Total a cobrar"
                    : "Valor a pagar"
                }
                value={
                  selectedPaymentTotal > 0
                    ? String(selectedPaymentTotal)
                    : paymentAmount
                }
                onChange={(e) => setPaymentAmount(e.target.value)}
                disabled={selectedPaymentTotal > 0}
                type="number"
                inputProps={{ min: 1, step: 1, inputMode: "numeric" }}
                size="small"
                fullWidth
              />
              <Select
                value={paymentAccountId}
                onChange={(e) => setPaymentAccountId(String(e.target.value))}
                size="small"
                displayEmpty
                fullWidth
              >
                <MenuItem value="">Cuenta destino</MenuItem>
                {paymentAccounts.map((account) => (
                  <MenuItem key={account.id} value={String(account.id)}>
                    {account.name} · {account.type}
                  </MenuItem>
                ))}
              </Select>
            </Stack>
            <TextField
              label="Notas"
              value={paymentNotes}
              onChange={(e) => setPaymentNotes(e.target.value)}
              size="small"
              fullWidth
            />
            <div className="admin-crud__actions">
              <Button
                variant="contained"
                color="success"
                onClick={() => void registerPayment()}
                disabled={
                  paymentStatus === "loading" ||
                  !paymentAccountId ||
                  !Number.isFinite(suggestedPaymentAmount) ||
                  suggestedPaymentAmount <= 0 ||
                  hasInvalidSelectedPaymentAmount
                }
              >
                Confirmar cobro
              </Button>
            </div>

            <Typography component="h3" fontWeight={900}>
              Pagos previos de reserva
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Fecha</TableCell>
                    <TableCell>Cuenta</TableCell>
                    <TableCell>Valor</TableCell>
                    <TableCell>Estado</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reservationPayments.map((payment) => (
                    <TableRow key={payment.id} hover>
                      <TableCell>{formatDateTime(payment.paid_at)}</TableCell>
                      <TableCell>{payment.financial_account_name || ""}</TableCell>
                      <TableCell>{formatMoney(payment.amount)}</TableCell>
                      <TableCell>{payment.status}</TableCell>
                    </TableRow>
                  ))}
                  {reservationPayments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4}>Sin abonos previos.</TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </TableContainer>

            <Typography component="h3" fontWeight={900}>
              Historial de pagos de visita
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Fecha</TableCell>
                    <TableCell>Cuenta</TableCell>
                    <TableCell>Valor</TableCell>
                    <TableCell>Estado</TableCell>
                    <TableCell>Notas</TableCell>
                    <TableCell>Acciones</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {visitPayments.map((payment) => (
                    <TableRow key={payment.id} hover>
                      <TableCell>{formatDateTime(payment.paid_at)}</TableCell>
                      <TableCell>{payment.financial_account_name || ""}</TableCell>
                      <TableCell>{formatMoney(payment.amount)}</TableCell>
                      <TableCell>{payment.status}</TableCell>
                      <TableCell>{payment.notes || ""}</TableCell>
                      <TableCell>
                        {payment.status === "CONFIRMED" ? (
                          <Button
                            variant="outlined"
                            color="error"
                            onClick={() => void voidPayment(payment)}
                          >
                            Anular
                          </Button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))}
                  {visitPayments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6}>Sin pagos de visita.</TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </TableContainer>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setPaymentVisit(null);
              setPaymentItems([]);
              setVisitPayments([]);
              setReservationPayments([]);
            }}
          >
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
      <Snackbar
        open={snackbar != null}
        autoHideDuration={6000}
        onClose={closeSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        sx={{ zIndex: (theme) => theme.zIndex.modal + 2 }}
      >
        <Alert
          onClose={closeSnackbar}
          severity={snackbar?.severity || "info"}
          icon={false}
          sx={{
            width: "100%",
            maxWidth: 420,
            backgroundColor: "#f7c948",
            color: "#111827",
            border: "1px solid rgba(17, 24, 39, 0.18)",
            boxShadow: "0 16px 40px rgba(0, 0, 0, 0.35)",
            fontWeight: 800,
            "& .MuiAlert-action": {
              color: "#111827",
            },
          }}
        >
          {snackbar?.message || ""}
        </Alert>
      </Snackbar>
    </div>
  );
}
