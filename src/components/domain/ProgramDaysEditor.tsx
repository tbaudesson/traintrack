"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import { useTranslations } from "next-intl";
import { useExercises } from "@/hooks/useExercises";
import type { CardioTarget, ProgramDay, ProgramExercise, Sport } from "@/db";
import { SPORTS } from "@/lib/cardio";
import { programGroups, supersetLabels } from "@/lib/supersets";
import { formatPercents, parsePercents } from "@/lib/percent";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ExercisePicker } from "@/components/domain/ExercisePicker";
import { ExistingSessionPicker } from "@/components/domain/ExistingSessionPicker";
import { appendDay } from "@/lib/reuse";
import { Plus, Trash2, Dumbbell, X, CopyPlus, ChevronDown } from "lucide-react";
import { useExerciseLabel } from "@/lib/exerciseNames";
import type { Injury } from "@/lib/injuries";
import { InjuryBadge } from "@/components/domain/InjuryBadge";

/** The days and exercises of a program, for users' programs and admin templates alike. */
export function ProgramDaysEditor({
  days,
  setDays,
  injuries = [],
  programId,
}: {
  days: ProgramDay[];
  setDays: Dispatch<SetStateAction<ProgramDay[]>>;
  /** The injuries of the athlete the program is for: risky exercises are flagged. */
  injuries?: Injury[];
  /** The program edited, left out of "add an existing session". */
  programId?: number;
}) {
  const t = useTranslations("programs");
  const tc = useTranslations("cardio");
  const xl = useExerciseLabel();
  const exercises = useExercises();
  const [pickerDay, setPickerDay] = useState<number | null>(null);
  const [takingExisting, setTakingExisting] = useState(false);
  // One exercise open at a time: the others stay a line each ("4 × 8-10 · 90 s").
  const [openExercise, setOpenExercise] = useState<string | null>(null);

  function updateDay(i: number, day: ProgramDay) {
    setDays((d) => d.map((x, idx) => (idx === i ? day : x)));
  }
  function addDay() {
    setDays((d) => [...d, { name: `${t("day")} ${d.length + 1}`, exercises: [] }]);
  }
  function removeDay(i: number) {
    setDays((d) => d.filter((_, idx) => idx !== i));
  }
  function addExerciseToDay(dayIdx: number, name: string, uuid?: string) {
    const pe: ProgramExercise = { exerciseName: name, exerciseUuid: uuid, targetSets: 3, targetReps: "8-12", restSec: 90 };
    setDays((d) => d.map((x, idx) => (idx === dayIdx ? { ...x, exercises: [...x.exercises, pe] } : x)));
    setOpenExercise(`${dayIdx}-${days[dayIdx]?.exercises.length ?? 0}`);
    setPickerDay(null);
  }
  function updateExercise(dayIdx: number, exIdx: number, patch: Partial<ProgramExercise>) {
    setDays((d) =>
      d.map((x, idx) =>
        idx === dayIdx ? { ...x, exercises: x.exercises.map((e, ei) => (ei === exIdx ? { ...e, ...patch } : e)) } : x
      )
    );
  }
  function removeExercise(dayIdx: number, exIdx: number) {
    setDays((d) => d.map((x, idx) => (idx === dayIdx ? { ...x, exercises: x.exercises.filter((_, ei) => ei !== exIdx) } : x)));
    setOpenExercise(null);
  }

  return (
    <>
        {/* Days */}
        {days.map((day, di) => (
          <Card key={di}>
            <CardContent className="space-y-3 py-3">
              <div className="flex items-center gap-2">
                <Input
                  value={day.name}
                  aria-label={t("dayName")}
                  onChange={(e) => updateDay(di, { ...day, name: e.target.value })}
                  className="flex-1 font-semibold"
                />
                <button
                  type="button"
                  onClick={() => removeDay(di)}
                  aria-label={t("removeDay", { name: day.name })}
                  className="grid size-11 shrink-0 place-items-center rounded-md text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>

              <label className="block text-sm font-medium">
                {tc("dayType")}
                <select
                  value={day.cardio ? "cardio" : "strength"}
                  onChange={(e) =>
                    updateDay(di, { ...day, cardio: e.target.value === "cardio" ? { sport: "run" } : undefined })
                  }
                  className="mt-1 h-11 w-full rounded-lg border border-input bg-card px-3 text-base"
                >
                  <option value="strength">{tc("dayStrength")}</option>
                  <option value="cardio">{tc("dayCardio")}</option>
                </select>
              </label>

              {day.cardio && <CardioDayFields value={day.cardio} onChange={(cardio) => updateDay(di, { ...day, cardio })} />}

              {!day.cardio && day.exercises.map((ex, ei, all) => {
                const label = supersetLabels(programGroups(all.map((e) => !!e.supersetWithNext)))[ei];
                return (
                <ExerciseRow
                  key={ei}
                  ex={ex}
                  label={label}
                  name={xl(ex.exerciseName)}
                  injuries={injuries}
                  isLast={ei === day.exercises.length - 1}
                  open={openExercise === `${di}-${ei}`}
                  onToggle={() => setOpenExercise((o) => (o === `${di}-${ei}` ? null : `${di}-${ei}`))}
                  onChange={(patch) => updateExercise(di, ei, patch)}
                  onRemove={() => removeExercise(di, ei)}
                />
                );
              })}

              {!day.cardio && (
                <Button variant="ghost" size="sm" className="w-full" onClick={() => setPickerDay(di)}>
                  <Plus className="mr-1 h-4 w-4" />
                  {t("addExercise")}
                </Button>
              )}
            </CardContent>
          </Card>
        ))}

        <div className="grid gap-2 sm:grid-cols-2">
          <Button variant="outline" className="w-full" onClick={addDay}>
            <Plus className="mr-1 h-4 w-4" />
            {t("addDay")}
          </Button>
          <Button variant="outline" className="w-full" onClick={() => setTakingExisting(true)}>
            <CopyPlus className="mr-1 h-4 w-4" aria-hidden="true" />
            {t("addExisting")}
          </Button>
        </div>
        <ExistingSessionPicker
          open={takingExisting}
          onOpenChange={setTakingExisting}
          exceptProgramId={programId}
          onPick={(day) => {
            setDays((d) => appendDay(d, day));
            setTakingExisting(false);
          }}
        />

      {/* Exercise picker */}
      <ExercisePicker
        open={pickerDay !== null}
        onOpenChange={(o) => !o && setPickerDay(null)}
        title={t("addExercise")}
        injuries={injuries}
        exclude={pickerDay === null ? [] : exercises.filter((e) => e.id !== undefined && days[pickerDay]?.exercises.some((x) => x.exerciseName === e.name)).map((e) => e.id!)}
        onPick={(e) => pickerDay !== null && addExerciseToDay(pickerDay, e.name, e.uuid)}
      />
    </>
  );
}

