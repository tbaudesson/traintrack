"use client";

import { useMemo, type ReactNode } from "react";
import { useInjuryGuidance } from "@/hooks/useInjuryGuidance";
import { useTranslations } from "next-intl";
import { Activity, AlertTriangle, Bandage, BatteryLow, Goal, HeartPulse, Loader2, Trophy, Users } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useClients } from "@/hooks/useClients";
import { useTeamAdherence } from "@/hooks/useClientActivity";
import { useTeamPain } from "@/hooks/usePain";
import { LOW_FORM, useCoachDigest } from "@/hooks/useCoachDigest";
import { useExercises } from "@/hooks/useExercises";
import { byAttention } from "@/lib/adherence";
import { useExerciseLabel } from "@/lib/exerciseNames";
import { nudgeFor } from "@/lib/nudge";
import { PageHeader } from "@/components/layout/PageHeader";
import { NudgeButton } from "@/components/domain/NudgeButton";
import { EmptyState } from "@/components/ui/page-parts";
import { cn } from "@/lib/utils";
import { useFormat } from "@/lib/format";


/**
 * The coach's dashboard: every athlete of every team on one page, those who
 * need a word first, then pains, this week's records and goals just reached.
 */
export default function CoachDashboardPage() {
  const t = useTranslations("coach");
  const tt = useTranslations("teams");
  const tpain = useTranslations("pain");
  const xl = useExerciseLabel();
  const { num, short } = useFormat();
  const { clients, loading } = useClients();
  const exercises = useExercises();

  // An athlete can be in several teams: one row each, with all their teams.
  const athletes = useMemo(() => {
    const byId = new Map<string, { userId: string; name: string; teams: string[] }>();
    for (const c of clients) {
      const a = byId.get(c.userId) ?? { userId: c.userId, name: c.displayName, teams: [] };
      a.teams.push(c.groupName);
      byId.set(c.userId, a);
    }
    return [...byId.values()];
  }, [clients]);
  const ids = athletes.map((a) => a.userId);
  const adherence = useTeamAdherence(ids);
  const injuryG = useInjuryGuidance();
  const severe = injuryG?.pain.severe ?? Infinity;
  const pains = useTeamPain(ids, injuryG?.pain.coachDays);
  const digest = useCoachDigest(ids);
  const names = new Map(exercises.map((e) => [e.id, xl(e.name)]));

  if (loading) {
    return (
      <div className="flex justify-center p-10">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
      </div>
    );
  }

  const toCheck = byAttention(
    athletes.filter((a) => nudgeFor(adherence?.get(a.userId))),
    (a) => adherence?.get(a.userId)?.status
  );
  const hurting = athletes.filter((a) => pains?.has(a.userId)).sort((a, b) => pains!.get(b.userId)!.level - pains!.get(a.userId)!.level);
  const recording = athletes.filter((a) => (digest?.get(a.userId)?.records.length ?? 0) > 0);
  const reached = athletes.filter((a) => (digest?.get(a.userId)?.goalsReached.length ?? 0) > 0);
  const trained = athletes.filter((a) => (digest?.get(a.userId)?.daysThisWeek ?? 0) > 0).length;
  const deloading = athletes.filter((a) => digest?.get(a.userId)?.deloading);
  // A load rising too fast, then a low form over the week: most worrying first.
  const overloaded = athletes
    .filter((a) => {
      const zone = digest?.get(a.userId)?.load?.zone;
      return zone === "caution" || zone === "danger";
    })
    .sort((a, b) => digest!.get(b.userId)!.load!.ratio - digest!.get(a.userId)!.load!.ratio);
  const lowForm = athletes
    .filter((a) => (digest?.get(a.userId)?.form ?? 100) < LOW_FORM)
    .sort((a, b) => digest!.get(a.userId)!.form! - digest!.get(b.userId)!.form!);
  const watched = new Set([...toCheck, ...hurting, ...overloaded, ...lowForm].map((a) => a.userId)).size;

  return (
    <>
      <PageHeader title={t("title")} showBack />
      <div className="mx-auto max-w-6xl space-y-6 p-4 pb-28 md:p-6">
        {athletes.length === 0 ? (
          <EmptyState icon={Users} title={t("empty")} />
        ) : (
          <>
            <div className="t-coach-stats grid grid-cols-3 gap-2 md:gap-4">
              <Stat value={athletes.length} label={t("athletes")} />
              <Stat value={`${trained}/${athletes.length}`} label={t("trainedThisWeek")} />
              <Stat value={watched} label={t("toWatch")} tone={watched > 0 ? "warn" : undefined} />
            </div>

            <div className="grid items-start gap-5 lg:grid-cols-2">
            <Section icon={AlertTriangle} title={t("checkIn")} empty={t("checkInEmpty")} count={toCheck.length}>
              {toCheck.map((a) => {
                const value = adherence?.get(a.userId);
                const nudge = nudgeFor(value);
                return (
                  <Row key={a.userId} userId={a.userId} name={a.name} teams={a.teams}>
                    <span className={cn("text-xs font-medium", value?.status === "alert" ? "text-rose-600 dark:text-rose-400" : "text-amber-600 dark:text-amber-400")}>
                      {nudge?.kind === "never"
                        ? tt("noActivity")
                        : nudge?.kind === "idle"
                          ? tt("daysAgo", { days: nudge.days ?? 0 })
                          : nudge?.kind === "lowRate"
                            ? t("rate", { percent: nudge.percent ?? 0 })
                            : t("hard", { rpe: nudge?.rpe ?? 0 })}
                    </span>
                    <NudgeButton compact userId={a.userId} name={a.name} adherence={value} />
                  </Row>
                );
              })}
            </Section>

            <Section icon={Bandage} title={t("pains")} empty={t("painsEmpty")} count={hurting.length}>
              {hurting.map((a) => {
                const pain = pains!.get(a.userId)!;
                return (
                  <Row key={a.userId} userId={a.userId} name={a.name} teams={a.teams}>
                    <span className={cn("text-xs font-semibold", pain.level >= severe ? "text-rose-600 dark:text-rose-400" : "text-amber-600 dark:text-amber-400")}>
                      {tpain(`area_${pain.area}`)} {pain.level}/10 · {xl(pain.exerciseName)} · {short(pain.date)}
                    </span>
                  </Row>
                );
              })}
            </Section>

            <Section icon={Activity} title={t("load")} empty={t("loadEmpty")} count={overloaded.length}>
              {overloaded.map((a) => {
                const load = digest!.get(a.userId)!.load!;
                return (
                  <Row key={a.userId} userId={a.userId} name={a.name} teams={a.teams}>
                    <span className={cn("text-xs font-semibold", load.zone === "danger" ? "text-rose-600 dark:text-rose-400" : "text-amber-600 dark:text-amber-400")}>
                      {t("loadValue", { ratio: num(load.ratio) })}
                    </span>
                  </Row>
                );
              })}
            </Section>

            <Section icon={HeartPulse} title={t("form")} empty={t("formEmpty")} count={lowForm.length}>
              {lowForm.map((a) => {
                const form = digest!.get(a.userId)!.form!;
                return (
                  <Row key={a.userId} userId={a.userId} name={a.name} teams={a.teams}>
                    <span className={cn("text-xs font-semibold", form < 35 ? "text-rose-600 dark:text-rose-400" : "text-amber-600 dark:text-amber-400")}>
                      {t("formValue", { score: form })}
                    </span>
                  </Row>
                );
              })}
            </Section>

            <Section icon={Trophy} title={t("records")} empty={t("recordsEmpty")} count={recording.length}>
              {recording.map((a) => {
                const records = digest!.get(a.userId)!.records;
                return (
                  <Row key={a.userId} userId={a.userId} name={a.name} teams={a.teams}>
                    <span className="text-xs text-muted-foreground">
                      {records.slice(0, 2).map((r) => `${names.get(r.exerciseId) ?? "?"} ${num(r.weightKg)} kg × ${r.reps}`).join(" · ")}
                      {records.length > 2 && ` (+${records.length - 2})`}
                    </span>
                  </Row>
                );
              })}
            </Section>

            <Section icon={Goal} title={t("goals")} empty={t("goalsEmpty")} count={reached.length}>
              {reached.map((a) => (
                <Row key={a.userId} userId={a.userId} name={a.name} teams={a.teams}>
                  <span className="text-xs font-medium text-success-text">
                    {digest!
                      .get(a.userId)!
                      .goalsReached.map(({ goal, on }) => `${xl(goal.exerciseName)} ${num(goal.targetKg)} kg · ${short(on)}`)
                      .join(" · ")}
                  </span>
                </Row>
              ))}
            </Section>

            {deloading.length > 0 && (
              <Section icon={BatteryLow} title={t("deload")} count={deloading.length}>
                {deloading.map((a) => (
                  <Row key={a.userId} userId={a.userId} name={a.name} teams={a.teams} />
                ))}
              </Section>
            )}
            </div>
          </>
        )}
      </div>
    </>
  );
}

