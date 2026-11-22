import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { askCoach, generateProgram, getAiConsent, giveAiConsent, MODEL, withdrawAiConsent } from "./aiService";

/** An answer streamed as the Messages API streams it (server-sent events). */
function sse(texts: string[], stopReason = "end_turn"): Response {
  const events: [string, unknown][] = [
    ["message_start", { type: "message_start", message: { id: "msg_1", type: "message", role: "assistant", model: MODEL, content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 10, output_tokens: 0 } } }],
    ["content_block_start", { type: "content_block_start", index: 0, content_block: { type: "text", text: "" } }],
    ...texts.map((text): [string, unknown] => ["content_block_delta", { type: "content_block_delta", index: 0, delta: { type: "text_delta", text } }]),
    ["content_block_stop", { type: "content_block_stop", index: 0 }],
    ["message_delta", { type: "message_delta", delta: { stop_reason: stopReason, stop_sequence: null }, usage: { output_tokens: 5 } }],
    ["message_stop", { type: "message_stop" }],
  ];
  const body = events.map(([event, data]) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`).join("");
  return new Response(body, { status: 200, headers: { "content-type": "text/event-stream" } });
}

/** This device's storage, with the athlete's agreement already given. */
beforeEach(() => {
  const store = new Map<string, string>();
  vi.stubGlobal("window", {
    localStorage: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v), removeItem: (k: string) => void store.delete(k) },
  });
  giveAiConsent();
});
afterEach(() => vi.unstubAllGlobals());

describe("the athlete's agreement", () => {
  it("is required before anything is sent", async () => {
    withdrawAiConsent();
    expect(getAiConsent()).toBeNull();
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    await expect(askCoach({ apiKey: "sk-test", locale: "fr", context: "x", history: [], question: "?", onText: () => {} })).rejects.toThrow("AI_NO_CONSENT");
    await expect(generateProgram({ goal: "force", daysPerWeek: 3, experience: "beginner", equipment: [] }, "sk-test")).rejects.toThrow("AI_NO_CONSENT");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("is dated when given", () => {
    expect(getAiConsent()).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

describe("askCoach", () => {
  it("asks the current model with the data summary cached, a fallback on refusal, and streams the answer", async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    vi.stubGlobal("fetch", vi.fn(async (url: string, init: RequestInit) => {
      calls.push({ url: String(url), init });
      return sse(["Le squat ", "progresse."]);
    }));
    const seen: string[] = [];
    const answer = await askCoach({ apiKey: "sk-test", locale: "fr", context: "Today: 2026-11-22.", history: [{ role: "user", content: "Bonjour" }, { role: "assistant", content: "Bonjour !" }], question: "Mon squat ?", onText: (s) => seen.push(s) });
    expect(answer).toBe("Le squat progresse.");
    expect(seen.at(-1)).toBe("Le squat progresse.");
    const body = JSON.parse(String(calls[0].init.body));
    expect(calls[0].url).toContain("/v1/messages");
    expect(body.model).toBe("claude-opus-5-5");
    expect(body.fallbacks).toBe("default");
    expect(body.stream).toBe(true);
    expect(body.system[0].cache_control).toEqual({ type: "ephemeral" });
    expect(body.system[0].text).toContain("Answer in French");
    expect(body.system[0].text).toContain("Today: 2026-11-22.");
    expect(body.messages.map((m: { role: string }) => m.role)).toEqual(["user", "assistant", "user"]);
    const headers = new Headers(calls[0].init.headers);
    expect(headers.get("anthropic-beta")).toContain("server-side-fallback-2026-07-01");
    // SDK 1.x sends the key as a bearer credential.
    expect(headers.get("authorization")).toBe("Bearer sk-test");
  });

  it("says a refusal and a refused key in the app's words", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => sse([""], "refusal")));
    await expect(askCoach({ apiKey: "k", locale: "en", context: "", history: [], question: "?", onText: () => {} })).rejects.toThrow("AI_REFUSED");
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ type: "error", error: { type: "authentication_error", message: "invalid x-api-key" } }), { status: 401, headers: { "content-type": "application/json" } })));
    await expect(askCoach({ apiKey: "k", locale: "en", context: "", history: [], question: "?", onText: () => {} })).rejects.toThrow("AI_BAD_KEY");
  });
});
