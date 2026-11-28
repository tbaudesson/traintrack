"use client";

import { MUSCLE_GROUPS } from "@/lib/muscles";
import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Dumbbell, History, Loader2, Sparkles } from "lucide-react";
import type { Equipment, Exercise, MuscleGroup } from "@/db";
import { useExercisesOrNull } from "@/hooks/useExercises";
import { useAllWorkoutSets } from "@/hooks/useWorkoutSets";
import { useWorkouts } from "@/hooks/useWorkouts";
import { useAthleteProfileOrNull } from "@/hooks/useAthleteProfile";
import { useExerciseLabel } from "@/lib/exerciseNames";
import { recentExerciseIds, search } from "@/lib/search";
import { companions } from "@/lib/suggest";
import type { Injury } from "@/lib/injuries";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Chip, ChipRow, SearchField } from "@/components/ui/find";
import { InjuryBadge } from "@/components/domain/InjuryBadge";

const MUSCLES = MUSCLE_GROUPS;
/** Results shown at once; more on demand rather than a wall of names. */
const PAGE = 30;

/**
 * Choosing an exercise: a search over the names in every language and the
 * descriptions, a chip per muscle group, one for "with my equipment", the
 * exercises last used first when nothing is typed, then the results a page
 * at a time. Shared by the session and the program editor.
 */
export function ExercisePicker({
  open,
  onOpenChange,
  title,
  onPick,
  injuries = [],
  exclude = [],
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  onPick: (exercise: Exercise) => void;
  injuries?: Injury[];
  /** Ids already in the session or the day: left out. */
  exclude?: number[];
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85dvh] flex-col gap-3 overflow-hidden">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {/* Mounted only while open: every opening starts from a clean search. */}
        {open && <PickerLoader onPick={onPick} injuries={injuries} exclude={exclude} />}
      </DialogContent>
    </Dialog>
  );
}

/**
 * The list is shown once the library is read, not empty then filled: on an
 * iPhone, a list that only becomes long enough to scroll after it is shown
 * may not scroll until something redraws it.
 */
function PickerLoader(props: { onPick: (exercise: Exercise) => void; injuries: Injury[]; exclude: number[] }) {
  const exercises = useExercisesOrNull();
  if (!exercises) {
    return (
      <div className="flex justify-center py-10" role="status">
        <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden="true" />
      </div>
    );
  }
  return <PickerBody {...props} exercises={exercises} />;
}

