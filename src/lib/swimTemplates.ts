import type { ProgramDay } from "@/db";
import { PLAN_LOCALES, type PlanLocale } from "./enduranceText";
import type { ProgramTemplate } from "./programTemplates";

/**
 * Four swimming programs, beside the 8-week plan: learn the front crawl,
 * swim for fitness, build up to 1,500 m / 2 km, and get ready for a
 * triathlon or open water. Each session names the techniques it uses (keys
 * of the swim technique sheets, which an admin keeps), shown as links.
 * Written in French; English and German change only the words.
 */

interface Words {
  week: string;
  easy: (m: number) => string;
  choice: (m: number) => string;
  reps: (n: number, m: number, what: string, rest: number) => string;
  continuous: (m: number, extra?: string) => string;
  cool: (m: number) => string;
  crawl: string;
  breast: string;
  back: string;
  kick: string;
  pull: string;
  glide: string;
  sprintStart: string;
  sightEvery: string;
  noWall: string;
  drill: Record<string, string>;
  label: Record<"tech" | "endu" | "test" | "mixed" | "series" | "starts" | "openWater" | "race", string>;
  purpose: Record<"learnTech" | "learnEndu" | "learnTest" | "mixed" | "endu" | "tech" | "series" | "taper" | "goal" | "starts" | "openWater" | "race", string>;
  safety: string;
  programs: Record<"learn" | "fitness" | "distance" | "triathlon", { name: string; description: string }>;
}

