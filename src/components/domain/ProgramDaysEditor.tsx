"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import { useTranslations } from "next-intl";
import { useExercises } from "@/hooks/useExercises";
import type { CardioTarget, ProgramDay, ProgramExercise, Sport } from "@/db";
import { SPORTS } from "@/lib/cardio";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, Dumbbell, X } from "lucide-react";

/** The days and exercises of a program, for users' programs and admin templates alike. */
export function ProgramDaysEditor({
  days,
  setDays,
}: {
  days: ProgramDay[];
  setDays: Dispatch<SetStateAction<ProgramDay[]>>;
}) {
  const t = useTranslations("programs");
  const tc = useTranslations("cardio");
  const exercises = useExercises();
  const [pickerDay, setPickerDay] = useState<number | null>(null);

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
                  onChange={(e) => updateDay(di, { ...day, name: e.target.value })}
                  className="flex-1 font-semibold"
                />
                <button onClick={() => removeDay(di)} className="rounded-md p-2 text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
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

              {!day.cardio && day.exercises.map((ex, ei) => (
                <div key={ei} className="rounded-lg border border-border p-2">
                  <div className="mb-2 flex items-center gap-2">
                    <Dumbbell className="h-4 w-4 text-accent-500" />
                    <span className="flex-1 text-sm font-medium">{ex.exerciseName}</span>
                    <button onClick={() => removeExercise(di, ei)} className="text-muted-foreground hover:text-destructive">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <label className="text-xs text-muted-foreground">
                      {t("sets")}
                      <Input
                        type="number"
                        value={ex.targetSets}
                        onChange={(e) => updateExercise(di, ei, { targetSets: Number(e.target.value) })}
                        className="mt-0.5 h-10"
                      />
                    </label>
                    <label className="text-xs text-muted-foreground">
                      {t("reps")}
                      <Input
                        value={ex.targetReps}
                        onChange={(e) => updateExercise(di, ei, { targetReps: e.target.value })}
                        className="mt-0.5 h-10"
                      />
                    </label>
                    <label className="text-xs text-muted-foreground">
                      {t("rest")}
                      <Input
                        type="number"
                        value={ex.restSec ?? ""}
                        onChange={(e) => updateExercise(di, ei, { restSec: Number(e.target.value) })}
                        className="mt-0.5 h-10"
                      />
                    </label>
                  </div>
                </div>
              ))}

              {!day.cardio && (
                <Button variant="ghost" size="sm" className="w-full" onClick={() => setPickerDay(di)}>
                  <Plus className="mr-1 h-4 w-4" />
                  {t("addExercise")}
                </Button>
              )}
            </CardContent>
          </Card>
        ))}

        <Button variant="outline" className="w-full" onClick={addDay}>
          <Plus className="mr-1 h-4 w-4" />
          {t("addDay")}
        </Button>

      {/* Exercise picker */}
      <Dialog open={pickerDay !== null} onOpenChange={(o) => !o && setPickerDay(null)}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("addExercise")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-1">
            {exercises.map((e) => (
              <button
                key={e.id}
                onClick={() => pickerDay !== null && addExerciseToDay(pickerDay, e.name, e.uuid)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-accent"
              >
                <Dumbbell className="h-4 w-4 text-accent-500" />
                {e.name}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function CardioDayFields({ value, onChange }: { value: CardioTarget; onChange: (next: CardioTarget) => void }) {
  const t = useTranslations("cardio");
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
  );
}