/**
 * An exercise of a day: one line saying what it asks ("4 × 8-10 · 90 s"),
 * opened to change it. Sets, reps and rest first; the load in % of 1RM and
 * the superset under "Advanced options".
 */
function ExerciseRow({
  ex,
  label,
  name,
  injuries,
  isLast,
  open,
  onToggle,
  onChange,
  onRemove,
}: {
  ex: ProgramExercise;
  label: string | undefined;
  name: string;
  injuries: Injury[];
  isLast: boolean;
  open: boolean;
  onToggle: () => void;
  onChange: (patch: Partial<ProgramExercise>) => void;
  onRemove: () => void;
}) {
  const t = useTranslations("programs");
  const summary = [
    t("exerciseSummary", { sets: ex.targetSets, reps: ex.targetReps }),
    ex.restSec ? t("restSummary", { sec: ex.restSec }) : null,
    ex.percents?.length ? t("percentsMark") : null,
    ex.supersetWithNext ? t("supersetMark") : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const advancedSet = !!ex.percents?.length || !!ex.supersetWithNext;
  return (
    <div
      className={cn(
        "rounded-lg border",
        label ? "border-accent-500/50 border-l-4 border-l-accent-500" : "border-border",
        ex.supersetWithNext && "-mb-1 rounded-b-none"
      )}
    >
      <div className="flex items-center gap-1 pr-1">
        <button type="button" onClick={onToggle} aria-expanded={open} aria-label={t("editExercise", { name })} className="flex min-h-12 min-w-0 flex-1 items-center gap-2 px-2 py-1.5 text-left">
          {label ? <span className="w-6 shrink-0 text-xs font-bold text-accent-text">{label}</span> : <Dumbbell className="h-4 w-4 shrink-0 text-accent-500" aria-hidden="true" />}
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{name}</span>
            <span className="block truncate text-xs text-muted-foreground tabular-nums">{summary}</span>
          </span>
          <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} aria-hidden="true" />
        </button>
        <InjuryBadge exerciseName={ex.exerciseName} injuries={injuries} />
        <button type="button" onClick={onRemove} aria-label={t("removeExercise", { name })} className="grid size-11 shrink-0 place-items-center text-muted-foreground hover:text-destructive">
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      {open && (
        <div className="space-y-2 border-t border-border p-2">
          <div className="grid grid-cols-3 gap-2">
            <label className="text-xs text-muted-foreground">
              {t("sets")}
              <Input type="number" inputMode="numeric" value={ex.targetSets} onChange={(e) => onChange({ targetSets: Number(e.target.value) })} className="mt-0.5 h-11" />
            </label>
            <label className="text-xs text-muted-foreground">
              {t("reps")}
              <Input value={ex.targetReps} onChange={(e) => onChange({ targetReps: e.target.value })} className="mt-0.5 h-11" />
            </label>
            <label className="text-xs text-muted-foreground">
              {t("rest")}
              <Input type="number" inputMode="numeric" value={ex.restSec ?? ""} onChange={(e) => onChange({ restSec: Number(e.target.value) })} className="mt-0.5 h-11" />
            </label>
          </div>
          <details open={advancedSet} className="rounded-md bg-muted/40 px-2">
            <summary className="flex min-h-11 cursor-pointer items-center text-xs font-semibold text-muted-foreground">{t("advanced")}</summary>
            <div className="space-y-2 pb-2">
              <label className="block text-xs text-muted-foreground">
                {t("percents")}
                <Input
                  key={formatPercents(ex.percents)}
                  defaultValue={formatPercents(ex.percents)}
                  placeholder={t("percentsHint")}
                  inputMode="decimal"
                  onBlur={(e) => onChange({ percents: parsePercents(e.target.value) })}
                  className="mt-0.5 h-11"
                />
              </label>
              {!isLast && (
                <label className="flex min-h-11 items-center gap-2 text-xs text-muted-foreground">
                  <input type="checkbox" checked={!!ex.supersetWithNext} onChange={(e) => onChange({ supersetWithNext: e.target.checked || undefined })} className="size-5" />
                  {t("supersetWithNext")}
                </label>
              )}
            </div>
          </details>
        </div>
      )}
    </div>
  );
}

