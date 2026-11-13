import { mondayOfDate } from "./weekPlan";

const DAY_MS = 86400000;
const toDay = (date: string) => Date.UTC(+date.slice(0, 4), +date.slice(5, 7) - 1, +date.slice(8, 10)) / DAY_MS;
const fromDay = (day: number) => new Date(day * DAY_MS).toISOString().slice(0, 10);

export interface WeekAdherence {
  monday: string;
  /** Days trained that week. */
  done: number;
  /** Training days planned so far that week; null when the athlete has no plan. */
  planned: number | null;
}

export type AdherenceStatus = "good" | "watch" | "alert";

export interface Adherence {
  weeks: WeekAdherence[];
  /** Share of the planned days trained over the weeks, 0–1; null without a plan. */
  rate: number | null;
  daysSinceLast: number | null;
  /** Average RPE of the working sets of the last seven days. */
  recentRpe: number | null;
  status: AdherenceStatus;
}

/**
 * How regularly an athlete trains, for the coach: the days trained each week
 * against the days planned (up to today for the current week), how long since
 * the last session, and how hard the last week felt. "alert" after a week
 * without training, "watch" after four days or under 60 % of the plan.
 */
export function adherence(input: {
  today: string;
  workouts: { id?: number; date: string }[];
  sets?: { workoutId: number; completed: boolean; rpe?: number | null; isWarmup?: boolean }[];
  trainingDays?: number[];
  weeks?: number;
}): Adherence {
  const today = toDay(input.today);
  const plan = input.trainingDays?.length ? input.trainingDays : null;
  const trained = new Set(input.workouts.map((w) => w.date).filter((d) => toDay(d) <= today));
  const thisMonday = toDay(mondayOfDate(input.today));

  const weeks: WeekAdherence[] = Array.from({ length: input.weeks ?? 4 }, (_, i) => {
    const monday = thisMonday - ((input.weeks ?? 4) - 1 - i) * 7;
    let done = 0;
    let planned = 0;
    for (let d = 0; d < 7; d++) {
      const day = monday + d;
      if (day > today) break;
      if (trained.has(fromDay(day))) done++;
      if (plan?.includes(d + 1)) planned++;
    }
    return { monday: fromDay(monday), done, planned: plan ? planned : null };
  });

  const planned = weeks.reduce((sum, w) => sum + (w.planned ?? 0), 0);
  const rate = plan && planned > 0 ? Math.min(1, weeks.reduce((sum, w) => sum + Math.min(w.done, w.planned ?? 0), 0) / planned) : null;

  const last = [...trained].sort().pop();
  const daysSinceLast = last ? today - toDay(last) : null;

  const recentIds = new Set(input.workouts.filter((w) => today - toDay(w.date) < 7 && toDay(w.date) <= today).map((w) => w.id));
  const rpes = (input.sets ?? [])
    // Only the 1–10 scale: a slip like "66" in the RPE box must not skew the average.
    .filter((s) => s.completed && !s.isWarmup && s.rpe && s.rpe >= 1 && s.rpe <= 10 && recentIds.has(s.workoutId))
    .map((s) => s.rpe!);
  const recentRpe = rpes.length ? Math.round((rpes.reduce((a, b) => a + b, 0) / rpes.length) * 10) / 10 : null;

  const status: AdherenceStatus =
    daysSinceLast === null || daysSinceLast >= 7 ? "alert" : daysSinceLast >= 4 || (rate !== null && rate < 0.6) ? "watch" : "good";

  return { weeks, rate, daysSinceLast, recentRpe, status };
}

const RANK: Record<AdherenceStatus, number> = { alert: 0, watch: 1, good: 2 };

/** Athletes who need a word from the coach first. */
export function byAttention<T>(items: T[], statusOf: (item: T) => AdherenceStatus | undefined): T[] {
  return [...items].sort((a, b) => RANK[statusOf(a) ?? "good"] - RANK[statusOf(b) ?? "good"]);
}
