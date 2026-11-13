import type { CardioTarget, ProgramDay } from "@/db";
import type { ProgramTemplate } from "./programTemplates";

const ex = (exerciseName: string, targetSets: number, targetReps: string, restSec = 60) => ({
  exerciseName,
  targetSets,
  targetReps,
  restSec,
});

const day = (week: number, label: string, cardio: CardioTarget): ProgramDay => ({
  name: `S${week} · ${label}`,
  week,
  exercises: [],
  cardio,
});

const CAUTION = " Avis médical conseillé avant de commencer. À adapter à vos sensations.";

/** Pick the item for the k-th session of a kind, holding on the last one. */
const nth = <T,>(items: T[], k: number): T => items[Math.min(k, items.length - 1)];

// ---------------------------------------------------------------- Running

/** Long run of each week: build, ease off every fourth week, then taper. */
const MARATHON_LONG = [12, 14, 16, 13, 18, 20, 22, 16, 24, 26, 28, 20, 32, 24, 16];
const HALF_LONG = [8, 10, 12, 10, 13, 15, 16, 12, 18, 16, 12];
const TEN_K_LONG = [5, 6, 7, 6, 8, 9, 7];

interface Race {
  km: number;
  name: string;
  /** "allure marathon", "allure semi", "allure 10 km". */
  pace: string;
  /** Race-pace blocks, from the first specific week to the last. */
  specific: string[];
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

const WARM_UP = "Échauffement : 15 min de footing très facile, puis 4 gammes (montées de genoux, talons-fesses) sur 20 m";
const COOL_DOWN = "Retour au calme : 10 min de footing très lent, puis étirements doux";

const lastKm = (km: number) => (km > 1 ? `${km} derniers km` : "Le dernier km");

interface Quality {
  label: string;
  work: string;
  purpose: string;
  zone: string;
  /** Distance of the main set, recoveries included. */
  km: number;
}

function quality(phase: Phase, k: number, race: Race): Quality {
  const short = race.km <= 10;
  const reps = (long: number[], shorter: number[], i: number) => nth(short ? shorter : long, i);
  if (phase === "base") {
    return k % 2 === 0
      ? {
          label: "Côtes",
          work: `${reps([6, 8, 10], [5, 6, 8], k / 2)} × 45 s en côte à bonne allure, retour en trottinant`,
          km: 2,
          purpose: "Renforcer les jambes et la foulée sans la violence du fractionné sur le plat.",
          zone: "Zone 4",
        }
      : {
          label: "Fartlek",
          work: `${reps([8, 10, 12], [6, 8, 10], (k - 1) / 2)} × (1 min vite, 1 min lent), au feeling`,
          km: reps([8, 10, 12], [6, 8, 10], (k - 1) / 2) * 0.4,
          purpose: "Habituer le corps aux changements de rythme, en jouant.",
          zone: "Zone 4",
        };
  }
  if (phase === "build") {
    return k % 2 === 0
      ? {
          label: "Fractionné court",
          work: `${reps([8, 10, 12], [6, 8, 10], k / 2)} × 400 m rapides, 1 min 30 de récupération en trottinant`,
          km: reps([8, 10, 12], [6, 8, 10], k / 2) * 0.6,
          purpose: "Développer la vitesse maximale aérobie : courir plus vite devient plus facile.",
          zone: "Zone 5",
        }
      : {
          label: "Seuil",
          work: nth(["3 × 8 min soutenu, 2 min de récupération", "3 × 10 min soutenu, 2 min de récupération", "2 × 15 min soutenu, 3 min de récupération"], (k - 1) / 2),
          purpose: "Repousser le seuil : tenir longtemps une allure soutenue sans s'asphyxier.",
          zone: "Zone 4",
          km: 6,
        };
  }
  return k % 2 === 0
    ? {
        label: "Fractionné long",
        work: `${reps([5, 6], [4, 5], k / 2)} × 1000 m soutenus, 2 min de récupération en trottinant`,
        km: reps([5, 6], [4, 5], k / 2) * 1.3,
        purpose: "Entretenir la vitesse acquise sur des efforts plus longs.",
        zone: "Zone 4",
      }
    : {
        label: "Allure spécifique",
        work: `${nth(race.specific, (k - 1) / 2)} à ${race.pace}, 2 min de récupération`,
        purpose: `Mémoriser l'${race.pace} pour la retrouver sans montre le jour J.`,
        zone: "Allure course",
        km: Number(nth(race.specific, (k - 1) / 2).split(" × ").reduce((a, b) => String(Number(a) * parseFloat(b)))) + 1,
      };
}

function runPlan(longRuns: number[], race: Race, easyBase: number, withExtraEasy: boolean): ProgramDay[] {
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
        "Footing",
        run(
          easy,
          "Zone 2",
          "Construire l'endurance de base sans accumuler de fatigue.",
          [
            "5 min de trot très lent pour démarrer",
            "Course continue à allure confortable : vous devez pouvoir parler en phrases complètes",
            week % 2 === 0 && phase !== "taper"
              ? "Pour finir : 5 lignes droites de 80 m en accélérant progressivement, retour en marchant"
              : "Étirements doux des mollets et de l'arrière des cuisses",
          ]
        )
      )
    );

    if (lighter) {
      days.push(
        day(
          week,
          "Fartlek léger",
          run(easy, "Zone 3", "Semaine allégée : garder du rythme tout en laissant le corps assimiler.", [
            "10 min de footing facile",
            "6 × (1 min un peu plus vite, 2 min facile)",
            "10 min de footing facile",
          ])
        )
      );
    } else if (phase === "taper") {
      days.push(
        day(
          week,
          "Rappel d'allure",
          run(easy, "Allure course", "Garder les sensations de vitesse en réduisant le volume.", [
            WARM_UP,
            `3 × 1 km à ${race.pace}, 2 min de récupération`,
            COOL_DOWN,
          ])
        )
      );
    } else {
      const q = quality(phase, kInPhase[phase]++, race);
      days.push(day(week, q.label, run(Math.round(4 + q.km), q.zone, q.purpose, [WARM_UP, q.work, COOL_DOWN])));
    }

    if (withExtraEasy) {
      days.push(
        day(
          week,
          "Récupération",
          run(Math.max(4, easy - 2), "Zone 1", "Faire circuler le sang pour mieux récupérer, sans rien ajouter à la fatigue.", [
            "Footing très lent, sur terrain souple si possible",
            "5 min de marche, puis mobilité des hanches et des chevilles",
          ])
        )
      );
    }

    const finish = Math.min(race.longFinish, Math.round(long * 0.3));
    const longSteps =
      phase === "specific" && !lighter
        ? [
            `${long - finish} km en Zone 2, régulier`,
            `${lastKm(finish)} à ${race.pace}`,
            "5 min de marche pour terminer",
          ]
        : phase === "build" && !lighter
          ? [
              `${Math.round(long * 0.75)} km en Zone 2`,
              `${lastKm(long - Math.round(long * 0.75))} un peu plus soutenus (Zone 3)`,
              "5 min de marche pour terminer",
            ]
          : [
              "10 premières minutes très tranquilles",
              "Allure régulière en Zone 2 jusqu'au bout, quitte à marcher dans les côtes",
              "5 min de marche pour terminer",
            ];
    days.push(
      day(
        week,
        "Sortie longue",
        run(
          long,
          "Zone 2",
          phase === "specific"
            ? "Apprendre à tenir l'allure de course sur des jambes fatiguées."
            : "Habituer le corps à courir longtemps : c'est la séance clé de la semaine.",
          longSteps,
          long >= 16
            ? "Testez votre ravitaillement de course : boire toutes les 20 min, un gel ou une barre toutes les 40 min."
            : "Partez avec de l'eau s'il fait chaud."
        )
      )
    );
  });

  const week = longRuns.length + 1;
  days.push(
    day(week, "Footing", {
      sport: "run",
      distanceKm: 6,
      intensity: "Zone 2",
      purpose: "Rester en mouvement sans puiser dans les réserves.",
      steps: ["Footing court et facile", "3 lignes droites de 80 m pour réveiller les jambes"],
    })
  );
  days.push(
    day(week, "Rappel", {
      sport: "run",
      distanceKm: 4,
      intensity: "Zone 3",
      purpose: "Deux ou trois jours avant la course : garder le jus sans se fatiguer.",
      steps: ["15 min de footing facile", `3 × 2 min à ${race.pace}, 2 min de récupération`, "5 min de footing lent"],
    })
  );
  days.push(
    day(week, race.name, {
      sport: "run",
      distanceKm: race.km,
      intensity: "Course",
      purpose: "Le jour J : profiter du travail accumulé.",
      steps: [
        "La veille : repas habituel riche en féculents, affaires préparées, dossard épinglé",
        race.km > 21 ? "Échauffement : 5 min de trot suffisent, gardez votre énergie" : "Échauffement : 10 min de trot et 3 lignes droites",
        `Premier tiers : partez à ${race.pace}, surtout pas plus vite malgré l'euphorie du départ`,
        "Deuxième tiers : restez régulier et ravitaillez-vous comme à l'entraînement",
        "Dernier tiers : relâchez les épaules et accélérez si les jambes le permettent",
      ],
      notes: "Bonne course !",
    })
  );
  return days;
}

