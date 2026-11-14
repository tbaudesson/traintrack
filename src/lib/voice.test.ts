import { expect, it } from "vitest";
import { stepAnnouncement, type VoiceWords } from "./voice";

const words: VoiceWords = {
  name: (n) => n.toLowerCase(),
  getReady: (w) => `Get ready: ${w}.`,
  work: (w, s) => `${w}, ${s} s.`,
  side: (s) => `${s} side`,
  rest: (s) => `Rest ${s} s.`,
  recovery: (s) => `Recovery ${s} s.`,
  next: (w) => `Next: ${w}.`,
};

const steps = [
  { type: "work" as const, exercise: { name: "Burpee" }, seconds: 40 },
  { type: "rest" as const, seconds: 20 },
  { type: "work" as const, exercise: { name: "Side Plank" }, seconds: 30, side: "left" as const },
  { type: "rest" as const, seconds: 60, recovery: true },
  { type: "work" as const, exercise: { name: "Sprint" }, seconds: 30, phase: "Standing" },
];

it("announces what starts, and during a rest what comes next", () => {
  expect(stepAnnouncement(steps, -1, words)).toBe("Get ready: burpee.");
  expect(stepAnnouncement(steps, 0, words)).toBe("burpee, 40 s.");
  expect(stepAnnouncement(steps, 1, words)).toBe("Rest 20 s. Next: side plank, left side.");
  expect(stepAnnouncement(steps, 3, words)).toBe("Recovery 60 s. Next: Standing, sprint.");
  expect(stepAnnouncement(steps, 4, words)).toBe("Standing, sprint, 30 s.");
});

it("says only the rest when nothing follows", () => {
  expect(stepAnnouncement([{ type: "rest", seconds: 10 }], 0, words)).toBe("Rest 10 s.");
  expect(stepAnnouncement([], -1, words)).toBe("");
});
