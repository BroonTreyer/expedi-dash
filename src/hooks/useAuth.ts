import { useState, useEffect, useCallback, useRef, createContext, useContext } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

export type AppRole = "admin" | "logistica" | "faturamento";

interface AuthState {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, nome: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export const AuthProvider = AuthContext.Provider;

const ROLE_TIMEOUT_MS = 5000;
const SESSION_TIMEOUT_MS = 6000;

async function fetchRoleWithTimeout(userId: string): Promise<AppRole> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ROLE_TIMEOUT_MS);

  try {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle()
      .abortSignal(controller.signal);

    return (data?.role as AppRole) ?? "logistica";
  } catch {
    console.warn("[Auth] Role fetch failed/timed out, using fallback");
    return "logistica";
  } finally {
    clearTimeout(timer);
  }
}

export function useAuthState(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const bootstrapped = useRef(false);

  useEffect(() => {
    let cancelled = false;

    // 1) Safety net: if nothing resolves in SESSION_TIMEOUT_MS, force loading off
    const safetyTimer = setTimeout(() => {
      if (!cancelled && loading) {
        console.warn("[Auth] Safety timeout reached, forcing loading=false");
        setLoading(false);
      }
    }, SESSION_TIMEOUT_MS);

    // 2) Auth state change listener — 100% synchronous, no await inside
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        if (cancelled) return;

        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (newSession?.user) {
          // Fire-and-forget role resolution (outside callback via setTimeout)
          const uid = newSession.user.id;
          setTimeout(() => {
            if (cancelled) return;
            fetchRoleWithTimeout(uid).then((r) => {
              if (!cancelled) {
                setRole(r);
                setLoading(false);
              }
            });
          }, 0);
        } else {
          setRole(null);
          setLoading(false);
        }
      }
    );

    // 3) Bootstrap: get existing session
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      if (cancelled || bootstrapped.current) return;
      bootstrapped.current = true;

      if (!existingSession) {
        // No session — stop loading immediately
        setSession(null);
        setUser(null);
        setRole(null);
        setLoading(false);
        return;
      }

      // Session exists — sync state and resolve role
      setSession(existingSession);
      setUser(existingSession.user);

      fetchRoleWithTimeout(existingSession.user.id).then((r) => {
        if (!cancelled) {
          setRole(r);
          setLoading(false);
        }
      });
    }).catch(() => {
      if (!cancelled) {
        console.error("[Auth] getSession failed");
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
      clearTimeout(safetyTimer);
      subscription.unsubscribe();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const signIn = useCallback(async (email: string, password: string) => {
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
