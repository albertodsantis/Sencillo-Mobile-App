import AsyncStorage from '@react-native-async-storage/async-storage';
import { type Budgets } from '../domain/types';

const KEY = '@sencillo/budgets';

export const BudgetRepository = {
  async get(): Promise<Budgets> {
    try {
      const data = await AsyncStorage.getItem(KEY);
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  },

  async save(budgets: Budgets): Promise<void> {
    await AsyncStorage.setItem(KEY, JSON.stringify(budgets));
  },

  async clear(): Promise<void> {
    await AsyncStorage.removeItem(KEY);
  },
};
