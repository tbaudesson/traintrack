"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ListChecks, ClipboardList, Users, HeartPulse, Settings, ChevronRight,
  User, Trophy, Shield,
} from "lucide-react";

export default function MorePage() {
  const t = useTranslations("more");
  const { hasFeature } = useFeatureAccess();
  const { user, profile, isAdmin } = useAuth();

  const name = profile?.display_name ?? user?.email?.split("@")[0] ?? "";
  const initials = name.slice(0, 2).toUpperCase();

  const items = [
    ...(hasFeature("readiness")
      ? [{ href: "/readiness", icon: HeartPulse, label: t("readiness"), color: "text-rose-500" }]
      : []),
    { href: "/exercises", icon: ListChecks, label: t("exercises"), color: "text-accent-500" },
    { href: "/programs", icon: ClipboardList, label: t("programs"), color: "text-violet-500" },
    { href: "/teams", icon: Users, label: t("teams"), color: "text-emerald-500" },
    ...(isAdmin ? [{ href: "/admin", icon: Shield, label: t("admin"), color: "text-accent-500" }] : []),
    { href: "/settings", icon: Settings, label: t("settings"), color: "text-muted-foreground" },
  ];

  return (
    <>
      <PageHeader title={t("title")} />
      <div className="space-y-3 p-4 pb-24">
        {/* User header */}
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent-500 to-accent-700 text-sm font-bold text-white">
              {initials || <User className="h-5 w-5" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{name}</p>
              <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
              {profile?.plan_name && (
                <span className="mt-1 inline-block rounded-full bg-accent-100 px-2 py-0.5 text-[10px] font-medium text-accent-700 dark:bg-accent-900/40 dark:text-accent-300">
                  {profile.plan_name}
                </span>
              )}
            </div>
            <div className="flex gap-1">
              <Link href="/profile">
                <Button variant="ghost" size="sm" aria-label="profile"><Trophy className="h-5 w-5" /></Button>
              </Link>
              <Link href="/settings">
                <Button variant="ghost" size="sm" aria-label="settings"><Settings className="h-5 w-5" /></Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-2">
          {items.map((it) => (
            <Card key={it.href}>
              <CardContent className="py-0">
                <Link href={it.href} className="flex items-center gap-3 py-3.5">
                  <it.icon className={`h-5 w-5 ${it.color}`} />
                  <span className="flex-1 font-medium">{it.label}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}
