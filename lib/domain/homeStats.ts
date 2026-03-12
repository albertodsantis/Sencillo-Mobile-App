import type { Segment, Transaction, ViewMode } from "./types";

export interface CategoryStat {
  name: string;
  total: number;
  count: number;
  pct: number;
}

export interface SegmentCategoryStats {
  count: number;
  categories: CategoryStat[];
}

export type HomeSegmentStats = Record<Segment, SegmentCategoryStats>;

function isTransactionInPeriod(
  transaction: Transaction,
  viewMode: ViewMode,
  currentMonth: number,
  currentYear: number,
): boolean {
  const date = new Date(transaction.date);
  if (viewMode === "month") {
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
  }

  if (viewMode === "ytd") {
    return date.getFullYear() === currentYear && date.getMonth() <= currentMonth;
  }

  return date.getFullYear() === currentYear;
}

export function computeHomeSegmentStats(
  transactions: Transaction[],
  viewMode: ViewMode,
  currentMonth: number,
  currentYear: number,
): HomeSegmentStats {
  const categoryMaps: Record<Segment, Record<string, { total: number; count: number }>> = {
    ingresos: {},
    gastos_fijos: {},
    gastos_variables: {},
    ahorro: {},
  };

  const segmentCounts: Record<Segment, number> = {
    ingresos: 0,
    gastos_fijos: 0,
    gastos_variables: 0,
    ahorro: 0,
  };

  const segmentTotals: Record<Segment, number> = {
    ingresos: 0,
    gastos_fijos: 0,
    gastos_variables: 0,
    ahorro: 0,
  };

  transactions.forEach((transaction) => {
    if (!isTransactionInPeriod(transaction, viewMode, currentMonth, currentYear)) {
      return;
    }

    const segment = transaction.segment;
    segmentCounts[segment] += 1;
    segmentTotals[segment] += transaction.amountUSD;

    if (!categoryMaps[segment][transaction.category]) {
      categoryMaps[segment][transaction.category] = { total: 0, count: 0 };
    }

    categoryMaps[segment][transaction.category].total += transaction.amountUSD;
    categoryMaps[segment][transaction.category].count += 1;
  });

  return {
    ingresos: buildSegmentStats(categoryMaps.ingresos, segmentCounts.ingresos, segmentTotals.ingresos),
    gastos_fijos: buildSegmentStats(
      categoryMaps.gastos_fijos,
      segmentCounts.gastos_fijos,
      segmentTotals.gastos_fijos,
    ),
    gastos_variables: buildSegmentStats(
      categoryMaps.gastos_variables,
      segmentCounts.gastos_variables,
      segmentTotals.gastos_variables,
    ),
    ahorro: buildSegmentStats(categoryMaps.ahorro, segmentCounts.ahorro, segmentTotals.ahorro),
  };
}

function buildSegmentStats(
  categoryMap: Record<string, { total: number; count: number }>,
  count: number,
  totalUSD: number,
): SegmentCategoryStats {
  const categories = Object.entries(categoryMap)
    .sort((left, right) => right[1].total - left[1].total)
    .map(([name, values]) => ({
      name,
      total: values.total,
      count: values.count,
      pct: totalUSD > 0 ? (values.total / totalUSD) * 100 : 0,
    }));

  return { count, categories };
}
