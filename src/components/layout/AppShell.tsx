"use client";

import { pendingInvite } from "@/lib/inviteService";
import { useEffect, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/contexts/AuthContext";
import { usePathname, useRouter } from "@/i18n/navigation";
import { BottomNav, DesktopRail } from "./BottomNav";
import { OfflineBanner } from "./OfflineBanner";
import { OfflineWarmup } from "./OfflineWarmup";
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
  const tc = useTranslations("common");

  const isAuthPage = pathname.startsWith("/auth");
  const isAuthenticated = !!user || isOffline;
  const isPendingPage = pathname === "/auth/pending";
  const isDeactivatedPage = pathname === "/auth/deactivated";
  // The recovery link signs the user in; they must stay here to set a password.
  const isResetPage = pathname === "/auth/reset";
  // An invitation link opens signed out too: it offers to sign up or in.
  const isJoinPage = pathname === "/join";
  // Legal information must be readable before someone creates an account.
  const isPublicLegalPage = pathname === "/legal/privacy";

  useEffect(() => {
    if (loading) return;

    if (!isAuthenticated && !isAuthPage && !isJoinPage && !isPublicLegalPage) {
      router.replace("/auth/login");
    } else if (isAuthenticated && isAuthPage && !isPendingPage && !isDeactivatedPage && !isResetPage) {
      if (accountStatus === "pending") {
        router.replace("/auth/pending");
      } else if (accountStatus === "deactivated") {
        router.replace("/auth/deactivated");
      } else {
        // Back to the invitation opened before signing in, if any.
        router.replace(pendingInvite() ? "/join" : "/");
      }
    } else if (isAuthenticated && !isAuthPage) {
      if (accountStatus === "pending") {
        router.replace("/auth/pending");
      } else if (accountStatus === "deactivated") {
        router.replace("/auth/deactivated");
      }
    }
  }, [loading, isAuthenticated, isAuthPage, isJoinPage, isPublicLegalPage, isPendingPage, isDeactivatedPage, isResetPage, accountStatus, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-accent-500" />
          <span className="text-sm text-muted-foreground">{tc("loading")}</span>
        </div>
      </div>
    );
  }

  if (isAuthPage || (!isAuthenticated && (isJoinPage || isPublicLegalPage))) {
    // The skip link leads here too.
    return <main id="main-content">{children}</main>;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      <OfflineBanner />
      <OfflineWarmup />
      <DesktopRail />
      <main id="main-content" className="t-app-main flex-1 overflow-y-auto pb-20">
        {children}
      </main>
      <BottomNav />
    </>
  );
}
