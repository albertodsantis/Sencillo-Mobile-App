import type { Currency, RateType, Rates, Transaction } from "./types";

export function areRatesEquivalent(left: number, right: number): boolean {
  return Math.abs(left - right) < 0.0001;
}

export function resolveInitialRateType(
  editingTx: Transaction | null,
  rates: Rates,
): RateType {
  if (!editingTx || editingTx.currency !== "VES") return "bcv";
  if (areRatesEquivalent(editingTx.originalRate, rates.bcv)) return "bcv";
  if (areRatesEquivalent(editingTx.originalRate, rates.parallel)) return "parallel";
  return "manual";
}

export function resolveInitialCustomRate(
  editingTx: Transaction | null,
  initialRateType: RateType,
): string {
  if (!editingTx || editingTx.currency !== "VES" || initialRateType !== "manual") {
    return "";
  }

  return editingTx.originalRate > 0 ? editingTx.originalRate.toString() : "";
}

export function convertUsingOriginalRate(
  amount: number,
  currency: Currency,
  originalRate: number,
): number {
  if (currency === "USD") return amount;
  if (currency === "EUR") return amount * originalRate;
  if (!originalRate || originalRate <= 0) return 0;
  return amount / originalRate;
}

export function shouldPreserveHistoricalRate({
  amount,
  currency,
  customRate,
  editingTx,
  rateType,
  rates,
}: {
  amount: number;
  currency: Currency;
  customRate: string;
  editingTx: Transaction | null;
  rateType: RateType;
  rates: Rates;
}): boolean {
  if (!editingTx || currency !== editingTx.currency) return false;
  if (!areRatesEquivalent(amount, editingTx.amount)) return false;
  if (currency === "USD" || currency === "EUR") return true;
  if (currency !== "VES") return false;

  const initialRateType = resolveInitialRateType(editingTx, rates);
  if (rateType !== initialRateType) return false;
  if (rateType !== "manual") return true;

  const initialCustomRate = resolveInitialCustomRate(editingTx, initialRateType);
  const parsedCustomRate = parseFloat(customRate);
  const parsedInitialCustomRate = parseFloat(initialCustomRate);
  if (!Number.isFinite(parsedCustomRate) || !Number.isFinite(parsedInitialCustomRate)) {
    return false;
  }

  return areRatesEquivalent(parsedCustomRate, parsedInitialCustomRate);
}
