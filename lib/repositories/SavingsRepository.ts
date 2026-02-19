import AsyncStorage from '@react-native-async-storage/async-storage';
import { type SavingsGoals } from '../domain/types';

const KEY = '@sencillo/savings_goals';

export const SavingsRepository = {
  async get(): Promise<SavingsGoals> {
    try {
      const data = await AsyncStorage.getItem(KEY);
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  },

  async save(goals: SavingsGoals): Promise<void> {
    await AsyncStorage.setItem(KEY, JSON.stringify(goals));
  },

  async clear(): Promise<void> {
    await AsyncStorage.removeItem(KEY);
  },
};