function couchTo5k(): ProgramDay[] {
  const weeks = [
    { block: "8 × (1 min de course, 2 min de marche)", minutes: 24, purpose: "Démarrer en douceur : le corps découvre l'impact de la course." },
    { block: "6 × (2 min de course, 2 min de marche)", minutes: 24, purpose: "Allonger un peu les temps de course." },
    { block: "5 × (3 min de course, 2 min de marche)", minutes: 25, purpose: "Le souffle s'installe : courir 3 minutes devient naturel." },
    { block: "4 × (5 min de course, 1 min 30 de marche)", minutes: 26, purpose: "Premier vrai cap : 5 minutes sans s'arrêter." },
    { block: "3 × (8 min de course, 1 min 30 de marche)", minutes: 27, purpose: "Les blocs s'allongent, les pauses raccourcissent." },
    { block: "2 × (12 min de course, 1 min 30 de marche)", minutes: 28, purpose: "Plus que deux blocs : vous courez presque 25 minutes." },
    { block: "25 min de course sans s'arrêter", minutes: 30, purpose: "Le grand saut : 25 minutes en continu." },
  ];
  const days: ProgramDay[] = [];
  weeks.forEach(({ block, minutes, purpose }, i) => {
    for (let n = 1; n <= 3; n++) {
      days.push(
        day(i + 1, `Séance ${n}`, {
          sport: "run",
          durationMin: minutes + 10,
          intensity: "Zone 2",
          purpose,
          steps: [
            "Échauffement : 5 min de marche rapide",
            block,
            "Retour au calme : 5 min de marche, puis étirements des mollets",
          ],
          notes:
            n === 3
              ? "Si la séance a été trop dure, refaites cette semaine avant de passer à la suivante."
              : "Courez lentement : si vous ne pouvez pas parler, ralentissez.",
        })
      );
    }
  });
  days.push(
    day(8, "Séance 1", {
      sport: "run",
      durationMin: 35,
      intensity: "Zone 2",
      purpose: "Confirmer : 25 minutes de course, cette fois avec plus d'aisance.",
      steps: ["5 min de marche rapide", "25 min de course continue", "5 min de marche"],
    })
  );
  days.push(
    day(8, "Séance 2", {
      sport: "run",
      durationMin: 25,
      intensity: "Zone 2",
      purpose: "Une séance courte pour arriver frais.",
      steps: ["5 min de marche rapide", "15 min de course facile", "5 min de marche"],
    })
  );
  days.push(
    day(8, "Objectif 5 km", {
      sport: "run",
      distanceKm: 5,
      intensity: "Course",
      purpose: "Votre premier 5 km : l'objectif est de finir, pas le chrono.",
      steps: [
        "5 min de marche rapide et 2 min de trot",
        "Premier kilomètre plus lent que vous ne le pensez",
        "À partir du 4e km, accélérez si vous vous sentez bien",
      ],
      notes: "Bravo, vous êtes coureur !",
    })
  );
  return days;
}

