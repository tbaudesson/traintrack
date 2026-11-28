"use client";

import { useId, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import type { Exercise, Muscle, MuscleGroup } from "@/db";
import { JOINTS, MIRROR, SHAPES, SILHOUETTE, VIEW_BOX, type View } from "@/lib/bodyShapes";
import { muscleLoad, muscleName, musclesByGroup, nextChoice, type MuscleSelection } from "@/lib/muscleMap";
import { useBodyMuscles } from "@/hooks/useBodyMuscles";
import { activeInjuries } from "@/lib/injuries";
import type { PainArea } from "@/lib/pain";
import { useInjuries } from "@/hooks/useAthleteProfile";
import { useExercises } from "@/hooks/useExercises";
import { cn } from "@/lib/utils";

/** How much a muscle works, in three steps of one hue (none: the body's own grey). */
const LOAD_STEPS = [
  { from: 0.67, fill: "fill-accent-600 dark:fill-accent-400", key: "legendHigh" },
  { from: 0.34, fill: "fill-accent-400 dark:fill-accent-600", key: "legendMid" },
  { from: 0, fill: "fill-accent-200 dark:fill-accent-800", key: "legendLow" },
] as const;
const IDLE = "fill-muted-foreground/25";

const loadFill = (v: number | undefined) => (v && v > 0 ? LOAD_STEPS.find((s) => v >= s.from)!.fill : IDLE);

interface BodyMapProps {
  /** As a filter: each muscle wanted or ruled out, a tap on it changes that. */
  selection?: MuscleSelection;
  onTap?: (m: Muscle) => void;
  /** As a picture of a session: how much each muscle works, 0 to 1. */
  load?: Map<Muscle, number>;
  /** Injured joints, marked on the body. */
  injured?: PainArea[];
  /** What the picture shows, said for a screen reader (the filter has its list instead). */
  label?: string;
  className?: string;
}

/** The body seen from the front and from the back, its muscles coloured. */
export function BodyMap({ selection, onTap, load, injured = [], label, className }: BodyMapProps) {
  const t = useTranslations("bodyMap");
  const uid = useId().replace(/:/g, "");
  const hatch = `${uid}-hatch`;
  const fillOf = (m: Muscle) => {
    if (selection) return selection[m] === "in" ? "fill-accent-500" : selection[m] === "out" ? "fill-muted-foreground/10" : IDLE;
    return loadFill(load?.get(m));
  };

  const view = (v: View) => (
    <figure className="flex flex-1 flex-col items-center gap-1">
      <svg viewBox={VIEW_BOX} className="h-full max-h-72 w-auto" aria-hidden="true">
        <defs>
          <pattern id={hatch} patternUnits="userSpaceOnUse" width="3" height="3" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="3" stroke="currentColor" strokeWidth="1.1" />
          </pattern>
        </defs>
        <g className="fill-muted-foreground/10">
          {(["torso", "upperArm", "forearm", "hand", "thigh", "shin", "foot"] as const).map((k) => (
            <g key={k}>
              <path d={SILHOUETTE[k]} />
              <path d={SILHOUETTE[k]} transform={MIRROR} />
            </g>
          ))}
          <path d={SILHOUETTE.head} />
          <path d={SILHOUETTE.neck} />
        </g>
        {SHAPES[v].map((s, i) =>
          (s.single ? [undefined] : [undefined, MIRROR]).map((transform, j) => (
            <g key={`${i}-${j}`} data-muscle={s.muscle}>
              <path
                d={s.d}
                transform={transform}
                strokeWidth={0.7}
                className={cn("stroke-card transition-colors", fillOf(s.muscle), onTap && "cursor-pointer hover:opacity-80")}
                onClick={onTap ? () => onTap(s.muscle) : undefined}
              />
              {selection?.[s.muscle] === "out" && <path d={s.d} transform={transform} fill={`url(#${hatch})`} className="pointer-events-none text-muted-foreground/60" />}
            </g>
          ))
        )}
        {injured.flatMap((area) =>
          (JOINTS[area] ?? []).filter((j) => j.view === v).flatMap((j, i) =>
            (j.single ? [j.x] : [j.x, 120 - j.x]).map((x) => (
              <circle key={`${area}-${i}-${x}`} cx={x} cy={j.y} r={4.2} fill={`url(#${hatch})`} strokeWidth={1.2} className="pointer-events-none stroke-amber-600 text-amber-600 dark:stroke-amber-300 dark:text-amber-300" />
            ))
          )
        )}
      </svg>
      <figcaption className="text-xs text-muted-foreground">{t(v)}</figcaption>
    </figure>
  );

  return (
    <div role={label ? "img" : undefined} aria-label={label} className={cn("flex h-64 items-stretch justify-center gap-2", className)}>
      {view("front")}
      {view("back")}
    </div>
  );
}

/** What the colours say: how much a muscle works, and an injury. */
export function BodyMapLegend({ injured = false }: { injured?: boolean }) {
  const t = useTranslations("bodyMap");
  return (
    <ul className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
      {LOAD_STEPS.map((s) => (
        <li key={s.key} className="flex items-center gap-1.5">
          <svg viewBox="0 0 10 10" className="size-3" aria-hidden="true"><rect width="10" height="10" rx="2.5" className={s.fill} /></svg>
          {t(s.key)}
        </li>
      ))}
      {injured && (
        <li className="flex items-center gap-1.5">
          <svg viewBox="0 0 10 10" className="size-3" aria-hidden="true"><circle cx="5" cy="5" r="4" fill="none" strokeWidth="1.5" className="stroke-amber-600 dark:stroke-amber-300" /></svg>
          {t("legendInjury")}
        </li>
      )}
    </ul>
  );
}

/** The athlete's injuries not yet healed, as joints to mark. */
function useInjuredAreas(): PainArea[] {
  const injuries = useInjuries();
  return useMemo(() => [...new Set(activeInjuries(injuries).map((i) => i.area))], [injuries]);
}

/**
 * The body map as a filter: a tap on a muscle (or on its name) wants it, a
 * second rules it out, a third leaves it as it is.
 */
export function MuscleFilter({ selection, onChange }: { selection: MuscleSelection; onChange: (s: MuscleSelection) => void }) {
  const t = useTranslations("bodyMap");
  const te = useTranslations("exercises");
  const locale = useLocale();
  const muscles = useBodyMuscles();
  const injured = useInjuredAreas();
  const tap = (m: Muscle) => {
    const next = { ...selection };
    const c = nextChoice(selection[m]);
    if (c) next[m] = c;
    else delete next[m];
    onChange(next);
  };
  const any = Object.keys(selection).length > 0;
  if (!muscles) return <p role="status" className="text-xs text-muted-foreground">{t("notLoaded")}</p>;
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">{t("filterHint")}</p>
      <BodyMap selection={selection} onTap={tap} injured={injured} />
      {injured.length > 0 && (
        <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <svg viewBox="0 0 10 10" className="size-3" aria-hidden="true"><circle cx="5" cy="5" r="4" fill="none" strokeWidth="1.5" className="stroke-amber-600 dark:stroke-amber-300" /></svg>
          {t("legendInjury")}
        </p>
      )}
      <div className="space-y-2" role="group" aria-label={t("filterTitle")}>
        {musclesByGroup(muscles).map(({ group, muscles: ofGroup }) => (
          <div key={group} className="flex flex-wrap items-center gap-1.5">
            <span className="w-full text-xs font-semibold text-muted-foreground">{te(`mg_${group}`)}</span>
            {ofGroup.map((m) => {
              const c = selection[m];
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => tap(m)}
                  aria-label={`${muscleName(muscles, m, locale)} : ${c === "in" ? t("stateIn") : c === "out" ? t("stateOut") : t("stateNone")}`}
                  className={cn(
                    "min-h-9 rounded-full border px-2.5 text-xs font-medium",
                    c === "in" ? "border-accent-500 bg-accent-500 text-white" : c === "out" ? "border-border text-muted-foreground line-through" : "border-border hover:bg-muted"
                  )}
                >
                  {muscleName(muscles, m, locale)}
                </button>
              );
            })}
          </div>
        ))}
      </div>
      {any && (
        <button type="button" onClick={() => onChange({})} className="flex min-h-10 items-center gap-1 text-sm font-semibold text-accent-text">
          <X className="size-4" aria-hidden="true" />
          {t("clear")}
        </button>
      )}
    </div>
  );
}

