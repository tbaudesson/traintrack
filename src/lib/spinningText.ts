import type { PlanLocale } from "./enduranceText";

export interface SpinningText {
  week: string;
  safety: string;
  beginner: {
    name: string;
    description: string;
    endurance: string;
    hills: string;
    rhythm: string;
    endurancePurpose: string;
    hillsPurpose: string;
    rhythmPurpose: string;
    enduranceSteps: (reps: number) => string[];
    hillsSteps: (reps: number) => string[];
    rhythmSteps: (reps: number) => string[];
  };
  hiit: {
    name: string;
    description: string;
    pyramid: string;
    tabata: string;
    climb: string;
    pyramidPurpose: string;
    tabataPurpose: string;
    climbPurpose: string;
    pyramidSteps: (rounds: number) => string[];
    tabataSteps: (sets: number) => string[];
    climbSteps: (reps: number) => string[];
  };
  warmUp: string;
  coolDown: string;
}

const fr: SpinningText = {
  week: "S",
  safety: "Réglez la selle à hauteur de hanche, buvez souvent, et baissez la résistance plutôt que de forcer sur les genoux. La séance guidée annonce chaque bloc.",
  warmUp: "Échauffement : 5 min à 80–90 tr/min, résistance légère",
  coolDown: "Retour au calme : 4 min très facile, puis étirements des cuisses et des mollets",
  beginner: {
    name: "Spinning débutant en 6 semaines",
    description:
      "Pour découvrir le vélo d’intérieur : trois séances de 30 à 45 min par semaine, assis, en danseuse, en côte et en vitesse, avec la cadence et la résistance de chaque bloc. Semaine 4 plus légère. Chaque séance se suit en mode guidé, chrono et bips compris.",
    endurance: "Endurance assise",
    hills: "Côtes et danseuse",
    rhythm: "Rythme et sprints",
    endurancePurpose: "Construire le fond : tenir une cadence régulière sans s’épuiser.",
    hillsPurpose: "Gagner en force dans les jambes : monter la résistance, assis puis en danseuse.",
    rhythmPurpose: "Apprendre à accélérer : des sprints courts et une récupération active.",
    enduranceSteps: (reps) => [`${reps} × (4 min assis à 85–95 tr/min, résistance 4 ; 1 min rapide à 100–110 tr/min ; 1 min de récupération)`],
    hillsSteps: (reps) => [`${reps} × (2 min de côte assis à 70–80 tr/min, résistance 6 ; 1 min en danseuse à 60–70 tr/min, résistance 7 ; 2 min de récupération)`],
    rhythmSteps: (reps) => ["5 min assis à 85–95 tr/min", `${reps} × (20 s de sprint à 110–120 tr/min ; 1 min 10 de récupération)`, "5 min assis à 85–95 tr/min"],
  },
  hiit: {
    name: "Spinning HIIT en 8 semaines",
    description:
      "Pour les cyclistes d’intérieur réguliers : intervalles en pyramide, Tabata et longues ascensions, trois séances de 30 à 50 min par semaine. Semaines 4 et 8 plus légères. Chaque séance se suit en mode guidé, chrono et bips compris.",
    pyramid: "Pyramide",
    tabata: "Tabata",
    climb: "Ascension longue",
    pyramidPurpose: "Monter et redescendre en durée d’effort : la puissance et la capacité à récupérer.",
    tabataPurpose: "Des efforts très courts et très intenses, pour le cardio et la vitesse.",
    climbPurpose: "La force-endurance : de longues montées à forte résistance, en alternant assis et danseuse.",
    pyramidSteps: (rounds) => [`${rounds} × pyramide d’efforts : 30 s, 1 min, 1 min 30, 2 min, 1 min 30, 1 min, 30 s, avec autant de récupération`],
    tabataSteps: (sets) => [`${sets} × Tabata : 8 × (20 s à fond, 10 s de repos), puis 2 min de récupération`],
    climbSteps: (reps) => [`${reps} × (4 min de montée assis à 65–75 tr/min, résistance 7 ; 1 min en danseuse, résistance 8 ; 2 min de récupération)`],
  },
};