// ---------------------------------------------------------------- Swimming

interface Lap {
  metres: number;
  text: string;
}

const swimDay = (week: number, label: string, intensity: string, purpose: string, laps: Lap[], notes?: string): ProgramDay =>
  day(week, label, {
    sport: "swim",
    distanceKm: laps.reduce((total, lap) => total + lap.metres, 0) / 1000,
    intensity,
    purpose,
    steps: laps.map((lap) => lap.text),
    notes,
  });

const DRILLS = [
  "rattrapé (une main attend l'autre devant)",
  "poings fermés (sentir l'appui de l'avant-bras)",
  "6 battements sur le côté, puis 1 mouvement de bras",
  "respiration tous les 3 temps",
  "godille avant (mains devant, petits mouvements)",
  "nage 1 bras (l'autre le long du corps)",
  "rattrapé, en comptant ses mouvements par longueur",
  "nage complète en cherchant à faire un mouvement de moins par longueur",
];

function swimPlan(): ProgramDay[] {
  const recovery = (week: number) => week === 4;
  const series: Lap[] = [
    { metres: 400, text: "8 × 50 m soutenu, 20 s de récupération" },
    { metres: 600, text: "6 × 100 m soutenu, 20 s de récupération" },
    { metres: 800, text: "Pyramide 50-100-150-200-150-100-50 m soutenu, 20 s de récupération" },
    { metres: 300, text: "6 × 50 m en aisance, 20 s de récupération" },
    { metres: 800, text: "8 × 100 m allure seuil, 15 s de récupération" },
    { metres: 800, text: "4 × 200 m allure seuil, 30 s de récupération" },
    { metres: 1000, text: "10 × 100 m allure seuil, 15 s de récupération" },
    { metres: 400, text: "Test : 400 m chronométré, notez votre temps" },
  ];
  const continuous = [600, 800, 1000, 600, 1200, 1500, 1800, 1500];

  return Array.from({ length: 8 }, (_, i) => i + 1).flatMap((week) => {
    const reps = recovery(week) ? 4 : Math.min(4 + week, 10);
    return [
      swimDay(week, "Technique", "Zone 2", "Nager mieux avant de nager plus : une meilleure glisse, c'est de la vitesse gratuite.", [
        { metres: 300, text: "Échauffement : 200 m crawl souple, 100 m dos" },
        { metres: 200, text: `Éducatif : 4 × 50 m ${DRILLS[week - 1]}, 15 s de récupération` },
        { metres: 200, text: "4 × 50 m battements avec planche, 20 s de récupération" },
        { metres: reps * 100, text: `${reps} × 100 m nage complète en appliquant l'éducatif, 20 s de récupération` },
        { metres: 200, text: "200 m avec pull-buoy, en se concentrant sur la traction" },
        { metres: 100, text: "Retour au calme : 100 m dos ou brasse, très souple" },
      ]),
      swimDay(
        week,
        week === 8 ? "Test" : "Séries",
        recovery(week) ? "Zone 2" : "Zone 4",
        week === 8
          ? "Mesurer vos progrès : comparez ce 400 m avec celui que vous ferez dans quelques mois."
          : "Habituer le corps à nager vite avec peu de récupération.",
        [
          { metres: 300, text: "Échauffement : 200 m crawl souple, 4 × 25 m en accélérant" },
          { metres: 100, text: "4 × 25 m vite, 30 s de récupération" },
          series[week - 1],
          { metres: 200, text: "Retour au calme : 200 m très souple, en variant les nages" },
        ]
      ),
      swimDay(
        week,
        week === 8 ? "Objectif 1500 m" : "Endurance",
        "Zone 2",
        week === 8 ? "Le but du plan : 1500 m sans vous arrêter." : "Tenir longtemps sans s'arrêter, à une allure que vous pourriez garder encore.",
        [
          { metres: 200, text: "Échauffement : 200 m en variant les nages" },
          {
            metres: continuous[week - 1],
            text: `${continuous[week - 1]} m de nage continue, régulière, en respirant tous les 3 temps si possible`,
          },
          { metres: 100, text: "Retour au calme : 100 m dos" },
        ],
        week >= 5 ? "Si vous devez vous arrêter, reprenez après 20 s au bord : le but est la distance." : undefined
      ),
    ];
  });
}

