"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Waves } from "lucide-react";
import { useSwimTechniques } from "@/hooks/useSwimTechniques";
import { langOf, type SwimTechnique } from "@/lib/swimTechniques";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { VideoEmbed } from "@/components/domain/VideoEmbed";

/** One technique, full: its video, its key points, its usual mistakes. */
export function SwimTechniqueDialog({ technique, onClose }: { technique: SwimTechnique | null; onClose: () => void }) {
  const t = useTranslations("swimTechniques");
  const lang = langOf(useLocale());
  return (
    <Dialog open={technique !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="z-[70] max-h-[85vh] overflow-y-auto">
        {technique && (
          <>
            <DialogHeader>
              <DialogTitle>{technique.name[lang]}</DialogTitle>
            </DialogHeader>
            {technique.video && <VideoEmbed url={technique.video} />}
            <section className="space-y-1">
              <h3 className="text-sm font-semibold">{t("points")}</h3>
              <ul className="list-disc space-y-1 pl-5 text-sm">
                {technique.points[lang].map((p) => <li key={p}>{p}</li>)}
              </ul>
            </section>
            <section className="space-y-1">
              <h3 className="text-sm font-semibold">{t("mistakes")}</h3>
              <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {technique.mistakes[lang].map((p) => <li key={p}>{p}</li>)}
              </ul>
            </section>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** The techniques a session uses, as links to their sheets; nothing for keys the sheets do not have. */
export function SwimTechniqueChips({ keys }: { keys: string[] }) {
  const t = useTranslations("swimTechniques");
  const lang = langOf(useLocale());
  const all = useSwimTechniques();
  const [open, setOpen] = useState<SwimTechnique | null>(null);
  const shown = keys.map((k) => all?.find((x) => x.key === k)).filter((x): x is SwimTechnique => !!x);
  if (!shown.length) return null;
  return (
    <div className="space-y-1.5 pt-1">
      <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{t("inSession")}</p>
      <div className="flex flex-wrap gap-1.5">
        {shown.map((x) => (
          <button
            key={x.key}
            type="button"
            onClick={() => setOpen(x)}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border px-3 text-sm text-accent-text hover:bg-muted"
          >
            <Waves className="h-3.5 w-3.5" aria-hidden="true" />
            {x.name[lang]}
          </button>
        ))}
      </div>
      <SwimTechniqueDialog technique={open} onClose={() => setOpen(null)} />
    </div>
  );
}
