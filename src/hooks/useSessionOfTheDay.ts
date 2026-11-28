"use client";

import { useMemo, useState } from "react";
import { findWorkoutProgramDay, nextDayIndex } from "@/lib/startWorkout";
import { mondayOfDate } from "@/lib/weekPlan";
import { plannedPrograms, sessionChoices, type SessionChoice } from "@/lib/schedule";
import { programWeek } from "@/lib/programWeek";
import { isTestProgram } from "@/lib/levelTests";
import { programCategory } from "@/lib/programCategories";
import type { ProgramTemplate } from "@/lib/programTemplates";
import { useTemplateCatalogue } from "@/lib/templateService";
import type { AthleteProfile, Program, Workout } from "@/db";
import type { AppPrefs } from "@/lib/appTheme";

/**
 * The session of the day, for the home screen and the training hub alike,
 * with the programs of the planning it comes from.
 */
export function useSessionOfTheDay({
  programs,
  workouts,
  today,
  profile,
  userId,
  sport,
  catalogue,
}: {
  programs: Program[];
  workouts: Workout[];
  today: string;
  profile: AthleteProfile | null | undefined;
  userId: string | undefined;
  /** The favourite sport: with nothing going on, its program comes first. */
  sport: AppPrefs["sport"];
  catalogue: ProgramTemplate[];
}) {
  // Every language's ready-made programs, to know a program by its name.
  const allTemplates = useTemplateCatalogue();
  // The programs in the planning (given days), all shown together in the week.
  const weekStart = mondayOfDate(today);
  const planned = useMemo(
    () => plannedPrograms({ programs, me: userId, trainingDays: profile?.trainingDays ?? [], from: weekStart, moves: profile?.scheduleMoves }),
    [programs, userId, profile?.trainingDays, profile?.scheduleMoves, weekStart]
  );

  // Today's session already begun; otherwise the next one of the planning;
  // without a planning, the program most recently trained, or the first one
  // with days. A program started since (a coach's new plan) takes over.
  // With several sessions on the day shown, the one picked by the athlete.
  const [pickKey, setPickKey] = useState<string | null>(null);
  const session = useMemo(() => {
    // The level tests are done from their own page, never as the session of the day.
    const usable = programs.filter((p) => (p.structure ?? []).length > 0 && !isTestProgram(p));
    const linked = workouts.map((w) => ({ w, at: findWorkoutProgramDay(usable, w) }));
    const lastDone = linked.find((x) => x.at && x.w.date < today);
    const choose = (date: string, options: SessionChoice[]) => {
      const o = options.find((x) => x.key === pickKey) ?? options[0];
      return { program: o.program, index: o.index, day: o.program.structure[o.index], workoutId: o.workoutId, date, options };
    };
    // Today's sessions begun and planned, or the next day planned.
    const day = sessionChoices({ planned, programs: usable, workouts, today });
    if (day) return choose(day.date, day.options);
    const newest = usable
      .filter((p) => p.startDate && p.startDate <= today && !programWeek(p, today)?.finished)
      .sort((a, b) => b.startDate!.localeCompare(a.startDate!))[0];
    // With nothing going on, the program of one's favourite sport comes first.
    const favorite = sport ? usable.find((p) => programCategory(p, [...catalogue, ...allTemplates]) === sport) : undefined;
    const program =
      newest && (!lastDone || newest.startDate! > lastDone.w.date) ? newest : (lastDone?.at?.program ?? favorite ?? usable[0]);
    if (!program) return null;
    const next = nextDayIndex(program, workouts, today);
    return { program, index: next, day: program.structure[next], workoutId: undefined, date: today, options: [] as SessionChoice[] };
  }, [programs, workouts, today, sport, catalogue, allTemplates, planned, pickKey]);


  return { planned, session, setPickKey };
}
