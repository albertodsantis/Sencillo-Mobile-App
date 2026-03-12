import type { DisplayCurrency } from "./types";

export function toEditableDisplayValue(
  valueUSD: number,
  displayCurrency: DisplayCurrency,
  eurCross: number,
): number {
  if (displayCurrency !== "EUR" || eurCross <= 0) return valueUSD;
  return valueUSD / eurCross;
}

export function fromDisplayValueToUSD(
  value: number,
  displayCurrency: DisplayCurrency,
  eurCross: number,
): number {
  if (displayCurrency !== "EUR") return value;
  if (eurCross <= 0) {
    throw new Error("No hay una tasa EUR/USD disponible para guardar este valor.");
  }

  return value * eurCross;
}

export function formatEditableDisplayValue(
  valueUSD: number,
  displayCurrency: DisplayCurrency,
  eurCross: number,
): string {
  const normalizedValue = toEditableDisplayValue(valueUSD, displayCurrency, eurCross);
  if (!Number.isFinite(normalizedValue)) return "";

  return normalizedValue
    .toFixed(2)
    .replace(/\.00$/, "")
    .replace(/(\.\d*[1-9])0+$/, "$1");
}
