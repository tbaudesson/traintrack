import { describe, expect, it } from "vitest";
import { activityUrl, alreadyLogged, authorizeUrl, sportOf, workoutOf } from "../../supabase/functions/_shared/strava";

const now = "2026-11-22T12:00:00Z";

describe("a Strava activity as a session", () => {
  it("keeps the sport, the local date and start, the figures", () => {
    const row = workoutOf({ id: 99, name: "Sortie du dimanche", sport_type: "TrailRun", start_date: "2026-11-22T06:30:00Z", start_date_local: "2026-11-22T07:30:00Z", distance: 12034.6, moving_time: 4200, total_elevation_gain: 310, average_heartrate: 148.6, max_heartrate: 171, average_cadence: 86 }, "u1", "id1", now)!;
    expect(row).toMatchObject({ user_id: "u1", date: "2026-11-22", start_time: "07:30", sport: "run", kind: "cardio", distance_m: 12035, duration_sec: 4200, elevation_gain_m: 310, avg_hr: 149, avg_cadence: 172, source: "strava", external_id: "99", started_at: "2026-11-22T06:30:00Z" });
  });

  it("keeps the normalized power of a ride only from a power meter", () => {
    expect(workoutOf({ id: 1, sport_type: "Ride", moving_time: 3600, average_watts: 180, weighted_average_watts: 205, device_watts: true }, "u", "i", now)!.normalized_power_w).toBe(205);
    expect(workoutOf({ id: 1, sport_type: "Ride", moving_time: 3600, average_watts: 180, weighted_average_watts: 205, device_watts: false }, "u", "i", now)!.normalized_power_w).toBeNull();
  });

  it("files what it does not know as other, and drops what has neither distance nor time", () => {
    expect(sportOf({ sport_type: "Yoga" })).toBe("other");
    expect(sportOf({ type: "Walk" })).toBe("hike");
    expect(workoutOf({ id: 2, sport_type: "Run" }, "u", "i", now)).toBeNull();
  });
});

describe("an activity already logged in the app", () => {
  const row = { sport: "run", started_at: "2026-11-22T06:30:00Z", date: "2026-11-22", distance_m: 10000 };
  it("is the same start, or the same day and distance", () => {
    expect(alreadyLogged(row, [{ sport: "run", started_at: "2026-11-22T06:31:00Z", date: "2026-11-22", distance_m: null }])).toBe(true);
    expect(alreadyLogged(row, [{ sport: "run", started_at: null, date: "2026-11-22", distance_m: 10100 }])).toBe(true);
    expect(alreadyLogged(row, [{ sport: "bike", started_at: "2026-11-22T06:30:00Z", date: "2026-11-22", distance_m: 10000 }])).toBe(false);
    expect(alreadyLogged(row, [{ sport: "run", started_at: null, date: "2026-11-22", distance_m: 10000, deleted_at: "x" }])).toBe(false);
  });
});

describe("the links to Strava", () => {
  it("ask to read the activities, and lead to one", () => {
    const url = new URL(authorizeUrl("123", "https://app.test/fr/strava", "s1"));
    expect(url.searchParams.get("scope")).toBe("activity:read_all");
    expect(url.searchParams.get("state")).toBe("s1");
    expect(activityUrl("99")).toBe("https://www.strava.com/activities/99");
  });
});
