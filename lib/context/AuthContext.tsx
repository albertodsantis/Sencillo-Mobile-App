import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from "react";
import { supabase } from "@/utils/supabase";
import { AuthRepository, type AuthUser } from "../repositories/AuthRepository";

export type { AuthUser } from "../repositories/AuthRepository";

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUpWithEmail: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signInWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        const session = await AuthRepository.getSession();
        if (isMounted) setUser(session);
      } catch {
        if (isMounted) setUser(null);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    })();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        AuthRepository.clearSession();
        if (isMounted) setUser(null);
        return;
      }

      // Only do a full sync on explicit sign-in or user update — not on token refreshes
      if (event !== "SIGNED_IN" && event !== "USER_UPDATED") return;

      if (!session?.user) return;

      AuthRepository.syncFromSupabaseSessionUser(session.user)
        .then((syncedUser) => {
          if (isMounted) setUser(syncedUser);
        })
        .catch(() => {
          // Don't clear user on network errors — keep existing session state
        });
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const signUpWithEmail = useCallback(async (name: string, email: string, password: string) => {
    const result = await AuthRepository.register(name, email, password);
    if (result.success && result.user) {
      setUser(result.user);
    }
    return { success: result.success, error: result.error };
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    const result = await AuthRepository.login(email, password);
    if (result.success && result.user) {
      setUser(result.user);
    }
    return { success: result.success, error: result.error };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const result = await AuthRepository.loginWithGoogle();
    if (result.success && result.user) {
      setUser(result.user);
    }
    return { success: result.success, error: result.error };
  }, []);

  const signOut = useCallback(async () => {
    setUser(null);
    await AuthRepository.logout();
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