const W: Record<PlanLocale, Words> = {
  fr: {
    week: "S",
    easy: (m) => `${m} m échauffement souple, nage au choix`,
    choice: (m) => `${m} m au choix (brasse ou dos), sans forcer`,
    reps: (n, m, what, rest) => `${n} × ${m} m ${what}, ${rest} s de pause`,
    continuous: (m, extra) => `${m} m sans s'arrêter${extra ? `, ${extra}` : ""}`,
    cool: (m) => `${m} m de retour au calme, très souple`,
    crawl: "crawl",
    breast: "brasse",
    back: "dos",
    kick: "battements avec planche",
    pull: "crawl avec pull-buoy",
    glide: "crawl en cherchant la glisse (un mouvement de moins par longueur)",
    sprintStart: "départ rapide sur 15 m puis nage régulière",
    sightEvery: "en levant les yeux tous les 8 mouvements",
    noWall: "sans pousser aux murs (demi-tour sur place, comme en eau libre)",
    drill: {
      streamline: "coulées bras tendus, puis 4 battements",
      kickboard: "battements avec planche",
      "side-kick": "battements sur le côté",
      "catch-up": "rattrapé",
      "breathing-3": "respiration tous les 3 temps",
      "fingertip-drag": "frôlé",
      fist: "poings fermés",
      sculling: "godille",
      "one-arm": "nage un bras",
      sighting: "orientation, yeux de crocodile",
    },
    label: { tech: "Technique", endu: "Endurance", test: "Test", mixed: "Nages variées", series: "Séries", starts: "Départs et relances", openWater: "Comme en eau libre", race: "Simulation de course" },
    purpose: {
      learnTech: "Se sentir à l'aise dans l'eau et poser les bases du crawl, sans se presser.",
      learnEndu: "Allonger peu à peu les distances en crawl, avec autant de pauses que nécessaire.",
      learnTest: "Mesurer le chemin parcouru : 200 m de crawl sans s'arrêter.",
      mixed: "Faire travailler tout le corps en changeant de nage.",
      endu: "Nager longtemps à une allure où l'on peut encore parler entre deux longueurs.",
      tech: "Nager mieux plutôt que plus : la glisse, c'est de la vitesse gratuite.",
      series: "Tenir une allure soutenue avec peu de repos.",
      taper: "Garder du rythme en allégeant avant l'objectif.",
      goal: "Atteindre la distance visée, à allure régulière.",
      starts: "Partir vite sans s'épuiser, puis trouver son rythme, comme au départ d'un triathlon.",
      openWater: "Nager longtemps sans l'appui des murs, en gardant le cap.",
      race: "Répéter la course : départ rapide, orientation, allure tenue jusqu'au bout.",
    },
    safety: "En eau libre, ne nagez jamais seul : un accompagnant, une bouée de sécurité visible.",
    programs: {
      learn: { name: "Apprendre le crawl en 8 semaines", description: "Deux séances par semaine pour passer de quelques longueurs à 200 m de crawl sans s'arrêter : aisance, battements, respiration, glisse. Pour qui sait nager un peu mais pas encore le crawl." },
      fitness: { name: "Natation forme", description: "Trois séances en rotation, nages variées, sans chrono : pour garder la forme, ménager les articulations et varier ses entraînements." },
      distance: { name: "Vers 1 500 m et 2 km de crawl", description: "Trois séances par semaine sur 8 semaines : technique, séries et endurance, jusqu'à 2 km sans s'arrêter, puis un test sur 1 500 m. Pour qui nage déjà 400 m de crawl." },
      triathlon: { name: "Prépa triathlon et eau libre", description: "Trois séances par semaine sur 8 semaines : orientation, respiration des deux côtés, départs rapides et longues distances sans les murs, jusqu'à une simulation de course. Pour qui nage déjà 800 m de crawl." },
    },
  },
  en: {
    week: "W",
    easy: (m) => `${m} m easy warm-up, any stroke`,
    choice: (m) => `${m} m any stroke (breaststroke or backstroke), easy`,
    reps: (n, m, what, rest) => `${n} × ${m} m ${what}, ${rest} s rest`,
    continuous: (m, extra) => `${m} m without stopping${extra ? `, ${extra}` : ""}`,
    cool: (m) => `${m} m cool-down, very easy`,
    crawl: "front crawl",
    breast: "breaststroke",
    back: "backstroke",
    kick: "kick with a board",
    pull: "front crawl with a pull buoy",
    glide: "front crawl looking for the glide (one stroke fewer per length)",
    sprintStart: "fast start over 15 m, then steady swimming",
    sightEvery: "lifting the eyes every 8 strokes",
    noWall: "without pushing off the walls (turn on the spot, as in open water)",
    drill: {
      streamline: "streamline push-offs, then 4 kicks",
      kickboard: "kick with a board",
      "side-kick": "side kick",
      "catch-up": "catch-up",
      "breathing-3": "breathing every 3 strokes",
      "fingertip-drag": "fingertip drag",
      fist: "fist drill",
      sculling: "sculling",
      "one-arm": "one-arm freestyle",
      sighting: "sighting, crocodile eyes",
    },
    label: { tech: "Technique", endu: "Endurance", test: "Test", mixed: "Mixed strokes", series: "Sets", starts: "Starts and surges", openWater: "As in open water", race: "Race rehearsal" },
    purpose: {
      learnTech: "Feel at ease in the water and lay the foundations of front crawl, without rushing.",
      learnEndu: "Stretch the front crawl distances little by little, with as many rests as you need.",
      learnTest: "See how far you have come: 200 m of front crawl without stopping.",
      mixed: "Work the whole body by changing strokes.",
      endu: "Swim for long at a pace where you could still talk between lengths.",
      tech: "Swim better rather than more: a good glide is free speed.",
      series: "Hold a strong pace with little rest.",
      taper: "Keep some rhythm while easing off before the goal.",
      goal: "Reach the distance you aimed at, at a steady pace.",
      starts: "Start fast without burning out, then find your rhythm, as at the start of a triathlon.",
      openWater: "Swim for long without the walls, holding your course.",
      race: "Rehearse the race: fast start, sighting, a pace held to the end.",
    },
    safety: "In open water, never swim alone: someone with you, a visible safety buoy.",
    programs: {
      learn: { name: "Learn front crawl in 8 weeks", description: "Two sessions a week to go from a few lengths to 200 m of front crawl without stopping: comfort, kick, breathing, glide. For those who can swim a little but not front crawl yet." },
      fitness: { name: "Swim for fitness", description: "Three sessions in rotation, mixed strokes, no stopwatch: to stay fit, spare the joints and vary your training." },
      distance: { name: "Towards 1,500 m and 2 km of front crawl", description: "Three sessions a week for 8 weeks: technique, sets and endurance, up to 2 km without stopping, then a 1,500 m test. For those who already swim 400 m of front crawl." },
      triathlon: { name: "Triathlon and open water prep", description: "Three sessions a week for 8 weeks: sighting, breathing on both sides, fast starts and long swims without the walls, up to a race rehearsal. For those who already swim 800 m of front crawl." },
    },
  },
  de: {
    week: "W",
    easy: (m) => `${m} m lockeres Einschwimmen, beliebige Lage`,
    choice: (m) => `${m} m beliebig (Brust oder Rücken), locker`,
    reps: (n, m, what, rest) => `${n} × ${m} m ${what}, ${rest} s Pause`,
    continuous: (m, extra) => `${m} m ohne Pause${extra ? `, ${extra}` : ""}`,
    cool: (m) => `${m} m Ausschwimmen, sehr locker`,
    crawl: "Kraul",
    breast: "Brust",
    back: "Rücken",
    kick: "Beinschlag mit Brett",
    pull: "Kraul mit Pull-Buoy",
    glide: "Kraul mit Fokus aufs Gleiten (ein Zug weniger pro Bahn)",
    sprintStart: "schneller Start über 15 m, dann gleichmäßig",
    sightEvery: "alle 8 Züge die Augen heben",
    noWall: "ohne Abstoß an der Wand (auf der Stelle wenden, wie im Freiwasser)",
    drill: {
      streamline: "Abstoß in Stromlinie, dann 4 Kicks",
      kickboard: "Beinschlag mit Brett",
      "side-kick": "Beinschlag in Seitlage",
      "catch-up": "Abschlagschwimmen",
      "breathing-3": "Dreieratmung",
      "fingertip-drag": "Fingerspitzen-Ziehen",
      fist: "Faustschwimmen",
      sculling: "Wriggeln",
      "one-arm": "einarmiges Kraulen",
      sighting: "Orientierung, Krokodilaugen",
    },
    label: { tech: "Technik", endu: "Ausdauer", test: "Test", mixed: "Lagenmix", series: "Serien", starts: "Starts und Tempowechsel", openWater: "Wie im Freiwasser", race: "Wettkampfprobe" },
    purpose: {
      learnTech: "Sich im Wasser wohlfühlen und die Grundlagen des Kraulens legen, ohne Eile.",
      learnEndu: "Die Kraulstrecken Schritt für Schritt verlängern, mit so vielen Pausen wie nötig.",
      learnTest: "Den Fortschritt messen: 200 m Kraul ohne Pause.",
      mixed: "Durch Lagenwechsel den ganzen Körper trainieren.",
      endu: "Lange in einem Tempo schwimmen, bei dem man zwischen den Bahnen noch sprechen könnte.",
      tech: "Besser statt mehr schwimmen: gutes Gleiten ist geschenkte Geschwindigkeit.",
      series: "Ein zügiges Tempo mit wenig Pause halten.",
      taper: "Vor dem Ziel entlasten und den Rhythmus halten.",
      goal: "Die angestrebte Strecke in gleichmäßigem Tempo schaffen.",
      starts: "Schnell starten, ohne sich zu verausgaben, dann den Rhythmus finden, wie beim Triathlonstart.",
      openWater: "Lange ohne die Wände schwimmen und den Kurs halten.",
      race: "Den Wettkampf proben: schneller Start, Orientierung, Tempo bis zum Ende.",
    },
    safety: "Im Freiwasser nie allein schwimmen: eine Begleitperson und eine sichtbare Schwimmboje.",
    programs: {
      learn: { name: "Kraulen lernen in 8 Wochen", description: "Zwei Einheiten pro Woche, um von wenigen Bahnen auf 200 m Kraul ohne Pause zu kommen: Wassergefühl, Beinschlag, Atmung, Gleiten. Für alle, die etwas schwimmen können, aber noch nicht kraulen." },
      fitness: { name: "Fitnessschwimmen", description: "Drei Einheiten im Wechsel, verschiedene Lagen, ohne Stoppuhr: um fit zu bleiben, die Gelenke zu schonen und abwechslungsreich zu trainieren." },
      distance: { name: "Auf 1.500 m und 2 km Kraul", description: "Drei Einheiten pro Woche über 8 Wochen: Technik, Serien und Ausdauer bis 2 km ohne Pause, dann ein Test über 1.500 m. Für alle, die schon 400 m kraulen." },
      triathlon: { name: "Triathlon- und Freiwasservorbereitung", description: "Drei Einheiten pro Woche über 8 Wochen: Orientierung, beidseitige Atmung, schnelle Starts und lange Strecken ohne Wände bis zur Wettkampfprobe. Für alle, die schon 800 m kraulen." },
    },
  },
};

