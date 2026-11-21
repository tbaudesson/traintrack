"use client";

import { useTranslations } from "next-intl";
import type { Workout } from "@/db";
import { updateWorkout } from "@/hooks/useWorkouts";
import { updateTrainingSchedule, useAthleteProfileOrNull } from "@/hooks/useAthleteProfile";
import { cadenceUnit, lengthsOf, POOL_LENGTHS, powerLoad, powerZone, SWIM_STROKES, swolf } from "@/lib/sportMetrics";
import { useFormat } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { Chip, ChipRow } from "@/components/ui/find";

/** A whole number typed, or null for an empty field; out of bounds is refused. */
const whole = (text: string, min: number, max: number) => {
  const n = Math.round(Number(text.replace(",", ".")));
  return text.trim() && Number.isFinite(n) && n >= min && n <= max ? n : null;
};

function NumberField({ label, unit, value, min, max, onSave }: { label: string; unit: string; value: number | null | undefined; min: number; max: number; onSave: (n: number | null) => void }) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <span className="relative mt-1 block">
        <Input
          // Mounted again when the value changes elsewhere (a watch file imported).
          key={value ?? "none"}
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          defaultValue={value ?? ""}
          onBlur={(e) => onSave(whole(e.target.value, min, max))}
          className="pr-14"
        />
        <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted-foreground">{unit}</span>
      </span>
    </label>
  );
}

/**
 * What a sport has of its own, below the distance and the time: the stroke,
 * the pool and the strokes of a swim (and its SWOLF), the cadence on foot or
 * on a bike, the power of a ride (its zone and load against the athlete's
 * FTP). Each figure is optional and filled by a watch file when it has it.
 */
export function SportDetails({ workout, distanceM, durationSec }: { workout: Workout; distanceM: number; durationSec: number }) {
  const t = useTranslations("sportDetails");
  const { num } = useFormat();
  const profile = useAthleteProfileOrNull();
  const id = workout.id!;
  const sport = workout.sport;
  const cadence = cadenceUnit(sport);
  const ftp = profile?.ftpW ?? null;

  if (sport === "swim") {
    const value = swolf({ distanceM, durationSec, poolLengthM: workout.poolLengthM, strokesPerLength: workout.strokesPerLength });
    const lengths = lengthsOf(distanceM, workout.poolLengthM);
    return (
      <div className="space-y-3 border-t border-border pt-3">
        <ChipRow label={t("stroke")}>
          {SWIM_STROKES.map((s) => (
            <Chip key={s} on={workout.swimStroke === s} onClick={() => updateWorkout(id, { swimStroke: workout.swimStroke === s ? null : s })}>{t(`stroke_${s}`)}</Chip>
          ))}
        </ChipRow>
        <ChipRow label={t("pool")}>
          {POOL_LENGTHS.map((m) => (
            <Chip key={m} on={workout.poolLengthM === m} onClick={() => updateWorkout(id, { poolLengthM: workout.poolLengthM === m ? null : m })}>{t("poolM", { m })}</Chip>
          ))}
          {/* Open water is kept as a pool of 0 m: known to have no lengths. */}
          <Chip on={workout.poolLengthM === 0} onClick={() => updateWorkout(id, { poolLengthM: workout.poolLengthM === 0 ? null : 0 })}>{t("openWater")}</Chip>
        </ChipRow>
        {!!workout.poolLengthM && (
          <NumberField label={t("strokes")} unit={t("perLength")} value={workout.strokesPerLength} min={1} max={200} onSave={(n) => updateWorkout(id, { strokesPerLength: n })} />
        )}
        {(lengths || value) && (
          <p className="text-sm font-medium">
            {[lengths ? t("lengths", { count: lengths }) : null, value ? t("swolf", { value }) : null].filter(Boolean).join(" · ")}
          </p>
        )}
        {value && <p className="text-xs text-muted-foreground">{t("swolfHint")}</p>}
      </div>
    );
  }

  if (!cadence) return null;
  const load = sport === "bike" ? powerLoad(durationSec, workout.avgPowerW, ftp) : null;
  const zone = sport === "bike" ? powerZone(workout.avgPowerW, ftp) : null;

  return (
    <div className="space-y-3 border-t border-border pt-3">
      <div className="grid grid-cols-2 gap-3">
        <NumberField label={t("cadence")} unit={t(`unit_${cadence}`)} value={workout.avgCadence} min={1} max={260} onSave={(n) => updateWorkout(id, { avgCadence: n })} />
        {sport === "bike" && (
          <NumberField label={t("avgPower")} unit="W" value={workout.avgPowerW} min={0} max={2500} onSave={(n) => updateWorkout(id, { avgPowerW: n })} />
        )}
        {sport === "bike" && (
          <NumberField label={t("maxPower")} unit="W" value={workout.maxPowerW} min={0} max={3000} onSave={(n) => updateWorkout(id, { maxPowerW: n })} />
        )}
        {sport === "bike" && (
          <NumberField label={t("ftp")} unit="W" value={ftp} min={30} max={700} onSave={(n) => updateTrainingSchedule({ ftpW: n })} />
        )}
      </div>
      {zone && load && (
        <p className="text-sm font-medium">{t("powerLine", { zone, name: t(`zone_${zone}`), intensity: num(load.intensity, 2), tss: load.tss })}</p>
      )}
      {sport === "bike" && workout.avgPowerW && !ftp && <p className="text-xs text-muted-foreground">{t("needFtp")}</p>}
      {load && <p className="text-xs text-muted-foreground">{t("tssHint")}</p>}
    </div>
  );
}
