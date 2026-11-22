import { Decoder, Stream } from "@garmin/fitsdk";
import { normalizedPower, powerPerSecond } from "./recovery";
import type { Sport } from "@/db";
import type { GpxActivity } from "./gpx";

/**
 * Read a FIT file, the one Garmin, Wahoo, Coros, Suunto and others record:
 * its session summary, as the watch worked it out (time moving, distance,
 * climb, heart rate, cadence, power), and for a swim the pool, the main
 * stroke and the strokes per length. Null when the file is not FIT or holds
 * no session. Decoded with Garmin's own SDK.
 */

type Mesg = Record<string, unknown>;
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : undefined);
const round = (v: unknown) => (num(v) !== undefined ? Math.round(v as number) : undefined);

function sportOf(sport: unknown, subSport: unknown): Sport {
  const s = String(sport ?? "").toLowerCase();
  const sub = String(subSport ?? "").toLowerCase();
  if (s.includes("swim")) return "swim";
  if (s.includes("run") || sub.includes("treadmill") || sub.includes("trail")) return "run";
  if (s.includes("cycl") || s.includes("bik") || sub.includes("cycl")) return "bike";
  if (s.includes("hik") || s.includes("walk")) return "hike";
  if (s.includes("row")) return "row";
  return "other";
}

const STROKES: Record<string, GpxActivity["swimStroke"]> = { freestyle: "free", backstroke: "back", breaststroke: "breast", butterfly: "fly", im: "mixed", mixed: "mixed" };

/** The stroke of most active lengths; "mixed" when none has more than half. */
function mainStroke(session: Mesg, lengths: Mesg[]): GpxActivity["swimStroke"] {
  const own = STROKES[String(session.swimStroke ?? "")];
  if (own) return own;
  const counts = new Map<string, number>();
  for (const l of lengths) if (l.lengthType !== "idle" && STROKES[String(l.swimStroke ?? "")]) counts.set(String(l.swimStroke), (counts.get(String(l.swimStroke)) ?? 0) + 1);
  const total = [...counts.values()].reduce((a, b) => a + b, 0);
  const [best, n] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0] ?? [];
  if (!best || !total) return undefined;
  return n! * 2 > total ? STROKES[best] : "mixed";
}

/** From the records' power, one a second, when the device did not write it. */
function fitNormalizedPower(records: Mesg[]): number | undefined {
  const samples = records
    .filter((r) => r.timestamp instanceof Date && typeof r.power === "number")
    .map((r) => ({ t: (r.timestamp as Date).getTime() / 1000, w: r.power as number }));
  return normalizedPower(powerPerSecond(samples)) ?? undefined;
}

export function parseFit(bytes: Uint8Array): GpxActivity | null {
  let messages: Record<string, Mesg[]>;
  try {
    const stream = Stream.fromByteArray(Array.from(bytes));
    if (!Decoder.isFIT(stream)) return null;
    ({ messages } = new Decoder(Stream.fromByteArray(Array.from(bytes))).read({ convertDateTimesToDates: true }) as unknown as { messages: Record<string, Mesg[]> });
  } catch {
    return null;
  }
  const session = messages.sessionMesgs?.[0];
  if (!session) return null;
  const sport = sportOf(session.sport, session.subSport);
  const durationSec = round(session.totalTimerTime) ?? round(session.totalElapsedTime) ?? 0;
  const distanceM = round(session.totalDistance) ?? 0;
  if (distanceM < 10 && durationSec < 60) return null;

  // Running cadence is written for one foot (with a fraction): doubled into steps a minute.
  const rawCadence = num(session.avgRunningCadence) ?? num(session.avgCadence);
  const cadence = rawCadence !== undefined ? rawCadence + (num(session.avgFractionalCadence) ?? 0) : undefined;
  const onFoot = sport === "run" || sport === "hike";
  const swim = sport === "swim";
  const openWater = String(session.subSport ?? "").toLowerCase().includes("open");
  const start = session.startTime instanceof Date ? session.startTime : undefined;

  return {
    name: undefined,
    sport,
    start,
    distanceM,
    durationSec,
    elevationGainM: round(session.totalAscent) ?? 0,
    avgHr: round(session.avgHeartRate),
    maxHr: round(session.maxHeartRate),
    avgCadence: swim || cadence === undefined || cadence <= 0 ? undefined : Math.round(onFoot && cadence < 120 ? cadence * 2 : cadence),
    avgPowerW: swim ? undefined : round(session.avgPower),
    maxPowerW: swim ? undefined : round(session.maxPower),
    normalizedPowerW: swim ? undefined : round(session.normalizedPower) ?? fitNormalizedPower(messages.recordMesgs ?? []),
    ...(swim
      ? {
          poolLengthM: openWater ? 0 : round(session.poolLength),
          swimStroke: mainStroke(session, messages.lengthMesgs ?? []),
          strokesPerLength: openWater ? undefined : round(num(session.avgStrokesPerLength) ?? num(session.avgStrokeCount)),
        }
      : {}),
  };
}
