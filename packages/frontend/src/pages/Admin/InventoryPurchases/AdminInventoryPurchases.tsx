import { type ReactNode, useEffect, useMemo, useState } from "react";
import { adminRequest } from "../../../api/adminClient";
import {
  Alert,
  Button,
  Checkbox,
  Chip,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import "../adminCrud.scss";

type ProductRow = {
  id: number;
  name: string;
  track_inventory: boolean | number | string;
  track_expiration: boolean | number | string;
  unit: string | null;
};

type FinancialAccountRow = {
  id: number;
  name: string;
  active: boolean | number | string;
  balance: number | string;
};

type PurchaseRow = {
  id: number;
  received_at: number | string;
  supplier: string | null;
  description: string | null;
  total_paid: number | string | null;
  expense_id: number | null;
  item_count: number | string;
  total_quantity: number | string;
};

type ItemForm = {
  productId: string;
  quantity: string;
  expirationDate: string;
  lotNumber: string;
  lineTotal: string;
};

type PaymentForm = {
  accountId: string;
  accountAmount: string;
  splitFunding: boolean;
  ownerName: string;
  ownerAmount: string;
  contributionKind: "REIMBURSABLE" | "NON_REIMBURSABLE";
};

const contributionKindOptions = [
  { value: "REIMBURSABLE", label: "Reembolsable" },
  { value: "NON_REIMBURSABLE", label: "No reembolsable" },
] as const;

const emptyItem: ItemForm = {
  productId: "",
  quantity: "",
  expirationDate: "",
  lotNumber: "",
  lineTotal: "",
};

function todayInputValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeBoolean(value: boolean | number | string) {
  return value === true || value === 1 || value === "1" || value === "true";
}

function formatMoney(value: number | string | null | undefined) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function calculatedUnitCost(item: ItemForm) {
  const quantity = Number(item.quantity || 0);
  const lineTotal = Number(item.lineTotal || 0);
  if (quantity <= 0 || lineTotal <= 0) return "";
  return formatMoney(Math.round(lineTotal / quantity));
}

function formatDateTime(value: number | string | null | undefined) {
  if (!value) return "";
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(Number(value)));
}

function makeRequestKey() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function PlaceholderSelect({
  label,
  value,
  onChange,
  renderValue,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  renderValue?: (value: string) => string;
  children: ReactNode;
}) {
  return (
    <FormControl size="small" fullWidth>
      <InputLabel>{label}</InputLabel>
      <Select
        value={value}
        label={label}
        onChange={(e) => onChange(String(e.target.value))}
        displayEmpty
        renderValue={(selected) => {
          const selectedValue = String(selected || "");
          if (!selectedValue) return label;
          return renderValue ? renderValue(selectedValue) : selectedValue;
        }}
      >
        {children}
      </Select>
    </FormControl>
  );
}

