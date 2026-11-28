"use client";

import { useLocale, useTranslations } from "next-intl";
import type { Workout } from "@/db";
import { updateWorkout } from "@/hooks/useWorkouts";
import { updateTrainingSchedule, useAthleteProfileOrNull } from "@/hooks/useAthleteProfile";
import { cadenceUnit, lengthsOf, powerLoad, powerZone, swolf } from "@/lib/sportMetrics";
import { itemLabel } from "@/lib/references";
import { useChoices, useSwimStrokes } from "@/hooks/useReferences";
import { useFormat } from "@/lib/format";
import { metricPlace, sportDef, type MetricId } from "@/lib/disciplines";
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
 * The registry says which come first ("essential") and which wait under
 * "More details" ("advanced"); each place shows its own.
 */
export function SportDetails({ workout, distanceM, durationSec, place }: { workout: Workout; distanceM: number; durationSec: number; place: "essential" | "advanced" }) {
  const t = useTranslations("sportDetails");
  const strokes = useSwimStrokes();
  const locale = useLocale();
  const choices = useChoices();
  const { num } = useFormat();
  const profile = useAthleteProfileOrNull();
  const id = workout.id!;
  const sport = workout.sport;
  const cadence = cadenceUnit(sport);
  const ftp = profile?.ftpW ?? null;
  const here = (m: MetricId) => metricPlace(sport, m) === place;

  const swimLines = sport === "swim" ? (() => {
    const value = swolf({ distanceM, durationSec, poolLengthM: workout.poolLengthM, strokesPerLength: workout.strokesPerLength });
    const lengths = lengthsOf(distanceM, workout.poolLengthM);
    return { value, lengths };
  })() : null;
  // The normalized power when the file gave it (the true TSS), else the average (an estimate).
  const np = workout.normalizedPowerW ?? null;
  const load = here("avgPower") ? powerLoad(durationSec, np ?? workout.avgPowerW, ftp) : null;
  const zone = here("avgPower") ? powerZone(workout.avgPowerW, ftp) : null;

  const numbers = [
    here("cadence") && cadence ? <NumberField key="cadence" label={t("cadence")} unit={t(`unit_${cadence}`)} value={workout.avgCadence} min={1} max={260} onSave={(n) => updateWorkout(id, { avgCadence: n })} /> : null,
    here("avgPower") ? <NumberField key="avg" label={t("avgPower")} unit="W" value={workout.avgPowerW} min={0} max={2500} onSave={(n) => updateWorkout(id, { avgPowerW: n })} /> : null,
    here("maxPower") ? <NumberField key="max" label={t("maxPower")} unit="W" value={workout.maxPowerW} min={0} max={3000} onSave={(n) => updateWorkout(id, { maxPowerW: n })} /> : null,
    here("ftp") ? <NumberField key="ftp" label={t("ftp")} unit="W" value={ftp} min={30} max={700} onSave={(n) => updateTrainingSchedule({ ftpW: n })} /> : null,
  ].filter(Boolean);

  const swim = here("swimStroke") || here("pool") || (here("strokesPerLength") && !!workout.poolLengthM);
  if (!swim && !numbers.length) return null;

  return (
    <div className="space-y-3">
      {here("swimStroke") && (
        <ChipRow label={t("stroke")}>
          {(strokes ?? []).map(({ id: s }) => (
            <Chip key={s} on={workout.swimStroke === s} onClick={() => updateWorkout(id, { swimStroke: workout.swimStroke === s ? null : s })}>{itemLabel(strokes, s, locale)}</Chip>
          ))}
        </ChipRow>
      )}
      {here("pool") && (
        <ChipRow label={t("pool")}>
          {(choices?.poolLengths ?? []).map((m) => (
            <Chip key={m} on={workout.poolLengthM === m} onClick={() => updateWorkout(id, { poolLengthM: workout.poolLengthM === m ? null : m })}>{t("poolM", { m })}</Chip>
          ))}
          {/* Open water is kept as a pool of 0 m: known to have no lengths. */}
          <Chip on={workout.poolLengthM === 0} onClick={() => updateWorkout(id, { poolLengthM: workout.poolLengthM === 0 ? null : 0 })}>{t("openWater")}</Chip>
        </ChipRow>
      )}
      {here("strokesPerLength") && !!workout.poolLengthM && (
        <NumberField label={t("strokes")} unit={t("perLength")} value={workout.strokesPerLength} min={1} max={200} onSave={(n) => updateWorkout(id, { strokesPerLength: n })} />
      )}
      {here("pool") && swimLines && (swimLines.lengths || swimLines.value) && (
        <p className="text-sm font-medium">
          {[swimLines.lengths ? t("lengths", { count: swimLines.lengths }) : null, swimLines.value ? t("swolf", { value: swimLines.value }) : null].filter(Boolean).join(" · ")}
        </p>
      )}
      {here("pool") && swimLines?.value && <p className="text-xs text-muted-foreground">{t("swolfHint")}</p>}

      {numbers.length > 0 && <div className="grid grid-cols-2 gap-3">{numbers}</div>}
      {zone && load && (
        <p className="text-sm font-medium">{t("powerLine", { zone, name: t(`zone_${zone}`), intensity: num(load.intensity, 2), tss: load.tss })}</p>
      )}
      {here("avgPower") && workout.avgPowerW && !ftp && <p className="text-xs text-muted-foreground">{t("needFtp")}</p>}
      {here("avgPower") && np && <p className="text-sm">{t("normalizedPower", { watts: np })}</p>}
      {load && <p className="text-xs text-muted-foreground">{t(np ? "tssHintNp" : "tssHint")}</p>}
    </div>
  );
}

/** Whether something under "More details" already has a value: the section then opens by itself. */
export function hasAdvancedValues(workout: Workout): boolean {
  const filled: Partial<Record<MetricId, unknown>> = {
    climb: workout.elevationGainM,
    cadence: workout.avgCadence,
    avgPower: workout.avgPowerW,
    maxPower: workout.maxPowerW,
    swimStroke: workout.swimStroke,
    pool: workout.poolLengthM,
    strokesPerLength: workout.strokesPerLength,
  };
  return (sportDef(workout.sport)?.advanced ?? []).some((m) => filled[m] !== null && filled[m] !== undefined);
}
