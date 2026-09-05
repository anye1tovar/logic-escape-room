import { useEffect, useMemo, useState } from "react";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import ScienceOutlinedIcon from "@mui/icons-material/ScienceOutlined";
import {
  Alert,
  Button,
  Chip,
  FormControl,
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
  Typography,
} from "@mui/material";
import { adminRequest } from "../../../api/adminClient";
import "../adminCrud.scss";

type Rule = {
  id: number;
  name: string;
  expense_category: string;
  effective_from: string;
  effective_to: string | null;
  rooms_percent: number | string;
  cafeteria_percent: number | string;
  admin_percent: number | string;
  active: boolean;
};

type RuleForm = {
  name: string;
  expenseCategory: string;
  effectiveFrom: string;
  effectiveTo: string;
  roomsPercent: string;
  cafeteriaPercent: string;
  adminPercent: string;
  active: boolean;
};

type Simulation = {
  rule: Rule | null;
  pending: boolean;
  amount: number;
  roomsAmount?: number;
  cafeteriaAmount?: number;
  adminAmount?: number;
};

type AllocationSummary = {
  roomsAmount: number;
  cafeteriaAmount: number;
  adminAmount: number;
  pendingAmount: number;
  pendingCount: number;
  totalAmount: number;
};

const categories = [
  { value: "RENT", label: "Arriendo" },
  { value: "UTILITIES", label: "Servicios publicos" },
  { value: "SUPPLIES", label: "Insumos" },
  { value: "MAINTENANCE", label: "Mantenimiento" },
  { value: "PAYROLL", label: "Nomina" },
  { value: "MARKETING", label: "Mercadeo" },
  { value: "COMMISSIONS", label: "Comisiones" },
  { value: "TAXES", label: "Impuestos" },
  { value: "OTHER", label: "Otros" },
];

function localDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return { today: `${year}-${month}-${day}`, monthStart: `${year}-${month}-01` };
}

function emptyForm(today: string): RuleForm {
  return {
    name: "",
    expenseCategory: "RENT",
    effectiveFrom: today,
    effectiveTo: "",
    roomsPercent: "70",
    cafeteriaPercent: "30",
    adminPercent: "0",
    active: true,
  };
}

function categoryLabel(value: string) {
  return categories.find((category) => category.value === value)?.label || value;
}

function formatMoney(value: number | string | undefined) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function Stat({ label, value, warning = false }: { label: string; value: string; warning?: boolean }) {
  return (
    <Paper className="admin-crud__panel">
      <div className="admin-crud__panel-inner">
        <Typography className="admin-crud__muted">{label}</Typography>
        <Typography variant="h6" fontWeight={900} color={warning ? "warning.main" : "inherit"}>
          {value}
        </Typography>
      </div>
    </Paper>
  );
}

