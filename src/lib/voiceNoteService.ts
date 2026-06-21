import { supabase } from "./supabase";

const BUCKET = "voice-notes";

/** Whether the browser can record audio. */
export function isRecordingSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== "undefined"
  );
}

/** Upload a recorded blob; returns the storage path stored on the note. */
export async function uploadVoiceNote(blob: Blob): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("NOT_AUTHENTICATED");
  const ext = blob.type.includes("mp4") ? "mp4" : "webm";
  const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: blob.type || "audio/webm",
    upsert: false,
  });
  if (error) throw new Error(error.message);
  return path;
}

/** A short-lived signed URL to play back a stored voice note. */
export async function getVoiceNoteUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
  if (error) return null;
  return data?.signedUrl ?? null;
}

export async function deleteVoiceNote(path: string): Promise<void> {
  await supabase.storage.from(BUCKET).remove([path]);
}
