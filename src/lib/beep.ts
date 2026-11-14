/**
 * Short beeps for the timed sessions, made with Web Audio: no sound file to
 * load and it works offline. Browsers only let a page play sound after a tap,
 * so unlockAudio() is called from the tap that starts the session.
 */
let context: AudioContext | null = null;

export function unlockAudio(): void {
  try {
    if (!context) {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      context = new Ctx();
    }
    if (context.state === "suspended") void context.resume();
  } catch {
    // No sound on this device: the session still runs, silently.
  }
}

/** A beep: short and low for a countdown, long and high to start an effort. */
export function beep(kind: "tick" | "go" | "rest" = "tick"): void {
  if (!context) return;
  try {
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
