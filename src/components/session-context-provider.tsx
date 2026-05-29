import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { PropsWithChildren } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { getAuthErrorMessage } from "@/lib/auth-errors";

type SessionContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  authError: string | null;
  clearAuthError: () => void;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

export function SessionContextProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadInitialSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          throw error;
        }

        if (!mounted) return;
        setSession(data.session);
        setUser(data.session?.user ?? null);
      } catch (error) {
        if (!mounted) return;
        setAuthError(getAuthErrorMessage(error));
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void loadInitialSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);

      if (event === "SIGNED_OUT") {
        setAuthError(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({
      session,
      user,
      loading,
      authError,
      clearAuthError: () => setAuthError(null),
      signOut: async () => {
        const { error } = await supabase.auth.signOut();

        if (error) {
          setAuthError(getAuthErrorMessage(error));
          return;
        }

        setAuthError(null);
      },
    }),
    [authError, loading, session, user],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSessionContext() {
  const context = useContext(SessionContext);

  if (!context) {
    throw new Error("useSessionContext must be used within SessionContextProvider");
  }

  return context;
}
