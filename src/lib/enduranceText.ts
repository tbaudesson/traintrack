/**
 * Every word of the endurance plans, in each language the app speaks.
 * The plans themselves are built in enduranceTemplates.ts.
 */

export type PlanLocale = "fr" | "en" | "de";
export const PLAN_LOCALES: PlanLocale[] = ["fr", "en", "de"];

type RaceKey = "marathon" | "half" | "tenK";

interface Lap<T = string> {
  metres: number;
  text: T;
}

export interface EnduranceText {
  /** Prefix of the week in a day's name: "S3 · Footing". */
  week: string;
  caution: string;
  intensity: { racePace: string; race: string };
  races: Record<RaceKey, { name: string; pace: string }>;
  run: {
    warmUp: string;
    coolDown: string;
    lastKm: (km: number) => string;
    hills: { label: string; work: (n: number) => string; purpose: string };
    fartlek: { label: string; work: (n: number) => string; purpose: string };
    short: { label: string; work: (n: number) => string; purpose: string };
    threshold: { label: string; works: string[]; purpose: string };
    long: { label: string; work: (n: number) => string; purpose: string };
    specific: { label: string; work: (block: string, pace: string) => string; purpose: (pace: string) => string };
    easy: { label: string; purpose: string; start: string; main: string; strides: string; stretch: string };
    lightFartlek: { label: string; purpose: string; steps: string[] };
    sharpen: { label: string; purpose: string; work: (pace: string) => string };
    recovery: { label: string; purpose: string; steps: string[] };
    longRun: {
      label: string;
      purpose: string;
      purposeSpecific: string;
      steadyKm: (km: number) => string;
      finishAtPace: (lastKm: string, pace: string) => string;
      zone2Km: (km: number) => string;
      finishHarder: (lastKm: string) => string;
      walk: string;
      steady: string[];
      fuelLong: string;
      fuelShort: string;
    };
    raceWeek: {
      easyPurpose: string;
      easySteps: string[];
      reminder: string;
      reminderPurpose: string;
      reminderSteps: (pace: string) => string[];
      racePurpose: string;
      raceSteps: (long: boolean, pace: string) => string[];
      raceNotes: string;
    };
  };
  c25k: {
    session: (n: number) => string;
    weeks: { block: string; purpose: string }[];
    warmUp: string;
    coolDown: string;
    notesRepeat: string;
    notesSlow: string;
    confirm: { purpose: string; steps: string[] };
    fresh: { purpose: string; steps: string[] };
    goal: { label: string; purpose: string; steps: string[]; notes: string };
  };
  swim: {
    technique: string;
    series: string;
    endurance: string;
    test: string;
    goal: string;
    techniquePurpose: string;
    seriesPurpose: string;
    testPurpose: string;
    endurancePurpose: string;
    goalPurpose: string;
    drills: string[];
    sets: Lap[];
    techniqueWarmUp: string;
    drill: (drill: string) => string;
    kick: string;
    full: (reps: number) => string;
    pull: string;
    techniqueCoolDown: string;
    seriesWarmUp: string;
    sprints: string;
    seriesCoolDown: string;
    enduranceWarmUp: string;
    continuous: (metres: number) => string;
    enduranceCoolDown: string;
    stopNote: string;
  };
  bike: {
    spin: string;
    intervals: string;
    long: string;
    goal: string;
    spinPurpose: string;
    spinSteps: (reps: number) => string[];
    sets: { work: string; purpose: string }[];
    intervalWarmUp: string;
    intervalCoolDown: string;
    intervalNotes: string;
    longPurpose: string;
    goalPurpose: string;
    longStart: string;
    longBuild: string;
    longSteady: string;
    longEnd: string;
    fuelLong: string;
    fuelShort: string;
  };
  plans: Record<
    | "marathon" | "half" | "tenK" | "fiveK" | "swim" | "bike"
    | "renfoRunner" | "renfoTrail" | "renfoSwimmer" | "renfoCyclist",
    { name: string; description: string; days?: [string, string] }
  >;
}

