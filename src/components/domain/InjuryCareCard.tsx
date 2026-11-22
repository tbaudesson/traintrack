"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Bandage, Stethoscope } from "lucide-react";
import type { Injury } from "@/lib/injuries";
import { activeInjuries } from "@/lib/injuries";
import { persistentPains, type InjuryGuidance } from "@/lib/injuryGuidance";
import { useMobilityGuidance } from "@/hooks/useMobilityGuidance";
import type { PainReport } from "@/lib/pain";
import { DemoButton, DemoDialog } from "@/components/domain/DemoDialog";
import { DeclareInjuryButton } from "@/components/domain/InjuryAreas";

/**
 * Looking after an injury from the home screen: a pain that keeps coming
 * back calls for a professional, and each injured area gets a few gentle
 * moves to keep it moving without pain. Nothing shows without an injury or
 * a pain coming back, nor before the references have been read.
 */
export function InjuryCareCard({ guidance, injuries, pains, today }: { guidance: InjuryGuidance; injuries: Injury[]; pains: PainReport[]; today: string }) {
  const t = useTranslations("injuryCare");
  const tpain = useTranslations("pain");
  const locale = useLocale() as "fr" | "en" | "de";
  const mobility = useMobilityGuidance();
  const [demo, setDemo] = useState<{ name: string; video: string | null; cue?: string } | null>(null);
  const persistent = persistentPains(guidance, pains, today);
  const injured = activeInjuries(injuries).map((i) => i.area);
  if (!persistent.length && !injured.length) return null;
  const area = (a: string) => tpain(`area_${a}`);

  return (
    <section className="t-surface space-y-3 rounded-2xl p-4 ring-1 ring-foreground/5" aria-labelledby="injury-care-title">
      <h2 id="injury-care-title" className="flex items-center gap-2 text-sm font-semibold">
        <Bandage className="h-4 w-4 text-rose-600 dark:text-rose-400" aria-hidden="true" />
        {t("title")}
      </h2>

      {persistent.map((p) => (
        <p key={p.area} role="alert" className="flex items-start gap-2 rounded-lg bg-rose-50 p-2 text-sm text-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
          <Stethoscope className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {t("persistent", { area: area(p.area), reports: p.reports, days: guidance.persistent.days, worst: p.worst })}
        </p>
      ))}

      {injured.map((a) => {
        const moves = (guidance.gentle[a] ?? []).map((key) => mobility?.moves.find((e) => e.key === key)).filter((e): e is NonNullable<typeof e> => !!e);
        if (!moves.length) return null;
        return (
          <div key={a} className="space-y-1.5">
            <p className="text-sm font-medium">{t("gentleTitle", { area: area(a) })}</p>
            <ul className="space-y-1">
              {moves.map((m) => (
                <li key={m.key} className="flex items-center gap-2 rounded-lg bg-muted/50 py-1 pr-1 pl-3 text-sm">
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{m.name[locale]}</span>
                    <span className="block text-xs text-muted-foreground">{m.cue[locale]}</span>
                  </span>
                  <DemoButton onClick={() => setDemo({ name: m.name[locale], video: m.video ?? null, cue: m.cue[locale] })} />
                </li>
              ))}
            </ul>
          </div>
        );
      })}

      <p className="text-xs text-muted-foreground">{t("care")}</p>
      <DeclareInjuryButton />
      <DemoDialog demo={demo} onClose={() => setDemo(null)} />
    </section>
  );
}
