import test from "node:test";
import assert from "node:assert/strict";
import { computeHomeSegmentStats } from "../lib/domain/homeStats";
import type { Transaction } from "../lib/domain/types";

const transactions: Transaction[] = [
  {
    id: "income-1",
    type: "income",
    segment: "ingresos",
    amount: 100,
    currency: "USD",
    originalRate: 1,
    amountUSD: 100,
    category: "Sueldo",
    description: "",
    date: "2026-03-03T12:00:00.000Z",
    profileId: "profile-1",
  },
  {
    id: "income-2",
    type: "income",
    segment: "ingresos",
    amount: 50,
    currency: "USD",
    originalRate: 1,
    amountUSD: 50,
    category: "Freelance",
    description: "",
    date: "2026-03-08T12:00:00.000Z",
    profileId: "profile-1",
  },
  {
    id: "income-3",
    type: "income",
    segment: "ingresos",
    amount: 75,
    currency: "USD",
    originalRate: 1,
    amountUSD: 75,
    category: "Sueldo",
    description: "",
    date: "2026-01-08T12:00:00.000Z",
    profileId: "profile-1",
  },
  {
    id: "expense-1",
    type: "expense",
    segment: "gastos_variables",
    amount: 40,
    currency: "USD",
    originalRate: 1,
    amountUSD: 40,
    category: "Mercado",
    description: "",
    date: "2026-03-10T12:00:00.000Z",
    profileId: "profile-1",
  },
  {
    id: "expense-2",
    type: "expense",
    segment: "gastos_variables",
    amount: 20,
    currency: "USD",
    originalRate: 1,
    amountUSD: 20,
    category: "Mercado",
    description: "",
    date: "2026-03-11T12:00:00.000Z",
    profileId: "profile-1",
  },
  {
    id: "expense-3",
    type: "expense",
    segment: "gastos_fijos",
    amount: 60,
    currency: "USD",
    originalRate: 1,
    amountUSD: 60,
    category: "Internet",
    description: "",
    date: "2026-02-11T12:00:00.000Z",
    profileId: "profile-1",
  },
];

test("computeHomeSegmentStats aggregates month view by segment and category", () => {
  const stats = computeHomeSegmentStats(transactions, "month", 2, 2026);

  assert.equal(stats.ingresos.count, 2);
  assert.equal(stats.ingresos.categories[0].name, "Sueldo");
  assert.equal(stats.ingresos.categories[0].total, 100);
  assert.equal(stats.ingresos.categories[0].pct, 100 / 150 * 100);

  assert.equal(stats.gastos_variables.count, 2);
  assert.equal(stats.gastos_variables.categories[0].name, "Mercado");
  assert.equal(stats.gastos_variables.categories[0].count, 2);
  assert.equal(stats.gastos_fijos.count, 0);
});

test("computeHomeSegmentStats includes previous months in ytd view", () => {
  const stats = computeHomeSegmentStats(transactions, "ytd", 2, 2026);

  assert.equal(stats.ingresos.count, 3);
  assert.equal(stats.ingresos.categories[0].name, "Sueldo");
  assert.equal(stats.ingresos.categories[0].total, 175);
  assert.equal(stats.gastos_fijos.count, 1);
  assert.equal(stats.gastos_fijos.categories[0].name, "Internet");
});
