import Anthropic from "@anthropic-ai/sdk";
import type { ProgramDay } from "@/db";

/**
 * Claude, called from the device with the athlete's own API key (never sent
 * to our servers), through Anthropic's official SDK. The current Opus model
 * with adaptive thinking; a request declined for safety reasons is run again
 * on a fallback model chosen by the API (server-side fallbacks).
 */
export const MODEL = "claude-opus-5-5";
const FALLBACK: { betas: Anthropic.Beta.AnthropicBeta[]; fallbacks: Anthropic.Beta.Messages.BetaFallbacksParam } = {
  betas: ["server-side-fallback-2026-07-01"],
  fallbacks: "default",
};

function clientFor(apiKey: string): Anthropic {
  // The key is the athlete's own, typed on this device: calling from the browser is the point.
  return new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
}

/** The app's error codes for an API failure, by the SDK's typed errors. */
function aiError(e: unknown): Error {
  if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError) return new Error("AI_BAD_KEY");
  if (e instanceof Anthropic.RateLimitError) return new Error("AI_RATE_LIMIT");
  if (e instanceof Anthropic.APIConnectionError) return new Error("AI_OFFLINE");
  if (e instanceof Anthropic.APIError) return new Error(e.message || `AI_FAILED_${e.status}`);
  return e instanceof Error ? e : new Error("AI_FAILED");
}

// The user's Anthropic API key is stored ONLY in localStorage on their device.
// It is never sent to our backend or synced — it goes directly to api.anthropic.com.
const KEY_STORAGE = "traintrack.anthropicApiKey";

export function getApiKey(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(KEY_STORAGE);
}

export function setApiKey(key: string): void {
  window.localStorage.setItem(KEY_STORAGE, key.trim());
}

export function clearApiKey(): void {
  window.localStorage.removeItem(KEY_STORAGE);
}

export interface GenerateProgramInput {
  goal: string;
  daysPerWeek: number;
  experience: string;
  equipment: string[];
  focus?: string;
}

export interface GeneratedProgram {
  name: string;
  description: string;
  structure: ProgramDay[];
}

// JSON schema constraining Claude's output to a program we can store directly.
const PROGRAM_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    name: { type: "string" },
    description: { type: "string" },
    days: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          exercises: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                exerciseName: { type: "string" },
                targetSets: { type: "integer" },
                targetReps: { type: "string" },
                restSec: { type: "integer" },
              },
              required: ["exerciseName", "targetSets", "targetReps", "restSec"],
            },
          },
        },
        required: ["name", "exercises"],
      },
    },
  },
  required: ["name", "description", "days"],
};

/**
 * Generate a training program with Claude, using the user's own API key,
 * called directly from the browser. Returns a structure ready to save.
 */
export async function generateProgram(
  input: GenerateProgramInput,
  apiKey: string
): Promise<GeneratedProgram> {
  const prompt = `You are an expert strength & conditioning coach. Design a structured weekly training program.

Athlete details:
- Primary goal: ${input.goal}
- Training days per week: ${input.daysPerWeek}
- Experience level: ${input.experience}
- Available equipment: ${input.equipment.length ? input.equipment.join(", ") : "full gym"}
${input.focus ? `- Extra focus / notes: ${input.focus}` : ""}

Create exactly ${input.daysPerWeek} training days. For each day give it a clear name (e.g. "Push", "Pull", "Legs", "Upper", "Lower") and 4–7 exercises. For each exercise provide realistic target sets, a rep range as a string (e.g. "8-12"), and rest in seconds. Use common exercise names. Return only the structured program.`;

  const client = clientFor(apiKey);
  let response: Anthropic.Beta.BetaMessage;
  try {
    response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      ...FALLBACK,
      output_config: { effort: "medium", format: { type: "json_schema", schema: PROGRAM_SCHEMA } },
      messages: [{ role: "user", content: prompt }],
    });
  } catch (e) {
    throw aiError(e);
  }
  if (response.stop_reason === "refusal") throw new Error("AI_REFUSED");
  const textBlock = response.content.find((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text");
  if (!textBlock?.text) throw new Error("AI_EMPTY");

  const parsed = JSON.parse(textBlock.text) as {
    name: string;
    description: string;
    days: ProgramDay[];
  };
  return { name: parsed.name, description: parsed.description, structure: parsed.days };
}

export type CoachTurn = { role: "user" | "assistant"; content: string };

/**
 * A question to the assistant about one's own training, answered from a
 * summary of one's data (given in the system prompt), streamed as it is
 * written. The answer explains with the figures given, proposes rather than
 * decides, and says when the data does not tell.
 */
export async function askCoach(input: {
  apiKey: string;
  locale: string;
  context: string;
  history: CoachTurn[];
  question: string;
  onText: (snapshot: string) => void;
}): Promise<string> {
  const language = input.locale === "fr" ? "French" : input.locale === "de" ? "German" : "English";
  const system = `You are the training assistant of TrainTrack, a multi-sport training app. The athlete asks about their own training. Answer in ${language}, briefly (a few short paragraphs or a short list), for someone who is not a sports scientist.

Ground every statement in the athlete's data below: quote the figures and dates you rely on. If the data does not answer the question, say so and say what would (more sessions, an RPE given at the end of sessions, a heart-rate belt…). Never invent sessions, loads or results.

You propose, the athlete decides: you can suggest changes to their programs or week, but you never change anything yourself; point them to the Assistant page's proposals or to their program to apply a change. The training load figures are a guide to dosing, not a prediction of injury; for pain that persists or comes back, or anything medical, tell them to see a health professional.

The athlete's data (as of today):
${input.context}`;
  const client = clientFor(input.apiKey);
  try {
    const stream = client.beta.messages.stream({
      model: MODEL,
      max_tokens: 16000,
      ...FALLBACK,
      output_config: { effort: "medium" },
      system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
      messages: [...input.history, { role: "user", content: input.question }],
    });
    stream.on("text", (_delta, snapshot) => input.onText(snapshot));
    const final = await stream.finalMessage();
    if (final.stop_reason === "refusal") throw new Error("AI_REFUSED");
    return final.content.filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text").map((b) => b.text).join("");
  } catch (e) {
    throw e instanceof Error && e.message === "AI_REFUSED" ? e : aiError(e);
  }
}
