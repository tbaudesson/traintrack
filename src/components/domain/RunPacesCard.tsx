"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Gauge, Pencil } from "lucide-react";
import { updateTrainingSchedule } from "@/hooks/useAthleteProfile";
import { useRunVma } from "@/hooks/useRunVma";
import { localDate } from "@/lib/dates";
import { useFormat } from "@/lib/format";
import { formatPace, PACE_ZONES, parseTime, vmaFromRace, zonePaces } from "@/lib/runPaces";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const RACES = [5000, 10000, 21097, 42195];

/**
 * The athlete's paces: the VMA and, from it, the pace of each kind of
 * effort. Set from a recent race, or typed in; the half-Cooper test sets it
 * too.
 */
export function RunPacesCard() {
  const t = useTranslations("running");
  const { day, num } = useFormat();
  const { vma, paces, guessed } = useRunVma();
  const [editing, setEditing] = useState(false);
  const [mode, setMode] = useState<"race" | "vma">("race");
  const [distance, setDistance] = useState(10000);
  const [time, setTime] = useState("");
  const [typed, setTyped] = useState("");
  const timeSec = parseTime(time);
  const fromRace = timeSec ? vmaFromRace(distance, timeSec) : null;
  const typedVma = Number(typed.replace(",", "."));
  const manual = typedVma >= 8 && typedVma <= 26 ? Math.round(typedVma * 10) / 10 : null;
  const result = mode === "race" ? fromRace : manual;

  async function save() {
    if (!result) return;
    await updateTrainingSchedule({
      runPaces:
        mode === "race"
          ? { vma: result, source: "race", date: localDate(), distanceM: distance, timeSec: timeSec! }
          : { vma: result, source: "manual", date: localDate() },
    });
    setEditing(false);
  }

  return (
    <section className="t-surface space-y-3 rounded-2xl p-4 ring-1 ring-foreground/5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <Gauge className="h-5 w-5 text-accent-text" aria-hidden="true" />
            {t("pacesTitle")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {vma == null
              ? t("pacesNotLoaded")
              : guessed
              ? t("guessed", { vma: num(vma) })
              : paces?.source === "race"
                ? t("fromRace", { vma: num(vma), date: day(paces.date) })
                : paces?.source === "test"
                  ? t("fromTest", { vma: num(vma), date: day(paces!.date) })
                  : t("typed", { vma: num(vma) })}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
          <Pencil className="mr-1 h-4 w-4" aria-hidden="true" />
          {guessed ? t("set") : t("change")}
        </Button>
      </div>
      <dl className={cn("grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm", guessed && "[&>div]:border [&>div]:border-dashed [&>div]:border-border")}>
        {vma != null && PACE_ZONES.map((zone) => {
          const [slow, fast] = zonePaces(vma, zone);
          return (
            <div key={zone} className="flex flex-col gap-0.5 rounded-lg bg-muted/60 px-2.5 py-1.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-2">
              <dt className="text-xs text-muted-foreground sm:text-sm">{t(`zone_${zone}`)}</dt>
              <dd className="font-semibold tabular-nums">
                {formatPace(slow)}–{formatPace(fast)}
              </dd>
            </div>
          );
        })}
      </dl>
      <p className="text-xs text-muted-foreground">{t("perKm")}</p>

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("pacesTitle")}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-2" role="group" aria-label={t("how")}>
            {(["race", "vma"] as const).map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={mode === m}
                onClick={() => setMode(m)}
                className={cn("min-h-11 rounded-xl text-sm font-semibold", mode === m ? "bg-accent-600 text-white" : "bg-muted")}
              >
                {t(m === "race" ? "byRace" : "byVma")}
              </button>
            ))}
          </div>
          {mode === "race" ? (
            <div className="space-y-3">
              <fieldset>
                <legend className="mb-1.5 text-sm font-medium">{t("race")}</legend>
                <div className="grid grid-cols-4 gap-1.5">
                  {RACES.map((d) => (
                    <button
                      key={d}
                      type="button"
                      aria-pressed={distance === d}
                      onClick={() => setDistance(d)}
                      className={cn("min-h-10 rounded-lg text-sm font-medium", distance === d ? "bg-accent-500/20 text-accent-text ring-1 ring-accent-500" : "bg-muted")}
                    >
                      {t(`race_${d}`)}
                    </button>
                  ))}
                </div>
              </fieldset>
              <label className="block space-y-1 text-sm font-medium">
                <span>{t("time")}</span>
                <Input value={time} onChange={(e) => setTime(e.target.value)} placeholder={distance >= 21097 ? "1:45:00" : "48:30"} inputMode="numeric" />
              </label>
              <p className="text-xs text-muted-foreground">{t("raceHint")}</p>
            </div>
          ) : (
            <label className="block space-y-1 text-sm font-medium">
              <span>{t("vmaLabel")}</span>
              <Input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="14,5" inputMode="decimal" />
            </label>
          )}
          <p className="min-h-5 text-sm font-semibold text-accent-text" aria-live="polite">
            {result ? t("result", { vma: num(result) }) : (mode === "race" ? time : typed) ? t("unreadable") : ""}
          </p>
          <Button className="w-full" onClick={save} disabled={!result}>
            {t("save")}
          </Button>
        </DialogContent>
      </Dialog>
    </section>
  );
}
