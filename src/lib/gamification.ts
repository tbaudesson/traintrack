import type { Workout, WorkoutSet, BodyMetric, ReadinessCheckin, NutritionEntry } from "@/db";

// ─── XP model ────────────────────────────────────────────────────────
// XP is derived deterministically from the user's logged activity.

const XP_PER_WORKOUT = 50;
const XP_PER_1000_VOLUME = 10; // 10 XP per 1000 kg·reps
const XP_PER_STREAK_DAY = 15;
const XP_PER_BODY_METRIC = 10;
const XP_PER_READINESS = 8;
const XP_PER_NUTRITION_DAY = 8;

export interface GamificationInput {
  workouts: Workout[];
  sets: WorkoutSet[];
  bodyMetrics: BodyMetric[];
  readiness: ReadinessCheckin[];
  nutrition: NutritionEntry[];
}

export interface Badge {
  key: string;
  earned: boolean;
}

export interface GamificationResult {
  xp: number;
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  progressPct: number;
  totalWorkouts: number;
  totalVolume: number;
  currentStreak: number;
  longestStreak: number;
  badges: Badge[];
}

/** Level curve: each level needs progressively more XP. */
function levelForXp(xp: number): { level: number; floor: number; next: number } {
  // XP needed to *reach* level n: 100 * (n-1) * n / 2  (triangular)
  let level = 1;
  while ((100 * level * (level + 1)) / 2 <= xp) level++;
  const floor = (100 * (level - 1) * level) / 2;
  const next = (100 * level * (level + 1)) / 2;
  return { level, floor, next };
}

function computeStreaks(dates: string[]): { current: number; longest: number } {
  const days = [...new Set(dates)].sort();
  if (days.length === 0) return { current: 0, longest: 0 };

  const toNum = (d: string) => Math.floor(new Date(d + "T00:00:00").getTime() / 86400000);
  let longest = 1;
  let run = 1;
  for (let i = 1; i < days.length; i++) {
    if (toNum(days[i]) - toNum(days[i - 1]) === 1) run++;
    else run = 1;
    longest = Math.max(longest, run);
  }

  // current streak counts back from today (or yesterday)
  const todayNum = Math.floor(Date.now() / 86400000);
  const set = new Set(days.map(toNum));
  let current = 0;
  let cursor = set.has(todayNum) ? todayNum : todayNum - 1;
  while (set.has(cursor)) {
    current++;
    cursor--;
  }
  return { current, longest };
}

export function computeGamification(input: GamificationInput): GamificationResult {
  const { workouts, sets, bodyMetrics, readiness, nutrition } = input;

  const totalWorkouts = workouts.length;
  const totalVolume = sets.reduce(
    (a, s) => a + (s.completed && s.weightKg && s.reps ? s.weightKg * s.reps : 0),
    0
  );
  const { current: currentStreak, longest: longestStreak } = computeStreaks(workouts.map((w) => w.date));
  const nutritionDays = new Set(nutrition.map((n) => n.date)).size;

  const xp = Math.round(
    totalWorkouts * XP_PER_WORKOUT +
      (totalVolume / 1000) * XP_PER_1000_VOLUME +
      longestStreak * XP_PER_STREAK_DAY +
      bodyMetrics.length * XP_PER_BODY_METRIC +
      readiness.length * XP_PER_READINESS +
      nutritionDays * XP_PER_NUTRITION_DAY
  );

  const { level, floor, next } = levelForXp(xp);
  const xpIntoLevel = xp - floor;
  const xpForNextLevel = next - floor;
  const progressPct = Math.min(100, Math.round((xpIntoLevel / xpForNextLevel) * 100));

  // Best estimated 1RM achieved (for PR badges)
  const bestE1rm = sets.reduce((max, s) => {
    if (!s.weightKg || !s.reps) return max;
    return Math.max(max, Math.round(s.weightKg * (1 + s.reps / 30)));
  }, 0);

  const badges: Badge[] = [
    { key: "first_workout", earned: totalWorkouts >= 1 },
    { key: "workouts_10", earned: totalWorkouts >= 10 },
    { key: "workouts_50", earned: totalWorkouts >= 50 },
    { key: "workouts_100", earned: totalWorkouts >= 100 },
    { key: "streak_7", earned: longestStreak >= 7 },
    { key: "streak_30", earned: longestStreak >= 30 },
    { key: "volume_100k", earned: totalVolume >= 100_000 },
    { key: "strong_100", earned: bestE1rm >= 100 },
    { key: "first_metric", earned: bodyMetrics.length >= 1 },
    { key: "readiness_week", earned: new Set(readiness.map((r) => r.date)).size >= 7 },
    { key: "nutrition_week", earned: nutritionDays >= 7 },
    { key: "level_5", earned: level >= 5 },
  ];

  return {
    xp,
    level,
    xpIntoLevel,
    xpForNextLevel,
    progressPct,
    totalWorkouts,
    totalVolume: Math.round(totalVolume),
    currentStreak,
    longestStreak,
    badges,
  };
}
