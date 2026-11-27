"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Music } from "lucide-react";
import { savePrefs } from "@/lib/appTheme";
import { isPlaylistOf, mixWithMusic, openMusic } from "@/lib/music";
import { stopSpeaking, unlockVoice, voiceSupported } from "@/lib/voice";
import { useAppPrefs } from "@/hooks/useAppPrefs";
import { useMusicApps } from "@/hooks/useMusicApps";
import { Button } from "@/components/ui/button";
import { Choice } from "@/components/ui/choice";
import { Input } from "@/components/ui/input";

/**
 * The music app opened from a session, and the playlist it opens on: kept on
 * this device, as another may have another app.
 */
export function MusicSettings() {
  const t = useTranslations("music");
  const { music } = useAppPrefs();
  const apps = useMusicApps();
  const app = music ? apps?.find((a) => a.id === music.app) : undefined;
  // What is being typed; the field shows the saved link until then.
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState(false);
  if (!apps) return <p role="status" className="text-xs text-muted-foreground">{t("notLoaded")}</p>;

  const link = draft ?? music?.playlist ?? "";
  function savePlaylist() {
    if (!app || draft === null) return;
    const value = draft.trim();
    if (value && !isPlaylistOf(app, value)) return setError(true);
    setError(false);
    setDraft(null);
    savePrefs({ music: { app: app.id, playlist: value || null } });
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">{t("settingsHint")}</p>
      <div role="group" aria-label={t("app")} className="flex flex-wrap gap-2">
        <Choice on={!app} onClick={() => savePrefs({ music: null })}>{t("none")}</Choice>
        {apps.map((a) => (
          <Choice
            key={a.id}
            on={app?.id === a.id}
            onClick={() => {
              setDraft(null);
              setError(false);
              // Another app: the playlist of the former one would not open in it.
              savePrefs({ music: { app: a.id, playlist: app?.id === a.id ? (music?.playlist ?? null) : null } });
            }}
          >
            {a.name}
          </Choice>
        ))}
      </div>
      {app && (
        <>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">{t("playlist")}</span>
            <Input
              type="url"
              inputMode="url"
              value={link}
              placeholder={app.playlistPrefixes[0] ?? app.webUrl}
              onChange={(e) => {
                setDraft(e.target.value);
                setError(false);
              }}
              onBlur={savePlaylist}
              onKeyDown={(e) => e.key === "Enter" && savePlaylist()}
              aria-invalid={error}
            />
            <span className="block text-xs text-muted-foreground">{t("playlistHint", { app: app.name })}</span>
          </label>
          {error && <p role="alert" className="text-xs text-destructive">{t("playlistInvalid", { app: app.name })}</p>}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              mixWithMusic();
              openMusic(app, music?.playlist ?? null);
            }}
          >
            <Music className="mr-1 h-4 w-4" aria-hidden="true" />
            {t("try")}
          </Button>
        </>
      )}
      <p className="text-xs text-muted-foreground">{t("soundHint")}</p>
    </div>
  );
}

/** The voice coach of the timed sessions, on or off; on an iPhone it pauses one's music. */
export function VoiceCoachSetting() {
  const t = useTranslations("music");
  const { voice } = useAppPrefs();
  if (!voiceSupported()) return null;
  return (
    <label className="mb-3 flex min-h-11 items-center gap-3 text-sm">
      <input
        type="checkbox"
        checked={voice}
        onChange={(e) => {
          const on = e.target.checked;
          // Turned on from this tap: the voice is allowed to speak (iOS).
          if (on) unlockVoice();
          else stopSpeaking();
          savePrefs({ voice: on });
        }}
        className="size-5 accent-accent-600"
      />
      <span className="flex-1">
        {t("voiceCoach")}
        <span className="block text-xs text-muted-foreground">{t("voiceCoachHint")}</span>
      </span>
    </label>
  );
}
