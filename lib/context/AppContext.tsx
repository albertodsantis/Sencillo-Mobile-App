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
import { fetchRates, computeDashboard, computeBudget } from '../domain/finance';

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
  isRefreshingRates: boolean;
  historyFilter: string;
  displayCurrency: DisplayCurrency;
  workspaces: Workspace[];
  activeWorkspaceId: string | null;

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
  updateBudgets: (budgets: Budgets) => Promise<void>;
  updateSavingsGoals: (goals: SavingsGoals) => Promise<void>;
  updateProfile: (profile: UserProfile) => Promise<void>;
  clearAccount: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [rates, setRates] = useState<Rates>({ bcv: 0, parallel: 0, eur: 0, eurCross: 0 });
  const [pnlStructure, setPnlStructure] = useState<PnlStructure>(DEFAULT_PNL);
  const [budgets, setBudgets] = useState<Budgets>({});
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoals>({});
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshingRates, setIsRefreshingRates] = useState(false);
  const [ratesTimestamp, setRatesTimestamp] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [historyFilter, setHistoryFilter] = useState('all');
  const [displayCurrency, setDisplayCurrencyState] = useState<DisplayCurrency>('USD');
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);

  const now = new Date();
  const [currentMonth, setCurrentMonth] = useState(now.getMonth());
  const [currentYear, setCurrentYear] = useState(now.getFullYear());

  const loadWorkspaceScopedData = useCallback(async () => {
    const [txs, pnl, bdg, sg] = await Promise.all([
      TransactionRepository.getAll(),
      PnlRepository.get(),
      BudgetRepository.get(),
      SavingsRepository.get(),
    ]);
    setTransactions(txs);
    setPnlStructure(pnl);
    setBudgets(bdg);
    setSavingsGoals(sg);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await WorkspaceRepository.ensureDefault();
        const workspaceList = await WorkspaceRepository.getAll();
        setWorkspaces(workspaceList);

        let persistedWorkspaceId = await AsyncStorage.getItem(ACTIVE_WORKSPACE_STORAGE_KEY);
        if (!persistedWorkspaceId || !workspaceList.some((w) => w.id === persistedWorkspaceId)) {
          persistedWorkspaceId = workspaceList[0]?.id ?? null;
        }

        if (persistedWorkspaceId) {
          await AsyncStorage.setItem(ACTIVE_WORKSPACE_STORAGE_KEY, persistedWorkspaceId);
          setActiveWorkspaceId(persistedWorkspaceId);
        }

        const [savedRates, prof, displayPref] = await Promise.all([
          RatesRepository.get(),
          ProfileRepository.get(),
          DisplayCurrencyRepository.get(),
        ]);

        if (savedRates) setRates(savedRates);
        setProfile(prof);
        setDisplayCurrencyState(displayPref);
        setRatesTimestamp(await RatesRepository.getTimestamp());

        if (persistedWorkspaceId) {
          await loadWorkspaceScopedData();
        }

        const age = await RatesRepository.getAge();
        if (age > 3600000 || !savedRates) {
          const fresh = await fetchRates();
          if (fresh) {
            setRates(fresh);
            await RatesRepository.save(fresh);
            setRatesTimestamp(await RatesRepository.getTimestamp());
          }
        }
      } catch (e) {
        console.error('Error loading data:', e);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [loadWorkspaceScopedData]);

  useEffect(() => {
    if (!activeWorkspaceId) return;
    loadWorkspaceScopedData();
  }, [activeWorkspaceId, loadWorkspaceScopedData]);

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
    setPnlStructure(pnl);
    await PnlRepository.save(pnl);
  }, []);

  const updateBudgets = useCallback(async (b: Budgets) => {
    setBudgets(b);
    await BudgetRepository.save(b);
  }, []);

  const updateSavingsGoals = useCallback(async (g: SavingsGoals) => {
    setSavingsGoals(g);
    await SavingsRepository.save(g);
  }, []);

  const updateProfile = useCallback(async (p: UserProfile) => {
    setProfile(p);
    await ProfileRepository.save(p);
  }, []);

  const setDisplayCurrency = useCallback(async (currency: DisplayCurrency) => {
    setDisplayCurrencyState(currency);
    await DisplayCurrencyRepository.save(currency);
  }, []);

  const clearAccount = useCallback(async () => {
    await Promise.all([
      TransactionRepository.clear(),
      RatesRepository.clear(),
      PnlRepository.clear(),
      BudgetRepository.clear(),
      SavingsRepository.clear(),
      ProfileRepository.clear(),
      DisplayCurrencyRepository.clear(),
    ]);
    setTransactions([]);
    setRates({ bcv: 0, parallel: 0, eur: 0, eurCross: 0 });
    setRatesTimestamp(null);
    setPnlStructure(DEFAULT_PNL);
    setBudgets({});
    setSavingsGoals({});
    setProfile(DEFAULT_PROFILE);
    setDisplayCurrencyState('USD');
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
      isRefreshingRates,
      historyFilter,
      displayCurrency,
      profile,
      savingsGoals,
      workspaces,
      activeWorkspaceId,
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
      updateBudgets,
      updateSavingsGoals,
      updateProfile,
      clearAccount,
    }),
    [
      transactions, rates, pnlStructure, budgets, savingsGoals, viewMode,
      currentMonth, currentYear, dashboardData, budgetSummary, ratesTimestamp,
      isLoading, isRefreshingRates, historyFilter, displayCurrency, profile,
      workspaces, activeWorkspaceId,
      addTx, addMultipleTx, updateTx, deleteTx, deleteAllTx,
      refreshRates, updatePnlStructure, updateBudgets, updateSavingsGoals,
      updateProfile, setDisplayCurrency, setActiveWorkspace, createWorkspace, clearAccount,
      deleteWorkspace,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
