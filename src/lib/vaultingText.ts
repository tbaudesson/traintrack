import type { PlanLocale } from "./enduranceText";

/** The compulsory figures of vaulting, in the order of the test. */
export const FIGURES = ["mount", "seat", "flag", "mill", "scissorsFwd", "scissorsBwd", "stand", "flank"] as const;
export type Figure = (typeof FIGURES)[number];

export type Phase = "foundation" | "development" | "competition" | "taper";

export interface VaultingText {
  /** Prefix of the week in a day's name: "S3 · …". */
  week: string;
  figures: Record<Figure, string>;
  /** The days' names. */
  days: { barrel: string; horse: string; fitness: string; compulsories: string; freestyle: string; strength: string; flexibility: string };
  technique: string;
  walk: string;
  canter: string;
  safety: string;
  barrelNote: string;
  beginner: {
    name: string;
    description: string;
    barrelPurpose: (week: number) => string;
    horsePurpose: string;
    warmUp: string;
    technique: (figures: string) => string;
    chain: (figures: string) => string;
    freestyle: string;
    coolDown: string;
    groundWarmUp: string;
    onHorse: (canter: boolean, figures: string) => string;
    wholeTest: string;
    dismount: string;
  };
  intermediate: {
    name: string;
    description: string;
    horsePurpose: Record<Phase, string>;
    horseMain: Record<Phase, string>;
    barrelPurpose: Record<Phase, string>;
    barrelWarmUp: string;
    barrelMain: Record<Phase, string>;
    weakest: string;
    coolDown: string;
    groundWarmUp: string;
    dismount: string;
  };
  fitness: { name: string; description: string };
}

const fr: VaultingText = {
  week: "S",
  figures: {
    mount: "Montée",
    seat: "Assis de base",
    flag: "Drapeau",
    mill: "Moulin",
    scissorsFwd: "Ciseaux avant",
    scissorsBwd: "Ciseaux arrière",
    stand: "Debout",
    flank: "Planche",
  },
  days: {
    barrel: "Tonneau",
    horse: "À cheval",
    fitness: "Prépa physique",
    compulsories: "À cheval : imposés",
    freestyle: "Tonneau : libre",
    strength: "Force et gainage",
    flexibility: "Souplesse et équilibre",
  },
  technique: "Technique",
  walk: "Pas",
  canter: "Galop",
  safety: "Toujours avec un longeur qualifié et un cheval de voltige, en tenue près du corps et chaussons de voltige.",
  barrelNote: "Le tonneau (ou cheval d’arçons) se travaille sur un tapis, avec une parade pour les nouvelles figures.",
  beginner: {
    name: "Voltige : débuter en 8 semaines",
    description:
      "Pour découvrir la voltige en club : les imposés appris d’abord sur le tonneau, puis à cheval au pas et au galop, et une séance de préparation physique. Trois séances par semaine. Les séances à cheval se font toujours avec un longeur qualifié.",
    barrelPurpose: (week) =>
      week === 4
        ? "Semaine plus légère : réviser les figures sans fatigue."
        : week <= 3
          ? "Apprendre les positions des imposés en sécurité, sans le mouvement du cheval."
          : week <= 6
            ? "Monter en difficulté : le debout et la planche, d’abord sur le tonneau."
            : "Enchaîner les imposés avec fluidité, comme en compétition.",
    horsePurpose: "Retrouver à cheval ce qui a été appris sur le tonneau, en suivant le rythme du cheval.",
    warmUp: "Échauffement : 5 min de course légère, cercles de bras et de hanches, 10 sauts sur place",
    technique: (figures) => `Technique : ${figures}. 5 fois chacune, tenue sur 4 temps comptés, avec une parade si besoin`,
    chain: (figures) => `Enchaînement : ${figures} à la suite, 3 fois, sans poser le pied`,
    freestyle: "Puis 1 min de libre : 3 figures de votre choix, enchaînées",
    coolDown: "Retour au calme : 5 min d’étirements des ischios, des épaules et des hanches",
    groundWarmUp: "Échauffement au sol : 3 tours de course à côté du cheval sur le cercle, puis mobilité des épaules et des hanches",
    onHorse: (canter, figures) =>
      canter
        ? `Au galop (au pas tant que le longeur ne vous juge pas prêt) : montée, puis ${figures}, 2 passages par figure`
        : `Au pas : montée avec l’aide du longeur, puis ${figures}, 2 passages par figure`,
    wholeTest: "Les imposés enchaînés une fois en entier",
    dismount: "Sortie contrôlée, réception pieds joints et genoux fléchis, puis 5 min d’étirements",
  },
  intermediate: {
    name: "Voltige : imposés et libre en 12 semaines",
    description:
      "Pour les voltigeurs qui connaissent les imposés au galop et préparent une compétition : précision des imposés, construction du libre sur le tonneau, force, gainage, souplesse et équilibre. Quatre séances par semaine en quatre phases, avec un affûtage la dernière semaine.",
    horsePurpose: {
      foundation: "Gagner en précision : des tenues nettes, dans le rythme du cheval.",
      development: "Stabiliser les imposés au galop et ajouter les figures du libre.",
      competition: "Répéter les passages comme le jour J : imposés puis libre, sans pause.",
      taper: "Garder les sensations, sans fatigue, avant la compétition.",
    },
    horseMain: {
      foundation: "Imposés un par un : Assis de base, Drapeau, Moulin, Ciseaux avant, Ciseaux arrière, Debout, Planche. 2 passages chacun, en comptant les foulées de tenue",
      development: "Imposés enchaînés 2 fois, puis 3 figures du libre travaillées une par une",
      competition: "Passage chronométré : imposés enchaînés, puis 1 min de libre. 2 fois, avec 5 min de récupération",
      taper: "Un seul passage complet à 80 %, puis les figures les plus sûres du libre",
    },
    barrelPurpose: {
      foundation: "Construire le libre : choisir et apprendre ses figures sur le tonneau.",
      development: "Créer l’enchaînement du libre et le travailler en musique.",
      competition: "Rendre le libre fluide et régulier, au chrono.",
      taper: "Revoir le libre sans fatigue.",
    },
    barrelWarmUp: "Échauffement : 5 min de corde à sauter ou de course, mobilité, 2 roulades avant et 2 arrière",
    barrelMain: {
      foundation: "Figures du libre : 4 à 6 figures (statiques, dynamiques, assises et debout), 5 fois chacune avec parade",
      development: "Le libre en 3 morceaux de 20 s, puis en entier, en musique",
      competition: "Le libre en entier en musique, 4 passages chronométrés de 1 min. Filmez-en un pour le revoir",
      taper: "Le libre 2 fois en entier, calmement",
    },
    weakest: "Imposés sur le tonneau : les 2 figures les moins sûres, 5 fois chacune",
    coolDown: "Retour au calme : 5 min d’étirements",
    groundWarmUp: "Échauffement au sol : 3 tours de course à côté du cheval, puis 5 min de mobilité",
    dismount: "Sortie contrôlée, puis 5 min d’étirements",
  },
  fitness: {
    name: "Préparation physique du voltigeur",
    description:
      "Deux séances sans cheval, à la maison ou en salle : gainage, force des bras et des jambes, équilibre et souplesse, les qualités qui donnent des figures nettes. En complément des séances en club.",
  },
};

