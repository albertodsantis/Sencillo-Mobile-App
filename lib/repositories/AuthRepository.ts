import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../utils/supabase';

const SESSION_KEY = '@sencillo/auth_user';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  provider: 'local' | 'google';
}

function mapSupabaseUserToAuthUser(supabaseUser: {
  id: string;
  email?: string;
  user_metadata?: {
    name?: string;
    avatar_url?: string;
  };
}): AuthUser {
  const email = supabaseUser.email ?? '';
  const metadataName = supabaseUser.user_metadata?.name?.trim();
  const fallbackName = email.split('@')[0] || 'Usuario';

  return {
    id: supabaseUser.id,
    name: metadataName || fallbackName,
    email,
    avatar: supabaseUser.user_metadata?.avatar_url,
    provider: 'local',
  };
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

    const { data, error } = await supabase.auth.signUp({
      email: normalized,
      password,
      options: {
        data: {
          name: name.trim(),
        },
      },
    });

    if (error || !data.user) {
      return { success: false, error: error?.message || 'No se pudo registrar el usuario' };
    }

    const user = mapSupabaseUserToAuthUser(data.user);
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

    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalized,
      password,
    });

    if (error || !data.user) {
      return { success: false, error: error?.message || 'Credenciales invalidas' };
    }

    const user = mapSupabaseUserToAuthUser(data.user);
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
    await supabase.auth.signOut();
    await this.clearSession();
  },
};
