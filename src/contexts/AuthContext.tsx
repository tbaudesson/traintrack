"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { supabase } from "@/lib/supabase";
import { db, refreshCachedUserId } from "@/db";
import { startSync, stopSync } from "@/lib/syncEngine";
import { getUserProfile, type UserProfile, type UserStatus } from "@/lib/adminService";
import { claimPendingInvitations } from "@/lib/groupService";
import type { User, Session } from "@supabase/supabase-js";

// ─── Types ────────────────────────────────────────────────────────────

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  /** True when offline with a cached userId (can use app with local data) */
  isOffline: boolean;
  /** User's profile from the profiles table */
  profile: UserProfile | null;
  /** Whether the current user has admin role */
  isAdmin: boolean;
  /** User's account status */
  accountStatus: UserStatus | null;
  /** Features available in the user's plan */
  planFeatures: string[];
}

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string) => Promise<{ error?: string }>;
  signInWithMagicLink: (email: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error?: string }>;
  /** Refresh the user profile (after admin approval, etc.) */
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

// ─── Helpers ──────────────────────────────────────────────────────────

async function cacheUserId(userId: string, email?: string): Promise<void> {
  await db.authMeta.put({
    key: "currentUser",
    userId,
    email: email ?? undefined,
  });
  await refreshCachedUserId();
}

async function clearCachedUserId(): Promise<void> {
  await db.authMeta.delete("currentUser");
  await refreshCachedUserId();
}

async function getCachedUserId(): Promise<string | null> {
  const meta = await db.authMeta.get("currentUser");
  return meta?.userId ?? null;
}

/**
 * On first login, assign userId to all existing records that have userId=null.
 * This migrates local-only data to the authenticated user.
 */
async function migrateExistingData(userId: string): Promise<void> {
  const tableNames = [
    "athleteProfiles",
    "exercises",
    "programs",
    "workouts",
    "workoutSets",
    "bodyMetrics",
    "readinessCheckins",
    "nutritionEntries",
    "workoutNotes",
    "hydrationLogs",
    "messages",
    "healthMetrics",
  ] as const;

  await db.transaction(
    "rw",
    tableNames.map((name) => db.table(name)),
    async () => {
      for (const name of tableNames) {
        await db
          .table(name)
          .filter((r: Record<string, unknown>) => !r.userId)
          .modify({ userId, _dirty: 1 });
      }
    }
  );
}

// ─── Provider ─────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    isOffline: false,
    profile: null,
    isAdmin: false,
    accountStatus: null,
    planFeatures: [],
  });

  // Initialize auth on mount
  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!mounted) return;

        if (session?.user) {
          // Fetch user profile for role/status (with timeout to prevent Safari hanging)
          let profile = null;
          try {
            profile = await Promise.race([
              getUserProfile(),
              new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000)),
            ]);
          } catch {
            // Profile fetch failed — proceed without it
          }

          if (!mounted) return;

          setState({
            user: session.user,
            session,
            loading: false,
            isOffline: false,
            profile,
            isAdmin: profile?.role === "admin",
            accountStatus: profile?.status ?? null,
            planFeatures: profile?.plan_features ?? [],
          });
          await cacheUserId(session.user.id, session.user.email ?? undefined);
          await migrateExistingData(session.user.id);
          // Start sync engine after auth is established
          startSync(session.user.id);
          // Claim any pending group invitations for this email
          try { await claimPendingInvitations(); } catch { /* non-critical */ }
        } else {
          // No session — check if we're offline with cached data
          const cachedId = await getCachedUserId();
          const offline = !navigator.onLine && !!cachedId;
          setState({
            user: null,
            session: null,
            loading: false,
            isOffline: offline,
            profile: null,
            isAdmin: false,
            accountStatus: null,
            planFeatures: [],
          });
        }
      } catch {
        // Network error — try offline mode
        if (!mounted) return;
        const cachedId = await getCachedUserId();
        setState({
          user: null,
          session: null,
          loading: false,
          isOffline: !!cachedId,
          profile: null,
          isAdmin: false,
          accountStatus: null,
          planFeatures: [],
        });
      }
    };

    initAuth();

    // Listen for auth state changes (login, logout, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (session?.user) {
        let profile = null;
        try {
          profile = await Promise.race([
            getUserProfile(),
            new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000)),
          ]);
        } catch {
          // Profile fetch failed — keep existing profile
        }
        if (!mounted) return;
        setState((prev) => ({
          ...prev,
          user: session.user,
          session,
          isOffline: false,
          // Only update profile if fetch succeeded — keep previous on timeout/failure
          profile: profile ?? prev.profile,
          isAdmin: profile ? profile.role === "admin" : prev.isAdmin,
          accountStatus: profile ? profile.status : prev.accountStatus,
          planFeatures: profile ? (profile.plan_features ?? []) : prev.planFeatures,
        }));
        await cacheUserId(session.user.id, session.user.email ?? undefined);
        if (event === "SIGNED_IN") {
          await migrateExistingData(session.user.id);
          startSync(session.user.id);
        }
      } else {
        setState((prev) => ({
          ...prev,
          user: null,
          session: null,
          profile: null,
          isAdmin: false,
          accountStatus: null,
          planFeatures: [],
        }));
      }
    });

    // Listen for online/offline status changes
    const handleOnline = async () => {
      // Try to restore session when coming back online
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (session?.user) {
          setState((prev) => ({
            ...prev,
            user: session.user,
            session,
            isOffline: false,
          }));
        }
      } catch {
        // Still can't reach server
      }
    };

    const handleOffline = () => {
      setState((prev) => {
        if (prev.user) return prev; // Already authenticated, keep going
        return { ...prev, isOffline: true };
      });
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // ─── Auth methods ───────────────────────────────────────────────────

  const signIn = useCallback(
    async (
      email: string,
      password: string
    ): Promise<{ error?: string }> => {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) return { error: error.message };
      return {};
    },
    []
  );

  const signUp = useCallback(
    async (
      email: string,
      password: string
    ): Promise<{ error?: string }> => {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) {
        const msg = error.message.toLowerCase();
        if (msg.includes("rate limit")) return { error: "AUTH_RATE_LIMIT" };
        if (msg.includes("already registered") || msg.includes("already been registered")) return { error: "AUTH_EMAIL_TAKEN" };
        if (msg.includes("password") && msg.includes("6")) return { error: "AUTH_WEAK_PASSWORD" };
        return { error: error.message };
      }
      return {};
    },
    []
  );

  const signInWithMagicLink = useCallback(
    async (email: string): Promise<{ error?: string }> => {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          // Redirect back to the app after clicking the magic link
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) return { error: error.message };
      return {};
    },
    []
  );

  const signOut = useCallback(async () => {
    stopSync();
    await supabase.auth.signOut();
    await clearCachedUserId();
    setState({
      user: null,
      session: null,
      loading: false,
      isOffline: false,
      profile: null,
      isAdmin: false,
      accountStatus: null,
      planFeatures: [],
    });
  }, []);

  const resetPassword = useCallback(
    async (email: string): Promise<{ error?: string }> => {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      if (error) return { error: error.message };
      return {};
    },
    []
  );

  const refreshProfile = useCallback(async () => {
    const profile = await getUserProfile();
    setState((prev) => ({
      ...prev,
      profile,
      isAdmin: profile?.role === "admin",
      accountStatus: profile?.status ?? null,
      planFeatures: profile?.plan_features ?? [],
    }));
  }, []);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        signIn,
        signUp,
        signInWithMagicLink,
        signOut,
        resetPassword,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
