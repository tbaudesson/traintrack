import type { HealthMetric } from "@/db";

/**
 * Recovery signals from the body, read against the athlete's own usual values
 * (never against a norm): the resting heart rate a few beats above its usual
 * level, or the heart-rate variability well below, often go with fatigue, an
 * illness coming or poor sleep. A hint beside the check-in, never a verdict:
 * one reading means little, and the app says so.
 */

const DAY_MS = 86_400_000;
const addDays = (date: string, n: number) => new Date(Date.parse(`${date}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

/** Above the usual resting HR by this many beats: worth a note. */
export const RESTING_HR_RISE = 5;
/** Below the usual HRV by this share: worth a note. */
export const HRV_DROP = 0.15;
/** Readings needed to know what is usual. */
const MIN_BASELINE = 4;

export interface BodySignal {
  /** The latest reading, of the last three days. */
  value: number;
  date: string;
  /** The mean of the 28 days before it. */
  baseline: number;
  /** value − baseline (beats), or (value − baseline) / baseline (HRV). */
  delta: number;
  flagged: boolean;
}

export interface BodySignals {
  restingHr: BodySignal | null;
  hrv: BodySignal | null;
}

function signal(metrics: Pick<HealthMetric, "date" | "restingHr" | "hrv">[], field: "restingHr" | "hrv", today: string): BodySignal | null {
  const readings = metrics
    .filter((m) => m[field] && m[field]! > 0 && m.date <= today)
    .sort((a, b) => a.date.localeCompare(b.date));
  const last = readings.at(-1);
  if (!last || last.date < addDays(today, -2)) return null;
  const before = readings.filter((m) => m.date < last.date && m.date >= addDays(last.date, -28)).map((m) => m[field]!);
  if (before.length < MIN_BASELINE) return null;
  const baseline = mean(before);
  const value = last[field]!;
  if (field === "restingHr") {
    const delta = Math.round((value - baseline) * 10) / 10;
    return { value, date: last.date, baseline: Math.round(baseline), delta, flagged: delta >= RESTING_HR_RISE };
  }
  const delta = (value - baseline) / baseline;
  return { value, date: last.date, baseline: Math.round(baseline), delta, flagged: delta <= -HRV_DROP };
}

export function bodySignals(metrics: Pick<HealthMetric, "date" | "restingHr" | "hrv">[], today: string): BodySignals {
  return { restingHr: signal(metrics, "restingHr", today), hrv: signal(metrics, "hrv", today) };
}

/**
 * Banister's training impulse for a session with an average heart rate: its
 * minutes weighted by how close that rate is to the maximum, from rest. A
 * measure of the effort the heart made; with the average only, an estimate.
 */
export function trimp(input: { minutes: number; avgHr: number; restHr: number; maxHr: number; sex?: "male" | "female" | string | null }): number | null {
  const { minutes, avgHr, restHr, maxHr } = input;
  if (!(minutes > 0) || !(maxHr > restHr) || !(avgHr > restHr)) return null;
  const ratio = Math.min(1, (avgHr - restHr) / (maxHr - restHr));
  const [a, b] = input.sex === "female" ? [0.86, 1.67] : [0.64, 1.92];
  return Math.round(minutes * ratio * a * Math.exp(b * ratio));
}

/** The maximum heart rate an age gives (Tanaka: 208 − 0.7 × age), when none was measured. */
export const maxHrForAge = (age: number) => Math.round(208 - 0.7 * age);

/**
 * Power samples at their times (seconds) as one value a second: a sample
 * holds until the next one, for five seconds at most; a longer gap (a stop,
 * a lost signal) counts as no power.
 */
export function powerPerSecond(samples: { t: number; w: number }[]): number[] {
  const sorted = samples.filter((s) => Number.isFinite(s.t) && s.w >= 0 && s.w < 2500).sort((a, b) => a.t - b.t);
  if (sorted.length < 2) return [];
  const t0 = Math.round(sorted[0].t);
  const out: number[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const from = Math.round(sorted[i].t) - t0;
    const next = i + 1 < sorted.length ? Math.round(sorted[i + 1].t) - t0 : from + 1;
    for (let s = from; s < next; s++) out[s] = s - from < 5 ? sorted[i].w : 0;
  }
  return Array.from(out, (w) => w ?? 0);
}

/**
 * Normalized power: the 30-second rolling mean of the power, raised to the
 * fourth power, averaged, and its fourth root — the steady power the ride's
 * ups and downs cost. Samples one second apart; null under ten minutes.
 */
export function normalizedPower(watts: number[]): number | null {
  if (watts.length < 600) return null;
  const rolling: number[] = [];
  let sum = 0;
  for (let i = 0; i < watts.length; i++) {
    sum += watts[i];
    if (i >= 30) sum -= watts[i - 30];
    if (i >= 29) rolling.push(sum / 30);
  }
  const fourth = rolling.reduce((a, p) => a + p ** 4, 0) / rolling.length;
  return Math.round(fourth ** 0.25);
}