interface Lap {
  metres: number;
  text: string;
}

const swimDay = (name: string, intensity: string, purpose: string, laps: Lap[], techniques: string[], notes?: string, week?: number): ProgramDay => ({
  name,
  ...(week ? { week } : {}),
  exercises: [],
  cardio: {
    sport: "swim",
    distanceKm: laps.reduce((t, l) => t + l.metres, 0) / 1000,
    intensity,
    purpose,
    steps: laps.map((l) => l.text),
    techniques,
    ...(notes ? { notes } : {}),
  },
});
const weeks = (n: number) => Array.from({ length: n }, (_, i) => i + 1);

function learnCrawl(w: Words): ProgramDay[] {
  const drills = ["streamline", "kickboard", "side-kick", "side-kick", "catch-up", "breathing-3", "catch-up", "fingertip-drag"];
  // The crawl of the endurance session: [repeats, metres], up to 200 m in one go.
  const endurance: [number, number][] = [[8, 25], [6, 50], [8, 50], [6, 25], [4, 100], [5, 100], [3, 150], [1, 200]];
  return weeks(8).flatMap((week) => {
    const name = (label: string) => `${w.week}${week} · ${label}`;
    const [n, m] = endurance[week - 1];
    const crawlReps = Math.min(4 + week, 10);
    return [
      swimDay(name(w.label.tech), "Zone 1-2", w.purpose.learnTech, [
        { metres: 200, text: w.choice(200) },
        { metres: 100, text: w.reps(4, 25, w.drill[drills[week - 1]], 30) },
        { metres: 100, text: w.reps(4, 25, w.kick, 30) },
        { metres: crawlReps * 25, text: w.reps(crawlReps, 25, w.crawl, 30) },
        { metres: 100, text: w.cool(100) },
      ], ["crawl", drills[week - 1], "kickboard"], undefined, week),
      week === 8
        ? swimDay(name(w.label.test), "Zone 2", w.purpose.learnTest, [
            { metres: 200, text: w.choice(200) },
            { metres: 200, text: w.continuous(200) },
            { metres: 100, text: w.cool(100) },
          ], ["crawl", "breathing-3"], undefined, week)
        : swimDay(name(w.label.endu), "Zone 2", w.purpose.learnEndu, [
            { metres: 200, text: w.choice(200) },
            { metres: n * m, text: w.reps(n, m, w.crawl, m >= 100 ? 45 : 30) },
            { metres: 100, text: w.cool(100) },
          ], ["crawl", "breathing-3"], undefined, week),
    ];
  });
}

