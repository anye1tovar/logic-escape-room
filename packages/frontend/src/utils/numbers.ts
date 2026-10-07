/** Formats user-facing decimal quantities using Colombian conventions. */
export function formatDecimal(value: number | string | null | undefined) {
  const parsed = parseDecimal(value);
  if (!Number.isFinite(parsed)) return "0";
  return new Intl.NumberFormat("es-CO", {
    maximumFractionDigits: 2,
  }).format(parsed);
}

/** Accepts either a comma or a dot while users enter decimal values. */
export function parseDecimal(value: number | string | null | undefined) {
  if (typeof value === "number") return value;
  const text = String(value ?? "").trim();
  const normalized = text.includes(",")
    ? text.replace(/\./g, "").replace(",", ".")
    : text;
  return Number(normalized);
}

/** Keeps decimal text suitable for an input: comma separator and no more than two decimals. */
export function normalizeDecimalInput(value: string) {
  const normalized = value.replace(".", ",").replace(/[^0-9,-]/g, "");
  const [integer = "", ...decimals] = normalized.split(",");
  return decimals.length ? `${integer},${decimals.join("").slice(0, 2)}` : integer;
}
