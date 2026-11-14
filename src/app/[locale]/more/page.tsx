"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { PageHeader } from "@/components/layout/PageHeader";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DetailRow } from "@/components/ui/detail-row";
import { useAppPrefs } from "@/hooks/useAppPrefs";
import { useCompetitions } from "@/hooks/useCompetitions";
import { useHorses } from "@/hooks/useHorses";
import { cn } from "@/lib/utils";
import {
  ListChecks, ClipboardList, Users, HeartPulse, Settings,
  User, Shield, Newspaper, Flag, MessageCircle, Activity,
  Award,
  PawPrint,
} from "lucide-react";

export default function MorePage() {
  const t = useTranslations("more");
  const { hasFeature } = useFeatureAccess();
  const { user, profile, isAdmin } = useAuth();

  const name = profile?.display_name ?? user?.email?.split("@")[0] ?? "";
  const initials = name.slice(0, 2).toUpperCase();

  const vaulting = useAppPrefs().sport === "vaulting";
  const competitions = useCompetitions();
  const horses = useHorses();

  // Functional destinations (profile/settings/admin live in the header).
  const items = [
    ...(hasFeature("readiness")
      ? [{ href: "/readiness", icon: HeartPulse, label: t("readiness") }]
      : []),
    { href: "/exercises", icon: ListChecks, label: t("exercises") },
    { href: "/programs", icon: ClipboardList, label: t("programs") },
    { href: "/teams", icon: Users, label: t("teams") },
    ...(hasFeature("coaching") ? [{ href: "/activity", icon: Newspaper, label: t("activity") }] : []),
    { href: "/challenges", icon: Flag, label: t("challenges") },
    // Vaulting only: for a vaulter, or once there is something to see.
    ...(vaulting || competitions.length ? [{ href: "/competitions", icon: Award, label: t("competitions") }] : []),
    ...(vaulting || horses.length ? [{ href: "/horses", icon: PawPrint, label: t("horses") }] : []),
    { href: "/messages", icon: MessageCircle, label: t("messages") },
    { href: "/health", icon: Activity, label: t("health") },
  ];

  return (
    <>
      <PageHeader title={t("title")} />
      <div className="space-y-3 p-4 pb-24">
        {/* User header with quick-access icons */}
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent-500 to-accent-700 text-sm font-bold text-white">
              {initials || <User className="h-5 w-5" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{name}</p>
              <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
              {profile?.plan_name && (
                <span className="mt-1 inline-block rounded-full bg-accent-100 px-2 py-0.5 text-xs font-medium text-accent-700 dark:bg-accent-900/40 dark:text-accent-300">
                  {profile.plan_name}
                </span>
              )}
            </div>
            <div className="flex gap-1">
              <Link href="/profile" aria-label={t("profile")} className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }))}>
                  <User className="h-5 w-5" aria-hidden="true" />
                </Link>
              <Link href="/settings" aria-label={t("settings")} className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }))}>
                  <Settings className="h-5 w-5" aria-hidden="true" />
                </Link>
              {isAdmin && (
                <Link href="/admin" aria-label={t("admin")} className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }), "text-accent-text")}>
                  <Shield className="h-5 w-5" aria-hidden="true" />
                </Link>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-2">
          {items.map((it) => (
            <DetailRow key={it.href} href={it.href} icon={it.icon} title={it.label} />
          ))}
        </div>
      </div>
    </>
  );
}