function fitness(w: Words): ProgramDay[] {
  return [
    swimDay(w.label.mixed, "Zone 2", w.purpose.mixed, [
      { metres: 200, text: w.easy(200) },
      { metres: 200, text: w.reps(4, 50, w.breast, 20) },
      { metres: 200, text: w.reps(4, 50, w.back, 20) },
      { metres: 300, text: w.reps(6, 50, w.crawl, 20) },
      { metres: 200, text: w.reps(2, 100, w.pull, 30) },
      { metres: 100, text: w.cool(100) },
    ], ["breaststroke", "backstroke", "crawl", "pull-buoy"]),
    swimDay(w.label.endu, "Zone 2", w.purpose.endu, [
      { metres: 300, text: w.easy(300) },
      { metres: 900, text: w.reps(3, 300, w.crawl, 60) },
      { metres: 200, text: w.reps(4, 50, w.kick, 20) },
      { metres: 100, text: w.cool(100) },
    ], ["crawl", "kickboard"]),
    swimDay(w.label.tech, "Zone 2", w.purpose.tech, [
      { metres: 200, text: w.easy(200) },
      { metres: 200, text: w.reps(4, 50, w.drill["catch-up"], 20) },
      { metres: 200, text: w.reps(4, 50, w.drill.fist, 20) },
      { metres: 200, text: w.reps(4, 50, w.back, 20) },
      { metres: 200, text: w.reps(4, 50, w.glide, 20) },
      { metres: 200, text: w.cool(200) },
    ], ["catch-up", "fist", "backstroke", "crawl"]),
  ];
}

function distance(w: Words): ProgramDay[] {
  const drills = ["catch-up", "fist", "side-kick", "sculling", "one-arm", "fingertip-drag", "catch-up", "breathing-3"];
  const sets: [number, number, number][] = [[8, 100, 20], [10, 100, 20], [5, 200, 30], [6, 100, 30], [4, 300, 30], [3, 400, 40], [2, 600, 60], [8, 100, 20]];
  const continuous = [800, 1000, 1200, 800, 1500, 1700, 2000, 1500];
  return weeks(8).flatMap((week) => {
    const name = (label: string) => `${w.week}${week} · ${label}`;
    const [n, m, rest] = sets[week - 1];
    const easy = week === 4 || week === 8;
    return [
      swimDay(name(w.label.tech), "Zone 2", w.purpose.tech, [
        { metres: 300, text: w.easy(300) },
        { metres: 200, text: w.reps(4, 50, w.drill[drills[week - 1]], 20) },
        { metres: 200, text: w.reps(4, 50, w.kick, 20) },
        { metres: 600, text: w.reps(6, 100, w.crawl, 20) },
        { metres: 200, text: w.reps(2, 100, w.pull, 30) },
        { metres: 100, text: w.cool(100) },
      ], ["crawl", drills[week - 1], "kickboard", "pull-buoy"], undefined, week),
      swimDay(name(w.label.series), easy ? "Zone 2-3" : "Zone 4", easy ? w.purpose.taper : w.purpose.series, [
        { metres: 400, text: w.easy(400) },
        { metres: n * m, text: w.reps(n, m, w.crawl, rest) },
        { metres: 200, text: w.cool(200) },
      ], week >= 5 ? ["crawl", "flip-turn"] : ["crawl", "streamline"], undefined, week),
      swimDay(name(week === 8 ? w.label.test : w.label.endu), "Zone 2", week === 8 ? w.purpose.goal : w.purpose.endu, [
        { metres: 200, text: w.easy(200) },
        { metres: continuous[week - 1], text: w.continuous(continuous[week - 1]) },
        { metres: 100, text: w.cool(100) },
      ], ["crawl", "breathing-3"], undefined, week),
    ];
  });
}

