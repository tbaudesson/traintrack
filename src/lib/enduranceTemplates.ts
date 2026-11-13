import type { CardioTarget, ProgramDay } from "@/db";
import type { ProgramTemplate } from "./programTemplates";
import { ENDURANCE_TEXT, PLAN_LOCALES, type EnduranceText, type PlanLocale } from "./enduranceText";

const ex = (exerciseName: string, targetSets: number, targetReps: string, restSec = 60) => ({
  exerciseName,
  targetSets,
  targetReps,
  restSec,
});

/** Pick the item for the k-th session of a kind, holding on the last one. */
const nth = <T,>(items: T[], k: number): T => items[Math.min(k, items.length - 1)];

function dayMaker(x: EnduranceText) {
  return (week: number, label: string, cardio: CardioTarget): ProgramDay => ({
    name: `${x.week}${week} · ${label}`,
    week,
    exercises: [],
    cardio,
  });
}

// ---------------------------------------------------------------- Running

/** Long run of each week: build, ease off every fourth week, then taper. */
const MARATHON_LONG = [12, 14, 16, 13, 18, 20, 22, 16, 24, 26, 28, 20, 32, 24, 16];
const HALF_LONG = [8, 10, 12, 10, 13, 15, 16, 12, 18, 16, 12];
const TEN_K_LONG = [5, 6, 7, 6, 8, 9, 7];

interface Race {
  km: number;
  name: string;
  /** "allure marathon", "marathon pace"… */
  pace: string;
  /** Race-pace blocks as [repeats, km], from the first specific week to the last. */
  specific: [number, number][];
  /** Kilometres run at race pace at the end of the long run, specific phase. */
  longFinish: number;
}

type Phase = "base" | "build" | "specific" | "taper";

/** Phases run up to the longest long run; everything after it is the taper. */
function runPhase(week: number, peakWeek: number): Phase {
  if (week > peakWeek) return "taper";
  const third = peakWeek / 3;
  if (week <= third) return "base";
  if (week <= third * 2) return "build";
  return "specific";
}

interface Quality {
  label: string;
  work: string;
  purpose: string;
  zone: string;
  /** Distance of the main set, recoveries included. */
  km: number;
}

function quality(x: EnduranceText, phase: Phase, k: number, race: Race): Quality {
  const short = race.km <= 10;
  const reps = (long: number[], shorter: number[], i: number) => nth(short ? shorter : long, i);
  const r = x.run;
  if (phase === "base") {
    if (k % 2 === 0) {
      return { ...r.hills, work: r.hills.work(reps([6, 8, 10], [5, 6, 8], k / 2)), km: 2, zone: "Zone 4" };
    }
    const n = reps([8, 10, 12], [6, 8, 10], (k - 1) / 2);
    return { ...r.fartlek, work: r.fartlek.work(n), km: n * 0.4, zone: "Zone 4" };
  }
  if (phase === "build") {
    if (k % 2 === 0) {
      const n = reps([8, 10, 12], [6, 8, 10], k / 2);
      return { ...r.short, work: r.short.work(n), km: n * 0.6, zone: "Zone 5" };
    }
    return { label: r.threshold.label, purpose: r.threshold.purpose, work: nth(r.threshold.works, (k - 1) / 2), km: 6, zone: "Zone 4" };
  }
  if (k % 2 === 0) {
    const n = reps([5, 6], [4, 5], k / 2);
    return { ...r.long, work: r.long.work(n), km: n * 1.3, zone: "Zone 4" };
  }
  const [times, km] = nth(race.specific, (k - 1) / 2);
  return {
    label: r.specific.label,
    work: r.specific.work(`${times} × ${km} km`, race.pace),
    purpose: r.specific.purpose(race.pace),
    zone: x.intensity.racePace,
    km: times * km + 1,
  };
}