const en: VaultingText = {
  week: "W",
  figures: {
    mount: "Mount",
    seat: "Basic seat",
    flag: "Flag",
    mill: "Mill",
    scissorsFwd: "Forward scissors",
    scissorsBwd: "Backward scissors",
    stand: "Stand",
    flank: "Flank",
  },
  days: {
    barrel: "Barrel",
    horse: "On the horse",
    fitness: "Conditioning",
    compulsories: "Horse: compulsories",
    freestyle: "Barrel: freestyle",
    strength: "Strength and core",
    flexibility: "Flexibility and balance",
  },
  technique: "Technique",
  walk: "Walk",
  canter: "Canter",
  safety: "Always with a qualified lunger and a vaulting horse, in close-fitting clothes and vaulting shoes.",
  barrelNote: "Work on the barrel over a mat, with a spotter for new figures.",
  beginner: {
    name: "Vaulting: get started in 8 weeks",
    description:
      "To discover vaulting at a club: the compulsory figures learnt on the barrel first, then on the horse at walk and canter, and a conditioning session. Three sessions a week. Sessions on the horse always with a qualified lunger.",
    barrelPurpose: (week) =>
      week === 4
        ? "Lighter week: go over the figures without fatigue."
        : week <= 3
          ? "Learn the positions of the compulsories safely, without the movement of the horse."
          : week <= 6
            ? "Step up: the stand and the flank, on the barrel first."
            : "Link the compulsories smoothly, as in a competition.",
    horsePurpose: "Find on the horse what you learnt on the barrel, following the rhythm of the horse.",
    warmUp: "Warm-up: 5 min easy jog, arm and hip circles, 10 jumps on the spot",
    technique: (figures) => `Technique: ${figures}. 5 times each, held for 4 counted beats, with a spotter if needed`,
    chain: (figures) => `Sequence: ${figures} one after the other, 3 times, without touching the ground`,
    freestyle: "Then 1 min of freestyle: 3 figures of your choice, linked",
    coolDown: "Cool-down: 5 min stretching of the hamstrings, shoulders and hips",
    groundWarmUp: "Warm-up on the ground: 3 laps running beside the horse on the circle, then shoulder and hip mobility",
    onHorse: (canter, figures) =>
      canter
        ? `At canter (at walk until the lunger judges you ready): mount, then ${figures}, 2 passes per figure`
        : `At walk: mount with the lunger’s help, then ${figures}, 2 passes per figure`,
    wholeTest: "The compulsories linked once, all of them",
    dismount: "Controlled dismount, landing feet together and knees bent, then 5 min of stretching",
  },
  intermediate: {
    name: "Vaulting: compulsories and freestyle in 12 weeks",
    description:
      "For vaulters who know the compulsories at canter and are preparing a competition: precise compulsories, a freestyle built on the barrel, strength, core, flexibility and balance. Four sessions a week in four phases, with a taper in the last week.",
    horsePurpose: {
      foundation: "Gain precision: clean holds, in the rhythm of the horse.",
      development: "Make the compulsories steady at canter and add the freestyle figures.",
      competition: "Rehearse the tests as on the day: compulsories then freestyle, without a break.",
      taper: "Keep the feeling, without fatigue, before the competition.",
    },
    horseMain: {
      foundation: "Compulsories one by one: Basic seat, Flag, Mill, Forward scissors, Backward scissors, Stand, Flank. 2 passes each, counting the strides of each hold",
      development: "Compulsories linked twice, then 3 freestyle figures worked one by one",
      competition: "Timed test: compulsories linked, then 1 min of freestyle. Twice, with 5 min of recovery",
      taper: "A single full test at 80 %, then the safest freestyle figures",
    },
    barrelPurpose: {
      foundation: "Build the freestyle: choose and learn your figures on the barrel.",
      development: "Create the freestyle sequence and practise it to music.",
      competition: "Make the freestyle smooth and steady, against the clock.",
      taper: "Go over the freestyle without fatigue.",
    },
    barrelWarmUp: "Warm-up: 5 min skipping rope or jogging, mobility, 2 forward and 2 backward rolls",
    barrelMain: {
      foundation: "Freestyle figures: 4 to 6 figures (static, dynamic, seated and standing), 5 times each with a spotter",
      development: "The freestyle in 3 parts of 20 s, then in full, to music",
      competition: "The full freestyle to music, 4 timed runs of 1 min. Film one to watch it back",
      taper: "The full freestyle twice, calmly",
    },
    weakest: "Compulsories on the barrel: the 2 least steady figures, 5 times each",
    coolDown: "Cool-down: 5 min of stretching",
    groundWarmUp: "Warm-up on the ground: 3 laps running beside the horse, then 5 min of mobility",
    dismount: "Controlled dismount, then 5 min of stretching",
  },
  fitness: {
    name: "Conditioning for vaulters",
    description:
      "Two sessions without a horse, at home or at the gym: core, arm and leg strength, balance and flexibility, the qualities behind clean figures. Alongside your club sessions.",
  },
};

