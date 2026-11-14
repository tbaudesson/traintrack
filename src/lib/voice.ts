/**
 * The voice coach of the timed sessions: the browser's own speech synthesis,
 * in the app's language, offline and with nothing to download. Like sound,
 * speech must first be started by a tap: unlockVoice() is called from the tap
 * that starts the session.
 */

export const voiceSupported = () => typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;

const LANGS: Record<string, string> = { fr: "fr-FR", en: "en-GB", de: "de-DE" };

/** Speak an empty sentence from a tap, so later sentences are allowed (iOS). */
export function unlockVoice(): void {
  if (!voiceSupported()) return;
  try {
    const u = new SpeechSynthesisUtterance("");
    u.volume = 0;
    window.speechSynthesis.speak(u);
  } catch {
    // No voice on this device: the beeps remain.
  }
}

/** Say a sentence now, cutting off the one before. */
export function speak(text: string, locale: string): void {
  if (!voiceSupported() || !text) return;
  try {
    const synth = window.speechSynthesis;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const lang = LANGS[locale] ?? locale;
    u.lang = lang;
    const prefix = lang.slice(0, 2);
    u.voice = synth.getVoices().find((v) => v.lang === lang) ?? synth.getVoices().find((v) => v.lang.startsWith(prefix)) ?? null;
    u.rate = 1.05;
    synth.speak(u);
  } catch {
    // Ignore: a missed sentence is not worth an error.
  }
}

export function stopSpeaking(): void {
  if (!voiceSupported()) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    // Nothing to stop.
  }
}

type Step =
  | { type: "work"; exercise: { name: string }; seconds: number; side?: "left" | "right"; phase?: string }
  | { type: "rest"; seconds: number; recovery?: boolean };

export interface VoiceWords {
  /** The exercise as shown, in the app's language. */
  name: (exercise: string) => string;
  getReady: (first: string) => string;
  work: (what: string, seconds: number) => string;
  side: (side: "left" | "right") => string;
  rest: (seconds: number) => string;
  recovery: (seconds: number) => string;
  next: (what: string) => string;
}

const describe = (s: Extract<Step, { type: "work" }>, words: VoiceWords) =>
  `${s.phase ? `${s.phase}, ` : ""}${words.name(s.exercise.name)}${s.side ? `, ${words.side(s.side)}` : ""}`;

/**
 * What the coach says as a step starts: the effort and how long, or the rest
 * and what comes next. `index` -1 is the countdown before the first step.
 */
export function stepAnnouncement(steps: Step[], index: number, words: VoiceWords): string {
  const nextWork = steps.slice(index + 1).find((s): s is Extract<Step, { type: "work" }> => s.type === "work");
  if (index < 0) return nextWork ? words.getReady(describe(nextWork, words)) : "";
  const step = steps[index];
  if (!step) return "";
  if (step.type === "work") return words.work(describe(step, words), step.seconds);
  const rest = step.recovery ? words.recovery(step.seconds) : words.rest(step.seconds);
  return nextWork ? `${rest} ${words.next(describe(nextWork, words))}` : rest;
}
