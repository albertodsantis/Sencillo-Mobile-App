import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import {
  type Transaction,
  type Rates,
  type PnlStructure,
  type Budgets,
  type SavingsGoals,
  type UserProfile,
  DEFAULT_PNL,
  DEFAULT_PROFILE,
} from '../domain/types';

const KEYS = {
  TRANSACTIONS: '@sencillo/transactions',
  RATES: '@sencillo/rates',
  PNL: '@sencillo/pnl',
  BUDGETS: '@sencillo/budgets',
  SAVINGS_GOALS: '@sencillo/savings_goals',
  RATES_TIMESTAMP: '@sencillo/rates_timestamp',
  PROFILE: '@sencillo/profile',
};

export async function loadTransactions(): Promise<Transaction[]> {
  try {
    const data = await AsyncStorage.getItem(KEYS.TRANSACTIONS);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export async function saveTransactions(transactions: Transaction[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(transactions));
}

export async function addTransaction(tx: Omit<Transaction, 'id'>): Promise<Transaction> {
  const transactions = await loadTransactions();
  const newTx: Transaction = { ...tx, id: Crypto.randomUUID() };
  transactions.push(newTx);
  await saveTransactions(transactions);
  return newTx;
}

export async function addTransactions(txList: Omit<Transaction, 'id'>[]): Promise<Transaction[]> {
  const transactions = await loadTransactions();
  const newTxs = txList.map((tx) => ({ ...tx, id: Crypto.randomUUID() }));
  transactions.push(...newTxs);
  await saveTransactions(transactions);
  return newTxs;
}

export async function updateTransaction(tx: Transaction): Promise<void> {
  const transactions = await loadTransactions();
  const idx = transactions.findIndex((t) => t.id === tx.id);
  if (idx >= 0) {
    transactions[idx] = tx;
    await saveTransactions(transactions);
  }
}

export async function deleteTransaction(id: string): Promise<void> {
  const transactions = await loadTransactions();
  const filtered = transactions.filter((t) => t.id !== id);
  await saveTransactions(filtered);
}

export async function deleteAllTransactions(): Promise<void> {
  await saveTransactions([]);
}

export async function loadRates(): Promise<Rates | null> {
  try {
    const data = await AsyncStorage.getItem(KEYS.RATES);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export async function saveRates(rates: Rates): Promise<void> {
  await AsyncStorage.setItem(KEYS.RATES, JSON.stringify(rates));
  await AsyncStorage.setItem(KEYS.RATES_TIMESTAMP, Date.now().toString());
}

export async function getRatesAge(): Promise<number> {
  try {
    const ts = await AsyncStorage.getItem(KEYS.RATES_TIMESTAMP);
    if (!ts) return Infinity;
    return Date.now() - parseInt(ts, 10);
  } catch {
    return Infinity;
  }
}

export async function loadPnlStructure(): Promise<PnlStructure> {
  try {
    const data = await AsyncStorage.getItem(KEYS.PNL);
    return data ? JSON.parse(data) : DEFAULT_PNL;
  } catch {
    return DEFAULT_PNL;
  }
}

export async function savePnlStructure(pnl: PnlStructure): Promise<void> {
  await AsyncStorage.setItem(KEYS.PNL, JSON.stringify(pnl));
}

export async function loadBudgets(): Promise<Budgets> {
  try {
    const data = await AsyncStorage.getItem(KEYS.BUDGETS);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

export async function saveBudgets(budgets: Budgets): Promise<void> {
  await AsyncStorage.setItem(KEYS.BUDGETS, JSON.stringify(budgets));
}

export async function loadSavingsGoals(): Promise<SavingsGoals> {
  try {
    const data = await AsyncStorage.getItem(KEYS.SAVINGS_GOALS);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

export async function saveSavingsGoals(goals: SavingsGoals): Promise<void> {
  await AsyncStorage.setItem(KEYS.SAVINGS_GOALS, JSON.stringify(goals));
}

export async function loadProfile(): Promise<UserProfile> {
  try {
    const data = await AsyncStorage.getItem(KEYS.PROFILE);
    return data ? JSON.parse(data) : DEFAULT_PROFILE;
  } catch {
    return DEFAULT_PROFILE;
  }
}

export async function saveProfile(profile: UserProfile): Promise<void> {
  await AsyncStorage.setItem(KEYS.PROFILE, JSON.stringify(profile));
}

export async function clearAllData(): Promise<void> {
  await AsyncStorage.multiRemove([
    KEYS.TRANSACTIONS,
    KEYS.RATES,
    KEYS.PNL,
    KEYS.BUDGETS,
    KEYS.SAVINGS_GOALS,
    KEYS.RATES_TIMESTAMP,
    KEYS.PROFILE,
  ]);
}
