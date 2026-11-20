"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ChevronRight, PlayCircle } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { SwimTechniqueDialog } from "@/components/domain/SwimTechniqueSheet";
import { useSwimTechniques } from "@/hooks/useSwimTechniques";
import { langOf, type SwimTechnique } from "@/lib/swimTechniques";

/** The four strokes and the drills, each sheet one tap away. */
export default function SwimTechniquesPage() {
  const t = useTranslations("swimTechniques");
  const lang = langOf(useLocale());
  const all = useSwimTechniques();
  const [open, setOpen] = useState<SwimTechnique | null>(null);
  const group = (kind: SwimTechnique["kind"]) => (all ?? []).filter((x) => x.kind === kind);

  return (
    <>
      <PageHeader title={t("title")} />
      <div className="mx-auto max-w-3xl space-y-6 p-4 pb-28">
        <p className="text-sm text-muted-foreground">{t("intro")}</p>
        {!all && <p role="status" className="text-sm text-muted-foreground">{t("notLoaded")}</p>}
        {(["stroke", "drill"] as const).map((kind) =>
          group(kind).length ? (
            <section key={kind} className="space-y-2">
              <h2 className="t-section-heading text-lg font-semibold">{t(kind === "stroke" ? "strokes" : "drills")}</h2>
              <ul className="grid gap-2 sm:grid-cols-2">
                {group(kind).map((x) => (
                  <li key={x.key}>
                    <button type="button" onClick={() => setOpen(x)} className="t-surface flex w-full items-center gap-3 rounded-2xl p-3 text-left ring-1 ring-foreground/5">
                      <PlayCircle className="h-5 w-5 shrink-0 text-accent-text" aria-hidden="true" />
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold leading-tight">{x.name[lang]}</span>
                        <span className="line-clamp-2 block text-xs text-muted-foreground">{x.points[lang][0]}</span>
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null
        )}
      </div>
      <SwimTechniqueDialog technique={open} onClose={() => setOpen(null)} />
    </>
  );
}
