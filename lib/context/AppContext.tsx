import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import {
  type Transaction,
  type Rates,
  type PnlStructure,
  type Budgets,
  type ViewMode,
  type DashboardData,
  type BudgetSummary,
  DEFAULT_PNL,
} from '../domain/types';
import {
  loadTransactions,
  saveTransactions,
  loadRates,
  saveRates,
  loadPnlStructure,
  savePnlStructure,
  loadBudgets,
  saveBudgets,
  getRatesAge,
} from '../data/storage';
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

  refreshRates: () => Promise<void>;
  updatePnlStructure: (pnl: PnlStructure) => Promise<void>;
  updateBudgets: (budgets: Budgets) => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [rates, setRates] = useState<Rates>({ bcv: 0, parallel: 0, eur: 0, eurCross: 0 });
  const [pnlStructure, setPnlStructure] = useState<PnlStructure>(DEFAULT_PNL);
  const [budgets, setBudgets] = useState<Budgets>({});
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
        const [txs, savedRates, pnl, bdg] = await Promise.all([
          loadTransactions(),
          loadRates(),
          loadPnlStructure(),
          loadBudgets(),
        ]);
        setTransactions(txs);
        if (savedRates) setRates(savedRates);
        setPnlStructure(pnl);
        setBudgets(bdg);

        const age = await getRatesAge();
        if (age > 3600000 || !savedRates) {
          const fresh = await fetchRates();
          if (fresh) {
            setRates(fresh);
            await saveRates(fresh);
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
        await saveRates(fresh);
      }
    } finally {
      setIsRefreshingRates(false);
    }
  }, []);

  const persistTx = useCallback(async (newTxs: Transaction[]) => {
    setTransactions(newTxs);
    await saveTransactions(newTxs);
  }, []);

  const addTx = useCallback(async (tx: Omit<Transaction, 'id'>) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const newTx: Transaction = { ...tx, id };
    const updated = [...transactions, newTx];
    await persistTx(updated);
  }, [transactions, persistTx]);

  const addMultipleTx = useCallback(async (txList: Omit<Transaction, 'id'>[]) => {
    const newTxs = txList.map((tx) => ({
      ...tx,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    }));
    const updated = [...transactions, ...newTxs];
    await persistTx(updated);
  }, [transactions, persistTx]);

  const updateTx = useCallback(async (tx: Transaction) => {
    const updated = transactions.map((t) => (t.id === tx.id ? tx : t));
    await persistTx(updated);
  }, [transactions, persistTx]);

  const deleteTx = useCallback(async (id: string) => {
    const updated = transactions.filter((t) => t.id !== id);
    await persistTx(updated);
  }, [transactions, persistTx]);

  const deleteAllTx = useCallback(async () => {
    await persistTx([]);
  }, [persistTx]);

  const updatePnlStructure = useCallback(async (pnl: PnlStructure) => {
    setPnlStructure(pnl);
    await savePnlStructure(pnl);
  }, []);

  const updateBudgets = useCallback(async (b: Budgets) => {
    setBudgets(b);
    await saveBudgets(b);
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
    }),
    [
      transactions, rates, pnlStructure, budgets, viewMode,
      currentMonth, currentYear, dashboardData, budgetSummary,
      isLoading, isRefreshingRates, historyFilter,
      addTx, addMultipleTx, updateTx, deleteTx, deleteAllTx,
      refreshRates, updatePnlStructure, updateBudgets,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
