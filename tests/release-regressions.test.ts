import test from "node:test";
import assert from "node:assert/strict";
import type { PnlStructure, Rates, Transaction } from "../lib/domain/types";
import {
  formatEditableDisplayValue,
  fromDisplayValueToUSD,
  toEditableDisplayValue,
} from "../lib/domain/displayCurrency";
import {
  convertUsingOriginalRate,
  resolveInitialCustomRate,
  resolveInitialRateType,
  shouldPreserveHistoricalRate,
} from "../lib/domain/transactionEditing";
import { renameCategoryReferences } from "../lib/domain/categoryTransforms";

const rates: Rates = {
  bcv: 36,
  parallel: 40,
  eur: 43.2,
  eurCross: 1.2,
};

function createTransaction(overrides: Partial<Transaction>): Transaction {
  return {
    id: "tx-1",
    type: "expense",
    segment: "gastos_variables",
    amount: 120,
    currency: "VES",
    originalRate: 39.5,
    amountUSD: 120 / 39.5,
    category: "Mercado",
    description: "Compra",
    date: "2026-03-12T12:00:00.000Z",
    profileId: "profile-1",
    ...overrides,
  };
}

test("preserves historical manual VES rate when editing metadata only", () => {
  const editingTx = createTransaction({});
  const initialRateType = resolveInitialRateType(editingTx, rates);
  const initialCustomRate = resolveInitialCustomRate(editingTx, initialRateType);

  assert.equal(initialRateType, "manual");
  assert.equal(
    shouldPreserveHistoricalRate({
      amount: 120,
      currency: "VES",
      customRate: initialCustomRate,
      editingTx,
      rateType: initialRateType,
      rates,
    }),
    true,
  );
  assert.equal(convertUsingOriginalRate(120, "VES", editingTx.originalRate), editingTx.amountUSD);
});

test("preserves historical EUR conversion when amount is unchanged", () => {
  const editingTx = createTransaction({
    currency: "EUR",
    amount: 10,
    originalRate: 1.18,
    amountUSD: 11.8,
  });

  assert.equal(
    shouldPreserveHistoricalRate({
      amount: 10,
      currency: "EUR",
      customRate: "",
      editingTx,
      rateType: "bcv",
      rates,
    }),
    true,
  );
  assert.equal(convertUsingOriginalRate(10, "EUR", editingTx.originalRate), 11.8);
});

test("recomputes VES conversion when the user changes the selected rate", () => {
  const editingTx = createTransaction({});

  assert.equal(
    shouldPreserveHistoricalRate({
      amount: 120,
      currency: "VES",
      customRate: "",
      editingTx,
      rateType: "bcv",
      rates,
    }),
    false,
  );
});

test("converts editable EUR budgets back to USD and formats them correctly", () => {
  assert.equal(toEditableDisplayValue(120, "EUR", rates.eurCross), 100);
  assert.equal(fromDisplayValueToUSD(100, "EUR", rates.eurCross), 120);
  assert.equal(formatEditableDisplayValue(120, "EUR", rates.eurCross), "100");
  assert.equal(formatEditableDisplayValue(125.4, "EUR", rates.eurCross), "104.5");
});

test("renaming a category migrates transactions and linked budget values", () => {
  const pnlStructure: PnlStructure = {
    ingresos: ["Sueldo"],
    gastos_fijos: ["Alquiler"],
    gastos_variables: ["Mercado", "Transporte"],
    ahorro: ["Fondo"],
  };

  const result = renameCategoryReferences({
    budgets: { Mercado: 75 },
    currentCategory: "Mercado",
    nextCategory: "Supermercado",
    pnlStructure,
    savingsGoals: { Fondo: 200 },
    segment: "gastos_variables",
    transactions: [
      createTransaction({ category: "Mercado", segment: "gastos_variables" }),
      createTransaction({ id: "tx-2", category: "Alquiler", segment: "gastos_fijos" }),
    ],
  });

  assert.deepEqual(result.updatedPnl.gastos_variables, ["Supermercado", "Transporte"]);
  assert.equal(result.renamedTransactions[0].category, "Supermercado");
  assert.equal(result.renamedTransactions[1].category, "Alquiler");
  assert.deepEqual(result.nextBudgets, { Supermercado: 75 });
  assert.deepEqual(result.nextSavingsGoals, { Fondo: 200 });
});