function runPlan(x: EnduranceText, longRuns: number[], race: Race, easyBase: number, withExtraEasy: boolean): ProgramDay[] {
  const day = dayMaker(x);
  const r = x.run;
  const days: ProgramDay[] = [];
  const kInPhase: Record<Phase, number> = { base: 0, build: 0, specific: 0, taper: 0 };
  const peakWeek = longRuns.indexOf(Math.max(...longRuns)) + 1;
  longRuns.forEach((long, i) => {
    const week = i + 1;
    const phase = runPhase(week, peakWeek);
    const lighter = i > 0 && long < longRuns[i - 1] && phase !== "taper";
    const easy = Math.max(4, Math.round(easyBase + long * 0.2));
    const run = (distanceKm: number, intensity: string, purpose: string, steps: string[], notes?: string): CardioTarget => ({
      sport: "run",
      distanceKm,
      intensity,
      purpose,
      steps,
      notes,
    });

    days.push(
      day(
        week,
        r.easy.label,
        run(easy, "Zone 2", r.easy.purpose, [
          r.easy.start,
          r.easy.main,
          week % 2 === 0 && phase !== "taper" ? r.easy.strides : r.easy.stretch,
        ])
      )
    );

    if (lighter) {
      days.push(day(week, r.lightFartlek.label, run(easy, "Zone 3", r.lightFartlek.purpose, r.lightFartlek.steps)));
    } else if (phase === "taper") {
      days.push(
        day(week, r.sharpen.label, run(easy, x.intensity.racePace, r.sharpen.purpose, [r.warmUp, r.sharpen.work(race.pace), r.coolDown]))
      );
    } else {
      const q = quality(x, phase, kInPhase[phase]++, race);
      days.push(day(week, q.label, run(Math.round(4 + q.km), q.zone, q.purpose, [r.warmUp, q.work, r.coolDown])));
    }

    if (withExtraEasy) {
      days.push(day(week, r.recovery.label, run(Math.max(4, easy - 2), "Zone 1", r.recovery.purpose, r.recovery.steps)));
    }

    const lr = r.longRun;
    const finish = Math.min(race.longFinish, Math.round(long * 0.3));
    const steady = Math.round(long * 0.75);
    const longSteps =
      phase === "specific" && !lighter
        ? [lr.steadyKm(long - finish), lr.finishAtPace(r.lastKm(finish), race.pace), lr.walk]
        : phase === "build" && !lighter
          ? [lr.zone2Km(steady), lr.finishHarder(r.lastKm(long - steady)), lr.walk]
          : [...lr.steady, lr.walk];
    days.push(
      day(
        week,
        lr.label,
        run(long, "Zone 2", phase === "specific" ? lr.purposeSpecific : lr.purpose, longSteps, long >= 16 ? lr.fuelLong : lr.fuelShort)
      )
    );
  });

  const week = longRuns.length + 1;
  const rw = r.raceWeek;
  days.push(day(week, r.easy.label, { sport: "run", distanceKm: 6, intensity: "Zone 2", purpose: rw.easyPurpose, steps: rw.easySteps }));
  days.push(
    day(week, rw.reminder, { sport: "run", distanceKm: 4, intensity: "Zone 3", purpose: rw.reminderPurpose, steps: rw.reminderSteps(race.pace) })
  );
  days.push(
    day(week, race.name, {
      sport: "run",
      distanceKm: race.km,
      intensity: x.intensity.race,
      purpose: rw.racePurpose,
      steps: rw.raceSteps(race.km > 21, race.pace),
      notes: rw.raceNotes,
    })
  );
  return days;
}

function couchTo5k(x: EnduranceText): ProgramDay[] {
  const day = dayMaker(x);
  const c = x.c25k;
  const minutes = [24, 24, 25, 26, 27, 28, 30];
  const days: ProgramDay[] = [];
  c.weeks.forEach(({ block, purpose }, i) => {
    for (let n = 1; n <= 3; n++) {
      days.push(
        day(i + 1, c.session(n), {
          sport: "run",
          durationMin: minutes[i] + 10,
          intensity: "Zone 2",
          purpose,
          steps: [c.warmUp, block, c.coolDown],
          notes: n === 3 ? c.notesRepeat : c.notesSlow,
        })
      );
    }
  });
  days.push(day(8, c.session(1), { sport: "run", durationMin: 35, intensity: "Zone 2", ...c.confirm }));
  days.push(day(8, c.session(2), { sport: "run", durationMin: 25, intensity: "Zone 2", ...c.fresh }));
  days.push(
    day(8, c.goal.label, {
      sport: "run",
      distanceKm: 5,
      intensity: x.intensity.race,
      purpose: c.goal.purpose,
      steps: c.goal.steps,
      notes: c.goal.notes,
    })
  );
  return days;
}

// ---------------------------------------------------------------- Swimming

interface Lap {
  metres: number;
  text: string;
}

