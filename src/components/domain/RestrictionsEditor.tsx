"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus, X } from "lucide-react";
import type { Restriction } from "@/db";
import { updateTrainingSchedule, useAthleteProfileOrNull } from "@/hooks/useAthleteProfile";
import { useExercises } from "@/hooks/useExercises";
import { useAreaLabel } from "@/hooks/useAreaLabel";
import { MOVEMENTS } from "@/lib/movements";
import { MUSCLE_GROUPS } from "@/lib/muscles";
import { restrictionKey } from "@/lib/restrictions";
import { localDate } from "@/lib/dates";
import { useFormat } from "@/lib/format";
import { useExerciseLabel } from "@/lib/exerciseNames";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const SELECT = "mt-1 h-11 w-full rounded-lg border border-input bg-card px-3 text-base";

/**
 * What the athlete rules out besides an injured joint: a muscle group, a kind
 * of movement or an exercise, to avoid or to do with care, maybe until a date.
 */
export function RestrictionsEditor() {
  const t = useTranslations("restrictions");
  const te = useTranslations("exercises");
  const { short } = useFormat();
  const profile = useAthleteProfileOrNull();
  const exercises = useExercises();
  const xl = useExerciseLabel();
  const label = useAreaLabel();
  const [adding, setAdding] = useState(false);
  const [kind, setKind] = useState<Restriction["kind"]>("movement");
  const [value, setValue] = useState("");
  const [level, setLevel] = useState<Restriction["level"]>("avoid");
  const [until, setUntil] = useState("");
  if (!profile) return null;
  const list = profile.restrictions ?? [];
  const today = localDate();

  async function save() {
    if (!value) return;
    const next: Restriction = { kind, value, level, until: until || null };
    // One restriction per thing: a new one replaces the old.
    await updateTrainingSchedule({ restrictions: [...list.filter((r) => restrictionKey(r) !== restrictionKey(next)), next] });
    setAdding(false);
    setValue("");
    setUntil("");
  }

  const chip = (on: boolean) => cn("min-h-11 rounded-full border px-3 text-sm font-medium", on ? "border-accent-500 bg-accent-500 text-white" : "border-border hover:bg-muted");
  const library = exercises.filter((e) => !e.isCustom).sort((a, b) => xl(a.name).localeCompare(xl(b.name)));

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">{t("hint")}</p>
      {list.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
        <ul className="space-y-1.5">
          {list.map((r) => {
            const name = label(restrictionKey(r));
            const past = !!r.until && r.until < today;
            return (
              <li key={restrictionKey(r)} className={cn("flex items-center gap-2 rounded-lg bg-muted/50 py-1 pr-1 pl-3 text-sm", past && "opacity-60")}>
                <span className="min-w-0 flex-1">
                  <span className="font-medium">{name.charAt(0).toUpperCase() + name.slice(1)}</span>
                  <span className="text-muted-foreground"> · {t(`level_${r.level}`)}{r.until ? ` · ${t("untilShort", { date: short(r.until) })}` : ""}</span>
                </span>
                <button
                  type="button"
                  onClick={() => updateTrainingSchedule({ restrictions: list.filter((x) => restrictionKey(x) !== restrictionKey(r)) })}
                  aria-label={t("remove", { name })}
                  className="grid size-11 shrink-0 place-items-center text-muted-foreground hover:text-destructive"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <Button variant="outline" className="w-full" onClick={() => setAdding(true)}>
        <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
        {t("add")}
      </Button>

      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("add")}</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void save();
            }}
          >
            <fieldset>
              <legend className="mb-1.5 text-sm font-medium">{t("kind")}</legend>
              <div className="flex flex-wrap gap-2">
                {(["movement", "muscle", "exercise"] as const).map((k) => (
                  <button
                    key={k}
                    type="button"
                    aria-pressed={kind === k}
                    onClick={() => {
                      setKind(k);
                      setValue("");
                    }}
                    className={chip(kind === k)}
                  >
                    {t(`kind_${k}`)}
                  </button>
                ))}
              </div>
            </fieldset>
            {kind === "movement" && (
              <div className="flex flex-wrap gap-2">
                {MOVEMENTS.map((m) => (
                  <button key={m} type="button" aria-pressed={value === m} onClick={() => setValue(m)} className={chip(value === m)}>
                    {t(`movement_${m}`)}
                  </button>
                ))}
              </div>
            )}
            {kind === "muscle" && (
              <div className="flex flex-wrap gap-2">
                {MUSCLE_GROUPS.filter((g) => g !== "other").map((g) => (
                  <button key={g} type="button" aria-pressed={value === g} onClick={() => setValue(g)} className={chip(value === g)}>
                    {te(`mg_${g}`)}
                  </button>
                ))}
              </div>
            )}
            {kind === "exercise" && (
              <label className="block text-sm font-medium">
                {t("exercise")}
                <select value={value} onChange={(e) => setValue(e.target.value)} className={SELECT}>
                  <option value="">—</option>
                  {library.map((e) => <option key={e.id} value={e.uuid}>{xl(e.name)}</option>)}
                </select>
              </label>
            )}
            <fieldset>
              <legend className="mb-1.5 text-sm font-medium">{t("level")}</legend>
              <div className="flex flex-wrap gap-2">
                {(["avoid", "caution"] as const).map((l) => (
                  <button key={l} type="button" aria-pressed={level === l} onClick={() => setLevel(l)} className={chip(level === l)}>
                    {t(`level_${l}`)}
                  </button>
                ))}
              </div>
            </fieldset>
            <label className="block text-sm font-medium">
              {t("until")}
              <Input type="date" value={until} min={today} onChange={(e) => setUntil(e.target.value)} className="mt-1" />
            </label>
            <Button type="submit" className="w-full" disabled={!value}>
              {t("save")}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
