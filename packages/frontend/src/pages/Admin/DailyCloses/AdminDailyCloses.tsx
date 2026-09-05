import { type ReactNode, useEffect, useMemo, useState } from "react";
import { adminRequest } from "../../../api/adminClient";
import {
  Alert,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Paper,
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

type Summary = {
  operational_income: number | string;
  expenses_total: number | string;
  owner_contributions_total: number | string;
  courtesy_commercial_total: number | string;
  visit_count: number | string;
  open_visits_count: number | string;
  pending_visits_count: number | string;
  pending_amount: number | string;
};

type AccountPreview = {
  financial_account_id: number;
  account_name: string;
  account_type: string;
  reconciliation_enabled?: boolean | number | string;
  expected_balance: number | string;
  day_entries: number | string;
  day_exits: number | string;
  transfer_in_total: number | string;
  transfer_out_total: number | string;
};

type CloseRow = {
  id: number;
  business_date: string;
  closed_at: number | string;
  operational_income: number | string;
  expenses_total: number | string;
  pending_amount: number | string;
  status: string;
};

type MovementRow = {
  id: number;
  type: string;
  amount: number | string;
  occurred_at: number | string;
  description: string | null;
  source_type: string | null;
  source_id: string | null;
};

type Preview = {
  businessDate: string;
  existingClose: CloseRow | null;
  summary: Summary;
  accounts: AccountPreview[];
  movedAccounts: AccountPreview[];
};

type ReconciliationForm = {
  realBalance: string;
  observation: string;
  createAdjustment: boolean;
  adjustmentReason: string;
};

const movementTypeLabels: Record<string, string> = {
  INITIAL_BALANCE: "Saldo inicial",
  INCOME: "Ingreso",
  EXPENSE: "Egreso",
  TRANSFER_IN: "Entrada por transferencia",
  TRANSFER_OUT: "Salida por transferencia",
  OWNER_CONTRIBUTION: "Aporte de propietario",
  ADJUSTMENT: "Ajuste",
};

const accountTypeLabels: Record<string, string> = {
  CASH: "Efectivo",
  DIGITAL_WALLET: "Billetera digital",
  BANK: "Banco",
  OTHER: "Otra",
};

const closeStatusLabels: Record<string, string> = {
  CLOSED: "Cerrado",
};

function todayInputValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatMoney(value: number | string | null | undefined) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function formatDateTime(value: number | string | null | undefined) {
  if (!value) return "";
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(Number(value)));
}

function normalizeBoolean(value: boolean | number | string | null | undefined) {
  return value === true || value === 1 || value === "1" || value === "true";
}

function getDifference(account: AccountPreview, form?: ReconciliationForm) {
  if (!form || form.realBalance.trim() === "") return null;
  return Number(form.realBalance || 0) - Number(account.expected_balance || 0);
}

function StatCard({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Paper className="admin-crud__panel">
      <div className="admin-crud__panel-inner">
        <Typography className="admin-crud__muted">{label}</Typography>
        <Typography variant="h6" component="div" fontWeight={900}>
          {value}
        </Typography>
      </div>
    </Paper>
  );
}

