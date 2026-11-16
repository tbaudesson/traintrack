import type { Sex, TrainingGoal } from "@/db";
import type { NutritionGuidance } from "./sportNutrition";

export interface NutritionInput {
  weightKg: number;
  heightCm: number;
  age: number;
  sex?: Sex;
  goal?: TrainingGoal;
  /** Training days a week, from the week plan. */
  trainingDays: number;
}

export interface NutritionPlan {
  /** Basal metabolic rate (Mifflin-St Jeor), kcal. */
  bmr: number;
  activity: number;
  /** Calories to keep the weight, kcal. */
  maintenance: number;
  /** Change for the goal, from the references (−0.2 = 20 % less). */
  adjustment: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  water: number;
}

/** Activity factor from the training days a week, on top of an ordinary day: the first row of the references that fits. */
export function activityFactor(g: NutritionGuidance, days: number): number {
  const rows = [...g.targets.activity].sort((a, b) => a.upToDays - b.upToDays);
  return (rows.find((r) => days <= r.upToDays) ?? rows[rows.length - 1]).factor;
}

/**
 * Daily targets from the body and the goal: calories from the basal rate
 * (the Mifflin-St Jeor equation) times the activity, adjusted for the goal;
 * protein by the kilo for the goal, fat at its share of the calories,
 * carbohydrates the rest; water by the kilo. Every figure but the equation's
 * comes from the references an admin keeps. A starting point, not a prescription.
 */
export function nutritionPlan(g: NutritionGuidance, input: NutritionInput): NutritionPlan {
  const sexTerm = input.sex === "male" ? 5 : input.sex === "female" ? -161 : -78;
  const bmr = Math.round(10 * input.weightKg + 6.25 * input.heightCm - 5 * input.age + sexTerm);
  const activity = activityFactor(g, input.trainingDays);
  const maintenance = Math.round(bmr * activity);
  const goal = input.goal ?? "general_fitness";
  const adjustment = g.targets.goalAdjustment[goal];
  const calories = Math.round((maintenance * (1 + adjustment)) / 10) * 10;
  const protein = Math.round(input.weightKg * g.targets.proteinPerKg[goal]);
  const fat = Math.round((calories * g.fat.share) / 9);
  const carbs = Math.max(0, Math.round((calories - protein * 4 - fat * 9) / 4));
  const water = Math.round((input.weightKg * g.targets.waterMlPerKg) / 100) * 100;
  return { bmr, activity, maintenance, adjustment, calories, protein, carbs, fat, water };
}

/** Age in full years on a date, from a birth date (YYYY-MM-DD). */
export function ageOn(birthDate: string, today: string): number {
  const [by, bm, bd] = birthDate.split("-").map(Number);
  const [ty, tm, td] = today.split("-").map(Number);
  return ty - by - (tm < bm || (tm === bm && td < bd) ? 1 : 0);
}
