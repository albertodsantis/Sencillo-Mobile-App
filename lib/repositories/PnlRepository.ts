import AsyncStorage from '@react-native-async-storage/async-storage';
import { type PnlStructure, DEFAULT_PNL } from '../domain/types';

const KEY = '@sencillo/pnl';

export const PnlRepository = {
  async get(): Promise<PnlStructure> {
    try {
      const data = await AsyncStorage.getItem(KEY);
      return data ? JSON.parse(data) : DEFAULT_PNL;
    } catch {
      return DEFAULT_PNL;
    }
  },

  async save(pnl: PnlStructure): Promise<void> {
    await AsyncStorage.setItem(KEY, JSON.stringify(pnl));
  },

  async clear(): Promise<void> {
    await AsyncStorage.removeItem(KEY);
  },
};