function swimPlan(x: EnduranceText): ProgramDay[] {
  const day = dayMaker(x);
  const s = x.swim;
  const swimDay = (week: number, label: string, intensity: string, purpose: string, laps: Lap[], notes?: string): ProgramDay =>
    day(week, label, {
      sport: "swim",
      distanceKm: laps.reduce((total, lap) => total + lap.metres, 0) / 1000,
      intensity,
      purpose,
      steps: laps.map((lap) => lap.text),
      notes,
    });
  const continuous = [600, 800, 1000, 600, 1200, 1500, 1800, 1500];

  return Array.from({ length: 8 }, (_, i) => i + 1).flatMap((week) => {
    const recovery = week === 4;
    const reps = recovery ? 4 : Math.min(4 + week, 10);
    return [
      swimDay(week, s.technique, "Zone 2", s.techniquePurpose, [
        { metres: 300, text: s.techniqueWarmUp },
        { metres: 200, text: s.drill(s.drills[week - 1]) },
        { metres: 200, text: s.kick },
        { metres: reps * 100, text: s.full(reps) },
        { metres: 200, text: s.pull },
        { metres: 100, text: s.techniqueCoolDown },
      ]),
      swimDay(week, week === 8 ? s.test : s.series, recovery ? "Zone 2" : "Zone 4", week === 8 ? s.testPurpose : s.seriesPurpose, [
        { metres: 300, text: s.seriesWarmUp },
        { metres: 100, text: s.sprints },
        s.sets[week - 1],
        { metres: 200, text: s.seriesCoolDown },
      ]),
      swimDay(
        week,
        week === 8 ? s.goal : s.endurance,
        "Zone 2",
        week === 8 ? s.goalPurpose : s.endurancePurpose,
        [
          { metres: 200, text: s.enduranceWarmUp },
          { metres: continuous[week - 1], text: s.continuous(continuous[week - 1]) },
          { metres: 100, text: s.enduranceCoolDown },
        ],
        week >= 5 ? s.stopNote : undefined
      ),
    ];
  });
}

// ---------------------------------------------------------------- Cycling

function bikePlan(x: EnduranceText): ProgramDay[] {
  const day = dayMaker(x);
  const b = x.bike;
  const spins = [5, 6, 8, 4, 8, 10, 10, 4];
  const intervals = [
    { minutes: 61, zone: "Zone 3" },
    { minutes: 67, zone: "Zone 3" },
    { minutes: 60, zone: "Zone 4" },
    { minutes: 37, zone: "Zone 3" },
    { minutes: 55, zone: "Zone 5" },
    { minutes: 70, zone: "Zone 4" },
    { minutes: 61, zone: "Zone 5" },
    { minutes: 49, zone: "Zone 4" },
  ];
  const longs = [60, 75, 90, 60, 105, 120, 135, 150];

  return Array.from({ length: 8 }, (_, i) => i + 1).flatMap((week) => {
    const q = intervals[week - 1];
    const set = b.sets[week - 1];
    const long = longs[week - 1];
    return [
      day(week, b.spin, {
        sport: "bike",
        durationMin: week === 4 || week === 8 ? 40 : Math.min(45 + week * 3, 60),
        intensity: "Zone 2",
        purpose: b.spinPurpose,
        steps: b.spinSteps(spins[week - 1]),
      }),
      day(week, b.intervals, {
        sport: "bike",
        durationMin: q.minutes,
        intensity: q.zone,
        purpose: set.purpose,
        steps: [b.intervalWarmUp, set.work, b.intervalCoolDown],
        notes: b.intervalNotes,
      }),
      day(week, week === 8 ? b.goal : b.long, {
        sport: "bike",
        durationMin: long,
        intensity: "Zone 2",
        purpose: week === 8 ? b.goalPurpose : b.longPurpose,
        steps: [b.longStart, week >= 5 && week <= 7 ? b.longBuild : b.longSteady, b.longEnd],
        notes: long >= 90 ? b.fuelLong : b.fuelShort,
      }),
    ];
  });
}

// ---------------------------------------------------------------- Catalogue