const fr: EnduranceText = {
  week: "S",
  caution: " Avis médical conseillé avant de commencer. À adapter à vos sensations.",
  intensity: { racePace: "Allure course", race: "Course" },
  races: {
    marathon: { name: "Marathon", pace: "allure marathon" },
    half: { name: "Semi-marathon", pace: "allure semi" },
    tenK: { name: "10 km", pace: "allure 10 km" },
  },
  run: {
    warmUp: "Échauffement : 15 min de footing très facile, puis 4 gammes (montées de genoux, talons-fesses) sur 20 m",
    coolDown: "Retour au calme : 10 min de footing très lent, puis étirements doux",
    lastKm: (km) => (km > 1 ? `${km} derniers km` : "Le dernier km"),
    hills: {
      label: "Côtes",
      work: (n) => `${n} × 45 s en côte à bonne allure, retour en trottinant`,
      purpose: "Renforcer les jambes et la foulée sans la violence du fractionné sur le plat.",
    },
    fartlek: {
      label: "Fartlek",
      work: (n) => `${n} × (1 min vite, 1 min lent), au feeling`,
      purpose: "Habituer le corps aux changements de rythme, en jouant.",
    },
    short: {
      label: "Fractionné court",
      work: (n) => `${n} × 400 m rapides, 1 min 30 de récupération en trottinant`,
      purpose: "Développer la vitesse maximale aérobie : courir plus vite devient plus facile.",
    },
    threshold: {
      label: "Seuil",
      works: [
        "3 × 8 min soutenu, 2 min de récupération",
        "3 × 10 min soutenu, 2 min de récupération",
        "2 × 15 min soutenu, 3 min de récupération",
      ],
      purpose: "Repousser le seuil : tenir longtemps une allure soutenue sans s'asphyxier.",
    },
    long: {
      label: "Fractionné long",
      work: (n) => `${n} × 1000 m soutenus, 2 min de récupération en trottinant`,
      purpose: "Entretenir la vitesse acquise sur des efforts plus longs.",
    },
    specific: {
      label: "Allure spécifique",
      work: (block, pace) => `${block} à ${pace}, 2 min de récupération`,
      purpose: (pace) => `Mémoriser l'${pace} pour la retrouver sans montre le jour J.`,
    },
    easy: {
      label: "Footing",
      purpose: "Construire l'endurance de base sans accumuler de fatigue.",
      start: "5 min de trot très lent pour démarrer",
      main: "Course continue à allure confortable : vous devez pouvoir parler en phrases complètes",
      strides: "Pour finir : 5 lignes droites de 80 m en accélérant progressivement, retour en marchant",
      stretch: "Étirements doux des mollets et de l'arrière des cuisses",
    },
    lightFartlek: {
      label: "Fartlek léger",
      purpose: "Semaine allégée : garder du rythme tout en laissant le corps assimiler.",
      steps: ["10 min de footing facile", "6 × (1 min un peu plus vite, 2 min facile)", "10 min de footing facile"],
    },
    sharpen: {
      label: "Rappel d'allure",
      purpose: "Garder les sensations de vitesse en réduisant le volume.",
      work: (pace) => `3 × 1 km à ${pace}, 2 min de récupération`,
    },
    recovery: {
      label: "Récupération",
      purpose: "Faire circuler le sang pour mieux récupérer, sans rien ajouter à la fatigue.",
      steps: ["Footing très lent, sur terrain souple si possible", "5 min de marche, puis mobilité des hanches et des chevilles"],
    },
    longRun: {
      label: "Sortie longue",
      purpose: "Habituer le corps à courir longtemps : c'est la séance clé de la semaine.",
      purposeSpecific: "Apprendre à tenir l'allure de course sur des jambes fatiguées.",
      steadyKm: (km) => `${km} km en Zone 2, régulier`,
      finishAtPace: (lastKm, pace) => `${lastKm} à ${pace}`,
      zone2Km: (km) => `${km} km en Zone 2`,
      finishHarder: (lastKm) => `${lastKm} un peu plus soutenus (Zone 3)`,
      walk: "5 min de marche pour terminer",
      steady: ["10 premières minutes très tranquilles", "Allure régulière en Zone 2 jusqu'au bout, quitte à marcher dans les côtes"],
      fuelLong: "Testez votre ravitaillement de course : boire toutes les 20 min, un gel ou une barre toutes les 40 min.",
      fuelShort: "Partez avec de l'eau s'il fait chaud.",
    },
    raceWeek: {
      easyPurpose: "Rester en mouvement sans puiser dans les réserves.",
      easySteps: ["Footing court et facile", "3 lignes droites de 80 m pour réveiller les jambes"],
      reminder: "Rappel",
      reminderPurpose: "Deux ou trois jours avant la course : garder le jus sans se fatiguer.",
      reminderSteps: (pace) => ["15 min de footing facile", `3 × 2 min à ${pace}, 2 min de récupération`, "5 min de footing lent"],
      racePurpose: "Le jour J : profiter du travail accumulé.",
      raceSteps: (long, pace) => [
        "La veille : repas habituel riche en féculents, affaires préparées, dossard épinglé",
        long ? "Échauffement : 5 min de trot suffisent, gardez votre énergie" : "Échauffement : 10 min de trot et 3 lignes droites",
        `Premier tiers : partez à ${pace}, surtout pas plus vite malgré l'euphorie du départ`,
        "Deuxième tiers : restez régulier et ravitaillez-vous comme à l'entraînement",
        "Dernier tiers : relâchez les épaules et accélérez si les jambes le permettent",
      ],
      raceNotes: "Bonne course !",
    },
  },
  c25k: {
    session: (n) => `Séance ${n}`,
    weeks: [
      { block: "8 × (1 min de course, 2 min de marche)", purpose: "Démarrer en douceur : le corps découvre l'impact de la course." },
      { block: "6 × (2 min de course, 2 min de marche)", purpose: "Allonger un peu les temps de course." },
      { block: "5 × (3 min de course, 2 min de marche)", purpose: "Le souffle s'installe : courir 3 minutes devient naturel." },
      { block: "4 × (5 min de course, 1 min 30 de marche)", purpose: "Premier vrai cap : 5 minutes sans s'arrêter." },
      { block: "3 × (8 min de course, 1 min 30 de marche)", purpose: "Les blocs s'allongent, les pauses raccourcissent." },
      { block: "2 × (12 min de course, 1 min 30 de marche)", purpose: "Plus que deux blocs : vous courez presque 25 minutes." },
      { block: "25 min de course sans s'arrêter", purpose: "Le grand saut : 25 minutes en continu." },
    ],
    warmUp: "Échauffement : 5 min de marche rapide",
    coolDown: "Retour au calme : 5 min de marche, puis étirements des mollets",
    notesRepeat: "Si la séance a été trop dure, refaites cette semaine avant de passer à la suivante.",
    notesSlow: "Courez lentement : si vous ne pouvez pas parler, ralentissez.",
    confirm: {
      purpose: "Confirmer : 25 minutes de course, cette fois avec plus d'aisance.",
      steps: ["5 min de marche rapide", "25 min de course continue", "5 min de marche"],
    },
    fresh: {
      purpose: "Une séance courte pour arriver frais.",
      steps: ["5 min de marche rapide", "15 min de course facile", "5 min de marche"],
    },
    goal: {
      label: "Objectif 5 km",
      purpose: "Votre premier 5 km : l'objectif est de finir, pas le chrono.",
      steps: [
        "5 min de marche rapide et 2 min de trot",
        "Premier kilomètre plus lent que vous ne le pensez",
        "À partir du 4e km, accélérez si vous vous sentez bien",
      ],
      notes: "Bravo, vous êtes coureur !",
    },
  },
  swim: {
    technique: "Technique",
    series: "Séries",
    endurance: "Endurance",
    test: "Test",
    goal: "Objectif 1500 m",
    techniquePurpose: "Nager mieux avant de nager plus : une meilleure glisse, c'est de la vitesse gratuite.",
    seriesPurpose: "Habituer le corps à nager vite avec peu de récupération.",
    testPurpose: "Mesurer vos progrès : comparez ce 400 m avec celui que vous ferez dans quelques mois.",
    endurancePurpose: "Tenir longtemps sans s'arrêter, à une allure que vous pourriez garder encore.",
    goalPurpose: "Le but du plan : 1500 m sans vous arrêter.",
    drills: [
      "rattrapé (une main attend l'autre devant)",
      "poings fermés (sentir l'appui de l'avant-bras)",
      "6 battements sur le côté, puis 1 mouvement de bras",
      "respiration tous les 3 temps",
      "godille avant (mains devant, petits mouvements)",
      "nage 1 bras (l'autre le long du corps)",
      "rattrapé, en comptant ses mouvements par longueur",
      "nage complète en cherchant à faire un mouvement de moins par longueur",
    ],
    sets: [
      { metres: 400, text: "8 × 50 m soutenu, 20 s de récupération" },
      { metres: 600, text: "6 × 100 m soutenu, 20 s de récupération" },
      { metres: 800, text: "Pyramide 50-100-150-200-150-100-50 m soutenu, 20 s de récupération" },
      { metres: 300, text: "6 × 50 m en aisance, 20 s de récupération" },
      { metres: 800, text: "8 × 100 m allure seuil, 15 s de récupération" },
      { metres: 800, text: "4 × 200 m allure seuil, 30 s de récupération" },
      { metres: 1000, text: "10 × 100 m allure seuil, 15 s de récupération" },
      { metres: 400, text: "Test : 400 m chronométré, notez votre temps" },
    ],
    techniqueWarmUp: "Échauffement : 200 m crawl souple, 100 m dos",
    drill: (drill) => `Éducatif : 4 × 50 m ${drill}, 15 s de récupération`,
    kick: "4 × 50 m battements avec planche, 20 s de récupération",
    full: (reps) => `${reps} × 100 m nage complète en appliquant l'éducatif, 20 s de récupération`,
    pull: "200 m avec pull-buoy, en se concentrant sur la traction",
    techniqueCoolDown: "Retour au calme : 100 m dos ou brasse, très souple",
    seriesWarmUp: "Échauffement : 200 m crawl souple, 4 × 25 m en accélérant",
    sprints: "4 × 25 m vite, 30 s de récupération",
    seriesCoolDown: "Retour au calme : 200 m très souple, en variant les nages",
    enduranceWarmUp: "Échauffement : 200 m en variant les nages",
    continuous: (metres) => `${metres} m de nage continue, régulière, en respirant tous les 3 temps si possible`,
    enduranceCoolDown: "Retour au calme : 100 m dos",
    stopNote: "Si vous devez vous arrêter, reprenez après 20 s au bord : le but est la distance.",
  },
  bike: {
    spin: "Vélocité",
    intervals: "Intervalles",
    long: "Sortie longue",
    goal: "Sortie objectif",
    spinPurpose: "Pédaler plus rond et plus souple : économiser les jambes sur les longues sorties.",
    spinSteps: (reps) => [
      "10 min très facile, petit braquet",
      `${reps} × 1 min à cadence élevée (100-110 tours/min) sans forcer, 2 min normal entre chaque`,
      "Le reste en Zone 2, cadence autour de 90 tours/min",
      "5 min très facile pour finir",
    ],
    sets: [
      { work: "3 × 8 min en Zone 3-4, 4 min de récupération", purpose: "Le « sweet spot » : beaucoup de bénéfice pour une fatigue raisonnable." },
      { work: "3 × 10 min en Zone 3-4, 4 min de récupération", purpose: "Allonger les blocs pour tenir une allure soutenue plus longtemps." },
      { work: "2 × 15 min en Zone 4, 5 min de récupération", purpose: "Travailler au seuil : l'effort qui fait le plus progresser en vélo." },
      { work: "4 × 1 min vif, 2 min de récupération", purpose: "Semaine allégée : un peu de rythme, sans fatigue." },
      { work: "5 × 3 min en Zone 5, 3 min de récupération", purpose: "Développer la puissance pour les côtes et les relances." },
      { work: "2 × 20 min en Zone 4, 5 min de récupération", purpose: "Deux longs blocs au seuil : la séance la plus exigeante du plan." },
      { work: "6 × 3 min en Zone 5, 3 min de récupération", purpose: "Dernier bloc intense avant de relâcher." },
      { work: "3 × 5 min en Zone 4, 3 min de récupération", purpose: "Garder les sensations avant la sortie objectif." },
    ],
    intervalWarmUp: "Échauffement : 15 min progressif, dont 3 accélérations de 15 s",
    intervalCoolDown: "Retour au calme : 10 min très facile",
    intervalNotes: "Sur home-trainer, c'est la séance idéale : pas de feux ni de descentes pour casser l'effort.",
    longPurpose: "Construire le fond : la base de tout le reste.",
    goalPurpose: "La sortie de 2 h 30 que vous visez : régulière, bien ravitaillée.",
    longStart: "15 min de mise en route très facile",
    longBuild: "Zone 2, avec 2 × 10 min en Zone 3 dans la dernière heure",
    longSteady: "Zone 2 régulière : dans les côtes, restez assis et réduisez le braquet",
    longEnd: "10 min très facile pour finir",
    fuelLong: "Buvez toutes les 15 min et mangez toutes les 30 à 40 min dès la première heure.",
    fuelShort: "Une gourde suffit, emportez une barre au cas où.",
  },
  plans: {
    marathon: {
      name: "Marathon en 16 semaines",
      description: "Pour courir 10 km sans difficulté et viser le marathon. Quatre sorties par semaine en quatre phases : fondations, développement, travail à allure marathon, affûtage. Sortie longue jusqu'à 32 km.",
    },
    half: {
      name: "Semi-marathon en 12 semaines",
      description: "Pour qui court déjà 10 km. Trois sorties par semaine : un footing, une séance de qualité qui évolue (côtes, seuil, fractionné, allure semi) et une sortie longue jusqu'à 18 km.",
    },
    tenK: {
      name: "10 km en 8 semaines",
      description: "Pour qui court 30 minutes sans s'arrêter. Trois sorties par semaine, des côtes au fractionné, pour réussir votre 10 km.",
    },
    fiveK: {
      name: "Débuter la course : 5 km",
      description: "De zéro à 5 km en 8 semaines, en alternant course et marche. Chaque semaine allonge un peu les temps de course ; refaites une semaine si besoin.",
    },
    swim: {
      name: "Natation endurance",
      description: "Pour qui nage déjà 200 m de crawl. Chaque semaine : une séance de technique avec un nouvel éducatif, une séance de séries, une séance d'endurance. Semaine 4 allégée, test 400 m et 1500 m continu en semaine 8.",
    },
    bike: {
      name: "Vélo endurance",
      description: "Trois sorties par semaine : vélocité, intervalles qui progressent du sweet spot à la puissance, et sortie longue jusqu'à 2 h 30. Semaine 4 allégée. Fonctionne aussi sur home-trainer.",
    },
    renfoRunner: {
      name: "Renfo coureur",
      description: "Hanches, mollets et gainage : deux séances courtes pour courir plus solide.",
      days: ["Renfo A", "Renfo B"],
    },
    renfoTrail: {
      name: "Renfo trail",
      description: "Force des jambes et stabilité pour encaisser les montées et les descentes.",
      days: ["Montées", "Descentes"],
    },
    renfoSwimmer: {
      name: "Renfo nageur",
      description: "Dos, épaules et gainage pour une nage plus puissante et des épaules protégées.",
      days: ["Tirage", "Gainage"],
    },
    renfoCyclist: {
      name: "Renfo cycliste",
      description: "Jambes, fessiers et bas du dos, pour tenir la position et relancer plus fort.",
      days: ["Force", "Stabilité"],
    },
  },
};

