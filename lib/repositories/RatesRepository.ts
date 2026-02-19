import AsyncStorage from '@react-native-async-storage/async-storage';
import { type Rates } from '../domain/types';

const KEY_RATES = '@sencillo/rates';
const KEY_TIMESTAMP = '@sencillo/rates_timestamp';

export const RatesRepository = {
  async get(): Promise<Rates | null> {
    try {
      const data = await AsyncStorage.getItem(KEY_RATES);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  async save(rates: Rates): Promise<void> {
    await AsyncStorage.setItem(KEY_RATES, JSON.stringify(rates));
    await AsyncStorage.setItem(KEY_TIMESTAMP, Date.now().toString());
  },

  async getAge(): Promise<number> {
    try {
      const ts = await AsyncStorage.getItem(KEY_TIMESTAMP);
      if (!ts) return Infinity;
      return Date.now() - parseInt(ts, 10);
    } catch {
      return Infinity;
    }
  },

  async getTimestamp(): Promise<number | null> {
    try {
      const ts = await AsyncStorage.getItem(KEY_TIMESTAMP);
      if (!ts) return null;
      const parsed = parseInt(ts, 10);
      return Number.isNaN(parsed) ? null : parsed;
    } catch {
      return null;
    }
  },

  async clear(): Promise<void> {
    await AsyncStorage.multiRemove([KEY_RATES, KEY_TIMESTAMP]);
  },
};
