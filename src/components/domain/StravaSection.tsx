"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Loader2, RefreshCw } from "lucide-react";
import { connectStrava, disconnectStrava, stravaStatus, syncStrava, type StravaStatus } from "@/lib/stravaService";
import { useFormat } from "@/lib/format";
import { Button } from "@/components/ui/button";

/** Strava's orange, for its "Connect with" button and its mark (brand guidelines). */
export const STRAVA_ORANGE = "#FC4C02";

/**
 * Connect a Strava account and bring its activities in as sessions. Seen by
 * the athlete only (never by a coach), kept out of the AI assistant, deleted
 * on disconnecting: what Strava's API agreement asks.
 */
export function StravaSection() {
  const t = useTranslations("strava");
  const locale = useLocale();
  const { day } = useFormat();
  const [status, setStatus] = useState<StravaStatus | null>(null);
  const [busy, setBusy] = useState<"connect" | "sync" | "disconnect" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    let alive = true;
    stravaStatus()
      .then((s) => alive && setStatus(s))
      .catch((e) => {
        if (!alive) return;
        // Online and still no answer: the function is not deployed yet (or down), not the network.
        if (!navigator.onLine) setOffline(true);
        else setError(t(e instanceof Error && e.message === "STRAVA_NOT_CONFIGURED" ? "notConfigured" : "unavailable"));
      });
    return () => {
      alive = false;
    };
  }, [t]);

  const errorText = (e: unknown) => {
    const code = e instanceof Error ? e.message : "";
    return t(code === "STRAVA_RATE_LIMIT" ? "errRate" : code === "STRAVA_AUTH" ? "errAuth" : code === "STRAVA_NOT_CONFIGURED" ? "notConfigured" : "errGeneric");
  };

  async function run(kind: "connect" | "sync" | "disconnect") {
    setBusy(kind);
    setError(null);
    setMessage(null);
    try {
      if (kind === "connect") await connectStrava(locale);
      if (kind === "sync") {
        const r = await syncStrava();
        if (r.error) throw new Error(r.error);
        setMessage(t("imported", { count: r.imported ?? 0 }));
        setStatus(await stravaStatus());
      }
      if (kind === "disconnect") {
        if (!window.confirm(t("disconnectConfirm"))) return;
        await disconnectStrava();
        setStatus({ connected: false, athleteId: null, lastSyncAt: null });
        setMessage(t("disconnected"));
      }
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">{t("desc")}</p>
      {status === null && !offline && !error && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-label={t("loading")} />}
      {offline && !error && <p className="text-sm text-muted-foreground">{t("offline")}</p>}
      {status && !status.connected && (
        <button
          type="button"
          onClick={() => run("connect")}
          disabled={busy !== null}
          className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg px-4 text-sm font-bold text-white disabled:opacity-60"
          style={{ background: STRAVA_ORANGE }}
        >
          {busy === "connect" && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          {t("connect")}
        </button>
      )}
      {status?.connected && (
        <>
          <p className="text-sm">
            {t("connected")}
            {status.lastSyncAt && <span className="text-muted-foreground"> · {t("lastSync", { date: day(status.lastSyncAt.slice(0, 10)) })}</span>}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => run("sync")} disabled={busy !== null} className="flex-1">
              {busy === "sync" ? <Loader2 className="mr-1 h-4 w-4 animate-spin" aria-hidden="true" /> : <RefreshCw className="mr-1 h-4 w-4" aria-hidden="true" />}
              {t("syncNow")}
            </Button>
            <Button variant="ghost" onClick={() => run("disconnect")} disabled={busy !== null} className="text-destructive">
              {t("disconnect")}
            </Button>
          </div>
        </>
      )}
      {message && <p className="text-sm text-success-text" role="status">{message}</p>}
      {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
      <p className="text-xs text-muted-foreground">{t("privacy")}</p>
      <p className="text-xs font-semibold" style={{ color: STRAVA_ORANGE }}>{t("poweredBy")}</p>
    </div>
  );
}