const en: EnduranceText = {
  week: "W",
  caution: " Check with a doctor before you start. Adjust to how you feel.",
  intensity: { racePace: "Race pace", race: "Race" },
  races: {
    marathon: { name: "Marathon", pace: "marathon pace" },
    half: { name: "Half marathon", pace: "half-marathon pace" },
    tenK: { name: "10K", pace: "10K pace" },
  },
  run: {
    warmUp: "Warm-up: 15 min very easy jog, then 4 drills (high knees, butt kicks) over 20 m",
    coolDown: "Cool-down: 10 min very slow jog, then gentle stretching",
    lastKm: (km) => (km > 1 ? `Last ${km} km` : "Last km"),
    hills: {
      label: "Hills",
      work: (n) => `${n} × 45 s uphill at a strong effort, jog back down`,
      purpose: "Build leg strength and stride power without the pounding of flat intervals.",
    },
    fartlek: {
      label: "Fartlek",
      work: (n) => `${n} × (1 min fast, 1 min slow), by feel`,
      purpose: "Get used to changes of pace, playfully.",
    },
    short: {
      label: "Short intervals",
      work: (n) => `${n} × 400 m fast, 1 min 30 jog recovery`,
      purpose: "Raise your top aerobic speed so that running faster feels easier.",
    },
    threshold: {
      label: "Threshold",
      works: [
        "3 × 8 min comfortably hard, 2 min recovery",
        "3 × 10 min comfortably hard, 2 min recovery",
        "2 × 15 min comfortably hard, 3 min recovery",
      ],
      purpose: "Push your threshold back: hold a strong pace for longer without gasping.",
    },
    long: {
      label: "Long intervals",
      work: (n) => `${n} × 1000 m strong, 2 min jog recovery`,
      purpose: "Keep the speed you have built over longer efforts.",
    },
    specific: {
      label: "Race pace",
      work: (block, pace) => `${block} at ${pace}, 2 min recovery`,
      purpose: (pace) => `Lock in your ${pace} so you can find it on race day without a watch.`,
    },
    easy: {
      label: "Easy run",
      purpose: "Build your aerobic base without piling up fatigue.",
      start: "5 min very slow jog to get going",
      main: "Steady run at a comfortable pace: you should be able to talk in full sentences",
      strides: "To finish: 5 × 80 m strides, building speed gradually, walk back",
      stretch: "Gentle stretching of the calves and hamstrings",
    },
    lightFartlek: {
      label: "Easy fartlek",
      purpose: "Lighter week: keep some rhythm while your body absorbs the work.",
      steps: ["10 min easy jog", "6 × (1 min a little faster, 2 min easy)", "10 min easy jog"],
    },
    sharpen: {
      label: "Pace reminder",
      purpose: "Keep the feel for speed while cutting the volume.",
      work: (pace) => `3 × 1 km at ${pace}, 2 min recovery`,
    },
    recovery: {
      label: "Recovery",
      purpose: "Get the blood flowing to recover better, without adding fatigue.",
      steps: ["Very slow jog, on soft ground if you can", "5 min walk, then hip and ankle mobility"],
    },
    longRun: {
      label: "Long run",
      purpose: "Teach your body to run for a long time: this is the key session of the week.",
      purposeSpecific: "Learn to hold race pace on tired legs.",
      steadyKm: (km) => `${km} km in Zone 2, steady`,
      finishAtPace: (lastKm, pace) => `${lastKm} at ${pace}`,
      zone2Km: (km) => `${km} km in Zone 2`,
      finishHarder: (lastKm) => `${lastKm} a little harder (Zone 3)`,
      walk: "5 min walk to finish",
      steady: ["First 10 minutes very relaxed", "Steady Zone 2 all the way, walking the hills if needed"],
      fuelLong: "Practise your race fuelling: drink every 20 min, a gel or bar every 40 min.",
      fuelShort: "Take water if it is hot.",
    },
    raceWeek: {
      easyPurpose: "Keep moving without dipping into your reserves.",
      easySteps: ["Short, easy jog", "3 × 80 m strides to wake the legs up"],
      reminder: "Sharpener",
      reminderPurpose: "Two or three days before the race: stay sharp without getting tired.",
      reminderSteps: (pace) => ["15 min easy jog", `3 × 2 min at ${pace}, 2 min recovery`, "5 min slow jog"],
      racePurpose: "Race day: enjoy all the work you have put in.",
      raceSteps: (long, pace) => [
        "The day before: your usual meal, rich in carbohydrates; kit ready, bib pinned",
        long ? "Warm-up: 5 min of jogging is enough, save your energy" : "Warm-up: 10 min jog and 3 strides",
        `First third: start at ${pace}, and no faster despite the excitement of the start`,
        "Second third: stay even and fuel as you did in training",
        "Last third: relax your shoulders and pick up the pace if your legs allow",
      ],
      raceNotes: "Have a great race!",
    },
  },
  c25k: {
    session: (n) => `Session ${n}`,
    weeks: [
      { block: "8 × (1 min run, 2 min walk)", purpose: "Start gently: your body gets used to the impact of running." },
      { block: "6 × (2 min run, 2 min walk)", purpose: "Stretch the running time a little." },
      { block: "5 × (3 min run, 2 min walk)", purpose: "Your breathing settles: running 3 minutes starts to feel natural." },
      { block: "4 × (5 min run, 1 min 30 walk)", purpose: "First real milestone: 5 minutes without stopping." },
      { block: "3 × (8 min run, 1 min 30 walk)", purpose: "Longer blocks, shorter breaks." },
      { block: "2 × (12 min run, 1 min 30 walk)", purpose: "Just two blocks: you are running almost 25 minutes." },
      { block: "25 min run without stopping", purpose: "The big leap: 25 minutes non-stop." },
    ],
    warmUp: "Warm-up: 5 min brisk walk",
    coolDown: "Cool-down: 5 min walk, then calf stretches",
    notesRepeat: "If this session felt too hard, repeat the week before moving on.",
    notesSlow: "Run slowly: if you cannot talk, slow down.",
    confirm: {
      purpose: "Confirm it: 25 minutes of running, this time with more ease.",
      steps: ["5 min brisk walk", "25 min continuous run", "5 min walk"],
    },
    fresh: {
      purpose: "A short session so you arrive fresh.",
      steps: ["5 min brisk walk", "15 min easy run", "5 min walk"],
    },
    goal: {
      label: "5K goal",
      purpose: "Your first 5K: the goal is to finish, not the time.",
      steps: ["5 min brisk walk and 2 min jog", "First kilometre slower than you think", "From the 4th km, speed up if you feel good"],
      notes: "Well done, you are a runner!",
    },
  },
  swim: {
    technique: "Technique",
    series: "Sets",
    endurance: "Endurance",
    test: "Test",
    goal: "1500 m goal",
    techniquePurpose: "Swim better before swimming more: a better glide is free speed.",
    seriesPurpose: "Get used to swimming fast with little rest.",
    testPurpose: "Measure your progress: compare this 400 m with the one you will swim in a few months.",
    endurancePurpose: "Keep going without stopping, at a pace you could hold for longer.",
    goalPurpose: "The aim of the plan: 1500 m without stopping.",
    drills: [
      "catch-up (one hand waits for the other in front)",
      "closed fists (feel the forearm pull)",
      "6 kicks on your side, then 1 stroke",
      "breathing every 3 strokes",
      "front sculling (hands in front, small movements)",
      "single arm (the other along your side)",
      "catch-up, counting your strokes per length",
      "full stroke, aiming for one fewer stroke per length",
    ],
    sets: [
      { metres: 400, text: "8 × 50 m strong, 20 s rest" },
      { metres: 600, text: "6 × 100 m strong, 20 s rest" },
      { metres: 800, text: "Pyramid 50-100-150-200-150-100-50 m strong, 20 s rest" },
      { metres: 300, text: "6 × 50 m relaxed, 20 s rest" },
      { metres: 800, text: "8 × 100 m at threshold pace, 15 s rest" },
      { metres: 800, text: "4 × 200 m at threshold pace, 30 s rest" },
      { metres: 1000, text: "10 × 100 m at threshold pace, 15 s rest" },
      { metres: 400, text: "Test: 400 m timed, note your time" },
    ],
    techniqueWarmUp: "Warm-up: 200 m easy freestyle, 100 m backstroke",
    drill: (drill) => `Drill: 4 × 50 m ${drill}, 15 s rest`,
    kick: "4 × 50 m kick with a board, 20 s rest",
    full: (reps) => `${reps} × 100 m full stroke applying the drill, 20 s rest`,
    pull: "200 m with a pull buoy, focusing on the pull",
    techniqueCoolDown: "Cool-down: 100 m backstroke or breaststroke, very easy",
    seriesWarmUp: "Warm-up: 200 m easy freestyle, 4 × 25 m building speed",
    sprints: "4 × 25 m fast, 30 s rest",
    seriesCoolDown: "Cool-down: 200 m very easy, mixing strokes",
    enduranceWarmUp: "Warm-up: 200 m mixing strokes",
    continuous: (metres) => `${metres} m continuous, steady swimming, breathing every 3 strokes if you can`,
    enduranceCoolDown: "Cool-down: 100 m backstroke",
    stopNote: "If you have to stop, start again after 20 s at the wall: the distance is what counts.",
  },
  bike: {
    spin: "Cadence",
    intervals: "Intervals",
    long: "Long ride",
    goal: "Goal ride",
    spinPurpose: "Pedal rounder and smoother to save your legs on long rides.",
    spinSteps: (reps) => [
      "10 min very easy, small gear",
      `${reps} × 1 min at high cadence (100-110 rpm) without pushing, 2 min normal between each`,
      "The rest in Zone 2, cadence around 90 rpm",
      "5 min very easy to finish",
    ],
    sets: [
      { work: "3 × 8 min in Zone 3-4, 4 min recovery", purpose: "The sweet spot: plenty of benefit for reasonable fatigue." },
      { work: "3 × 10 min in Zone 3-4, 4 min recovery", purpose: "Longer blocks to hold a strong pace for longer." },
      { work: "2 × 15 min in Zone 4, 5 min recovery", purpose: "Threshold work: the effort that improves cycling the most." },
      { work: "4 × 1 min brisk, 2 min recovery", purpose: "Lighter week: a little rhythm, no fatigue." },
      { work: "5 × 3 min in Zone 5, 3 min recovery", purpose: "Build power for climbs and accelerations." },
      { work: "2 × 20 min in Zone 4, 5 min recovery", purpose: "Two long threshold blocks: the toughest session of the plan." },
      { work: "6 × 3 min in Zone 5, 3 min recovery", purpose: "Last hard block before easing off." },
      { work: "3 × 5 min in Zone 4, 3 min recovery", purpose: "Stay sharp before the goal ride." },
    ],
    intervalWarmUp: "Warm-up: 15 min progressive, including 3 × 15 s accelerations",
    intervalCoolDown: "Cool-down: 10 min very easy",
    intervalNotes: "On a home trainer this session is ideal: no traffic lights or descents to break the effort.",
    longPurpose: "Build your endurance: the base for everything else.",
    goalPurpose: "The 2 h 30 ride you are aiming for: steady and well fuelled.",
    longStart: "15 min very easy warm-up",
    longBuild: "Zone 2, with 2 × 10 min in Zone 3 in the last hour",
    longSteady: "Steady Zone 2: on climbs, stay seated and shift to an easier gear",
    longEnd: "10 min very easy to finish",
    fuelLong: "Drink every 15 min and eat every 30 to 40 min from the first hour.",
    fuelShort: "One bottle is enough; take a bar just in case.",
  },
  plans: {
    marathon: {
      name: "Marathon in 16 weeks",
      description: "For runners who can run 10 km comfortably and want a marathon. Four runs a week in four phases: base, build, marathon-pace work, taper. Long run up to 32 km.",
    },
    half: {
      name: "Half marathon in 12 weeks",
      description: "For runners who already run 10 km. Three runs a week: an easy run, a quality session that changes over time (hills, threshold, intervals, half-marathon pace) and a long run up to 18 km.",
    },
    tenK: {
      name: "10K in 8 weeks",
      description: "For runners who can run 30 minutes without stopping. Three runs a week, from hills to intervals, to nail your 10K.",
    },
    fiveK: {
      name: "Start running: 5K",
      description: "From zero to 5 km in 8 weeks, alternating running and walking. Each week stretches the running time a little; repeat a week if you need to.",
    },
    swim: {
      name: "Swimming endurance",
      description: "For swimmers who can already swim 200 m of freestyle. Each week: a technique session with a new drill, a sets session and an endurance session. Lighter week 4, then a 400 m test and a continuous 1500 m in week 8.",
    },
    bike: {
      name: "Cycling endurance",
      description: "Three rides a week: cadence work, intervals progressing from sweet spot to power, and a long ride up to 2 h 30. Lighter week 4. Works on a home trainer too.",
    },
    renfoRunner: {
      name: "Strength for runners",
      description: "Hips, calves and core: two short sessions to run stronger.",
      days: ["Strength A", "Strength B"],
    },
    renfoTrail: {
      name: "Strength for trail",
      description: "Leg strength and stability to handle the climbs and descents.",
      days: ["Climbs", "Descents"],
    },
    renfoSwimmer: {
      name: "Strength for swimmers",
      description: "Back, shoulders and core for a more powerful stroke and protected shoulders.",
      days: ["Pull", "Core"],
    },
    renfoCyclist: {
      name: "Strength for cyclists",
      description: "Legs, glutes and lower back, to hold your position and accelerate harder.",
      days: ["Strength", "Stability"],
    },
  },
};

