import db from "@/db";
import { localDate } from "@/lib/dates";

type Owned = { userId?: string | null; deletedAt?: string | null };

/**
 * Whether a row is the signed-in person's own data. A coach's device also holds
 * their clients' rows (synced for coaching), which are not theirs to export.
 * Rows not yet tied to an account (created before signing in) are this
 * person's. Signed out, everything on the device is theirs.
 */
export function isOwnRow(row: Owned, userId: string | null | undefined): boolean {
  if (row.deletedAt) return false;
  if (!userId) return true;
  return !row.userId || row.userId === userId;
}

/**
 * GDPR data portability (Art. 20): export the signed-in person's data as JSON
 * — their own rows only, never their clients'. A program a coach assigned to
 * them is included (it is their plan); a message is included when they sent or
 * received it.
 */
export async function exportJSON(userId?: string | null): Promise<string> {
  const own = <T extends Owned>(rows: T[]) => rows.filter((r) => isOwnRow(r, userId));
  const [
    athleteProfiles,
    exercises,
    programs,
    workouts,
    workoutSets,
    bodyMetrics,
    readinessCheckins,
    nutritionEntries,
    workoutNotes,
    hydrationLogs,
    messages,
    healthMetrics,
    competitionResults,
    horses,
    horseSessions,
    goals,
  ] = await Promise.all([
    db.athleteProfiles.toArray().then(own),
    db.exercises.toArray().then((rows) => own(rows).filter((r) => r.isCustom)),
    db.programs
      .toArray()
      .then((rows) => rows.filter((r) => !r.deletedAt && (isOwnRow(r, userId) || (!!userId && r.assignedToUserId === userId)))),
    db.workouts.toArray().then(own),
    db.workoutSets.toArray().then(own),
    db.bodyMetrics.toArray().then(own),
    db.readinessCheckins.toArray().then(own),
    db.nutritionEntries.toArray().then(own),
    db.workoutNotes.toArray().then(own),
    db.hydrationLogs.toArray().then(own),
    db.messages
      .toArray()
      .then((rows) => rows.filter((r) => !r.deletedAt && (isOwnRow(r, userId) || (!!userId && r.recipientId === userId)))),
    db.healthMetrics.toArray().then(own),
    db.competitionResults.toArray().then(own),
    db.horses.toArray().then(own),
    db.horseSessions.toArray().then(own),
    db.goals.toArray().then(own),
  ]);

  // Device bookkeeping (sync state) is not personal data.
  const strip = <T extends object>(rows: T[]) =>
    rows.map((r) => {
      const { _dirty, syncedAt, ...rest } = r as T & { _dirty?: number; syncedAt?: string | null };
      void _dirty;
      void syncedAt;
      return rest;
    });

  const data = {
    app: "TrainTrack",
    version: 3,
    exportedAt: new Date().toISOString(),
    athleteProfiles: strip(athleteProfiles),
    exercises: strip(exercises),
    programs: strip(programs),
    workouts: strip(workouts),
    workoutSets: strip(workoutSets),
    bodyMetrics: strip(bodyMetrics),
    readinessCheckins: strip(readinessCheckins),
    nutritionEntries: strip(nutritionEntries),
    workoutNotes: strip(workoutNotes),
    hydrationLogs: strip(hydrationLogs),
    messages: strip(messages),
    healthMetrics: strip(healthMetrics),
    competitionResults: strip(competitionResults),
    horses: strip(horses),
    horseSessions: strip(horseSessions),
    goals: strip(goals),
  };

  return JSON.stringify(data, null, 2);
}

/** Hand a text file to the browser to save (or, for a calendar, to open). */
export function downloadFile(content: string, filename: string, mime: string): void {
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

export async function downloadJSONBackup(userId?: string | null): Promise<void> {
  const json = await exportJSON(userId);
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
    db.workouts.filter((w) => isOwnRow(w, userId)).toArray(),
    db.workoutSets.filter((s) => isOwnRow(s, userId)).toArray(),
    db.exercises.toArray(),
  ]);
  const names = new Map(exercises.map((e) => [e.id, e.name]));
  downloadFile(sessionsCsv(workouts, sets, (id) => names.get(id) ?? "?"), `traintrack-seances-${localDate()}.csv`, "text/csv");
}
