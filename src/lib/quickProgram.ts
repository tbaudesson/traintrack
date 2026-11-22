import type { ProgramDay, Sport } from "@/db";

/** What a new program trains: lifting, or one endurance sport. */
export type QuickKind = "strength" | Sport;

/**
 * The days of a program created in three answers: as many days as trained a
 * week, named in order, empty strength days or sessions of the sport chosen,
 * ready to fill in the editor.
 */
export function quickProgramDays(kind: QuickKind, daysPerWeek: number, dayWord: string): ProgramDay[] {
  const n = Math.min(7, Math.max(1, Math.round(daysPerWeek) || 1));
  return Array.from({ length: n }, (_, i) => ({
    name: `${dayWord} ${i + 1}`,
    exercises: [],
    ...(kind === "strength" ? {} : { cardio: { sport: kind } }),
  }));
}
