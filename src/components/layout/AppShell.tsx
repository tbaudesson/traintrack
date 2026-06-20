"use client";

import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { usePathname, useRouter } from "@/i18n/navigation";
import { BottomNav } from "./BottomNav";
import { OfflineBanner } from "./OfflineBanner";
import { Loader2 } from "lucide-react";

/**
 * Main app shell:
 * 1. Auth-gating (redirect to login if not authenticated)
 * 2. Account status gating (pending / deactivated)
 * 3. Conditional BottomNav (hidden on auth pages)
 * 4. Loading screen during auth initialization
 */
export function AppShell({ children }: { children: ReactNode }) {
  const { user, loading, isOffline, accountStatus } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const isAuthPage = pathname.startsWith("/auth");
  const isAuthenticated = !!user || isOffline;
  const isPendingPage = pathname === "/auth/pending";
  const isDeactivatedPage = pathname === "/auth/deactivated";

  useEffect(() => {
    if (loading) return;

    if (!isAuthenticated && !isAuthPage) {
      router.replace("/auth/login");
    } else if (isAuthenticated && isAuthPage && !isPendingPage && !isDeactivatedPage) {
      if (accountStatus === "pending") {
        router.replace("/auth/pending");
      } else if (accountStatus === "deactivated") {
        router.replace("/auth/deactivated");
      } else {
        router.replace("/");
      }
    } else if (isAuthenticated && !isAuthPage) {
      if (accountStatus === "pending") {
        router.replace("/auth/pending");
      } else if (accountStatus === "deactivated") {
        router.replace("/auth/deactivated");
      }
    }
  }, [loading, isAuthenticated, isAuthPage, isPendingPage, isDeactivatedPage, accountStatus, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-gray-950">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-accent-500" />
          <span className="text-sm text-gray-500 dark:text-gray-400">Loading…</span>
        </div>
      </div>
    );
  }

  if (isAuthPage) {
    return <>{children}</>;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      <OfflineBanner />
      <main id="main-content" className="flex-1 overflow-y-auto pb-20">
        {children}
      </main>
      <BottomNav />
    </>
  );
}
