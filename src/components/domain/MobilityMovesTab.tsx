"use client";

import { groupLabel } from "@/lib/muscles";
import { useMuscleGroups } from "@/hooks/useMuscleGroups";
import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Check, Loader2, PersonStanding, Plus, Trash2 } from "lucide-react";
import type { MuscleGroup } from "@/db";
import { getAppSettings, setAppSetting } from "@/lib/adminService";
import { MOBILITY_KEY, MOBILITY_TARGETS, modesOf, parseMobility, type MobilityExercise, type MobilityGuidance } from "@/lib/mobility";
import { INJURY_GUIDANCE_KEY, parseInjuryGuidance } from "@/lib/injuryGuidance";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NumberInput, NumbersInput } from "@/components/domain/NumbersInput";

const LANGS = ["fr", "en", "de"] as const;
const empty = { fr: "", en: "", de: "" };

function MuscleChecks({ value, onChange, label }: { value: MuscleGroup[]; onChange: (m: MuscleGroup[]) => void; label: string }) {
  const locale = useLocale();
  const groups = useMuscleGroups();
  const groupIds = (groups ?? []).map((g) => g.id);
  const gl = (id: string | null | undefined) => groupLabel(groups, id, locale);
  return (
    <fieldset className="space-y-1">
      <legend className="text-xs text-muted-foreground">{label}</legend>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {groupIds.map((m) => (
          <label key={m} className="flex items-center gap-1.5 text-xs">
            <input type="checkbox" className="size-4 accent-accent-600" checked={value.includes(m)} onChange={(e) => onChange(e.target.checked ? [...value, m] : value.filter((x) => x !== m))} />
            {gl(m)}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/**
 * The warm-ups and stretches, as the app reads them (app settings): the
 * lengths offered, how long each move is held, the muscles of each target,
 * and the moves themselves in three languages with their demo. Saved only
 * when whole, and never without a move the injury references point to.
 */
export function MobilityMovesTab() {
  const t = useTranslations("mobilityAdmin");
  const tm = useTranslations("mobility");
  const ts = useTranslations("sync");
  const [g, setG] = useState<MobilityGuidance | null>(null);
  const [injuryText, setInjuryText] = useState<string | undefined>();
  const [state, setState] = useState<"loading" | "missing" | "failed" | "ready">("loading");
  const [error, setError] = useState<"invalid" | "usedByInjuries" | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getAppSettings()
      .then((s) => {
        const parsed = parseMobility(s[MOBILITY_KEY]);
        setG(parsed);
        setInjuryText(s[INJURY_GUIDANCE_KEY]);
        setState(parsed ? "ready" : "missing");
      })
      .catch(() => setState("failed"));
  }, []);

  if (state === "loading") return <Loader2 className="mx-auto my-8 h-6 w-6 animate-spin text-muted-foreground" />;
  if (state === "failed") return <p role="status" className="py-6 text-center text-sm text-muted-foreground">{ts("offline")}</p>;
  if (state === "missing" || !g) return <p role="status" className="py-6 text-center text-sm text-muted-foreground">{t("missing")}</p>;

  const put = (next: MobilityGuidance) => {
    setG(next);
    setError(null);
    setSaved(false);
  };
  const setMove = (i: number, m: MobilityExercise) => put({ ...g, moves: g.moves.map((x, j) => (j === i ? m : x)) });

  async function save() {
    if (!g) return;
    const text = JSON.stringify(g);
    if (!parseMobility(text)) return setError("invalid");
    // The injury references name gentle moves: none of them may go.
    if (injuryText && !parseInjuryGuidance(injuryText, g.moves.map((m) => m.key))) return setError("usedByInjuries");
    await setAppSetting(MOBILITY_KEY, text);
    setSaved(true);
  }

  return (
    <Card>
      <CardContent className="space-y-4 py-4">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold">
            <PersonStanding className="h-4 w-4 text-accent-500" aria-hidden="true" /> {t("title")}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{t("intro")}</p>
        </div>

        {modesOf(g).map((mode) => (
          <div key={mode} className="space-y-2 rounded-xl border border-border p-3">
            <p className="text-sm font-medium">{tm(`${mode}Title`)}</p>
            <NumbersInput label={t("minutes")} value={g.minutes[mode]} onChange={(v) => put({ ...g, minutes: { ...g.minutes, [mode]: v } })} />
            <div className="grid grid-cols-3 gap-2">
              {(["hold", "sideHold", "transition"] as const).map((k) => (
                <NumberInput key={k} label={t(k)} value={g.timing[mode][k]} onChange={(n) => put({ ...g, timing: { ...g.timing, [mode]: { ...g.timing[mode], [k]: n } } })} />
              ))}
            </div>
          </div>
        ))}

        <div className="space-y-3 rounded-xl border border-border p-3">
          <p className="text-sm font-medium">{t("targets")}</p>
          {MOBILITY_TARGETS.map((target) => (
            <MuscleChecks key={target} label={tm(`target_${target}`)} value={g.targets[target]} onChange={(m) => put({ ...g, targets: { ...g.targets, [target]: m } })} />
          ))}
        </div>

        <p className="text-sm font-medium">{t("moves", { count: g.moves.length })}</p>
        {g.moves.map((m, i) => (
          <details key={i} className="rounded-xl border border-border p-3">
            <summary className="cursor-pointer text-sm font-medium">
              {m.name.fr || m.key || t("untitled")} <span className="text-xs text-muted-foreground">· {tm(`mode_${m.mode}`)}</span>
            </summary>
            <div className="mt-3 space-y-2">
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="space-y-1 text-xs text-muted-foreground">
                  <span>{t("key")}</span>
                  <Input value={m.key} onChange={(e) => setMove(i, { ...m, key: e.target.value.toLowerCase() })} className="h-9" />
                </label>
                <label className="space-y-1 text-xs text-muted-foreground">
                  <span>{tm("mode")}</span>
                  <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm text-foreground" value={m.mode} onChange={(e) => setMove(i, { ...m, mode: e.target.value as MobilityExercise["mode"] })}>
                    {modesOf(g).map((x) => (
                      <option key={x} value={x}>{tm(`mode_${x}`)}</option>
                    ))}
                  </select>
                </label>
              </div>
              <MuscleChecks label={t("muscles")} value={m.muscles} onChange={(muscles) => setMove(i, { ...m, muscles })} />
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" className="size-4 accent-accent-600" checked={!!m.sides} onChange={(e) => setMove(i, { ...m, sides: e.target.checked || undefined })} />
                {t("sides")}
              </label>
              {LANGS.map((l) => (
                <div key={l} className="space-y-1.5">
                  <Input aria-label={`${t("name")} (${l})`} placeholder={`${t("name")} (${l})`} value={m.name[l]} onChange={(e) => setMove(i, { ...m, name: { ...m.name, [l]: e.target.value } })} className="h-9" />
                  <textarea aria-label={`${t("cue")} (${l})`} placeholder={`${t("cue")} (${l})`} value={m.cue[l]} onChange={(e) => setMove(i, { ...m, cue: { ...m.cue, [l]: e.target.value } })} rows={2} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                </div>
              ))}
              <Input aria-label={t("video")} placeholder={t("video")} value={m.video ?? ""} onChange={(e) => setMove(i, { ...m, video: e.target.value.trim() || null })} className="h-9" />
              <div className="flex flex-wrap gap-2">
                <Button variant="ghost" size="sm" disabled={i === 0} onClick={() => put({ ...g, moves: g.moves.map((x, j) => (j === i - 1 ? m : j === i ? g.moves[i - 1] : x)) })}>
                  {t("up")}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => put({ ...g, moves: g.moves.filter((_, j) => j !== i) })}>
                  <Trash2 className="mr-1 h-4 w-4" aria-hidden="true" />
                  {t("remove")}
                </Button>
              </div>
            </div>
          </details>
        ))}

        <Button
          variant="outline"
          className="w-full"
          onClick={() => put({ ...g, moves: [...g.moves, { key: `move-${Date.now().toString(36)}`, mode: "stretch", muscles: [], name: { ...empty }, cue: { ...empty }, video: null }] })}
        >
          <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
          {t("add")}
        </Button>
        {error && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{t(error)}</p>}
        <Button onClick={save} className="w-full">
          {saved ? <><Check className="mr-1 h-4 w-4" aria-hidden="true" />{t("saved")}</> : t("save")}
        </Button>
      </CardContent>
    </Card>
  );
}
