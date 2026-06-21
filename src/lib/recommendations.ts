/**
 * Simple rules-based recommendations — no AI. Looks at recent training,
 * readiness and nutrition and suggests what to do today / next.
 */

export type RecKind =
  | "recover"
  | "train"
  | "rest"
  | "protein"
  | "calories"
  | "consistency"
  | "keepGoing";

export type RecTone = "good" | "info" | "warn";

export interface Recommendation {
  kind: RecKind;
  tone: RecTone;
  params?: Record<string, string | number>;
}

export interface RecInput {
  /** Whole days since the most recent workout (null if never). */
  daysSinceLastWorkout: number | null;
  /** Number of workouts in the last 7 days. */
  workoutsLast7: number;
  /** Whether a workout was logged today. */
  trainedToday: boolean;
  /** Current consecutive-day streak. */
  streak: number;
  /** Today's readiness score 0–100, or null if not checked in. */
  readinessScore: number | null;
  /** Protein eaten today (g) and the target, if set. */
  proteinToday: number;
  proteinTarget?: number;
  /** Calories eaten today and the target, if set. */
  caloriesToday: number;
  caloriesTarget?: number;
}

/**
 * Returns recommendations in priority order. Caller typically shows the top 1–3.
 */
export function buildRecommendations(i: RecInput): Recommendation[] {
  const recs: Recommendation[] = [];

  // 1. Low readiness → take it easy.
  if (i.readinessScore != null && i.readinessScore < 50) {
    recs.push({ kind: "recover", tone: "warn", params: { score: i.readinessScore } });
  }

  // 2. Long lay-off → nudge to train (unless already trained today).
  if (!i.trainedToday && i.daysSinceLastWorkout != null && i.daysSinceLastWorkout >= 3) {
    recs.push({ kind: "train", tone: "info", params: { days: i.daysSinceLastWorkout } });
  }

  // 3. Long streak with no rest → suggest a rest day.
  if (i.streak >= 6) {
    recs.push({ kind: "rest", tone: "info", params: { days: i.streak } });
  }

  // 4. Trained today but protein is low → eat more protein to recover.
  if (i.trainedToday && i.proteinTarget && i.proteinToday < i.proteinTarget * 0.7) {
    const remaining = Math.max(0, Math.round(i.proteinTarget - i.proteinToday));
    recs.push({ kind: "protein", tone: "warn", params: { remaining } });
  }

  // 5. Well under the calorie target late in the day → fuel up.
  if (i.caloriesTarget && i.caloriesToday > 0 && i.caloriesToday < i.caloriesTarget * 0.5) {
    recs.push({ kind: "calories", tone: "info" });
  }

  // 6. No training this week → consistency nudge.
  if (i.workoutsLast7 === 0) {
    recs.push({ kind: "consistency", tone: "warn" });
  }

  // 7. Everything looks good → positive reinforcement.
  if (recs.length === 0) {
    if (i.workoutsLast7 >= 3) {
      recs.push({ kind: "keepGoing", tone: "good", params: { count: i.workoutsLast7 } });
    } else {
      recs.push({ kind: "consistency", tone: "info" });
    }
  }

  return recs;
}
