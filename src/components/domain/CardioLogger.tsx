"use client";

import { useState } from "react";
import { SwimTechniqueChips } from "@/components/domain/SwimTechniqueSheet";
import { useTranslations } from "next-intl";
import { Footprints, Gauge, Info, Play, Target, Upload } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useRunVma } from "@/hooks/useRunVma";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { formatPace as formatKmPace, HR_ZONE_SHARE, hrZoneOf, paceAt } from "@/lib/runPaces";
import { planRunBlocks } from "@/lib/runWorkouts";
import { RunGuide } from "@/components/domain/RunGuide";
import { GpxImport } from "@/components/domain/GpxImport";
import type { CardioTarget, Workout } from "@/db";
import { updateWorkout } from "@/hooks/useWorkouts";
import { useDebouncedSave } from "@/hooks/useDebouncedSave";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { describeTarget, formatPace, hasDistance } from "@/lib/cardio";
import { unlockAudio } from "@/lib/beep";
import { Button } from "@/components/ui/button";
import { IntervalPlayer, type IntervalResult, type PlayerStep } from "@/components/domain/IntervalPlayer";

/** Log an endurance session: what was planned, then distance and time. */
export function CardioLogger({ workout, target }: { workout: Workout; target?: CardioTarget }) {
  const t = useTranslations("cardio");
  const swim = workout.sport === "swim";
  // Vaulting is timed only: no distance, no pace, no GPS track, no heart-rate zones.
  const measured = hasDistance(workout.sport);
  const [distance, setDistance] = useState(
    workout.distanceM ? String(swim ? workout.distanceM : workout.distanceM / 1000) : ""
  );
  const [minutes, setMinutes] = useState(workout.durationSec ? String(Math.floor(workout.durationSec / 60)) : "");
  const [seconds, setSeconds] = useState(workout.durationSec ? String(workout.durationSec % 60) : "");

  const distanceM = (Number(distance.replace(",", ".")) || 0) * (swim ? 1 : 1000);
  const durationSec = (Number(minutes) || 0) * 60 + (Number(seconds) || 0);
  const pace = formatPace(workout.sport, distanceM, durationSec);

  const steps = (target?.steps ?? []).filter((step) => step.trim());

  // A run: the pace of each zone, from the athlete's VMA.
  const tr = useTranslations("running");
  const { vma, guessed } = useRunVma();
  const run = workout.sport === "run";
  // Personal paces and the run guide come with the running feature.
  const { hasFeature } = useFeatureAccess();
  const paces = run && hasFeature("running");
  const zonePace = (zone: number) => {
    const [slow, fast] = HR_ZONE_SHARE[zone];
    return tr("paceRange", { from: formatKmPace(paceAt(vma, slow)), to: formatKmPace(paceAt(vma, fast)) });
  };
  const plannedZone = run ? hrZoneOf(target?.intensity) : null;
  // A plan's run with repeats: played with the guide, at the athlete's paces.
  const runBlocks = target && paces ? planRunBlocks(target) : null;
  const [running, setRunning] = useState(false);

  const save = () => updateWorkout(workout.id!, { distanceM: distanceM || undefined, durationSec: durationSec || undefined });
  // Saved as it is typed (on the device), and at once when a field is left.
  const { schedule, flush } = useDebouncedSave<null>(() => save());

  // An indoor-cycling session played block by block; its time fills the log.
  const ts = useTranslations("spinning");
  const [guided, setGuided] = useState(false);
  const blocks = target?.blocks ?? [];
  const guidedSteps: PlayerStep[] = blocks.map((b) => ({
    type: "work",
    exercise: { name: ts("resistance", { level: b.resistance }), cue: ts("rpm", { from: b.rpm[0], to: b.rpm[1] }) },
    seconds: b.sec,
    phase: ts(`kind_${b.kind}`),
    easy: b.kind === "warmup" || b.kind === "recovery" || b.kind === "cooldown",
  }));
  function endGuided({ elapsedSec }: IntervalResult) {
    setGuided(false);
    if (elapsedSec < 60) return;
    setMinutes(String(Math.floor(elapsedSec / 60)));
    setSeconds(String(elapsedSec % 60));
    updateWorkout(workout.id!, { durationSec: elapsedSec });
  }

  return (
    <>
      {target && (
        <Card>
          <CardContent className="space-y-1 py-3">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-accent-text">
              <Target className="h-4 w-4 shrink-0" aria-hidden="true" />
              {t("planned", { target: describeTarget(target) })}
            </p>
            {plannedZone && (
              <p className="text-sm font-medium">
                {tr("planPace", { pace: zonePace(plannedZone) })}
                {guessed && <span className="text-muted-foreground"> · {tr("guessedShort")}</span>}
              </p>
            )}
            {target.purpose && <p className="text-sm text-muted-foreground">{target.purpose}</p>}
            {steps.length > 0 && (
              <ol className="mt-2 space-y-1.5">
                {steps.map((step, i) => (
                  <li key={i} className="flex gap-2.5 text-sm">
                    <span className="t-well flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-accent-text">
                      {i + 1}
                    </span>
                    <span className="pt-0.5">{step}</span>
                  </li>
                ))}
              </ol>
            )}
            {target.notes && <p className="pt-1 text-sm text-muted-foreground">{target.notes}</p>}
            {target.techniques?.length ? <SwimTechniqueChips keys={target.techniques} /> : null}
            {runBlocks && (
              <Button
                className="mt-2 h-12 w-full rounded-full"
                onClick={() => {
                  unlockAudio();
                  setRunning(true);
                }}
              >
                <Play className="mr-1 h-5 w-5" aria-hidden="true" />
                {tr("guided")}
              </Button>
            )}
            {blocks.length > 0 && (
              <Button
                className="mt-2 h-12 w-full rounded-full"
                onClick={() => {
                  unlockAudio();
                  setGuided(true);
                }}
              >
                <Play className="mr-1 h-5 w-5" aria-hidden="true" />
                {ts("start", { count: blocks.length })}
              </Button>
            )}
            {measured && <details className="pt-1">
              <summary className="flex min-h-10 cursor-pointer items-center gap-1.5 text-sm font-medium text-accent-text">
                <Info className="h-4 w-4 shrink-0" aria-hidden="true" />
                {t("zoneGuide")}
              </summary>
              <dl className="space-y-1 pb-1 text-sm">
                {[1, 2, 3, 4, 5].map((zone) => (
                  <div key={zone} className="flex gap-2">
                    <dt className="w-16 shrink-0 font-semibold">{t("zone", { zone })}</dt>
                    <dd className="text-muted-foreground">
                      {t(`zone${zone}`)}
                      {paces && <span className="block font-medium text-foreground tabular-nums">{zonePace(zone)}</span>}
                    </dd>
                  </div>
                ))}
              </dl>
            </details>}
            {paces && (
              <Link href="/running" className="flex min-h-10 items-center gap-1.5 text-sm font-medium text-accent-text">
                <Footprints className="h-4 w-4 shrink-0" aria-hidden="true" />
                {guessed ? tr("setPacesLink") : tr("pacesLink")}
              </Link>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="space-y-3 py-4">
          <h3 className="font-semibold">{workout.sport ? t(`sport_${workout.sport}`) : ""}</h3>
          {measured && (
            <label className="block text-sm font-medium">
              {swim ? t("distanceM") : t("distanceKm")}
              <Input type="text" inputMode="decimal" value={distance} onChange={(e) => { setDistance(e.target.value); schedule(null); }} onBlur={() => { schedule(null); flush(); }} className="mt-1" />
            </label>
          )}
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm font-medium">
              {t("minutes")}
              <Input type="number" inputMode="numeric" min={0} value={minutes} onChange={(e) => { setMinutes(e.target.value); schedule(null); }} onBlur={() => { schedule(null); flush(); }} className="mt-1" />
            </label>
            <label className="block text-sm font-medium">
              {t("seconds")}
              <Input type="number" inputMode="numeric" min={0} max={59} value={seconds} onChange={(e) => { setSeconds(e.target.value); schedule(null); }} onBlur={() => { schedule(null); flush(); }} className="mt-1" />
            </label>
          </div>
          {measured && <GpxImport
            workout={workout}
            onImported={({ activity }) => {
              setDistance(String(swim ? activity.distanceM : Math.round(activity.distanceM / 10) / 100));
              setMinutes(String(Math.floor(activity.durationSec / 60)));
              setSeconds(String(activity.durationSec % 60));
            }}
            trigger={(open) => (
              <button
                type="button"
                onClick={open}
                className="flex min-h-10 w-full items-center justify-center gap-1.5 text-sm font-medium text-accent-text"
              >
                <Upload className="h-4 w-4" aria-hidden="true" />
                {t("importGpxFill")}
              </button>
            )}
          />}
          {pace && (
            <p className="flex items-center gap-1.5 text-sm font-medium">
              <Gauge className="h-4 w-4 shrink-0 text-accent-text" aria-hidden="true" />
              {t("pace", { pace })}
            </p>
          )}
        </CardContent>
      </Card>
      {running && runBlocks && (
        <RunGuide
          blocks={runBlocks}
          onEnd={({ elapsedSec, distanceM: covered }) => {
            setRunning(false);
            if (elapsedSec < 60) return;
            setMinutes(String(Math.floor(elapsedSec / 60)));
            setSeconds(String(elapsedSec % 60));
            setDistance(String(Math.round(covered / 10) / 100));
            updateWorkout(workout.id!, { durationSec: elapsedSec, distanceM: covered });
          }}
        />
      )}
      {guided && (
        <IntervalPlayer
          session={{ steps: guidedSteps }}
          onEnd={endGuided}
          labels={{ work: ts("block"), rest: ts("block"), counter: (n, total) => ts("counter", { n, total }) }}
        />
      )}
    </>
  );
}