export default function AdminDailyCloses() {
  const [businessDate, setBusinessDate] = useState(todayInputValue());
  const [preview, setPreview] = useState<Preview | null>(null);
  const [closes, setCloses] = useState<CloseRow[]>([]);
  const [notes, setNotes] = useState("");
  const [allowOpenBalances, setAllowOpenBalances] = useState(false);
  const [allowDifferences, setAllowDifferences] = useState(false);
  const [reconciliations, setReconciliations] = useState<
    Record<number, ReconciliationForm>
  >({});
  const [movementAccount, setMovementAccount] = useState<AccountPreview | null>(
    null,
  );
  const [movements, setMovements] = useState<MovementRow[]>([]);
  const [status, setStatus] = useState<
    | { type: "idle" }
    | { type: "loading" }
    | { type: "success"; message: string }
    | { type: "error"; message: string }
  >({ type: "idle" });

  useEffect(() => {
    void load();
  }, [businessDate]);

  async function load() {
    setStatus({ type: "loading" });
    try {
      const [previewData, closeData] = await Promise.all([
        adminRequest<Preview>(
          `/api/admin/daily-closes/preview?date=${businessDate}`,
        ),
        adminRequest<CloseRow[]>("/api/admin/daily-closes"),
      ]);
      setPreview(previewData);
      setCloses(closeData || []);
      setReconciliations((current) => {
        const next: Record<number, ReconciliationForm> = {};
        for (const account of previewData.accounts || []) {
          const id = Number(account.financial_account_id);
          next[id] = current[id] || {
            realBalance: String(account.expected_balance ?? 0),
            observation: "",
            createAdjustment: false,
            adjustmentReason: "",
          };
        }
        return next;
      });
      setStatus({ type: "idle" });
    } catch (err) {
      setStatus({
        type: "error",
        message:
          err instanceof Error ? err.message : "No se pudo cargar el cierre.",
      });
    }
  }

  function updateReconciliation(
    accountId: number,
    patch: Partial<ReconciliationForm>,
  ) {
    setReconciliations((current) => ({
      ...current,
      [accountId]: {
        ...(current[accountId] || {
          realBalance: "",
          observation: "",
          createAdjustment: false,
          adjustmentReason: "",
        }),
        ...patch,
      },
    }));
  }

  async function openMovements(account: AccountPreview) {
    setMovementAccount(account);
    setMovements([]);
    try {
      const data = await adminRequest<MovementRow[]>(
        `/api/admin/daily-closes/accounts/${account.financial_account_id}/movements?date=${businessDate}`,
      );
      setMovements(data || []);
    } catch (err) {
      setStatus({
        type: "error",
        message:
          err instanceof Error
            ? err.message
            : "No se pudieron cargar los movimientos.",
      });
    }
  }

  async function createClose() {
    if (!preview) return;
    setStatus({ type: "loading" });
    try {
      await adminRequest("/api/admin/daily-closes", {
        method: "POST",
        body: {
          date: businessDate,
          notes,
          allowOpenBalances,
          allowDifferences,
          reconciliations: preview.accounts.map((account) => {
            const id = Number(account.financial_account_id);
            const form = reconciliations[id];
            return {
              financialAccountId: id,
              realBalance: Number(form?.realBalance || 0),
              observation: form?.observation || null,
              createAdjustment: Boolean(form?.createAdjustment),
              adjustmentReason: form?.adjustmentReason || null,
            };
          }),
        },
      });
      setNotes("");
      setAllowOpenBalances(false);
      setAllowDifferences(false);
      setStatus({ type: "success", message: "Cierre diario guardado." });
      await load();
    } catch (err) {
      setStatus({
        type: "error",
        message:
          err instanceof Error ? err.message : "No se pudo guardar el cierre.",
      });
    }
  }

  const hasOpenBalances =
    Number(preview?.summary.open_visits_count || 0) > 0 ||
    Number(preview?.summary.pending_amount || 0) > 0;
  const hasDifferences = useMemo(() => {
    return (preview?.accounts || []).some((account) => {
      const difference = getDifference(
        account,
        reconciliations[Number(account.financial_account_id)],
      );
      return difference != null && difference !== 0;
    });
  }, [preview, reconciliations]);
  const canClose =
    status.type !== "loading" &&
    preview != null &&
    !preview.existingClose &&
    preview.accounts.every((account) => {
      const form = reconciliations[Number(account.financial_account_id)];
      const difference = getDifference(account, form);
      return (
        form?.realBalance.trim() &&
        (!form.createAdjustment || form.adjustmentReason.trim()) &&
        (difference === 0 || allowDifferences)
      );
    }) &&
    (!hasOpenBalances || allowOpenBalances);

  return (
    <div className="admin-crud">
      <div className="admin-crud__header">
        <div>
          <Typography component="h1" className="admin-crud__title">
            Cerrar dia
          </Typography>
          <Typography className="admin-crud__subtitle">
            Snapshot diario de ventas, movimientos y conciliacion.
          </Typography>
        </div>
        <TextField
          label="Fecha"
          type="date"
          value={businessDate}
          onChange={(e) => setBusinessDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
          size="small"
        />
      </div>

      {status.type === "error" ? (
        <Alert severity="error">{status.message}</Alert>
      ) : null}
      {status.type === "success" ? (
        <Alert severity="success">{status.message}</Alert>
      ) : null}
      {preview?.existingClose ? (
        <Alert severity="warning">
          Ya existe un cierre guardado para esta fecha.
        </Alert>
      ) : null}

      {preview ? (
        <div className="admin-crud__row admin-crud__row--four">
          <StatCard
            label="Ingresos operativos"
            value={formatMoney(preview.summary.operational_income)}
          />
          <StatCard
            label="Egresos"
            value={formatMoney(preview.summary.expenses_total)}
          />
          <StatCard
            label="Cortesias"
            value={formatMoney(preview.summary.courtesy_commercial_total)}
          />
          <StatCard label="Visitas" value={preview.summary.visit_count} />
        </div>
      ) : null}

      {preview ? (
        <Paper className="admin-crud__panel">
          <div className="admin-crud__panel-inner admin-crud__grid">
            <div className="admin-crud__section-header">
              <div>
                <Typography component="h2" className="admin-crud__section-title">
                  Estado de visitas
                </Typography>
                <Typography className="admin-crud__section-copy">
                  Cuentas abiertas o saldos pendientes antes del cierre.
                </Typography>
              </div>
              <Stack direction="row" spacing={1}>
                <Chip
                  label={`${preview.summary.open_visits_count} abiertas`}
                  color={
                    Number(preview.summary.open_visits_count || 0) > 0
                      ? "warning"
                      : "success"
                  }
                  size="small"
                />
                <Chip
                  label={`${formatMoney(preview.summary.pending_amount)} pendientes`}
                  color={
                    Number(preview.summary.pending_amount || 0) > 0
                      ? "warning"
                      : "success"
                  }
                  size="small"
                />
              </Stack>
            </div>
            {hasOpenBalances ? (
              <FormControlLabel
                control={
                  <Checkbox
                    checked={allowOpenBalances}
                    onChange={(e) => setAllowOpenBalances(e.target.checked)}
                  />
                }
                label="Cerrar con visitas abiertas o saldos pendientes"
              />
            ) : null}
          </div>
        </Paper>
      ) : null}

      <Paper className="admin-crud__panel">
        <div className="admin-crud__panel-inner admin-crud__section-header">
          <div>
            <Typography component="h2" className="admin-crud__section-title">
              Cuentas con movimientos del dia
            </Typography>
            <Typography className="admin-crud__section-copy">
              Todas las cuentas que recibieron ingresos, egresos, aportes,
              transferencias o ajustes en la fecha seleccionada.
            </Typography>
          </div>
        </div>
        <TableContainer>
          <Table className="admin-crud__table admin-crud__table--comfortable">
            <TableHead>
              <TableRow>
                <TableCell>Cuenta</TableCell>
                <TableCell>Entradas</TableCell>
                <TableCell>Salidas</TableCell>
                <TableCell>Transferencias</TableCell>
                <TableCell>Saldo esperado</TableCell>
                <TableCell>Conciliacion</TableCell>
                <TableCell>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(preview?.movedAccounts || []).map((account) => (
                <TableRow key={account.financial_account_id} hover>
                  <TableCell>
                    <Typography fontWeight={900}>
                      {account.account_name}
                    </Typography>
                    <Typography className="admin-crud__muted">
                      {accountTypeLabels[account.account_type] ||
                        account.account_type}
                    </Typography>
                  </TableCell>
                  <TableCell>{formatMoney(account.day_entries)}</TableCell>
                  <TableCell>{formatMoney(account.day_exits)}</TableCell>
                  <TableCell>
                    +{formatMoney(account.transfer_in_total)} / -
                    {formatMoney(account.transfer_out_total)}
                  </TableCell>
                  <TableCell>{formatMoney(account.expected_balance)}</TableCell>
                  <TableCell>
                    <Chip
                      label={
                        normalizeBoolean(account.reconciliation_enabled)
                          ? "Activa"
                          : "Solo informativa"
                      }
                      color={
                        normalizeBoolean(account.reconciliation_enabled)
                          ? "primary"
                          : "default"
                      }
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outlined"
                      onClick={() => void openMovements(account)}
                    >
                      Ver movimientos
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {preview && preview.movedAccounts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7}>
                    No hay movimientos financieros en esta fecha.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Paper className="admin-crud__panel">
        <div className="admin-crud__panel-inner admin-crud__section-header">
          <div>
            <Typography component="h2" className="admin-crud__section-title">
              Conciliacion por cuenta
            </Typography>
            <Typography className="admin-crud__section-copy">
              Ingresa el saldo real contado o visto en la aplicacion externa.
            </Typography>
          </div>
        </div>
        <TableContainer>
          <Table className="admin-crud__table admin-crud__table--comfortable">
            <TableHead>
              <TableRow>
                <TableCell>Cuenta</TableCell>
                <TableCell>Movimiento del dia</TableCell>
                <TableCell>Esperado</TableCell>
                <TableCell>Real</TableCell>
                <TableCell>Diferencia</TableCell>
                <TableCell>Observacion / ajuste</TableCell>
                <TableCell>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(preview?.accounts || []).map((account) => {
                const id = Number(account.financial_account_id);
                const form = reconciliations[id];
                const difference = getDifference(account, form);
                return (
                  <TableRow key={id} hover>
                    <TableCell>
                      <Typography fontWeight={900}>
                        {account.account_name}
                      </Typography>
                      <Typography className="admin-crud__muted">
                        {accountTypeLabels[account.account_type] ||
                        account.account_type}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Stack spacing={0.5}>
                        <Typography>
                          Entradas: {formatMoney(account.day_entries)}
                        </Typography>
                        <Typography>
                          Salidas: {formatMoney(account.day_exits)}
                        </Typography>
                        <Typography className="admin-crud__muted">
                          Transferencias: +
                          {formatMoney(account.transfer_in_total)} / -
                          {formatMoney(account.transfer_out_total)}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell>{formatMoney(account.expected_balance)}</TableCell>
                    <TableCell sx={{ minWidth: 180 }}>
                      <TextField
                        value={form?.realBalance || ""}
                        onChange={(e) =>
                          updateReconciliation(id, {
                            realBalance: e.target.value,
                          })
                        }
                        inputProps={{ inputMode: "numeric" }}
                        size="small"
                        fullWidth
                      />
                    </TableCell>
                    <TableCell sx={{ minWidth: 130 }}>
                      <Chip
                        label={
                          difference == null ? "-" : formatMoney(difference)
                        }
                        color={
                          difference == null || difference === 0
                            ? "success"
                            : "warning"
                        }
                        size="small"
                      />
                    </TableCell>
                    <TableCell sx={{ minWidth: 320 }}>
                      <Stack spacing={1}>
                        <TextField
                          label="Observacion"
                          value={form?.observation || ""}
                          onChange={(e) =>
                            updateReconciliation(id, {
                              observation: e.target.value,
                            })
                          }
                          size="small"
                        />
                        {difference ? (
                          <>
                            <FormControlLabel
                              control={
                                <Checkbox
                                  checked={Boolean(form?.createAdjustment)}
                                  onChange={(e) =>
                                    updateReconciliation(id, {
                                      createAdjustment: e.target.checked,
                                      adjustmentReason: e.target.checked
                                        ? form?.adjustmentReason || ""
                                        : "",
                                    })
                                  }
                                />
                              }
                              label="Crear ajuste"
                            />
                            {form?.createAdjustment ? (
                              <TextField
                                label="Motivo del ajuste"
                                value={form.adjustmentReason}
                                onChange={(e) =>
                                  updateReconciliation(id, {
                                    adjustmentReason: e.target.value,
                                  })
                                }
                                size="small"
                              />
                            ) : null}
                          </>
                        ) : null}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => void openMovements(account)}
                      >
                        Movimientos
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {preview && preview.accounts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7}>
                    No hay cuentas con conciliacion activa.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Paper className="admin-crud__panel">
        <div className="admin-crud__panel-inner admin-crud__grid">
          <TextField
            label="Notas del cierre"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            size="small"
            fullWidth
          />
          {hasDifferences ? (
            <FormControlLabel
              control={
                <Checkbox
                  checked={allowDifferences}
                  onChange={(e) => setAllowDifferences(e.target.checked)}
                />
              }
              label="Cerrar con diferencias registradas"
            />
          ) : null}
          <div className="admin-crud__actions">
            <Button
              variant="contained"
              onClick={() => void createClose()}
              disabled={!canClose}
            >
              Cerrar dia
            </Button>
          </div>
        </div>
      </Paper>

      <Paper className="admin-crud__panel">
        <div className="admin-crud__panel-inner admin-crud__section-header">
          <div>
            <Typography component="h2" className="admin-crud__section-title">
              Cierres recientes
            </Typography>
          </div>
        </div>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Fecha</TableCell>
                <TableCell>Cerrado</TableCell>
                <TableCell>Ingresos</TableCell>
                <TableCell>Egresos</TableCell>
                <TableCell>Pendiente</TableCell>
                <TableCell>Estado</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {closes.map((close) => (
                <TableRow key={close.id} hover>
                  <TableCell>{close.business_date}</TableCell>
                  <TableCell>{formatDateTime(close.closed_at)}</TableCell>
                  <TableCell>{formatMoney(close.operational_income)}</TableCell>
                  <TableCell>{formatMoney(close.expenses_total)}</TableCell>
                  <TableCell>{formatMoney(close.pending_amount)}</TableCell>
                  <TableCell>
                    {closeStatusLabels[close.status] || close.status}
                  </TableCell>
                </TableRow>
              ))}
              {closes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6}>Sin cierres.</TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog
        open={movementAccount != null}
        onClose={() => setMovementAccount(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {movementAccount
            ? `Movimientos - ${movementAccount.account_name}`
            : "Movimientos"}
        </DialogTitle>
        <DialogContent>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Fecha</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell>Monto</TableCell>
                  <TableCell>Descripcion</TableCell>
                  <TableCell>Origen</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {movements.map((movement) => (
                  <TableRow key={movement.id} hover>
                    <TableCell>{formatDateTime(movement.occurred_at)}</TableCell>
                    <TableCell>
                      {movementTypeLabels[movement.type] || movement.type}
                    </TableCell>
                    <TableCell>{formatMoney(movement.amount)}</TableCell>
                    <TableCell>{movement.description || ""}</TableCell>
                    <TableCell>
                      {[movement.source_type, movement.source_id]
                        .filter(Boolean)
                        .join(" #")}
                    </TableCell>
                  </TableRow>
                ))}
                {movements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5}>Sin movimientos.</TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMovementAccount(null)}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
