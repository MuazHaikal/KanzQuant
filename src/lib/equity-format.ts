/** Presentation only: feature values are already expressed in percentage points. */
export const finiteEquityValue = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
export function equityNumber(value: unknown, places = 2) {
  if (!finiteEquityValue(value)) return "Unavailable";
  const rounded = Number(value.toFixed(places)) || 0;
  return rounded.toLocaleString("en-US", {minimumFractionDigits: places, maximumFractionDigits: places});
}
export function equityPercent(value: unknown, signed = true) {
  if (!finiteEquityValue(value)) return "Unavailable";
  const rounded = Number(value.toFixed(1));
  return `${signed && rounded > 0 ? "+" : ""}${equityNumber(rounded, 1)}%`;
}
export function equityMetric(key: string, value: unknown) {
  if (key === "price" || key === "z20") return equityNumber(value);
  if (key.endsWith("percentile")) return finiteEquityValue(value) ? `P${equityNumber(value, 0)}` : "Unavailable";
  return equityPercent(value, !["vol20", "gross_margin", "operating_margin"].includes(key));
}
export function equityMoney(value: unknown, currency = "USD") {
  if (!finiteEquityValue(value)) return "Unavailable";
  const prefix = currency === "USD" ? "$" : `${currency} `;
  const magnitude = Math.abs(value);
  const [scale, suffix] = magnitude >= 1e9 ? [1e9, "B"] : magnitude >= 1e6 ? [1e6, "M"] : [1, ""];
  return `${value < 0 ? "−" : ""}${prefix}${equityNumber(magnitude / Number(scale), suffix ? 1 : 2)}${suffix}`;
}
