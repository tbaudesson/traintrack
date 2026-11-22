"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { finishStravaConnect } from "@/lib/stravaService";

// useSearchParams needs a Suspense boundary on a statically rendered page.
export default function StravaReturnPage() {
  return (
    <Suspense>
      <StravaReturn />
    </Suspense>
  );
}

/** Back from Strava's authorization page: the account connected and a first import made, or why not. */
function StravaReturn() {
  const t = useTranslations("strava");
  const params = useSearchParams();
  const [state, setState] = useState<{ kind: "busy" } | { kind: "done"; count: number } | { kind: "error"; text: string }>({ kind: "busy" });
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const code = params.get("code");
    const scope = params.get("scope") ?? "";
    // Declined on Strava's page, or the activities not shared.
    if (params.get("error") || !code || !scope.includes("activity:read")) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- the answer is in the address
      setState({ kind: "error", text: t("declined") });
      return;
    }
    finishStravaConnect(code, params.get("state"))
      .then((r) => setState({ kind: "done", count: r.imported ?? 0 }))
      .catch((e) => setState({ kind: "error", text: t(e instanceof Error && e.message === "STRAVA_STATE" ? "errState" : "errGeneric") }));
  }, [params, t]);

  return (
    <>
      <PageHeader title={t("title")} />
      <div className="mx-auto max-w-md space-y-4 p-4">
        {state.kind === "busy" && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            {t("connecting")}
          </p>
        )}
        {state.kind === "done" && <p className="text-sm font-medium text-success-text" role="status">{t("connectedNow", { count: state.count })}</p>}
        {state.kind === "error" && <p className="text-sm text-destructive" role="alert">{state.text}</p>}
        {state.kind !== "busy" && (
          <Link href="/settings?section=strava" className="block text-sm font-semibold text-accent-text underline">
            {t("backToSettings")}
          </Link>
        )}
      </div>
    </>
  );
}
