import type { CardioTarget, ProgramDay, SpinBlock, SpinKind } from "@/db";
import type { ProgramTemplate } from "./programTemplates";
import { PLAN_LOCALES, type PlanLocale } from "./enduranceText";
import { SPINNING_TEXT, type SpinningText } from "./spinningText";

const b = (kind: SpinKind, sec: number, rpm: [number, number], resistance: number): SpinBlock => ({ kind, sec, rpm, resistance });
const times = (n: number, blocks: SpinBlock[]): SpinBlock[] => Array.from({ length: n }, () => blocks).flat();

const WARM_UP = [b("warmup", 300, [80, 90], 3)];
const COOL_DOWN = [b("cooldown", 240, [70, 80], 2)];

/** How long the blocks last, in whole minutes. */
export const blocksMinutes = (blocks: SpinBlock[]) => Math.round(blocks.reduce((sum, x) => sum + x.sec, 0) / 60);

/** The blocks of each beginner session, by week: a lighter week 4. */
const BEGINNER = {
  endurance: [4, 5, 5, 3, 6, 6],
  hills: [4, 5, 6, 3, 6, 7],
  rhythm: [8, 10, 12, 6, 14, 16],
};

export function beginnerSessions(week: number) {
  const i = week - 1;
  return {
    endurance: [
      ...WARM_UP,
      ...times(BEGINNER.endurance[i], [b("seated", 240, [85, 95], 4), b("fast", 60, [100, 110], 3), b("recovery", 60, [80, 90], 2)]),
      ...COOL_DOWN,
    ],
    hills: [
      ...WARM_UP,
      ...times(BEGINNER.hills[i], [b("climb", 120, [70, 80], 6), b("standing", 60, [60, 70], 7), b("recovery", 120, [80, 90], 2)]),
      ...COOL_DOWN,
    ],
    rhythm: [
      ...WARM_UP,
      b("seated", 300, [85, 95], 4),
      ...times(BEGINNER.rhythm[i], [b("sprint", 20, [110, 120], 5), b("recovery", 70, [80, 90], 2)]),
      b("seated", 300, [85, 95], 4),
      ...COOL_DOWN,
    ],
  };
}

/** HIIT, by week: weeks 4 and 8 lighter, the resistance a notch up in the second half. */
const HIIT = {
  pyramid: [1, 1, 2, 1, 2, 2, 2, 1],
  tabata: [3, 3, 4, 2, 4, 4, 5, 3],
  climb: [3, 3, 4, 3, 4, 5, 5, 3],
};
const PYRAMID = [30, 60, 90, 120, 90, 60, 30];

export function hiitSessions(week: number) {
  const i = week - 1;
  const up = week > 4 ? 1 : 0;
  const longWarmUp = [b("warmup", 420, [80, 90], 3), b("fast", 60, [100, 110], 3)];
  return {
    pyramid: [
      ...longWarmUp,
      ...times(
        HIIT.pyramid[i],
        PYRAMID.flatMap((sec) => [sec <= 60 ? b("sprint", sec, [105, 115], 6 + up) : b("standing", sec, [80, 90], 7 + up), b("recovery", sec, [80, 90], 2)])
      ),
      ...COOL_DOWN,
    ],
    tabata: [
      ...longWarmUp,
      ...times(HIIT.tabata[i], [...times(8, [b("sprint", 20, [110, 125], 6 + up), b("recovery", 10, [70, 80], 2)]), b("recovery", 120, [80, 90], 2)]),
      ...COOL_DOWN,
    ],
    climb: [
      ...longWarmUp,
      ...times(HIIT.climb[i], [b("climb", 240, [65, 75], 7 + up), b("standing", 60, [60, 70], 8 + up), b("recovery", 120, [80, 90], 2)]),
      ...COOL_DOWN,
    ],
  };
}

function day(x: SpinningText, week: number, label: string, blocks: SpinBlock[], cardio: Omit<CardioTarget, "sport" | "durationMin" | "blocks" | "notes">): ProgramDay {
  return {
    name: `${x.week}${week} · ${label}`,
    week,
    exercises: [],
    cardio: { sport: "bike", durationMin: blocksMinutes(blocks), ...cardio, steps: [x.warmUp, ...(cardio.steps ?? []), x.coolDown], notes: x.safety, blocks },
  };
}

function beginnerPlan(x: SpinningText): ProgramDay[] {
  const t = x.beginner;
  return Array.from({ length: 6 }, (_, i) => i + 1).flatMap((week) => {
    const s = beginnerSessions(week);
    return [
      day(x, week, t.endurance, s.endurance, { intensity: "Zone 2–3", purpose: t.endurancePurpose, steps: t.enduranceSteps(BEGINNER.endurance[week - 1]) }),
      day(x, week, t.hills, s.hills, { intensity: "Zone 3–4", purpose: t.hillsPurpose, steps: t.hillsSteps(BEGINNER.hills[week - 1]) }),
      day(x, week, t.rhythm, s.rhythm, { intensity: "Zone 2–5", purpose: t.rhythmPurpose, steps: t.rhythmSteps(BEGINNER.rhythm[week - 1]) }),
    ];
  });
}

function hiitPlan(x: SpinningText): ProgramDay[] {
  const t = x.hiit;
  return Array.from({ length: 8 }, (_, i) => i + 1).flatMap((week) => {
    const s = hiitSessions(week);
    return [
      day(x, week, t.pyramid, s.pyramid, { intensity: "Zone 4–5", purpose: t.pyramidPurpose, steps: t.pyramidSteps(HIIT.pyramid[week - 1]) }),
      day(x, week, t.tabata, s.tabata, { intensity: "Zone 5", purpose: t.tabataPurpose, steps: t.tabataSteps(HIIT.tabata[week - 1]) }),
      day(x, week, t.climb, s.climb, { intensity: "Zone 3–4", purpose: t.climbPurpose, steps: t.climbSteps(HIIT.climb[week - 1]) }),
    ];
  });
}

/** The spinning plans in one language. French keeps the ids without suffix. */
export function spinningTemplates(locale: PlanLocale): ProgramTemplate[] {
  const x = SPINNING_TEXT[locale];
  const id = (base: string) => (locale === "fr" ? base : `${base}-${locale}`);
  return [
    {
      id: id("spinning-debutant-6"), locale, name: x.beginner.name, description: x.beginner.description,
      goal: "endurance", level: "beginner", daysPerWeek: 3, homeFriendly: true,
      structure: beginnerPlan(x),
    },
    {
      id: id("spinning-hiit-8"), locale, name: x.hiit.name, description: x.hiit.description,
      goal: "endurance", level: "intermediate", daysPerWeek: 3, homeFriendly: true,
      structure: hiitPlan(x),
    },
  ];
}

export const SPINNING_TEMPLATES: ProgramTemplate[] = PLAN_LOCALES.flatMap(spinningTemplates);
