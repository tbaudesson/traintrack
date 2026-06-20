"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import {
  ListChecks,
  ClipboardList,
  Users,
  HeartPulse,
  Settings,
  ChevronRight,
} from "lucide-react";

export default function MorePage() {
  const t = useTranslations("more");
  const { hasFeature } = useFeatureAccess();

  const items = [
    ...(hasFeature("readiness")
      ? [{ href: "/readiness", icon: HeartPulse, label: t("readiness"), color: "text-rose-500" }]
      : []),
    { href: "/exercises", icon: ListChecks, label: t("exercises"), color: "text-accent-500" },
    { href: "/programs", icon: ClipboardList, label: t("programs"), color: "text-violet-500" },
    { href: "/teams", icon: Users, label: t("teams"), color: "text-emerald-500" },
    { href: "/settings", icon: Settings, label: t("settings"), color: "text-muted-foreground" },
  ];

  return (
    <>
      <PageHeader title={t("title")} />
      <div className="space-y-2 p-4 pb-24">
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
    </>
  );
}
