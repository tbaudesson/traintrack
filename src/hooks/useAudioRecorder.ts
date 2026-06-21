import { useCallback, useEffect, useRef, useState } from "react";
import { isRecordingSupported } from "@/lib/voiceNoteService";

/** Minimal microphone recorder around MediaRecorder. */
export function useAudioRecorder() {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cleanup = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const start = useCallback(async () => {
    setError(null);
    if (!isRecordingSupported()) { setError("UNSUPPORTED"); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      const rec = new MediaRecorder(stream);
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.start();
      recorderRef.current = rec;
      setRecording(true);
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch {
      setError("DENIED");
    }
  }, []);

  /** Stop and resolve with the recorded blob (or null if nothing captured). */
  const stop = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const rec = recorderRef.current;
      if (!rec) { resolve(null); return; }
      rec.onstop = () => {
        cleanup();
        setRecording(false);
        const blob = chunksRef.current.length ? new Blob(chunksRef.current, { type: rec.mimeType }) : null;
        resolve(blob);
      };
      rec.stop();
    });
  }, [cleanup]);

  const cancel = useCallback(() => {
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") { rec.onstop = null; rec.stop(); }
    cleanup();
    setRecording(false);
    chunksRef.current = [];
  }, [cleanup]);

  return { recording, seconds, error, start, stop, cancel, supported: isRecordingSupported() };
}
