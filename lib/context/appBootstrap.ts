import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  BudgetRepository,
  DisplayCurrencyRepository,
  PnlRepository,
  ProfileRepository,
  RatesRepository,
  SavingsRepository,
  TransactionRepository,
  WorkspaceRepository,
} from '../repositories';
import { ACTIVE_WORKSPACE_STORAGE_KEY } from '../repositories/workspaceScope';
import {
  type Budgets,
  type DisplayCurrency,
  type PnlStructure,
  type Rates,
  type SavingsGoals,
  type Transaction,
  type UserProfile,
  type Workspace,
} from '../domain/types';

const BUDGET_PERIOD_STORAGE_PREFIX = '@sencillo/budgets-period/';
const PREVIOUS_BUDGETS_STORAGE_PREFIX = '@sencillo/budgets-previous/';

function getCurrentBudgetPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export type WorkspaceScopedSnapshot = {
  budgets: Budgets;
  canCopyPreviousBudgets: boolean;
  pnlStructure: PnlStructure;
  savingsGoals: SavingsGoals;
  transactions: Transaction[];
};

export type AppBootstrapSnapshot = {
  activeWorkspaceId: string | null;
  displayCurrency: DisplayCurrency;
  profile: UserProfile;
  rates: Rates | null;
  ratesTimestamp: number | null;
  workspaces: Workspace[];
};

export async function loadWorkspaceScopedSnapshot(
  workspaceId: string | null,
): Promise<WorkspaceScopedSnapshot> {
  const [transactions, pnlStructure, budgets, savingsGoals] = await Promise.all([
    TransactionRepository.getAll(),
    PnlRepository.get(),
    BudgetRepository.get(),
    SavingsRepository.get(),
  ]);

  const periodKey = workspaceId ? `${BUDGET_PERIOD_STORAGE_PREFIX}${workspaceId}` : null;
  const previousBudgetsKey = workspaceId ? `${PREVIOUS_BUDGETS_STORAGE_PREFIX}${workspaceId}` : null;
  const currentPeriod = getCurrentBudgetPeriod();
  const savedPeriod = periodKey ? await AsyncStorage.getItem(periodKey) : null;

  let resolvedBudgets = budgets;
  if (workspaceId && savedPeriod !== currentPeriod) {
    const hasBudgets = Object.keys(budgets).length > 0;

    if (previousBudgetsKey) {
      if (hasBudgets) {
        await AsyncStorage.setItem(previousBudgetsKey, JSON.stringify(budgets));
      } else {
        await AsyncStorage.removeItem(previousBudgetsKey);
      }
    }

    if (hasBudgets) {
      await BudgetRepository.clear();
    }

    resolvedBudgets = {};
    if (periodKey) {
      await AsyncStorage.setItem(periodKey, currentPeriod);
    }
  } else if (periodKey && !savedPeriod) {
    await AsyncStorage.setItem(periodKey, currentPeriod);
  }

  let canCopyPreviousBudgets = false;
  if (previousBudgetsKey) {
    const rawPreviousBudgets = await AsyncStorage.getItem(previousBudgetsKey);
    if (rawPreviousBudgets) {
      try {
        const parsed = JSON.parse(rawPreviousBudgets) as Budgets;
        canCopyPreviousBudgets =
          Object.keys(parsed).length > 0 && Object.keys(resolvedBudgets).length === 0;
      } catch {
        canCopyPreviousBudgets = false;
      }
    }
  }

  return {
    transactions,
    pnlStructure,
    budgets: resolvedBudgets,
    savingsGoals,
    canCopyPreviousBudgets,
  };
}

export async function loadAppBootstrapSnapshot(): Promise<AppBootstrapSnapshot> {
  await WorkspaceRepository.ensureDefault();
  const workspaces = await WorkspaceRepository.getAll();

  let activeWorkspaceId = await AsyncStorage.getItem(ACTIVE_WORKSPACE_STORAGE_KEY);
  if (!activeWorkspaceId || !workspaces.some((workspace) => workspace.id === activeWorkspaceId)) {
    activeWorkspaceId = workspaces[0]?.id ?? null;
  }

  if (activeWorkspaceId) {
    await AsyncStorage.setItem(ACTIVE_WORKSPACE_STORAGE_KEY, activeWorkspaceId);
  }

  const [rates, profile, displayCurrency, ratesTimestamp] = await Promise.all([
    RatesRepository.get(),
    ProfileRepository.get(),
    DisplayCurrencyRepository.get(),
    RatesRepository.getTimestamp(),
  ]);

  return {
    workspaces,
    activeWorkspaceId,
    rates,
    profile,
    displayCurrency,
    ratesTimestamp,
  };
}

export async function clearWorkspaceBudgetArtifacts(workspaceId: string | null): Promise<void> {
  if (!workspaceId) return;

  await AsyncStorage.multiRemove([
    `${BUDGET_PERIOD_STORAGE_PREFIX}${workspaceId}`,
    `${PREVIOUS_BUDGETS_STORAGE_PREFIX}${workspaceId}`,
  ]);
}

export async function getStoredPreviousBudgets(workspaceId: string | null): Promise<Budgets | null> {
  if (!workspaceId) return null;

  const rawPreviousBudgets = await AsyncStorage.getItem(
    `${PREVIOUS_BUDGETS_STORAGE_PREFIX}${workspaceId}`,
  );
  if (!rawPreviousBudgets) return null;

  try {
    const parsed = JSON.parse(rawPreviousBudgets) as Budgets;
    return Object.keys(parsed).length > 0 ? parsed : null;
  } catch {
    return null;
  }
}

export async function clearStoredPreviousBudgets(workspaceId: string | null): Promise<void> {
  if (!workspaceId) return;
  await AsyncStorage.removeItem(`${PREVIOUS_BUDGETS_STORAGE_PREFIX}${workspaceId}`);
}
