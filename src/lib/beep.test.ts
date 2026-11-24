import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { unlockAudio } from "./beep";

/** A device with speech and an audio session, the prefs given. */
function device(prefs: object) {
  const speak = vi.fn();
  const audioSession = { type: "auto" };
  class Utterance {
    volume = 1;
    constructor(public text: string) {}
  }
  vi.stubGlobal("window", {
    localStorage: { getItem: () => JSON.stringify(prefs), setItem: vi.fn() },
    speechSynthesis: { speak },
    SpeechSynthesisUtterance: Utterance,
  });
  vi.stubGlobal("SpeechSynthesisUtterance", Utterance);
  vi.stubGlobal("navigator", { audioSession });
  return { speak, audioSession };
}

describe("unlockAudio", () => {
  beforeEach(() => vi.unstubAllGlobals());
  afterEach(() => vi.unstubAllGlobals());

  it("leaves the speech engine asleep for a timer that never speaks (it would pause one's music on an iPhone)", () => {
    const { speak } = device({ voice: true });
    unlockAudio();
    expect(speak).not.toHaveBeenCalled();
  });

  it("wakes the voice for a session with the voice coach on, not with it off", () => {
    const on = device({ voice: true });
    unlockAudio({ voice: true });
    expect(on.speak).toHaveBeenCalledTimes(1);
    const off = device({ voice: false });
    unlockAudio({ voice: true });
    expect(off.speak).not.toHaveBeenCalled();
  });

  it("sets the sounds to mix with one's music before the voice is woken", () => {
    const { speak, audioSession } = device({ voice: true, music: { app: "musi", playlist: null } });
    speak.mockImplementation(() => expect(audioSession.type).toBe("ambient"));
    unlockAudio({ voice: true });
    expect(speak).toHaveBeenCalledTimes(1);
    expect(audioSession.type).toBe("ambient");
  });
});
