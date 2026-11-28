"use client";

import { useTranslations } from "next-intl";
import { injuryAreasOf } from "@/lib/references";
import { usePainAreaName, usePainAreas } from "@/hooks/useReferences";
import type { ExerciseRules, InjuryLevel } from "@/lib/injuries";

/** What a move loads, area by area: nothing, "caution" or "avoid". */
export function AreaRulesEditor({ value, onChange, label }: { value: ExerciseRules; onChange: (next: ExerciseRules) => void; label?: string }) {
  const t = useTranslations("injuryRules");
  const areaName = usePainAreaName();
  const painAreas = usePainAreas();
  return (
    <fieldset className="space-y-1.5">
      {label && <legend className="mb-1 text-xs font-medium text-muted-foreground">{label}</legend>}
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
        {injuryAreasOf(painAreas).map((area) => (
          <label key={area} className="flex items-center justify-between gap-2 text-xs">
            <span>{areaName(area)}</span>
            <select
              className="h-8 rounded-md border border-input bg-background px-1 text-xs"
              value={value[area] ?? ""}
              onChange={(e) => {
                const next = { ...value };
                if (e.target.value) next[area] = e.target.value as InjuryLevel;
                else delete next[area];
                onChange(next);
              }}
            >
              <option value="">{t("none")}</option>
              <option value="caution">{t("caution")}</option>
              <option value="avoid">{t("avoid")}</option>
            </select>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