function CardioDayFields({ value, onChange }: { value: CardioTarget; onChange: (next: CardioTarget) => void }) {
  const t = useTranslations("cardio");
  const tp = useTranslations("programs");
  const number = (raw: string) => (raw === "" ? undefined : Number(raw));
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium">
        {t("sport")}
        <select
          value={value.sport}
          onChange={(e) => onChange({ ...value, sport: e.target.value as Sport })}
          className="mt-1 h-11 w-full rounded-lg border border-input bg-card px-3 text-base"
        >
          {SPORTS.map((s) => <option key={s} value={s}>{t(`sport_${s}`)}</option>)}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="block text-sm font-medium">
          {t("distanceKm")}
          <Input type="number" inputMode="decimal" value={value.distanceKm ?? ""} onChange={(e) => onChange({ ...value, distanceKm: number(e.target.value) })} className="mt-1" />
        </label>
        <label className="block text-sm font-medium">
          {t("minutes")}
          <Input type="number" inputMode="numeric" value={value.durationMin ?? ""} onChange={(e) => onChange({ ...value, durationMin: number(e.target.value) })} className="mt-1" />
        </label>
      </div>
      <details open={!!(value.intensity || value.notes || value.purpose || value.steps?.length)} className="rounded-md bg-muted/40 px-2">
        <summary className="flex min-h-11 cursor-pointer items-center text-xs font-semibold text-muted-foreground">{tp("moreDetails")}</summary>
        <div className="space-y-2 pb-2">
      <label className="block text-sm font-medium">
        {t("intensity")}
        <Input value={value.intensity ?? ""} onChange={(e) => onChange({ ...value, intensity: e.target.value || undefined })} className="mt-1" />
      </label>
      <label className="block text-sm font-medium">
        {t("instructions")}
        <Input value={value.notes ?? ""} onChange={(e) => onChange({ ...value, notes: e.target.value || undefined })} className="mt-1" />
      </label>
      <label className="block text-sm font-medium">
        {t("purpose")}
        <Input value={value.purpose ?? ""} onChange={(e) => onChange({ ...value, purpose: e.target.value || undefined })} className="mt-1" />
      </label>
      <label className="block text-sm font-medium">
        {t("steps")}
        <Textarea
          value={(value.steps ?? []).join("\n")}
          onChange={(e) => onChange({ ...value, steps: e.target.value ? e.target.value.split("\n") : undefined })}
          placeholder={t("stepsHint")}
          rows={4}
          className="mt-1"
        />
      </label>
        </div>
      </details>
    </div>
  );
}
