"use client";

import { useEffect, useState } from "react";
import { injuryAreasOf } from "@/lib/references";
import { usePainAreaName, usePainAreas } from "@/hooks/useReferences";
import { useLocale, useTranslations } from "next-intl";
import { Bandage, Check, Loader2, Minus, Plus } from "lucide-react";
import { getAppSettings, setAppSetting } from "@/lib/adminService";
import { INJURY_GUIDANCE_KEY, parseInjuryGuidance, type InjuryGuidance } from "@/lib/injuryGuidance";
import { useMobilityGuidance } from "@/hooks/useMobilityGuidance";
import { AreaRulesEditor } from "@/components/domain/AreaRulesEditor";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";


/**
 * The injury references, as the app reads them (app settings): pain levels,
 * the return weeks, the alert for a pain coming back, and the gentle moves of
 * each area. Saved only when they hold together.
 */
export function InjuryGuidanceTab() {
  const t = useTranslations("injuryGuidance");
  const ts = useTranslations("sync");
  const areaName = usePainAreaName();
  const painAreas = usePainAreas();
  const locale = useLocale() as "fr" | "en" | "de";
  const [g, setG] = useState<InjuryGuidance | null>(null);
  // The moves the references may name: the warm-ups and stretches the admin keeps.
  const moves = useMobilityGuidance()?.moves ?? [];
  const MOVES = moves.map((e) => e.key);
  const [state, setState] = useState<"loading" | "missing" | "failed" | "ready">("loading");
  const [error, setError] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getAppSettings()
      .then((s) => {
        const parsed = parseInjuryGuidance(s[INJURY_GUIDANCE_KEY]);
        setG(parsed);
        setState(parsed ? "ready" : "missing");
      })
      .catch(() => setState("failed"));
  }, []);

  if (state === "loading") return <Loader2 className="mx-auto my-8 h-6 w-6 animate-spin text-muted-foreground" />;
  if (state === "failed") return <p role="status" className="py-6 text-center text-sm text-muted-foreground">{ts("offline")}</p>;
  if (state === "missing" || !g) return <p role="status" className="py-6 text-center text-sm text-muted-foreground">{t("missing")}</p>;

  const change = (next: InjuryGuidance) => {
    setG(next);
    setError(false);
    setSaved(false);
  };
  const n = (v: string) => (v.trim() === "" ? NaN : Number(v.replace(",", ".")));
  const field = (label: string, value: number, set: (v: number) => void, step = "1") => (
    <label className="block text-xs text-muted-foreground">
      {label}
      <Input type="number" inputMode="decimal" step={step} value={Number.isFinite(value) ? value : ""} onChange={(e) => set(n(e.target.value))} className="mt-0.5 h-9" />
    </label>
  );

  async function save() {
    const text = JSON.stringify(g);
    // The moves are checked against the warm-ups once those are loaded.
    if (!parseInjuryGuidance(text, MOVES.length ? MOVES : undefined)) {
      setError(true);
      return;
    }
    await setAppSetting(INJURY_GUIDANCE_KEY, text);
    setSaved(true);
  }

  return (
    <Card>
      <CardContent className="space-y-5 py-4">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Bandage className="h-4 w-4 text-accent-500" aria-hidden="true" /> {t("title")}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{t("intro")}</p>
        </div>

        <section className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <h3 className="col-span-full text-sm font-semibold">{t("painTitle")}</h3>
          {field(t("severe"), g.pain.severe, (v) => change({ ...g, pain: { ...g.pain, severe: v } }))}
          {field(t("moderate"), g.pain.moderate, (v) => change({ ...g, pain: { ...g.pain, moderate: v } }))}
          {field(t("moderateLoad"), g.pain.moderateLoad, (v) => change({ ...g, pain: { ...g.pain, moderateLoad: v } }), "0.05")}
          {field(t("recentDays"), g.pain.recentDays, (v) => change({ ...g, pain: { ...g.pain, recentDays: v } }))}
          {field(t("coachDays"), g.pain.coachDays, (v) => change({ ...g, pain: { ...g.pain, coachDays: v } }))}
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-semibold">{t("returnTitle")}</h3>
          <p className="text-xs text-muted-foreground">{t("returnHint")}</p>
          <div className="flex flex-wrap items-end gap-2">
            {g.return.loads.map((load, i) => (
              <div key={i} className="w-20">
                {field(t("week", { n: i + 1 }), load, (v) => change({ ...g, return: { ...g.return, loads: g.return.loads.map((l, j) => (j === i ? v : l)) } }), "0.05")}
              </div>
            ))}
            <Button variant="outline" size="icon" aria-label={t("removeWeek")} disabled={g.return.loads.length <= 1} onClick={() => change({ ...g, return: { ...g.return, loads: g.return.loads.slice(0, -1) } })}>
              <Minus className="h-4 w-4" aria-hidden="true" />
            </Button>
            <Button variant="outline" size="icon" aria-label={t("addWeek")} onClick={() => change({ ...g, return: { ...g.return, loads: [...g.return.loads, 1] } })}>
              <Plus className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {field(t("holdAbovePain"), g.return.holdAbovePain, (v) => change({ ...g, return: { ...g.return, holdAbovePain: v } }))}
            {field(t("holdDays"), g.return.holdDays, (v) => change({ ...g, return: { ...g.return, holdDays: v } }))}
          </div>
        </section>

        <section className="grid grid-cols-3 gap-2">
          <h3 className="col-span-full text-sm font-semibold">{t("persistentTitle")}</h3>
          {field(t("persistentReports"), g.persistent.reports, (v) => change({ ...g, persistent: { ...g.persistent, reports: v } }))}
          {field(t("persistentMinLevel"), g.persistent.minLevel, (v) => change({ ...g, persistent: { ...g.persistent, minLevel: v } }))}
          {field(t("persistentDays"), g.persistent.days, (v) => change({ ...g, persistent: { ...g.persistent, days: v } }))}
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold">{t("gentleTitle")}</h3>
          <p className="text-xs text-muted-foreground">{t("gentleHint")}</p>
          {injuryAreasOf(painAreas).map((area) => {
            const chosen = g.gentle[area] ?? [];
            return (
              <div key={area} className="space-y-1">
                <p className="text-sm font-medium">{areaName(area)}</p>
                <div className="flex flex-wrap gap-1.5">
                  {moves.filter((m) => g.mobility[m.key]?.[area] !== "avoid").map((m) => {
                    const on = chosen.includes(m.key);
                    return (
                      <button
                        key={m.key}
                        type="button"
                        aria-pressed={on}
                        onClick={() => change({ ...g, gentle: { ...g.gentle, [area]: on ? chosen.filter((k) => k !== m.key) : [...chosen, m.key] } })}
                        className={cn("min-h-9 rounded-full border px-3 text-xs", on ? "border-accent-600 bg-accent-600 text-white" : "border-border text-muted-foreground")}
                      >
                        {m.name[locale]}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-semibold">{t("mobilityTitle")}</h3>
          <p className="text-xs text-muted-foreground">{t("mobilityHint")}</p>
          {moves.map((m) => (
            <details key={m.key} className="rounded-lg border border-border p-2">
              <summary className="cursor-pointer text-sm">
                {m.name[locale]}
                <span className="ml-2 text-xs text-muted-foreground">
                  {Object.entries(g.mobility[m.key] ?? {}).map(([a, l]) => `${areaName(a)} ${l === "avoid" ? "✕" : "!"}`).join(" · ")}
                </span>
              </summary>
              <div className="pt-2">
                <AreaRulesEditor
                  value={g.mobility[m.key] ?? {}}
                  onChange={(next) => {
                    const mobility = { ...g.mobility };
                    if (Object.keys(next).length) mobility[m.key] = next;
                    else delete mobility[m.key];
                    change({ ...g, mobility });
                  }}
                />
              </div>
            </details>
          ))}
        </section>

        {error && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{t("invalid")}</p>}
        <Button onClick={save} className="w-full">
          {saved ? <><Check className="mr-1 h-4 w-4" aria-hidden="true" />{t("saved")}</> : t("save")}
        </Button>
      </CardContent>
    </Card>
  );
}