export default function AdminInventoryPurchases() {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [accounts, setAccounts] = useState<FinancialAccountRow[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRow[]>([]);
  const [receivedAt, setReceivedAt] = useState(todayInputValue());
  const [supplier, setSupplier] = useState("");
  const [description, setDescription] = useState("");
  const [totalPaid, setTotalPaid] = useState("");
  const [payment, setPayment] = useState<PaymentForm>({
    accountId: "",
    accountAmount: "",
    splitFunding: false,
    ownerName: "",
    ownerAmount: "",
    contributionKind: "REIMBURSABLE",
  });
  const [items, setItems] = useState<ItemForm[]>([{ ...emptyItem }]);
  const [requestKey, setRequestKey] = useState(makeRequestKey);
  const [status, setStatus] = useState<
    | { type: "idle" }
    | { type: "loading" }
    | { type: "success"; message: string }
    | { type: "error"; message: string }
  >({ type: "idle" });

  const productById = useMemo(() => {
    return new Map(products.map((product) => [String(product.id), product]));
  }, [products]);

  const activeAccounts = useMemo(
    () => accounts.filter((account) => normalizeBoolean(account.active)),
    [accounts],
  );

  useEffect(() => {
    void loadInitialData();
  }, []);

  async function loadInitialData() {
    setStatus({ type: "loading" });
    try {
      const [productData, accountData, purchaseData] = await Promise.all([
        adminRequest<ProductRow[]>("/api/admin/cafeteria-products"),
        adminRequest<FinancialAccountRow[]>("/api/admin/financial-accounts"),
        adminRequest<PurchaseRow[]>("/api/admin/inventory-purchases"),
      ]);
      setProducts(
        (productData || []).filter((product) =>
          normalizeBoolean(product.track_inventory),
        ),
      );
      setAccounts(accountData || []);
      setPurchases(purchaseData || []);
      setStatus({ type: "idle" });
    } catch (err) {
      setStatus({
        type: "error",
        message: err instanceof Error ? err.message : "No se pudo cargar.",
      });
    }
  }

  function updateItem(index: number, patch: Partial<ItemForm>) {
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    );
  }

  function removeItem(index: number) {
    setItems((current) =>
      current.length === 1
        ? [{ ...emptyItem }]
        : current.filter((_, itemIndex) => itemIndex !== index),
    );
  }

  function resetForm() {
    setReceivedAt(todayInputValue());
    setSupplier("");
    setDescription("");
    setTotalPaid("");
    setPayment({
      accountId: "",
      accountAmount: "",
      splitFunding: false,
      ownerName: "",
      ownerAmount: "",
      contributionKind: "REIMBURSABLE",
    });
    setItems([{ ...emptyItem }]);
    setRequestKey(makeRequestKey());
  }

  function buildAllocations() {
    const paid = Number(totalPaid || 0);
    if (!paid) return [];
    const accountAmount = payment.splitFunding
      ? Number(payment.accountAmount || 0)
      : paid;
    const ownerAmount = payment.splitFunding
      ? Number(payment.ownerAmount || 0)
      : 0;
    const allocations = [];
    if (accountAmount > 0) {
      allocations.push({
        sourceType: "FINANCIAL_ACCOUNT",
        financialAccountId: Number(payment.accountId),
        amount: accountAmount,
      });
    }
    if (ownerAmount > 0) {
      allocations.push({
        sourceType: "OWNER_PERSONAL_FUNDS",
        ownerName: payment.ownerName,
        contributionKind: payment.contributionKind,
        amount: ownerAmount,
      });
    }
    return allocations;
  }

  async function submitPurchase() {
    setStatus({ type: "loading" });
    try {
      await adminRequest("/api/admin/inventory-purchases", {
        method: "POST",
        body: {
          requestKey,
          receivedAt,
          supplier,
          description,
          totalPaid: totalPaid ? Number(totalPaid) : null,
          allocations: buildAllocations(),
          items: items.map((item) => ({
            productId: Number(item.productId),
            quantity: Number(item.quantity),
            expirationDate: item.expirationDate || null,
            lotNumber: item.lotNumber,
            lineTotal: item.lineTotal ? Number(item.lineTotal) : null,
          })),
        },
      });
      resetForm();
      const purchaseData = await adminRequest<PurchaseRow[]>(
        "/api/admin/inventory-purchases",
      );
      setPurchases(purchaseData || []);
      setStatus({ type: "success", message: "Compra registrada." });
    } catch (err) {
      setStatus({
        type: "error",
        message:
          err instanceof Error ? err.message : "No se pudo registrar la compra.",
      });
    }
  }

  const canSubmit =
    status.type !== "loading" &&
    receivedAt &&
    items.every((item) => {
      const product = productById.get(item.productId);
      return (
        product &&
        Number(item.quantity || 0) > 0 &&
        (!normalizeBoolean(product.track_expiration) || item.expirationDate)
      );
    }) &&
    (!totalPaid ||
      (Number(totalPaid || 0) > 0 &&
        ((!payment.splitFunding && payment.accountId) ||
          (payment.splitFunding &&
            Number(payment.accountAmount || 0) +
              Number(payment.ownerAmount || 0) ===
              Number(totalPaid || 0) &&
            Number(payment.ownerAmount || 0) > 0 &&
            (Number(payment.accountAmount || 0) === 0 || payment.accountId) &&
            payment.ownerName.trim().length > 0))));

  return (
    <div className="admin-crud">
      <div className="admin-crud__header">
        <div>
          <Typography component="h1" className="admin-crud__title">
            Compras de productos para venta
          </Typography>
          <Typography className="admin-crud__subtitle">
            Recepcion de bebidas y otros productos vendidos directamente al cliente.
          </Typography>
        </div>
      </div>

      {status.type === "error" ? (
        <Alert severity="error">{status.message}</Alert>
      ) : null}
      {status.type === "success" ? (
        <Alert severity="success">{status.message}</Alert>
      ) : null}

      <Paper className="admin-crud__panel">
        <div className="admin-crud__panel-inner admin-crud__grid">
        <Stack spacing={2}>
          <div className="admin-crud__row">
            <TextField
              label="Fecha"
              type="date"
              value={receivedAt}
              onChange={(e) => setReceivedAt(e.target.value)}
              InputLabelProps={{ shrink: true }}
              size="small"
              fullWidth
            />
            <TextField
              label="Proveedor"
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              size="small"
              fullWidth
            />
          </div>
          <TextField
            label="Descripcion"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            size="small"
            fullWidth
          />
          <div className="admin-crud__row">
            <TextField
              label="Total pagado"
              value={totalPaid}
              onChange={(e) => setTotalPaid(e.target.value)}
              inputProps={{ inputMode: "numeric", min: 0 }}
              size="small"
              fullWidth
            />
            <PlaceholderSelect
              label="Cuenta de pago"
              value={payment.accountId}
              onChange={(value) =>
                setPayment((current) => ({ ...current, accountId: value }))
              }
              renderValue={(value) =>
                activeAccounts.find((account) => String(account.id) === value)
                  ?.name || value
              }
            >
              {activeAccounts.map((account) => (
                <MenuItem key={account.id} value={String(account.id)}>
                  {account.name} - {formatMoney(account.balance)}
                </MenuItem>
              ))}
            </PlaceholderSelect>
          </div>

          {totalPaid ? (
            <FormControlLabel
              control={
                <Checkbox
                  checked={payment.splitFunding}
                  onChange={(e) =>
                    setPayment((current) => ({
                      ...current,
                      splitFunding: e.target.checked,
                      accountAmount: e.target.checked ? current.accountAmount : "",
                      ownerAmount: e.target.checked ? current.ownerAmount : "",
                      ownerName: e.target.checked ? current.ownerName : "",
                    }))
                  }
                />
              }
              label="Incluir dinero del propietario"
            />
          ) : null}

          {totalPaid && payment.splitFunding ? (
            <div className="admin-crud__row">
              <TextField
                label="Monto desde Logic"
                value={payment.accountAmount}
                onChange={(e) =>
                  setPayment((current) => ({
                    ...current,
                    accountAmount: e.target.value,
                  }))
                }
                inputProps={{ inputMode: "numeric", min: 1 }}
                size="small"
                fullWidth
              />
              <TextField
                label="Propietario"
                value={payment.ownerName}
                onChange={(e) =>
                  setPayment((current) => ({
                    ...current,
                    ownerName: e.target.value,
                  }))
                }
                size="small"
                fullWidth
              />
              <TextField
                label="Monto propietario"
                value={payment.ownerAmount}
                onChange={(e) =>
                  setPayment((current) => ({
                    ...current,
                    ownerAmount: e.target.value,
                  }))
                }
                inputProps={{ inputMode: "numeric", min: 1 }}
                size="small"
                fullWidth
              />
              <PlaceholderSelect
                label="Tipo de aporte"
                value={payment.contributionKind}
                onChange={(value) =>
                  setPayment((current) => ({
                    ...current,
                    contributionKind:
                      value as PaymentForm["contributionKind"],
                  }))
                }
                renderValue={(value) =>
                  contributionKindOptions.find((option) => option.value === value)
                    ?.label || value
                }
              >
                {contributionKindOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </PlaceholderSelect>
            </div>
          ) : null}

          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Producto</TableCell>
                  <TableCell>Cantidad</TableCell>
                  <TableCell>Vencimiento</TableCell>
                  <TableCell>Lote</TableCell>
                  <TableCell>Total linea</TableCell>
                  <TableCell>Costo unitario calculado</TableCell>
                  <TableCell>Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((item, index) => {
                  const product = productById.get(item.productId);
                  const requiresExpiration =
                    product && normalizeBoolean(product.track_expiration);
                  return (
                    <TableRow key={index}>
                      <TableCell sx={{ minWidth: 220 }}>
                        <PlaceholderSelect
                          label="Producto"
                          value={item.productId}
                          onChange={(value) => {
                            const nextProduct = productById.get(value);
                            const tracksExpiration =
                              nextProduct &&
                              normalizeBoolean(nextProduct.track_expiration);
                            updateItem(index, {
                              productId: value,
                              expirationDate: tracksExpiration
                                ? item.expirationDate
                                : "",
                              lotNumber: tracksExpiration ? item.lotNumber : "",
                            });
                          }}
                          renderValue={(value) =>
                            productById.get(value)?.name || value
                          }
                        >
                          {products.map((productOption) => (
                            <MenuItem
                              key={productOption.id}
                              value={String(productOption.id)}
                            >
                              {productOption.name}
                            </MenuItem>
                          ))}
                        </PlaceholderSelect>
                      </TableCell>
                      <TableCell>
                        <TextField
                          value={item.quantity}
                          onChange={(e) =>
                            updateItem(index, { quantity: e.target.value })
                          }
                          inputProps={{ inputMode: "numeric", min: 1 }}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Tooltip
                          title={
                            requiresExpiration
                              ? "Este producto controla vencimiento; registra la fecha del lote recibido."
                              : "Solo se habilita para productos con Controlar vencimiento activo en Productos."
                          }
                          arrow
                        >
                          <span>
                            <TextField
                              type="date"
                              value={item.expirationDate}
                              onChange={(e) =>
                                updateItem(index, {
                                  expirationDate: e.target.value,
                                })
                              }
                              InputLabelProps={{ shrink: true }}
                              size="small"
                              disabled={!requiresExpiration}
                              required={Boolean(requiresExpiration)}
                            />
                          </span>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <Tooltip
                          title={
                            requiresExpiration
                              ? "Numero opcional para identificar el lote recibido."
                              : "Solo se habilita para productos con Controlar vencimiento activo en Productos."
                          }
                          arrow
                        >
                          <span>
                            <TextField
                              value={item.lotNumber}
                              onChange={(e) =>
                                updateItem(index, { lotNumber: e.target.value })
                              }
                              size="small"
                              disabled={!requiresExpiration}
                            />
                          </span>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <TextField
                          value={item.lineTotal}
                          onChange={(e) =>
                            updateItem(index, { lineTotal: e.target.value })
                          }
                          inputProps={{ inputMode: "numeric", min: 0 }}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography fontWeight={800}>
                          {calculatedUnitCost(item) || "-"}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outlined"
                          color="error"
                          onClick={() => removeItem(index)}
                        >
                          Quitar
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              onClick={() => setItems((current) => [...current, { ...emptyItem }])}
            >
              + Agregar otro lote
            </Button>
            <Button
              variant="contained"
              onClick={() => void submitPurchase()}
              disabled={!canSubmit}
            >
              Confirmar recepcion
            </Button>
          </Stack>
        </Stack>
        </div>
      </Paper>

      <Paper className="admin-crud__panel">
        <div className="admin-crud__panel-inner admin-crud__section-header">
          <div>
            <Typography component="h2" className="admin-crud__section-title">
              Compras recientes
            </Typography>
            <Typography className="admin-crud__section-copy">
              Recepciones confirmadas y egresos asociados.
            </Typography>
          </div>
        </div>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Fecha</TableCell>
                <TableCell>Proveedor</TableCell>
                <TableCell>Descripcion</TableCell>
                <TableCell>Items</TableCell>
                <TableCell>Cantidad</TableCell>
                <TableCell>Pagado</TableCell>
                <TableCell>Egreso</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {purchases.map((purchase) => (
                <TableRow key={purchase.id} hover>
                  <TableCell>{formatDateTime(purchase.received_at)}</TableCell>
                  <TableCell>{purchase.supplier || ""}</TableCell>
                  <TableCell>{purchase.description || ""}</TableCell>
                  <TableCell>{purchase.item_count}</TableCell>
                  <TableCell>{purchase.total_quantity}</TableCell>
                  <TableCell>{formatMoney(purchase.total_paid)}</TableCell>
                  <TableCell>
                    {purchase.expense_id ? (
                      <Chip label={`#${purchase.expense_id}`} size="small" />
                    ) : (
                      <Chip label="Pendiente" size="small" />
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {purchases.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7}>Sin compras.</TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </div>
  );
}
