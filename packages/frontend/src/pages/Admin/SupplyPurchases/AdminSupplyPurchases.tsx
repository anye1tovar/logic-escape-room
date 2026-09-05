import { type ReactNode, useEffect, useMemo, useState } from "react";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
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
import { adminRequest } from "../../../api/adminClient";
import "../adminCrud.scss";

type SupplyRow = {
  id: number;
  name: string;
  purchase_unit: string;
  consumption_unit: string;
  conversion_factor: number | string;
  track_inventory: boolean | number | string;
  track_expiration: boolean | number | string;
  active: boolean | number | string;
};

type FinancialAccountRow = {
  id: number;
  name: string;
  balance: number | string;
  active: boolean | number | string;
};

type PurchaseRow = {
  id: number;
  received_at: number | string;
  supplier: string | null;
  description: string | null;
  total_amount: number | string;
  total_paid: number | string | null;
  expense_id: number | null;
  item_count: number | string;
};

type ItemForm = {
  supplyId: string;
  purchasedQuantity: string;
  lineTotal: string;
  expirationDate: string;
  lotNumber: string;
};

type PaymentForm = {
  payNow: boolean;
  accountId: string;
  includeOwner: boolean;
  accountAmount: string;
  ownerName: string;
  ownerAmount: string;
  contributionKind: "REIMBURSABLE" | "NON_REIMBURSABLE";
};

const emptyItem: ItemForm = {
  supplyId: "",
  purchasedQuantity: "",
  lineTotal: "",
  expirationDate: "",
  lotNumber: "",
};

const emptyPayment: PaymentForm = {
  payNow: false,
  accountId: "",
  includeOwner: false,
  accountAmount: "",
  ownerName: "",
  ownerAmount: "",
  contributionKind: "REIMBURSABLE",
};

const contributionKinds = [
  { value: "REIMBURSABLE", label: "Reembolsable" },
  { value: "NON_REIMBURSABLE", label: "No reembolsable" },
] as const;

function normalizeBoolean(value: boolean | number | string) {
  return value === true || value === 1 || value === "1" || value === "true";
}

function todayInputValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function makeRequestKey() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatMoney(value: number | string | null | undefined, decimals = 0) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(Number(value || 0));
}

function formatQuantity(value: number) {
  return new Intl.NumberFormat("es-CO", {
    maximumFractionDigits: 3,
  }).format(value);
}

function formatDate(value: number | string) {
  return new Intl.DateTimeFormat("es-CO", { dateStyle: "medium" }).format(
    new Date(Number(value)),
  );
}

function LabeledSelect({
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
      <InputLabel shrink>{label}</InputLabel>
      <Select
        value={value}
        label={label}
        displayEmpty
        onChange={(event) => onChange(String(event.target.value))}
        renderValue={(selected) => {
          const selectedValue = String(selected || "");
          if (!selectedValue) return <span style={{ opacity: 0.62 }}>{label}</span>;
          return renderValue ? renderValue(selectedValue) : selectedValue;
        }}
      >
        {children}
      </Select>
    </FormControl>
  );
}

