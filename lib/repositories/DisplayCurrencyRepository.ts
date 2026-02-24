import AsyncStorage from '@react-native-async-storage/async-storage';
import { type DisplayCurrency } from '../domain/types';

const DISPLAY_CURRENCY_KEY = '@sencillo/display_currency';

export const DisplayCurrencyRepository = {
  async get(): Promise<DisplayCurrency> {
    try {
      const saved = await AsyncStorage.getItem(DISPLAY_CURRENCY_KEY);
      return saved === 'EUR' ? 'EUR' : 'USD';
    } catch {
      return 'USD';
    }
  },

  async save(displayCurrency: DisplayCurrency): Promise<void> {
    await AsyncStorage.setItem(DISPLAY_CURRENCY_KEY, displayCurrency);
  },

  async clear(): Promise<void> {
    await AsyncStorage.removeItem(DISPLAY_CURRENCY_KEY);
  },
};
