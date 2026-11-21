"use client";

import { useTranslations } from "next-intl";
import { Heart, HeartPulse } from "lucide-react";
import type { useHeartRateMonitor } from "@/hooks/useHeartRateMonitor";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/** The heart-rate belt of a session: connect it, the beats live, the average and maximum so far. */
export function HeartRateCard({ hr }: { hr: ReturnType<typeof useHeartRateMonitor> }) {
  const t = useTranslations("log");
  if (!hr.supported) return null;
  return (
    <Card>
      <CardContent className="flex items-center gap-3 py-3">
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-full", hr.bpm ? "bg-rose-100 dark:bg-rose-900/30" : "bg-muted")}>
          <Heart className={cn("h-5 w-5", hr.bpm ? "animate-pulse text-rose-500" : "text-muted-foreground")} aria-hidden="true" />
        </div>
        <div className="flex-1">
          {hr.bpm ? (
            <p className="text-lg font-bold tabular-nums">{hr.bpm} <span className="text-xs font-normal text-muted-foreground">bpm</span></p>
          ) : (
            <p className="text-sm font-medium">{t("heartRate")}</p>
          )}
          {hr.stats && <p className="text-xs text-muted-foreground">{t("hrAvg")} {hr.stats.avg} · {t("hrMax")} {hr.stats.max}</p>}
          {hr.error && <p className="text-xs text-destructive">{t(hr.error === "unsupported" ? "hrUnsupported" : "hrError")}</p>}
        </div>
        {!hr.connected && (
          <Button size="sm" variant="outline" onClick={hr.connect} disabled={hr.connecting}>
            <HeartPulse className="mr-1 h-4 w-4" aria-hidden="true" />
            {hr.connecting ? t("hrConnecting") : t("hrConnect")}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
