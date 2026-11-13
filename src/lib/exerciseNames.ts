import { useCallback, useMemo } from "react";
import { useExercises } from "@/hooks/useExercises";
import { useLocale } from "next-intl";

/**
 * The library's exercises in French and German. The English name stays the
 * key everywhere (programs and sessions find exercises by it); only what the
 * athlete reads changes. Custom exercises keep the name their author gave.
 */
export const NAMES: Record<string, { fr: string; de: string }> = {
  "Barbell Bench Press": { fr: "Développé couché à la barre", de: "Bankdrücken mit Langhantel" },
  "Incline Barbell Bench Press": { fr: "Développé incliné à la barre", de: "Schrägbankdrücken mit Langhantel" },
  "Dumbbell Bench Press": { fr: "Développé couché aux haltères", de: "Kurzhantel-Bankdrücken" },
  "Incline Dumbbell Press": { fr: "Développé incliné aux haltères", de: "Schrägbankdrücken mit Kurzhanteln" },
  "Cable Fly": { fr: "Écarté à la poulie", de: "Kabelfliegende" },
  "Push-up": { fr: "Pompes", de: "Liegestütze" },
  "Chest Dip": { fr: "Dips (pectoraux)", de: "Dips (Brust)" },
  Deadlift: { fr: "Soulevé de terre", de: "Kreuzheben" },
  "Barbell Row": { fr: "Rowing à la barre", de: "Langhantelrudern" },
  "Pull-up": { fr: "Tractions pronation", de: "Klimmzüge" },
  "Chin-up": { fr: "Tractions supination", de: "Klimmzüge im Untergriff" },
  "Lat Pulldown": { fr: "Tirage vertical", de: "Latzug" },
  "Seated Cable Row": { fr: "Tirage horizontal à la poulie", de: "Rudern am Kabelzug sitzend" },
  "Dumbbell Row": { fr: "Rowing à un bras avec haltère", de: "Einarmiges Kurzhantelrudern" },
  "T-Bar Row": { fr: "Rowing T-bar", de: "T-Bar-Rudern" },
  "Back Squat": { fr: "Squat arrière", de: "Kniebeuge" },
  "Front Squat": { fr: "Squat avant", de: "Frontkniebeuge" },
  "Romanian Deadlift": { fr: "Soulevé de terre roumain", de: "Rumänisches Kreuzheben" },
  "Leg Press": { fr: "Presse à cuisses", de: "Beinpresse" },
  "Leg Extension": { fr: "Leg extension", de: "Beinstrecker" },
  "Leg Curl": { fr: "Leg curl", de: "Beinbeuger" },
  "Walking Lunge": { fr: "Fentes marchées", de: "Ausfallschritte gehend" },
  "Bulgarian Split Squat": { fr: "Squat bulgare", de: "Bulgarische Kniebeuge" },
  "Standing Calf Raise": { fr: "Mollets debout", de: "Wadenheben stehend" },
  "Hip Thrust": { fr: "Hip thrust", de: "Hip Thrust" },
  "Overhead Press": { fr: "Développé militaire", de: "Schulterdrücken stehend" },
  "Seated Dumbbell Press": { fr: "Développé épaules assis aux haltères", de: "Kurzhantel-Schulterdrücken sitzend" },
  "Lateral Raise": { fr: "Élévations latérales", de: "Seitheben" },
  "Rear Delt Fly": { fr: "Oiseau (deltoïdes postérieurs)", de: "Reverse Flys" },
  "Face Pull": { fr: "Face pull", de: "Face Pull" },
  "Barbell Curl": { fr: "Curl à la barre", de: "Langhantel-Curl" },
  "Dumbbell Curl": { fr: "Curl aux haltères", de: "Kurzhantel-Curl" },
  "Hammer Curl": { fr: "Curl marteau", de: "Hammer-Curl" },
  "Triceps Pushdown": { fr: "Extension triceps à la poulie", de: "Trizepsdrücken am Kabel" },
  "Skull Crusher": { fr: "Barre au front", de: "French Press liegend" },
  "Overhead Triceps Extension": { fr: "Extension triceps au-dessus de la tête", de: "Trizepsstrecken über Kopf" },
  Plank: { fr: "Gainage (planche)", de: "Unterarmstütz (Plank)" },
  "Hanging Leg Raise": { fr: "Relevés de jambes suspendu", de: "Beinheben hängend" },
  "Cable Crunch": { fr: "Crunch à la poulie", de: "Kabel-Crunch" },
  "Russian Twist": { fr: "Rotations russes", de: "Russian Twist" },
  "Side Plank": { fr: "Gainage latéral", de: "Seitstütz" },
  "Dead Bug": { fr: "Dead bug", de: "Dead Bug" },
  "Bird Dog": { fr: "Bird dog (quadrupédie)", de: "Vierfüßlerstand diagonal" },
  "Glute Bridge": { fr: "Pont fessier", de: "Glute Bridge" },
  "Single-Leg Calf Raise": { fr: "Mollets sur une jambe", de: "Einbeiniges Wadenheben" },
  "Step-up": { fr: "Montée sur banc", de: "Step-up" },
  "Single-Leg Romanian Deadlift": { fr: "Soulevé de terre roumain sur une jambe", de: "Einbeiniges rumänisches Kreuzheben" },
  "External Shoulder Rotation": { fr: "Rotation externe de l'épaule", de: "Schulter-Außenrotation" },
  "Straight-Arm Pulldown": { fr: "Pull-over à la poulie, bras tendus", de: "Latziehen mit gestreckten Armen" },
};