const de: EnduranceText = {
  week: "W",
  caution: " Vor dem Start ärztlichen Rat einholen. Nach Gefühl anpassen.",
  intensity: { racePace: "Wettkampftempo", race: "Wettkampf" },
  races: {
    marathon: { name: "Marathon", pace: "Marathontempo" },
    half: { name: "Halbmarathon", pace: "Halbmarathontempo" },
    tenK: { name: "10 km", pace: "10-km-Tempo" },
  },
  run: {
    warmUp: "Aufwärmen: 15 min sehr locker traben, dann 4 Lauf-ABC-Übungen (Kniehebelauf, Anfersen) über 20 m",
    coolDown: "Auslaufen: 10 min sehr langsam traben, dann sanft dehnen",
    lastKm: (km) => (km > 1 ? `Die letzten ${km} km` : "Der letzte km"),
    hills: {
      label: "Bergläufe",
      work: (n) => `${n} × 45 s bergauf in zügigem Tempo, locker zurücktraben`,
      purpose: "Beine und Laufschritt kräftigen, ohne die Härte von Intervallen in der Ebene.",
    },
    fartlek: {
      label: "Fahrtspiel",
      work: (n) => `${n} × (1 min schnell, 1 min langsam), nach Gefühl`,
      purpose: "Den Körper spielerisch an Tempowechsel gewöhnen.",
    },
    short: {
      label: "Kurze Intervalle",
      work: (n) => `${n} × 400 m schnell, 1 min 30 Trabpause`,
      purpose: "Die maximale aerobe Geschwindigkeit steigern: schneller laufen fällt leichter.",
    },
    threshold: {
      label: "Schwelle",
      works: ["3 × 8 min zügig, 2 min Pause", "3 × 10 min zügig, 2 min Pause", "2 × 15 min zügig, 3 min Pause"],
      purpose: "Die Schwelle verschieben: ein zügiges Tempo lange halten, ohne außer Atem zu geraten.",
    },
    long: {
      label: "Lange Intervalle",
      work: (n) => `${n} × 1000 m zügig, 2 min Trabpause`,
      purpose: "Die gewonnene Geschwindigkeit auf längeren Belastungen halten.",
    },
    specific: {
      label: "Wettkampftempo",
      work: (block, pace) => `${block} im ${pace}, 2 min Pause`,
      purpose: (pace) => `Das ${pace} verinnerlichen, um es am Wettkampftag ohne Uhr zu finden.`,
    },
    easy: {
      label: "Lockerer Lauf",
      purpose: "Die Grundlagenausdauer aufbauen, ohne Müdigkeit anzuhäufen.",
      start: "5 min sehr langsam traben zum Einstieg",
      main: "Gleichmäßiger Dauerlauf in angenehmem Tempo: Sie sollten in ganzen Sätzen sprechen können",
      strides: "Zum Schluss: 5 Steigerungsläufe über 80 m, gehend zurück",
      stretch: "Waden und Oberschenkelrückseite sanft dehnen",
    },
    lightFartlek: {
      label: "Lockeres Fahrtspiel",
      purpose: "Entlastungswoche: im Rhythmus bleiben und den Körper verarbeiten lassen.",
      steps: ["10 min locker traben", "6 × (1 min etwas schneller, 2 min locker)", "10 min locker traben"],
    },
    sharpen: {
      label: "Tempo-Erinnerung",
      purpose: "Das Gefühl für Tempo behalten und dabei den Umfang senken.",
      work: (pace) => `3 × 1 km im ${pace}, 2 min Pause`,
    },
    recovery: {
      label: "Regeneration",
      purpose: "Die Durchblutung anregen, um besser zu regenerieren, ohne zusätzliche Ermüdung.",
      steps: ["Sehr langsam traben, wenn möglich auf weichem Boden", "5 min gehen, dann Hüft- und Sprunggelenksmobilisation"],
    },
    longRun: {
      label: "Langer Lauf",
      purpose: "Den Körper an lange Belastung gewöhnen: die wichtigste Einheit der Woche.",
      purposeSpecific: "Lernen, das Wettkampftempo mit müden Beinen zu halten.",
      steadyKm: (km) => `${km} km in Zone 2, gleichmäßig`,
      finishAtPace: (lastKm, pace) => `${lastKm} im ${pace}`,
      zone2Km: (km) => `${km} km in Zone 2`,
      finishHarder: (lastKm) => `${lastKm} etwas zügiger (Zone 3)`,
      walk: "Zum Abschluss 5 min gehen",
      steady: ["Die ersten 10 Minuten ganz ruhig", "Gleichmäßig in Zone 2 bis zum Ende, an Steigungen notfalls gehen"],
      fuelLong: "Testen Sie Ihre Wettkampfverpflegung: alle 20 min trinken, alle 40 min ein Gel oder einen Riegel.",
      fuelShort: "Bei Hitze Wasser mitnehmen.",
    },
    raceWeek: {
      easyPurpose: "In Bewegung bleiben, ohne die Reserven anzugreifen.",
      easySteps: ["Kurz und locker laufen", "3 Steigerungsläufe über 80 m, um die Beine zu wecken"],
      reminder: "Aktivierung",
      reminderPurpose: "Zwei oder drei Tage vor dem Wettkampf: spritzig bleiben, ohne zu ermüden.",
      reminderSteps: (pace) => ["15 min locker traben", `3 × 2 min im ${pace}, 2 min Pause`, "5 min langsam traben"],
      racePurpose: "Wettkampftag: die geleistete Arbeit genießen.",
      raceSteps: (long, pace) => [
        "Am Vortag: gewohnte, kohlenhydratreiche Mahlzeit, Ausrüstung bereit, Startnummer angesteckt",
        long ? "Aufwärmen: 5 min traben genügen, sparen Sie Ihre Kraft" : "Aufwärmen: 10 min traben und 3 Steigerungsläufe",
        `Erstes Drittel: im ${pace} starten, trotz der Startaufregung keinesfalls schneller`,
        "Zweites Drittel: gleichmäßig bleiben und wie im Training verpflegen",
        "Letztes Drittel: Schultern lockern und beschleunigen, wenn die Beine es zulassen",
      ],
      raceNotes: "Viel Erfolg!",
    },
  },
  c25k: {
    session: (n) => `Einheit ${n}`,
    weeks: [
      { block: "8 × (1 min laufen, 2 min gehen)", purpose: "Sanft beginnen: der Körper gewöhnt sich an die Belastung des Laufens." },
      { block: "6 × (2 min laufen, 2 min gehen)", purpose: "Die Laufzeiten etwas verlängern." },
      { block: "5 × (3 min laufen, 2 min gehen)", purpose: "Die Atmung findet ihren Rhythmus: 3 Minuten laufen wird selbstverständlich." },
      { block: "4 × (5 min laufen, 1 min 30 gehen)", purpose: "Erster echter Meilenstein: 5 Minuten ohne Pause." },
      { block: "3 × (8 min laufen, 1 min 30 gehen)", purpose: "Die Blöcke werden länger, die Pausen kürzer." },
      { block: "2 × (12 min laufen, 1 min 30 gehen)", purpose: "Nur noch zwei Blöcke: Sie laufen fast 25 Minuten." },
      { block: "25 min laufen ohne Pause", purpose: "Der große Schritt: 25 Minuten am Stück." },
    ],
    warmUp: "Aufwärmen: 5 min zügig gehen",
    coolDown: "Abwärmen: 5 min gehen, dann Waden dehnen",
    notesRepeat: "War die Einheit zu hart, wiederholen Sie die Woche, bevor Sie weitergehen.",
    notesSlow: "Laufen Sie langsam: wenn Sie nicht sprechen können, werden Sie langsamer.",
    confirm: {
      purpose: "Bestätigen: 25 Minuten laufen, diesmal mit mehr Leichtigkeit.",
      steps: ["5 min zügig gehen", "25 min Dauerlauf", "5 min gehen"],
    },
    fresh: {
      purpose: "Eine kurze Einheit, um frisch anzukommen.",
      steps: ["5 min zügig gehen", "15 min locker laufen", "5 min gehen"],
    },
    goal: {
      label: "Ziel 5 km",
      purpose: "Ihre ersten 5 km: Ziel ist das Ankommen, nicht die Zeit.",
      steps: ["5 min zügig gehen und 2 min traben", "Den ersten Kilometer langsamer als gedacht", "Ab Kilometer 4 schneller werden, wenn Sie sich gut fühlen"],
      notes: "Glückwunsch, Sie sind Läufer!",
    },
  },
  swim: {
    technique: "Technik",
    series: "Serien",
    endurance: "Ausdauer",
    test: "Test",
    goal: "Ziel 1500 m",
    techniquePurpose: "Besser schwimmen, bevor Sie mehr schwimmen: bessere Gleitphase ist geschenkte Geschwindigkeit.",
    seriesPurpose: "Den Körper daran gewöhnen, mit kurzen Pausen schnell zu schwimmen.",
    testPurpose: "Fortschritt messen: vergleichen Sie diese 400 m mit denen in einigen Monaten.",
    endurancePurpose: "Lange ohne Pause schwimmen, in einem Tempo, das Sie noch halten könnten.",
    goalPurpose: "Das Ziel des Plans: 1500 m ohne Pause.",
    drills: [
      "Abschlagschwimmen (eine Hand wartet vorne auf die andere)",
      "Fäuste (den Druck des Unterarms spüren)",
      "6 Beinschläge in Seitenlage, dann 1 Armzug",
      "Dreier-Atmung",
      "Wriggen vorne (Hände vorne, kleine Bewegungen)",
      "einarmig (der andere Arm am Körper)",
      "Abschlagschwimmen, Armzüge pro Bahn zählen",
      "Gesamtbewegung, mit einem Armzug weniger pro Bahn",
    ],
    sets: [
      { metres: 400, text: "8 × 50 m zügig, 20 s Pause" },
      { metres: 600, text: "6 × 100 m zügig, 20 s Pause" },
      { metres: 800, text: "Pyramide 50-100-150-200-150-100-50 m zügig, 20 s Pause" },
      { metres: 300, text: "6 × 50 m locker, 20 s Pause" },
      { metres: 800, text: "8 × 100 m im Schwellentempo, 15 s Pause" },
      { metres: 800, text: "4 × 200 m im Schwellentempo, 30 s Pause" },
      { metres: 1000, text: "10 × 100 m im Schwellentempo, 15 s Pause" },
      { metres: 400, text: "Test: 400 m auf Zeit, notieren Sie Ihre Zeit" },
    ],
    techniqueWarmUp: "Einschwimmen: 200 m locker Kraul, 100 m Rücken",
    drill: (drill) => `Technikübung: 4 × 50 m ${drill}, 15 s Pause`,
    kick: "4 × 50 m Beinschlag mit Brett, 20 s Pause",
    full: (reps) => `${reps} × 100 m Gesamtbewegung mit der Technikübung im Kopf, 20 s Pause`,
    pull: "200 m mit Pull-Buoy, Fokus auf den Armzug",
    techniqueCoolDown: "Ausschwimmen: 100 m Rücken oder Brust, ganz locker",
    seriesWarmUp: "Einschwimmen: 200 m locker Kraul, 4 × 25 m steigernd",
    sprints: "4 × 25 m schnell, 30 s Pause",
    seriesCoolDown: "Ausschwimmen: 200 m ganz locker, Lagen wechseln",
    enduranceWarmUp: "Einschwimmen: 200 m mit wechselnden Lagen",
    continuous: (metres) => `${metres} m durchgehend und gleichmäßig schwimmen, wenn möglich mit Dreier-Atmung`,
    enduranceCoolDown: "Ausschwimmen: 100 m Rücken",
    stopNote: "Wenn Sie anhalten müssen, nach 20 s am Rand weiterschwimmen: es zählt die Distanz.",
  },
  bike: {
    spin: "Trittfrequenz",
    intervals: "Intervalle",
    long: "Lange Ausfahrt",
    goal: "Zielausfahrt",
    spinPurpose: "Runder und lockerer treten, um die Beine auf langen Ausfahrten zu schonen.",
    spinSteps: (reps) => [
      "10 min sehr locker, kleiner Gang",
      `${reps} × 1 min mit hoher Trittfrequenz (100-110 U/min) ohne Druck, dazwischen 2 min normal`,
      "Der Rest in Zone 2, Trittfrequenz um 90 U/min",
      "Zum Schluss 5 min sehr locker",
    ],
    sets: [
      { work: "3 × 8 min in Zone 3-4, 4 min Pause", purpose: "Der Sweet Spot: viel Wirkung bei vertretbarer Ermüdung." },
      { work: "3 × 10 min in Zone 3-4, 4 min Pause", purpose: "Längere Blöcke, um ein zügiges Tempo länger zu halten." },
      { work: "2 × 15 min in Zone 4, 5 min Pause", purpose: "Schwellentraining: die Belastung, die auf dem Rad am meisten bringt." },
      { work: "4 × 1 min flott, 2 min Pause", purpose: "Entlastungswoche: etwas Rhythmus, ohne Ermüdung." },
      { work: "5 × 3 min in Zone 5, 3 min Pause", purpose: "Kraft für Anstiege und Antritte aufbauen." },
      { work: "2 × 20 min in Zone 4, 5 min Pause", purpose: "Zwei lange Schwellenblöcke: die härteste Einheit des Plans." },
      { work: "6 × 3 min in Zone 5, 3 min Pause", purpose: "Letzter intensiver Block vor der Entlastung." },
      { work: "3 × 5 min in Zone 4, 3 min Pause", purpose: "Spritzig bleiben vor der Zielausfahrt." },
    ],
    intervalWarmUp: "Aufwärmen: 15 min steigernd, mit 3 Antritten von 15 s",
    intervalCoolDown: "Ausfahren: 10 min sehr locker",
    intervalNotes: "Auf dem Rollentrainer ideal: keine Ampeln oder Abfahrten, die die Belastung unterbrechen.",
    longPurpose: "Die Grundlage aufbauen: die Basis für alles andere.",
    goalPurpose: "Die angestrebte Ausfahrt von 2 h 30: gleichmäßig und gut verpflegt.",
    longStart: "15 min sehr locker einrollen",
    longBuild: "Zone 2, mit 2 × 10 min in Zone 3 in der letzten Stunde",
    longSteady: "Gleichmäßig in Zone 2: an Anstiegen sitzen bleiben und leichter schalten",
    longEnd: "Zum Schluss 10 min sehr locker",
    fuelLong: "Ab der ersten Stunde alle 15 min trinken und alle 30 bis 40 min essen.",
    fuelShort: "Eine Trinkflasche genügt, für alle Fälle einen Riegel mitnehmen.",
  },
  plans: {
    marathon: {
      name: "Marathon in 16 Wochen",
      description: "Für alle, die 10 km mühelos laufen und einen Marathon anpeilen. Vier Läufe pro Woche in vier Phasen: Grundlage, Aufbau, Marathontempo, Tapering. Langer Lauf bis 32 km.",
    },
    half: {
      name: "Halbmarathon in 12 Wochen",
      description: "Für alle, die bereits 10 km laufen. Drei Läufe pro Woche: ein lockerer Lauf, eine wechselnde Qualitätseinheit (Berg, Schwelle, Intervalle, Halbmarathontempo) und ein langer Lauf bis 18 km.",
    },
    tenK: {
      name: "10 km in 8 Wochen",
      description: "Für alle, die 30 Minuten ohne Pause laufen. Drei Läufe pro Woche, von Bergläufen bis zu Intervallen, für einen erfolgreichen 10-km-Lauf.",
    },
    fiveK: {
      name: "Laufeinstieg: 5 km",
      description: "Von null auf 5 km in 8 Wochen, im Wechsel von Laufen und Gehen. Jede Woche werden die Laufzeiten etwas länger; wiederholen Sie bei Bedarf eine Woche.",
    },
    swim: {
      name: "Schwimmausdauer",
      description: "Für alle, die bereits 200 m Kraul schwimmen. Jede Woche: eine Technikeinheit mit neuer Übung, eine Serieneinheit, eine Ausdauereinheit. Entlastungswoche 4, in Woche 8 ein 400-m-Test und 1500 m am Stück.",
    },
    bike: {
      name: "Radausdauer",
      description: "Drei Ausfahrten pro Woche: Trittfrequenz, Intervalle vom Sweet Spot bis zur Kraft und eine lange Ausfahrt bis 2 h 30. Entlastungswoche 4. Auch auf dem Rollentrainer möglich.",
    },
    renfoRunner: {
      name: "Kraft für Läufer",
      description: "Hüfte, Waden und Rumpf: zwei kurze Einheiten für einen stabileren Laufstil.",
      days: ["Kraft A", "Kraft B"],
    },
    renfoTrail: {
      name: "Kraft für Trail",
      description: "Beinkraft und Stabilität für Anstiege und Abfahrten.",
      days: ["Bergauf", "Bergab"],
    },
    renfoSwimmer: {
      name: "Kraft für Schwimmer",
      description: "Rücken, Schultern und Rumpf für einen kräftigeren Zug und geschützte Schultern.",
      days: ["Zug", "Rumpf"],
    },
    renfoCyclist: {
      name: "Kraft für Radfahrer",
      description: "Beine, Gesäß und unterer Rücken, um die Position zu halten und kräftiger anzutreten.",
      days: ["Kraft", "Stabilität"],
    },
  },
};

export const ENDURANCE_TEXT: Record<PlanLocale, EnduranceText> = { fr, en, de };
