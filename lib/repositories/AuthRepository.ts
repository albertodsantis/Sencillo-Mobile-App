import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

const SESSION_KEY = '@sencillo/auth_user';
const USERS_KEY = '@sencillo/users';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  provider: 'local' | 'google';
}

interface StoredUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  avatar?: string;
  provider: 'local' | 'google';
}

async function hashPassword(password: string): Promise<string> {
  return await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    password,
  );
}

async function getStoredUsers(): Promise<StoredUser[]> {
  try {
    const data = await AsyncStorage.getItem(USERS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

async function saveStoredUsers(users: StoredUser[]): Promise<void> {
  await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
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

    const users = await getStoredUsers();
    if (users.find((u) => u.email === normalized)) {
      return { success: false, error: 'Ya existe una cuenta con este email' };
    }

    const passwordHash = await hashPassword(password);
    const id = Crypto.randomUUID();

    const storedUser: StoredUser = {
      id,
      name: name.trim(),
      email: normalized,
      passwordHash,
      provider: 'local',
    };

    users.push(storedUser);
    await saveStoredUsers(users);

    const user: AuthUser = {
      id,
      name: name.trim(),
      email: normalized,
      provider: 'local',
    };
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

    const users = await getStoredUsers();
    const found = users.find((u) => u.email === normalized);
    if (!found) {
      return { success: false, error: 'No se encontro una cuenta con este email' };
    }

    const passwordHash = await hashPassword(password);
    if (found.passwordHash !== passwordHash) {
      return { success: false, error: 'Contrasena incorrecta' };
    }

    const user: AuthUser = {
      id: found.id,
      name: found.name,
      email: found.email,
      avatar: found.avatar,
      provider: found.provider,
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
