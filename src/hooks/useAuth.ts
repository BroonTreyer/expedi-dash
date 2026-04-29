import { useState, useEffect, useCallback, useRef, createContext, useContext } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";
import { toast } from "sonner";

export type AppRole = "admin" | "logistica" | "faturamento" | "portaria" | "vendedor";

interface AuthState {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  loading: boolean;
  roleFetchFailed: boolean;
  refreshRole: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, nome: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export const AuthProvider = AuthContext.Provider;

const ROLE_TIMEOUT_MS = 12000;
const SESSION_TIMEOUT_MS = 8000;

type RoleFetchResult = { role: AppRole | null; failed: boolean };

async function fetchRoleWithRetry(userId: string): Promise<RoleFetchResult> {
  const backoffs = [0, 1000, 2000, 4000];
  let lastFailed = false;
  for (let attempt = 0; attempt < backoffs.length; attempt++) {
    if (backoffs[attempt] > 0) {
      await new Promise((r) => setTimeout(r, backoffs[attempt]));
    }
    try {
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), ROLE_TIMEOUT_MS)
      );
      const query = supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();

      const { data, error } = await Promise.race([query, timeout]) as any;
      if (error) {
        lastFailed = true;
        console.warn(`[Auth] Role fetch error (attempt ${attempt + 1}):`, error.message);
        continue;
      }
      // Successful query — role may be null (genuinely missing) or set
      return { role: (data?.role as AppRole) ?? null, failed: false };
    } catch {
      lastFailed = true;
      console.warn(`[Auth] Role fetch timeout (attempt ${attempt + 1})`);
    }
  }
  return { role: null, failed: lastFailed };
}

export function useAuthState(): AuthState {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [roleFetchFailed, setRoleFetchFailed] = useState(false);
  const roleRef = useRef<AppRole | null>(null);
  const userIdRef = useRef<string | null>(null);
  const [loading, setLoading] = useState(true);
  const bootstrapped = useRef(false);
  const intentionalSignOut = useRef(false);

  // Keep ref in sync
  useEffect(() => { roleRef.current = role; }, [role]);

  const applyRoleResult = useCallback((res: RoleFetchResult) => {
    setRoleFetchFailed(res.failed);
    if (!res.failed) {
      setRole(res.role);
    } else if (!roleRef.current) {
      // Keep role null but don't trigger "missing" toast — flag it as failed
      setRole(null);
    }
    setLoading(false);
  }, []);

  const refreshRole = useCallback(async () => {
    const uid = userIdRef.current;
    if (!uid) return;
    const res = await fetchRoleWithRetry(uid);
    applyRoleResult(res);
  }, [applyRoleResult]);

  useEffect(() => {
    let cancelled = false;

    const safetyTimer = setTimeout(() => {
      if (!cancelled && loading) {
        console.warn("[Auth] Safety timeout reached, forcing loading=false");
        // Don't force sign out — just unblock loading with whatever role we have
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
          setRoleFetchFailed(false);
          userIdRef.current = null;
          setLoading(false);
          toast.error("Sua sessão expirou. Faça login novamente.", { id: "auth-session-expired" });
          return;
        }

        if (event === "SIGNED_OUT") {
          setSession(null);
          setUser(null);
          setRole(null);
          setRoleFetchFailed(false);
          userIdRef.current = null;
          setLoading(false);
          intentionalSignOut.current = false;
          return;
        }

        setSession(newSession);
        setUser(newSession?.user ?? null);
        userIdRef.current = newSession?.user?.id ?? null;

        // If token was just refreshed and we already have a role, skip re-fetching
        if (event === "TOKEN_REFRESHED" && roleRef.current) {
          setLoading(false);
          return;
        }

        if (newSession?.user) {
          const uid = newSession.user.id;
          setTimeout(() => {
            if (cancelled) return;
            fetchRoleWithRetry(uid).then((r) => {
              if (!cancelled) applyRoleResult(r);
            });
          }, 0);
        } else {
          setRole(null);
          setRoleFetchFailed(false);
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
        setRoleFetchFailed(false);
        userIdRef.current = null;
        setLoading(false);
        return;
      }

      setSession(existingSession);
      setUser(existingSession.user);
      userIdRef.current = existingSession.user.id;

      fetchRoleWithRetry(existingSession.user.id).then((r) => {
        if (!cancelled) applyRoleResult(r);
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

  // Refetch role on reconnect / tab focus when it's missing or failed
  useEffect(() => {
    const tryRefetch = () => {
      if (userIdRef.current && (!roleRef.current || roleFetchFailed)) {
        refreshRole();
      }
    };
    const onVis = () => { if (document.visibilityState === "visible") tryRefetch(); };
    window.addEventListener("online", tryRefetch);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("online", tryRefetch);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [refreshRole, roleFetchFailed]);

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

  return { user, session, role, loading, roleFetchFailed, refreshRole, signIn, signUp, signOut };
}

const defaultAuth: AuthState = {
  user: null,
  session: null,
  role: null,
  loading: true,
  roleFetchFailed: false,
  refreshRole: async () => {},
  signIn: async () => ({ error: "Not initialized" }),
  signUp: async () => ({ error: "Not initialized" }),
  signOut: async () => {},
};

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  return ctx ?? defaultAuth;
}

/** Lightweight hook that returns only the session — use in data hooks for gating queries */
export function useSession() {
  const { session } = useAuth();
  return session;
}