export const DESCRIPTIONS: Record<string, { fr: string; de: string }> = {
  "Side Plank": {
    fr: "Sur un avant-bras, le corps aligné, les hanches hautes. Tenir sans s'affaisser.",
    de: "Auf einem Unterarm, Körper in einer Linie, Hüfte hoch. Halten, ohne durchzuhängen.",
  },
  "Dead Bug": {
    fr: "Sur le dos, descendre lentement le bras et la jambe opposés en gardant le bas du dos plaqué au sol.",
    de: "In Rückenlage den gegenüberliegenden Arm und das Bein langsam absenken, der untere Rücken bleibt am Boden.",
  },
  "Bird Dog": {
    fr: "À quatre pattes, tendre le bras et la jambe opposés, marquer une pause, revenir sans tourner le buste.",
    de: "Im Vierfüßlerstand den gegenüberliegenden Arm und das Bein strecken, kurz halten, ohne Verdrehen zurück.",
  },
  "Glute Bridge": {
    fr: "Sur le dos, genoux fléchis, pousser les hanches vers le haut en serrant les fessiers.",
    de: "In Rückenlage mit gebeugten Knien die Hüfte nach oben drücken und das Gesäß anspannen.",
  },
  "Single-Leg Calf Raise": {
    fr: "Sur un pied, monter le plus haut possible, puis redescendre lentement en trois secondes.",
    de: "Auf einem Fuß so hoch wie möglich steigen, dann in drei Sekunden langsam absenken.",
  },
  "Step-up": {
    fr: "Monter sur un banc en poussant sur le talon avant, redescendre en contrôlant.",
    de: "Auf eine Box steigen, über die vordere Ferse drücken, kontrolliert absenken.",
  },
  "Single-Leg Romanian Deadlift": {
    fr: "En équilibre sur une jambe, basculer à partir des hanches dos plat, remonter en serrant le fessier.",
    de: "Auf einem Bein balancieren, mit geradem Rücken aus der Hüfte beugen, mit angespanntem Gesäß zurück.",
  },
  "External Shoulder Rotation": {
    fr: "Coude collé au corps, tourner lentement l'avant-bras vers l'extérieur. Charge légère.",
    de: "Ellbogen am Körper, den Unterarm langsam nach außen drehen. Leichtes Gewicht.",
  },
  "Straight-Arm Pulldown": {
    fr: "Bras presque tendus, tirer la barre jusqu'aux cuisses avec les dorsaux.",
    de: "Mit fast gestreckten Armen die Stange mit dem Latissimus zu den Oberschenkeln ziehen.",
  },
};

type Lang = "fr" | "de";
const lang = (locale: string): Lang | null => (locale === "fr" || locale === "de" ? locale : null);

type Translated = { nameFr?: string | null; nameDe?: string | null; descriptionFr?: string | null; descriptionDe?: string | null };

/**
 * An exercise's name in the app's language: the admin's translation, then the
 * one the app shipped with, then the name itself (custom and English names).
 */
export function exerciseLabel(name: string | undefined, locale: string, row?: Translated): string {
  if (!name) return "?";
  const l = lang(locale);
  if (!l) return name;
  return (l === "fr" ? row?.nameFr : row?.nameDe) || NAMES[name]?.[l] || name;
}

/** An exercise's description in the app's language, when there is one. */
export function exerciseDescription(
  ex: (Translated & { name?: string; description?: string }) | undefined,
  locale: string
): string | undefined {
  if (!ex) return undefined;
  const l = lang(locale);
  if (!l) return ex.description;
  return (l === "fr" ? ex.descriptionFr : ex.descriptionDe) || (ex.name ? DESCRIPTIONS[ex.name]?.[l] : undefined) || ex.description;
}

/** The label function for the current language, reading the library's translations. */
export function useExerciseLabel(): (name: string | undefined) => string {
  const locale = useLocale();
  const exercises = useExercises();
  const rows = useMemo(() => {
    const map = new Map<string, Translated>();
    for (const e of exercises) if (!e.isCustom || !map.has(e.name)) map.set(e.name, e);
    return map;
  }, [exercises]);
  return useCallback((name: string | undefined) => exerciseLabel(name, locale, name ? rows.get(name) : undefined), [locale, rows]);
}
