"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Gauge, Info, Target, Upload } from "lucide-react";
import { GpxImport } from "@/components/domain/GpxImport";
import type { CardioTarget, Workout } from "@/db";
import { updateWorkout } from "@/hooks/useWorkouts";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { describeTarget, formatPace, hasDistance } from "@/lib/cardio";

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

  const save = () => updateWorkout(workout.id!, { distanceM: distanceM || undefined, durationSec: durationSec || undefined });

  return (
    <>
      {target && (
        <Card>
          <CardContent className="space-y-1 py-3">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-accent-text">
              <Target className="h-4 w-4 shrink-0" aria-hidden="true" />
              {t("planned", { target: describeTarget(target) })}
            </p>
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
            {measured && <details className="pt-1">
              <summary className="flex min-h-10 cursor-pointer items-center gap-1.5 text-sm font-medium text-accent-text">
                <Info className="h-4 w-4 shrink-0" aria-hidden="true" />
                {t("zoneGuide")}
              </summary>
              <dl className="space-y-1 pb-1 text-sm">
                {[1, 2, 3, 4, 5].map((zone) => (
                  <div key={zone} className="flex gap-2">
                    <dt className="w-16 shrink-0 font-semibold">{t("zone", { zone })}</dt>
                    <dd className="text-muted-foreground">{t(`zone${zone}`)}</dd>
                  </div>
                ))}
              </dl>
            </details>}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="space-y-3 py-4">
          <h3 className="font-semibold">{workout.sport ? t(`sport_${workout.sport}`) : ""}</h3>
          {measured && (
            <label className="block text-sm font-medium">
              {swim ? t("distanceM") : t("distanceKm")}
              <Input type="text" inputMode="decimal" value={distance} onChange={(e) => setDistance(e.target.value)} onBlur={save} className="mt-1" />
            </label>
          )}
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm font-medium">
              {t("minutes")}
              <Input type="number" inputMode="numeric" min={0} value={minutes} onChange={(e) => setMinutes(e.target.value)} onBlur={save} className="mt-1" />
            </label>
            <label className="block text-sm font-medium">
              {t("seconds")}
              <Input type="number" inputMode="numeric" min={0} max={59} value={seconds} onChange={(e) => setSeconds(e.target.value)} onBlur={save} className="mt-1" />
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
    </>
  );
}
