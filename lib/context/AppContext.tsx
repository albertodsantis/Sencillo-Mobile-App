import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  type Transaction,
  type Rates,
  type PnlStructure,
  type Budgets,
  type SavingsGoals,
  type ViewMode,
  type DashboardData,
  type BudgetSummary,
  type UserProfile,
  type DisplayCurrency,
  type Workspace,
  DEFAULT_PNL,
  DEFAULT_PROFILE,
} from '../domain/types';
import {
  TransactionRepository,
  ProfileRepository,
  RatesRepository,
  PnlRepository,
  BudgetRepository,
  SavingsRepository,
  DisplayCurrencyRepository,
  WorkspaceRepository,
} from '../repositories';
import { ACTIVE_WORKSPACE_STORAGE_KEY } from '../repositories/workspaceScope';
import { fetchRates, computeDashboard, computeBudget, getLocalDateString } from '../domain/finance';
import {
  clearStoredPreviousBudgets,
  getStoredPreviousBudgets,
  loadAppBootstrapSnapshot,
  loadWorkspaceScopedSnapshot,
  type WorkspaceScopedSnapshot,
} from './appBootstrap';

interface AppContextValue {
  transactions: Transaction[];
  rates: Rates;
  pnlStructure: PnlStructure;
  budgets: Budgets;
  viewMode: ViewMode;
  currentMonth: number;
  currentYear: number;
  dashboardData: DashboardData;
  budgetSummary: BudgetSummary;
  ratesTimestamp: number | null;
  isLoading: boolean;
  bootstrapError: string | null;
  isRefreshingRates: boolean;
  historyFilter: string;
  displayCurrency: DisplayCurrency;
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  currentBudgetPeriodLabel: string;
  canCopyPreviousBudgets: boolean;
  needsOnboarding: boolean;

  setViewMode: (mode: ViewMode) => void;
  setCurrentMonth: (month: number) => void;
  setCurrentYear: (year: number) => void;
  setHistoryFilter: (filter: string) => void;
  setDisplayCurrency: (currency: DisplayCurrency) => Promise<void>;
  setActiveWorkspace: (workspaceId: string) => Promise<void>;
  createWorkspace: (name: string) => Promise<void>;
  deleteWorkspace: (workspaceId: string) => Promise<void>;

  addTx: (tx: Omit<Transaction, 'id'>) => Promise<void>;
  addMultipleTx: (txList: Omit<Transaction, 'id'>[]) => Promise<void>;
  updateTx: (tx: Transaction) => Promise<void>;
  deleteTx: (id: string) => Promise<void>;
  deleteAllTx: () => Promise<void>;

