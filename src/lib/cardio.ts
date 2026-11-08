import type { CardioTarget, Program, ProgramDay, Sport, Workout } from "@/db";

export const SPORTS: Sport[] = ["run", "swim", "bike", "row", "other"];

/** Shorter than this and a pace is noise, not a performance. */
const MIN_DISTANCE_FOR_PACE: Record<Sport, number> = { run: 1000, swim: 100, bike: 5000, row: 500, other: Infinity };

type CardioFields = Pick<Workout, "id" | "kind" | "sport" | "distanceM" | "durationSec">;

export function isCardio(w: Pick<Workout, "kind"> | undefined): boolean {
  return w?.kind === "cardio";
}

export function isCardioDone(w: CardioFields): boolean {
  return isCardio(w) && ((w.distanceM ?? 0) > 0 || (w.durationSec ?? 0) > 0);
}

export function formatDistance(meters: number, sport?: Sport | null): string {
  if (sport === "swim" || meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(meters % 1000 === 0 ? 0 : 1)} km`;
}

export function formatDuration(seconds: number): string {
  const total = Math.round(seconds / 60);
  if (total < 60) return `${total} min`;
  return `${Math.floor(total / 60)} h ${String(total % 60).padStart(2, "0")}`;
}

function minutesSeconds(seconds: number) {
  const rounded = Math.round(seconds);
  return `${Math.floor(rounded / 60)}:${String(rounded % 60).padStart(2, "0")}`;
}

/** In each sport's own unit; null when it cannot be worked out. */
export function formatPace(sport: Sport | null | undefined, meters?: number, seconds?: number): string | null {
  if (!sport || !meters || !seconds) return null;
  if (sport === "run") return `${minutesSeconds(seconds / (meters / 1000))} /km`;
  if (sport === "swim") return `${minutesSeconds(seconds / (meters / 100))} /100 m`;
  if (sport === "row") return `${minutesSeconds(seconds / (meters / 500))} /500 m`;
  if (sport === "bike") return `${((meters / 1000) / (seconds / 3600)).toFixed(1)} km/h`;
  return null;
}

/** "10 km · Zone 2" */
export function describeTarget(target: CardioTarget): string {
  const parts: string[] = [];
  if (target.distanceKm) parts.push(formatDistance(target.distanceKm * 1000, target.sport));
  if (target.durationMin) parts.push(formatDuration(target.durationMin * 60));
  if (target.intensity) parts.push(target.intensity);
  return parts.join(" · ");
}

export interface CardioBests {
  longestM: number;
  /** Metres per second. */
  bestSpeed: number;
}

export function cardioBests(workouts: CardioFields[], sport: Sport): CardioBests {
  let longestM = 0;
  let bestSpeed = 0;
  for (const w of workouts) {
    if (!isCardioDone(w) || w.sport !== sport) continue;
    const meters = w.distanceM ?? 0;
    longestM = Math.max(longestM, meters);
    if (w.durationSec && meters >= MIN_DISTANCE_FOR_PACE[sport]) bestSpeed = Math.max(bestSpeed, meters / w.durationSec);
  }
  return { longestM, bestSpeed };
}

/** Which records this session beat. Nothing counts without an earlier session. */
export function newCardioRecords(session: CardioFields, others: CardioFields[]): ("distance" | "pace")[] {
  if (!session.sport || !isCardioDone(session)) return [];
  const earlier = others.filter((w) => w.id !== session.id && w.sport === session.sport && isCardioDone(w));
  if (earlier.length === 0) return [];
  const before = cardioBests(earlier, session.sport);
  const now = cardioBests([session], session.sport);
  const records: ("distance" | "pace")[] = [];
  if (now.longestM > before.longestM) records.push("distance");
  if (now.bestSpeed > before.bestSpeed && before.bestSpeed > 0) records.push("pace");
  return records;
}

/** The session count to aim for this week: a plan's week, or the whole cycle. */
export function weeklyGoal(program: Program, day: ProgramDay | undefined): number {
  if (day?.week === undefined) return program.structure.length;
  return program.structure.filter((d) => d.week === day.week).length;
}
