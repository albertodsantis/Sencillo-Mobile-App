import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SupportedStorage } from '@supabase/auth-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { toSecureStoreKey } from './secureStoreKey';

export const AUTH_USER_CACHE_KEY = '@sencillo/auth_user';
export const SUPABASE_AUTH_STORAGE_KEY = '@sencillo/supabase.auth.token';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const LEGACY_SUPABASE_AUTH_STORAGE_KEY = SUPABASE_URL
  ? `sb-${new URL(SUPABASE_URL).hostname.split('.')[0]}-auth-token`
  : null;
const USE_SECURE_STORE = Platform.OS === 'ios' || Platform.OS === 'android';

function getLegacyStorageKey(key: string): string | null {
  if (!LEGACY_SUPABASE_AUTH_STORAGE_KEY) return null;
  if (key === SUPABASE_AUTH_STORAGE_KEY) return LEGACY_SUPABASE_AUTH_STORAGE_KEY;
  if (!key.startsWith(SUPABASE_AUTH_STORAGE_KEY)) return null;

  return `${LEGACY_SUPABASE_AUTH_STORAGE_KEY}${key.slice(SUPABASE_AUTH_STORAGE_KEY.length)}`;
}

async function readStorageValue(key: string): Promise<string | null> {
  if (!USE_SECURE_STORE) {
    return await AsyncStorage.getItem(key);
  }

  return await SecureStore.getItemAsync(toSecureStoreKey(key));
}

async function writeStorageValue(key: string, value: string): Promise<void> {
  if (!USE_SECURE_STORE) {
    await AsyncStorage.setItem(key, value);
    return;
  }

  await SecureStore.setItemAsync(toSecureStoreKey(key), value, {
    keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK,
  });
}

async function removeStorageValue(key: string): Promise<void> {
  if (!USE_SECURE_STORE) {
    await AsyncStorage.removeItem(key);
    return;
  }

  await SecureStore.deleteItemAsync(toSecureStoreKey(key));
}

async function migrateLegacyValueIfNeeded(key: string): Promise<string | null> {
  const currentValue = await readStorageValue(key);
  if (currentValue !== null) return currentValue;

  const legacyKey = getLegacyStorageKey(key);
  if (!legacyKey) return null;

  const legacyValue = await AsyncStorage.getItem(legacyKey);
  if (legacyValue === null) return null;

  await writeStorageValue(key, legacyValue);
  await AsyncStorage.removeItem(legacyKey);
  return legacyValue;
}

export const authStorage: SupportedStorage = {
  getItem: async (key: string) => await migrateLegacyValueIfNeeded(key),
  setItem: async (key: string, value: string) => {
    await writeStorageValue(key, value);
  },
  removeItem: async (key: string) => {
    await removeStorageValue(key);

    const legacyKey = getLegacyStorageKey(key);
    if (legacyKey) {
      await AsyncStorage.removeItem(legacyKey);
    }
  },
};

export async function clearSupabaseAuthStorage(): Promise<void> {
  await Promise.all([
    authStorage.removeItem(SUPABASE_AUTH_STORAGE_KEY),
    authStorage.removeItem(`${SUPABASE_AUTH_STORAGE_KEY}-code-verifier`),
    authStorage.removeItem(`${SUPABASE_AUTH_STORAGE_KEY}-user`),
    authStorage.removeItem(AUTH_USER_CACHE_KEY),
  ]);
}
