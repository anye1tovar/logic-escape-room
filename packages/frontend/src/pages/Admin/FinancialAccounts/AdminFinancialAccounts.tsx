import { useEffect, useMemo, useState } from "react";
import { adminRequest } from "../../../api/adminClient";
import {
  Alert,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
  Typography,
} from "@mui/material";
import "../adminCrud.scss";

type AccountType = "CASH" | "DIGITAL_WALLET" | "BANK" | "OTHER";

type FinancialAccountRow = {
  id: number;
  name: string;
  type: AccountType;
  active: boolean | number | string;
  available_for_customer_payments: boolean | number | string;
  reconciliation_enabled: boolean | number | string;
  created_at: number | string;
  created_by: number | null;
  balance: number | string;
};

type FinancialMovementRow = {
  id: number;
  financial_account_id: number;
  type: string;
  amount: number | string;
  occurred_at: number | string;
  description: string | null;
  source_type: string | null;
  source_id: string | null;
  created_by: number | null;
  created_at: number | string;
  status: string;
};

type FormState = {
  name: string;
  type: AccountType;
  initialBalance: string;
  initialBalanceNotes: string;
  active: "1" | "0";
  availableForCustomerPayments: "1" | "0";
  reconciliationEnabled: "1" | "0";
};

type MovementFilters = {
  type: string;
  dateFrom: string;
  dateTo: string;
};

const accountTypeOptions: Array<{ value: AccountType; label: string }> = [
  { value: "CASH", label: "Efectivo" },
  { value: "DIGITAL_WALLET", label: "Billetera digital" },
  { value: "BANK", label: "Banco" },
  { value: "OTHER", label: "Otra" },
];

const movementTypeOptions = [
  "INITIAL_BALANCE",
  "INCOME",
  "EXPENSE",
  "TRANSFER_IN",
  "TRANSFER_OUT",
  "OWNER_CONTRIBUTION",
  "ADJUSTMENT",
];

function normalizeBoolean(value: boolean | number | string) {
  return value === true || value === 1 || value === "1" || value === "true";
}

function formatMoney(value: number | string) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "$0";
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDateTime(value: number | string) {
  const timestamp = Number(value);
  if (!Number.isFinite(timestamp)) return "";
  return new Date(timestamp).toLocaleString("es-CO");
}