/** Every endurance plan in one language. French keeps the original ids. */
export function enduranceTemplates(locale: PlanLocale): ProgramTemplate[] {
  const x = ENDURANCE_TEXT[locale];
  const p = x.plans;
  const id = (base: string) => (locale === "fr" ? base : `${base}-${locale}`);
  const describe = (text: string) => `${text}${x.caution}`;
  const race = (key: "marathon" | "half" | "tenK", km: number, specific: [number, number][], longFinish: number): Race => ({
    km,
    name: x.races[key].name,
    pace: x.races[key].pace,
    specific,
    longFinish,
  });
  const renfo = (key: "renfoRunner" | "renfoTrail" | "renfoSwimmer" | "renfoCyclist", exercises: [ReturnType<typeof ex>[], ReturnType<typeof ex>[]]) =>
    p[key].days!.map((name, i) => ({ name, exercises: exercises[i] }));

  return [
    {
      id: id("plan-marathon-16"), locale, name: p.marathon.name, description: describe(p.marathon.description),
      goal: "endurance", level: "intermediate", daysPerWeek: 4,
      structure: runPlan(x, MARATHON_LONG, race("marathon", 42.2, [[3, 3], [3, 4], [2, 6], [2, 8]], 10), 5, true),
    },
    {
      id: id("plan-semi-12"), locale, name: p.half.name, description: describe(p.half.description),
      goal: "endurance", level: "intermediate", daysPerWeek: 3,
      structure: runPlan(x, HALF_LONG, race("half", 21.1, [[3, 2], [3, 3], [2, 5]], 6), 4, false),
    },
    {
      id: id("plan-10k-8"), locale, name: p.tenK.name, description: describe(p.tenK.description),
      goal: "endurance", level: "beginner", daysPerWeek: 3,
      structure: runPlan(x, TEN_K_LONG, race("tenK", 10, [[4, 1], [3, 2]], 3), 3, false),
    },
    {
      id: id("plan-5k-8"), locale, name: p.fiveK.name, description: describe(p.fiveK.description),
      goal: "endurance", level: "beginner", daysPerWeek: 3,
      structure: couchTo5k(x),
    },
    {
      id: id("plan-natation-8"), locale, name: p.swim.name, description: describe(p.swim.description),
      goal: "endurance", level: "intermediate", daysPerWeek: 3,
      structure: swimPlan(x),
    },
    {
      id: id("plan-velo-8"), locale, name: p.bike.name, description: describe(p.bike.description),
      goal: "endurance", level: "intermediate", daysPerWeek: 3,
      structure: bikePlan(x),
    },
    {
      id: id("renfo-coureur"), locale, name: p.renfoRunner.name, description: p.renfoRunner.description,
      goal: "endurance", level: "beginner", daysPerWeek: 2, homeFriendly: true,
      structure: renfo("renfoRunner", [
        [ex("Bulgarian Split Squat", 3, "8-10", 90), ex("Single-Leg Calf Raise", 3, "12-15"), ex("Glute Bridge", 3, "12-15"), ex("Side Plank", 3, "30-45s")],
        [ex("Single-Leg Romanian Deadlift", 3, "8-10", 90), ex("Step-up", 3, "10-12"), ex("Dead Bug", 3, "10-12"), ex("Plank", 3, "45-60s")],
      ]),
    },
    {
      id: id("renfo-trail"), locale, name: p.renfoTrail.name, description: p.renfoTrail.description,
      goal: "endurance", level: "intermediate", daysPerWeek: 2,
      structure: renfo("renfoTrail", [
        [ex("Back Squat", 4, "6-8", 150), ex("Step-up", 3, "10-12", 90), ex("Single-Leg Calf Raise", 3, "15-20"), ex("Side Plank", 3, "45-60s")],
        [ex("Walking Lunge", 4, "10-12", 90), ex("Single-Leg Romanian Deadlift", 3, "8-10", 90), ex("Leg Curl", 3, "10-12"), ex("Bird Dog", 3, "10-12")],
      ]),
    },
    {
      id: id("renfo-nageur"), locale, name: p.renfoSwimmer.name, description: p.renfoSwimmer.description,
      goal: "endurance", level: "intermediate", daysPerWeek: 2,
      structure: renfo("renfoSwimmer", [
        [ex("Lat Pulldown", 4, "8-10", 90), ex("Straight-Arm Pulldown", 3, "12-15"), ex("Seated Cable Row", 3, "10-12", 90), ex("External Shoulder Rotation", 3, "15-20")],
        [ex("Pull-up", 3, "5-8", 120), ex("Face Pull", 3, "15-20"), ex("Dead Bug", 3, "10-12"), ex("Side Plank", 3, "30-45s")],
      ]),
    },
    {
      id: id("renfo-cycliste"), locale, name: p.renfoCyclist.name, description: p.renfoCyclist.description,
      goal: "endurance", level: "intermediate", daysPerWeek: 2,
      structure: renfo("renfoCyclist", [
        [ex("Back Squat", 4, "6-8", 150), ex("Hip Thrust", 3, "8-10", 90), ex("Standing Calf Raise", 3, "12-15")],
        [ex("Bulgarian Split Squat", 3, "8-10", 90), ex("Romanian Deadlift", 3, "8-10", 90), ex("Bird Dog", 3, "10-12"), ex("Plank", 3, "45-60s")],
      ]),
    },
  ];
}

/** The endurance plans in every language; each user is offered their own. */
export const ENDURANCE_TEMPLATES: ProgramTemplate[] = PLAN_LOCALES.flatMap(enduranceTemplates);
