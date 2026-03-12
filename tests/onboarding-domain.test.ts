import test from "node:test";
import assert from "node:assert/strict";
import {
  buildInitialIncomeTransaction,
  getOnboardingStepDescription,
  getOnboardingStepTitle,
} from "../lib/domain/onboarding";
import { deleteCategoryReferences } from "../lib/domain/categoryTransforms";
import type { PnlStructure, Transaction } from "../lib/domain/types";

function createTransaction(overrides: Partial<Transaction>): Transaction {
  return {
    id: "tx-1",
    type: "expense",
    segment: "gastos_variables",
    amount: 40,
    currency: "USD",
    originalRate: 1,
    amountUSD: 40,
    category: "Mercado",
    description: "",
    date: "2026-03-12T12:00:00.000Z",
    profileId: "profile-1",
    ...overrides,
  };
}

test("onboarding copy adapts to the current step and selected budget category", () => {
  assert.equal(getOnboardingStepTitle(0, null), "Cuales son tus gastos fijos mensuales?");
  assert.equal(
    getOnboardingStepDescription(1, null),
    "Esto nos ayuda a dejar listo el presupuesto de tus gastos mas frecuentes desde el primer dia.",
  );
  assert.match(
    getOnboardingStepTitle(2, "Supermercado"),
    /Supermercado/,
  );
});

test("buildInitialIncomeTransaction normalizes EUR onboarding income into USD", () => {
  const transaction = buildInitialIncomeTransaction({
    date: "2026-03-12T12:00:00.000Z",
    displayCurrency: "EUR",
    eurCross: 1.2,
    incomeCategory: "Sueldo",
    monthlyIncome: 100,
  });

  assert.equal(transaction.amount, 100);
  assert.equal(transaction.currency, "EUR");
  assert.equal(transaction.originalRate, 1.2);
  assert.equal(transaction.amountUSD, 120);
  assert.equal(transaction.description, "Configuracion inicial");
});

test("deleteCategoryReferences removes linked transactions and budget data", () => {
  const pnlStructure: PnlStructure = {
    ingresos: ["Sueldo"],
    gastos_fijos: ["Internet"],
    gastos_variables: ["Mercado", "Transporte"],
    ahorro: ["Fondo"],
  };

  const result = deleteCategoryReferences({
    budgets: { Mercado: 80 },
    category: "Mercado",
    pnlStructure,
    savingsGoals: { Fondo: 200 },
    segment: "gastos_variables",
    transactions: [
      createTransaction({ category: "Mercado", segment: "gastos_variables" }),
      createTransaction({ id: "tx-2", category: "Fondo", segment: "ahorro" }),
    ],
  });

  assert.deepEqual(result.updatedPnl.gastos_variables, ["Transporte"]);
  assert.equal(result.filteredTransactions.length, 1);
  assert.equal(result.filteredTransactions[0].category, "Fondo");
  assert.deepEqual(result.nextBudgets, {});
  assert.deepEqual(result.nextSavingsGoals, { Fondo: 200 });
});
