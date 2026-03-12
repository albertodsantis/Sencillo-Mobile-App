import test from "node:test";
import assert from "node:assert/strict";
import {
  buildTransactionDraft,
  expandTransactionDrafts,
} from "../lib/domain/transactionDrafts";

test("buildTransactionDraft creates a persistable transaction draft", () => {
  const draft = buildTransactionDraft({
    type: "expense",
    segment: "gastos_variables",
    amount: 25,
    currency: "USD",
    originalRate: 1,
    amountUSD: 25,
    category: "Mercado",
    description: "Compra",
    date: "2026-03-12T12:00:00.000Z",
  });

  assert.deepEqual(draft, {
    type: "expense",
    segment: "gastos_variables",
    amount: 25,
    currency: "USD",
    originalRate: 1,
    amountUSD: 25,
    category: "Mercado",
    description: "Compra",
    date: "2026-03-12T12:00:00.000Z",
    profileId: "",
  });
});

test("expandTransactionDrafts duplicates income entries as savings when requested", () => {
  const currentYear = new Date().getFullYear();
  const draft = buildTransactionDraft({
    type: "income",
    segment: "ingresos",
    amount: 100,
    currency: "USD",
    originalRate: 1,
    amountUSD: 100,
    category: "Sueldo",
    description: "",
    date: `${currentYear}-11-10T12:00:00.000Z`,
  });

  const drafts = expandTransactionDrafts({
    draft,
    recurrence: "monthly",
    registerAsSavings: true,
    savingsCategory: "Ahorro General",
  });

  assert.equal(drafts.length, 4);
  assert.equal(drafts[0].segment, "ingresos");
  assert.equal(drafts[1].segment, "ahorro");
  assert.equal(drafts[1].type, "expense");
  assert.equal(drafts[1].category, "Ahorro General");
  assert.equal(drafts[2].date.startsWith(`${currentYear}-12`), true);
});

test("expandTransactionDrafts returns a single draft when there is no recurrence", () => {
  const draft = buildTransactionDraft({
    type: "expense",
    segment: "gastos_fijos",
    amount: 60,
    currency: "USD",
    originalRate: 1,
    amountUSD: 60,
    category: "Internet",
    description: "",
    date: "2026-03-12T12:00:00.000Z",
  });

  const drafts = expandTransactionDrafts({
    draft,
    recurrence: "none",
    registerAsSavings: false,
    savingsCategory: "Ahorro General",
  });

  assert.equal(drafts.length, 1);
  assert.deepEqual(drafts[0], draft);
});
