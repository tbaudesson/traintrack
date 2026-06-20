import type { ProgramDay } from "@/db";

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

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-opus-4-8",
      max_tokens: 4000,
      output_config: {
        format: { type: "json_schema", schema: PROGRAM_SCHEMA },
      },
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    let detail = "";
    try {
      const err = await res.json();
      detail = err?.error?.message ?? "";
    } catch {
      /* ignore */
    }
    if (res.status === 401) throw new Error("AI_BAD_KEY");
    if (res.status === 429) throw new Error("AI_RATE_LIMIT");
    throw new Error(detail || `AI request failed (${res.status})`);
  }

  const data = await res.json();
  const textBlock = (data.content ?? []).find((b: { type: string }) => b.type === "text");
  if (!textBlock?.text) throw new Error("AI_EMPTY");

  const parsed = JSON.parse(textBlock.text) as {
    name: string;
    description: string;
    days: ProgramDay[];
  };
  return { name: parsed.name, description: parsed.description, structure: parsed.days };
}
