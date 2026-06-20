"use client";

import { useTranslations } from "next-intl";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, RefreshCw, LogOut } from "lucide-react";

export default function PendingPage() {
  const t = useTranslations("auth");
  const { signOut, refreshProfile } = useAuth();

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
            <Clock className="h-7 w-7 text-amber-600" />
          </div>
          <div>
            <p className="font-semibold">{t("pendingTitle")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("pendingDesc")}</p>
          </div>
          <div className="flex w-full gap-2">
            <Button variant="outline" className="flex-1" onClick={() => refreshProfile()}>
              <RefreshCw className="mr-1 h-4 w-4" />
              {t("loginTitle")}
            </Button>
            <Button variant="ghost" className="flex-1" onClick={() => signOut()}>
              <LogOut className="mr-1 h-4 w-4" />
              {t("signOut")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
