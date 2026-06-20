"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dumbbell, Plus } from "lucide-react";

export default function HomePage() {
  const t = useTranslations("home");
  const { user } = useAuth();
  const name = user?.email?.split("@")[0] ?? "";

  return (
    <div className="space-y-6 p-4 pb-24">
      <div className="relative -mx-4 -mt-4 overflow-hidden px-4 pb-2 pt-6">
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-transparent" />
        <h1 className="relative text-2xl font-bold tracking-tight">
          {t("greeting", { name })}
        </h1>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30">
            <Dumbbell className="h-7 w-7 text-indigo-600" />
          </div>
          <p className="text-sm text-muted-foreground">{t("noWorkoutToday")}</p>
          <Link href="/log">
            <Button>
              <Plus className="mr-1 h-4 w-4" />
              {t("startWorkout")}
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
