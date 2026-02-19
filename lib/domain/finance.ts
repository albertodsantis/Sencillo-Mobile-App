import dayjs from 'dayjs';
import {
  type Transaction,
  type Rates,
  type Currency,
  type RateType,
  type Segment,
  type ViewMode,
  type RecurrenceType,
  type DashboardData,
  type BudgetSummary,
  type Budgets,
  SEGMENT_CONFIG,
} from './types';

export function convertToUSD(
  amount: number,
  currency: Currency,
  rates: Rates,
  rateType: RateType = 'bcv',
  customRate?: number,
): number {
  if (currency === 'USD') return amount;

  if (currency === 'EUR') {
    const eurRateInBs = rates.eur || 0;
    const usdRateInBs = rates.bcv || 1;
    if (eurRateInBs === 0 || usdRateInBs === 0) return 0;
    const amountInBs = amount * eurRateInBs;
    return amountInBs / usdRateInBs;
  }

  let rate = rateType === 'bcv'
    ? rates.bcv
    : rateType === 'parallel'
      ? rates.parallel
      : (customRate || 0);
  if (!rate || rate === 0) return 0;
  return amount / rate;
}

export function getFinalRate(
  currency: Currency,
  rates: Rates,
  rateType: RateType,
  customRate?: number,
): number {
  if (currency === 'USD') return 1;
  if (currency === 'VES') {
    return rateType === 'bcv'
      ? rates.bcv
      : rateType === 'parallel'
        ? rates.parallel
        : (customRate || 0);
  }
  if (currency === 'EUR') {
    const eurBs = rates.eur || 0;
    const usdBs = rates.bcv || 1;
    return usdBs > 0 ? eurBs / usdBs : 0;
  }
  return 1;
}

export function generateRecurrences(
  baseDate: string,
  recurrence: RecurrenceType,
): string[] {
  if (recurrence === 'none') return [];

  const dates: string[] = [];
  const currentYear = new Date().getFullYear();
  const limitDate = dayjs(`${currentYear}-12-31`);
  let nextDate = dayjs(baseDate);
  let safetyCounter = 0;

  while (true) {
    safetyCounter++;
    if (safetyCounter > 370) break;

    if (recurrence === 'weekly') nextDate = nextDate.add(7, 'day');
    else if (recurrence === 'monthly') nextDate = nextDate.add(1, 'month');
    else if (recurrence === 'quarterly') nextDate = nextDate.add(3, 'month');
    else if (recurrence === 'quadrimester') nextDate = nextDate.add(4, 'month');
    else if (recurrence === 'biannual') nextDate = nextDate.add(6, 'month');

    if (nextDate.isAfter(limitDate)) break;
    dates.push(nextDate.toISOString());
  }

  return dates;
}

export function computeDashboard(
  transactions: Transaction[],
  viewMode: ViewMode,
  currentMonth: number,
  currentYear: number,
  rates: Rates,
): DashboardData {
  const result: DashboardData = {
    balance: 0,
    ingresos: 0, ingresosVES: 0, ingresosHard: 0,
    gastosFijos: 0, gastosFijosVES: 0, gastosFijosHard: 0,
    gastosVariables: 0, gastosVariablesVES: 0, gastosVariablesHard: 0,
    ahorro: 0, ahorroVES: 0, ahorroHard: 0,
  };

  const filtered = transactions.filter((t) => {
    if (!t.date) return false;
    const d = dayjs(t.date);
    if (!d.isValid()) return false;
    const tYear = d.year();
    const tMonth = d.month();

    if (viewMode === 'month') {
      return tYear === currentYear && tMonth === currentMonth;
    } else if (viewMode === 'ytd') {
      return tYear === currentYear && tMonth <= currentMonth;
    } else {
      return tYear === currentYear;
    }
  });

  filtered.forEach((t) => {
    const usd = t.amountUSD || 0;
    const isHard = t.currency === 'USD' || t.currency === 'EUR';
    const vesNominal = t.currency === 'VES' ? t.amount : 0;
    const hardAmount = isHard ? usd : 0;

    if (t.segment === 'ingresos') {
      result.ingresos += usd;
      result.ingresosVES += vesNominal;
      result.ingresosHard += hardAmount;
    } else if (t.segment === 'gastos_fijos') {
      result.gastosFijos += usd;
      result.gastosFijosVES += vesNominal;
      result.gastosFijosHard += hardAmount;
    } else if (t.segment === 'gastos_variables') {
      result.gastosVariables += usd;
      result.gastosVariablesVES += vesNominal;
      result.gastosVariablesHard += hardAmount;
    } else if (t.segment === 'ahorro') {
      result.ahorro += usd;
      result.ahorroVES += vesNominal;
      result.ahorroHard += hardAmount;
    }

    if (t.type === 'income') {
      result.balance += usd;
    } else {
      result.balance -= usd;
    }
  });

  return result;
}

export function computeBudget(
  transactions: Transaction[],
  budgets: Budgets,
  rates: Rates,
): BudgetSummary {
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const monthTx = transactions.filter((t) => {
    const d = dayjs(t.date);
    return d.isValid() && d.month() === currentMonth && d.year() === currentYear;
  });

  let income = 0;
  let savings = 0;
  let fixed = 0;
  let variableTotal = 0;
  const spending: { [category: string]: number } = {};

  monthTx.forEach((t) => {
    const usd = t.amountUSD || 0;
    if (t.segment === 'ingresos') income += usd;
    else if (t.segment === 'ahorro') savings += usd;
    else if (t.segment === 'gastos_fijos') fixed += usd;
    else if (t.segment === 'gastos_variables') {
      variableTotal += usd;
      spending[t.category] = (spending[t.category] || 0) + usd;
    }
  });

  const realAvailable = (income - savings) - fixed;
  const totalBudget = Object.values(budgets).reduce((sum, v) => sum + (v || 0), 0);
  const progress = totalBudget > 0 ? (variableTotal / totalBudget) * 100 : 0;

  return { variableTotal, income, savings, fixed, realAvailable, totalBudget, progress, spending };
}

