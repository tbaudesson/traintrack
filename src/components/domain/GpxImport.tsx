"use client";

import { useId, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { useFormat } from "@/lib/format";
import { Loader2 } from "lucide-react";
import type { Sport, Workout } from "@/db";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { createWorkout, updateWorkout } from "@/hooks/useWorkouts";
import { DISTANCE_SPORTS, formatDistance, formatDuration, formatPace } from "@/lib/cardio";
import { localDate } from "@/lib/dates";
import { parseActivityFile, type GpxActivity } from "@/lib/gpx";
import { alreadyImported, fileHash } from "@/lib/provenance";
import db, { getCurrentUserIdSync } from "@/db";
import { Link } from "@/i18n/navigation";

const MAX_BYTES = 20 * 1024 * 1024;

/**
 * Bring in a run, ride or swim from a GPX file (Strava, Garmin, a watch). The
 * file is read on the phone and never sent anywhere. Without `workout` it
 * creates a new outing; with one, it fills that planned session.
 */
export function GpxImport({
  workout,
  existing = [],
  onImported,
  trigger,
}: {
  /** The planned session to fill, if any. */
  workout?: Workout;
  /** Outings already logged, to warn about importing one twice. */
  existing?: Pick<Workout, "date" | "sport" | "distanceM">[];
  onImported: (result: { workoutId: number; activity: GpxActivity }) => void;
  trigger: (open: () => void) => ReactNode;
}) {
  const t = useTranslations("cardio");
  const { day } = useFormat();
  const inputId = useId();
  const [activity, setActivity] = useState<GpxActivity | null>(null);
  const [sport, setSport] = useState<Sport>("run");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // The file's fingerprint, and the session it is already in, if any: importing it again is refused.
  const [hash, setHash] = useState<string | null>(null);
  const [already, setAlready] = useState<Pick<Workout, "id" | "date" | "title"> | null>(null);

  function pickFile() {
    document.getElementById(inputId)?.click();
  }

  async function read(file: File | undefined) {
    if (!file) return;
    setError(null);
    if (file.size > MAX_BYTES) {
      setError(t("gpxTooBig"));
      return;
    }
    const bytes = await file.arrayBuffer();
    // A FIT file is binary, read with Garmin's SDK, loaded only when one comes.
    const parsed = /\.fit$/i.test(file.name)
      ? (await import("@/lib/fit")).parseFit(new Uint8Array(bytes))
      : parseActivityFile(new TextDecoder().decode(bytes));
    if (!parsed) {
      setError(t("gpxError"));
      return;
    }
    const h = await fileHash(bytes);
    const uid = getCurrentUserIdSync();
    const mine = uid ? await db.workouts.where("userId").equals(uid).toArray() : await db.workouts.toArray();
    setHash(h);
    setAlready(alreadyImported(mine, { hash: h, sport: workout?.sport ?? parsed.sport, startedAt: parsed.start?.toISOString() }, workout?.id) ?? null);
    setSport(workout?.sport ?? parsed.sport ?? "run");
    setActivity(parsed);
  }

  const date = activity?.start ? localDate(activity.start) : localDate();
  const duplicate =
    !workout &&
    activity &&
    existing.some(
      (w) => w.date === date && w.sport === sport && w.distanceM && Math.abs(w.distanceM - activity.distanceM) <= activity.distanceM * 0.02
    );

  async function save() {
    if (!activity || already) return;
    setSaving(true);
    try {
      const details = {
        distanceM: activity.distanceM,
        durationSec: activity.durationSec || null,
        avgHr: activity.avgHr,
        maxHr: activity.maxHr,
        avgCadence: activity.avgCadence ?? null,
        avgPowerW: activity.avgPowerW ?? null,
        maxPowerW: activity.maxPowerW ?? null,
        normalizedPowerW: activity.normalizedPowerW ?? null,
        ...(activity.poolLengthM !== undefined ? { poolLengthM: activity.poolLengthM } : {}),
        ...(activity.swimStroke ? { swimStroke: activity.swimStroke } : {}),
        ...(activity.strokesPerLength ? { strokesPerLength: activity.strokesPerLength } : {}),
        elevationGainM: activity.elevationGainM > 0 ? activity.elevationGainM : null,
        source: "file" as const,
        fileHash: hash,
        startedAt: activity.start?.toISOString() ?? null,
      };
      const climb = activity.elevationGainM > 0 ? t("gpxElevation", { m: activity.elevationGainM }) : undefined;
      let workoutId = workout?.id;
      if (workoutId !== undefined) {
        await updateWorkout(workoutId, { ...details, notes: workout?.notes || climb });
      } else {
        workoutId = await createWorkout({ date, title: activity.name || t(`sport_${sport}`), kind: "cardio", sport, notes: climb });
        await updateWorkout(workoutId, details);
      }
      setActivity(null);
      onImported({ workoutId, activity });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {trigger(pickFile)}
      <input
        id={inputId}
        type="file"
        accept=".gpx,.tcx,.fit,application/gpx+xml,application/vnd.garmin.tcx+xml,application/vnd.ant.fit,application/xml,text/xml,application/octet-stream"
        className="hidden"
        onChange={(e) => {
          read(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}

      <Dialog open={activity !== null} onOpenChange={(open) => !open && setActivity(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{activity?.name || t("gpxTitle")}</DialogTitle>
          </DialogHeader>
          {activity && (
            <div className="space-y-3">
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <Fact label={t("gpxDate")} value={day(date)} />
                <Fact label={t("distance")} value={formatDistance(activity.distanceM, sport)} />
                {activity.durationSec > 0 && <Fact label={t("gpxMoving")} value={formatDuration(activity.durationSec)} />}
                {formatPace(sport, activity.distanceM, activity.durationSec) && (
                  <Fact label={t("paceLabel")} value={formatPace(sport, activity.distanceM, activity.durationSec)!} />
                )}
                {activity.elevationGainM > 0 && <Fact label={t("gpxClimb")} value={`+${activity.elevationGainM} m`} />}
                {activity.avgHr && <Fact label={t("gpxHr")} value={`${activity.avgHr} · ${activity.maxHr}`} />}
                {activity.avgCadence && <Fact label={t("gpxCadence")} value={String(activity.avgCadence)} />}
                {activity.avgPowerW && <Fact label={t("gpxPower")} value={`${activity.avgPowerW} · ${activity.maxPowerW ?? "—"} W`} />}
              </dl>

              {!workout && (
                <label className="block text-sm font-medium">
                  {t("sport")}
                  <select
                    value={sport}
                    onChange={(e) => setSport(e.target.value as Sport)}
                    className="mt-1 h-11 w-full rounded-lg border border-input bg-card px-3 text-base"
                  >
                    {DISTANCE_SPORTS.map((s) => <option key={s} value={s}>{t(`sport_${s}`)}</option>)}
                  </select>
                </label>
              )}

              {already ? (
                <div className="space-y-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-300" role="alert">
                  <p>{t("gpxAlready", { date: day(already.date), title: already.title || t("gpxTitle") })}</p>
                  <Link href={`/log/session?id=${already.id}`} className="font-semibold underline" onClick={() => setActivity(null)}>
                    {t("gpxOpenExisting")}
                  </Link>
                </div>
              ) : (
                duplicate && <p className="text-sm text-amber-600 dark:text-amber-400">{t("gpxDuplicate")}</p>
              )}

              <Button className="w-full" onClick={save} disabled={saving || !!already}>
                {saving && <Loader2 className="mr-1 h-4 w-4 animate-spin" aria-hidden="true" />}
                {workout ? t("gpxFill") : t("gpxSave")}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="t-well rounded-xl p-2.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
