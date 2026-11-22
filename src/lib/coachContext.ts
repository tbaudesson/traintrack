import type { AthleteProfile, BodyMetric, Exercise, Goal, Program, Workout, WorkoutSet } from "@/db";
import { goalStatus } from "./goalTracking";
import type { Injury } from "./injuries";
import type { PainReport } from "./pain";
import type { CoachProposal } from "./coach";
import { estimateOneRepMax } from "./performance";
import { loadSplit, weeklyLoads } from "./loadHistory";

/**
 * What the assistant's AI is told about the athlete: a compact, readable
 * summary of the data the app holds, nothing more (no name, no email, no
 * notes typed by the athlete). Built on the device; sent with the question to
 * Anthropic only when the athlete asks one, with their own key. Pure.
 */

const WEEKS = 8;
const MAX_SESSIONS = 40;

const addDays = (date: string, n: number) => {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const round1 = (n: number) => Math.round(n * 10) / 10;

export function coachContext(input: {
  today: string;
  profile: AthleteProfile | null | undefined;
  programs: Program[];
  workouts: Workout[];
  sets: WorkoutSet[];
  exercises: Pick<Exercise, "id" | "name">[];
  injuries: Injury[];
  pains: PainReport[];
  readiness: { date: string; score: number | null }[];
  proposals: CoachProposal[];
  /** The athlete's goals and weigh-ins (migration 075); optional. */
  goals?: Goal[];
  bodyMetrics?: Pick<BodyMetric, "date" | "weightKg">[];
}): string {
  const from = addDays(input.today, -7 * WEEKS);
  const name = (id: number) => input.exercises.find((e) => e.id === id)?.name ?? `#${id}`;
  const p = input.profile;
  const lines: string[] = [`Today: ${input.today}.`];

  lines.push(
    `Profile: level ${p?.fitnessLevel ?? "unknown"}; goals ${(p?.goals ?? []).join(", ") || "none given"}; equipment ${(p?.equipment ?? []).join(", ") || "not given"}; usual training days ${(p?.trainingDays ?? []).join(",") || "none given"} (1 = Monday); FTP ${p?.ftpW ? `${p.ftpW} W` : "not given"}.`
  );
  const injured = input.injuries.filter((i) => !i.healedOn);
  lines.push(`Injuries: ${injured.length ? injured.map((i) => `${i.area} since ${i.since}`).join("; ") : "none declared"}.`);
  const pains = input.pains.filter((x) => x.date >= addDays(input.today, -28));
  if (pains.length) lines.push(`Pain reported (last 4 weeks): ${pains.map((x) => `${x.date} ${x.area} ${x.level}/10${x.exerciseName ? ` (${x.exerciseName})` : ""}`).join("; ")}.`);
  const scores = input.readiness.filter((r) => r.date >= addDays(input.today, -14) && r.score !== null).map((r) => r.score!);
  if (scores.length) lines.push(`Readiness (last 14 days, 0-100): average ${Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)} over ${scores.length} check-ins.`);

  if (input.goals?.length) {
    lines.push("", "Goals (main first):");
    const data = { today: input.today, workouts: input.workouts, sets: input.sets, exercises: input.exercises, bodyMetrics: input.bodyMetrics ?? [] };
    for (const g of input.goals) {
      const s = goalStatus(g, data);
      const what =
        g.type === "strength" ? `estimated 1RM ${g.exerciseName} ${g.targetValue} kg`
        : g.type === "time" ? `${g.scope} ${g.distanceM} m in under ${g.targetValue} s`
        : g.type === "distance" ? `${g.scope} ${g.targetValue} m covered since ${g.createdAt.slice(0, 10)}`
        : g.type === "frequency" ? `${g.targetValue} sessions a week (${g.scope ?? "all"})`
        : `body weight ${g.targetValue} kg`;
      const state = s.achievedOn ? `reached on ${s.achievedOn}` : s.current === null ? "nothing measured yet" : `now ${round1(s.current)}, ${Math.round(s.share * 100)}% of the way${s.onTrack === false ? ", behind" : s.onTrack ? ", on track" : ""}`;
      lines.push(`- ${g.priority === 1 ? "[main] " : ""}${what}${g.deadline ? `, by ${g.deadline}` : ""}: ${state}.`);
    }
  }

  lines.push("", "Programs followed:");
  for (const prog of input.programs.filter((x) => !x.archivedAt)) {
    const days = (prog.structure ?? []).map((d) => (d.cardio ? `${d.name} (${d.cardio.sport})` : `${d.name} (${d.exercises.map((e) => `${e.exerciseName} ${e.targetSets}x${e.targetReps}`).join(", ")})`));
    lines.push(`- ${prog.name}${prog.weekdays?.length ? `, planned on days ${prog.weekdays.join(",")}` : ""}: ${days.slice(0, 8).join("; ")}${days.length > 8 ? `; … ${days.length} days in all` : ""}`);
  }

  const recent = input.workouts.filter((w) => w.date >= from && w.date <= input.today && !w.cancelledAt).sort((a, b) => b.date.localeCompare(a.date));
  lines.push("", `Sessions, last ${WEEKS} weeks (${recent.length}, newest first${recent.length > MAX_SESSIONS ? `, ${MAX_SESSIONS} shown` : ""}):`);
  for (const w of recent.slice(0, MAX_SESSIONS)) {
    const own = input.sets.filter((s) => s.workoutId === w.id && s.completed && !s.isWarmup);
    const minutes = w.durationMin ?? (w.durationSec ? Math.round(w.durationSec / 60) : null);
    const parts = [
      w.date,
      w.title ?? w.kind ?? "session",
      w.kind === "cardio" ? `${w.sport ?? "cardio"}${w.distanceM ? ` ${round1(w.distanceM / 1000)} km` : ""}` : w.kind === "mobility" ? "mobility" : own.length ? `${own.length} sets done` : "nothing ticked",
      minutes ? `${minutes} min` : null,
      w.sessionRpe ? `effort ${w.sessionRpe}/10` : null,
      w.feeling ? `felt ${w.feeling}/5` : null,
      w.avgHr ? `HR ${w.avgHr}` : null,
    ].filter(Boolean);
    lines.push(`- ${parts.join(", ")}`);
  }

  // The main lifts: their best estimated 1RM in the first and the last weeks of the window.
  const lifts = new Map<number, { first?: number; last?: number; sessions: Set<number> }>();
  const dateOf = new Map(input.workouts.map((w) => [w.id, w.date]));
  for (const s of input.sets) {
    const date = dateOf.get(s.workoutId);
    if (!date || date < from || !s.completed || s.isWarmup || !s.weightKg || !s.reps) continue;
    const e = estimateOneRepMax(s.weightKg, s.reps);
    const l = lifts.get(s.exerciseId) ?? { sessions: new Set<number>() };
    l.sessions.add(s.workoutId);
    if (date < addDays(from, 21)) l.first = Math.max(l.first ?? 0, e);
    if (date >= addDays(input.today, -20)) l.last = Math.max(l.last ?? 0, e);
    lifts.set(s.exerciseId, l);
  }
  const top = [...lifts.entries()].sort((a, b) => b[1].sessions.size - a[1].sessions.size).slice(0, 6);
  if (top.length) {
    lines.push("", "Main lifts, best estimated 1RM (first 3 weeks → last 3 weeks of the window):");
    for (const [id, l] of top) lines.push(`- ${name(id)}: ${l.first ? round1(l.first) : "–"} → ${l.last ? round1(l.last) : "–"} kg (${l.sessions.size} sessions)`);
  }

  const weeks = weeklyLoads({ today: input.today, workouts: input.workouts, sets: input.sets, weeks: WEEKS });
  lines.push("", `Training load per week (minutes × effort felt), oldest first: ${weeks.map((w) => w.total).join(", ")}.`);
  const split = loadSplit(weeks.slice(-4));
  if (split.length) lines.push(`Load split, last 4 weeks: ${split.map((x) => `${x.discipline} ${x.share}%`).join(", ")}.`);

  if (input.proposals.length) {
    lines.push("", "The app's own proposals (rules on the sessions done), awaiting the athlete's decision:");
    for (const pr of input.proposals) lines.push(`- ${pr.kind}: ${pr.program}${pr.day ? ` / ${pr.day}` : ""}${pr.exercise ? ` / ${pr.exercise}` : ""} → ${JSON.stringify(pr.change)} (${pr.evidence.map((e) => `${e.key} ${JSON.stringify(e.values)}`).join("; ")})`);
  }
  return lines.join("\n");
}
