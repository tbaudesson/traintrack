import type { Workout, WorkoutSet } from "@/db";
import { formatDistance, formatDuration, isCardio, isCardioDone } from "@/lib/cardio";
import { recordHistory, totalVolume } from "@/lib/performance";

/** No session for this long and a client counts as dropping off. */
export const INACTIVE_AFTER_DAYS = 5;
const FEED_WINDOW_DAYS = 30;
const FEED_LIMIT = 60;

export type ActivityEvent =
  | { kind: "session"; key: string; userId: string; name: string; date: string; title?: string; sets: number; volume: number; cardio?: string }
  | { kind: "record"; key: string; userId: string; name: string; date: string; exercise: string; weightKg: number; reps: number };

export interface InactiveClient {
  userId: string;
  name: string;
  /** Null when the client has never logged a session. */
  days: number | null;
}

function cardioSummary(w: Workout) {
  return [w.distanceM ? formatDistance(w.distanceM, w.sport) : null, w.durationSec ? formatDuration(w.durationSec) : null]
    .filter(Boolean)
    .join(" · ");
}

function daysBetween(from: string, to: string) {
  return Math.round((Date.parse(to) - Date.parse(from)) / 86400000);
}

/** What a coach's clients have been doing, newest first, and who has gone quiet. */
export function buildActivity(input: {
  clients: { userId: string; displayName: string }[];
  workouts: Workout[];
  sets: WorkoutSet[];
  exerciseName: (exerciseId: number) => string;
  today: string;
}): { events: ActivityEvent[]; inactive: InactiveClient[] } {
  const events: ActivityEvent[] = [];
  const inactive: InactiveClient[] = [];
  // A client in two teams is still one person.
  const clients = [...new Map(input.clients.map((c) => [c.userId, c])).values()];

  for (const client of clients) {
    const name = client.displayName;
    const workouts = input.workouts.filter((w) => w.userId === client.userId && !w.deletedAt);
    const sets = input.sets.filter((s) => s.userId === client.userId && !s.deletedAt);
    const trained = workouts.filter((w) => isCardioDone(w) || sets.some((s) => s.workoutId === w.id && s.completed));

    for (const w of trained) {
      if (daysBetween(w.date, input.today) > FEED_WINDOW_DAYS) continue;
      const done = sets.filter((s) => s.workoutId === w.id && s.completed);
      events.push({
        kind: "session", key: `s-${w.id}`, userId: client.userId, name, date: w.date, title: w.title,
        sets: done.length, volume: Math.round(totalVolume(done)),
        cardio: isCardio(w) ? cardioSummary(w) : undefined,
      });
    }

    for (const exerciseId of new Set(sets.map((s) => s.exerciseId))) {
      recordHistory(exerciseId, trained, sets)
        .filter((r) => daysBetween(r.date, input.today) <= FEED_WINDOW_DAYS)
        .forEach((r, i) => {
          events.push({
            kind: "record", key: `r-${exerciseId}-${r.workoutId}-${i}`, userId: client.userId, name, date: r.date,
            exercise: input.exerciseName(exerciseId), weightKg: r.weightKg, reps: r.reps,
          });
        });
    }

    const last = trained.map((w) => w.date).sort().at(-1);
    const days = last ? daysBetween(last, input.today) : null;
    if (days === null || days >= INACTIVE_AFTER_DAYS) inactive.push({ userId: client.userId, name, days });
  }

  events.sort((a, b) => b.date.localeCompare(a.date) || (a.kind === "record" ? -1 : 1));
  inactive.sort((a, b) => (b.days ?? Infinity) - (a.days ?? Infinity));
  return { events: events.slice(0, FEED_LIMIT), inactive };
}
