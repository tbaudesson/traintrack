"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Gauge, Target } from "lucide-react";
import type { CardioTarget, Workout } from "@/db";
import { updateWorkout } from "@/hooks/useWorkouts";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { describeTarget, formatPace } from "@/lib/cardio";

/** Log an endurance session: what was planned, then distance and time. */
export function CardioLogger({ workout, target }: { workout: Workout; target?: CardioTarget }) {
  const t = useTranslations("cardio");
  const swim = workout.sport === "swim";
  const [distance, setDistance] = useState(
    workout.distanceM ? String(swim ? workout.distanceM : workout.distanceM / 1000) : ""
  );
  const [minutes, setMinutes] = useState(workout.durationSec ? String(Math.floor(workout.durationSec / 60)) : "");
  const [seconds, setSeconds] = useState(workout.durationSec ? String(workout.durationSec % 60) : "");

  const distanceM = (Number(distance.replace(",", ".")) || 0) * (swim ? 1 : 1000);
  const durationSec = (Number(minutes) || 0) * 60 + (Number(seconds) || 0);
  const pace = formatPace(workout.sport, distanceM, durationSec);

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
            {target.notes && <p className="text-sm text-muted-foreground">{target.notes}</p>}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="space-y-3 py-4">
          <h3 className="font-semibold">{workout.sport ? t(`sport_${workout.sport}`) : ""}</h3>
          <label className="block text-sm font-medium">
            {swim ? t("distanceM") : t("distanceKm")}
            <Input type="text" inputMode="decimal" value={distance} onChange={(e) => setDistance(e.target.value)} onBlur={save} className="mt-1" />
          </label>
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
