import type { Sex, TrainingGoal } from "@/db";

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
  /** Change for the goal: −0.2 to lose fat, +0.1 to gain muscle. */
  adjustment: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  water: number;
}

/** Activity factor from the training days a week, on top of an ordinary day. */
export function activityFactor(days: number): number {
  if (days <= 0) return 1.2;
  if (days <= 2) return 1.375;
  if (days <= 4) return 1.55;
  if (days <= 6) return 1.725;
  return 1.9;
}

const ADJUST: Record<TrainingGoal, number> = { fat_loss: -0.2, hypertrophy: 0.1, strength: 0.05, endurance: 0.05, general_fitness: 0 };
const PROTEIN_PER_KG: Record<TrainingGoal, number> = { fat_loss: 2, hypertrophy: 1.8, strength: 1.8, endurance: 1.4, general_fitness: 1.6 };

/**
 * Daily targets from the body and the goal: calories from the basal rate
 * (Mifflin-St Jeor) times the activity, adjusted for the goal; protein per
 * kilo for the goal, fat at a quarter of the calories, carbohydrates the rest;
 * water at 35 ml a kilo. A starting point to adjust, not a prescription.
 */
export function nutritionPlan(input: NutritionInput): NutritionPlan {
  const sexTerm = input.sex === "male" ? 5 : input.sex === "female" ? -161 : -78;
  const bmr = Math.round(10 * input.weightKg + 6.25 * input.heightCm - 5 * input.age + sexTerm);
  const activity = activityFactor(input.trainingDays);
  const maintenance = Math.round(bmr * activity);
  const goal = input.goal ?? "general_fitness";
  const adjustment = ADJUST[goal];
  const calories = Math.round((maintenance * (1 + adjustment)) / 10) * 10;
  const protein = Math.round(input.weightKg * PROTEIN_PER_KG[goal]);
  const fat = Math.round((calories * 0.25) / 9);
  const carbs = Math.max(0, Math.round((calories - protein * 4 - fat * 9) / 4));
  const water = Math.round((input.weightKg * 35) / 100) * 100;
  return { bmr, activity, maintenance, adjustment, calories, protein, carbs, fat, water };
}

/** Age in full years on a date, from a birth date (YYYY-MM-DD). */
export function ageOn(birthDate: string, today: string): number {
  const [by, bm, bd] = birthDate.split("-").map(Number);
  const [ty, tm, td] = today.split("-").map(Number);
  return ty - by - (tm < bm || (tm === bm && td < bd) ? 1 : 0);
}
