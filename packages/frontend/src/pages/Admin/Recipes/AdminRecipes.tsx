import { useEffect, useMemo, useState } from "react";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import {
  Alert,
  Autocomplete,
  Button,
  Chip,
  Paper,
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
  MenuItem,
  Select,
} from "@mui/material";
import { adminRequest } from "../../../api/adminClient";
import { useSearchParams } from "react-router-dom";
import { formatDecimal, normalizeDecimalInput, parseDecimal } from "../../../utils/numbers";
import "../adminCrud.scss";
import "./AdminRecipes.scss";

type ProductSummary = {
  id: number;
  name: string;
  price: number | string;
  available: boolean | number | string;
  active_recipe_id: number | null;
  active_version: number | null;
  draft_recipe_id: number | null;
  draft_version: number | null;
  latest_version: number;
  unit?: string;
  active?: boolean | number | string;
  track_inventory?: boolean | number | string;
  product_type?: string;
};

type SupplyRow = {
  id: number;
  name: string;
  consumption_unit: string;
  active: boolean | number | string;
};

type RecipeItem = {
  supply_id: number | null;
  product_id?: number | null;
  component_name?: string;
  product_unit?: string;
  quantity: number | string;
  waste_percent: number | string;
  notes: string | null;
};

type PreviewItem = {
  supplyId?: number | null;
  productId?: number | null;
  componentType?: "SUPPLY" | "PRODUCT";
  componentName: string;
  quantity: number;
  wastePercent: number;
  effectiveQuantity: number;
  unit: string;
  unitCost: number | null;
  lineCost: number | null;
  costingMethod: "FEFO" | "WEIGHTED_AVERAGE" | null;
  costIncomplete: boolean;
};

type RecipePreview = {
  directCost: number;
  grossProfit: number;
  grossMargin: number | null;
  suggestedPrice: number;
  costIncomplete: boolean;
  targetMarginPercent: number;
  items: PreviewItem[];
};

type Recipe = {
  id: number;
  product_id: number;
  version: number;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  active: boolean | number | string;
  target_margin_percent: number | string;
  created_at: number | string;
  activated_at: number | string | null;
  items: RecipeItem[];
  preview?: RecipePreview;
};

type RecipeDetails = {
  product: {
    id: number;
    name: string;
    price: number | string;
    available: boolean | number | string;
  };
  activeRecipe: Recipe | null;
  draftRecipe: Recipe | null;
  history: Recipe[];
  nextVersion: number;
};

type ItemForm = {
  componentType: "" | "SUPPLY" | "PRODUCT";
  supplyId: string;
  productId: string;
  quantity: string;
  wastePercent: string;
};

const emptyItem: ItemForm = { componentType: "", supplyId: "", productId: "", quantity: "", wastePercent: "0" };

function normalizeBoolean(value: boolean | number | string) {
  return value === true || value === 1 || value === "1" || value === "true";
}

function formatMoney(value: number | string | null | undefined, decimals = 0) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(Number(value || 0));
}

function formatDate(value: number | string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("es-CO", { dateStyle: "medium" }).format(
    new Date(Number(value)),
  );
}

function recipeItemsToForm(recipe: Recipe | null): ItemForm[] {
  if (!recipe || recipe.items.length === 0) return [];
  return recipe.items.map((item) => ({
    componentType: item.product_id == null ? "SUPPLY" : "PRODUCT",
    supplyId: item.supply_id == null ? "" : String(item.supply_id),
    productId: item.product_id == null ? "" : String(item.product_id),
    quantity: formatDecimal(item.quantity),
    wastePercent: formatDecimal(item.waste_percent || 0),
  }));
}

function serializeEditor(items: ItemForm[], margin: string) {
  return JSON.stringify({ items, margin });
}