// ---------------------------------------------------------------- Cycling

interface Ride {
  label: string;
  minutes: number;
  intensity: string;
  purpose: string;
  steps: string[];
  notes?: string;
}

const rideDay = (week: number, ride: Ride): ProgramDay =>
  day(week, ride.label, {
    sport: "bike",
    durationMin: ride.minutes,
    intensity: ride.intensity,
    purpose: ride.purpose,
    steps: ride.steps,
    notes: ride.notes,
  });

function bikePlan(): ProgramDay[] {
  const spins = [5, 6, 8, 4, 8, 10, 10, 4];
  const intervals: { work: string; minutes: number; zone: string; purpose: string }[] = [
    { work: "3 × 8 min en Zone 3-4, 4 min de récupération", minutes: 61, zone: "Zone 3", purpose: "Le « sweet spot » : beaucoup de bénéfice pour une fatigue raisonnable." },
    { work: "3 × 10 min en Zone 3-4, 4 min de récupération", minutes: 67, zone: "Zone 3", purpose: "Allonger les blocs pour tenir une allure soutenue plus longtemps." },
    { work: "2 × 15 min en Zone 4, 5 min de récupération", minutes: 60, zone: "Zone 4", purpose: "Travailler au seuil : l'effort qui fait le plus progresser en vélo." },
    { work: "4 × 1 min vif, 2 min de récupération", minutes: 37, zone: "Zone 3", purpose: "Semaine allégée : un peu de rythme, sans fatigue." },
    { work: "5 × 3 min en Zone 5, 3 min de récupération", minutes: 55, zone: "Zone 5", purpose: "Développer la puissance pour les côtes et les relances." },
    { work: "2 × 20 min en Zone 4, 5 min de récupération", minutes: 70, zone: "Zone 4", purpose: "Deux longs blocs au seuil : la séance la plus exigeante du plan." },
    { work: "6 × 3 min en Zone 5, 3 min de récupération", minutes: 61, zone: "Zone 5", purpose: "Dernier bloc intense avant de relâcher." },
    { work: "3 × 5 min en Zone 4, 3 min de récupération", minutes: 49, zone: "Zone 4", purpose: "Garder les sensations avant la sortie objectif." },
  ];
  const longs = [60, 75, 90, 60, 105, 120, 135, 150];

  return Array.from({ length: 8 }, (_, i) => i + 1).flatMap((week) => {
    const q = intervals[week - 1];
    const long = longs[week - 1];
    const minutes = week === 4 || week === 8 ? 40 : Math.min(45 + week * 3, 60);
    return [
      rideDay(week, {
        label: "Vélocité",
        minutes,
        intensity: "Zone 2",
        purpose: "Pédaler plus rond et plus souple : économiser les jambes sur les longues sorties.",
        steps: [
          "10 min très facile, petit braquet",
          `${spins[week - 1]} × 1 min à cadence élevée (100-110 tours/min) sans forcer, 2 min normal entre chaque`,
          "Le reste en Zone 2, cadence autour de 90 tours/min",
          "5 min très facile pour finir",
        ],
      }),
      rideDay(week, {
        label: "Intervalles",
        minutes: q.minutes,
        intensity: q.zone,
        purpose: q.purpose,
        steps: ["Échauffement : 15 min progressif, dont 3 accélérations de 15 s", q.work, "Retour au calme : 10 min très facile"],
        notes: "Sur home-trainer, c'est la séance idéale : pas de feux ni de descentes pour casser l'effort.",
      }),
      rideDay(week, {
        label: week === 8 ? "Sortie objectif" : "Sortie longue",
        minutes: long,
        intensity: "Zone 2",
        purpose:
          week === 8
            ? "La sortie de 2 h 30 que vous visez : régulière, bien ravitaillée."
            : "Construire le fond : la base de tout le reste.",
        steps: [
          "15 min de mise en route très facile",
          week >= 5 && week <= 7
            ? `Zone 2, avec 2 × 10 min en Zone 3 dans la dernière heure`
            : "Zone 2 régulière : dans les côtes, restez assis et réduisez le braquet",
          "10 min très facile pour finir",
        ],
        notes:
          long >= 90
            ? "Buvez toutes les 15 min et mangez toutes les 30 à 40 min dès la première heure."
            : "Une gourde suffit, emportez une barre au cas où.",
      }),
    ];
  });
}

