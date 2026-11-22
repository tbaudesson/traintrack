import { describe, expect, it } from "vitest";
import { cardioMinutes, expressCardio, usualSpeed } from "./express";

const run = (date: string, km: number, min: number) => ({ date, kind: "cardio", sport: "run", distanceM: km * 1000, durationSec: min * 60 });

describe("an endurance session in less time", () => {
  it("knows how long it takes: its time, its blocks, or its distance at one's usual speed", () => {
    expect(cardioMinutes({ sport: "run", durationMin: 50 }, null)).toBe(50);
    expect(cardioMinutes({ sport: "bike", blocks: [{ kind: "seated", sec: 600, rpm: [80, 90], resistance: 4 }, { kind: "climb", sec: 1200, rpm: [60, 70], resistance: 7 }] }, null)).toBe(30);
    const speed = usualSpeed([run("2026-11-01", 10, 50), run("2026-11-08", 10, 60), run("2026-11-15", 10, 55)], "run", 1000);
    expect(speed).toBeCloseTo(10000 / (55 * 60));
    expect(cardioMinutes({ sport: "run", distanceKm: 12 }, speed)).toBe(66);
    expect(cardioMinutes({ sport: "run", distanceKm: 12 }, null)).toBeNull();
  });

  it("keeps the intensity and the purpose, the distance in proportion, the step-by-step left out", () => {
    const day = { name: "Sortie longue", exercises: [], cardio: { sport: "run" as const, distanceKm: 12, durationMin: 70, intensity: "Z2", purpose: "Endurance", steps: ["10 min échauffement", "50 min Z2", "10 min retour au calme"] } };
    const { day: short, stepsDropped } = expressCardio(day, 70, 30);
    expect(short.cardio).toMatchObject({ durationMin: 30, distanceKm: 5, intensity: "Z2", purpose: "Endurance" });
    expect(short.cardio?.steps).toBeUndefined();
    expect(short.name).toBe("Sortie longue");
    expect(stepsDropped).toBe(true);
  });

  it("rounds a swim to 50 m and shortens each block of a guided ride alike", () => {
    expect(expressCardio({ name: "Nage", exercises: [], cardio: { sport: "swim", distanceKm: 2, durationMin: 60 } }, 60, 20).day.cardio?.distanceKm).toBe(0.65);
    const ride = { name: "Spin", exercises: [], cardio: { sport: "bike" as const, blocks: [{ kind: "seated" as const, sec: 600, rpm: [80, 90] as [number, number], resistance: 4 }, { kind: "climb" as const, sec: 1200, rpm: [60, 70] as [number, number], resistance: 7 }] } };
    expect(expressCardio(ride, 30, 15).day.cardio?.blocks?.map((b) => b.sec)).toEqual([300, 600]);
  });

  it("leaves a session that already fits as it is", () => {
    const day = { name: "Footing", exercises: [], cardio: { sport: "run" as const, durationMin: 20 } };
    expect(expressCardio(day, 20, 30).day).toBe(day);
  });
});
