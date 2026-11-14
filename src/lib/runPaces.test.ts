import { describe, expect, it } from "vitest";
import { formatPace, parseTime, hrZoneOf, metersIn, raceShare, secondsFor, vmaFromHalfCooper, vmaFromRace, zonePaces } from "./runPaces";

describe("runPaces", () => {
  it("reads a race at a share of the VMA, lower the longer it is", () => {
    expect(raceShare(1500)).toBe(1);
    expect(raceShare(5000)).toBeCloseTo(0.95);
    expect(raceShare(10000)).toBeCloseTo(0.9);
    expect(raceShare(7000)).toBeGreaterThan(0.9);
    expect(raceShare(7000)).toBeLessThan(0.95);
    expect(raceShare(100000)).toBe(0.8);
  });

  it("gives the VMA of a race result", () => {
    // 10 km in 50 min: 12 km/h at 90 % of the VMA.
    expect(vmaFromRace(10000, 3000)).toBe(13.3);
    // 5 km in 20 min: 15 km/h at 95 %.
    expect(vmaFromRace(5000, 1200)).toBe(15.8);
    expect(vmaFromRace(800, 180)).toBeNull();
    expect(vmaFromRace(5000, 300)).toBeNull();
  });

  it("gives the VMA of the half-Cooper test", () => {
    expect(vmaFromHalfCooper(1450)).toBe(14.5);
    expect(vmaFromHalfCooper(300)).toBeNull();
  });

  it("turns zones into paces and blocks into time or distance", () => {
    expect(zonePaces(15, "vma").map(formatPace)).toEqual(["4:05", "3:55"]);
    expect(formatPace(zonePaces(15, "easy")[0])).toBe("6:09");
    expect(secondsFor(15, "vma", 400)).toBe(96);
    expect(metersIn(15, "easy", 600)).toBe(1750);
  });

  it("reads a race time", () => {
    expect(parseTime("1:45:30")).toBe(6330);
    expect(parseTime("48:30")).toBe(2910);
    expect(parseTime("45")).toBe(2700);
    expect(parseTime("1h45")).toBe(6300);
    expect(parseTime("abc")).toBeNull();
  });

  it("reads the zone of a plan's intensity", () => {
    expect(hrZoneOf("Zone 4")).toBe(4);
    expect(hrZoneOf("allure marathon")).toBeNull();
  });
});
