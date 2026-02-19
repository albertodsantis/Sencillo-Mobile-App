import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
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
} from '../repositories';
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
  isLoading: boolean;
  isRefreshingRates: boolean;
  historyFilter: string;

  setViewMode: (mode: ViewMode) => void;
  setCurrentMonth: (month: number) => void;
  setCurrentYear: (year: number) => void;
  setHistoryFilter: (filter: string) => void;

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
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [historyFilter, setHistoryFilter] = useState('all');

  const now = new Date();
  const [currentMonth, setCurrentMonth] = useState(now.getMonth());
  const [currentYear, setCurrentYear] = useState(now.getFullYear());

  useEffect(() => {
    (async () => {
      try {
        const [txs, savedRates, pnl, bdg, sg, prof] = await Promise.all([
          TransactionRepository.getAll(),
          RatesRepository.get(),
          PnlRepository.get(),
          BudgetRepository.get(),
          SavingsRepository.get(),
          ProfileRepository.get(),
        ]);
        setTransactions(txs);
        if (savedRates) setRates(savedRates);
        setPnlStructure(pnl);
        setBudgets(bdg);
        setSavingsGoals(sg);
        setProfile(prof);

        const age = await RatesRepository.getAge();
        if (age > 3600000 || !savedRates) {
          const fresh = await fetchRates();
          if (fresh) {
            setRates(fresh);
            await RatesRepository.save(fresh);
          }
        }
      } catch (e) {
        console.error('Error loading data:', e);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const refreshRates = useCallback(async () => {
    setIsRefreshingRates(true);
    try {
      const fresh = await fetchRates();
      if (fresh) {
        setRates(fresh);
        await RatesRepository.save(fresh);
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

  const clearAccount = useCallback(async () => {
    await Promise.all([
      TransactionRepository.clear(),
      RatesRepository.clear(),
      PnlRepository.clear(),
      BudgetRepository.clear(),
      SavingsRepository.clear(),
      ProfileRepository.clear(),
    ]);
    setTransactions([]);
    setRates({ bcv: 0, parallel: 0, eur: 0, eurCross: 0 });
    setPnlStructure(DEFAULT_PNL);
    setBudgets({});
    setSavingsGoals({});
    setProfile(DEFAULT_PROFILE);
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
      isLoading,
      isRefreshingRates,
      historyFilter,
      profile,
      savingsGoals,
      setViewMode,
      setCurrentMonth,
      setCurrentYear,
      setHistoryFilter,
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
      currentMonth, currentYear, dashboardData, budgetSummary,
      isLoading, isRefreshingRates, historyFilter, profile,
      addTx, addMultipleTx, updateTx, deleteTx, deleteAllTx,
      refreshRates, updatePnlStructure, updateBudgets, updateSavingsGoals,
      updateProfile, clearAccount,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
