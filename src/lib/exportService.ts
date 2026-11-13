import db from "@/db";
import { localDate } from "@/lib/dates";

/**
 * GDPR data portability (Art. 20): export all of the user's local data as JSON.
 */
export async function exportJSON(): Promise<string> {
  const [athleteProfiles, exercises, programs, workouts, workoutSets, bodyMetrics, readinessCheckins, nutritionEntries, workoutNotes] =
    await Promise.all([
      db.athleteProfiles.filter((r) => !r.deletedAt).toArray(),
      db.exercises.filter((r) => !r.deletedAt && r.isCustom).toArray(),
      db.programs.filter((r) => !r.deletedAt).toArray(),
      db.workouts.filter((r) => !r.deletedAt).toArray(),
      db.workoutSets.filter((r) => !r.deletedAt).toArray(),
      db.bodyMetrics.filter((r) => !r.deletedAt).toArray(),
      db.readinessCheckins.filter((r) => !r.deletedAt).toArray(),
      db.nutritionEntries.filter((r) => !r.deletedAt).toArray(),
      db.workoutNotes.filter((r) => !r.deletedAt).toArray(),
    ]);

  const data = {
    app: "TrainTrack",
    version: 2,
    exportedAt: new Date().toISOString(),
    athleteProfiles,
    exercises,
    programs,
    workouts,
    workoutSets,
    bodyMetrics,
    readinessCheckins,
    nutritionEntries,
    workoutNotes,
  };

  return JSON.stringify(data, null, 2);
}

function downloadFile(content: string, filename: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function downloadJSONBackup(): Promise<void> {
  const json = await exportJSON();
  const date = localDate();
  downloadFile(json, `traintrack-backup-${date}.json`, "application/json");
}

const csvField = (value: string | number | undefined | null) => {
  const text = value === undefined || value === null ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/**
 * The strength sessions as a CSV in Strong's layout (one row per set, weights
 * in kg, warm-ups marked "W"), which Strong-compatible apps and spreadsheets
 * read, and which TrainTrack can import again.
 */
export function sessionsCsv(
  workouts: { id?: number; date: string; title?: string; durationMin?: number; kind?: string; userId?: string | null }[],
  sets: { workoutId: number; exerciseId: number; setNumber: number; weightKg?: number | null; reps?: number | null; rpe?: number | null; completed: boolean; isWarmup?: boolean }[],
  exerciseName: (id: number) => string
): string {
  const header = ["Date", "Workout Name", "Duration", "Exercise Name", "Set Order", "Weight", "Reps", "Distance", "Seconds", "Notes", "Workout Notes", "RPE"];
  const lines = [header.join(",")];
  for (const w of [...workouts].filter((x) => x.kind !== "cardio").sort((a, b) => a.date.localeCompare(b.date) || (a.id ?? 0) - (b.id ?? 0))) {
    const own = sets
      .filter((s) => s.workoutId === w.id && s.completed)
      .sort((a, b) => Number(!!b.isWarmup) - Number(!!a.isWarmup) || a.setNumber - b.setNumber);
    for (const s of own) {
      lines.push(
        [
          `${w.date} 00:00:00`,
          w.title ?? "",
          w.durationMin ? `${Math.floor(w.durationMin / 60)}h ${w.durationMin % 60}m` : "",
          exerciseName(s.exerciseId),
          s.isWarmup ? "W" : s.setNumber,
          s.weightKg ?? 0,
          s.reps ?? 0,
          0,
          0,
          "",
          "",
          s.rpe ?? "",
        ]
          .map(csvField)
          .join(",")
      );
    }
  }
  return lines.join("\n") + "\n";
}

export async function downloadSessionsCsv(userId: string | null | undefined): Promise<void> {
  const [workouts, sets, exercises] = await Promise.all([
    db.workouts.filter((w) => !w.deletedAt && (!userId || w.userId === userId)).toArray(),
    db.workoutSets.filter((s) => !s.deletedAt && (!userId || s.userId === userId)).toArray(),
    db.exercises.toArray(),
  ]);
  const names = new Map(exercises.map((e) => [e.id, e.name]));
  downloadFile(sessionsCsv(workouts, sets, (id) => names.get(id) ?? "?"), `traintrack-seances-${localDate()}.csv`, "text/csv");
}
