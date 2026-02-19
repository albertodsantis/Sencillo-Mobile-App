import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

const SESSION_KEY = '@sencillo/auth_user';
const ACCOUNTS_KEY = '@sencillo/accounts';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  provider: 'local' | 'google';
}

interface StoredAccount {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
}

function hashPassword(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return 'h1$' + Math.abs(hash).toString(36) + '$' + password.length;
}

function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash.startsWith('h1$')) {
    return password === storedHash;
  }
  return hashPassword(password) === storedHash;
}

async function loadAccounts(): Promise<Record<string, StoredAccount>> {
  try {
    const data = await AsyncStorage.getItem(ACCOUNTS_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

async function saveAccounts(accounts: Record<string, StoredAccount>): Promise<void> {
  await AsyncStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

export const AuthRepository = {
  async getSession(): Promise<AuthUser | null> {
    try {
      const data = await AsyncStorage.getItem(SESSION_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  async persistSession(user: AuthUser): Promise<void> {
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(user));
  },

  async clearSession(): Promise<void> {
    await AsyncStorage.removeItem(SESSION_KEY);
  },

  async register(
    name: string,
    email: string,
    password: string,
  ): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
    const normalized = email.toLowerCase().trim();
    if (!name.trim()) return { success: false, error: 'Ingresa tu nombre' };
    if (!normalized || !normalized.includes('@'))
      return { success: false, error: 'Email invalido' };
    if (password.length < 4)
      return { success: false, error: 'La contrasena debe tener al menos 4 caracteres' };

    const accounts = await loadAccounts();
    if (accounts[normalized])
      return { success: false, error: 'Ya existe una cuenta con este email' };

    const id = Crypto.randomUUID();
    accounts[normalized] = {
      id,
      name: name.trim(),
      email: normalized,
      passwordHash: hashPassword(password),
    };
    await saveAccounts(accounts);

    const user: AuthUser = { id, name: name.trim(), email: normalized, provider: 'local' };
    await this.persistSession(user);
    return { success: true, user };
  },

  async login(
    email: string,
    password: string,
  ): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
    const normalized = email.toLowerCase().trim();
    if (!normalized) return { success: false, error: 'Ingresa tu email' };
    if (!password) return { success: false, error: 'Ingresa tu contrasena' };

    const accounts = await loadAccounts();
    const account = accounts[normalized];
    if (!account) return { success: false, error: 'No existe una cuenta con este email' };
    if (!verifyPassword(password, account.passwordHash))
      return { success: false, error: 'Contrasena incorrecta' };

    const user: AuthUser = {
      id: account.id,
      name: account.name,
      email: normalized,
      provider: 'local',
    };
    await this.persistSession(user);
    return { success: true, user };
  },

  async loginWithGoogle(googleUser: {
    name: string;
    email: string;
    avatar?: string;
  }): Promise<AuthUser> {
    const user: AuthUser = {
      id: 'google_' + googleUser.email,
      name: googleUser.name,
      email: googleUser.email,
      avatar: googleUser.avatar,
      provider: 'google',
    };
    await this.persistSession(user);
    return user;
  },

  async logout(): Promise<void> {
    await this.clearSession();
  },
};