export function computePnLReport(
  transactions: Transaction[],
  periods: { id: string; label: string }[],
  granularity: string,
  startDate: string,
  endDate: string,
  rates: Rates,
) {
  const segments: Segment[] = ['ingresos', 'gastos_fijos', 'gastos_variables', 'ahorro'];
  const data: any = { net: {}, available: {}, flexibleAvailable: {} };

  segments.forEach((seg) => {
    data[seg] = { concepts: {}, total: {} };
    periods.forEach((p) => (data[seg].total[p.id] = 0));
  });
  periods.forEach((p) => {
    data.net[p.id] = 0;
    data.available[p.id] = 0;
    data.flexibleAvailable[p.id] = 0;
  });

  transactions.forEach((t) => {
    const tDateStr = t.date.split('T')[0];
    if (tDateStr < startDate || tDateStr > endDate) return;

    let pId = '';
    if (granularity === 'daily') pId = tDateStr;
    else if (granularity === 'monthly') pId = tDateStr.substring(0, 7);
    else if (granularity === 'yearly') pId = tDateStr.substring(0, 4);
    else if (granularity === 'weekly') {
      const tTime = new Date(tDateStr + 'T12:00:00').getTime();
      const period = periods.find((p) => {
        const pDate = new Date(p.id + 'T12:00:00');
        const nextPDate = new Date(pDate);
        nextPDate.setDate(nextPDate.getDate() + 7);
        return tTime >= pDate.getTime() && tTime < nextPDate.getTime();
      });
      if (period) pId = period.id;
    }

    if (pId && data[t.segment]) {
      let amount = t.amountUSD || 0;

      if (t.segment === 'ahorro' && t.currency === 'VES' && rates.bcv > 0) {
        amount = t.amount / rates.bcv;
      }

      const currencyLabel = t.currency === 'VES' ? 'Bs' : t.currency === 'USD' ? 'USD' : 'EUR';
      const conceptKey = `${t.category} (${currencyLabel})`;

      if (!data[t.segment].concepts[conceptKey]) {
        data[t.segment].concepts[conceptKey] = {};
        periods.forEach((p) => (data[t.segment].concepts[conceptKey][p.id] = 0));
      }

      if (data[t.segment].concepts[conceptKey][pId] !== undefined) {
        data[t.segment].concepts[conceptKey][pId] += amount;
      }
      data[t.segment].total[pId] += amount;

      if (SEGMENT_CONFIG[t.segment].type === 'income') data.net[pId] += amount;
      else data.net[pId] -= amount;
    }
  });

  periods.forEach((p) => {
    if (!p.id) return;
    const totalIncome = data.ingresos.total[p.id] || 0;
    const totalSavings = data.ahorro.total[p.id] || 0;
    const totalFixed = data.gastos_fijos.total[p.id] || 0;
    data.available[p.id] = totalIncome - totalSavings;
    data.flexibleAvailable[p.id] = totalIncome - totalSavings - totalFixed;
  });

  return data;
}

export async function fetchRates(): Promise<Rates | null> {
  try {
    const newRates: Rates = { bcv: 0, parallel: 0, eur: 0, eurCross: 0 };
    let bcvRate = 0;

    const [cotizacionesRes, parallelRes, globalRes] = await Promise.all([
      fetch('https://ve.dolarapi.com/v1/cotizaciones').catch(() => null),
      fetch('https://ve.dolarapi.com/v1/dolares/paralelo').catch(() => null),
      fetch('https://open.er-api.com/v6/latest/USD').catch(() => null),
    ]);

    if (cotizacionesRes && cotizacionesRes.ok) {
      const data = await cotizacionesRes.json();
      const usd = data.find((item: any) => item.moneda === 'USD');
      if (usd && usd.promedio) {
        bcvRate = parseFloat(usd.promedio);
        newRates.bcv = bcvRate;
      }
    }

    if (parallelRes && parallelRes.ok) {
      const d = await parallelRes.json();
      if (d.promedio) newRates.parallel = parseFloat(d.promedio);
    }

    if (bcvRate > 0 && globalRes && globalRes.ok) {
      const globalData = await globalRes.json();
      const usdToEur = globalData.rates?.EUR;
      if (usdToEur) {
        const eurToUsd = 1 / usdToEur;
        const bcvEur = bcvRate * eurToUsd;
        newRates.eur = parseFloat(bcvEur.toFixed(4));
        newRates.eurCross = parseFloat(eurToUsd.toFixed(4));
      }
    } else if (bcvRate > 0 && cotizacionesRes && cotizacionesRes.ok) {
      const data = await cotizacionesRes.json();
      const eurItem = data.find((item: any) => item.moneda === 'EUR');
      if (eurItem && eurItem.promedio) newRates.eur = parseFloat(eurItem.promedio);
    }

    return newRates;
  } catch (e) {
    console.error('Error fetching rates:', e);
    return null;
  }
}

export function getLocalDateString(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function formatCurrency(value: number, decimals: number = 2): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatCompact(value: number): string {
  if (Math.abs(value) >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return value.toFixed(0);
}
