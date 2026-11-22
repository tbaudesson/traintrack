"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Loader2, MessageCircleQuestion, Send, Trash2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { askCoach, getAiConsent, getApiKey, type CoachTurn } from "@/lib/aiService";
import { AiConsent } from "@/components/domain/AiConsent";
import { coachContext } from "@/lib/coachContext";
import type { CoachProposal } from "@/lib/coach";
import { readinessScore, useReadiness } from "@/hooks/useReadiness";
import { usePainReports } from "@/hooks/usePain";
import { useAthleteProfileOrNull, useInjuries } from "@/hooks/useAthleteProfile";
import { useTrainablePrograms } from "@/hooks/usePrograms";
import { useWorkouts } from "@/hooks/useWorkouts";
import { useAllWorkoutSets } from "@/hooks/useWorkoutSets";
import { useExercises } from "@/hooks/useExercises";
import { useGoals } from "@/hooks/useGoals";
import { useBodyMetrics } from "@/hooks/useBodyMetrics";
import { localDate } from "@/lib/dates";
import { Button } from "@/components/ui/button";

const ERRORS: Record<string, string> = { AI_NO_CONSENT: "errGeneric", AI_BAD_KEY: "errBadKey", AI_RATE_LIMIT: "errRate", AI_OFFLINE: "errOffline", AI_REFUSED: "errRefused" };

/**
 * A question to the assistant in one's own words, answered by Claude from a
 * summary of one's data (shown on demand), with the athlete's own key. Off
 * until a key is set; nothing is sent until a question is asked. The answer
 * advises; changes stay with the athlete.
 */
export function AskCoach({ proposals }: { proposals: CoachProposal[] }) {
  const t = useTranslations("askCoach");
  const locale = useLocale();
  const [hasKey, setHasKey] = useState(false);
  const [consented, setConsented] = useState(false);
  useEffect(() => {
    // The key and the agreement live in this device's storage.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHasKey(!!getApiKey());
    setConsented(!!getAiConsent());
  }, []);
  const profile = useAthleteProfileOrNull();
  const programs = useTrainablePrograms();
  const workouts = useWorkouts();
  const sets = useAllWorkoutSets();
  const exercises = useExercises();
  const injuries = useInjuries();
  const pains = usePainReports();
  const readiness = useReadiness();
  const goals = useGoals();
  const bodyMetrics = useBodyMetrics();
  const context = useMemo(
    () =>
      coachContext({
        today: localDate(),
        profile,
        programs,
        workouts,
        sets,
        exercises,
        injuries,
        pains,
        readiness: readiness.map((r) => ({ date: r.date, score: readinessScore(r) })),
        proposals,
        goals,
        bodyMetrics,
      }),
    [profile, programs, workouts, sets, exercises, injuries, pains, readiness, proposals, goals, bodyMetrics]
  );
  const [history, setHistory] = useState<CoachTurn[]>([]);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ask(q: string) {
    const key = getApiKey();
    if (!key || !q.trim() || busy) return;
    setBusy(true);
    setError(null);
    setAnswer("");
    setQuestion("");
    try {
      const text = await askCoach({ apiKey: key, locale, context, history, question: q.trim(), onText: setAnswer });
      setHistory((h) => [...h, { role: "user", content: q.trim() }, { role: "assistant", content: text }]);
    } catch (e) {
      const code = e instanceof Error ? e.message : "";
      setError(t(ERRORS[code] ?? "errGeneric"));
      setQuestion(q);
    } finally {
      setAnswer(null);
      setBusy(false);
    }
  }

  return (
    <section className="t-surface space-y-3 rounded-2xl p-4 ring-1 ring-foreground/5" aria-labelledby="ask-coach">
      <div>
        <h2 id="ask-coach" className="flex items-center gap-2 text-sm font-semibold">
          <MessageCircleQuestion className="h-4 w-4 text-accent-text" aria-hidden="true" />
          {t("title")}
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">{t("intro")}</p>
      </div>

      {!hasKey ? (
        <p className="rounded-xl bg-muted/60 p-3 text-sm">
          {t("needKey")}{" "}
          <Link href="/settings" className="font-semibold text-accent-text underline">{t("toSettings")}</Link>
        </p>
      ) : !consented ? (
        <AiConsent sends="coach" onAccept={() => setConsented(true)} />
      ) : (
        <>
          {history.length > 0 && (
            <ol className="space-y-3">
              {history.map((turn, i) => (
                <li key={i} className={turn.role === "user" ? "ml-8 rounded-xl bg-accent-50 p-3 text-sm dark:bg-accent-900/20" : "mr-4 whitespace-pre-wrap rounded-xl bg-muted/60 p-3 text-sm"}>
                  {turn.content}
                </li>
              ))}
            </ol>
          )}
          {answer !== null && (
            <p className="mr-4 whitespace-pre-wrap rounded-xl bg-muted/60 p-3 text-sm" aria-live="polite">
              {answer || <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-label={t("thinking")} />}
            </p>
          )}
          {history.length === 0 && !busy && (
            <div className="flex flex-wrap gap-2">
              {(["s1", "s2", "s3"] as const).map((k) => (
                <button key={k} type="button" onClick={() => ask(t(k))} className="rounded-full border border-border px-3 py-1.5 text-left text-xs hover:bg-muted">
                  {t(k)}
                </button>
              ))}
            </div>
          )}
          <form
            className="flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              ask(question);
            }}
          >
            <textarea
              aria-label={t("placeholder")}
              placeholder={t("placeholder")}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={2}
              maxLength={1000}
              className="min-h-11 flex-1 rounded-xl border border-input bg-background px-3 py-2 text-sm"
            />
            <Button type="submit" size="icon" className="size-11 shrink-0 rounded-full" disabled={busy || !question.trim()} aria-label={t("send")}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
            </Button>
          </form>
          {error && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{error}</p>}
          <div className="flex items-center justify-between gap-2">
            <details className="text-xs text-muted-foreground">
              <summary className="cursor-pointer">{t("whatIsSent")}</summary>
              <pre className="mt-2 max-h-60 overflow-auto whitespace-pre-wrap rounded-lg bg-muted/60 p-2 text-[0.7rem]">{context}</pre>
            </details>
            {history.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setHistory([])}>
                <Trash2 className="mr-1 h-4 w-4" aria-hidden="true" />
                {t("clear")}
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{t("privacy")}</p>
        </>
      )}
    </section>
  );
}
