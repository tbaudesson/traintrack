"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Download, Loader2, RotateCcw, Undo2 } from "lucide-react";
import { TRACKING_RESET_DAYS_KEY, myTrackingReset, parseResetDays, resetMyTracking, undoMyTrackingReset, type TrackingReset } from "@/lib/trackingReset";
import { downloadJSONBackup } from "@/lib/exportService";
import { localDate } from "@/lib/dates";
import { useFormat } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { getCurrentUserIdSync } from "@/db";
import { useAppGuidance } from "@/hooks/useAppGuidance";

/**
 * Settings > Start over: one's tracking put aside in one go, to start again
 * on a clean slate, and brought back while the days the admin set last.
 * It needs the server: offline, it says so.
 */
export function TrackingResetCard({ userId: signedIn }: { userId: string | undefined }) {
  // Offline the session may not be restored yet: the account kept on the device.
  const userId = signedIn ?? getCurrentUserIdSync() ?? undefined;
  const t = useTranslations("trackingReset");
  const { day } = useFormat();
  const days = useAppGuidance(TRACKING_RESET_DAYS_KEY, parseResetDays);
  const [state, setState] = useState<"loading" | "offline" | "ready">("loading");
  const [reset, setReset] = useState<TrackingReset | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    let alive = true;
    myTrackingReset(userId)
      .then((r) => alive && (setReset(r), setState("ready")))
      .catch(() => alive && setState("offline"));
    return () => void (alive = false);
  }, [userId]);

  const dateOf = (at: string) => day(localDate(new Date(at)));

  async function run(action: () => Promise<void>) {
    if (!navigator.onLine) return setError(t("offline"));
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error && e.message === "pending" ? t("pending") : t("failed"));
    } finally {
      setBusy(false);
    }
  }

  if (!userId) return null;
  return (
    <div className="space-y-2 border-b border-red-200 pb-3 dark:border-red-900">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <RotateCcw className="h-4 w-4" aria-hidden="true" />
        {t("title")}
      </h3>
      {state === "loading" && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-label={t("loading")} />}
      {state === "offline" && <p role="status" className="text-xs text-muted-foreground">{t("offline")}</p>}
      {state === "ready" && reset && (
        <>
          <p role="status" className="text-xs">{t("done", { date: dateOf(reset.resetAt), until: dateOf(reset.undoUntil) })}</p>
          <Button variant="outline" className="w-full" disabled={busy} onClick={() => run(async () => {
            await undoMyTrackingReset(userId, reset);
            setReset(null);
          })}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Undo2 className="mr-2 h-4 w-4" aria-hidden="true" />}
            {t("undo")}
          </Button>
        </>
      )}
      {state === "ready" && !reset && !confirming && (
        <>
          <p className="text-xs text-muted-foreground">{t("desc")} {days ? t("undoFor", { days }) : t("undoForSome")}</p>
          <Button variant="destructive" className="w-full text-red-700 dark:text-red-300" onClick={() => setConfirming(true)}>
            <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />
            {t("start")}
          </Button>
        </>
      )}
      {state === "ready" && !reset && confirming && (
        <div className="space-y-2 text-xs">
          <p><span className="font-semibold">{t("erasedTitle")}</span> {t("erased")}</p>
          <p><span className="font-semibold">{t("keptTitle")}</span> {t("kept")}</p>
          <p className="text-muted-foreground">{t("coach")}</p>
          <Button variant="outline" className="w-full" onClick={() => downloadJSONBackup(userId)}>
            <Download className="mr-2 h-4 w-4" aria-hidden="true" />
            {t("exportFirst")}
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" disabled={busy} onClick={() => setConfirming(false)}>
              {t("cancel")}
            </Button>
            <Button variant="destructive" className="flex-1" disabled={busy} onClick={() => run(async () => {
              setReset(await resetMyTracking(userId, reset));
              setConfirming(false);
            })}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : t("confirm")}
            </Button>
          </div>
        </div>
      )}
      {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