/** Plans whose days follow each other week after week. */
export const ENDURANCE_TEMPLATES: ProgramTemplate[] = [
  {
    id: "plan-marathon-16", name: "Marathon en 16 semaines",
    description: `Pour courir 10 km sans difficulté et viser le marathon. Quatre sorties par semaine en quatre phases : fondations, développement, travail à allure marathon, affûtage. Sortie longue jusqu'à 32 km.${CAUTION}`,
    goal: "endurance", level: "intermediate", daysPerWeek: 4,
    structure: runPlan(MARATHON_LONG, { km: 42.2, name: "Marathon", pace: "allure marathon", specific: ["3 × 3 km", "3 × 4 km", "2 × 6 km", "2 × 8 km"], longFinish: 10 }, 5, true),
  },
  {
    id: "plan-semi-12", name: "Semi-marathon en 12 semaines",
    description: `Pour qui court déjà 10 km. Trois sorties par semaine : un footing, une séance de qualité qui évolue (côtes, seuil, fractionné, allure semi) et une sortie longue jusqu'à 18 km.${CAUTION}`,
    goal: "endurance", level: "intermediate", daysPerWeek: 3,
    structure: runPlan(HALF_LONG, { km: 21.1, name: "Semi-marathon", pace: "allure semi", specific: ["3 × 2 km", "3 × 3 km", "2 × 5 km"], longFinish: 6 }, 4, false),
  },
  {
    id: "plan-10k-8", name: "10 km en 8 semaines",
    description: `Pour qui court 30 minutes sans s'arrêter. Trois sorties par semaine, des côtes au fractionné, pour réussir votre 10 km.${CAUTION}`,
    goal: "endurance", level: "beginner", daysPerWeek: 3,
    structure: runPlan(TEN_K_LONG, { km: 10, name: "10 km", pace: "allure 10 km", specific: ["4 × 1 km", "3 × 2 km"], longFinish: 3 }, 3, false),
  },
  {
    id: "plan-5k-8", name: "Débuter la course : 5 km",
    description: `De zéro à 5 km en 8 semaines, en alternant course et marche. Chaque semaine allonge un peu les temps de course ; refaites une semaine si besoin.${CAUTION}`,
    goal: "endurance", level: "beginner", daysPerWeek: 3,
    structure: couchTo5k(),
  },
  {
    id: "plan-natation-8", name: "Natation endurance",
    description: `Pour qui nage déjà 200 m de crawl. Chaque semaine : une séance de technique avec un nouvel éducatif, une séance de séries, une séance d'endurance. Semaine 4 allégée, test 400 m et 1500 m continu en semaine 8.${CAUTION}`,
    goal: "endurance", level: "intermediate", daysPerWeek: 3,
    structure: swimPlan(),
  },
  {
    id: "plan-velo-8", name: "Vélo endurance",
    description: `Trois sorties par semaine : vélocité, intervalles qui progressent du sweet spot à la puissance, et sortie longue jusqu'à 2 h 30. Semaine 4 allégée. Fonctionne aussi sur home-trainer.${CAUTION}`,
    goal: "endurance", level: "intermediate", daysPerWeek: 3,
    structure: bikePlan(),
  },
  {
    id: "renfo-coureur", name: "Renfo coureur",
    description: "Hanches, mollets et gainage : deux séances courtes pour courir plus solide.",
    goal: "endurance", level: "beginner", daysPerWeek: 2, homeFriendly: true,
    structure: [
      { name: "Renfo A", exercises: [ex("Bulgarian Split Squat", 3, "8-10", 90), ex("Single-Leg Calf Raise", 3, "12-15"), ex("Glute Bridge", 3, "12-15"), ex("Side Plank", 3, "30-45s")] },
      { name: "Renfo B", exercises: [ex("Single-Leg Romanian Deadlift", 3, "8-10", 90), ex("Step-up", 3, "10-12"), ex("Dead Bug", 3, "10-12"), ex("Plank", 3, "45-60s")] },
    ],
  },
  {
    id: "renfo-trail", name: "Renfo trail",
    description: "Force des jambes et stabilité pour encaisser les montées et les descentes.",
    goal: "endurance", level: "intermediate", daysPerWeek: 2,
    structure: [
      { name: "Montées", exercises: [ex("Back Squat", 4, "6-8", 150), ex("Step-up", 3, "10-12", 90), ex("Single-Leg Calf Raise", 3, "15-20"), ex("Side Plank", 3, "45-60s")] },
      { name: "Descentes", exercises: [ex("Walking Lunge", 4, "10-12", 90), ex("Single-Leg Romanian Deadlift", 3, "8-10", 90), ex("Leg Curl", 3, "10-12"), ex("Bird Dog", 3, "10-12")] },
    ],
  },
  {
    id: "renfo-nageur", name: "Renfo nageur",
    description: "Dos, épaules et gainage pour une nage plus puissante et des épaules protégées.",
    goal: "endurance", level: "intermediate", daysPerWeek: 2,
    structure: [
      { name: "Tirage", exercises: [ex("Lat Pulldown", 4, "8-10", 90), ex("Straight-Arm Pulldown", 3, "12-15"), ex("Seated Cable Row", 3, "10-12", 90), ex("External Shoulder Rotation", 3, "15-20")] },
      { name: "Gainage", exercises: [ex("Pull-up", 3, "5-8", 120), ex("Face Pull", 3, "15-20"), ex("Dead Bug", 3, "10-12"), ex("Side Plank", 3, "30-45s")] },
    ],
  },
  {
    id: "renfo-cycliste", name: "Renfo cycliste",
    description: "Jambes, fessiers et bas du dos, pour tenir la position et relancer plus fort.",
    goal: "endurance", level: "intermediate", daysPerWeek: 2,
    structure: [
      { name: "Force", exercises: [ex("Back Squat", 4, "6-8", 150), ex("Hip Thrust", 3, "8-10", 90), ex("Standing Calf Raise", 3, "12-15")] },
      { name: "Stabilité", exercises: [ex("Bulgarian Split Squat", 3, "8-10", 90), ex("Romanian Deadlift", 3, "8-10", 90), ex("Bird Dog", 3, "10-12"), ex("Plank", 3, "45-60s")] },
    ],
  },
];
