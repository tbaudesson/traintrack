"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Lock } from "lucide-react";
import type { ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import type { FeatureKey } from "@/lib/adminService";
import { PageHeader } from "@/components/layout/PageHeader";

export function UpgradeNotice() {
  const t = useTranslations("admin");
  return (
    <div className="p-4">
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <Lock className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="font-medium">{t("upgradeTitle")}</p>
          <p className="text-sm text-muted-foreground">{t("upgradeDesc")}</p>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * A page of a feature the licence may not include: its title and the notice
 * when it does not, the page itself when it does. Nothing shows while the
 * account loads, so the notice does not flash.
 */
export function RequireFeature({ feature, namespace, children }: { feature: FeatureKey; namespace: string; children: ReactNode }) {
  const t = useTranslations(namespace);
  const { loading } = useAuth();
  const { hasFeature } = useFeatureAccess();
  if (loading) return null;
  if (hasFeature(feature)) return <>{children}</>;
  return (
    <>
      <PageHeader title={t("title")} showBack />
      <UpgradeNotice />
    </>
  );
}
