"use client";

import { useTranslations } from "next-intl";
import type { Sport } from "@/db";
import { useAppPrefs } from "@/hooks/useAppPrefs";
import { useTimedGuidance } from "@/hooks/useTimedGuidance";
import { useMobilityGuidance } from "@/hooks/useMobilityGuidance";
import { useTrainablePrograms } from "@/hooks/usePrograms";
import { savePlanB } from "@/hooks/useSportChoice";
import { CARDIO_MINUTES, PLAN_B_KINDS, type PlanB } from "@/lib/planB";
import { BOXING_FOCUS, INTERVAL_FOCUSES, PLAN_FOCUSES, type PlanFocus } from "@/lib/intervals";
import { useBoxingGuidance } from "@/hooks/useBoxingGuidance";
import { DISTANCE_SPORTS } from "@/lib/cardio";
import { cn } from "@/lib/utils";
import { modesOf, type MobilityMode } from "@/lib/mobility";


/**
 * One's plan B, chosen once: what the session card offers on a day without
 * time for the planned session (or with nothing planned). A timed session, a
 * mobility routine, an outing of a given length, or a day of a program.
 */
export function PlanBEditor() {
  const t = useTranslations("planB");
  const ti = useTranslations("intervals");
  const tm = useTranslations("mobility");
  const tc = useTranslations("cardio");
  const prefs = useAppPrefs();
  const timed = useTimedGuidance();
  const mobility = useMobilityGuidance();
  const programs = useTrainablePrograms();
  const plan = prefs.planB;
  const set = (planB: PlanB | null) => void savePlanB(planB);

  const chip = (on: boolean) => cn("min-h-11 rounded-full border px-3 text-sm font-medium", on ? "border-accent-500 bg-accent-500 text-white" : "border-border hover:bg-muted");
  const timedMinutes = timed?.minutes ?? [10, 15, 20];
  // Boxing rounds, once their reference is there, with their own lengths.
  const boxing = useBoxingGuidance();
  const focuses = boxing ? PLAN_FOCUSES : INTERVAL_FOCUSES;
  const minutesOf = (f: PlanFocus) => (f === BOXING_FOCUS && boxing ? boxing.minutes : timedMinutes);
  const mobilityMinutes = (m: MobilityMode) => mobility?.minutes[m] ?? [5, 10, 15];
  // The modes the reference holds (yoga, tai-chi once their migrations are applied).
  const modes: MobilityMode[] = mobility ? modesOf(mobility) : ["warmup", "stretch"];

  // A kind chosen: its first sensible settings, changed below.
  const start = (kind: PlanB["kind"]) => {
    if (kind === "timed") set({ kind, focus: "full", minutes: timedMinutes.includes(15) ? 15 : timedMinutes[0] });
    if (kind === "mobility") set({ kind, mode: "stretch", minutes: mobilityMinutes("stretch")[0] });
    if (kind === "cardio") set({ kind, sport: "run", minutes: 20 });
    if (kind === "program" && programs[0]?.uuid) set({ kind, programUuid: programs[0].uuid, dayIndex: 0 });
  };
  const program = plan?.kind === "program" ? programs.find((p) => p.uuid === plan.programUuid) : undefined;

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">{t("hint")}</p>
      <div className="flex flex-wrap gap-2" role="group" aria-label={t("kind")}>
        <button type="button" aria-pressed={!plan} onClick={() => set(null)} className={chip(!plan)}>{t("none")}</button>
        {PLAN_B_KINDS.filter((k) => k !== "program" || programs.length > 0).map((k) => (
          <button key={k} type="button" aria-pressed={plan?.kind === k} onClick={() => plan?.kind !== k && start(k)} className={chip(plan?.kind === k)}>
            {t(`kind_${k}`)}
          </button>
        ))}
      </div>

      {plan?.kind === "timed" && (
        <>
          <Row label={ti("focus")}>
            {focuses.map((f) => <button key={f} type="button" aria-pressed={plan.focus === f} onClick={() => set({ ...plan, focus: f, minutes: minutesOf(f).includes(plan.minutes) ? plan.minutes : minutesOf(f)[Math.floor(minutesOf(f).length / 2)] })} className={chip(plan.focus === f)}>{ti(`focus_${f}`)}</button>)}
          </Row>
          <Row label={t("minutes")}>
            {minutesOf(plan.focus).map((m) => <button key={m} type="button" aria-pressed={plan.minutes === m} onClick={() => set({ ...plan, minutes: m })} className={chip(plan.minutes === m)}>{t("min", { m })}</button>)}
          </Row>
        </>
      )}

      {plan?.kind === "mobility" && (
        <>
          <Row label={tm("mode")}>
            {modes.map((m) => <button key={m} type="button" aria-pressed={plan.mode === m} onClick={() => set({ ...plan, mode: m, minutes: mobilityMinutes(m).includes(plan.minutes) ? plan.minutes : mobilityMinutes(m)[0] })} className={chip(plan.mode === m)}>{tm(`mode_${m}`)}</button>)}
          </Row>
          <Row label={t("minutes")}>
            {mobilityMinutes(plan.mode).map((m) => <button key={m} type="button" aria-pressed={plan.minutes === m} onClick={() => set({ ...plan, minutes: m })} className={chip(plan.minutes === m)}>{t("min", { m })}</button>)}
          </Row>
        </>
      )}

      {plan?.kind === "cardio" && (
        <>
          <Row label={tc("sport")}>
            {DISTANCE_SPORTS.filter((s) => s !== "other").map((s: Sport) => <button key={s} type="button" aria-pressed={plan.sport === s} onClick={() => set({ ...plan, sport: s })} className={chip(plan.sport === s)}>{tc(`sport_${s}`)}</button>)}
          </Row>
          <Row label={t("minutes")}>
            {CARDIO_MINUTES.map((m) => <button key={m} type="button" aria-pressed={plan.minutes === m} onClick={() => set({ ...plan, minutes: m })} className={chip(plan.minutes === m)}>{t("min", { m })}</button>)}
          </Row>
        </>
      )}

      {plan?.kind === "program" && (
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="block text-sm font-medium">
            {t("program")}
            <select
              value={plan.programUuid}
              onChange={(e) => set({ ...plan, programUuid: e.target.value, dayIndex: 0 })}
              className="mt-1 h-11 w-full rounded-lg border border-input bg-card px-3 text-base"
            >
              {programs.filter((p) => p.uuid).map((p) => <option key={p.uuid} value={p.uuid}>{p.name}</option>)}
            </select>
          </label>
          <label className="block text-sm font-medium">
            {t("day")}
            <select
              value={plan.dayIndex}
              onChange={(e) => set({ ...plan, dayIndex: Number(e.target.value) })}
              className="mt-1 h-11 w-full rounded-lg border border-input bg-card px-3 text-base"
            >
              {(program?.structure ?? []).map((d, i) => <option key={i} value={i}>{d.name}</option>)}
            </select>
          </label>
        </div>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-sm font-medium">{label}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}
