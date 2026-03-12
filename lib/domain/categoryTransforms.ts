import type { Budgets, PnlStructure, SavingsGoals, Transaction } from "./types";

export function renameCategoryReferences({
  budgets,
  currentCategory,
  nextCategory,
  pnlStructure,
  savingsGoals,
  segment,
  transactions,
}: {
  budgets: Budgets;
  currentCategory: string;
  nextCategory: string;
  pnlStructure: PnlStructure;
  savingsGoals: SavingsGoals;
  segment: Transaction["segment"];
  transactions: Transaction[];
}) {
  const trimmedNextCategory = nextCategory.trim();
  if (!trimmedNextCategory || trimmedNextCategory === currentCategory) {
    return {
      updatedPnl: pnlStructure,
      renamedTransactions: transactions,
      nextBudgets: budgets,
      nextSavingsGoals: savingsGoals,
    };
  }

  if (pnlStructure[segment].includes(trimmedNextCategory)) {
    throw new Error("Esta categoria ya existe");
  }

  const updatedPnl = {
    ...pnlStructure,
    [segment]: pnlStructure[segment].map((item) =>
      item === currentCategory ? trimmedNextCategory : item,
    ),
  };

  const renamedTransactions = transactions.map((tx) =>
    tx.segment === segment && tx.category === currentCategory
      ? { ...tx, category: trimmedNextCategory }
      : tx,
  );

  const nextBudgets = { ...budgets };
  if (segment === "gastos_variables" && currentCategory in nextBudgets) {
    nextBudgets[trimmedNextCategory] = nextBudgets[currentCategory];
    delete nextBudgets[currentCategory];
  }

  const nextSavingsGoals = { ...savingsGoals };
  if (segment === "ahorro" && currentCategory in nextSavingsGoals) {
    nextSavingsGoals[trimmedNextCategory] = nextSavingsGoals[currentCategory];
    delete nextSavingsGoals[currentCategory];
  }

  return {
    updatedPnl,
    renamedTransactions,
    nextBudgets,
    nextSavingsGoals,
  };
}