const de: VaultingText = {
  week: "W",
  figures: {
    mount: "Aufsprung",
    seat: "Grundsitz",
    flag: "Fahne",
    mill: "Mühle",
    scissorsFwd: "Schere vorwärts",
    scissorsBwd: "Schere rückwärts",
    stand: "Stehen",
    flank: "Flanke",
  },
  days: {
    barrel: "Holzpferd",
    horse: "Auf dem Pferd",
    fitness: "Athletik",
    compulsories: "Pferd: Pflicht",
    freestyle: "Holzpferd: Kür",
    strength: "Kraft und Rumpf",
    flexibility: "Beweglichkeit und Gleichgewicht",
  },
  technique: "Technik",
  walk: "Schritt",
  canter: "Galopp",
  safety: "Immer mit einem qualifizierten Longenführer und einem Voltigierpferd, in eng anliegender Kleidung und Voltigierschuhen.",
  barrelNote: "Auf dem Holzpferd über einer Matte üben, neue Figuren mit Hilfestellung.",
  beginner: {
    name: "Voltigieren: Einstieg in 8 Wochen",
    description:
      "Voltigieren im Verein entdecken: die Pflichtübungen zuerst auf dem Holzpferd, dann auf dem Pferd im Schritt und im Galopp, dazu eine Athletikeinheit. Drei Einheiten pro Woche. Auf dem Pferd immer mit einem qualifizierten Longenführer.",
    barrelPurpose: (week) =>
      week === 4
        ? "Leichtere Woche: die Figuren ohne Ermüdung wiederholen."
        : week <= 3
          ? "Die Positionen der Pflicht sicher lernen, ohne die Bewegung des Pferdes."
          : week <= 6
            ? "Schwieriger werden: Stehen und Flanke, zuerst auf dem Holzpferd."
            : "Die Pflicht flüssig verbinden, wie im Turnier.",
    horsePurpose: "Auf dem Pferd wiederfinden, was auf dem Holzpferd gelernt wurde, im Rhythmus des Pferdes.",
    warmUp: "Aufwärmen: 5 Min. lockeres Laufen, Arm- und Hüftkreisen, 10 Sprünge auf der Stelle",
    technique: (figures) => `Technik: ${figures}. Je 5 Mal, 4 gezählte Takte halten, bei Bedarf mit Hilfestellung`,
    chain: (figures) => `Verbindung: ${figures} hintereinander, 3 Mal, ohne den Boden zu berühren`,
    freestyle: "Danach 1 Min. Kür: 3 Figuren nach Wahl, verbunden",
    coolDown: "Ausklang: 5 Min. Dehnen von Beinrückseite, Schultern und Hüften",
    groundWarmUp: "Aufwärmen am Boden: 3 Runden neben dem Pferd auf dem Zirkel laufen, dann Schulter- und Hüftmobilisation",
    onHorse: (canter, figures) =>
      canter
        ? `Im Galopp (im Schritt, solange der Longenführer dich nicht bereit findet): Aufsprung, dann ${figures}, 2 Durchgänge pro Figur`
        : `Im Schritt: Aufsprung mit Hilfe des Longenführers, dann ${figures}, 2 Durchgänge pro Figur`,
    wholeTest: "Die ganze Pflicht einmal verbunden",
    dismount: "Kontrollierter Abgang, Landung mit geschlossenen Füßen und gebeugten Knien, dann 5 Min. Dehnen",
  },
  intermediate: {
    name: "Voltigieren: Pflicht und Kür in 12 Wochen",
    description:
      "Für Voltigierer, die die Pflicht im Galopp beherrschen und sich auf ein Turnier vorbereiten: präzise Pflicht, Kür auf dem Holzpferd aufbauen, Kraft, Rumpf, Beweglichkeit und Gleichgewicht. Vier Einheiten pro Woche in vier Phasen, mit Tapering in der letzten Woche.",
    horsePurpose: {
      foundation: "Präziser werden: saubere Haltephasen, im Rhythmus des Pferdes.",
      development: "Die Pflicht im Galopp festigen und die Kürfiguren dazunehmen.",
      competition: "Die Durchgänge wie am Turniertag üben: Pflicht, dann Kür, ohne Pause.",
      taper: "Das Gefühl halten, ohne Ermüdung, vor dem Turnier.",
    },
    horseMain: {
      foundation: "Pflicht einzeln: Grundsitz, Fahne, Mühle, Schere vorwärts, Schere rückwärts, Stehen, Flanke. Je 2 Durchgänge, die Galoppsprünge jeder Haltephase zählen",
      development: "Pflicht 2 Mal verbunden, dann 3 Kürfiguren einzeln üben",
      competition: "Durchgang auf Zeit: Pflicht verbunden, dann 1 Min. Kür. 2 Mal, mit 5 Min. Erholung",
      taper: "Ein einziger ganzer Durchgang bei 80 %, dann die sichersten Kürfiguren",
    },
    barrelPurpose: {
      foundation: "Die Kür aufbauen: Figuren auf dem Holzpferd auswählen und lernen.",
      development: "Die Kürfolge gestalten und mit Musik üben.",
      competition: "Die Kür flüssig und gleichmäßig machen, auf Zeit.",
      taper: "Die Kür ohne Ermüdung wiederholen.",
    },
    barrelWarmUp: "Aufwärmen: 5 Min. Seilspringen oder Laufen, Mobilisation, 2 Rollen vorwärts und 2 rückwärts",
    barrelMain: {
      foundation: "Kürfiguren: 4 bis 6 Figuren (statisch, dynamisch, sitzend und stehend), je 5 Mal mit Hilfestellung",
      development: "Die Kür in 3 Teilen zu 20 s, dann ganz, mit Musik",
      competition: "Die ganze Kür mit Musik, 4 Durchgänge zu 1 Min. auf Zeit. Einen filmen und anschauen",
      taper: "Die ganze Kür 2 Mal, ruhig",
    },
    weakest: "Pflicht auf dem Holzpferd: die 2 unsichersten Figuren, je 5 Mal",
    coolDown: "Ausklang: 5 Min. Dehnen",
    groundWarmUp: "Aufwärmen am Boden: 3 Runden neben dem Pferd laufen, dann 5 Min. Mobilisation",
    dismount: "Kontrollierter Abgang, dann 5 Min. Dehnen",
  },
  fitness: {
    name: "Athletik für Voltigierer",
    description:
      "Zwei Einheiten ohne Pferd, zu Hause oder im Studio: Rumpf, Arm- und Beinkraft, Gleichgewicht und Beweglichkeit, die Grundlage sauberer Figuren. Zusätzlich zum Vereinstraining.",
  },
};

export const VAULTING_TEXT: Record<PlanLocale, VaultingText> = { fr, en, de };
