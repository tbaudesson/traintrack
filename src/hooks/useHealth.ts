import { useLiveQuery } from "dexie-react-hooks";
import db, { type HealthMetric } from "@/db";
import { getCurrentUserIdSync } from "@/db";
import { schedulePush } from "@/lib/syncEngine";

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

type MetricFields = Pick<HealthMetric, "steps" | "restingHr" | "hrv" | "sleepHours" | "vo2max">;

/** All of the user's health metrics, newest first. */
export function useAllHealth(userId?: string) {
  return useLiveQuery(async () => {
    const uid = userId ?? getCurrentUserIdSync();
    const all = await db.healthMetrics.filter((h) => !h.deletedAt).toArray();
    const mine = uid ? all.filter((h) => h.userId === uid || h.userId == null) : all;
    return mine.sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [userId]) ?? [];
}

/** Today's (or a given date's) health metric for the current user. */
export function useHealthForDate(date = todayStr()) {
  return useLiveQuery(async () => {
    const uid = getCurrentUserIdSync();
    const all = await db.healthMetrics.filter((h) => !h.deletedAt && h.date === date).toArray();
    return all.find((h) => !uid || h.userId === uid || h.userId == null);
  }, [date]);
}

/** Create or update the metric row for a date. */
export async function upsertHealthMetric(
  date: string,
  fields: Partial<MetricFields>,
  source = "manual"
): Promise<void> {
  const now = new Date().toISOString();
  const uid = getCurrentUserIdSync();
  const existing = (await db.healthMetrics.toArray()).find(
    (h) => !h.deletedAt && h.date === date && (h.userId === uid || h.userId == null)
  );
  if (existing?.id != null) {
    await db.healthMetrics.update(existing.id, { ...fields, source, updatedAt: now, _dirty: 1 });
  } else {
    await db.healthMetrics.add({
      date,
      ...fields,
      source,
      uuid: crypto.randomUUID(),
      userId: uid,
      _dirty: 1,
      createdAt: now,
      updatedAt: now,
    } as HealthMetric);
  }
  schedulePush();
}

export async function deleteHealthMetric(id: number): Promise<void> {
  await db.healthMetrics.update(id, { deletedAt: new Date().toISOString(), _dirty: 1 });
  schedulePush();
}

export interface CsvImportResult {
  imported: number;
  skipped: number;
}

/**
 * Import daily metrics from CSV with a header row. Recognised columns
 * (case-insensitive): date, steps, resting_hr|restinghr, hrv, sleep|sleep_hours,
 * vo2max. `date` is required (yyyy-mm-dd).
 */
export async function importHealthCsv(text: string): Promise<CsvImportResult> {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return { imported: 0, skipped: 0 };

  const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const idx = (names: string[]) => header.findIndex((h) => names.includes(h));
  const di = idx(["date", "day"]);
  const si = idx(["steps", "step_count"]);
  const ri = idx(["resting_hr", "restinghr", "resting heart rate", "rhr"]);
  const hi = idx(["hrv", "heart_rate_variability"]);
  const sli = idx(["sleep", "sleep_hours", "sleep hours"]);
  const vi = idx(["vo2max", "vo2_max"]);

  if (di < 0) return { imported: 0, skipped: lines.length - 1 };

  let imported = 0;
  let skipped = 0;
  for (const line of lines.slice(1)) {
    const cells = line.split(",").map((c) => c.trim());
    const date = cells[di];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) { skipped++; continue; }
    const num = (i: number) => (i >= 0 && cells[i] !== "" && !Number.isNaN(Number(cells[i])) ? Number(cells[i]) : undefined);
    await upsertHealthMetric(
      date,
      { steps: num(si), restingHr: num(ri), hrv: num(hi), sleepHours: num(sli), vo2max: num(vi) },
      "import"
    );
    imported++;
  }
  return { imported, skipped };
}
