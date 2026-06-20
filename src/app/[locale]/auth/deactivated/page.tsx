"use client";

import { useTranslations } from "next-intl";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Ban, LogOut } from "lucide-react";

export default function DeactivatedPage() {
  const t = useTranslations("auth");
  const { signOut } = useAuth();

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <Ban className="h-7 w-7 text-red-600" />
          </div>
          <div>
            <p className="font-semibold">{t("deactivatedTitle")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("deactivatedDesc")}</p>
          </div>
          <Button variant="outline" onClick={() => signOut()}>
            <LogOut className="mr-1 h-4 w-4" />
            {t("signOut")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