export default function AdminSupplyPurchases() {
  const [supplies, setSupplies] = useState<SupplyRow[]>([]);
  const [accounts, setAccounts] = useState<FinancialAccountRow[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRow[]>([]);
  const [receivedAt, setReceivedAt] = useState(todayInputValue());
  const [supplier, setSupplier] = useState("");
  const [description, setDescription] = useState("");
  const [items, setItems] = useState<ItemForm[]>([{ ...emptyItem }]);
  const [payment, setPayment] = useState<PaymentForm>(emptyPayment);
  const [requestKey, setRequestKey] = useState(makeRequestKey);
  const [status, setStatus] = useState<
    | { type: "idle" }
    | { type: "loading" }
    | { type: "success"; message: string }
    | { type: "error"; message: string }
  >({ type: "loading" });

  const supplyById = useMemo(
    () => new Map(supplies.map((supply) => [String(supply.id), supply])),
    [supplies],
  );
  const activeAccounts = useMemo(
    () => accounts.filter((account) => normalizeBoolean(account.active)),
    [accounts],
  );
  const purchaseTotal = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.lineTotal || 0), 0),
    [items],
  );

  async function load(showLoading = true) {
    if (showLoading) setStatus({ type: "loading" });
    try {
      const [supplyData, accountData, purchaseData] = await Promise.all([
        adminRequest<SupplyRow[]>("/api/admin/supplies"),
        adminRequest<FinancialAccountRow[]>("/api/admin/financial-accounts"),
        adminRequest<PurchaseRow[]>("/api/admin/supply-purchases"),
      ]);
      setSupplies(
        (supplyData || []).filter(
          (supply) =>
            normalizeBoolean(supply.active) &&
            normalizeBoolean(supply.track_inventory),
        ),
      );
      setAccounts(accountData || []);
      setPurchases(purchaseData || []);
      if (showLoading) setStatus({ type: "idle" });
    } catch (err) {
      setStatus({
        type: "error",
        message: err instanceof Error ? err.message : "No se pudo cargar.",
      });
    }
  }

  useEffect(() => {
    void load();
  }, []);

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

  function reset() {
    setReceivedAt(todayInputValue());
    setSupplier("");
    setDescription("");
    setItems([{ ...emptyItem }]);
    setPayment(emptyPayment);
    setRequestKey(makeRequestKey());
  }

  function buildAllocations() {
    if (!payment.payNow) return [];
    if (!payment.includeOwner) {
      return [
        {
          sourceType: "FINANCIAL_ACCOUNT",
          financialAccountId: Number(payment.accountId),
          amount: purchaseTotal,
        },
      ];
    }
    const allocations = [];
    const accountAmount = Number(payment.accountAmount || 0);
    const ownerAmount = Number(payment.ownerAmount || 0);
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

  async function submit() {
    setStatus({ type: "loading" });
    try {
      await adminRequest("/api/admin/supply-purchases", {
        method: "POST",
        body: {
          requestKey,
          receivedAt,
          supplier,
          description,
          totalPaid: payment.payNow ? purchaseTotal : null,
          allocations: buildAllocations(),
          items: items.map((item) => ({
            supplyId: Number(item.supplyId),
            purchasedQuantity: Number(item.purchasedQuantity),
            lineTotal: Number(item.lineTotal),
            expirationDate: item.expirationDate || null,
            lotNumber: item.lotNumber || null,
          })),
        },
      });
      reset();
      await load(false);
      setStatus({ type: "success", message: "Compra de insumos registrada." });
    } catch (err) {
      setStatus({
        type: "error",
        message:
          err instanceof Error
            ? err.message
            : "No se pudo registrar la compra.",
      });
    }
  }

  const validItems =
    purchaseTotal > 0 &&
    items.every((item) => {
      const supply = supplyById.get(item.supplyId);
      return (
        supply != null &&
        Number(item.purchasedQuantity) > 0 &&
        Number.isInteger(Number(item.lineTotal)) &&
        Number(item.lineTotal) > 0 &&
        (!normalizeBoolean(supply.track_expiration) || item.expirationDate)
      );
    });
  const validPayment =
    !payment.payNow ||
    (!payment.includeOwner && Boolean(payment.accountId)) ||
    (payment.includeOwner &&
      Number(payment.accountAmount || 0) >= 0 &&
      Number(payment.ownerAmount || 0) > 0 &&
      Number(payment.accountAmount || 0) + Number(payment.ownerAmount || 0) ===
        purchaseTotal &&
      (Number(payment.accountAmount || 0) === 0 || Boolean(payment.accountId)) &&
      payment.ownerName.trim().length > 0);
  const canSubmit = status.type !== "loading" && validItems && validPayment;

  return (
    <div className="admin-crud">
      <div className="admin-crud__header">
        <div>
          <Typography component="h1" className="admin-crud__title">
            Compras de materias primas
          </Typography>
          <Typography className="admin-crud__subtitle">
            Recepcion de ingredientes y materiales utilizados para preparar productos.
          </Typography>
        </div>
        <Button variant="outlined" onClick={() => void load()}>
          Actualizar
        </Button>
      </div>

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
                Registrar recepcion
              </Typography>
              <Typography className="admin-crud__section-copy">
                Las cantidades recibidas se convierten a la unidad de consumo del insumo.
              </Typography>
            </div>
            <Chip label={`Total ${formatMoney(purchaseTotal)}`} color="primary" />
          </div>

          <div className="admin-crud__row">
            <TextField
              label="Fecha"
              type="date"
              value={receivedAt}
              onChange={(event) => setReceivedAt(event.target.value)}
              InputLabelProps={{ shrink: true }}
              size="small"
              fullWidth
            />
            <TextField
              label="Proveedor"
              value={supplier}
              onChange={(event) => setSupplier(event.target.value)}
              size="small"
              fullWidth
            />
          </div>
          <TextField
            label="Descripcion"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            size="small"
            fullWidth
          />

          <TableContainer>
            <Table size="small" className="admin-crud__table--auto">
              <TableHead>
                <TableRow>
                  <TableCell>Insumo</TableCell>
                  <TableCell>Cantidad comprada</TableCell>
                  <TableCell>Unidad</TableCell>
                  <TableCell>Total linea</TableCell>
                  <TableCell>Costo unitario calculado</TableCell>
                  <TableCell>Vencimiento</TableCell>
                  <TableCell>Lote</TableCell>
                  <TableCell>Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((item, index) => {
                  const supply = supplyById.get(item.supplyId);
                  const convertedQuantity =
                    Number(item.purchasedQuantity || 0) *
                    Number(supply?.conversion_factor || 0);
                  const unitCost =
                    convertedQuantity > 0 && Number(item.lineTotal) > 0
                      ? Number(item.lineTotal) / convertedQuantity
                      : 0;
                  const tracksExpiration =
                    supply && normalizeBoolean(supply.track_expiration);
                  return (
                    <TableRow key={index}>
                      <TableCell sx={{ minWidth: 220 }}>
                        <LabeledSelect
                          label="Insumo"
                          value={item.supplyId}
                          onChange={(value) => {
                            const next = supplyById.get(value);
                            const keepsBatch =
                              next && normalizeBoolean(next.track_expiration);
                            updateItem(index, {
                              supplyId: value,
                              expirationDate: keepsBatch ? item.expirationDate : "",
                              lotNumber: keepsBatch ? item.lotNumber : "",
                            });
                          }}
                          renderValue={(value) => supplyById.get(value)?.name || value}
                        >
                          {supplies.map((option) => (
                            <MenuItem key={option.id} value={String(option.id)}>
                              {option.name}
                            </MenuItem>
                          ))}
                        </LabeledSelect>
                      </TableCell>
                      <TableCell sx={{ minWidth: 170 }}>
                        <TextField
                          label="Cantidad"
                          value={item.purchasedQuantity}
                          onChange={(event) =>
                            updateItem(index, {
                              purchasedQuantity: event.target.value,
                            })
                          }
                          inputProps={{ inputMode: "decimal", min: 0, step: "0.001" }}
                          size="small"
                        />
                      </TableCell>
                      <TableCell sx={{ minWidth: 165 }}>
                        {supply ? (
                          <Stack spacing={0.25}>
                            <Typography fontWeight={900}>{supply.purchase_unit}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {convertedQuantity > 0
                                ? `${formatQuantity(convertedQuantity)} ${supply.consumption_unit}`
                                : `a ${supply.consumption_unit}`}
                            </Typography>
                          </Stack>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell sx={{ minWidth: 155 }}>
                        <TextField
                          label="Total linea"
                          value={item.lineTotal}
                          onChange={(event) =>
                            updateItem(index, { lineTotal: event.target.value })
                          }
                          inputProps={{ inputMode: "numeric", min: 1, step: 1 }}
                          size="small"
                        />
                      </TableCell>
                      <TableCell sx={{ minWidth: 180 }}>
                        <Typography fontWeight={900}>
                          {unitCost > 0 ? formatMoney(unitCost, 2) : "-"}
                        </Typography>
                        {supply ? (
                          <Typography variant="caption" color="text.secondary">
                            por {supply.consumption_unit}
                          </Typography>
                        ) : null}
                      </TableCell>
                      <TableCell sx={{ minWidth: 175 }}>
                        <Tooltip
                          arrow
                          title={
                            tracksExpiration
                              ? "Este insumo controla vencimiento; registra la fecha recibida."
                              : "Este insumo no controla vencimiento."
                          }
                        >
                          <span>
                            <TextField
                              type="date"
                              value={item.expirationDate}
                              onChange={(event) =>
                                updateItem(index, {
                                  expirationDate: event.target.value,
                                })
                              }
                              InputLabelProps={{ shrink: true }}
                              disabled={!tracksExpiration}
                              required={Boolean(tracksExpiration)}
                              size="small"
                            />
                          </span>
                        </Tooltip>
                      </TableCell>
                      <TableCell sx={{ minWidth: 140 }}>
                        <Tooltip
                          arrow
                          title={
                            tracksExpiration
                              ? "Identificador opcional del lote recibido."
                              : "Este insumo no controla vencimiento."
                          }
                        >
                          <span>
                            <TextField
                              label="Lote"
                              value={item.lotNumber}
                              onChange={(event) =>
                                updateItem(index, { lotNumber: event.target.value })
                              }
                              disabled={!tracksExpiration}
                              size="small"
                            />
                          </span>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <Tooltip title="Quitar linea" arrow>
                          <Button
                            variant="outlined"
                            color="error"
                            onClick={() => removeItem(index)}
                            aria-label="Quitar linea"
                          >
                            <DeleteOutlineIcon />
                          </Button>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          <div className="admin-crud__actions">
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => setItems((current) => [...current, { ...emptyItem }])}
            >
              Agregar linea
            </Button>
          </div>

          <div className="admin-crud__subsection">
            <FormControlLabel
              control={
                <Checkbox
                  checked={payment.payNow}
                  onChange={(event) =>
                    setPayment({ ...emptyPayment, payNow: event.target.checked })
                  }
                />
              }
              label="Registrar pago ahora"
            />
            {!payment.payNow ? (
              <Typography className="admin-crud__muted">
                La compra quedara pendiente con el proveedor y no afectara las cuentas financieras.
              </Typography>
            ) : null}
          </div>

          {payment.payNow ? (
            <div className="admin-crud__grid">
              <div className="admin-crud__row">
                <LabeledSelect
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
                </LabeledSelect>
                <TextField
                  label="Total a pagar"
                  value={formatMoney(purchaseTotal)}
                  size="small"
                  fullWidth
                  InputProps={{ readOnly: true }}
                />
              </div>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={payment.includeOwner}
                    onChange={(event) =>
                      setPayment((current) => ({
                        ...current,
                        includeOwner: event.target.checked,
                        accountAmount: event.target.checked ? current.accountAmount : "",
                        ownerAmount: event.target.checked ? current.ownerAmount : "",
                        ownerName: event.target.checked ? current.ownerName : "",
                      }))
                    }
                  />
                }
                label="Dividir pago con dinero del propietario"
              />
              {payment.includeOwner ? (
                <div className="admin-crud__row admin-crud__row--four">
                  <TextField
                    label="Monto desde Logic"
                    value={payment.accountAmount}
                    onChange={(event) =>
                      setPayment((current) => ({
                        ...current,
                        accountAmount: event.target.value,
                      }))
                    }
                    inputProps={{ inputMode: "numeric", min: 0 }}
                    size="small"
                  />
                  <TextField
                    label="Propietario"
                    value={payment.ownerName}
                    onChange={(event) =>
                      setPayment((current) => ({
                        ...current,
                        ownerName: event.target.value,
                      }))
                    }
                    size="small"
                  />
                  <TextField
                    label="Monto propietario"
                    value={payment.ownerAmount}
                    onChange={(event) =>
                      setPayment((current) => ({
                        ...current,
                        ownerAmount: event.target.value,
                      }))
                    }
                    inputProps={{ inputMode: "numeric", min: 1 }}
                    size="small"
                  />
                  <LabeledSelect
                    label="Tipo de aporte"
                    value={payment.contributionKind}
                    onChange={(value) =>
                      setPayment((current) => ({
                        ...current,
                        contributionKind: value as PaymentForm["contributionKind"],
                      }))
                    }
                    renderValue={(value) =>
                      contributionKinds.find((kind) => kind.value === value)?.label || value
                    }
                  >
                    {contributionKinds.map((kind) => (
                      <MenuItem key={kind.value} value={kind.value}>
                        {kind.label}
                      </MenuItem>
                    ))}
                  </LabeledSelect>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="admin-crud__actions">
            <Button
              variant="contained"
              disabled={!canSubmit}
              onClick={() => void submit()}
            >
              Confirmar recepcion
            </Button>
          </div>
        </div>
      </Paper>

      <Paper className="admin-crud__panel">
        <div className="admin-crud__panel-inner admin-crud__section-header">
          <div>
            <Typography component="h2" className="admin-crud__section-title">
              Compras recientes
            </Typography>
            <Typography className="admin-crud__section-copy">
              Recepciones confirmadas y estado de pago.
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
                <TableCell>Lineas</TableCell>
                <TableCell>Total compra</TableCell>
                <TableCell>Estado de pago</TableCell>
                <TableCell>Egreso</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {purchases.map((purchase) => (
                <TableRow key={purchase.id} hover>
                  <TableCell>{formatDate(purchase.received_at)}</TableCell>
                  <TableCell>{purchase.supplier || "-"}</TableCell>
                  <TableCell>{purchase.description || "-"}</TableCell>
                  <TableCell>{purchase.item_count}</TableCell>
                  <TableCell>{formatMoney(purchase.total_amount)}</TableCell>
                  <TableCell>
                    <Chip
                      label={purchase.total_paid == null ? "Pendiente" : "Pagada"}
                      color={purchase.total_paid == null ? "warning" : "success"}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {purchase.expense_id ? `#${purchase.expense_id}` : "-"}
                  </TableCell>
                </TableRow>
              ))}
              {purchases.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7}>Sin compras de insumos.</TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </div>
  );
}
