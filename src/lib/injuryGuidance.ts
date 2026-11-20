import { INJURY_AREAS } from "./injuries";
import type { PainArea, PainReport } from "./pain";

/**
 * How the app follows an injury: when a pain is strong, how long a pain is
 * remembered, how loads come back after it, when to say "see someone", and
 * the gentle moves offered for each area. No figure lives here: they come
 * from the references an admin keeps in the app settings (migration 058
 * seeds them). Without them, the app follows nothing by itself.
 */
export interface InjuryGuidance {
  pain: {
    /** From this level on (0-10): stop the exercise, see a professional, offer to declare the injury. */
    severe: number;
    /** From this level on, the exercise that hurt comes back lighter. */
    moderate: number;
    /** The load of an exercise that hurt at a moderate level, against its usual one. */
    moderateLoad: number;
    /** Days a pain on an exercise is remembered, to warn before loading it again. */
    recentDays: number;
    /** Days of pains the coach's lists look at. */
    coachDays: number;
  };
  /** The return after an injury: one load a week, the last one full. */
  return: {
    loads: number[];
    /** A pain on the area above this level within `holdDays` holds the return back a week. */
    holdAbovePain: number;
    holdDays: number;
  };
  /** A pain coming back: from `reports` reports of at least `minLevel` within `days`, see someone. */
  persistent: { days: number; reports: number; minLevel: number };
  /** Gentle moves offered while an area heals (keys of the warm-ups and stretches). */
  gentle: Partial<Record<PainArea, string[]>>;
}

export const INJURY_GUIDANCE_KEY = "injury_guidance";

const num = (v: unknown, lo: number, hi: number): v is number => typeof v === "number" && Number.isFinite(v) && v >= lo && v <= hi;

/** References read from the settings, or null when missing or not holding together. */
export function parseInjuryGuidance(text: string | null | undefined, moves?: readonly string[]): InjuryGuidance | null {
  if (!text) return null;
  let g: InjuryGuidance;
  try {
    g = JSON.parse(text);
  } catch {
    return null;
  }
  if (!g?.pain || !g.return || !g.persistent || !g.gentle) return null;
  const p = g.pain;
  if (!num(p.severe, 1, 10) || !num(p.moderate, 1, 10) || p.moderate > p.severe || !num(p.moderateLoad, 0.1, 1)) return null;
  if (!num(p.recentDays, 1, 90) || !num(p.coachDays, 1, 90)) return null;
  const r = g.return;
  if (!Array.isArray(r.loads) || !r.loads.length || r.loads.length > 12 || !r.loads.every((l) => num(l, 0.1, 1))) return null;
  if (r.loads.some((l, i) => i > 0 && l < r.loads[i - 1]) || r.loads[r.loads.length - 1] !== 1) return null;
  if (!num(r.holdAbovePain, 0, 10) || !num(r.holdDays, 1, 30)) return null;
  const s = g.persistent;
  if (!num(s.days, 1, 90) || !num(s.reports, 1, 20) || !num(s.minLevel, 1, 10)) return null;
  for (const [area, keys] of Object.entries(g.gentle)) {
    if (!INJURY_AREAS.includes(area as PainArea) || !Array.isArray(keys)) return null;
    if (moves && !keys.every((k) => moves.includes(k))) return null;
  }
  return g;
}

const DAY_MS = 86_400_000;
const daysBetween = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);
const within = (date: string, today: string, days: number) => {
  const d = daysBetween(date, today);
  return d >= 0 && d <= days;
};

/** The areas whose pain keeps coming back, with the number of reports, worst first. */
export function persistentPains(g: InjuryGuidance, reports: PainReport[], today: string): { area: PainArea; reports: number; worst: number }[] {
  const byArea = new Map<PainArea, number[]>();
  for (const r of reports) {
    if (r.area === "other" || r.level < g.persistent.minLevel || !within(r.date, today, g.persistent.days)) continue;
    byArea.set(r.area, [...(byArea.get(r.area) ?? []), r.level]);
  }
  return [...byArea.entries()]
    .filter(([, levels]) => levels.length >= g.persistent.reports)
    .map(([area, levels]) => ({ area, reports: levels.length, worst: Math.max(...levels) }))
    .sort((a, b) => b.worst - a.worst);
}

/** Whether a recent pain on an area holds its return back. */
export function returnHeld(g: InjuryGuidance, reports: PainReport[], area: PainArea, today: string): boolean {
  return reports.some((r) => r.area === area && r.level > g.return.holdAbovePain && within(r.date, today, g.return.holdDays));
}
