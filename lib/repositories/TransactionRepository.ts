import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { type Transaction } from '../domain/types';

const KEY = '@sencillo/transactions';

export const TransactionRepository = {
  async getAll(): Promise<Transaction[]> {
    try {
      const data = await AsyncStorage.getItem(KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  async save(transactions: Transaction[]): Promise<void> {
    await AsyncStorage.setItem(KEY, JSON.stringify(transactions));
  },

  async add(tx: Omit<Transaction, 'id'>): Promise<Transaction> {
    const all = await this.getAll();
    const newTx: Transaction = { ...tx, id: Crypto.randomUUID() };
    all.push(newTx);
    await this.save(all);
    return newTx;
  },

  async addMany(txList: Omit<Transaction, 'id'>[]): Promise<Transaction[]> {
    const all = await this.getAll();
    const created = txList.map((tx) => ({ ...tx, id: Crypto.randomUUID() }));
    all.push(...created);
    await this.save(all);
    return created;
  },

  async update(tx: Transaction): Promise<void> {
    const all = await this.getAll();
    const idx = all.findIndex((t) => t.id === tx.id);
    if (idx >= 0) {
      all[idx] = tx;
      await this.save(all);
    }
  },

  async remove(id: string): Promise<void> {
    const all = await this.getAll();
    await this.save(all.filter((t) => t.id !== id));
  },

  async removeAll(): Promise<void> {
    await this.save([]);
  },

  async clear(): Promise<void> {
    await AsyncStorage.removeItem(KEY);
  },
};
