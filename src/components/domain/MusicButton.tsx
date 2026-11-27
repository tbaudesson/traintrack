"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Music, X } from "lucide-react";
import { getPrefs, savePrefs } from "@/lib/appTheme";
import { stopSpeaking, unlockVoice, voicePausesMusic } from "@/lib/voice";
import { mixWithMusic, openMusic, type MusicApp } from "@/lib/music";
import { useAppPrefs } from "@/hooks/useAppPrefs";
import { useMusicApps } from "@/hooks/useMusicApps";
import { cn } from "@/lib/utils";

/**
 * "Music" in a session: opens one's music app (on one's playlist) and the
 * session goes on meanwhile. The first time, the app is chosen right here;
 * it is changed, and a playlist given, in Settings. On an iPhone the voice
 * coach would pause the music at each step: it is turned off, which a note
 * says, with a way to turn it back on; the beeps stay.
 */
export function MusicButton({ className }: { className?: string }) {
  const t = useTranslations("music");
  const { music } = useAppPrefs();
  const apps = useMusicApps();
  const [choosing, setChoosing] = useState(false);
  const [voiceOff, setVoiceOff] = useState(false);
  // The note stays a few seconds once one is back from the music app.
  useEffect(() => {
    if (!voiceOff) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const wait = () => {
      clearTimeout(timer);
      if (document.visibilityState === "visible") timer = setTimeout(() => setVoiceOff(false), 8000);
    };
    wait();
    document.addEventListener("visibilitychange", wait);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", wait);
    };
  }, [voiceOff]);
  if (!apps) return null;
  const chosen = music ? apps.find((a) => a.id === music.app) : undefined;

  function play(app: MusicApp, playlist: string | null) {
    setChoosing(false);
    mixWithMusic();
    if (voicePausesMusic() && getPrefs().voice) {
      stopSpeaking();
      savePrefs({ voice: false });
      setVoiceOff(true);
    }
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
      {voiceOff && (
        <div role="status" className="t-surface absolute top-12 right-0 z-10 flex w-64 items-start gap-2 rounded-2xl p-3 text-left text-xs font-normal text-foreground normal-case tracking-normal shadow-lg ring-1 ring-foreground/10">
          <span className="flex-1">
            {t("voiceOff")}
            <button
              type="button"
              onClick={() => {
                // From this tap: the voice is allowed to speak (iOS).
                unlockVoice();
                savePrefs({ voice: true });
                setVoiceOff(false);
              }}
              className="mt-1 flex min-h-9 items-center font-semibold text-accent-text"
            >
              {t("voiceOn")}
            </button>
          </span>
          <button type="button" onClick={() => setVoiceOff(false)} aria-label={t("close")} className="-m-1 flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-foreground/10">
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      )}
    </span>
  );
}
