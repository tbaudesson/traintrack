"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { sessionHref } from "@/lib/routes";
import { lastRepeatable, repeatWorkout, startWorkoutFromDay, type StartOptions } from "@/lib/startWorkout";
import { sameWeekday } from "@/lib/suggest";
import { createWorkout } from "@/hooks/useWorkouts";
import type { AthleteProfile, Exercise, Program, ProgramDay, Sport, Workout, WorkoutSet } from "@/db";

/**
 * The ways to start a session, shared by the home screen, its session picker
 * and the training hub: a day of a program (or a shorter version of it), the
 * last session again, a free one, an endurance outing. Each opens the session
 * once it is created. The data comes from the page, already loaded.
 */
export function useStartActions({
  today,
  workouts,
  sets,
  exercises,
  profile,
  lighter,
  onStart,
}: {
  today: string;
  workouts: Workout[];
  sets: WorkoutSet[];
  exercises: Exercise[];
  profile: AthleteProfile | null | undefined;
  /** How a session starts today: lighter on a deload week or a day of low form. */
  lighter?: StartOptions;
  /** Called before a session starts: closes the dialogs that led to it. */
  onStart?: () => void;
}) {
  const router = useRouter();
  const tl = useTranslations("log");
  const tc = useTranslations("cardio");
  const [starting, setStarting] = useState(false);
  const repeatable = lastRepeatable(workouts, sets, today);
  // The session of this weekday lately, when it is not the last one already offered.
  const likeLastWeek = sameWeekday(workouts, sets, today, repeatable);

  async function open(create: () => Promise<string>) {
    onStart?.();
    setStarting(true);
    try {
      router.push(await create());
    } finally {
      setStarting(false);
    }
  }

  /** A day of a program; a shorter version of it when given (still that day of the program). */
  const startDay = (program: Program, index: number, shorter?: ProgramDay) =>
    open(async () => {
      // A beginner's very first session opens in guided mode.
      const first = workouts.length === 0 && profile?.fitnessLevel === "beginner";
      const source = shorter ? { ...program, structure: program.structure.map((d, i) => (i === index ? shorter : d)) } : program;
      const id = await startWorkoutFromDay(source, index, exercises, today, lighter);
      return first && !program.structure[index]?.cardio ? `${sessionHref(id)}&guided=1` : sessionHref(id);
    });

  const startFree = () => open(async () => sessionHref(await createWorkout({ date: today, title: tl("newWorkout") })));

  const repeatLast = () =>
    repeatable ? open(async () => sessionHref(await repeatWorkout(repeatable, today, lighter))) : Promise.resolve();

  const repeat = (source: Workout) => open(async () => sessionHref(await repeatWorkout(source, today, lighter)));

  const startCardio = (sport: Sport) =>
    open(async () => sessionHref(await createWorkout({ date: today, title: tc(`sport_${sport}`), kind: "cardio", sport })));

  return { starting, repeatable, likeLastWeek, startDay, startFree, repeatLast, repeat, startCardio };
}
