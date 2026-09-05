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

type ExpenseRow = {
  id: number;
  category: string;
  description: string;
  total_amount: number | string;
  occurred_at: number | string;
  status: string;
  cost_center: string;
  allocation_mode: string;
  allocation_percentage_rooms?: number | string | null;
  allocation_percentage_cafeteria?: number | string | null;
  allocation_percentage_admin?: number | string | null;
  allocation_source?: string | null;
  allocation_rule_id?: number | null;
  allocation_rule_name_snapshot?: string | null;
  allocations?: Array<{
    sourceType: string;
    financialAccountId?: number | null;
    financialAccountName?: string | null;
    ownerName?: string | null;
    contributionKind?: string | null;
    amount: number | string;
  }>;
};

type OwnerContributionRow = {
  id: number;
  financial_account_id: number;
  financial_account_name: string | null;
  owner_name: string | null;
  contribution_kind: string;
  amount: number | string;
  occurred_at: number | string;
  notes?: string | null;
  status: string;
};

type TransferRow = {
  id: number;
  from_financial_account_id: number;
  to_financial_account_id: number;
  from_financial_account_name: string | null;
  to_financial_account_name: string | null;
  amount: number | string;
  occurred_at: number | string;
  notes?: string | null;
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

type ExpenseFormState = {
  category: string;
  costCenter: string;
  allocationPercentageRooms: string;
  allocationPercentageCafeteria: string;
  allocationPercentageAdmin: string;
  allocationSource: "MANUAL" | "RULE";
  occurredAt: number | null;
  description: string;
  totalAmount: string;
  accountId: string;
  accountAmount: string;
  splitFunding: boolean;
  ownerName: string;
  ownerAmount: string;
  contributionKind: "REIMBURSABLE" | "NON_REIMBURSABLE";
};

type ExpenseFilters = {
  category: string;
  costCenter: string;
};

type ContributionFormState = {
  financialAccountId: string;
  ownerName: string;
  contributionKind: "REIMBURSABLE" | "NON_REIMBURSABLE";
  amount: string;
  description: string;
};

type TransferFormState = {
  fromFinancialAccountId: string;
  toFinancialAccountId: string;
  amount: string;
  description: string;
};

type StoredUser = { role?: string };

const accountTypeOptions: Array<{ value: AccountType; label: string }> = [
  { value: "CASH", label: "Efectivo" },
  { value: "DIGITAL_WALLET", label: "Billetera digital" },
  { value: "BANK", label: "Banco" },
  { value: "OTHER", label: "Otra" },
];

const movementTypeOptions = [
  { value: "INITIAL_BALANCE", label: "Saldo inicial" },
  { value: "INCOME", label: "Ingreso" },
  { value: "EXPENSE", label: "Egreso" },
  { value: "TRANSFER_IN", label: "Entrada por transferencia" },
  { value: "TRANSFER_OUT", label: "Salida por transferencia" },
  { value: "OWNER_CONTRIBUTION", label: "Aporte de propietario" },
  { value: "ADJUSTMENT", label: "Ajuste" },
];
const expenseCategories = [
  { value: "RENT", label: "Arriendo" },
  { value: "UTILITIES", label: "Servicios publicos" },
  { value: "SUPPLIES", label: "Insumos" },
  { value: "MAINTENANCE", label: "Mantenimiento" },
  { value: "PAYROLL", label: "Nomina" },
  { value: "MARKETING", label: "Mercadeo" },
  { value: "COMMISSIONS", label: "Comisiones" },
  { value: "OWNER_REIMBURSEMENT", label: "Reembolso a propietario" },
  { value: "TAXES", label: "Impuestos" },
  { value: "OTHER", label: "Otro" },
];

const expenseCostCenters = [
  { value: "ROOMS", label: "Salas" },
  { value: "CAFETERIA", label: "Cafeteria" },
  { value: "ADMINISTRATION", label: "Administracion" },
  { value: "MARKETING", label: "Mercadeo" },
  { value: "MIXED", label: "Mixto" },
];

const expenseCostCentersWithUnassigned = [
  ...expenseCostCenters,
  { value: "UNASSIGNED", label: "Sin clasificar" },
];

const contributionKindOptions = [
  { value: "REIMBURSABLE", label: "Reembolsable" },
  { value: "NON_REIMBURSABLE", label: "No reembolsable" },
] as const;

const statusLabels: Record<string, string> = {
  ACTIVE: "Activo",
  VOIDED: "Anulado",
};

function getLabel(
  options: Array<{ value: string; label: string }>,
  value: string
) {
  return options.find((option) => option.value === value)?.label || value;
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
      <InputLabel shrink>{label}</InputLabel>
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

function normalizeBoolean(value: boolean | number | string) {
  return value === true || value === 1 || value === "1" || value === "true";
}

function getStoredAdminUser(): StoredUser | null {
  const raw = localStorage.getItem("adminUser");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredUser;
  } catch {
    return null;
  }
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

type AdminFinancialAccountsProps = {
  mode?: "accounts" | "movements";
};

export default function AdminFinancialAccounts({
  mode = "accounts",
}: AdminFinancialAccountsProps) {
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
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [contributions, setContributions] = useState<OwnerContributionRow[]>(
    []
  );
  const [transfers, setTransfers] = useState<TransferRow[]>([]);
  const [expenseForm, setExpenseForm] = useState<ExpenseFormState>({
    category: "SUPPLIES",
    costCenter: "CAFETERIA",
    allocationPercentageRooms: "0",
    allocationPercentageCafeteria: "100",
    allocationPercentageAdmin: "0",
    allocationSource: "MANUAL",
    occurredAt: null,
    description: "",
    totalAmount: "",
    accountId: "",
    accountAmount: "",
    splitFunding: false,
    ownerName: "",
    ownerAmount: "",
    contributionKind: "REIMBURSABLE",
  });
  const [expenseFilters, setExpenseFilters] = useState<ExpenseFilters>({
    category: "",
    costCenter: "",
  });
  const [editingExpenseId, setEditingExpenseId] = useState<number | null>(null);
  const [contributionForm, setContributionForm] =
    useState<ContributionFormState>({
      financialAccountId: "",
      ownerName: "",
      contributionKind: "REIMBURSABLE",
      amount: "",
      description: "",
    });
  const [editingContributionId, setEditingContributionId] = useState<
    number | null
  >(null);
  const [transferForm, setTransferForm] = useState<TransferFormState>({
    fromFinancialAccountId: "",
    toFinancialAccountId: "",
    amount: "",
    description: "",
  });
  const [editingTransferId, setEditingTransferId] = useState<number | null>(
    null
  );
  const canManageFinancialAccounts = useMemo(
    () =>
      mode === "accounts" &&
      String(getStoredAdminUser()?.role || "admin").toLowerCase() === "admin",
    [mode]
  );

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
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
        mode === "movements"
          ? "/api/admin/financial-accounts/operation-accounts"
          : "/api/admin/financial-accounts"
      );
      setRows(data || []);
      setStatus({ type: "idle" });
    } catch {
      setStatus({
        type: "error",
        message:
          mode === "movements"
            ? "No se pudieron cargar las cuentas para movimientos."
            : "No se pudieron cargar las cuentas financieras.",
      });
    }
  }

  async function loadOperations() {
    try {
      const params = new URLSearchParams();
      if (expenseFilters.category) params.set("category", expenseFilters.category);
      if (expenseFilters.costCenter) params.set("costCenter", expenseFilters.costCenter);
      const [expenseData, contributionData, transferData] = await Promise.all([
        adminRequest<ExpenseRow[]>(
          `/api/admin/financial-accounts/expenses?${params.toString()}`
        ),
        adminRequest<OwnerContributionRow[]>(
          "/api/admin/financial-accounts/owner-contributions"
        ),
        adminRequest<TransferRow[]>("/api/admin/financial-accounts/transfers"),
      ]);
      setExpenses(expenseData || []);
      setContributions(contributionData || []);
      setTransfers(transferData || []);
    } catch {
      setStatus({
        type: "error",
        message: "No se pudieron cargar las operaciones financieras.",
      });
    }
  }

  useEffect(() => {
    void load();
    if (mode === "movements") void loadOperations();
  }, [mode]);

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

  function resetExpenseForm() {
    setEditingExpenseId(null);
    setExpenseForm({
      category: "SUPPLIES",
      costCenter: "CAFETERIA",
      allocationPercentageRooms: "0",
      allocationPercentageCafeteria: "100",
      allocationPercentageAdmin: "0",
      allocationSource: "MANUAL",
      occurredAt: null,
      description: "",
      totalAmount: "",
      accountId: "",
      accountAmount: "",
      splitFunding: false,
      ownerName: "",
      ownerAmount: "",
      contributionKind: "REIMBURSABLE",
    });
  }

  function resetContributionForm() {
    setEditingContributionId(null);
    setContributionForm({
      financialAccountId: "",
      ownerName: "",
      contributionKind: "REIMBURSABLE",
      amount: "",
      description: "",
    });
  }

  function resetTransferForm() {
    setEditingTransferId(null);
    setTransferForm({
      fromFinancialAccountId: "",
      toFinancialAccountId: "",
      amount: "",
      description: "",
    });
  }

  function buildExpensePayload() {
    const totalAmount = Number(expenseForm.totalAmount || 0);
    const accountAmount = expenseForm.splitFunding
      ? Number(expenseForm.accountAmount || 0)
      : totalAmount;
    const ownerAmount = expenseForm.splitFunding
      ? Number(expenseForm.ownerAmount || 0)
      : 0;
    const allocations = [];
    if (accountAmount > 0) {
      allocations.push({
        sourceType: "FINANCIAL_ACCOUNT",
        financialAccountId: Number(expenseForm.accountId),
        amount: accountAmount,
      });
    }
    if (ownerAmount > 0) {
      allocations.push({
        sourceType: "OWNER_PERSONAL_FUNDS",
        ownerName: expenseForm.ownerName,
        contributionKind: expenseForm.contributionKind,
        amount: ownerAmount,
      });
    }
    return {
      category: expenseForm.category,
      costCenter: expenseForm.costCenter,
      allocationMode:
        expenseForm.costCenter === "MIXED" ? "PERCENTAGE" : "DIRECT",
      allocationSource:
        expenseForm.costCenter === "MIXED"
          ? expenseForm.allocationSource
          : "DIRECT",
      allocationPercentageRooms:
        expenseForm.costCenter === "MIXED"
          ? Number(expenseForm.allocationPercentageRooms || 0)
          : null,
      allocationPercentageCafeteria:
        expenseForm.costCenter === "MIXED"
          ? Number(expenseForm.allocationPercentageCafeteria || 0)
          : null,
      allocationPercentageAdmin:
        expenseForm.costCenter === "MIXED"
          ? Number(expenseForm.allocationPercentageAdmin || 0)
          : null,
      description: expenseForm.description,
      totalAmount,
      allocations,
      occurredAt: expenseForm.occurredAt || undefined,
    };
  }

  async function saveExpense() {
    setStatus({ type: "loading" });
    try {
      await adminRequest(
        editingExpenseId
          ? `/api/admin/financial-accounts/expenses/${editingExpenseId}`
          : "/api/admin/financial-accounts/expenses",
        {
          method: editingExpenseId ? "PATCH" : "POST",
          body: buildExpensePayload(),
        }
      );
      resetExpenseForm();
      setStatus({
        type: "success",
        message: editingExpenseId
          ? "Egreso actualizado."
          : "Egreso registrado.",
      });
      await load();
      await loadOperations();
    } catch (err: unknown) {
      setStatus({
        type: "error",
        message: err instanceof Error ? err.message : "No se pudo registrar.",
      });
    }
  }

  function editExpense(expense: ExpenseRow) {
    const logicAllocation = (expense.allocations || []).find(
      (allocation) => allocation.sourceType === "FINANCIAL_ACCOUNT"
    );
    const ownerAllocation = (expense.allocations || []).find(
      (allocation) => allocation.sourceType === "OWNER_PERSONAL_FUNDS"
    );
    const splitFunding = Boolean(ownerAllocation);
    setEditingExpenseId(expense.id);
    setExpenseForm({
      category: expense.category,
      costCenter:
        expense.cost_center === "UNASSIGNED" ? "" : expense.cost_center,
      allocationPercentageRooms: String(
        expense.allocation_percentage_rooms ?? 0
      ),
      allocationPercentageCafeteria: String(
        expense.allocation_percentage_cafeteria ?? 0
      ),
      allocationPercentageAdmin: String(
        expense.allocation_percentage_admin ?? 0
      ),
      allocationSource:
        expense.allocation_source === "RULE" ||
        expense.allocation_source === "PENDING"
          ? "RULE"
          : "MANUAL",
      occurredAt: Number(expense.occurred_at),
      description: expense.description,
      totalAmount: String(expense.total_amount),
      accountId: logicAllocation?.financialAccountId
        ? String(logicAllocation.financialAccountId)
        : "",
      accountAmount: splitFunding && logicAllocation
        ? String(logicAllocation.amount)
        : "",
      splitFunding,
      ownerName: ownerAllocation?.ownerName || "",
      ownerAmount: ownerAllocation ? String(ownerAllocation.amount) : "",
      contributionKind:
        ownerAllocation?.contributionKind === "NON_REIMBURSABLE"
          ? "NON_REIMBURSABLE"
          : "REIMBURSABLE",
    });
  }

  async function voidExpense(id: number) {
    if (!window.confirm("Anular este egreso?")) return;
    setStatus({ type: "loading" });
    try {
      await adminRequest(`/api/admin/financial-accounts/expenses/${id}`, {
        method: "DELETE",
      });
      if (editingExpenseId === id) resetExpenseForm();
      setStatus({ type: "success", message: "Egreso anulado." });
      await load();
      await loadOperations();
    } catch (err: unknown) {
      setStatus({
        type: "error",
        message: err instanceof Error ? err.message : "No se pudo anular.",
      });
    }
  }

  async function saveOwnerContribution() {
    setStatus({ type: "loading" });
    try {
      await adminRequest(
        editingContributionId
          ? `/api/admin/financial-accounts/owner-contributions/${editingContributionId}`
          : "/api/admin/financial-accounts/owner-contributions",
        {
          method: editingContributionId ? "PATCH" : "POST",
          body: {
            financialAccountId: Number(contributionForm.financialAccountId),
            ownerName: contributionForm.ownerName,
            contributionKind: contributionForm.contributionKind,
            amount: Number(contributionForm.amount || 0),
            description: contributionForm.description,
          },
        }
      );
      resetContributionForm();
      setStatus({
        type: "success",
        message: editingContributionId
          ? "Aporte actualizado."
          : "Aporte registrado.",
      });
      await load();
      await loadOperations();
    } catch (err: unknown) {
      setStatus({
        type: "error",
        message: err instanceof Error ? err.message : "No se pudo registrar.",
      });
    }
  }

  function editContribution(contribution: OwnerContributionRow) {
    setEditingContributionId(contribution.id);
    setContributionForm({
      financialAccountId: String(contribution.financial_account_id),
      ownerName: contribution.owner_name || "",
      contributionKind:
        contribution.contribution_kind === "NON_REIMBURSABLE"
          ? "NON_REIMBURSABLE"
          : "REIMBURSABLE",
      amount: String(contribution.amount),
      description: contribution.notes || "",
    });
  }

  async function voidOwnerContribution(id: number) {
    if (!window.confirm("Anular este aporte?")) return;
    setStatus({ type: "loading" });
    try {
      await adminRequest(
        `/api/admin/financial-accounts/owner-contributions/${id}`,
        { method: "DELETE" }
      );
      if (editingContributionId === id) resetContributionForm();
      setStatus({ type: "success", message: "Aporte anulado." });
      await load();
      await loadOperations();
    } catch (err: unknown) {
      setStatus({
        type: "error",
        message: err instanceof Error ? err.message : "No se pudo anular.",
      });
    }
  }

  async function saveTransfer() {
    setStatus({ type: "loading" });
    try {
      await adminRequest(
        editingTransferId
          ? `/api/admin/financial-accounts/transfers/${editingTransferId}`
          : "/api/admin/financial-accounts/transfers",
        {
          method: editingTransferId ? "PATCH" : "POST",
          body: {
            fromFinancialAccountId: Number(transferForm.fromFinancialAccountId),
            toFinancialAccountId: Number(transferForm.toFinancialAccountId),
            amount: Number(transferForm.amount || 0),
            description: transferForm.description,
          },
        }
      );
      resetTransferForm();
      setStatus({
        type: "success",
        message: editingTransferId
          ? "Transferencia actualizada."
          : "Transferencia registrada.",
      });
      await load();
      await loadOperations();
    } catch (err: unknown) {
      setStatus({
        type: "error",
        message: err instanceof Error ? err.message : "No se pudo registrar.",
      });
    }
  }

  function editTransfer(transfer: TransferRow) {
    setEditingTransferId(transfer.id);
    setTransferForm({
      fromFinancialAccountId: String(transfer.from_financial_account_id),
      toFinancialAccountId: String(transfer.to_financial_account_id),
      amount: String(transfer.amount),
      description: transfer.notes || "",
    });
  }

  async function voidTransfer(id: number) {
    if (!window.confirm("Anular esta transferencia?")) return;
    setStatus({ type: "loading" });
    try {
      await adminRequest(`/api/admin/financial-accounts/transfers/${id}`, {
        method: "DELETE",
      });
      if (editingTransferId === id) resetTransferForm();
      setStatus({ type: "success", message: "Transferencia anulada." });
      await load();
      await loadOperations();
    } catch (err: unknown) {
      setStatus({
        type: "error",
        message: err instanceof Error ? err.message : "No se pudo anular.",
      });
    }
  }

  const canCreate =
    form.name.trim().length > 0 &&
    Number.isFinite(Number(form.initialBalance || 0)) &&
    Number(form.initialBalance || 0) >= 0;
  const activeAccounts = rows.filter((row) => normalizeBoolean(row.active));
  const canCreateExpense = Boolean(
    expenseForm.description.trim().length > 0 &&
      expenseForm.category &&
      expenseForm.costCenter &&
      Number(expenseForm.totalAmount || 0) > 0 &&
      expenseForm.accountId &&
      (expenseForm.costCenter !== "MIXED" ||
        expenseForm.allocationSource === "RULE" ||
        (Number(expenseForm.allocationPercentageRooms || 0) >= 0 &&
          Number(expenseForm.allocationPercentageCafeteria || 0) >= 0 &&
          Number(expenseForm.allocationPercentageAdmin || 0) >= 0 &&
          Number(expenseForm.allocationPercentageRooms || 0) +
            Number(expenseForm.allocationPercentageCafeteria || 0) +
            Number(expenseForm.allocationPercentageAdmin || 0) ===
            100)) &&
      (!expenseForm.splitFunding ||
        (Number(expenseForm.accountAmount || 0) +
          Number(expenseForm.ownerAmount || 0) ===
          Number(expenseForm.totalAmount || 0) &&
          Number(expenseForm.accountAmount || 0) > 0 &&
          Number(expenseForm.ownerAmount || 0) > 0 &&
          expenseForm.ownerName.trim().length > 0))
  );
  const canCreateContribution = Boolean(
    contributionForm.financialAccountId &&
      contributionForm.ownerName.trim().length > 0 &&
      Number(contributionForm.amount || 0) > 0 &&
      contributionForm.description.trim().length > 0
  );
  const canCreateTransfer = Boolean(
    transferForm.fromFinancialAccountId &&
      transferForm.toFinancialAccountId &&
      transferForm.fromFinancialAccountId !== transferForm.toFinancialAccountId &&
      Number(transferForm.amount || 0) > 0 &&
      transferForm.description.trim().length > 0
  );

  return (
    <div className="admin-crud">
      <header className="admin-crud__header">
        <div>
          <Typography component="h1" className="admin-crud__title">
            {mode === "movements"
              ? "Movimientos financieros"
              : "Cuentas financieras"}
          </Typography>
          <Typography className="admin-crud__subtitle">
            {mode === "movements"
              ? "Registra egresos, aportes de propietario y transferencias internas."
              : "Configura donde recibe y conserva dinero Logic."}
          </Typography>
        </div>
        <div className="admin-crud__actions">
          <Button
            variant="outlined"
            onClick={() => {
              void load();
              if (mode === "movements") void loadOperations();
            }}
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

      {mode === "accounts" && canManageFinancialAccounts ? (
        <>
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
        </>
      ) : null}

      {mode === "movements" ? (
      <>
      <Paper className="admin-crud__panel admin-crud__panel--accent">
        <div className="admin-crud__panel-inner admin-crud__grid">
          <div className="admin-crud__section-header">
            <div>
              <Typography component="h2" className="admin-crud__section-title">
                {editingExpenseId ? "Editar egreso" : "Registrar egreso"}
              </Typography>
              <Typography className="admin-crud__section-copy">
                Por defecto el total se descuenta completo de la cuenta Logic
                seleccionada.
              </Typography>
            </div>
          </div>

          <div className="admin-crud__row">
            <PlaceholderSelect
              label="Categoria"
              value={expenseForm.category}
              onChange={(value) =>
                setExpenseForm((s) => ({
                  ...s,
                  category: value,
                  costCenter:
                    value === "OWNER_REIMBURSEMENT"
                      ? "ADMINISTRATION"
                      : s.costCenter,
                }))
              }
              renderValue={(value) => getLabel(expenseCategories, value)}
            >
              {expenseCategories.map((category) => (
                <MenuItem key={category.value} value={category.value}>
                  {category.label}
                </MenuItem>
              ))}
            </PlaceholderSelect>
            <PlaceholderSelect
              label="Centro de costo"
              value={expenseForm.costCenter}
              onChange={(value) =>
                setExpenseForm((s) => ({
                  ...s,
                  costCenter: value,
                  allocationPercentageRooms:
                    value === "MIXED" ? s.allocationPercentageRooms : "0",
                  allocationPercentageCafeteria:
                    value === "MIXED" ? s.allocationPercentageCafeteria : "0",
                  allocationPercentageAdmin:
                    value === "MIXED" ? s.allocationPercentageAdmin : "0",
                }))
              }
              renderValue={(value) => getLabel(expenseCostCenters, value)}
            >
              {expenseCostCenters.map((center) => (
                <MenuItem key={center.value} value={center.value}>
                  {center.label}
                </MenuItem>
              ))}
            </PlaceholderSelect>
          </div>

          {expenseForm.category === "OWNER_REIMBURSEMENT" ? (
            <Alert severity="info">
              Registra aqui la devolucion de dinero al propietario. La salida se
              muestra separada y no se considera un nuevo gasto operativo.
            </Alert>
          ) : null}

          {expenseForm.costCenter === "MIXED" ? (
            <div className="admin-crud__grid">
              <PlaceholderSelect
                label="Metodo de reparto"
                value={expenseForm.allocationSource}
                onChange={(value) =>
                  setExpenseForm((current) => ({
                    ...current,
                    allocationSource: value as "MANUAL" | "RULE",
                  }))
                }
                renderValue={(value) =>
                  value === "RULE" ? "Usar regla vigente" : "Definir manualmente"
                }
              >
                <MenuItem value="RULE">Usar regla vigente</MenuItem>
                <MenuItem value="MANUAL">Definir manualmente</MenuItem>
              </PlaceholderSelect>
              {expenseForm.allocationSource === "RULE" ? (
                <Alert severity="info">
                  Se aplicara la regla activa para la categoria y fecha del egreso.
                  Si no existe, quedara pendiente de clasificacion.
                </Alert>
              ) : (
                <>
              <div className="admin-crud__row admin-crud__row--four">
                <TextField
                  label="Salas %"
                  type="number"
                  value={expenseForm.allocationPercentageRooms}
                  onChange={(e) =>
                    setExpenseForm((s) => ({
                      ...s,
                      allocationPercentageRooms: e.target.value,
                    }))
                  }
                  inputProps={{ min: 0, max: 100, step: 0.01 }}
                  size="small"
                />
                <TextField
                  label="Cafeteria %"
                  type="number"
                  value={expenseForm.allocationPercentageCafeteria}
                  onChange={(e) =>
                    setExpenseForm((s) => ({
                      ...s,
                      allocationPercentageCafeteria: e.target.value,
                    }))
                  }
                  inputProps={{ min: 0, max: 100, step: 0.01 }}
                  size="small"
                />
                <TextField
                  label="Administracion %"
                  type="number"
                  value={expenseForm.allocationPercentageAdmin}
                  onChange={(e) =>
                    setExpenseForm((s) => ({
                      ...s,
                      allocationPercentageAdmin: e.target.value,
                    }))
                  }
                  inputProps={{ min: 0, max: 100, step: 0.01 }}
                  size="small"
                />
                <TextField
                  label="Total reparto"
                  value={`${
                    Number(expenseForm.allocationPercentageRooms || 0) +
                    Number(expenseForm.allocationPercentageCafeteria || 0) +
                    Number(expenseForm.allocationPercentageAdmin || 0)
                  } %`}
                  size="small"
                  InputProps={{ readOnly: true }}
                />
              </div>
              <Typography className="admin-crud__muted">
                El reparto entre salas, cafeteria y administracion debe sumar 100 %.
              </Typography>
                </>
              )}
            </div>
          ) : null}

          <div className="admin-crud__row">
            <TextField
              label="Descripcion"
              value={expenseForm.description}
              onChange={(e) =>
                setExpenseForm((s) => ({
                  ...s,
                  description: e.target.value,
                }))
              }
              size="small"
              fullWidth
            />
            <TextField
              label="Total"
              value={expenseForm.totalAmount}
              onChange={(e) =>
                setExpenseForm((s) => ({ ...s, totalAmount: e.target.value }))
              }
              type="number"
              inputProps={{ min: 0, step: 1, inputMode: "numeric" }}
              size="small"
              fullWidth
            />
          </div>

          <div className="admin-crud__row">
            <PlaceholderSelect
              label="Cuenta Logic"
              value={expenseForm.accountId}
              onChange={(value) =>
                setExpenseForm((s) => ({ ...s, accountId: value }))
              }
              renderValue={(value) => {
                const account = activeAccounts.find(
                  (item) => String(item.id) === value
                );
                return account
                  ? `${account.name} - ${formatMoney(account.balance)}`
                  : value;
              }}
            >
              {activeAccounts.map((account) => (
                <MenuItem key={account.id} value={String(account.id)}>
                  {account.name} - {formatMoney(account.balance)}
                </MenuItem>
              ))}
            </PlaceholderSelect>
            <div />
          </div>

          <FormControlLabel
            control={
              <Checkbox
                checked={expenseForm.splitFunding}
                onChange={(e) =>
                  setExpenseForm((s) => ({
                    ...s,
                    splitFunding: e.target.checked,
                    accountAmount: e.target.checked ? s.accountAmount : "",
                    ownerName: e.target.checked ? s.ownerName : "",
                    ownerAmount: e.target.checked ? s.ownerAmount : "",
                  }))
                }
              />
            }
            label="Dividir pago con propietario"
          />

          {expenseForm.splitFunding ? (
            <>
              <div className="admin-crud__row">
            <TextField
              label="Monto desde Logic"
              value={expenseForm.accountAmount}
              onChange={(e) =>
                setExpenseForm((s) => ({
                  ...s,
                  accountAmount: e.target.value,
                }))
              }
              type="number"
              inputProps={{ min: 0, step: 1, inputMode: "numeric" }}
              size="small"
              fullWidth
            />
            <TextField
              label="Propietario"
              value={expenseForm.ownerName}
              onChange={(e) =>
                setExpenseForm((s) => ({ ...s, ownerName: e.target.value }))
              }
              size="small"
              fullWidth
            />
              </div>

              <div className="admin-crud__row">
              <TextField
              label="Monto fondos personales"
              value={expenseForm.ownerAmount}
              onChange={(e) =>
                setExpenseForm((s) => ({ ...s, ownerAmount: e.target.value }))
              }
              type="number"
              inputProps={{ min: 0, step: 1, inputMode: "numeric" }}
              size="small"
              fullWidth
            />
              <Select
                value={expenseForm.contributionKind}
                onChange={(e) =>
                  setExpenseForm((s) => ({
                    ...s,
                    contributionKind: e.target.value as
                      | "REIMBURSABLE"
                      | "NON_REIMBURSABLE",
                  }))
                }
                size="small"
                fullWidth
              >
                {contributionKindOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
              </div>
            </>
          ) : null}

          <div className="admin-crud__actions">
            <Button
              variant="contained"
              onClick={() => void saveExpense()}
              disabled={status.type === "loading" || !canCreateExpense}
            >
              {editingExpenseId ? "Guardar egreso" : "Registrar egreso"}
            </Button>
            {editingExpenseId ? (
              <Button variant="outlined" onClick={resetExpenseForm}>
                Cancelar
              </Button>
            ) : null}
          </div>
        </div>
      </Paper>

      <Paper className="admin-crud__panel">
        <div className="admin-crud__panel-inner admin-crud__section-header">
          <div>
            <Typography component="h2" className="admin-crud__section-title">
              Egresos
            </Typography>
            <Typography className="admin-crud__section-copy">
              Ultimos egresos registrados y sus fuentes de financiacion.
            </Typography>
          </div>
        </div>
        <div className="admin-crud__table-header admin-crud__table-header--controls">
          <PlaceholderSelect
            label="Filtrar categoria"
            value={expenseFilters.category}
            onChange={(value) =>
              setExpenseFilters((current) => ({ ...current, category: value }))
            }
            renderValue={(value) =>
              value ? getLabel(expenseCategories, value) : "Todas las categorias"
            }
          >
            <MenuItem value="">Todas las categorias</MenuItem>
            {expenseCategories.map((category) => (
              <MenuItem key={category.value} value={category.value}>
                {category.label}
              </MenuItem>
            ))}
          </PlaceholderSelect>
          <PlaceholderSelect
            label="Filtrar centro"
            value={expenseFilters.costCenter}
            onChange={(value) =>
              setExpenseFilters((current) => ({ ...current, costCenter: value }))
            }
            renderValue={(value) =>
              value
                ? getLabel(expenseCostCentersWithUnassigned, value)
                : "Todos los centros"
            }
          >
            <MenuItem value="">Todos los centros</MenuItem>
            {expenseCostCentersWithUnassigned.map((center) => (
              <MenuItem key={center.value} value={center.value}>
                {center.label}
              </MenuItem>
            ))}
          </PlaceholderSelect>
          <Button variant="outlined" onClick={() => void loadOperations()}>
            Aplicar filtros
          </Button>
        </div>
        <TableContainer>
          <Table className="admin-crud__table">
            <TableHead>
              <TableRow>
                <TableCell>Fecha</TableCell>
                <TableCell>Categoria</TableCell>
                <TableCell>Centro de costo</TableCell>
                <TableCell>Descripcion</TableCell>
                <TableCell>Total</TableCell>
                <TableCell>Fuentes</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {expenses.map((expense) => (
                <TableRow key={expense.id} hover>
                  <TableCell>{formatDateTime(expense.occurred_at)}</TableCell>
                  <TableCell>
                    {getLabel(expenseCategories, expense.category)}
                  </TableCell>
                  <TableCell>
                    {getLabel(
                      expenseCostCentersWithUnassigned,
                      expense.cost_center
                    )}
                    {expense.cost_center === "MIXED" ? (
                      <Typography variant="caption" display="block" className="admin-crud__muted">
                        Salas {expense.allocation_percentage_rooms || 0} % / Cafeteria{" "}
                        {expense.allocation_percentage_cafeteria || 0} % / Admin{" "}
                        {expense.allocation_percentage_admin || 0} %
                      </Typography>
                    ) : null}
                    {expense.allocation_source === "RULE" ? (
                      <Chip
                        size="small"
                        color="info"
                        label={`Regla: ${expense.allocation_rule_name_snapshot || "aplicada"}`}
                      />
                    ) : null}
                    {expense.allocation_source === "MANUAL" ? (
                      <Chip size="small" label="Reparto manual" />
                    ) : null}
                    {expense.allocation_source === "PENDING" ? (
                      <Chip size="small" color="warning" label="Pendiente de regla" />
                    ) : null}
                  </TableCell>
                  <TableCell>{expense.description}</TableCell>
                  <TableCell>{formatMoney(expense.total_amount)}</TableCell>
                  <TableCell>
                    {(expense.allocations || [])
                      .map((allocation) =>
                        [
                          allocation.financialAccountName ||
                            allocation.ownerName ||
                            allocation.sourceType,
                          formatMoney(allocation.amount),
                        ].join(" ")
                      )
                      .join(", ")}
                  </TableCell>
                  <TableCell>
                    {statusLabels[expense.status] || expense.status}
                  </TableCell>
                  <TableCell className="admin-crud__cell--nowrap">
                    <Stack direction="row" spacing={1}>
                      <Button
                        variant="outlined"
                        onClick={() => editExpense(expense)}
                        disabled={expense.status !== "ACTIVE"}
                      >
                        Editar
                      </Button>
                      <Button
                        color="error"
                        variant="outlined"
                        onClick={() => void voidExpense(expense.id)}
                        disabled={
                          status.type === "loading" ||
                          expense.status !== "ACTIVE"
                        }
                      >
                        Anular
                      </Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
              {expenses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8}>Sin egresos.</TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Paper className="admin-crud__panel admin-crud__panel--accent">
        <div className="admin-crud__panel-inner admin-crud__grid">
          <div className="admin-crud__section-header">
            <div>
              <Typography component="h2" className="admin-crud__section-title">
                {editingContributionId
                  ? "Editar aporte de propietario"
                  : "Aporte de propietario"}
              </Typography>
              <Typography className="admin-crud__section-copy">
                Registra dinero que entra a una cuenta de Logic sin tratarlo
                como venta.
              </Typography>
            </div>
          </div>

          <div className="admin-crud__row">
            <PlaceholderSelect
              label="Cuenta destino"
              value={contributionForm.financialAccountId}
              onChange={(value) =>
                setContributionForm((s) => ({
                  ...s,
                  financialAccountId: value,
                }))
              }
              renderValue={(value) =>
                activeAccounts.find((item) => String(item.id) === value)
                  ?.name || value
              }
            >
              {activeAccounts.map((account) => (
                <MenuItem key={account.id} value={String(account.id)}>
                  {account.name}
                </MenuItem>
              ))}
            </PlaceholderSelect>
            <TextField
              label="Propietario"
              value={contributionForm.ownerName}
              onChange={(e) =>
                setContributionForm((s) => ({
                  ...s,
                  ownerName: e.target.value,
                }))
              }
              size="small"
              fullWidth
            />
          </div>

          <div className="admin-crud__row">
            <Select
              value={contributionForm.contributionKind}
              onChange={(e) =>
                setContributionForm((s) => ({
                  ...s,
                  contributionKind: e.target.value as
                    | "REIMBURSABLE"
                    | "NON_REIMBURSABLE",
                }))
              }
              size="small"
              fullWidth
            >
              {contributionKindOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
            <TextField
              label="Monto"
              value={contributionForm.amount}
              onChange={(e) =>
                setContributionForm((s) => ({ ...s, amount: e.target.value }))
              }
              type="number"
              inputProps={{ min: 0, step: 1, inputMode: "numeric" }}
              size="small"
              fullWidth
            />
          </div>

          <div className="admin-crud__row">
            <TextField
              label="Descripcion"
              value={contributionForm.description}
              onChange={(e) =>
                setContributionForm((s) => ({
                  ...s,
                  description: e.target.value,
                }))
              }
              size="small"
              fullWidth
            />
            <Button
              variant="contained"
              onClick={() => void saveOwnerContribution()}
              disabled={status.type === "loading" || !canCreateContribution}
            >
              {editingContributionId ? "Guardar aporte" : "Registrar aporte"}
            </Button>
            {editingContributionId ? (
              <Button variant="outlined" onClick={resetContributionForm}>
                Cancelar
              </Button>
            ) : null}
          </div>
        </div>
      </Paper>

      <Paper className="admin-crud__panel">
        <div className="admin-crud__panel-inner admin-crud__section-header">
          <div>
            <Typography component="h2" className="admin-crud__section-title">
              Aportes
            </Typography>
            <Typography className="admin-crud__section-copy">
              Entradas de propietarios separadas de ingresos por clientes.
            </Typography>
          </div>
        </div>
        <TableContainer>
          <Table className="admin-crud__table">
            <TableHead>
              <TableRow>
                <TableCell>Fecha</TableCell>
                <TableCell>Cuenta</TableCell>
                <TableCell>Propietario</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell>Monto</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {contributions.map((contribution) => (
                <TableRow key={contribution.id} hover>
                  <TableCell>
                    {formatDateTime(contribution.occurred_at)}
                  </TableCell>
                  <TableCell>
                    {contribution.financial_account_name || ""}
                  </TableCell>
                  <TableCell>{contribution.owner_name || ""}</TableCell>
                  <TableCell>
                    {getLabel(
                      [...contributionKindOptions],
                      contribution.contribution_kind
                    )}
                  </TableCell>
                  <TableCell>{formatMoney(contribution.amount)}</TableCell>
                  <TableCell>
                    {statusLabels[contribution.status] || contribution.status}
                  </TableCell>
                  <TableCell className="admin-crud__cell--nowrap">
                    <Stack direction="row" spacing={1}>
                      <Button
                        variant="outlined"
                        onClick={() => editContribution(contribution)}
                        disabled={contribution.status !== "ACTIVE"}
                      >
                        Editar
                      </Button>
                      <Button
                        color="error"
                        variant="outlined"
                        onClick={() =>
                          void voidOwnerContribution(contribution.id)
                        }
                        disabled={
                          status.type === "loading" ||
                          contribution.status !== "ACTIVE"
                        }
                      >
                        Anular
                      </Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
              {contributions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7}>Sin aportes.</TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Paper className="admin-crud__panel admin-crud__panel--accent">
        <div className="admin-crud__panel-inner admin-crud__grid">
          <div className="admin-crud__section-header">
            <div>
              <Typography component="h2" className="admin-crud__section-title">
                {editingTransferId
                  ? "Editar transferencia"
                  : "Transferencia entre cuentas"}
              </Typography>
              <Typography className="admin-crud__section-copy">
                Mueve saldo entre cuentas internas creando salida y entrada en
                el ledger.
              </Typography>
            </div>
          </div>

          <div className="admin-crud__row">
            <PlaceholderSelect
              label="Cuenta origen"
              value={transferForm.fromFinancialAccountId}
              onChange={(value) =>
                setTransferForm((s) => ({
                  ...s,
                  fromFinancialAccountId: value,
                }))
              }
              renderValue={(value) => {
                const account = activeAccounts.find(
                  (item) => String(item.id) === value
                );
                return account
                  ? `${account.name} - ${formatMoney(account.balance)}`
                  : value;
              }}
            >
              {activeAccounts.map((account) => (
                <MenuItem key={account.id} value={String(account.id)}>
                  {account.name} - {formatMoney(account.balance)}
                </MenuItem>
              ))}
            </PlaceholderSelect>
            <PlaceholderSelect
              label="Cuenta destino"
              value={transferForm.toFinancialAccountId}
              onChange={(value) =>
                setTransferForm((s) => ({
                  ...s,
                  toFinancialAccountId: value,
                }))
              }
              renderValue={(value) =>
                activeAccounts.find((item) => String(item.id) === value)
                  ?.name || value
              }
            >
              {activeAccounts.map((account) => (
                <MenuItem key={account.id} value={String(account.id)}>
                  {account.name}
                </MenuItem>
              ))}
            </PlaceholderSelect>
          </div>

          <div className="admin-crud__row">
            <TextField
              label="Monto"
              value={transferForm.amount}
              onChange={(e) =>
                setTransferForm((s) => ({ ...s, amount: e.target.value }))
              }
              type="number"
              inputProps={{ min: 0, step: 1, inputMode: "numeric" }}
              size="small"
              fullWidth
            />
            <TextField
              label="Descripcion"
              value={transferForm.description}
              onChange={(e) =>
                setTransferForm((s) => ({
                  ...s,
                  description: e.target.value,
                }))
              }
              size="small"
              fullWidth
            />
          </div>

          <div className="admin-crud__actions">
            <Button
              variant="contained"
              onClick={() => void saveTransfer()}
              disabled={status.type === "loading" || !canCreateTransfer}
            >
              {editingTransferId
                ? "Guardar transferencia"
                : "Registrar transferencia"}
            </Button>
            {editingTransferId ? (
              <Button variant="outlined" onClick={resetTransferForm}>
                Cancelar
              </Button>
            ) : null}
          </div>
        </div>
      </Paper>

      <Paper className="admin-crud__panel">
        <div className="admin-crud__panel-inner admin-crud__section-header">
          <div>
            <Typography component="h2" className="admin-crud__section-title">
              Transferencias
            </Typography>
            <Typography className="admin-crud__section-copy">
              Movimientos internos entre cuentas financieras de Logic.
            </Typography>
          </div>
        </div>
        <TableContainer>
          <Table className="admin-crud__table">
            <TableHead>
              <TableRow>
                <TableCell>Fecha</TableCell>
                <TableCell>Origen</TableCell>
                <TableCell>Destino</TableCell>
                <TableCell>Monto</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {transfers.map((transfer) => (
                <TableRow key={transfer.id} hover>
                  <TableCell>{formatDateTime(transfer.occurred_at)}</TableCell>
                  <TableCell>
                    {transfer.from_financial_account_name || ""}
                  </TableCell>
                  <TableCell>{transfer.to_financial_account_name || ""}</TableCell>
                  <TableCell>{formatMoney(transfer.amount)}</TableCell>
                  <TableCell>
                    {statusLabels[transfer.status] || transfer.status}
                  </TableCell>
                  <TableCell className="admin-crud__cell--nowrap">
                    <Stack direction="row" spacing={1}>
                      <Button
                        variant="outlined"
                        onClick={() => editTransfer(transfer)}
                        disabled={transfer.status !== "ACTIVE"}
                      >
                        Editar
                      </Button>
                      <Button
                        color="error"
                        variant="outlined"
                        onClick={() => void voidTransfer(transfer.id)}
                        disabled={
                          status.type === "loading" ||
                          transfer.status !== "ACTIVE"
                        }
                      >
                        Anular
                      </Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
              {transfers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6}>Sin transferencias.</TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
      </>
      ) : null}

      {mode === "accounts" ? (
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
        <DialogContent sx={{ pt: 2.5 }}>
          <Stack spacing={2}>
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={1.5}
              alignItems={{ xs: "stretch", md: "flex-start" }}
              sx={{ pt: 0.5 }}
            >
              <PlaceholderSelect
                label="Tipo de movimiento"
                value={movementFilters.type}
                onChange={(value) =>
                  setMovementFilters((prev) => ({
                    ...prev,
                    type: value,
                  }))
                }
                renderValue={(value) => getLabel(movementTypeOptions, value)}
              >
                {movementTypeOptions.map((type) => (
                  <MenuItem key={type.value} value={type.value}>
                    {type.label}
                  </MenuItem>
                ))}
              </PlaceholderSelect>
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
              {movementFilters.type ? (
                <Button
                  variant="outlined"
                  onClick={() => {
                    const nextFilters = { ...movementFilters, type: "" };
                    setMovementFilters(nextFilters);
                    if (movementAccount) void loadMovements(movementAccount, nextFilters);
                  }}
                  disabled={!movementAccount || movementStatus === "loading"}
                >
                  Limpiar
                </Button>
              ) : null}
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
                      <TableCell>
                        {getLabel(movementTypeOptions, movement.type)}
                      </TableCell>
                      <TableCell>{formatMoney(movement.amount)}</TableCell>
                      <TableCell>
                        {statusLabels[movement.status] || movement.status}
                      </TableCell>
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
      ) : null}
    </div>
  );
}
