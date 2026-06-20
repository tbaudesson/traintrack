import { useLiveQuery } from "dexie-react-hooks";
import db, { type NutritionEntry, type Meal } from "@/db";
import { getCurrentUserIdSync } from "@/db";
import { schedulePush } from "@/lib/syncEngine";

/** Nutrition entries for a given date (default today) for a user. */
export function useNutritionForDate(date: string, userId?: string) {
  return useLiveQuery(async () => {
    const uid = userId ?? getCurrentUserIdSync();
    const all = await db.nutritionEntries.filter((n) => !n.deletedAt && n.date === date).toArray();
    const mine = uid ? all.filter((n) => n.userId === uid) : all;
    return mine.sort((a, b) => (a.id ?? 0) - (b.id ?? 0));
  }, [date, userId]) ?? [];
}

/** All of the user's nutrition entries (for gamification / stats). */
export function useAllNutrition(userId?: string) {
  return useLiveQuery(async () => {
    const uid = userId ?? getCurrentUserIdSync();
    const all = await db.nutritionEntries.filter((n) => !n.deletedAt).toArray();
    return uid ? all.filter((n) => n.userId === uid) : all;
  }, [userId]) ?? [];
}

export interface MacroTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export function sumMacros(entries: NutritionEntry[]): MacroTotals {
  return entries.reduce<MacroTotals>(
    (acc, e) => ({
      calories: acc.calories + (e.calories ?? 0),
      protein: acc.protein + (e.proteinG ?? 0),
      carbs: acc.carbs + (e.carbsG ?? 0),
      fat: acc.fat + (e.fatG ?? 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
}

export async function addNutritionEntry(data: {
  date: string;
  meal?: Meal;
  name: string;
  calories?: number;
  proteinG?: number;
  carbsG?: number;
  fatG?: number;
}): Promise<number> {
  const now = new Date().toISOString();
  const id = (await db.nutritionEntries.add({
    ...data,
    uuid: crypto.randomUUID(),
    userId: getCurrentUserIdSync(),
    _dirty: 1,
    createdAt: now,
    updatedAt: now,
  })) as number;
  schedulePush();
  return id;
}

export async function deleteNutritionEntry(id: number): Promise<void> {
  await db.nutritionEntries.update(id, { deletedAt: new Date().toISOString(), _dirty: 1 });
  schedulePush();
}
