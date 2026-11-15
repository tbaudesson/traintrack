import { afterEach, describe, expect, it, vi } from "vitest";
import { getPrefs, savePrefs } from "./appTheme";

describe("preference migration", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("preserves every valid legacy traintrack.prefs choice while filling new defaults", () => {
    let saved = JSON.stringify({ style: "soft", sport: "running", sport2: "cycling", allSports: false, silhouette: "female", rest: { defaultSec: 120, warmupSec: 45, sound: true, vibrate: false, notify: true }, voice: false });
    vi.stubGlobal("window", { localStorage: { getItem: () => saved, setItem: (_key: string, value: string) => { saved = value; } }, dispatchEvent: vi.fn() });
    vi.stubGlobal("document", { documentElement: { classList: { remove: vi.fn(), add: vi.fn() } } });
    expect(getPrefs()).toMatchObject({ style: "soft", sport: "running", sport2: "cycling", silhouette: "female", voice: false, rest: { defaultSec: 120, warmupSec: 45, sound: true, vibrate: false, notify: true } });
    savePrefs({ style: "contrast" });
    expect(JSON.parse(saved)).toMatchObject({ style: "contrast", sport: "running", sport2: "cycling", silhouette: "female", voice: false });
  });
});
