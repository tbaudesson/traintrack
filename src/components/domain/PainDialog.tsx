"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Bandage, Loader2 } from "lucide-react";
import { addWorkoutNote } from "@/hooks/useWorkoutNotes";
import { PAIN_AREAS, SEVERE_PAIN, type PainArea } from "@/lib/pain";
import type { Injury } from "@/lib/injuries";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

/**
 * Report a pain on an exercise: where and how much. It is saved as a note on
 * the session, which the coach reads, and can lead straight to a replacement.
 */
export function PainDialog({
  open,
  onOpenChange,
  workoutId,
  exercise,
  authorName,
  onReplace,
  injuries,
  onDeclareInjury,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workoutId: number;
  exercise: { name: string; label?: string; uuid?: string };
  authorName?: string;
  onReplace: () => void;
  /** The athlete's injuries, when they can declare one from here (their own session). */
  injuries?: Injury[];
  onDeclareInjury?: (area: PainArea) => void;
}) {
  const t = useTranslations("pain");
  const [area, setArea] = useState<PainArea | null>(null);
  const [level, setLevel] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [declare, setDeclare] = useState(true);
  const tinj = useTranslations("injuries");
  const locale = useLocale();
  // A strong pain on an area not declared yet: offer to declare it as an injury.
  const canDeclare =
    !!onDeclareInjury && !!injuries && !!area && area !== "other" && level !== null && level >= SEVERE_PAIN && !injuries.some((i) => i.area === area);

  async function save(replace: boolean) {
    if (!area || !level) return;
    setSaving(true);
    try {
      await addWorkoutNote(workoutId, note.trim(), authorName, {
        exerciseUuid: exercise.uuid,
        exerciseName: exercise.name,
        painArea: area,
        painLevel: level,
      });
      if (canDeclare && declare) onDeclareInjury!(area);
      setArea(null);
      setLevel(null);
      setNote("");
      onOpenChange(false);
      if (replace) onReplace();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bandage className="h-5 w-5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
            {t("title", { name: exercise.label ?? exercise.name })}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">{t("where")}</legend>
            <div className="flex flex-wrap gap-2">
              {PAIN_AREAS.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setArea(a)}
                  aria-pressed={area === a}
                  className={cn(
                    "min-h-10 rounded-full border px-3 text-sm",
                    area === a ? "border-accent-500 bg-accent-500 text-white" : "border-border text-muted-foreground"
                  )}
                >
                  {t(`area_${a}`)}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">{t("howMuch")}</legend>
            <div className="grid grid-cols-10 gap-1">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setLevel(n)}
                  aria-pressed={level === n}
                  className={cn(
                    "h-10 rounded-md border text-sm font-semibold tabular-nums",
                    level === n
                      ? n >= SEVERE_PAIN ? "border-rose-500 bg-rose-500 text-white" : "border-amber-500 bg-amber-500 text-white"
                      : "border-border text-muted-foreground"
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
            <p className="flex justify-between text-xs text-muted-foreground">
              <span>{t("mild")}</span>
              <span>{t("severe")}</span>
            </p>
          </fieldset>

          {level !== null && level >= SEVERE_PAIN && (
            <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">{t("severeAdvice")}</p>
          )}

          {canDeclare && (
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" checked={declare} onChange={(e) => setDeclare(e.target.checked)} className="mt-0.5 size-4 accent-rose-600" />
              <span>{tinj("declareFromPain", { area: locale === "de" ? t(`area_${area}`) : t(`area_${area}`).toLowerCase() })}</span>
            </label>
          )}

          <label className="block text-sm font-medium">
            {t("note")}
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder={t("notePlaceholder")} className="mt-1" />
          </label>

          <div className="grid gap-2">
            <Button onClick={() => save(true)} disabled={!area || !level || saving}>
              {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" aria-hidden="true" />}
              {t("saveReplace")}
            </Button>
            <Button variant="outline" onClick={() => save(false)} disabled={!area || !level || saving}>
              {t("save")}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">{t("disclaimer")}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
