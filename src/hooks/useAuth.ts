import { useState, useEffect, useCallback, createContext, useContext } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

export type AppRole = "admin" | "logistica" | "faturamento";

interface AuthState {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  loading: boolean;
  signIn: (email: string, password: string, rememberMe?: boolean) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, nome: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const REMEMBER_KEY = "frico_remember_me";

const AuthContext = createContext<AuthState | undefined>(undefined);

export const AuthProvider = AuthContext.Provider;

export function useAuthState(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  // On mount, apply stored storage preference
  useEffect(() => {
    const remembered = localStorage.getItem(REMEMBER_KEY);
    if (remembered === "false") {
      // Move session to sessionStorage if not remembering
      (supabase.auth as any).storage = sessionStorage;
    }
  }, []);

  const fetchRole = useCallback(async (userId: string) => {
    try {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();
      setRole((data?.role as AppRole) ?? "logistica");
    } catch {
      console.error("Failed to fetch role, using fallback");
      setRole("logistica");
    }
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          try {
            await fetchRole(session.user.id);
          } catch {
            setRole("logistica");
          }
        } else {
          setRole(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchRole(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchRole]);

  const signIn = useCallback(async (email: string, password: string, rememberMe: boolean = true) => {
    // Set storage based on preference BEFORE signing in
    if (rememberMe) {
      (supabase.auth as any).storage = localStorage;
      localStorage.setItem(REMEMBER_KEY, "true");
    } else {
      (supabase.auth as any).storage = sessionStorage;
      localStorage.setItem(REMEMBER_KEY, "false");
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }, []);

  const signUp = useCallback(async (email: string, password: string, nome: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nome } },
    });
    return { error: error?.message ?? null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    localStorage.removeItem(REMEMBER_KEY);
    (supabase.auth as any).storage = localStorage;
  }, []);

  return { user, session, role, loading, signIn, signUp, signOut };
}

const defaultAuth: AuthState = {
  user: null,
  session: null,
  role: null,
  loading: true,
  signIn: async () => ({ error: "Not initialized" }),
  signUp: async () => ({ error: "Not initialized" }),
  signOut: async () => {},
};

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  return ctx ?? defaultAuth;
}
