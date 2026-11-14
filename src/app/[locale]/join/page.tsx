"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Check, Loader2, Users } from "lucide-react";
import { Link, useRouter } from "@/i18n/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useAthleteProfileOrNull } from "@/hooks/useAthleteProfile";
import { syncAll } from "@/lib/syncEngine";
import { useFormat } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  acceptInvite,
  forgetInvite,
  pendingInvite,
  previewInvite,
  rememberInvite,
  rememberJoined,
  tokenFromHash,
  type InvitePreview,
} from "@/lib/inviteService";
import { Button, buttonVariants } from "@/components/ui/button";

const weekdayName = (locale: string, day: number) =>
  new Intl.DateTimeFormat(locale, { weekday: "long", timeZone: "UTC" }).format(new Date(Date.UTC(2024, 0, day)));

/**
 * Where a coach's invitation link leads. Signed out, it keeps the link and
 * offers to sign up (the account is then approved) or in. Signed in, it shows
 * the team, the coach and what they prepared, asks for consent, and joins.
 */
export default function JoinPage() {
  const t = useTranslations("join");
  const locale = useLocale();
  const router = useRouter();
  const { day } = useFormat();
  const { user, isOffline } = useAuth();
  // Offline with a cached account counts as signed in, as everywhere in the app.
  const signedIn = !!user || isOffline;
  const profile = useAthleteProfileOrNull();
  // The token: from the link's "#", or kept from before signing in.
  const token = useSyncExternalStore(
    () => () => {},
    () => tokenFromHash(window.location.hash) ?? pendingInvite(),
    () => null
  );
  const [preview, setPreview] = useState<InvitePreview | null | undefined>(undefined);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // A token from the link is kept across sign-up, and taken out of the address bar.
  useEffect(() => {
    const fromLink = tokenFromHash(window.location.hash);
    if (!fromLink) return;
    rememberInvite(fromLink);
    window.history.replaceState(null, "", window.location.pathname);
  }, []);

  useEffect(() => {
    if (!signedIn || !token) return;
    let live = true;
    previewInvite(token)
      .then((p) => live && setPreview(p))
      .catch(() => live && setPreview(null));
    return () => {
      live = false;
    };
  }, [signedIn, token]);

  async function join() {
    if (!token || !preview || !consent) return;
    setBusy(true);
    setError(null);
    try {
      const joined = await acceptInvite(token);
      forgetInvite();
      rememberJoined({
        teamName: joined.teamName,
        coachName: joined.coachName,
        programName: preview.programName,
        startDate: preview.startDate,
        weekdays: preview.weekdays,
      });
      // The program and the welcome message the server just wrote.
      await syncAll().catch(() => {});
      router.replace(profile ? "/" : "/onboarding");
    } catch (e) {
      const code = e instanceof Error ? e.message : "";
      if (code === "ALREADY_MEMBER" || code === "INVALID_INVITE") forgetInvite();
      setError(code === "ALREADY_MEMBER" ? t("already") : code === "OWN_TEAM" ? t("ownTeam") : navigator.onLine ? t("invalid") : t("offline"));
    } finally {
      setBusy(false);
    }
  }

  const shell = (body: React.ReactNode) => (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-5 p-6">
      <div className="flex items-center gap-3">
        <span className="flex size-12 items-center justify-center rounded-2xl bg-accent-500/15 text-accent-text">
          <Users className="size-6" aria-hidden="true" />
        </span>
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
      </div>
      {body}
    </div>
  );

  if (!token) {
    return shell(
      <>
        <p className="text-sm text-muted-foreground">{t("noLink")}</p>
        <Link href="/" className={buttonVariants({ variant: "outline" })}>
          {t("home")}
        </Link>
      </>
    );
  }

  // Signed out: sign up (approved by the link) or in, then back here.
  if (!signedIn) {
    return shell(
      <>
        <p className="text-sm text-muted-foreground">{t("signedOut")}</p>
        <Link href="/auth/signup" className={buttonVariants({ size: "lg" })}>
          {t("signUp")}
        </Link>
        <Link href="/auth/login" className={buttonVariants({ variant: "outline", size: "lg" })}>
          {t("signIn")}
        </Link>
      </>
    );
  }

  if (preview === undefined) {
    return shell(<Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />);
  }

  if (preview === null) {
    return shell(
      <>
        <p role="alert" className="text-sm text-muted-foreground">
          {navigator.onLine ? t("invalid") : t("offline")}
        </p>
        <Button
          variant="outline"
          onClick={() => {
            forgetInvite();
            router.replace("/");
          }}
        >
          {t("home")}
        </Button>
      </>
    );
  }

  return shell(
    <>
      <div className="t-surface space-y-2 rounded-2xl p-4 ring-1 ring-foreground/5">
        <p className="text-sm text-muted-foreground">{t("invitedBy", { coach: preview.coachName ?? t("aCoach") })}</p>
        <p className="text-xl font-semibold">{preview.teamName}</p>
        {preview.programName && (
          <div className="space-y-0.5 border-t border-border pt-2 text-sm">
            <p className="font-medium">{t("prepared", { program: preview.programName })}</p>
            {preview.startDate && <p className="text-muted-foreground">{t("startsOn", { date: day(preview.startDate) })}</p>}
            {preview.weekdays?.length ? (
              <p className="text-muted-foreground">{t("days", { days: [...preview.weekdays].sort().map((d) => weekdayName(locale, d)).join(", ") })}</p>
            ) : null}
          </div>
        )}
        {preview.welcome && <blockquote className="border-l-2 border-accent-500 pl-3 text-sm whitespace-pre-line italic">{preview.welcome}</blockquote>}
      </div>

      <button type="button" onClick={() => setConsent((c) => !c)} aria-pressed={consent} className="flex items-start gap-3 text-left">
        <span
          className={cn(
            "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border",
            consent ? "border-accent-500 bg-accent-500 text-white" : "border-muted-foreground"
          )}
        >
          {consent && <Check className="size-3.5" aria-hidden="true" />}
        </span>
        <span className="text-sm">{t("consent", { coach: preview.coachName ?? t("aCoach") })}</span>
      </button>

      {error && (
        <p role="alert" className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">
          {error}
        </p>
      )}
      <Button size="lg" onClick={join} disabled={!consent || busy}>
        {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
        {t("join")}
      </Button>
      <Button
        variant="ghost"
        onClick={() => {
          forgetInvite();
          router.replace("/");
        }}
      >
        {t("decline")}
      </Button>
    </>
  );
}
