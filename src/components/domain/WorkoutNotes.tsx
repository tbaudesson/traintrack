"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkoutNotes, addWorkoutNote, deleteWorkoutNote } from "@/hooks/useWorkoutNotes";
import { useWorkoutSets } from "@/hooks/useWorkoutSets";
import { useExercises } from "@/hooks/useExercises";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { uploadVoiceNote, getVoiceNoteUrl, deleteVoiceNote } from "@/lib/voiceNoteService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageSquare, Send, Trash2, Loader2, Mic, Square, X, Play, Dumbbell } from "lucide-react";

/** Async notes thread on a workout — author is the athlete or their coach. */
export function WorkoutNotes({ workoutId }: { workoutId: number }) {
  const t = useTranslations("notes");
  const { user, profile } = useAuth();
  const notes = useWorkoutNotes(workoutId);
  const sets = useWorkoutSets(workoutId);
  const exercises = useExercises();
  const recorder = useAudioRecorder();

  const [body, setBody] = useState("");
  const [scopeUuid, setScopeUuid] = useState<string>(""); // "" = whole workout
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Distinct exercises in this workout, for anchoring a note.
  const workoutExercises = useMemo(() => {
    const exMap = new Map(exercises.map((e) => [e.id, e]));
    const seen = new Map<string, string>(); // uuid -> name
    for (const s of sets) {
      const e = exMap.get(s.exerciseId);
      if (e?.uuid && !seen.has(e.uuid)) seen.set(e.uuid, e.name);
    }
    return [...seen.entries()].map(([uuid, name]) => ({ uuid, name }));
  }, [sets, exercises]);

  const scopeName = workoutExercises.find((e) => e.uuid === scopeUuid)?.name;
  const authorName = profile?.display_name ?? user?.email?.split("@")[0] ?? undefined;

  async function submitText() {
    if (!body.trim()) return;
    setBusy(true);
    try {
      await addWorkoutNote(workoutId, body.trim(), authorName, {
        exerciseUuid: scopeUuid || undefined,
        exerciseName: scopeName,
      });
      setBody("");
    } finally {
      setBusy(false);
    }
  }

  async function stopAndSendVoice() {
    setError(null);
    const blob = await recorder.stop();
    if (!blob) return;
    setBusy(true);
    try {
      const path = await uploadVoiceNote(blob);
      await addWorkoutNote(workoutId, body.trim(), authorName, {
        exerciseUuid: scopeUuid || undefined,
        exerciseName: scopeName,
        audioPath: path,
      });
      setBody("");
    } catch (e) {
      setError(e instanceof Error ? e.message : t("voiceError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <MessageSquare className="h-3.5 w-3.5" /> {t("title")}
      </h4>

      {notes.map((n) => {
        const mine = n.userId === user?.id;
        return (
          <div key={n.id} className="rounded-lg bg-muted/50 px-3 py-2 text-sm">
            <div className="mb-0.5 flex items-center gap-2">
              <span className="text-xs font-medium text-accent-600">{n.authorName ?? "—"}</span>
              <span className="text-[10px] text-muted-foreground">{n.createdAt.split("T")[0]}</span>
              {mine && n.id && (
                <button
                  onClick={() => { if (n.audioPath) deleteVoiceNote(n.audioPath); deleteWorkoutNote(n.id!); }}
                  className="ml-auto text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
            {n.exerciseName && (
              <span className="mb-1 inline-flex items-center gap-1 rounded-full bg-accent-100 px-2 py-0.5 text-[10px] font-medium text-accent-700 dark:bg-accent-900/40 dark:text-accent-300">
                <Dumbbell className="h-2.5 w-2.5" /> {n.exerciseName}
              </span>
            )}
            {n.body && <p className="whitespace-pre-wrap">{n.body}</p>}
            {n.audioPath && <VoiceNotePlayer path={n.audioPath} />}
          </div>
        );
      })}

      {/* Composer */}
      <div className="space-y-2 rounded-lg border border-border p-2">
        {workoutExercises.length > 0 && (
          <select
            value={scopeUuid}
            onChange={(e) => setScopeUuid(e.target.value)}
            className="w-full rounded-md border border-border bg-transparent px-2 py-1.5 text-xs"
          >
            <option value="">{t("scopeWorkout")}</option>
            {workoutExercises.map((e) => (
              <option key={e.uuid} value={e.uuid}>{t("scopeExercise", { name: e.name })}</option>
            ))}
          </select>
        )}

        {recorder.recording ? (
          <div className="flex items-center gap-2 rounded-md bg-rose-50 px-3 py-2 dark:bg-rose-950/30">
            <span className="h-2 w-2 animate-pulse rounded-full bg-rose-500" />
            <span className="flex-1 font-mono text-sm tabular-nums">
              {Math.floor(recorder.seconds / 60)}:{String(recorder.seconds % 60).padStart(2, "0")}
            </span>
            <Button size="sm" variant="ghost" onClick={recorder.cancel} aria-label={t("cancel")}>
              <X className="h-4 w-4" />
            </Button>
            <Button size="sm" onClick={stopAndSendVoice} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Square className="mr-1 h-3.5 w-3.5" />{t("stopSend")}</>}
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Input
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={t("placeholder")}
              onKeyDown={(e) => e.key === "Enter" && submitText()}
            />
            {recorder.supported && (
              <Button size="sm" variant="outline" onClick={recorder.start} aria-label={t("recordVoice")}>
                <Mic className="h-4 w-4" />
              </Button>
            )}
            <Button size="sm" onClick={submitText} disabled={busy || !body.trim()}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        )}
        {(error || recorder.error) && (
          <p className="text-xs text-destructive">
            {error ?? (recorder.error === "DENIED" ? t("micDenied") : t("voiceUnsupported"))}
          </p>
        )}
      </div>
    </div>
  );
}

/** Lazily fetches a signed URL on first play. */
function VoiceNotePlayer({ path }: { path: string }) {
  const t = useTranslations("notes");
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    const signed = await getVoiceNoteUrl(path);
    setUrl(signed);
    setLoading(false);
  }

  if (url) {
    // eslint-disable-next-line jsx-a11y/media-has-caption
    return <audio src={url} controls autoPlay className="mt-1 h-9 w-full" />;
  }
  return (
    <button
      onClick={load}
      disabled={loading}
      className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-accent-100 px-3 py-1 text-xs font-medium text-accent-700 dark:bg-accent-900/40 dark:text-accent-300"
    >
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
      {t("playVoice")}
    </button>
  );
}
