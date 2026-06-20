import db from "@/db";

/**
 * GDPR data portability (Art. 20): export all of the user's local data as JSON.
 */
export async function exportJSON(): Promise<string> {
  const [athleteProfiles, exercises, programs, workouts, workoutSets, bodyMetrics, readinessCheckins, nutritionEntries] =
    await Promise.all([
      db.athleteProfiles.filter((r) => !r.deletedAt).toArray(),
      db.exercises.filter((r) => !r.deletedAt && r.isCustom).toArray(),
      db.programs.filter((r) => !r.deletedAt).toArray(),
      db.workouts.filter((r) => !r.deletedAt).toArray(),
      db.workoutSets.filter((r) => !r.deletedAt).toArray(),
      db.bodyMetrics.filter((r) => !r.deletedAt).toArray(),
      db.readinessCheckins.filter((r) => !r.deletedAt).toArray(),
      db.nutritionEntries.filter((r) => !r.deletedAt).toArray(),
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
  const date = new Date().toISOString().split("T")[0];
  downloadFile(json, `traintrack-backup-${date}.json`, "application/json");
}
