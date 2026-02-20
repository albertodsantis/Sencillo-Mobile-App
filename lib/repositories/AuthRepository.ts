import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../utils/supabase';
import type { User } from '@supabase/supabase-js';

const SESSION_KEY = '@sencillo/auth_user';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  provider: 'local' | 'google';
}

function mapSupabaseUserToAuthUser(user: User): AuthUser {
  const fallbackName = user.email ? user.email.split('@')[0] : 'Usuario';
  return {
    id: user.id,
    name: (user.user_metadata?.name as string | undefined)?.trim() || fallbackName,
    email: user.email ?? '',
    avatar: user.user_metadata?.avatar_url as string | undefined,
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
    const normalizedName = name.trim();
    const normalizedEmail = email.toLowerCase().trim();
    if (!normalizedName) return { success: false, error: 'Ingresa tu nombre' };
    if (!normalizedEmail || !normalizedEmail.includes('@'))
      return { success: false, error: 'Email invalido' };
    if (password.length < 4)
      return { success: false, error: 'La contrasena debe tener al menos 4 caracteres' };

    const { data, error } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          name: normalizedName,
        },
      },
    });

    if (error) {
      const message = error.message.toLowerCase().includes('already')
        ? 'Ya existe una cuenta con este email'
        : error.message;
      return { success: false, error: message };
    }

    if (!data.user) {
      return { success: false, error: 'No se pudo crear la cuenta' };
    }

    if (!data.session) {
      return {
        success: false,
        error: 'Tu cuenta fue creada. Verifica tu correo y luego inicia sesion para guardar transacciones.',
      };
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

    if (error) {
      const lowerMessage = error.message.toLowerCase();
      if (lowerMessage.includes('invalid login credentials')) {
        return { success: false, error: 'Email o contrasena incorrectos' };
      }
      return { success: false, error: error.message };
    }

    if (!data.user) {
      return { success: false, error: 'No se pudo iniciar sesion' };
    }

    const user: AuthUser = mapSupabaseUserToAuthUser(data.user);
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