function PickerBody({ onPick, injuries, exclude, exercises }: { onPick: (exercise: Exercise) => void; injuries: Injury[]; exclude: number[]; exercises: Exercise[] }) {
  const t = useTranslations("picker");
  const te = useTranslations("exercises");
  const locale = useLocale();
  const xl = useExerciseLabel();
  const sets = useAllWorkoutSets();
  const workouts = useWorkouts();
  const profile = useAthleteProfileOrNull();
  const mine = useMemo<Equipment[]>(() => profile?.equipment ?? [], [profile]);
  const [query, setQuery] = useState("");
  const [muscle, setMuscle] = useState<MuscleGroup | null>(null);
  const [ownGear, setOwnGear] = useState(false);
  const [shown, setShown] = useState(PAGE);

  const usable = useMemo(() => exercises.filter((e) => e.id !== undefined && !exclude.includes(e.id)), [exercises, exclude]);
  const results = useMemo(() => {
    const byFilter = usable.filter(
      (e) => (!muscle || e.muscleGroup === muscle) && (!ownGear || !e.equipment || e.equipment === "bodyweight" || mine.includes(e.equipment))
    );
    const sorted = [...byFilter].sort((a, b) => xl(a.name).localeCompare(xl(b.name), locale));
    return search(sorted, query, (e) => ({
      names: [e.name, e.nameFr, e.nameDe],
      others: [e.description, e.descriptionFr, e.descriptionDe, te(`mg_${e.muscleGroup ?? "other"}`)],
    }));
  }, [usable, muscle, ownGear, mine, query, xl, locale, te]);

  const recent = useMemo(() => {
    const ids = recentExerciseIds(sets, workouts);
    return ids.map((id) => usable.find((e) => e.id === id)).filter((e): e is Exercise => !!e);
  }, [sets, workouts, usable]);
  // What the athlete usually does with the exercises already there.
  const together = useMemo(() => companions(exclude, sets).map((id) => usable.find((e) => e.id === id)).filter((e): e is Exercise => !!e), [exclude, sets, usable]);
  const filtering = !!query.trim() || !!muscle || ownGear;
  const reset = () => {
    setQuery("");
    setMuscle(null);
    setOwnGear(false);
    setShown(PAGE);
  };

  const row = (e: Exercise) => (
    <button
      key={e.id}
      type="button"
      onClick={() => onPick(e)}
      className="flex min-h-11 w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-accent"
    >
      <Dumbbell className="h-4 w-4 shrink-0 text-accent-500" aria-hidden="true" />
      <span className="flex min-w-0 flex-1 flex-col items-start gap-0.5">
        <span>{xl(e.name)}</span>
        <span className="text-xs text-muted-foreground">{te(`mg_${e.muscleGroup ?? "other"}`)}</span>
        <InjuryBadge exerciseName={e.name} injuries={injuries} />
      </span>
    </button>
  );

  return (
    <>
      <div className="space-y-2">
        <SearchField
          value={query}
          onChange={(v) => {
            setQuery(v);
            setShown(PAGE);
          }}
          placeholder={t("searchExercise")}
          clearLabel={t("clear")}
        />
        <ChipRow label={t("muscle")}>
          <Chip on={!muscle} onClick={() => setMuscle(null)}>{t("all")}</Chip>
          {MUSCLES.filter((m) => usable.some((e) => e.muscleGroup === m)).map((m) => (
            <Chip key={m} on={muscle === m} onClick={() => { setMuscle(muscle === m ? null : m); setShown(PAGE); }}>
              {te(`mg_${m}`)}
            </Chip>
          ))}
        </ChipRow>
        {mine.length > 0 && (
          <ChipRow label={t("equipment")}>
            <Chip on={ownGear} onClick={() => { setOwnGear(!ownGear); setShown(PAGE); }}>{t("myEquipment")}</Chip>
          </ChipRow>
        )}
      </div>

      <div className="-mx-1 min-h-0 flex-1 overflow-y-auto overscroll-contain px-1" aria-live="polite">
        {!filtering && together.length > 0 && (
          <section className="mb-3">
            <h3 className="mb-1 flex items-center gap-1.5 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> {t("together")}
            </h3>
            {together.map(row)}
          </section>
        )}
        {!filtering && recent.filter((e) => !together.includes(e)).length > 0 && (
          <section className="mb-3">
            <h3 className="mb-1 flex items-center gap-1.5 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              <History className="h-3.5 w-3.5" aria-hidden="true" /> {t("recent")}
            </h3>
            {recent.filter((e) => !together.includes(e)).map(row)}
          </section>
        )}
        {filtering && <p className="mb-1 text-xs text-muted-foreground">{t("count", { count: results.length })}</p>}
        {!filtering && <h3 className="mb-1 text-xs font-semibold tracking-widest text-muted-foreground uppercase">{t("allExercises")}</h3>}
        {results.slice(0, shown).map(row)}
        {results.length === 0 && (
          <div className="space-y-2 py-6 text-center text-sm text-muted-foreground">
            <p>{t("none")}</p>
            <Button variant="outline" size="sm" onClick={reset}>{t("reset")}</Button>
          </div>
        )}
        {results.length > shown && (
          <Button variant="ghost" className="mt-1 w-full text-accent-text" onClick={() => setShown(shown + PAGE)}>
            {t("more", { count: results.length - shown })}
          </Button>
        )}
      </div>
    </>
  );
}
