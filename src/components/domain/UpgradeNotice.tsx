"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Lock } from "lucide-react";

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
