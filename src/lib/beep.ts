/**
 * Short beeps for the timed sessions, made with Web Audio: no sound file to
 * load and it works offline. Browsers only let a page play sound after a tap,
 * so unlockAudio() is called from the tap that starts the session; it also
 * readies the voice coach, under the same rule.
 */
import { unlockVoice } from "./voice";
import { getPrefs } from "./appTheme";
import { mixWithMusic } from "./music";

let context: AudioContext | null = null;

/**
 * From a tap: readies the beeps and, for a session with the voice coach, the
 * voice. The sounds are always set to mix with other audio first: on an
 * iPhone, a page that plays sound otherwise pauses the music of another app,
 * whether or not that music was opened from here. The speech engine is woken
 * only for a session that speaks, as waking it can pause the music too.
 */
export function unlockAudio({ voice = false }: { voice?: boolean } = {}): void {
  mixWithMusic();
  if (voice && getPrefs().voice) unlockVoice();
  try {
    if (!context) {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      context = new Ctx();
    } else if (context.state === "running") {
      // Already unlocked: each sound played starts the audio again, so none is played for nothing.
      return;
    }
    void context.resume();
    // A silent sound played from the tap is what really unlocks Web Audio on iOS.
    const buffer = context.createBuffer(1, 1, 22050);
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(context.destination);
    source.start(0);
  } catch {
    // No sound on this device: the session still runs, silently.
  }
}

/** A beep: short and low for a countdown, long and high to start an effort. */
export function beep(kind: "tick" | "go" | "rest" = "tick"): void {
  if (!context) return;
  try {
    mixWithMusic();
    // Suspended or interrupted by the system meanwhile (a call, the screen locked).
    if (context.state !== "running") void context.resume();
    const osc = context.createOscillator();
    const gain = context.createGain();
    const length = kind === "tick" ? 0.12 : 0.4;
    osc.frequency.value = kind === "go" ? 1320 : kind === "rest" ? 520 : 880;
    gain.gain.setValueAtTime(0.25, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + length);
    osc.connect(gain).connect(context.destination);
    osc.start();
    osc.stop(context.currentTime + length);
  } catch {
    // Ignore: a missed beep is not worth an error.
  }
}