const en: SpinningText = {
  week: "W",
  safety: "Set the saddle at hip height, drink often, and lower the resistance rather than straining the knees. The guided session calls out each block.",
  warmUp: "Warm-up: 5 min at 80–90 rpm, light resistance",
  coolDown: "Cool-down: 4 min very easy, then stretch the thighs and calves",
  beginner: {
    name: "Spinning for beginners in 6 weeks",
    description:
      "To discover indoor cycling: three sessions of 30 to 45 min a week, seated, standing, climbing and spinning fast, with the cadence and resistance of each block. Week 4 is lighter. Each session can be followed in guided mode, with timer and beeps.",
    endurance: "Seated endurance",
    hills: "Hills and standing",
    rhythm: "Rhythm and sprints",
    endurancePurpose: "Build your base: hold a steady cadence without wearing yourself out.",
    hillsPurpose: "Build leg strength: raise the resistance, seated then standing.",
    rhythmPurpose: "Learn to speed up: short sprints and active recovery.",
    enduranceSteps: (reps) => [`${reps} × (4 min seated at 85–95 rpm, resistance 4; 1 min fast at 100–110 rpm; 1 min of recovery)`],
    hillsSteps: (reps) => [`${reps} × (2 min seated climb at 70–80 rpm, resistance 6; 1 min standing at 60–70 rpm, resistance 7; 2 min of recovery)`],
    rhythmSteps: (reps) => ["5 min seated at 85–95 rpm", `${reps} × (20 s sprint at 110–120 rpm; 1 min 10 of recovery)`, "5 min seated at 85–95 rpm"],
  },
  hiit: {
    name: "Spinning HIIT in 8 weeks",
    description:
      "For regular indoor cyclists: pyramid intervals, Tabata and long climbs, three sessions of 30 to 50 min a week. Weeks 4 and 8 are lighter. Each session can be followed in guided mode, with timer and beeps.",
    pyramid: "Pyramid",
    tabata: "Tabata",
    climb: "Long climb",
    pyramidPurpose: "Efforts that grow longer then shorter: power, and the ability to recover.",
    tabataPurpose: "Very short, very hard efforts, for cardio and speed.",
    climbPurpose: "Strength endurance: long climbs at high resistance, seated and standing in turn.",
    pyramidSteps: (rounds) => [`${rounds} × effort pyramid: 30 s, 1 min, 1 min 30, 2 min, 1 min 30, 1 min, 30 s, each with as much recovery`],
    tabataSteps: (sets) => [`${sets} × Tabata: 8 × (20 s all out, 10 s rest), then 2 min of recovery`],
    climbSteps: (reps) => [`${reps} × (4 min seated climb at 65–75 rpm, resistance 7; 1 min standing, resistance 8; 2 min of recovery)`],
  },
};

const de: SpinningText = {
  week: "W",
  safety: "Sattel auf Hüfthöhe einstellen, oft trinken und lieber den Widerstand senken als die Knie zu belasten. Die geführte Einheit kündigt jeden Block an.",
  warmUp: "Aufwärmen: 5 Min. bei 80–90 U/min, leichter Widerstand",
  coolDown: "Ausklang: 4 Min. ganz locker, dann Oberschenkel und Waden dehnen",
  beginner: {
    name: "Spinning für Einsteiger in 6 Wochen",
    description:
      "Indoor-Cycling entdecken: drei Einheiten von 30 bis 45 Min. pro Woche, im Sitzen, im Wiegetritt, am Berg und schnell, mit Trittfrequenz und Widerstand für jeden Block. Woche 4 ist leichter. Jede Einheit lässt sich geführt absolvieren, mit Timer und Pieptönen.",
    endurance: "Ausdauer im Sitzen",
    hills: "Berge und Wiegetritt",
    rhythm: "Rhythmus und Sprints",
    endurancePurpose: "Grundlage aufbauen: eine gleichmäßige Trittfrequenz halten, ohne sich zu verausgaben.",
    hillsPurpose: "Beinkraft aufbauen: Widerstand erhöhen, im Sitzen und dann im Wiegetritt.",
    rhythmPurpose: "Beschleunigen lernen: kurze Sprints und aktive Erholung.",
    enduranceSteps: (reps) => [`${reps} × (4 Min. im Sitzen bei 85–95 U/min, Widerstand 4; 1 Min. schnell bei 100–110 U/min; 1 Min. Erholung)`],
    hillsSteps: (reps) => [`${reps} × (2 Min. Berg im Sitzen bei 70–80 U/min, Widerstand 6; 1 Min. Wiegetritt bei 60–70 U/min, Widerstand 7; 2 Min. Erholung)`],
    rhythmSteps: (reps) => ["5 Min. im Sitzen bei 85–95 U/min", `${reps} × (20 s Sprint bei 110–120 U/min; 1 Min. 10 Erholung)`, "5 Min. im Sitzen bei 85–95 U/min"],
  },
  hiit: {
    name: "Spinning-HIIT in 8 Wochen",
    description:
      "Für regelmäßige Indoor-Radler: Pyramiden-Intervalle, Tabata und lange Anstiege, drei Einheiten von 30 bis 50 Min. pro Woche. Wochen 4 und 8 sind leichter. Jede Einheit lässt sich geführt absolvieren, mit Timer und Pieptönen.",
    pyramid: "Pyramide",
    tabata: "Tabata",
    climb: "Langer Anstieg",
    pyramidPurpose: "Belastungen, die länger und wieder kürzer werden: Leistung und Erholungsfähigkeit.",
    tabataPurpose: "Sehr kurze, sehr harte Belastungen, für Kondition und Tempo.",
    climbPurpose: "Kraftausdauer: lange Anstiege mit hohem Widerstand, abwechselnd im Sitzen und im Wiegetritt.",
    pyramidSteps: (rounds) => [`${rounds} × Belastungspyramide: 30 s, 1 Min., 1 Min. 30, 2 Min., 1 Min. 30, 1 Min., 30 s, jeweils mit gleich langer Erholung`],
    tabataSteps: (sets) => [`${sets} × Tabata: 8 × (20 s Vollgas, 10 s Pause), dann 2 Min. Erholung`],
    climbSteps: (reps) => [`${reps} × (4 Min. Anstieg im Sitzen bei 65–75 U/min, Widerstand 7; 1 Min. Wiegetritt, Widerstand 8; 2 Min. Erholung)`],
  },
};

export const SPINNING_TEXT: Record<PlanLocale, SpinningText> = { fr, en, de };