function Stat({ value, label, tone }: { value: string | number; label: string; tone?: "warn" }) {
  return (
    <div className="t-stat-block t-surface rounded-2xl p-3 text-center ring-1 ring-foreground/5 md:p-5">
      <p className={cn("t-metric text-2xl font-black tabular-nums md:text-4xl", tone === "warn" && "text-amber-600 dark:text-amber-400")}>{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  count,
  empty,
  children,
}: {
  icon: typeof Trophy;
  title: string;
  count: number;
  empty?: string;
  children: ReactNode;
}) {
  return (
    <section className="t-coach-section space-y-2">
      <h2 className="t-section-heading">
        <Icon className="h-4 w-4 text-accent-text" aria-hidden="true" />
        {title}
        {count > 0 && <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground tabular-nums">{count}</span>}
      </h2>
      {count === 0 && empty ? <p className="text-sm text-muted-foreground">{empty}</p> : <div className="space-y-1.5">{children}</div>}
    </section>
  );
}

function Row({ userId, name, teams, children }: { userId: string; name: string; teams: string[]; children?: ReactNode }) {
  return (
    <div className="t-athlete-row t-surface flex min-h-16 items-center gap-2 rounded-xl px-3 py-2 ring-1 ring-foreground/5">
      <Link href={`/client/${userId}`} className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{name}</p>
        <p className="truncate text-xs text-muted-foreground">{teams.join(", ")}</p>
      </Link>
      {children && <div className="flex max-w-[60%] items-center gap-1 text-right">{children}</div>}
    </div>
  );
}
