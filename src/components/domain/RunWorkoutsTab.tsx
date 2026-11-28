"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { RUN_LEVELS, RUN_WORKOUTS_KEY, expandSteps, parseRunWorkouts, runText, runTotals, timedBlocks, validSteps, type RunStep, type RunWorkout, type RunWorkoutsReference } from "@/lib/runWorkouts";
import { Frame, ListEditor, useSetting } from "@/components/domain/ReferenceTabs";
import { useFormat } from "@/lib/format";
import { formatDuration } from "@/lib/cardio";

const blank = { id: "", fr: "", en: "", de: "" };
const select = "h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground";
const area = "w-full rounded-md border border-input bg-background px-2 py-1.5 font-mono text-xs text-foreground";
/** The VMA the preview is worked out at (km/h). */
const PREVIEW_VMA = 15;

/**
 * The run sessions (app settings "run_workouts"): what they work, and each
 * session's name, description, focus and blocks at each level, as JSON
 * (a block: kind, zone, sec or meters; a repeat: repeat, of, between).
 * Saved only when whole.
 */
export function RunWorkoutsTab() {
  const t = useTranslations("runAdmin");
  const locale = useLocale();
  const s = useSetting<RunWorkoutsReference>(RUN_WORKOUTS_KEY, parseRunWorkouts);
  const v = s.value;
  const put = (change: Partial<RunWorkoutsReference>) => v && s.change({ ...v, ...change });
  const firstSteps: RunStep[] = [{ kind: "warmup", zone: "easy", sec: 900 }, { kind: "work", zone: "vma", meters: 400 }, { kind: "cooldown", zone: "recovery", sec: 600 }];
  return (
    <Frame
      state={s.state}
      title={t("title")}
      intro={t("intro")}
      missing={t("missing")}
      invalidText={t("invalid")}
      invalid={s.invalid}
      saving={s.saving}
      saved={s.saved}
      onSave={() => v && s.save(JSON.stringify(v, null, 2))}
    >
      {v && (
        <>
          <ListEditor title={t("focuses")} rows={v.focuses} blank={blank} onChange={(focuses) => put({ focuses })} />
          <ListEditor<RunWorkout>
            title={t("workouts", { count: v.workouts.length })}
            rows={v.workouts}
            blank={{ ...blank, description: { fr: "", en: "", de: "" }, focus: v.focuses[0]?.id ?? "", levels: { beginner: firstSteps, intermediate: firstSteps, advanced: firstSteps } }}
            onChange={(workouts) => put({ workouts })}
            extra={(w, set) => (
              <div className="space-y-2">
                {(["fr", "en", "de"] as const).map((l) => (
                  <label key={l} className="block space-y-1 text-xs">
                    <span className="font-medium">{t(`description_${l}`)}</span>
                    <textarea className={area} rows={2} value={w.description[l]} onChange={(e) => set({ description: { ...w.description, [l]: e.target.value } })} />
                  </label>
                ))}
                <div className="flex flex-wrap items-center gap-4">
                  <label className="flex items-center gap-2 text-xs">
                    <span className="font-medium">{t("focus")}</span>
                    <select className={select} value={w.focus} onChange={(e) => set({ focus: e.target.value })}>
                      {v.focuses.map((f) => (
                        <option key={f.id} value={f.id}>{runText(f, locale)}</option>
                      ))}
                    </select>
                  </label>
                  <label className="flex min-h-9 items-center gap-2 text-xs">
                    <input type="checkbox" className="size-4 accent-accent-600" checked={!!w.vmaTest} onChange={(e) => set({ vmaTest: e.target.checked || undefined })} />
                    {t("vmaTest")}
                  </label>
                </div>
                {RUN_LEVELS.map((level) => (
                  <LevelSteps key={level} label={t(`level_${level}`)} steps={w.levels[level]} onChange={(steps) => set({ levels: { ...w.levels, [level]: steps } })} />
                ))}
              </div>
            )}
          />
          <p className="text-xs text-muted-foreground">{t("stepsHint")}</p>
        </>
      )}
    </Frame>
  );
}

/** A level's blocks as JSON, taken once they hold together, with what they make at a VMA of 15 km/h. */
function LevelSteps({ label, steps, onChange }: { label: string; steps: RunStep[]; onChange: (steps: RunStep[]) => void }) {
  const t = useTranslations("runAdmin");
  const { num } = useFormat();
  const [draft, setDraft] = useState<string | null>(null);
  const text = draft ?? JSON.stringify(steps);
  let error = false;
  if (draft !== null) {
    try {
      error = !validSteps(JSON.parse(draft));
    } catch {
      error = true;
    }
  }
  const totals = validSteps(steps) ? runTotals(timedBlocks(expandSteps(steps), PREVIEW_VMA)) : null;
  return (
    <label className="block space-y-1 text-xs">
      <span className="font-medium">{label}</span>
      <textarea
        className={area}
        rows={3}
        value={text}
        aria-invalid={error}
        onChange={(e) => {
          setDraft(e.target.value);
          try {
            const next = JSON.parse(e.target.value);
            if (validSteps(next)) onChange(next);
          } catch {
            // Not whole yet: kept as typed, taken once it holds together.
          }
        }}
      />
      <span className={error ? "text-destructive" : "text-muted-foreground"}>
        {error
          ? t("stepsInvalid")
          : totals && t("preview", { efforts: totals.efforts, time: formatDuration(totals.sec), distance: num(Math.round(totals.meters / 100) / 10), vma: PREVIEW_VMA })}
      </span>
    </label>
  );
}
