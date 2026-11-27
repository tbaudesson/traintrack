import { afterEach, describe, expect, it, vi } from "vitest";
import { voicePausesMusic } from "./voice";

const on = (userAgent: string, maxTouchPoints = 0) => vi.stubGlobal("navigator", { userAgent, maxTouchPoints });

describe("voicePausesMusic", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("is so on an iPhone and an iPad, even one asking for the desktop site", () => {
    on("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15");
    expect(voicePausesMusic()).toBe(true);
    on("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15", 5);
    expect(voicePausesMusic()).toBe(true);
  });

  it("is not so on a Mac or an Android phone", () => {
    on("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15");
    expect(voicePausesMusic()).toBe(false);
    on("Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36", 5);
    expect(voicePausesMusic()).toBe(false);
  });
});
