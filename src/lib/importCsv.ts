/**
 * Read a workout history exported from Strong or Hevy (CSV, one row per set)
 * into sessions the app can store. Pure: nothing here touches the database.
 */

export type CsvSource = "strong" | "hevy";

export interface ImportedSet {
  exercise: string;
  weightKg?: number;
  reps?: number;
  rpe?: number;
  isWarmup: boolean;
  /** Hevy's superset id, kept to link the exercises again. */
  superset?: string;
}

export interface ImportedWorkout {
  /** YYYY-MM-DD, as written by the app that exported it. */
  date: string;
  title: string;
  durationMin?: number;
  sets: ImportedSet[];
}

export interface ParsedHistory {
  source: CsvSource;
  workouts: ImportedWorkout[];
  /** Rows left out: cardio distances, empty sets. */
  skipped: number;
  /** Strong does not say its unit: the caller chose it. */
  unitAsked: boolean;
}

const LB_KG = 0.45359237;

/** RFC 4180 CSV: quoted fields, doubled quotes, line breaks inside quotes. */
export function parseCsv(text: string, separator: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === separator) {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      if (row.some((f) => f !== "")) rows.push(row);
      row = [];
      field = "";
    } else field += c;
  }
  row.push(field);
  if (row.some((f) => f !== "")) rows.push(row);
  return rows;
}

const num = (value: string | undefined) => {
  if (value === undefined || value.trim() === "") return undefined;
  const n = Number(value.replace(",", "."));
  return Number.isFinite(n) ? n : undefined;
};

const MONTHS: Record<string, number> = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };

/** "2026-01-15 08:30:00", "2026-01-15T08:30", "15 Jan 2026, 08:30" → minutes since epoch-ish and the date. */
function readDate(text: string): { date: string; minutes: number } | null {
  const iso = text.match(/(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{1,2}):(\d{2}))?/);
  const named = text.match(/(\d{1,2}) ([A-Za-z]{3})[a-z]* (\d{4})(?:,? (\d{1,2}):(\d{2}))?/);
  let y: number, m: number, d: number, h = 0, min = 0;
  if (iso) [y, m, d, h, min] = [+iso[1], +iso[2], +iso[3], +(iso[4] ?? 0), +(iso[5] ?? 0)];
  else if (named && MONTHS[named[2].toLowerCase()]) [d, m, y, h, min] = [+named[1], MONTHS[named[2].toLowerCase()], +named[3], +(named[4] ?? 0), +(named[5] ?? 0)];
  else return null;
  const pad = (n: number) => String(n).padStart(2, "0");
  return { date: `${y}-${pad(m)}-${pad(d)}`, minutes: Date.UTC(y, m - 1, d, h, min) / 60000 };
}

/** Strong's "1h 5m", "45m", "3600" seconds → minutes. */
function readDuration(text: string | undefined): number | undefined {
  if (!text) return undefined;
  const h = text.match(/(\d+)\s*h/)?.[1];
  const m = text.match(/(\d+)\s*m/)?.[1];
  if (h || m) return Number(h ?? 0) * 60 + Number(m ?? 0) || undefined;
  const s = num(text);
  return s ? Math.round(s / 60) : undefined;
}

/** Which app wrote the file, from its header row. */
export function detectSource(header: string[]): CsvSource | null {
  const h = header.map((c) => c.trim().toLowerCase());
  if (h.includes("exercise_title") && h.includes("start_time")) return "hevy";
  if (h.includes("exercise name") && (h.includes("set order") || h.includes("workout name"))) return "strong";
  return null;
}

/**
 * The sessions in a Strong or Hevy export. Strong writes weights in the unit
 * set in the app, which the file does not name: `strongUnit` says which.
 */
