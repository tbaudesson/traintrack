"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Music } from "lucide-react";
import { savePrefs } from "@/lib/appTheme";
import { mixWithMusic, openMusic, type MusicApp } from "@/lib/music";
import { useAppPrefs } from "@/hooks/useAppPrefs";
import { useMusicApps } from "@/hooks/useMusicApps";
import { cn } from "@/lib/utils";

/**
 * "Music" in a session: opens one's music app (on one's playlist) and the
 * session goes on meanwhile. The first time, the app is chosen right here;
 * it is changed, and a playlist given, in Settings.
 */
export function MusicButton({ className }: { className?: string }) {
  const t = useTranslations("music");
  const { music } = useAppPrefs();
  const apps = useMusicApps();
  const [choosing, setChoosing] = useState(false);
  if (!apps) return null;
  const chosen = music ? apps.find((a) => a.id === music.app) : undefined;

  function play(app: MusicApp, playlist: string | null) {
    setChoosing(false);
    mixWithMusic();
    openMusic(app, playlist);
  }

  return (
    <span className="relative">
      <button
        type="button"
        onClick={() => (chosen ? play(chosen, music!.playlist) : setChoosing((v) => !v))}
        aria-label={chosen ? t("open", { app: chosen.name }) : t("choose")}
        aria-expanded={chosen ? undefined : choosing}
        className={cn("flex size-11 items-center justify-center rounded-full text-foreground hover:bg-foreground/10", className)}
      >
        <Music className="h-5 w-5" aria-hidden="true" />
      </button>
      {choosing && !chosen && (
        <div role="group" aria-label={t("choose")} className="t-surface absolute top-12 right-0 z-10 w-60 space-y-1 rounded-2xl p-2 text-left shadow-lg ring-1 ring-foreground/10">
          {apps.map((app) => (
            <button
              key={app.id}
              type="button"
              onClick={() => {
                savePrefs({ music: { app: app.id, playlist: null } });
                play(app, null);
              }}
              className="flex min-h-11 w-full items-center rounded-xl px-3 text-sm font-medium text-foreground hover:bg-foreground/10"
            >
              {app.name}
            </button>
          ))}
          <p className="px-3 pt-1 pb-1 text-xs font-normal text-muted-foreground">{t("chooseHint")}</p>
        </div>
      )}
    </span>
  );
}
