import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { itemsFor, parseChecklist } from "./outingChecklist";

// The list as migration 063 seeds it: the tests read the very data the app does.
const sql = readFileSync("supabase/migrations/063_outing_checklist.sql", "utf8");
const list = parseChecklist(sql.slice(sql.indexOf("["), sql.lastIndexOf("]") + 1).replace(/''/g, "'"))!;

describe("the pre-departure checklist", () => {
  it("is seeded whole by migration 063, in three languages", () => {
    expect(list).not.toBeNull();
    expect(list.flatMap((s) => s.items).length).toBeGreaterThan(15);
  });

  it("asks the essentials of every outing: route left with someone, weather, turnaround time, water, light, first aid", () => {
    const everyday = itemsFor(list, false).flatMap((s) => s.items.map((i) => i.key));
    for (const k of ["route", "weather", "turnaround", "water", "headlamp", "first-aid", "emergency"]) expect(everyday, k).toContain(k);
  });

  it("adds what a night out on one's own needs, only then", () => {
    const everyday = itemsFor(list, false).flatMap((s) => s.items.map((i) => i.key));
    const autonomy = itemsFor(list, true).flatMap((s) => s.items.map((i) => i.key));
    for (const k of ["shelter", "purify", "spare-day"]) {
      expect(everyday).not.toContain(k);
      expect(autonomy).toContain(k);
    }
  });

  it("is refused when an item is empty in a language, or a key repeats", () => {
    const broken = (change: (x: typeof list) => void) => {
      const copy = structuredClone(list);
      change(copy);
      return parseChecklist(JSON.stringify(copy));
    };
    expect(broken((x) => { x[0].items[0].text.de = " "; })).toBeNull();
    expect(broken((x) => { x[1].items[0].key = x[0].items[0].key; })).toBeNull();
    expect(broken((x) => { x[0].items = []; })).toBeNull();
  });
});
