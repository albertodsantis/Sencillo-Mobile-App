import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeBudget,
  computeDashboard,
  convertToUSD,
  generateRecurrences,
  getDisplayCurrencySymbol,
} from '../lib/domain/finance';
import type { Rates, Transaction } from '../lib/domain/types';

const rates: Rates = {
  bcv: 36,
  parallel: 40,
  eur: 39.6,
  eurCross: 1.1,
};

test('convertToUSD converts VES and EUR using current rates', () => {
  assert.equal(convertToUSD(72, 'VES', rates, 'bcv'), 2);
  assert.equal(convertToUSD(1, 'EUR', rates), 1.1);
  assert.equal(convertToUSD(10, 'USD', rates), 10);
});

test('computeDashboard aggregates only the selected month', () => {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  const currentMonthDate = new Date(Date.UTC(year, month, 10)).toISOString();
  const previousMonthDate = new Date(Date.UTC(year, Math.max(0, month - 1), 10)).toISOString();

  const transactions: Transaction[] = [
    {
      id: 'income-1',
      type: 'income',
      segment: 'ingresos',
      amount: 100,
      currency: 'USD',
      originalRate: 1,
      amountUSD: 100,
      category: 'Sueldo',
      description: '',
      date: currentMonthDate,
      profileId: '',
    },
    {
      id: 'expense-1',
      type: 'expense',
      segment: 'gastos_variables',
      amount: 25,
      currency: 'USD',
      originalRate: 1,
      amountUSD: 25,
      category: 'Mercado',
      description: '',
      date: currentMonthDate,
      profileId: '',
    },
    {
      id: 'old-income',
      type: 'income',
      segment: 'ingresos',
      amount: 999,
      currency: 'USD',
      originalRate: 1,
      amountUSD: 999,
      category: 'Viejo',
      description: '',
      date: previousMonthDate,
      profileId: '',
    },
  ];

  const dashboard = computeDashboard(transactions, 'month', month, year, rates);

  assert.equal(dashboard.ingresos, 100);
  assert.equal(dashboard.gastosVariables, 25);
  assert.equal(dashboard.balance, 75);
});

test('computeBudget tracks current month totals and progress', () => {
  const now = new Date();
  const date = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 12)).toISOString();

  const transactions: Transaction[] = [
    {
      id: 'income',
      type: 'income',
      segment: 'ingresos',
      amount: 250,
      currency: 'USD',
      originalRate: 1,
      amountUSD: 250,
      category: 'Sueldo',
      description: '',
      date,
      profileId: '',
    },
    {
      id: 'fixed',
      type: 'expense',
      segment: 'gastos_fijos',
      amount: 70,
      currency: 'USD',
      originalRate: 1,
      amountUSD: 70,
      category: 'Alquiler',
      description: '',
      date,
      profileId: '',
    },
    {
      id: 'variable',
      type: 'expense',
      segment: 'gastos_variables',
      amount: 40,
      currency: 'USD',
      originalRate: 1,
      amountUSD: 40,
      category: 'Mercado',
      description: '',
      date,
      profileId: '',
    },
    {
      id: 'saving',
      type: 'expense',
      segment: 'ahorro',
      amount: 30,
      currency: 'USD',
      originalRate: 1,
      amountUSD: 30,
      category: 'Ahorro General',
      description: '',
      date,
      profileId: '',
    },
  ];

  const budget = computeBudget(transactions, { Mercado: 80 }, rates);

  assert.equal(budget.income, 250);
  assert.equal(budget.fixed, 70);
  assert.equal(budget.savings, 30);
  assert.equal(budget.variableTotal, 40);
  assert.equal(budget.realAvailable, 150);
  assert.equal(budget.totalBudget, 80);
  assert.equal(budget.progress, 50);
});

test('generateRecurrences stops at year end and returns future dates only', () => {
  const currentYear = new Date().getFullYear();
  const dates = generateRecurrences(`${currentYear}-11-01T00:00:00.000Z`, 'monthly');

  assert.ok(dates.length > 0);
  assert.ok(dates.every((value) => value.startsWith(`${currentYear}-12`)));
});

test('getDisplayCurrencySymbol returns the expected symbols', () => {
  assert.equal(getDisplayCurrencySymbol('USD'), '$');
  assert.equal(getDisplayCurrencySymbol('EUR'), '€');
});
