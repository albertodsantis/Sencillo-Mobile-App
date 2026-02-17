import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const AUTH_KEY = "@sencillo/auth_user";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  provider: "local" | "google";
}

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUpWithEmail: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signInWithGoogle: (googleUser: { name: string; email: string; avatar?: string }) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const ACCOUNTS_KEY = "@sencillo/accounts";

async function loadAccounts(): Promise<Record<string, { name: string; email: string; password: string }>> {
  try {
    const data = await AsyncStorage.getItem(ACCOUNTS_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

async function saveAccounts(accounts: Record<string, { name: string; email: string; password: string }>): Promise<void> {
  await AsyncStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await AsyncStorage.getItem(AUTH_KEY);
        if (data) setUser(JSON.parse(data));
      } catch {
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const persistUser = useCallback(async (u: AuthUser) => {
    setUser(u);
    await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(u));
  }, []);

  const signUpWithEmail = useCallback(async (name: string, email: string, password: string) => {
    const normalized = email.toLowerCase().trim();
    if (!name.trim()) return { success: false, error: "Ingresa tu nombre" };
    if (!normalized || !normalized.includes("@")) return { success: false, error: "Email invalido" };
    if (password.length < 4) return { success: false, error: "La contrasena debe tener al menos 4 caracteres" };

    const accounts = await loadAccounts();
    if (accounts[normalized]) return { success: false, error: "Ya existe una cuenta con este email" };

    accounts[normalized] = { name: name.trim(), email: normalized, password };
    await saveAccounts(accounts);

    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    await persistUser({ id, name: name.trim(), email: normalized, provider: "local" });
    return { success: true };
  }, [persistUser]);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    const normalized = email.toLowerCase().trim();
    if (!normalized) return { success: false, error: "Ingresa tu email" };
    if (!password) return { success: false, error: "Ingresa tu contrasena" };

    const accounts = await loadAccounts();
    const account = accounts[normalized];
    if (!account) return { success: false, error: "No existe una cuenta con este email" };
    if (account.password !== password) return { success: false, error: "Contrasena incorrecta" };

    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    await persistUser({ id, name: account.name, email: normalized, provider: "local" });
    return { success: true };
  }, [persistUser]);

  const signInWithGoogle = useCallback(async (googleUser: { name: string; email: string; avatar?: string }) => {
    const id = "google_" + googleUser.email;
    await persistUser({
      id,
      name: googleUser.name,
      email: googleUser.email,
      avatar: googleUser.avatar,
      provider: "google",
    });
  }, [persistUser]);

  const signOut = useCallback(async () => {
    setUser(null);
    await AsyncStorage.removeItem(AUTH_KEY);
  }, []);

  const value = useMemo(() => ({
    user,
    isLoading,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signOut,
  }), [user, isLoading, signInWithEmail, signUpWithEmail, signInWithGoogle, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
