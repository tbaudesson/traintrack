/**
 * A program written in a spreadsheet, one row per exercise:
 *
 *   Week | Session | Exercise | Sets | Reps | Rest | %1RM
 *
 * The headers may be in French, English or German, in any order; only
 * Session and Exercise are required. A session or week left blank goes on
 * from the row above (as with merged cells). Exercises are found in the
 * library under any of its three languages; others are kept as written and
 * become custom exercises at the first session. Pure.
 */
import type { ProgramDay } from "@/db";
import { NAMES } from "./exerciseNames";
import { matchExercise } from "./importCsv";
import { sanitizeStructure } from "./programSanitize";

export type Column = "week" | "day" | "exercise" | "sets" | "reps" | "rest" | "percent";

const fold = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/ß/g, "ss")
    .trim();

const HEADERS: Record<Column, string[]> = {
  week: ["semaine", "sem", "week", "wk", "woche"],
  day: ["seance", "jour", "session", "day", "workout", "einheit", "tag", "training", "trainingseinheit"],
  exercise: ["exercice", "exercise", "exo", "mouvement", "ubung", "uebung"],
  sets: ["series", "serie", "sets", "set", "satze", "saetze", "satz"],
  reps: ["repetitions", "repetition", "reps", "rep", "wiederholungen", "wdh"],
  rest: ["repos", "recuperation", "recup", "rest", "pause", "satzpause"],
  percent: ["%", "%1rm", "% 1rm", "1rm", "%rm", "charge", "intensite", "intensity", "load", "prozent", "% 1rm", "pourcentage"],
};

/** The column a header names, ignoring case, accents, units in brackets. */
export function columnOf(header: string): Column | null {
  const h = fold(header).replace(/\s*[([].*?[)\]]\s*/g, " ").replace(/\s+/g, " ").trim();
  if (!h) return null;
  if (h.includes("%")) return "percent";
  for (const [column, names] of Object.entries(HEADERS) as [Column, string[]][]) if (names.includes(h)) return column;
  return null;
}

/** The library exercise a name stands for, in English (the key), or the name as written. */
export function libraryName(name: string): { name: string; known: boolean } {
  const trimmed = name.trim().replace(/\s+/g, " ");
  const folded = fold(trimmed);
  for (const [key, t] of Object.entries(NAMES)) {
    if (fold(key) === folded || fold(t.fr) === folded || fold(t.de) === folded) return { name: key, known: true };
  }
  const match = matchExercise(trimmed, Object.keys(NAMES).map((key) => ({ name: key })));
  return match ? { name: match.name, known: true } : { name: trimmed, known: false };
}