export default function AdminFinancialAccounts() {
  const [rows, setRows] = useState<FinancialAccountRow[]>([]);
  const [status, setStatus] = useState<
    | { type: "idle" }
    | { type: "loading" }
    | { type: "error"; message: string }
    | { type: "success"; message: string }
  >({ type: "loading" });
  const [form, setForm] = useState<FormState>({
    name: "",
    type: "CASH",
    initialBalance: "0",
    initialBalanceNotes: "",
    active: "1",
    availableForCustomerPayments: "1",
    reconciliationEnabled: "0",
  });
  const [movementAccount, setMovementAccount] =
    useState<FinancialAccountRow | null>(null);
  const [movements, setMovements] = useState<FinancialMovementRow[]>([]);
  const [movementFilters, setMovementFilters] = useState<MovementFilters>({
    type: "",
    dateFrom: "",
    dateTo: "",
  });
  const [movementStatus, setMovementStatus] = useState<
    "idle" | "loading" | "error"
  >("idle");

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      const activeDiff =
        Number(normalizeBoolean(b.active)) - Number(normalizeBoolean(a.active));
      if (activeDiff !== 0) return activeDiff;
      return a.name.localeCompare(b.name);
    });
  }, [rows]);

  const totalBalance = useMemo(() => {
    return rows.reduce((sum, row) => sum + Number(row.balance || 0), 0);
  }, [rows]);

  async function load() {
    setStatus({ type: "loading" });
    try {
      const data = await adminRequest<FinancialAccountRow[]>(
        "/api/admin/financial-accounts"
      );
      setRows(data || []);
      setStatus({ type: "idle" });
    } catch {
      setStatus({
        type: "error",
        message: "No se pudieron cargar las cuentas financieras.",
      });
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function create() {
    if (!form.name.trim()) {
      setStatus({ type: "error", message: "El nombre es obligatorio." });
      return;
    }
    const initialBalance = Number(form.initialBalance || 0);
    if (!Number.isFinite(initialBalance) || initialBalance < 0) {
      setStatus({
        type: "error",
        message: "El saldo inicial debe ser un valor valido.",
      });
      return;
    }

    setStatus({ type: "loading" });
    try {
      await adminRequest("/api/admin/financial-accounts", {
        method: "POST",
        body: {
          name: form.name,
          type: form.type,
          initialBalance,
          initialBalanceAt: Date.now(),
          initialBalanceNotes: form.initialBalanceNotes || null,
          active: form.active === "1",
          availableForCustomerPayments:
            form.availableForCustomerPayments === "1",
          reconciliationEnabled: form.reconciliationEnabled === "1",
        },
      });
      setForm((prev) => ({
        ...prev,
        name: "",
        initialBalance: "0",
        initialBalanceNotes: "",
      }));
      setStatus({ type: "success", message: "Cuenta financiera creada." });
      await load();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "No se pudo crear la cuenta.";
      setStatus({ type: "error", message });
    }
  }

  async function update(row: FinancialAccountRow) {
    setStatus({ type: "loading" });
    try {
      await adminRequest(`/api/admin/financial-accounts/${row.id}`, {
        method: "PATCH",
        body: {
          name: row.name,
          type: row.type,
          active: normalizeBoolean(row.active),
          availableForCustomerPayments: normalizeBoolean(
            row.available_for_customer_payments
          ),
          reconciliationEnabled: normalizeBoolean(row.reconciliation_enabled),
        },
      });
      setStatus({ type: "success", message: "Cuenta financiera actualizada." });
      await load();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "No se pudo actualizar la cuenta.";
      setStatus({ type: "error", message });
    }
  }

  async function loadMovements(
    account: FinancialAccountRow,
    filters = movementFilters
  ) {
    setMovementStatus("loading");
    try {
      const params = new URLSearchParams();
      if (filters.type) params.set("type", filters.type);
      if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
      if (filters.dateTo) params.set("dateTo", filters.dateTo);
      const query = params.toString();
      const data = await adminRequest<FinancialMovementRow[]>(
        `/api/admin/financial-accounts/${account.id}/movements${
          query ? `?${query}` : ""
        }`
      );
      setMovementAccount(account);
      setMovements(data || []);
      setMovementStatus("idle");
    } catch {
      setMovementStatus("error");
    }
  }

  const canCreate =
    form.name.trim().length > 0 &&
    Number.isFinite(Number(form.initialBalance || 0)) &&
    Number(form.initialBalance || 0) >= 0;

  return (
    <div className="admin-crud">
      <header className="admin-crud__header">
        <div>
          <Typography component="h1" className="admin-crud__title">
            Cuentas financieras
          </Typography>
          <Typography className="admin-crud__subtitle">
            Configura donde recibe y conserva dinero Logic.
          </Typography>
        </div>
        <div className="admin-crud__actions">
          <Button
            variant="outlined"
            onClick={() => void load()}
            disabled={status.type === "loading"}
          >
            Recargar
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
                Crear cuenta
              </Typography>
              <Typography className="admin-crud__section-copy">
                El saldo inicial crea un movimiento INITIAL_BALANCE. Despues el
                saldo se calcula desde el ledger.
              </Typography>
            </div>
          </div>

          <div className="admin-crud__row">
            <TextField
              label="Nombre"
              value={form.name}
              onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
              size="small"
              fullWidth
            />
            <Select
              value={form.type}
              onChange={(e) =>
                setForm((s) => ({
                  ...s,
                  type: e.target.value as AccountType,
                }))
              }
              size="small"
              fullWidth
            >
              {accountTypeOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </div>

          <div className="admin-crud__row">
            <TextField
              label="Saldo inicial"
              value={form.initialBalance}
              onChange={(e) =>
                setForm((s) => ({ ...s, initialBalance: e.target.value }))
              }
              type="number"
              inputProps={{ min: 0, step: 1, inputMode: "numeric" }}
              size="small"
              fullWidth
            />
            <TextField
              label="Observacion de saldo inicial"
              value={form.initialBalanceNotes}
              onChange={(e) =>
                setForm((s) => ({
                  ...s,
                  initialBalanceNotes: e.target.value,
                }))
              }
              size="small"
              fullWidth
            />
          </div>

          <div className="admin-crud__row">
            <Select
              value={form.availableForCustomerPayments}
              onChange={(e) =>
                setForm((s) => ({
                  ...s,
                  availableForCustomerPayments: e.target.value as "1" | "0",
                }))
              }
              size="small"
              fullWidth
            >
              <MenuItem value="1">Disponible para cobros</MenuItem>
              <MenuItem value="0">No aparece en cobros</MenuItem>
            </Select>
            <Select
              value={form.reconciliationEnabled}
              onChange={(e) =>
                setForm((s) => ({
                  ...s,
                  reconciliationEnabled: e.target.value as "1" | "0",
                }))
              }
              size="small"
              fullWidth
            >
              <MenuItem value="0">Sin conciliacion</MenuItem>
              <MenuItem value="1">Conciliacion activa</MenuItem>
            </Select>
          </div>

          <div className="admin-crud__actions">
            <Button
              variant="contained"
              onClick={() => void create()}
              disabled={status.type === "loading" || !canCreate}
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
              Cuentas existentes
            </Typography>
            <Typography className="admin-crud__section-copy">
              Edita la configuracion operativa sin modificar saldos
              directamente.
            </Typography>
          </div>
          <div className="admin-crud__meta">
            <Chip label={`${rows.length} cuentas`} size="small" />
            <Chip label={formatMoney(totalBalance)} color="primary" size="small" />
          </div>
        </div>
        <TableContainer>
          <Table className="admin-crud__table admin-crud__table--comfortable">
            <TableHead>
              <TableRow>
                <TableCell>Nombre</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell>Saldo esperado</TableCell>
                <TableCell>Activa</TableCell>
                <TableCell>Disponible cobros</TableCell>
                <TableCell>Conciliacion</TableCell>
                <TableCell>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sorted.map((row) => (
                <TableRow key={row.id} hover>
                  <TableCell className="admin-crud__cell--nowrap">
                    <TextField
                      value={row.name}
                      onChange={(e) =>
                        setRows((prev) =>
                          prev.map((item) =>
                            item.id === row.id
                              ? { ...item, name: e.target.value }
                              : item
                          )
                        )
                      }
                      size="small"
                    />
                  </TableCell>
                  <TableCell className="admin-crud__cell--nowrap">
                    <Select
                      value={row.type}
                      onChange={(e) =>
                        setRows((prev) =>
                          prev.map((item) =>
                            item.id === row.id
                              ? {
                                  ...item,
                                  type: e.target.value as AccountType,
                                }
                              : item
                          )
                        )
                      }
                      size="small"
                    >
                      {accountTypeOptions.map((option) => (
                        <MenuItem key={option.value} value={option.value}>
                          {option.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </TableCell>
                  <TableCell className="admin-crud__cell--nowrap">
                    {formatMoney(row.balance)}
                  </TableCell>
                  <TableCell className="admin-crud__cell--nowrap">
                    <Select
                      value={normalizeBoolean(row.active) ? "1" : "0"}
                      onChange={(e) =>
                        setRows((prev) =>
                          prev.map((item) =>
                            item.id === row.id
                              ? { ...item, active: e.target.value === "1" }
                              : item
                          )
                        )
                      }
                      size="small"
                    >
                      <MenuItem value="1">Si</MenuItem>
                      <MenuItem value="0">No</MenuItem>
                    </Select>
                  </TableCell>
                  <TableCell className="admin-crud__cell--nowrap">
                    <Select
                      value={
                        normalizeBoolean(row.available_for_customer_payments)
                          ? "1"
                          : "0"
                      }
                      onChange={(e) =>
                        setRows((prev) =>
                          prev.map((item) =>
                            item.id === row.id
                              ? {
                                  ...item,
                                  available_for_customer_payments:
                                    e.target.value === "1",
                                }
                              : item
                          )
                        )
                      }
                      size="small"
                    >
                      <MenuItem value="1">Si</MenuItem>
                      <MenuItem value="0">No</MenuItem>
                    </Select>
                  </TableCell>
                  <TableCell className="admin-crud__cell--nowrap">
                    <Select
                      value={
                        normalizeBoolean(row.reconciliation_enabled)
                          ? "1"
                          : "0"
                      }
                      onChange={(e) =>
                        setRows((prev) =>
                          prev.map((item) =>
                            item.id === row.id
                              ? {
                                  ...item,
                                  reconciliation_enabled:
                                    e.target.value === "1",
                                }
                              : item
                          )
                        )
                      }
                      size="small"
                    >
                      <MenuItem value="1">Si</MenuItem>
                      <MenuItem value="0">No</MenuItem>
                    </Select>
                  </TableCell>
                  <TableCell className="admin-crud__cell--nowrap">
                    <Stack direction="row" spacing={1}>
                      <Button
                        variant="contained"
                        onClick={() => void update(row)}
                        disabled={status.type === "loading"}
                      >
                        Guardar
                      </Button>
                      <Button
                        variant="outlined"
                        onClick={() => void loadMovements(row)}
                      >
                        Movimientos
                      </Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
              {sorted.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7}>Sin registros.</TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog
        open={movementAccount != null}
        onClose={() => setMovementAccount(null)}
        maxWidth="lg"
        fullWidth
        aria-labelledby="financial-account-movements-title"
      >
        <DialogTitle id="financial-account-movements-title">
          {movementAccount
            ? `Movimientos - ${movementAccount.name}`
            : "Movimientos"}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
              <Select
                value={movementFilters.type}
                onChange={(e) =>
                  setMovementFilters((prev) => ({
                    ...prev,
                    type: String(e.target.value),
                  }))
                }
                size="small"
                displayEmpty
              >
                <MenuItem value="">Todos los tipos</MenuItem>
                {movementTypeOptions.map((type) => (
                  <MenuItem key={type} value={type}>
                    {type}
                  </MenuItem>
                ))}
              </Select>
              <TextField
                label="Desde"
                type="date"
                value={movementFilters.dateFrom}
                onChange={(e) =>
                  setMovementFilters((prev) => ({
                    ...prev,
                    dateFrom: e.target.value,
                  }))
                }
                size="small"
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="Hasta"
                type="date"
                value={movementFilters.dateTo}
                onChange={(e) =>
                  setMovementFilters((prev) => ({
                    ...prev,
                    dateTo: e.target.value,
                  }))
                }
                size="small"
                InputLabelProps={{ shrink: true }}
              />
              <Button
                variant="contained"
                onClick={() => {
                  if (movementAccount) void loadMovements(movementAccount);
                }}
                disabled={!movementAccount || movementStatus === "loading"}
              >
                Filtrar
              </Button>
            </Stack>

            {movementStatus === "error" ? (
              <Alert severity="error">
                No se pudieron cargar los movimientos.
              </Alert>
            ) : null}

            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Fecha</TableCell>
                    <TableCell>Tipo</TableCell>
                    <TableCell>Valor</TableCell>
                    <TableCell>Estado</TableCell>
                    <TableCell>Origen</TableCell>
                    <TableCell>Descripcion</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {movements.map((movement) => (
                    <TableRow key={movement.id} hover>
                      <TableCell>{formatDateTime(movement.occurred_at)}</TableCell>
                      <TableCell>{movement.type}</TableCell>
                      <TableCell>{formatMoney(movement.amount)}</TableCell>
                      <TableCell>{movement.status}</TableCell>
                      <TableCell>
                        {[movement.source_type, movement.source_id]
                          .filter(Boolean)
                          .join(" #")}
                      </TableCell>
                      <TableCell>{movement.description || ""}</TableCell>
                    </TableRow>
                  ))}
                  {movements.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6}>Sin movimientos.</TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </TableContainer>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMovementAccount(null)}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
