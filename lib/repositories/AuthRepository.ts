import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../utils/supabase';
import type { User } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { ProfileRepository } from './ProfileRepository';
import type { UserProfile } from '../domain/types';

const SESSION_KEY = '@sencillo/auth_user';

WebBrowser.maybeCompleteAuthSession();

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  provider: 'local' | 'google';
}

function mapSupabaseUserToAuthUser(user: User): AuthUser {
  const fallbackName = user.email ? user.email.split('@')[0] : 'Usuario';
  const provider = user.app_metadata?.provider === 'google' ? 'google' : 'local';

  return {
    id: user.id,
    name: (user.user_metadata?.name as string | undefined)?.trim() || fallbackName,
    email: user.email ?? '',
    avatar: user.user_metadata?.avatar_url as string | undefined,
    provider,
  };
}

function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) return { firstName: '', lastName: '' };
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' '),
  };
}

function buildProfileFromRegistration(name: string, email: string, password: string): UserProfile {
  const normalizedName = name.trim();
  const { firstName, lastName } = splitName(normalizedName);

  return {
    firstName,
    lastName,
    phonePrefix: '+58',
    phoneNumber: '',
    email,
    password,
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

    try {
      const profile = buildProfileFromRegistration(normalizedName, normalizedEmail, password);
      await ProfileRepository.save(profile);
    } catch (profileError) {
      console.warn('No se pudo guardar el perfil inicial en Supabase:', profileError);
    }

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

  async loginWithGoogle(): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
    const redirectUrl = makeRedirectUri();

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (!data?.url) {
      return { success: false, error: 'No se pudo iniciar Google Sign-In' };
    }

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

    if (result.type !== 'success' || !result.url) {
      if (result.type === 'dismiss' || result.type === 'cancel') {
        return { success: false, error: 'Inicio de sesion cancelado' };
      }
      return { success: false, error: 'No se pudo completar Google Sign-In' };
    }

    const { queryParams } = Linking.parse(result.url);
    const code = queryParams?.code;

    if (typeof code !== 'string' || !code) {
      return { success: false, error: 'No se recibio codigo de autenticacion de Google' };
    }

    const { data: sessionData, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      return { success: false, error: exchangeError.message };
    }

    if (!sessionData.user) {
      return { success: false, error: 'No se pudo iniciar sesion con Google' };
    }

    const user = mapSupabaseUserToAuthUser(sessionData.user);
    await this.persistSession(user);
    return { success: true, user };
  },

  async logout(): Promise<void> {
    await supabase.auth.signOut();
    await this.clearSession();
  },
};
