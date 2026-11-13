import type { PlanLocale } from "./enduranceText";

/**
 * The strength programs in the languages they were not written in. Each program
 * keeps its exercises; only its name, description and day names change.
 */
export interface StrengthText {
  name: string;
  description: string;
  days: string[];
}

/** The language each ready-made strength program was first written in. */
export const STRENGTH_ORIGINAL: Record<string, PlanLocale> = {
  "fullbody-beginner-3": "en",
  "strength-5x5-3": "en",
  "upperlower-4": "en",
  "ppl-6": "en",
  "fatloss-fullbody-3": "en",
  "home-dumbbell-3": "en",
  "fullbody-2-fr": "fr",
  "remise-en-forme-3": "fr",
  "force-3x5-3": "fr",
  "masse-5": "fr",
  "fessiers-jambes-3": "fr",
  "halteres-4": "fr",
  "poids-du-corps-3": "fr",
  "seche-4": "fr",
};

export const STRENGTH_TEXT: Record<string, Partial<Record<PlanLocale, StrengthText>>> = {
  "fullbody-beginner-3": {
    fr: {
      name: "Full Body — Débutant",
      description: "Trois séances complètes par semaine : la façon la plus simple et la plus efficace de commencer.",
      days: ["Jour A", "Jour B", "Jour C"],
    },
    de: {
      name: "Ganzkörper — Anfänger",
      description: "Drei Ganzkörpereinheiten pro Woche: der einfachste und wirksamste Einstieg.",
      days: ["Tag A", "Tag B", "Tag C"],
    },
  },
  "strength-5x5-3": {
    fr: {
      name: "Force 5×5",
      description: "Le grand classique de la force à la barre, en progression linéaire : un peu plus lourd à chaque séance.",
      days: ["Séance A", "Séance B"],
    },
    de: {
      name: "Kraft 5×5",
      description: "Der Klassiker des Langhantel-Krafttrainings mit linearer Steigerung: jede Einheit etwas mehr Gewicht.",
      days: ["Einheit A", "Einheit B"],
    },
  },
  "upperlower-4": {
    fr: {
      name: "Haut / Bas du corps",
      description: "Quatre jours par semaine, en alternant haut et bas du corps. Un très bon équilibre entre volume et récupération.",
      days: ["Haut A", "Bas A", "Haut B", "Bas B"],
    },
    de: {
      name: "Oberkörper / Unterkörper",
      description: "Vier Tage pro Woche, abwechselnd Ober- und Unterkörper. Eine sehr gute Balance aus Umfang und Erholung.",
      days: ["Oberkörper A", "Unterkörper A", "Oberkörper B", "Unterkörper B"],
    },
  },
  "ppl-6": {
    fr: {
      name: "Poussée / Tirage / Jambes",
      description: "Six jours à gros volume, pour les pratiquants avancés qui visent un maximum de muscle.",
      days: ["Poussée", "Tirage", "Jambes"],
    },
    de: {
      name: "Drücken / Ziehen / Beine",
      description: "Sechs Tage mit hohem Umfang für Fortgeschrittene, die maximalen Muskelaufbau anstreben.",
      days: ["Drücken", "Ziehen", "Beine"],
    },
  },
  "fatloss-fullbody-3": {
    fr: {
      name: "Sec et fort",
      description: "Des circuits complets avec peu de repos pour garder le cœur haut tout en préservant le muscle pendant une sèche.",
      days: ["Circuit A", "Circuit B"],
    },
    de: {
      name: "Schlank & stark",
      description: "Ganzkörperzirkel mit kurzen Pausen: der Puls bleibt hoch, die Muskeln bleiben in der Diät erhalten.",
      days: ["Zirkel A", "Zirkel B"],
    },
  },
  "home-dumbbell-3": {
    fr: {
      name: "Haltères à la maison",
      description: "Un programme complet avec une seule paire d'haltères, idéal pour s'entraîner chez soi.",
      days: ["Corps entier A", "Corps entier B"],
    },
    de: {
      name: "Kurzhanteln zu Hause",
      description: "Ein komplettes Programm mit nur einem Paar Kurzhanteln, ideal für das Training zu Hause.",
      days: ["Ganzkörper A", "Ganzkörper B"],
    },
  },
  "fullbody-2-fr": {
    en: {
      name: "2-Day Essentials",
      description: "Two complete sessions a week, to make progress on a busy schedule.",
      days: ["Session A", "Session B"],
    },
    de: {
      name: "Basis 2 Tage",
      description: "Zwei komplette Einheiten pro Woche, um auch mit vollem Terminkalender Fortschritte zu machen.",
      days: ["Einheit A", "Einheit B"],
    },
  },
  "remise-en-forme-3": {
    en: {
      name: "Back in Shape",
      description: "A gentle restart on machines and dumbbells, to build good habits again.",
      days: ["Day 1", "Day 2", "Day 3"],
    },
    de: {
      name: "Wieder fit",
      description: "Ein sanfter Wiedereinstieg an Geräten und mit Kurzhanteln, um gute Gewohnheiten aufzubauen.",
      days: ["Tag 1", "Tag 2", "Tag 3"],
    },
  },
  "force-3x5-3": {
    en: {
      name: "Strength 3×5",
      description: "Few reps, heavy loads and long rests on the big lifts.",
      days: ["Heavy A", "Heavy B", "Heavy C"],
    },
    de: {
      name: "Kraft 3×5",
      description: "Wenige Wiederholungen, schwere Lasten und lange Pausen bei den Grundübungen.",
      days: ["Schwer A", "Schwer B", "Schwer C"],
    },
  },
  "masse-5": {
    en: {
      name: "5-Day Muscle Gain",
      description: "One muscle group per session and plenty of volume, for regular lifters.",
      days: ["Chest", "Back", "Legs", "Shoulders", "Arms"],
    },
    de: {
      name: "Masseaufbau 5 Tage",
      description: "Eine Muskelgruppe pro Einheit und viel Umfang, für regelmäßig Trainierende.",
      days: ["Brust", "Rücken", "Beine", "Schultern", "Arme"],
    },
  },
  "fessiers-jambes-3": {
    en: {
      name: "Glutes & Legs",
      description: "Three lower-body sessions with complete glute work.",
      days: ["Glutes", "Quads", "Hamstrings"],
    },
    de: {
      name: "Po & Beine",
      description: "Drei Einheiten für den Unterkörper mit umfassendem Gesäßtraining.",
      days: ["Gesäß", "Quadrizeps", "Beinbeuger"],
    },
  },
  "halteres-4": {
    en: {
      name: "4-Day Dumbbell",
      description: "Upper and lower body in turn, with dumbbells only.",
      days: ["Upper A", "Lower A", "Upper B", "Lower B"],
    },
    de: {
      name: "Kurzhanteln 4 Tage",
      description: "Ober- und Unterkörper im Wechsel, nur mit Kurzhanteln.",
      days: ["Oberkörper A", "Unterkörper A", "Oberkörper B", "Unterkörper B"],
    },
  },
  "poids-du-corps-3": {
    en: {
      name: "Bodyweight",
      description: "No equipment except a pull-up bar: train anywhere, any time.",
      days: ["Push", "Pull", "Legs"],
    },
    de: {
      name: "Eigengewicht",
      description: "Keine Ausrüstung außer einer Klimmzugstange: überall und jederzeit trainieren.",
      days: ["Drücken", "Ziehen", "Beine"],
    },
  },
  "seche-4": {
    en: {
      name: "4-Day Cut",
      description: "Dense sessions with little rest, to lose fat while keeping muscle.",
      days: ["Dense upper", "Dense lower", "Upper circuit", "Lower circuit"],
    },
    de: {
      name: "Definition 4 Tage",
      description: "Dichte Einheiten mit kurzen Pausen, um Fett zu verlieren und Muskeln zu erhalten.",
      days: ["Oberkörper dicht", "Unterkörper dicht", "Oberkörper-Zirkel", "Unterkörper-Zirkel"],
    },
  },
};
