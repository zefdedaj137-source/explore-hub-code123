import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
  useRef,
} from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const lastActiveRef = useRef<number>(0);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  }, []);

  useEffect(() => {
    let mounted = true;

    // Set up auth state listener FIRST
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, currentSession) => {
      logger.log("🔐 Auth state change:", { event, userId: currentSession?.user?.id });
      if (!mounted) return;

      // If the session token is already expired (can happen for SIGNED_IN or INITIAL_SESSION
      // when the stored token hasn't been refreshed yet), skip setting state and wait for
      // the TOKEN_REFRESHED event. Trigger a refresh as a side-effect; if the refresh token
      // is also expired, sign the user out so they aren't stuck in a loading state.
      if (currentSession && event !== "TOKEN_REFRESHED" && event !== "SIGNED_OUT") {
        const now = Math.floor(Date.now() / 1000);
        if (currentSession.expires_at != null && currentSession.expires_at < now) {
          logger.log(`⏳ ${event} token already expired, triggering refresh...`);
          supabase.auth.refreshSession().then(({ error }) => {
            if (error && mounted) {
              logger.warn("🔑 Refresh failed, signing out:", error.message);
              supabase.auth.signOut();
              setSession(null);
              setUser(null);
              setLoading(false);
            }
          });
          return;
        }
      }

      setSession(currentSession);
      // Only update user if the ID actually changed to avoid unnecessary re-renders
      setUser((prev) => {
        const newUser = currentSession?.user ?? null;
        if (prev?.id === newUser?.id) return prev;
        return newUser;
      });
      setLoading(false);
    });

    // Then check for existing session as fallback
    supabase.auth.getSession().then(async ({ data: { session: existingSession } }) => {
      logger.log("🔍 Initial session check:", { userId: existingSession?.user?.id });
      if (!mounted) return;

      if (existingSession) {
        const now = Math.floor(Date.now() / 1000);
        const isExpired = existingSession.expires_at != null && existingSession.expires_at < now;
        if (isExpired) {
          logger.log("🔄 Session token expired, refreshing...");
          const {
            data: { session: refreshed },
          } = await supabase.auth.refreshSession();
          if (mounted) {
            setSession((prev) => prev ?? refreshed);
            setUser((prev) => prev ?? refreshed?.user ?? null);
            setLoading(false);
          }
          return;
        }
      }

      // Only set if the auth listener hasn't already fired
      setSession((prev) => prev ?? existingSession);
      setUser((prev) => prev ?? existingSession?.user ?? null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!user) return;

    const updateLastActive = async () => {
      const now = Date.now();
      if (now - lastActiveRef.current < 60_000) return;
      lastActiveRef.current = now;
      await supabase
        .from("profiles")
        .update({ last_active: new Date().toISOString() })
        .eq("id", user.id);
    };

    // Reactivate account if it was deactivated (user logged back in)
    const reactivateIfNeeded = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("deactivated_at")
        .eq("id", user.id)
        .single();
      if (!error && data?.deactivated_at) {
        await supabase.rpc("reactivate_account", { p_user_id: user.id });
      }
    };

    reactivateIfNeeded().catch((err) => logger.warn("Failed to reactivate:", err));
    updateLastActive().catch((err) => logger.warn("Failed to update last active:", err));
    const interval = window.setInterval(updateLastActive, 60_000);
    return () => window.clearInterval(interval);
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