export default function AdminRecipes() {
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [supplies, setSupplies] = useState<SupplyRow[]>([]);
  const [selectedProductId, setSelectedProductId] = useState(searchParams.get("productId") || "");
  const [details, setDetails] = useState<RecipeDetails | null>(null);
  const [items, setItems] = useState<ItemForm[]>([]);
  const [targetMargin, setTargetMargin] = useState("60");
  const [baseline, setBaseline] = useState("");
  const [preview, setPreview] = useState<RecipePreview | null>(null);
  const [previewError, setPreviewError] = useState("");
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
  const sortedProducts = useMemo(
    () => [...products].sort((a, b) => a.name.localeCompare(b.name, "es", { sensitivity: "base" })),
    [products],
  );
  const activeSupplies = useMemo(
    () => supplies
      .filter((supply) => normalizeBoolean(supply.active))
      .sort((a, b) => a.name.localeCompare(b.name, "es", { sensitivity: "base" })),
    [supplies],
  );
  const activeProducts = useMemo(
    () => products.filter((product) => normalizeBoolean(product.active ?? true) && normalizeBoolean(product.track_inventory ?? false) && product.product_type === "NORMAL" && String(product.id) !== selectedProductId)
      .sort((a, b) => a.name.localeCompare(b.name, "es", { sensitivity: "base" })),
    [products, selectedProductId],
  );
  const duplicateSupplyIds = useMemo(() => {
    const seen = new Set<string>();
    const duplicates = new Set<string>();
    items.forEach((item) => {
      const key = `${item.componentType}:${item.componentType === "PRODUCT" ? item.productId : item.supplyId}`;
      if (!item.componentType || key.endsWith(":")) return;
      if (seen.has(key)) duplicates.add(key);
      seen.add(key);
    });
    return duplicates;
  }, [items]);
  const hasChanges = baseline !== serializeEditor(items, targetMargin);

  async function loadCatalogs() {
    setStatus({ type: "loading" });
    try {
      const [productData, supplyData] = await Promise.all([
        adminRequest<ProductSummary[]>("/api/admin/recipes"),
        adminRequest<SupplyRow[]>("/api/admin/supplies"),
      ]);
      setProducts(productData || []);
      setSupplies(supplyData || []);
      setStatus({ type: "idle" });
    } catch (err) {
      setStatus({
        type: "error",
        message: err instanceof Error ? err.message : "No se pudo cargar.",
      });
    }
  }

  useEffect(() => {
    void loadCatalogs();
  }, []);

  async function loadProduct(productId: string, showLoading = true) {
    if (!productId) {
      setDetails(null);
      setItems([]);
      setPreview(null);
      return;
    }
    if (showLoading) setStatus({ type: "loading" });
    try {
      const data = await adminRequest<RecipeDetails>(
        `/api/admin/recipes/product/${productId}`,
      );
      setDetails(data);
      const sourceRecipe = data.draftRecipe || data.activeRecipe;
      const nextItems = recipeItemsToForm(sourceRecipe);
      const nextMargin = String(sourceRecipe?.target_margin_percent ?? 60);
      setItems(nextItems);
      setTargetMargin(nextMargin);
      setBaseline(serializeEditor(nextItems, nextMargin));
      setPreview(sourceRecipe?.preview || null);
      setPreviewError("");
      if (showLoading) setStatus({ type: "idle" });
    } catch (err) {
      setStatus({
        type: "error",
        message: err instanceof Error ? err.message : "No se pudo cargar la receta.",
      });
    }
  }

  useEffect(() => {
    void loadProduct(selectedProductId);
  }, [selectedProductId]);

  const rowsValidForPreview =
    Boolean(selectedProductId) &&
    items.length > 0 &&
    duplicateSupplyIds.size === 0 &&
    parseDecimal(targetMargin) > 0 &&
    parseDecimal(targetMargin) < 100 &&
    items.every(
      (item) =>
        Boolean(item.componentType === "PRODUCT" ? item.productId : item.supplyId) &&
        parseDecimal(item.quantity) > 0 &&
        parseDecimal(item.wastePercent || 0) >= 0 &&
        parseDecimal(item.wastePercent || 0) < 100,
    );

  useEffect(() => {
    if (!rowsValidForPreview) {
      setPreview(null);
      return;
    }
    let cancelled = false;
    const timeoutId = window.setTimeout(async () => {
      try {
        const data = await adminRequest<RecipePreview>("/api/admin/recipes/preview", {
          method: "POST",
          body: buildPayload(),
        });
        if (!cancelled) {
          setPreview(data);
          setPreviewError("");
        }
      } catch (err) {
        if (!cancelled) {
          setPreviewError(
            err instanceof Error ? err.message : "No se pudo calcular el costo.",
          );
        }
      }
    }, 350);
    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [items, rowsValidForPreview, selectedProductId, targetMargin]);

  function buildPayload() {
    return {
      productId: Number(selectedProductId),
      targetMarginPercent: parseDecimal(targetMargin),
      items: items.map((item) => ({
        componentType: item.componentType,
        supplyId: item.componentType === "SUPPLY" ? Number(item.supplyId) : undefined,
        productId: item.componentType === "PRODUCT" ? Number(item.productId) : undefined,
        quantity: parseDecimal(item.quantity),
        wastePercent: parseDecimal(item.wastePercent || 0),
      })),
    };
  }

  function updateItem(index: number, patch: Partial<ItemForm>) {
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    );
  }

  async function saveDraft(showMessage = true) {
    setStatus({ type: "loading" });
    try {
      const saved = await adminRequest<Recipe>("/api/admin/recipes", {
        method: "POST",
        body: buildPayload(),
      });
      await Promise.all([loadProduct(selectedProductId, false), loadCatalogsSilently()]);
      if (showMessage) {
        setStatus({ type: "success", message: `Borrador v${saved.version} guardado.` });
      }
      return saved;
    } catch (err) {
      setStatus({
        type: "error",
        message: err instanceof Error ? err.message : "No se pudo guardar.",
      });
      return null;
    }
  }

  async function loadCatalogsSilently() {
    const data = await adminRequest<ProductSummary[]>("/api/admin/recipes");
    setProducts(data || []);
  }

  async function activate() {
    if (!window.confirm("Deseas activar esta version de la receta?")) return;
    const saved = await saveDraft(false);
    if (!saved) return;
    try {
      await adminRequest(`/api/admin/recipes/${saved.id}/activate`, { method: "POST" });
      await Promise.all([loadProduct(selectedProductId, false), loadCatalogsSilently()]);
      setStatus({ type: "success", message: `Receta v${saved.version} activada.` });
    } catch (err) {
      setStatus({
        type: "error",
        message: err instanceof Error ? err.message : "No se pudo activar.",
      });
    }
  }

  async function deleteDraft() {
    if (!details?.draftRecipe) return;
    if (!window.confirm("Deseas eliminar el borrador actual?")) return;
    setStatus({ type: "loading" });
    try {
      await adminRequest(`/api/admin/recipes/${details.draftRecipe.id}`, {
        method: "DELETE",
      });
      await Promise.all([loadProduct(selectedProductId, false), loadCatalogsSilently()]);
      setStatus({ type: "success", message: "Borrador eliminado." });
    } catch (err) {
      setStatus({
        type: "error",
        message: err instanceof Error ? err.message : "No se pudo eliminar.",
      });
    }
  }

  const canSave =
    status.type !== "loading" &&
    Boolean(selectedProductId) &&
    duplicateSupplyIds.size === 0 &&
    parseDecimal(targetMargin) > 0 &&
    parseDecimal(targetMargin) < 100 &&
    items.every(
      (item) =>
        (item.componentType === "PRODUCT" ? item.productId : item.supplyId) &&
        parseDecimal(item.quantity) > 0 &&
        parseDecimal(item.wastePercent || 0) >= 0 &&
        parseDecimal(item.wastePercent || 0) < 100,
    );
  const canActivate =
    canSave &&
    items.length > 0 &&
    Boolean(details?.draftRecipe || hasChanges || !details?.activeRecipe);

  return (
    <div className="admin-crud recipes-admin">
      <div className="admin-crud__header">
        <div>
          <Typography component="h1" className="admin-crud__title">
            Recetas y fichas tecnicas
          </Typography>
          <Typography className="admin-crud__subtitle">
            Define materias primas, costo directo, margen y precio sugerido.
          </Typography>
        </div>
        <Button variant="outlined" onClick={() => void loadCatalogs()}>
          Actualizar
        </Button>
      </div>

      {status.type === "error" ? <Alert severity="error">{status.message}</Alert> : null}
      {status.type === "success" ? (
        <Alert severity="success">{status.message}</Alert>
      ) : null}

      <Paper className="admin-crud__panel admin-crud__panel--accent">
        <div className="admin-crud__panel-inner recipes-admin__selector">
          <Autocomplete
            size="small"
            options={sortedProducts}
            value={sortedProducts.find((product) => String(product.id) === selectedProductId) || null}
            getOptionLabel={(product) => product.name}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            onChange={(_, product) => setSelectedProductId(product ? String(product.id) : "")}
            renderInput={(params) => <TextField {...params} label="Producto vendible" placeholder="Buscar producto" />}
            renderOption={(props, product) => (
              <li {...props} key={product.id}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <span>{product.name}</span>
                  {product.active_recipe_id ? <Chip label={`Activa v${product.active_version}`} size="small" color="success" /> : null}
                  {product.draft_recipe_id ? <Chip label={`Borrador v${product.draft_version}`} size="small" color="warning" /> : null}
                </Stack>
              </li>
            )}
          />
          {details ? (
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Chip
                label={
                  details.activeRecipe
                    ? `Receta activa v${details.activeRecipe.version}`
                    : "Sin receta activa"
                }
                color={details.activeRecipe ? "success" : "default"}
              />
              <Chip
                label={
                  details.draftRecipe
                    ? `Editando borrador v${details.draftRecipe.version}`
                    : `Proxima version v${details.nextVersion}`
                }
                color={details.draftRecipe ? "warning" : "default"}
              />
              {hasChanges ? <Chip label="Cambios sin guardar" color="warning" /> : null}
            </Stack>
          ) : null}
        </div>
      </Paper>

      {details ? (
        <>
          <div className="recipes-admin__metrics">
            <Metric label="Precio actual" value={formatMoney(details.product.price)} />
            <Metric
              label="Costo directo"
              value={preview ? formatMoney(preview.directCost, 2) : "-"}
              warning={preview?.costIncomplete}
            />
            <Metric
              label="Ganancia bruta por unidad"
              value={preview ? formatMoney(preview.grossProfit, 2) : "-"}
              negative={Boolean(preview && preview.grossProfit < 0)}
            />
            <Metric
              label="Margen actual"
              value={preview?.grossMargin == null ? "-" : `${preview.grossMargin}%`}
            />
            <Metric
              label="Precio sugerido"
              value={preview ? formatMoney(preview.suggestedPrice) : "-"}
            />
          </div>

          {previewError ? <Alert severity="error">{previewError}</Alert> : null}
          {preview?.costIncomplete ? (
            <Alert severity="warning">
              El costo esta incompleto porque uno o mas insumos no tienen compras registradas.
            </Alert>
          ) : null}
          {duplicateSupplyIds.size > 0 ? (
            <Alert severity="error">Un insumo no puede repetirse en la misma receta.</Alert>
          ) : null}

          <Paper className="admin-crud__panel">
            <div className="admin-crud__panel-inner admin-crud__grid">
              <div className="admin-crud__section-header">
                <div>
                  <Typography component="h2" className="admin-crud__section-title">
                    Composicion de la receta
                  </Typography>
                  <Typography className="admin-crud__section-copy">
                    Las cantidades se expresan en la unidad de consumo de cada insumo.
                  </Typography>
                </div>
                <TextField
                  label="Margen objetivo (%)"
                  value={targetMargin}
                  onChange={(event) => setTargetMargin(normalizeDecimalInput(event.target.value))}
                  inputProps={{ inputMode: "decimal", min: 0.01, max: 99.99 }}
                  size="small"
                  sx={{ width: 210 }}
                />
              </div>

              <TableContainer>
                <Table size="small" className="admin-crud__table--comfortable">
                  <TableHead>
                    <TableRow>
                      <TableCell>Ingrediente</TableCell>
                      <TableCell>Cantidad</TableCell>
                      <TableCell>Unidad</TableCell>
                      <TableCell>Costo unitario</TableCell>
                      <TableCell>Costo linea</TableCell>
                      <TableCell>
                        <Tooltip title="Porcentaje adicional de insumo considerado por perdida o desperdicio." arrow>
                          <span>Merma</span>
                        </Tooltip>
                      </TableCell>
                      <TableCell>Acciones</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {items.map((item, index) => {
                      const supply = supplyById.get(item.supplyId);
                      const previewItem = preview?.items.find((candidate) => item.componentType === "PRODUCT"
                        ? candidate.productId === Number(item.productId)
                        : candidate.supplyId === Number(item.supplyId));
                      return (
                        <TableRow key={index}>
                          <TableCell sx={{ minWidth: 230 }}>
                            <Stack spacing={1}>
                            <Select size="small" displayEmpty value={item.componentType} renderValue={(value) => (value as string) === "" ? <em>Tipo</em> : value === "SUPPLY" ? "Insumo" : "Producto inventariado"} onChange={(event) => updateItem(index, { componentType: event.target.value as "" | "SUPPLY" | "PRODUCT", supplyId: "", productId: "" })}>
                              <MenuItem value="SUPPLY">Insumo</MenuItem><MenuItem value="PRODUCT">Producto inventariado</MenuItem>
                            </Select>
                            {item.componentType === "SUPPLY" ? <Autocomplete
                              size="small"
                              options={activeSupplies}
                              value={supplyById.get(item.supplyId) || null}
                              getOptionLabel={(option) => option.name}
                              isOptionEqualToValue={(option, value) => option.id === value.id}
                              onChange={(_, option) => updateItem(index, { supplyId: option ? String(option.id) : "" })}
                              renderInput={(params) => <TextField {...params} label="Ingrediente" placeholder="Buscar ingrediente" error={duplicateSupplyIds.has(`SUPPLY:${item.supplyId}`)} />}
                            /> : item.componentType === "PRODUCT" ? <Autocomplete
                              size="small" options={activeProducts} value={activeProducts.find((product) => String(product.id) === item.productId) || null}
                              getOptionLabel={(option) => option.name} isOptionEqualToValue={(option, value) => option.id === value.id}
                              onChange={(_, option) => updateItem(index, { productId: option ? String(option.id) : "" })}
                              renderInput={(params) => <TextField {...params} label="Ingrediente" placeholder="Buscar ingrediente" error={duplicateSupplyIds.has(`PRODUCT:${item.productId}`)} />}
                            /> : null}
                            </Stack>
                          </TableCell>
                          <TableCell sx={{ minWidth: 140 }}>
                            <TextField
                              label="Cantidad"
                              value={item.quantity}
                              onChange={(event) => updateItem(index, { quantity: normalizeDecimalInput(event.target.value) })}
                              inputProps={{ inputMode: "decimal", min: 0, step: "0.01" }}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>{item.componentType === "PRODUCT" ? activeProducts.find((product) => String(product.id) === item.productId)?.unit || "-" : item.componentType === "SUPPLY" ? supply?.consumption_unit || "-" : "-"}</TableCell>
                          <TableCell>
                            {previewItem?.unitCost == null ? (
                              <Chip label="Sin costo" size="small" color="warning" />
                            ) : (
                              <Stack spacing={0.25}>
                                <Typography fontWeight={900}>
                                  {formatMoney(previewItem.unitCost, 2)}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {previewItem.costingMethod === "FEFO" ? "Lote FEFO" : "Costo promedio"}
                                </Typography>
                              </Stack>
                            )}
                          </TableCell>
                          <TableCell>
                            {previewItem?.lineCost == null
                              ? "-"
                              : formatMoney(previewItem.lineCost, 2)}
                          </TableCell>
                          <TableCell sx={{ minWidth: 130 }}>
                            <TextField
                              label="Merma %"
                              value={item.wastePercent}
                              onChange={(event) =>
                                updateItem(index, { wastePercent: normalizeDecimalInput(event.target.value) })
                              }
                              inputProps={{ inputMode: "decimal", min: 0, max: 99.99, step: "0.01" }}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Tooltip title="Quitar insumo" arrow>
                              <Button
                                variant="outlined"
                                color="error"
                                aria-label="Quitar insumo"
                                onClick={() =>
                                  setItems((current) =>
                                    current.filter((_, itemIndex) => itemIndex !== index),
                                  )
                                }
                              >
                                <DeleteOutlineIcon />
                              </Button>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7}>El borrador aun no tiene insumos.</TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </TableContainer>

              <div className="admin-crud__actions recipes-admin__actions">
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={() => setItems((current) => [...current, { ...emptyItem }])}
                >
                  Agregar insumo
                </Button>
                <span className="recipes-admin__actions-spacer" />
                {details.draftRecipe ? (
                  <Button color="error" variant="outlined" onClick={() => void deleteDraft()}>
                    Eliminar borrador
                  </Button>
                ) : null}
                <Button
                  variant="outlined"
                  disabled={!canSave || (!hasChanges && Boolean(details.draftRecipe))}
                  onClick={() => void saveDraft()}
                >
                  Guardar borrador
                </Button>
                <Button
                  variant="contained"
                  disabled={!canActivate}
                  onClick={() => void activate()}
                >
                  Guardar y activar
                </Button>
              </div>
            </div>
          </Paper>

          <Paper className="admin-crud__panel">
            <div className="admin-crud__panel-inner admin-crud__section-header">
              <div>
                <Typography component="h2" className="admin-crud__section-title">
                  Historial de versiones
                </Typography>
                <Typography className="admin-crud__section-copy">
                  Las versiones activadas no se modifican ni se eliminan.
                </Typography>
              </div>
            </div>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Version</TableCell>
                    <TableCell>Estado</TableCell>
                    <TableCell>Insumos</TableCell>
                    <TableCell>Margen objetivo</TableCell>
                    <TableCell>Creada</TableCell>
                    <TableCell>Activada</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {[details.activeRecipe, ...details.history]
                    .filter((recipe): recipe is Recipe => recipe != null)
                    .map((recipe) => (
                      <TableRow key={recipe.id}>
                        <TableCell>v{recipe.version}</TableCell>
                        <TableCell>
                          <Chip
                            label={normalizeBoolean(recipe.active) ? "Activa" : "Archivada"}
                            color={normalizeBoolean(recipe.active) ? "success" : "default"}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{recipe.items.length}</TableCell>
                        <TableCell>{recipe.target_margin_percent}%</TableCell>
                        <TableCell>{formatDate(recipe.created_at)}</TableCell>
                        <TableCell>{formatDate(recipe.activated_at)}</TableCell>
                      </TableRow>
                    ))}
                  {!details.activeRecipe && details.history.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6}>Sin versiones activadas.</TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </>
      ) : (
        <Alert severity="info">Selecciona un producto para crear o consultar su receta.</Alert>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  warning = false,
  negative = false,
}: {
  label: string;
  value: string;
  warning?: boolean;
  negative?: boolean;
}) {
  return (
    <Paper className="recipes-admin__metric">
      <Typography className="recipes-admin__metric-label">{label}</Typography>
      <Typography
        className="recipes-admin__metric-value"
        color={negative ? "error.main" : warning ? "warning.main" : "text.primary"}
      >
        {value}
      </Typography>
    </Paper>
  );
}