/** Seconds of rest: "90", "90 s", "1:30", "1'30", "2 min", or an Excel time (a share of a day). */
export function parseRest(text: string): number | undefined {
  const t = fold(text).replace(",", ".");
  if (!t) return undefined;
  const clock = t.match(/^(\d+)\s*[:']\s*(\d{1,2})"?$/);
  if (clock) return Number(clock[1]) * 60 + Number(clock[2]);
  const minutes = t.match(/^(\d+(?:\.\d+)?)\s*(?:min|mn|m|')$/);
  if (minutes) return Math.round(Number(minutes[1]) * 60);
  const seconds = t.match(/^(\d+(?:\.\d+)?)\s*(?:s|sec|secondes?|seconds?|sek|sekunden)?$/);
  if (!seconds) return undefined;
  const n = Number(seconds[1]);
  // A time cell: 00:01:30 is stored as 0.0010416… of a day.
  return n > 0 && n < 1 ? Math.round(n * 86_400) : Math.round(n);
}

/** Loads as % of 1RM: "70", "70%", "70/75/80", "70-75-80", or 0.7 from a percent cell. */
export function parsePercents(text: string): number[] {
  return (text.match(/\d+(?:[.,]\d+)?/g) ?? [])
    .map((p) => Number(p.replace(",", ".")))
    .map((p) => (p > 0 && p <= 1.5 ? Math.round(p * 100) : Math.round(p)))
    .filter((p) => p > 0);
}

/** Reps as written, "8 à 12" or "8 to 12" made "8-12". A number over 1000 is a date Excel made of "8-12": unreadable. */
export function parseReps(text: string): string | null | undefined {
  const t = text.trim();
  if (!t) return undefined;
  if (/^\d+(\.\d+)?$/.test(t) && Number(t) > 1000) return null;
  return t.replace(/^(\d+)\s*(?:à|a|to|bis|–|—|-)\s*(\d+)$/i, "$1-$2").slice(0, 20);
}

export interface ProgramImport {
  structure: ProgramDay[];
  /** Exercise names not found in the library, as written. */
  unknown: string[];
  /** Rows with an exercise but reps Excel turned into a date: given 8-12. */
  badReps: number;
  /** Plans in weeks when a week column is filled. */
  weeks: number;
}

export class ProgramImportError extends Error {}

/**
 * The program in the rows of a sheet (or a CSV). `defaultDay` names the
 * session when the sheet has no session column filled ("Session 1"…).
 */
export function parseProgramRows(rows: string[][], defaultDay: (n: number) => string): ProgramImport {
  // The header: the first of the ten top rows naming an exercise column.
  const headerAt = rows.slice(0, 10).findIndex((row) => row.some((cell) => columnOf(cell ?? "") === "exercise"));
  if (headerAt < 0) throw new ProgramImportError("NO_HEADER");
  const columns = new Map<Column, number>();
  rows[headerAt].forEach((cell, i) => {
    const c = columnOf(cell ?? "");
    if (c && !columns.has(c)) columns.set(c, i);
  });
  const read = (row: string[], c: Column) => (columns.has(c) ? String(row[columns.get(c)!] ?? "").trim() : "");

  const days: ProgramDay[] = [];
  const unknown = new Set<string>();
  let badReps = 0;
  let week: number | undefined;
  let dayName = "";
  let key = "";
  for (const row of rows.slice(headerAt + 1)) {
    if (!row || row.every((c) => !String(c ?? "").trim())) continue;
    const w = Number.parseInt(read(row, "week"), 10);
    if (Number.isFinite(w) && w > 0) week = w;
    const d = read(row, "day");
    if (d) dayName = d;
    const exercise = read(row, "exercise");
    if (!exercise) continue;

    const rowKey = `${week ?? ""}|${dayName}`;
    if (!days.length || rowKey !== key) {
      key = rowKey;
      days.push({ name: (dayName || defaultDay(days.length + 1)).slice(0, 80), exercises: [], ...(week ? { week } : {}) });
    }
    const { name, known } = libraryName(exercise);
    if (!known) unknown.add(name);
    const reps = parseReps(read(row, "reps"));
    if (reps === null) badReps++;
    const sets = Number.parseInt(read(row, "sets"), 10);
    const rest = parseRest(read(row, "rest"));
    const percents = parsePercents(read(row, "percent"));
    days[days.length - 1].exercises.push({
      exerciseName: name,
      targetSets: Number.isFinite(sets) ? sets : 3,
      targetReps: reps || "8-12",
      ...(rest !== undefined ? { restSec: rest } : {}),
      ...(percents.length ? { percents } : {}),
    });
  }
  const structure = sanitizeStructure(days);
  if (!structure.length) throw new ProgramImportError("EMPTY");
  const weekNumbers = new Set(structure.map((d) => d.week).filter((w) => w !== undefined));
  return { structure, unknown: [...unknown].sort(), badReps, weeks: weekNumbers.size };
}

/** The rows of the template offered for download, in the app's language. */
export function templateRows(locale: string): (string | number)[][] {
  const words: Record<string, { head: string[]; a: string; b: string }> = {
    fr: { head: ["Semaine", "Séance", "Exercice", "Séries", "Répétitions", "Repos (s)", "% 1RM"], a: "Haut du corps", b: "Bas du corps" },
    de: { head: ["Woche", "Einheit", "Übung", "Sätze", "Wiederholungen", "Pause (s)", "% 1RM"], a: "Oberkörper", b: "Unterkörper" },
    en: { head: ["Week", "Session", "Exercise", "Sets", "Reps", "Rest (s)", "% 1RM"], a: "Upper body", b: "Lower body" },
  };
  const w = words[locale] ?? words.en;
  const ex = (key: string) => (locale === "fr" || locale === "de" ? NAMES[key][locale] : key);
  return [
    w.head,
    [1, w.a, ex("Barbell Bench Press"), 4, "6-8", 120, "70/75/80/80"],
    [1, w.a, ex("Barbell Row"), 4, "8-10", 90, ""],
    [1, w.a, ex("Lateral Raise"), 3, "12-15", 60, ""],
    [1, w.b, ex("Back Squat"), 4, "5", 150, "75/80/85/85"],
    [1, w.b, ex("Romanian Deadlift"), 3, "8-10", 90, ""],
    [1, w.b, ex("Plank"), 3, "30-45s", 60, ""],
    [2, w.a, ex("Barbell Bench Press"), 4, "5-6", 120, "75/80/85/85"],
    [2, w.b, ex("Back Squat"), 4, "4", 150, "80/85/88/88"],
  ];
}
