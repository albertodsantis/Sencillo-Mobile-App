import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../utils/supabase';
import type { User } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import { ProfileRepository } from './ProfileRepository';
import { WorkspaceRepository } from './WorkspaceRepository';
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

async function ensureInitialProfile(user: User, password = ''): Promise<void> {
  const normalizedEmail = user.email?.toLowerCase().trim() ?? '';
  const displayName = (user.user_metadata?.name as string | undefined)?.trim() ||
    normalizedEmail.split('@')[0] ||
    'Usuario';
  const { firstName, lastName } = splitName(displayName);

  const { error } = await supabase.from('profiles').upsert(
    {
      user_id: user.id,
      first_name: firstName,
      last_name: lastName,
      phone_prefix: '+58',
      phone_number: '',
      email: normalizedEmail,
      password,
    },
    { onConflict: 'user_id' },
  );

  if (error) {
    throw new Error(error.message || 'No se pudo asegurar el perfil');
  }
}

async function syncAuthenticatedUser(user: User): Promise<AuthUser> {
  const mapped = mapSupabaseUserToAuthUser(user);
  await AuthRepository.persistSession(mapped);

  try {
    await ensureInitialProfile(user);
    await WorkspaceRepository.ensureDefault();
  } catch (bootstrapError) {
    console.warn('No se pudo bootstrapear perfil/workspace para usuario autenticado:', bootstrapError);
  }

  return mapped;
}

export const AuthRepository = {
  async getSession(): Promise<AuthUser | null> {
    const cached = await AsyncStorage.getItem(SESSION_KEY);
    const cachedUser: AuthUser | null = cached ? JSON.parse(cached) : null;

    const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), 4000));

    const supabaseCheck = supabase.auth.getUser().then(async ({ data, error }) => {
      if (error || !data.user) {
        await AsyncStorage.removeItem(SESSION_KEY);
        return null;
      }
      return syncAuthenticatedUser(data.user);
    }).catch(() => null);

    const result = await Promise.race([supabaseCheck, timeout]);

    if (result !== null) return result;
    return cachedUser;
  },

  async persistSession(user: AuthUser): Promise<void> {
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(user));
  },

  async clearSession(): Promise<void> {
    await AsyncStorage.removeItem(SESSION_KEY);
  },

  async syncFromSupabaseSessionUser(user: User): Promise<AuthUser> {
    return await syncAuthenticatedUser(user);
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

    let user: AuthUser = mapSupabaseUserToAuthUser(data.user);

    try {
      const profile = buildProfileFromRegistration(normalizedName, normalizedEmail, password);
      await ProfileRepository.save(profile);
      user = await syncAuthenticatedUser(data.user);
    } catch (profileError) {
      console.warn('No se pudo guardar el perfil inicial en Supabase:', profileError);
      await this.persistSession(user);
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

    let user: AuthUser;
    try {
      await ensureInitialProfile(data.user, password);
      user = await syncAuthenticatedUser(data.user);
    } catch (profileError) {
      console.warn('No se pudo asegurar el perfil para este usuario:', profileError);
      user = mapSupabaseUserToAuthUser(data.user);
      await this.persistSession(user);
    }

    return { success: true, user };
  },

  async loginWithGoogle(): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
    const redirectUrl = makeRedirectUri();

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        skipBrowserRedirect: true,
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (!data?.url) {
      return { success: false, error: 'No se pudo iniciar Google Sign-In' };
    }

    const res = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

    if (res.type !== 'success' || !res.url) {
      if (res.type === 'dismiss' || res.type === 'cancel') {
        return { success: false, error: 'Inicio de sesion cancelado' };
      }
      return { success: false, error: 'No se pudo completar Google Sign-In' };
    }

    const { params, errorCode } = QueryParams.getQueryParams(res.url);

    if (errorCode) {
      throw new Error(errorCode);
    }

    const { access_token, refresh_token } = params;

    if (!access_token) {
      return { success: false, error: 'No se pudo obtener el token de acceso de Google' };
    }

    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
      access_token,
      refresh_token,
    });

    if (sessionError) {
      return { success: false, error: sessionError.message };
    }

    if (!sessionData.user) {
      return { success: false, error: 'No se pudo iniciar sesion con Google' };
    }

    let user: AuthUser;
    try {
      user = await syncAuthenticatedUser(sessionData.user);
    } catch (profileError) {
      console.warn('No se pudo asegurar el perfil para usuario de Google:', profileError);
      user = mapSupabaseUserToAuthUser(sessionData.user);
      await this.persistSession(user);
    }

    return { success: true, user };
  },

  async logout(): Promise<void> {
    await supabase.auth.signOut();
    await this.clearSession();
  },
};