export default function AdminCostAllocationRules() {
  const dates = useMemo(() => localDate(), []);
  const [rules, setRules] = useState<Rule[]>([]);
  const [form, setForm] = useState<RuleForm>(() => emptyForm(dates.today));
  const [editingId, setEditingId] = useState<number | null>(null);
  const [status, setStatus] = useState<
    | { type: "idle" | "loading" }
    | { type: "error" | "success"; message: string }
  >({ type: "loading" });
  const [summaryRange, setSummaryRange] = useState({
    dateFrom: dates.monthStart,
    dateTo: dates.today,
  });
  const [summary, setSummary] = useState<AllocationSummary | null>(null);
  const [simulationForm, setSimulationForm] = useState({
    expenseCategory: "RENT",
    effectiveDate: dates.today,
    amount: "1000000",
  });
  const [simulation, setSimulation] = useState<Simulation | null>(null);

  const percentageTotal =
    Number(form.roomsPercent || 0) +
    Number(form.cafeteriaPercent || 0) +
    Number(form.adminPercent || 0);

  async function loadRules() {
    const data = await adminRequest<Rule[]>("/api/admin/cost-allocation-rules");
    setRules(data || []);
  }

  async function loadSummary() {
    const params = new URLSearchParams(summaryRange);
    const data = await adminRequest<AllocationSummary>(
      `/api/admin/cost-allocation-rules/summary?${params.toString()}`,
    );
    setSummary(data);
  }

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({
      dateFrom: dates.monthStart,
      dateTo: dates.today,
    });
    Promise.all([
      adminRequest<Rule[]>("/api/admin/cost-allocation-rules"),
      adminRequest<AllocationSummary>(
        `/api/admin/cost-allocation-rules/summary?${params.toString()}`,
      ),
    ])
      .then(([ruleRows, allocationSummary]) => {
        if (cancelled) return;
        setRules(ruleRows || []);
        setSummary(allocationSummary);
        setStatus({ type: "idle" });
      })
      .catch((error) => {
        if (cancelled) return;
        setStatus({
          type: "error",
          message:
            error instanceof Error
              ? error.message
              : "No se pudieron cargar las reglas.",
        });
      });
    return () => {
      cancelled = true;
    };
  }, [dates.monthStart, dates.today]);

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm(dates.today));
  }

  function edit(rule: Rule) {
    setEditingId(rule.id);
    setForm({
      name: rule.name,
      expenseCategory: rule.expense_category,
      effectiveFrom: rule.effective_from,
      effectiveTo: rule.effective_to || "",
      roomsPercent: String(rule.rooms_percent),
      cafeteriaPercent: String(rule.cafeteria_percent),
      adminPercent: String(rule.admin_percent),
      active: Boolean(rule.active),
    });
  }

  async function save() {
    setStatus({ type: "loading" });
    try {
      await adminRequest(
        editingId
          ? `/api/admin/cost-allocation-rules/${editingId}`
          : "/api/admin/cost-allocation-rules",
        {
          method: editingId ? "PATCH" : "POST",
          body: {
            ...form,
            effectiveTo: form.effectiveTo || null,
            roomsPercent: Number(form.roomsPercent),
            cafeteriaPercent: Number(form.cafeteriaPercent),
            adminPercent: Number(form.adminPercent),
          },
        },
      );
      resetForm();
      await loadRules();
      setStatus({ type: "success", message: "Regla guardada." });
    } catch (error) {
      setStatus({
        type: "error",
        message: error instanceof Error ? error.message : "No se pudo guardar la regla.",
      });
    }
  }

  async function toggle(rule: Rule) {
    setStatus({ type: "loading" });
    try {
      await adminRequest(`/api/admin/cost-allocation-rules/${rule.id}`, {
        method: "PATCH",
        body: {
          name: rule.name,
          expenseCategory: rule.expense_category,
          effectiveFrom: rule.effective_from,
          effectiveTo: rule.effective_to,
          roomsPercent: Number(rule.rooms_percent),
          cafeteriaPercent: Number(rule.cafeteria_percent),
          adminPercent: Number(rule.admin_percent),
          active: !rule.active,
        },
      });
      await loadRules();
      setStatus({
        type: "success",
        message: rule.active ? "Regla desactivada." : "Regla activada.",
      });
    } catch (error) {
      setStatus({
        type: "error",
        message: error instanceof Error ? error.message : "No se pudo cambiar el estado.",
      });
    }
  }

  async function simulate() {
    setStatus({ type: "loading" });
    try {
      const result = await adminRequest<Simulation>(
        "/api/admin/cost-allocation-rules/simulate",
        {
          method: "POST",
          body: { ...simulationForm, amount: Number(simulationForm.amount) },
        },
      );
      setSimulation(result);
      setStatus({ type: "idle" });
    } catch (error) {
      setStatus({
        type: "error",
        message: error instanceof Error ? error.message : "No se pudo simular.",
      });
    }
  }

  const canSave =
    form.name.trim().length > 0 &&
    form.effectiveFrom.length > 0 &&
    (!form.effectiveTo || form.effectiveTo >= form.effectiveFrom) &&
    Math.abs(percentageTotal - 100) < 0.001;

  return (
    <div className="admin-crud">
      <div className="admin-crud__header">
        <div>
          <Typography component="h1" className="admin-crud__title">
            Reglas de reparto
          </Typography>
          <Typography className="admin-crud__subtitle">
            Distribucion historica de gastos indirectos por categoria y vigencia.
          </Typography>
        </div>
      </div>

      {status.type === "error" ? <Alert severity="error">{status.message}</Alert> : null}
      {status.type === "success" ? <Alert severity="success">{status.message}</Alert> : null}
      {Math.abs(percentageTotal - 100) >= 0.001 ? (
        <Alert severity="warning">Los porcentajes de la regla deben sumar 100 %.</Alert>
      ) : null}

      <Paper className="admin-crud__panel admin-crud__panel--accent">
        <div className="admin-crud__panel-inner admin-crud__grid">
          <div className="admin-crud__section-header">
            <div>
              <Typography component="h2" className="admin-crud__section-title">
                {editingId ? "Editar regla" : "Crear regla"}
              </Typography>
              <Typography className="admin-crud__section-copy">
                Solo puede existir una regla activa por categoria para una misma fecha.
              </Typography>
            </div>
          </div>
          <div className="admin-crud__row">
            <TextField label="Nombre" size="small" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
            <FormControl size="small">
              <InputLabel shrink>Categoria de egreso</InputLabel>
              <Select label="Categoria de egreso" value={form.expenseCategory} onChange={(event) => setForm((current) => ({ ...current, expenseCategory: String(event.target.value) }))}>
                {categories.map((category) => <MenuItem key={category.value} value={category.value}>{category.label}</MenuItem>)}
              </Select>
            </FormControl>
          </div>
          <div className="admin-crud__row">
            <TextField label="Vigente desde" type="date" size="small" value={form.effectiveFrom} onChange={(event) => setForm((current) => ({ ...current, effectiveFrom: event.target.value }))} InputLabelProps={{ shrink: true }} />
            <TextField label="Vigente hasta (opcional)" type="date" size="small" value={form.effectiveTo} onChange={(event) => setForm((current) => ({ ...current, effectiveTo: event.target.value }))} InputLabelProps={{ shrink: true }} />
          </div>
          <div className="admin-crud__row admin-crud__row--four">
            <TextField label="Salas %" type="number" size="small" value={form.roomsPercent} onChange={(event) => setForm((current) => ({ ...current, roomsPercent: event.target.value }))} inputProps={{ min: 0, max: 100, step: 0.01 }} />
            <TextField label="Cafeteria %" type="number" size="small" value={form.cafeteriaPercent} onChange={(event) => setForm((current) => ({ ...current, cafeteriaPercent: event.target.value }))} inputProps={{ min: 0, max: 100, step: 0.01 }} />
            <TextField label="Administracion %" type="number" size="small" value={form.adminPercent} onChange={(event) => setForm((current) => ({ ...current, adminPercent: event.target.value }))} inputProps={{ min: 0, max: 100, step: 0.01 }} />
            <TextField label="Total" size="small" value={`${percentageTotal} %`} InputProps={{ readOnly: true }} />
          </div>
          <div className="admin-crud__actions">
            <Button variant="contained" disabled={!canSave || status.type === "loading"} onClick={() => void save()}>
              {editingId ? "Guardar cambios" : "Crear regla"}
            </Button>
            {editingId ? <Button variant="outlined" onClick={resetForm}>Cancelar</Button> : null}
          </div>
        </div>
      </Paper>

      <Paper className="admin-crud__panel">
        <div className="admin-crud__panel-inner">
          <Typography component="h2" className="admin-crud__section-title">Reglas registradas</Typography>
        </div>
        <TableContainer>
          <Table size="small" sx={{ minWidth: 900 }}>
            <TableHead><TableRow><TableCell>Regla</TableCell><TableCell>Categoria</TableCell><TableCell>Vigencia</TableCell><TableCell>Reparto</TableCell><TableCell>Estado</TableCell><TableCell>Acciones</TableCell></TableRow></TableHead>
            <TableBody>
              {rules.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell>{rule.name}</TableCell>
                  <TableCell>{categoryLabel(rule.expense_category)}</TableCell>
                  <TableCell>{rule.effective_from} a {rule.effective_to || "Sin fecha final"}</TableCell>
                  <TableCell>Salas {rule.rooms_percent} % / Cafeteria {rule.cafeteria_percent} % / Admin {rule.admin_percent} %</TableCell>
                  <TableCell><Chip size="small" color={rule.active ? "success" : "default"} label={rule.active ? "Activa" : "Inactiva"} /></TableCell>
                  <TableCell><Stack direction="row" spacing={1}><Button startIcon={<EditOutlinedIcon />} variant="outlined" onClick={() => edit(rule)}>Editar</Button><Button color={rule.active ? "warning" : "success"} variant="outlined" onClick={() => void toggle(rule)}>{rule.active ? "Desactivar" : "Activar"}</Button></Stack></TableCell>
                </TableRow>
              ))}
              {!rules.length ? <TableRow><TableCell colSpan={6}>No hay reglas registradas.</TableCell></TableRow> : null}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Paper className="admin-crud__panel">
        <div className="admin-crud__panel-inner admin-crud__grid">
          <div>
            <Typography component="h2" className="admin-crud__section-title">Simular reparto</Typography>
            <Typography className="admin-crud__section-copy">Prueba la regla que aplicaria para una categoria, fecha y monto.</Typography>
          </div>
          <div className="admin-crud__row admin-crud__row--four">
            <FormControl size="small"><InputLabel shrink>Categoria</InputLabel><Select label="Categoria" value={simulationForm.expenseCategory} onChange={(event) => setSimulationForm((current) => ({ ...current, expenseCategory: String(event.target.value) }))}>{categories.map((category) => <MenuItem key={category.value} value={category.value}>{category.label}</MenuItem>)}</Select></FormControl>
            <TextField label="Fecha" type="date" size="small" value={simulationForm.effectiveDate} onChange={(event) => setSimulationForm((current) => ({ ...current, effectiveDate: event.target.value }))} InputLabelProps={{ shrink: true }} />
            <TextField label="Monto" type="number" size="small" value={simulationForm.amount} onChange={(event) => setSimulationForm((current) => ({ ...current, amount: event.target.value }))} inputProps={{ min: 1, step: 1 }} />
            <Button startIcon={<ScienceOutlinedIcon />} variant="contained" onClick={() => void simulate()}>Simular</Button>
          </div>
          {simulation?.pending ? <Alert severity="warning">No existe una regla activa para esa categoria y fecha. El egreso quedaria pendiente.</Alert> : null}
          {simulation?.rule ? <Alert severity="info">Regla: {simulation.rule.name}. Salas {formatMoney(simulation.roomsAmount)}, cafeteria {formatMoney(simulation.cafeteriaAmount)} y administracion {formatMoney(simulation.adminAmount)}.</Alert> : null}
        </div>
      </Paper>

      <section className="admin-crud__grid">
        <div className="admin-crud__section-header">
          <div>
            <Typography component="h2" className="admin-crud__section-title">
              Gastos asignados por area
            </Typography>
            <Typography className="admin-crud__section-copy">
              Usa los porcentajes congelados en cada egreso.
            </Typography>
          </div>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <TextField label="Desde" type="date" size="small" value={summaryRange.dateFrom} onChange={(event) => setSummaryRange((current) => ({ ...current, dateFrom: event.target.value }))} InputLabelProps={{ shrink: true }} />
            <TextField label="Hasta" type="date" size="small" value={summaryRange.dateTo} onChange={(event) => setSummaryRange((current) => ({ ...current, dateTo: event.target.value }))} InputLabelProps={{ shrink: true }} />
            <Button variant="outlined" onClick={() => void loadSummary()}>Actualizar</Button>
          </Stack>
        </div>
        {summary ? (
          <div className="admin-crud__row admin-crud__row--four">
            <Stat label="Salas" value={formatMoney(summary.roomsAmount)} />
            <Stat label="Cafeteria" value={formatMoney(summary.cafeteriaAmount)} />
            <Stat label="Administracion" value={formatMoney(summary.adminAmount)} />
            <Stat label={`Pendiente (${summary.pendingCount})`} value={formatMoney(summary.pendingAmount)} warning={summary.pendingCount > 0} />
          </div>
        ) : null}
      </section>
    </div>
  );
}
