import AsyncStorage from '@react-native-async-storage/async-storage';
import { type UserProfile, DEFAULT_PROFILE } from '../domain/types';

const KEY = '@sencillo/profile';

export const ProfileRepository = {
  async get(): Promise<UserProfile> {
    try {
      const data = await AsyncStorage.getItem(KEY);
      return data ? JSON.parse(data) : DEFAULT_PROFILE;
    } catch {
      return DEFAULT_PROFILE;
    }
  },

  async save(profile: UserProfile): Promise<void> {
    await AsyncStorage.setItem(KEY, JSON.stringify(profile));
  },

  async clear(): Promise<void> {
    await AsyncStorage.removeItem(KEY);
  },
};