export function parseHistory(text: string, strongUnit: "kg" | "lb" = "kg"): ParsedHistory | null {
  const firstLine = text.slice(0, text.indexOf("\n") === -1 ? undefined : text.indexOf("\n"));
  const separator = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows = parseCsv(text.replace(/^﻿/, ""), separator);
  if (rows.length < 2) return null;
  const header = rows[0].map((c) => c.trim().toLowerCase());
  const detected = detectSource(header);
  if (!detected) return null;
  const source: CsvSource = detected;
  const col = (...names: string[]) => names.map((n) => header.indexOf(n)).find((i) => i >= 0) ?? -1;
  const get = (row: string[], i: number) => (i >= 0 ? row[i]?.trim() : undefined);

  const c =
    source === "strong"
      ? {
          date: col("date"), title: col("workout name"), duration: col("duration", "workout duration"), exercise: col("exercise name"),
          order: col("set order"), weight: col("weight", "weight (kg)", "weight (lbs)"), reps: col("reps"), seconds: col("seconds"),
          distance: col("distance"), rpe: col("rpe"), end: -1, type: -1, superset: -1,
        }
      : {
          date: col("start_time"), title: col("title"), duration: -1, exercise: col("exercise_title"), order: col("set_index"),
          weight: col("weight_kg", "weight_lbs"), reps: col("reps"), seconds: col("duration_seconds"),
          distance: col("distance_km", "distance_miles"), rpe: col("rpe"), end: col("end_time"), type: col("set_type"), superset: col("superset_id"),
        };
  const pounds = source === "hevy" ? header.includes("weight_lbs") && !header.includes("weight_kg") : strongUnit === "lb";
  if (source === "strong" && (header.includes("weight (kg)") || header.includes("weight (lbs)"))) {
    // Newer exports name the unit: trust it over the caller's guess.
    return parseWith(header.includes("weight (lbs)"));
  }
  return parseWith(pounds);

  function parseWith(lb: boolean): ParsedHistory {
    const sessions = new Map<string, ImportedWorkout>();
    let skipped = 0;
    for (const row of rows.slice(1)) {
      const when = readDate(get(row, c.date) ?? "");
      const exercise = get(row, c.exercise);
      if (!when || !exercise) {
        skipped++;
        continue;
      }
      const title = get(row, c.title) || exercise;
      const key = `${get(row, c.date)}|${title}`;
      let session = sessions.get(key);
      if (!session) {
        const end = readDate(get(row, c.end) ?? "");
        session = {
          date: when.date,
          title,
          durationMin: readDuration(get(row, c.duration)) ?? (end && end.minutes > when.minutes ? Math.round(end.minutes - when.minutes) : undefined),
          sets: [],
        };
        sessions.set(key, session);
      }
      const weight = num(get(row, c.weight));
      let reps = num(get(row, c.reps));
      const seconds = num(get(row, c.seconds));
      const distance = num(get(row, c.distance));
      if (!reps && distance) {
        skipped++; // A run or a row logged inside a strength session.
        continue;
      }
      if (!reps && seconds) reps = Math.round(seconds); // A held position: seconds go in the reps box.
      if (!reps && !weight) {
        skipped++;
        continue;
      }
      const order = (get(row, c.order) ?? "").toLowerCase();
      const type = (get(row, c.type) ?? "").toLowerCase();
      const rpe = num(get(row, c.rpe));
      session.sets.push({
        exercise,
        weightKg: weight ? Math.round((lb ? weight * LB_KG : weight) * 10) / 10 : undefined,
        reps: reps ? Math.round(reps) : undefined,
        rpe: rpe && rpe >= 1 && rpe <= 10 ? rpe : undefined,
        isWarmup: type === "warmup" || order === "w",
        superset: get(row, c.superset) || undefined,
      });
    }
    return {
      source,
      workouts: [...sessions.values()].filter((w) => w.sets.length > 0).sort((a, b) => a.date.localeCompare(b.date)),
      skipped,
      unitAsked: source === "strong" && !header.includes("weight (kg)") && !header.includes("weight (lbs)"),
    };
  }
}

/** Common names in Strong and Hevy for the exercises of the app's library. */
const ALIASES: Record<string, string> = {
  "squat barbell": "Back Squat",
  "back squat barbell": "Back Squat",
  "front squat barbell": "Front Squat",
  "deadlift barbell": "Deadlift",
  "romanian deadlift barbell": "Romanian Deadlift",
  "overhead press barbell": "Overhead Press",
  "shoulder press barbell": "Overhead Press",
  "bent over row barbell": "Barbell Row",
  "bent over row": "Barbell Row",
  "pull up": "Pull-up",
  "chin up": "Chin-up",
  "push up": "Push-up",
  "lat pulldown cable": "Lat Pulldown",
  "lat pulldown machine": "Lat Pulldown",
  "seated row cable": "Seated Cable Row",
  "seated cable row": "Seated Cable Row",
  "bicep curl barbell": "Barbell Curl",
  "bicep curl dumbbell": "Dumbbell Curl",
  "hammer curl dumbbell": "Hammer Curl",
  "triceps pushdown cable": "Triceps Pushdown",
  "triceps pushdown": "Triceps Pushdown",
  "lateral raise dumbbell": "Lateral Raise",
  "leg press machine": "Leg Press",
  "leg extension machine": "Leg Extension",
  "lying leg curl machine": "Leg Curl",
  "seated leg curl machine": "Leg Curl",
  "hip thrust barbell": "Hip Thrust",
  "standing calf raise machine": "Standing Calf Raise",
  "dips": "Chest Dip",
  "chest dip": "Chest Dip",
  "face pull cable": "Face Pull",
  "skullcrusher barbell": "Skull Crusher",
  "skull crusher barbell": "Skull Crusher",
  "cable crossover": "Cable Fly",
  "chest fly cable": "Cable Fly",
  "incline bench press dumbbell": "Incline Dumbbell Press",
  "shoulder press dumbbell": "Seated Dumbbell Press",
  "seated overhead press dumbbell": "Seated Dumbbell Press",
  "lunge dumbbell": "Walking Lunge",
  "walking lunge dumbbell": "Walking Lunge",
  "standing calf raise": "Standing Calf Raise",
  "crunch cable": "Cable Crunch",
  "triceps extension cable": "Overhead Triceps Extension",
  "overhead triceps extension cable": "Overhead Triceps Extension",
  "reverse fly dumbbell": "Rear Delt Fly",
  "rear delt reverse fly dumbbell": "Rear Delt Fly",
  "t bar row": "T-Bar Row",
  "bulgarian split squat dumbbell": "Bulgarian Split Squat",
};

const tokens = (name: string) =>
  name
    .toLowerCase()
    .replace(/[()\-–_/]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

/**
 * The library exercise a name from another app stands for: an alias, the
 * same name, or the same words in another order ("Bench Press (Barbell)" is
 * "Barbell Bench Press"). Undefined when nothing fits.
 */
export function matchExercise<E extends { name: string }>(name: string, library: E[]): E | undefined {
  const words = tokens(name);
  const alias = ALIASES[words.join(" ")];
  const byName = (target: string) => library.find((e) => e.name.toLowerCase() === target.toLowerCase());
  if (alias) return byName(alias);
  const exact = byName(name);
  if (exact) return exact;
  const key = [...words].sort().join(" ");
  return library.find((e) => [...tokens(e.name)].sort().join(" ") === key);
}