/** An exercise of a session, as it is named there, and how much of it was done (sets or seconds). */
export interface SessionEntry {
  name: string;
  muscleGroup?: MuscleGroup;
  amount: number;
  /** The exercise itself, when the session has it at hand. */
  exercise?: Exercise;
}

/** The muscles a session works, on the body, folded by default. */
export function SessionMuscles({ entries, title, defaultOpen = false }: { entries: SessionEntry[]; title?: string; defaultOpen?: boolean }) {
  const t = useTranslations("bodyMap");
  const locale = useLocale();
  const library = useExercises();
  const muscles = useBodyMuscles();
  const injured = useInjuredAreas();
  const [open, setOpen] = useState(defaultOpen);
  const load = useMemo(() => {
    const byName = new Map(library.map((e) => [e.name, e]));
    return muscleLoad(
      entries.flatMap((e) => {
        const exercise = e.exercise ?? byName.get(e.name) ?? (e.muscleGroup ? { muscleGroup: e.muscleGroup } : undefined);
        return exercise ? [{ exercise, amount: e.amount }] : [];
      }),
      muscles ?? []
    );
  }, [entries, library, muscles]);
  if (!muscles || !load.size) return null;
  const name = (m: string) => muscleName(muscles, m, locale);
  const most = [...load].sort((a, b) => b[1] - a[1]).filter(([, v]) => v >= 0.67).map(([m]) => name(m));
  const heading = title ?? t("sessionTitle");
  return (
    <section className="t-surface rounded-2xl ring-1 ring-foreground/5">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex min-h-12 w-full items-center gap-2 px-4 text-left">
        <span className="flex-1">
          <span className="block text-sm font-semibold">{heading}</span>
          {most.length > 0 && <span className="block text-xs text-muted-foreground">{most.join(", ")}</span>}
        </span>
        {open ? <ChevronUp className="size-4 text-muted-foreground" aria-hidden="true" /> : <ChevronDown className="size-4 text-muted-foreground" aria-hidden="true" />}
      </button>
      {open && (
        <div className="space-y-2 px-4 pb-4">
          <BodyMap load={load} injured={injured} label={t("imgLabel", { list: [...load].sort((a, b) => b[1] - a[1]).map(([m]) => name(m)).join(", ") })} />
          <BodyMapLegend injured={injured.length > 0} />
        </div>
      )}
    </section>
  );
}