  profile: UserProfile;
  savingsGoals: SavingsGoals;
  refreshRates: () => Promise<void>;
  updatePnlStructure: (pnl: PnlStructure) => Promise<void>;
  renameCategory: (
    segment: Transaction['segment'],
    currentCategory: string,
    nextCategory: string,
  ) => Promise<void>;
  deleteCategoryAndRelatedData: (segment: Transaction['segment'], category: string) => Promise<void>;
  updateBudgets: (budgets: Budgets) => Promise<void>;
  updateSavingsGoals: (goals: SavingsGoals) => Promise<void>;
  updateProfile: (profile: UserProfile) => Promise<void>;
  copyPreviousBudgets: () => Promise<void>;
  completeOnboarding: (payload: OperationalOnboardingPayload) => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export interface OperationalOnboardingPayload {
  fixedCategories: string[];
  variableCategories: string[];
  budgetCategory: string | null;
  budgetLimit: number | null;
  monthlyIncome: number | null;
}

const EMPTY_WORKSPACE_SNAPSHOT: WorkspaceScopedSnapshot = {
  transactions: [],
  pnlStructure: DEFAULT_PNL,
  budgets: {},
  savingsGoals: {},
  canCopyPreviousBudgets: false,
};

function hasCustomizedCategories(pnl: PnlStructure): boolean {
  return (Object.keys(DEFAULT_PNL) as (keyof PnlStructure)[]).some((segment) => {
    const defaults = DEFAULT_PNL[segment];
    const current = pnl[segment];

    if (defaults.length !== current.length) return true;
    return defaults.some((item, index) => current[index] !== item);
  });
}

function shouldPromptOperationalOnboarding(
  nextProfile: UserProfile,
  snapshot: WorkspaceScopedSnapshot,
): boolean {
  if (nextProfile.onboardingCompleted) return false;
  if (!nextProfile.email.trim()) return false;
  if (snapshot.transactions.length > 0) return false;
  if (Object.keys(snapshot.budgets).length > 0) return false;
  if (Object.keys(snapshot.savingsGoals).length > 0) return false;
  if (hasCustomizedCategories(snapshot.pnlStructure)) return false;
  return true;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [rates, setRates] = useState<Rates>({ bcv: 0, parallel: 0, eur: 0, eurCross: 0 });
  const [pnlStructure, setPnlStructure] = useState<PnlStructure>(DEFAULT_PNL);
  const [budgets, setBudgets] = useState<Budgets>({});
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoals>({});
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [isLoading, setIsLoading] = useState(true);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [isRefreshingRates, setIsRefreshingRates] = useState(false);
  const [ratesTimestamp, setRatesTimestamp] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [historyFilter, setHistoryFilter] = useState('all');
  const [displayCurrency, setDisplayCurrencyState] = useState<DisplayCurrency>('USD');
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [canCopyPreviousBudgets, setCanCopyPreviousBudgets] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  const now = new Date();
  const [currentMonth, setCurrentMonth] = useState(now.getMonth());
  const [currentYear, setCurrentYear] = useState(now.getFullYear());
  const currentBudgetPeriodLabel = useMemo(() => {
    const formatter = new Intl.DateTimeFormat('es-ES', {
      month: 'long',
      year: 'numeric',
    });
    const formatted = formatter.format(new Date());
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }, []);

  const loadWorkspaceScopedData = useCallback(async (): Promise<WorkspaceScopedSnapshot> => {
    const workspaceId = await AsyncStorage.getItem(ACTIVE_WORKSPACE_STORAGE_KEY);
    const snapshot = await loadWorkspaceScopedSnapshot(workspaceId);

    setTransactions(snapshot.transactions);
    setPnlStructure(snapshot.pnlStructure);
    setBudgets(snapshot.budgets);
    setSavingsGoals(snapshot.savingsGoals);
    setCanCopyPreviousBudgets(snapshot.canCopyPreviousBudgets);
    return snapshot;
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const snapshot = await loadAppBootstrapSnapshot();
        setBootstrapError(null);
        setWorkspaces(snapshot.workspaces);
        setActiveWorkspaceId(snapshot.activeWorkspaceId);

        if (snapshot.rates) setRates(snapshot.rates);
        setProfile(snapshot.profile);
        setDisplayCurrencyState(snapshot.displayCurrency);
        setRatesTimestamp(snapshot.ratesTimestamp);

        const workspaceSnapshot = snapshot.activeWorkspaceId
          ? await loadWorkspaceScopedData()
          : EMPTY_WORKSPACE_SNAPSHOT;
        setNeedsOnboarding(shouldPromptOperationalOnboarding(snapshot.profile, workspaceSnapshot));
      } catch (e) {
        console.error('Error loading data:', e);
        setBootstrapError(
          e instanceof Error ? e.message : 'No se pudo cargar la informacion inicial',
        );
      } finally {
        setIsLoading(false);
      }

      try {
        const age = await RatesRepository.getAge();
        if (age > 3600000 || !(await RatesRepository.get())) {
          const fresh = await fetchRates();
          if (fresh) {
            setRates(fresh);
            await RatesRepository.save(fresh);
            setRatesTimestamp(await RatesRepository.getTimestamp());
          }
        }
      } catch (e) {
        console.warn('Background rates fetch failed:', e);
      }
    })();
  }, [loadWorkspaceScopedData]);

  useEffect(() => {
    if (!activeWorkspaceId) return;

    void loadWorkspaceScopedData()
      .then((workspaceSnapshot) => {
        setBootstrapError(null);
        setNeedsOnboarding(shouldPromptOperationalOnboarding(profile, workspaceSnapshot));
      })
      .catch((error) => {
        setBootstrapError(
          error instanceof Error ? error.message : 'No se pudo cargar el espacio activo',
        );
      });
  }, [activeWorkspaceId, loadWorkspaceScopedData, profile]);

  const setActiveWorkspace = useCallback(async (workspaceId: string) => {
    await AsyncStorage.setItem(ACTIVE_WORKSPACE_STORAGE_KEY, workspaceId);
    setActiveWorkspaceId(workspaceId);
  }, []);

  const createWorkspace = useCallback(async (name: string) => {
    const created = await WorkspaceRepository.create(name);
    setWorkspaces((prev) => [...prev, created]);
    await setActiveWorkspace(created.id);
  }, [setActiveWorkspace]);

  const deleteWorkspace = useCallback(async (workspaceId: string) => {
    await WorkspaceRepository.remove(workspaceId);

    const nextWorkspaces = workspaces.filter((workspace) => workspace.id !== workspaceId);
    setWorkspaces(nextWorkspaces);

    if (activeWorkspaceId !== workspaceId) return;

    const nextActiveWorkspaceId = nextWorkspaces[0]?.id ?? null;
    if (nextActiveWorkspaceId) {
      await setActiveWorkspace(nextActiveWorkspaceId);
      return;
    }

    await AsyncStorage.removeItem(ACTIVE_WORKSPACE_STORAGE_KEY);
    setActiveWorkspaceId(null);
  }, [activeWorkspaceId, setActiveWorkspace, workspaces]);

  const refreshRates = useCallback(async () => {
    setIsRefreshingRates(true);
    try {
      const fresh = await fetchRates();
      if (fresh) {
        setRates(fresh);
        await RatesRepository.save(fresh);
        setRatesTimestamp(await RatesRepository.getTimestamp());
      }
    } finally {
      setIsRefreshingRates(false);
    }
  }, []);

  const addTx = useCallback(async (tx: Omit<Transaction, 'id'>) => {
    const newTx = await TransactionRepository.add(tx);
    setTransactions((prev) => [...prev, newTx]);
  }, []);

  const addMultipleTx = useCallback(async (txList: Omit<Transaction, 'id'>[]) => {
    const created = await TransactionRepository.addMany(txList);
    setTransactions((prev) => [...prev, ...created]);
  }, []);

  const updateTx = useCallback(async (tx: Transaction) => {
    await TransactionRepository.update(tx);
    setTransactions((prev) => prev.map((t) => (t.id === tx.id ? tx : t)));
  }, []);

  const deleteTx = useCallback(async (id: string) => {
    await TransactionRepository.remove(id);
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const deleteAllTx = useCallback(async () => {
    await TransactionRepository.removeAll();
    setTransactions([]);
  }, []);

  const updatePnlStructure = useCallback(async (pnl: PnlStructure) => {
    await PnlRepository.save(pnl);
    setPnlStructure(pnl);
  }, []);

  const renameCategory = useCallback(
    async (
      segment: Transaction['segment'],
      currentCategory: string,
      nextCategory: string,
    ) => {
      const trimmedNextCategory = nextCategory.trim();
      if (!trimmedNextCategory || trimmedNextCategory === currentCategory) {
        return;
      }

      if (pnlStructure[segment].includes(trimmedNextCategory)) {
        throw new Error('Esta categoria ya existe');
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

      let nextBudgets = budgets;
      if (segment === 'gastos_variables' && currentCategory in budgets) {
        nextBudgets = { ...budgets, [trimmedNextCategory]: budgets[currentCategory] };
        delete nextBudgets[currentCategory];
      }

      let nextSavingsGoals = savingsGoals;
      if (segment === 'ahorro' && currentCategory in savingsGoals) {
        nextSavingsGoals = {
          ...savingsGoals,
          [trimmedNextCategory]: savingsGoals[currentCategory],
        };
        delete nextSavingsGoals[currentCategory];
      }

      await Promise.all([
        PnlRepository.save(updatedPnl),
        TransactionRepository.save(renamedTransactions),
        BudgetRepository.save(nextBudgets),
        SavingsRepository.save(nextSavingsGoals),
      ]);

      setPnlStructure(updatedPnl);
      setTransactions(renamedTransactions);
      setBudgets(nextBudgets);
      setSavingsGoals(nextSavingsGoals);
    },
    [budgets, pnlStructure, savingsGoals, transactions],
  );

  const deleteCategoryAndRelatedData = useCallback(
    async (segment: Transaction['segment'], category: string) => {
      const updatedPnl = {
        ...pnlStructure,
        [segment]: pnlStructure[segment].filter((item) => item !== category),
      };

      const filteredTransactions = transactions.filter(
        (tx) => !(tx.segment === segment && tx.category === category),
      );

      let nextBudgets = budgets;
      if (segment === 'gastos_variables' && category in budgets) {
        nextBudgets = { ...budgets };
        delete nextBudgets[category];
      }

      let nextSavingsGoals = savingsGoals;
      if (segment === 'ahorro' && category in savingsGoals) {
        nextSavingsGoals = { ...savingsGoals };
        delete nextSavingsGoals[category];
      }

      await Promise.all([
        PnlRepository.save(updatedPnl),
        TransactionRepository.save(filteredTransactions),
        BudgetRepository.save(nextBudgets),
        SavingsRepository.save(nextSavingsGoals),
      ]);

      setPnlStructure(updatedPnl);
      setTransactions(filteredTransactions);
      setBudgets(nextBudgets);
      setSavingsGoals(nextSavingsGoals);
    },
    [budgets, pnlStructure, savingsGoals, transactions],
  );

  const updateBudgets = useCallback(async (b: Budgets) => {
    await BudgetRepository.save(b);
    setBudgets(b);
    if (Object.keys(b).length > 0) {
      setCanCopyPreviousBudgets(false);
    }
  }, []);

  const copyPreviousBudgets = useCallback(async () => {
    const previousBudgets = await getStoredPreviousBudgets(activeWorkspaceId);
    if (!previousBudgets) return;

    await updateBudgets(previousBudgets);
    await clearStoredPreviousBudgets(activeWorkspaceId);
    setCanCopyPreviousBudgets(false);
  }, [activeWorkspaceId, updateBudgets]);

  const updateSavingsGoals = useCallback(async (g: SavingsGoals) => {
    await SavingsRepository.save(g);
    setSavingsGoals(g);
  }, []);

  const updateProfile = useCallback(async (p: UserProfile) => {
    await ProfileRepository.save(p);
    setProfile(p);
  }, []);

  const completeOnboarding = useCallback(
    async ({
      fixedCategories,
      variableCategories,
      budgetCategory,
      budgetLimit,
      monthlyIncome,
    }: OperationalOnboardingPayload) => {
      const nextPnl: PnlStructure = {
        ...pnlStructure,
        gastos_fijos: fixedCategories.length > 0 ? fixedCategories : pnlStructure.gastos_fijos,
        gastos_variables: variableCategories.length > 0 ? variableCategories : pnlStructure.gastos_variables,
      };

      if (fixedCategories.length > 0 || variableCategories.length > 0) {
        await updatePnlStructure(nextPnl);
      }

      if (budgetCategory && budgetLimit && budgetLimit > 0) {
        const normalizedBudget =
          displayCurrency === 'EUR' && rates.eurCross > 0
            ? budgetLimit * rates.eurCross
            : budgetLimit;

        await updateBudgets({
          ...budgets,
          [budgetCategory]: normalizedBudget,
        });
      }

      if (monthlyIncome && monthlyIncome > 0) {
        const txDate = new Date(`${getLocalDateString()}T12:00:00`).toISOString();
        const incomeCategory = nextPnl.ingresos[0] ?? DEFAULT_PNL.ingresos[0];
        const normalizedIncomeUSD =
          displayCurrency === 'EUR' && rates.eurCross > 0
            ? monthlyIncome * rates.eurCross
            : monthlyIncome;

        await addTx({
          type: 'income',
          segment: 'ingresos',
          amount: monthlyIncome,
          currency: displayCurrency,
          originalRate: displayCurrency === 'EUR' ? (rates.eurCross > 0 ? rates.eurCross : 1) : 1,
          amountUSD: normalizedIncomeUSD,
          category: incomeCategory,
          description: 'Configuración inicial',
          date: txDate,
          profileId: '',
        });
      }

      const nextProfile = {
        ...profile,
        onboardingCompleted: true,
      };

      await updateProfile(nextProfile);
      setNeedsOnboarding(false);
    },
    [
      addTx,
      budgets,
      displayCurrency,
      pnlStructure,
      profile,
      rates.eurCross,
      updateBudgets,
      updatePnlStructure,
      updateProfile,
    ],
  );

  const setDisplayCurrency = useCallback(async (currency: DisplayCurrency) => {
    setDisplayCurrencyState(currency);
    await DisplayCurrencyRepository.save(currency);
  }, []);

  const dashboardData = useMemo(
    () => computeDashboard(transactions, viewMode, currentMonth, currentYear, rates),
    [transactions, viewMode, currentMonth, currentYear, rates],
  );

  const budgetSummary = useMemo(
    () => computeBudget(transactions, budgets, rates),
    [transactions, budgets, rates],
  );

  const value = useMemo(
    () => ({
      transactions,
      rates,
      pnlStructure,
      budgets,
      viewMode,
      currentMonth,
      currentYear,
      dashboardData,
      budgetSummary,
      ratesTimestamp,
      isLoading,
      bootstrapError,
      isRefreshingRates,
      historyFilter,
      displayCurrency,
      profile,
      savingsGoals,
      workspaces,
      activeWorkspaceId,
      currentBudgetPeriodLabel,
      canCopyPreviousBudgets,
      needsOnboarding,
      setViewMode,
      setCurrentMonth,
      setCurrentYear,
      setHistoryFilter,
      setDisplayCurrency,
      setActiveWorkspace,
      createWorkspace,
      deleteWorkspace,
      addTx,
      addMultipleTx,
      updateTx,
      deleteTx,
      deleteAllTx,
      refreshRates,
      updatePnlStructure,
      renameCategory,
      deleteCategoryAndRelatedData,
      updateBudgets,
      updateSavingsGoals,
      updateProfile,
      copyPreviousBudgets,
      completeOnboarding,
    }),
    [
      transactions, rates, pnlStructure, budgets, savingsGoals, viewMode,
      currentMonth, currentYear, dashboardData, budgetSummary, ratesTimestamp,
      isLoading, bootstrapError, isRefreshingRates, historyFilter, displayCurrency, profile,
      workspaces, activeWorkspaceId,
      currentBudgetPeriodLabel, canCopyPreviousBudgets, needsOnboarding,
      addTx, addMultipleTx, updateTx, deleteTx, deleteAllTx,
      refreshRates, updatePnlStructure, updateBudgets, updateSavingsGoals,
      renameCategory, deleteCategoryAndRelatedData,
      updateProfile, setDisplayCurrency, setActiveWorkspace, createWorkspace,
      deleteWorkspace, copyPreviousBudgets, completeOnboarding,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
