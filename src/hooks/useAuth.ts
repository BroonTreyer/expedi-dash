import { useState, useEffect, useCallback, useRef, createContext, useContext } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import { toast } from "sonner";

export type AppRole = "admin" | "logistica" | "faturamento" | "portaria";

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
const SESSION_TIMEOUT_MS = 8000;

async function fetchRoleWithRetry(userId: string): Promise<AppRole | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), ROLE_TIMEOUT_MS)
      );
      const query = supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();

      const { data } = await Promise.race([query, timeout]);
      return (data?.role as AppRole) ?? null;
    } catch {
      if (attempt === 0) {
        console.warn("[Auth] Role fetch failed, retrying in 1s...");
        await new Promise((r) => setTimeout(r, 1000));
      } else {
        console.warn("[Auth] Role fetch failed after retry");
      }
    }
  }
  return null;
}

export function useAuthState(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const bootstrapped = useRef(false);
  const intentionalSignOut = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const safetyTimer = setTimeout(async () => {
      if (!cancelled && loading) {
        console.warn("[Auth] Safety timeout reached, forcing loading=false");
        // If we have a user but no role, session is broken — force sign out
        if (user && !role) {
          console.warn("[Auth] User exists but role is null after timeout — signing out");
          intentionalSignOut.current = true;
          await supabase.auth.signOut();
          toast.error("Sua sessão expirou. Faça login novamente.");
        }
        setLoading(false);
      }
    }, SESSION_TIMEOUT_MS);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        if (cancelled) return;

        // Handle unexpected sign out (session conflict from another device)
        if (event === "SIGNED_OUT" && !intentionalSignOut.current) {
          setSession(null);
          setUser(null);
          setRole(null);
          setLoading(false);
          toast.error("Sua sessão expirou. Faça login novamente.");
          return;
        }

        if (event === "SIGNED_OUT") {
          setSession(null);
          setUser(null);
          setRole(null);
          setLoading(false);
          intentionalSignOut.current = false;
          return;
        }

        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (newSession?.user) {
          const uid = newSession.user.id;
          setTimeout(() => {
            if (cancelled) return;
            fetchRoleWithRetry(uid).then((r) => {
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

    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      if (cancelled || bootstrapped.current) return;
      bootstrapped.current = true;

      if (!existingSession) {
        setSession(null);
        setUser(null);
        setRole(null);
        setLoading(false);
        return;
      }

      setSession(existingSession);
      setUser(existingSession.user);

      fetchRoleWithRetry(existingSession.user.id).then((r) => {
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
    intentionalSignOut.current = true;
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
