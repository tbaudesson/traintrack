"use client";

import { useTranslations } from "next-intl";
import { PlayCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { VideoEmbed } from "@/components/domain/VideoEmbed";

/** A move shown: its video, and the cue in words under it. */
export function DemoDialog({
  demo,
  onClose,
}: {
  demo: { name: string; video: string | null; cue?: string } | null;
  onClose: () => void;
}) {
  const t = useTranslations("demo");
  return (
    <Dialog open={demo !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="z-[70]">
        {demo && (
          <>
            <DialogHeader>
              <DialogTitle>{demo.name}</DialogTitle>
            </DialogHeader>
            {demo.video ? <VideoEmbed url={demo.video} /> : <p className="text-sm text-muted-foreground">{t("none")}</p>}
            {demo.cue && <p className="text-sm">{demo.cue}</p>}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** The small button that opens a demo, next to a move in a list. */
export function DemoButton({ onClick }: { onClick: () => void }) {
  const t = useTranslations("demo");
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={t("watch")}
      className="flex size-9 shrink-0 items-center justify-center rounded-full text-accent-text hover:bg-muted"
    >
      <PlayCircle className="h-5 w-5" aria-hidden="true" />
    </button>
  );
}
