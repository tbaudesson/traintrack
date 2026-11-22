// Strava, read the way TrainTrack logs a session. Pure: shared by the Edge
// Function (Deno) and the app's tests (Vitest).

export type StravaSport = "run" | "bike" | "swim" | "hike" | "row" | "other";

/** The parts of a Strava activity (GET /athlete/activities) the app keeps. */
export interface StravaActivity {
  id: number;
  name?: string;
  sport_type?: string;
  type?: string;
  start_date?: string;
  start_date_local?: string;
  distance?: number;
  moving_time?: number;
  elapsed_time?: number;
  total_elevation_gain?: number;
  average_heartrate?: number;
  max_heartrate?: number;
  average_cadence?: number;
  average_watts?: number;
  max_watts?: number;
  weighted_average_watts?: number;
  device_watts?: boolean;
  manual?: boolean;
}

const SPORTS: Record<string, StravaSport> = {
  Run: "run", TrailRun: "run", VirtualRun: "run",
  Ride: "bike", VirtualRide: "bike", GravelRide: "bike", MountainBikeRide: "bike", EBikeRide: "bike", EMountainBikeRide: "bike", Velomobile: "bike", Handcycle: "bike",
  Swim: "swim",
  Hike: "hike", Walk: "hike",
  Rowing: "row", VirtualRow: "row", Canoeing: "row", Kayaking: "row",
};

export const sportOf = (a: Pick<StravaActivity, "sport_type" | "type">): StravaSport => SPORTS[a.sport_type ?? a.type ?? ""] ?? "other";

const whole = (n: number | undefined, min: number, max: number) => (typeof n === "number" && Number.isFinite(n) && n >= min && n <= max ? Math.round(n) : null);

/**
 * The session a Strava activity becomes (columns of the workouts table):
 * an endurance session of its sport, its date and start in local time,
 * distance, moving time, climb, heart rate, cadence and power as Strava has
 * them. Null for an activity with neither distance nor time.
 */
export function workoutOf(a: StravaActivity, userId: string, id: string, now: string): Record<string, unknown> | null {
  const duration = whole(a.moving_time ?? a.elapsed_time, 1, 7 * 86400);
  const distance = whole(a.distance, 0, 1_000_000);
  if (!duration && !distance) return null;
  const sport = sportOf(a);
  const local = a.start_date_local ?? a.start_date ?? now;
  // Strava writes the running cadence for one foot: steps a minute are twice that.
  const cadence = a.average_cadence ? (sport === "run" || sport === "hike" ? a.average_cadence * 2 : a.average_cadence) : undefined;
  return {
    id,
    user_id: userId,
    date: local.slice(0, 10),
    start_time: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(local) ? local.slice(11, 16) : null,
    started_at: a.start_date ?? null,
    kind: "cardio",
    sport,
    title: (a.name ?? "").slice(0, 120) || null,
    distance_m: distance && distance > 0 ? distance : null,
    duration_sec: duration,
    elevation_gain_m: whole(a.total_elevation_gain, 0, 20000),
    avg_hr: whole(a.average_heartrate, 30, 250),
    max_hr: whole(a.max_heartrate, 30, 250),
    avg_cadence: whole(cadence, 1, 260),
    avg_power_w: sport === "bike" ? whole(a.average_watts, 0, 2500) : null,
    max_power_w: sport === "bike" ? whole(a.max_watts, 0, 3000) : null,
    normalized_power_w: sport === "bike" && a.device_watts ? whole(a.weighted_average_watts, 0, 3000) : null,
    source: "strava",
    external_id: String(a.id),
    created_at: now,
    updated_at: now,
  };
}

/** A session already logged otherwise (a file, or typed): same sport and start within two minutes, or same day, sport and distance within 2 %. */
export function alreadyLogged(
  row: { sport: unknown; started_at: unknown; date: unknown; distance_m: unknown },
  existing: { sport: string | null; started_at: string | null; date: string; distance_m: number | null; deleted_at?: string | null }[]
): boolean {
  const start = typeof row.started_at === "string" ? Date.parse(row.started_at) : NaN;
  return existing.some((w) => {
    if (w.deleted_at || w.sport !== row.sport) return false;
    if (w.started_at && Number.isFinite(start) && Math.abs(Date.parse(w.started_at) - start) <= 120_000) return true;
    const d = typeof row.distance_m === "number" ? row.distance_m : 0;
    return w.date === row.date && !!w.distance_m && d > 0 && Math.abs(w.distance_m - d) <= d * 0.02;
  });
}

/** Strava's authorization page for the app, reading the athlete's activities (private ones included). */
export function authorizeUrl(clientId: string, redirectUri: string, state: string): string {
  const q = new URLSearchParams({ client_id: clientId, redirect_uri: redirectUri, response_type: "code", approval_prompt: "auto", scope: "activity:read_all", state });
  return `https://www.strava.com/oauth/authorize?${q}`;
}

/** Where a session imported from Strava can be seen there. */
export const activityUrl = (externalId: string) => `https://www.strava.com/activities/${encodeURIComponent(externalId)}`;