function triathlon(w: Words): ProgramDay[] {
  const sets: [number, number, number][] = [[6, 100, 20], [8, 100, 20], [4, 200, 30], [6, 100, 30], [5, 200, 30], [4, 300, 30], [3, 400, 40], [6, 100, 20]];
  const continuous = [1000, 1200, 1500, 1000, 1800, 2000, 2200, 1500];
  return weeks(8).flatMap((week) => {
    const name = (label: string) => `${w.week}${week} · ${label}`;
    const [n, m, rest] = sets[week - 1];
    const easy = week === 4 || week === 8;
    return [
      swimDay(name(w.label.tech), "Zone 2", w.purpose.tech, [
        { metres: 300, text: w.easy(300) },
        { metres: 200, text: w.reps(4, 50, w.drill.sighting, 20) },
        { metres: 200, text: w.reps(4, 50, w.drill["breathing-3"], 20) },
        { metres: 200, text: w.reps(4, 50, w.drill["catch-up"], 20) },
        { metres: 600, text: w.reps(6, 100, `${w.crawl} ${w.sightEvery}`, 20) },
        { metres: 100, text: w.cool(100) },
      ], ["sighting", "breathing-3", "catch-up", "crawl"], undefined, week),
      swimDay(name(w.label.starts), easy ? "Zone 2-3" : "Zone 4", easy ? w.purpose.taper : w.purpose.starts, [
        { metres: 400, text: w.easy(400) },
        { metres: 300, text: w.reps(6, 50, w.sprintStart, 20) },
        { metres: n * m, text: w.reps(n, m, w.crawl, rest) },
        { metres: 200, text: w.cool(200) },
      ], ["crawl", "sighting"], undefined, week),
      week === 8
        ? swimDay(name(w.label.race), "Zone 3", w.purpose.race, [
            { metres: 300, text: w.easy(300) },
            { metres: 1500, text: w.continuous(1500, `${w.sprintStart}, ${w.sightEvery}, ${w.noWall}`) },
            { metres: 200, text: w.cool(200) },
          ], ["sighting", "crawl"], w.safety, week)
        : swimDay(name(w.label.openWater), "Zone 2", w.purpose.openWater, [
            { metres: 200, text: w.easy(200) },
            { metres: continuous[week - 1], text: w.continuous(continuous[week - 1], `${w.sightEvery}, ${w.noWall}`) },
            { metres: 100, text: w.cool(100) },
          ], ["sighting", "crawl", "breathing-3"], week >= 5 ? w.safety : undefined, week),
    ];
  });
}

const PLANS: { id: string; level: ProgramTemplate["level"]; goal: ProgramTemplate["goal"]; days: number; key: keyof Words["programs"]; build: (w: Words) => ProgramDay[] }[] = [
  { id: "natation-apprendre-crawl", level: "beginner", goal: "general", days: 2, key: "learn", build: learnCrawl },
  { id: "natation-forme", level: "beginner", goal: "general", days: 3, key: "fitness", build: fitness },
  { id: "natation-1500-2k", level: "intermediate", goal: "endurance", days: 3, key: "distance", build: distance },
  { id: "natation-triathlon", level: "intermediate", goal: "endurance", days: 3, key: "triathlon", build: triathlon },
];

/** The swimming programs in every language; the French one keeps the plain id. */
export const SWIM_TEMPLATES: ProgramTemplate[] = PLAN_LOCALES.flatMap((locale) =>
  PLANS.map((p): ProgramTemplate => ({
    id: locale === "fr" ? p.id : `${p.id}-${locale}`,
    locale,
    name: W[locale].programs[p.key].name,
    description: W[locale].programs[p.key].description,
    goal: p.goal,
    level: p.level,
    daysPerWeek: p.days,
    structure: p.build(W[locale]),
  }))
);
