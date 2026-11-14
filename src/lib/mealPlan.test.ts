import { describe, expect, it } from "vitest";
import { DEFAULT_MEAL_PREFS, MEALS, mealTags, suits } from "./mealCatalog";
import { dayTypeOf, macrosOf, planDay, scaleMeal } from "./mealPlan";

const prefs = DEFAULT_MEAL_PREFS;

describe("mealCatalog", () => {
  it("has ideas for every slot, whatever the diet", () => {
    for (const diet of ["omnivore", "pescetarian", "vegetarian", "vegan"] as const) {
      for (const slot of ["breakfast", "main", "snack"] as const) {
        expect(MEALS.filter((m) => m.slot === slot && suits(m, { diet, exclude: [] })).length, `${diet} ${slot}`).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it("still has something for each slot with any one food left out", () => {
    for (const diet of ["omnivore", "vegetarian", "vegan"] as const) {
      for (const one of ["lactose", "gluten", "nuts", "egg", "soy", "fish", "pork"] as const) {
        for (const slot of ["breakfast", "main", "snack"] as const) {
          expect(MEALS.some((m) => m.slot === slot && suits(m, { diet, exclude: [one] })), `${diet} without ${one}: ${slot}`).toBe(true);
        }
      }
    }
  });

  it("keeps meat and fish out for a vegetarian, and animal foods for a vegan", () => {
    expect(MEALS.filter((m) => suits(m, { diet: "vegetarian", exclude: [] })).some((m) => mealTags(m).has("meat") || mealTags(m).has("fish"))).toBe(false);
    expect(MEALS.filter((m) => suits(m, { diet: "vegan", exclude: [] })).some((m) => ["egg", "lactose", "honey"].some((t) => mealTags(m).has(t as never)))).toBe(false);
    expect(suits(MEALS.find((m) => m.id === "porridge")!, { diet: "omnivore", exclude: ["lactose"] })).toBe(false);
  });
});

describe("scaleMeal", () => {
  it("brings a meal near the calories asked, the vegetables kept", () => {
    const meal = MEALS.find((m) => m.id === "chickenRice")!;
    const base = macrosOf(meal.items).calories;
    const bigger = scaleMeal(meal, base * 1.5);
    expect(macrosOf(bigger).calories).toBeGreaterThan(base * 1.4);
    expect(macrosOf(bigger).calories).toBeLessThan(base * 1.6);
    expect(bigger.find(([k]) => k === "broccoli")?.[1]).toBe(150);
  });

  it("keeps whole eggs, whole or half fruits, and round grams", () => {
    const eggs = scaleMeal(MEALS.find((m) => m.id === "eggsBread")!, 400);
    const egg = eggs.find(([k]) => k === "egg")![1];
    expect(egg % 55).toBe(0);
    const banana = scaleMeal(MEALS.find((m) => m.id === "bananaPb")!, 400).find(([k]) => k === "banana")![1];
    expect(banana % 60).toBe(0);
    expect(eggs.find(([k]) => k === "bread")![1] % 5).toBe(0);
  });
});

describe("planDay", () => {
  const day = planDay({ calories: 2400, protein: 150, type: "training", prefs, seed: 3 });

  it("shares the day's calories between four meals, close to the target", () => {
    expect(day.meals.map((m) => m.slot)).toEqual(["breakfast", "lunch", "snack", "dinner"]);
    expect(Math.abs(day.total.calories - 2400)).toBeLessThan(2400 * 0.12);
    expect(new Set(day.meals.map((m) => m.meal.id)).size).toBe(4);
  });

  it("eats more on a long day and less on a rest day", () => {
    expect(planDay({ calories: 2400, protein: 150, type: "long", prefs, seed: 3 }).calories).toBe(2690);
    expect(planDay({ calories: 2400, protein: 150, type: "rest", prefs, seed: 3 }).calories).toBe(2210);
  });

  it("gives another idea for a slot when asked, and three meals when wanted", () => {
    const other = planDay({ calories: 2400, protein: 150, type: "training", prefs, seed: 3, swaps: { lunch: 1 } });
    expect(other.meals[1].meal.id).not.toBe(day.meals[1].meal.id);
    expect(planDay({ calories: 2000, protein: 120, type: "rest", prefs: { ...prefs, meals: 3 }, seed: 1 }).meals.map((m) => m.slot)).toEqual(["breakfast", "lunch", "dinner"]);
  });

  it("follows the diet", () => {
    const vegan = planDay({ calories: 2200, protein: 120, type: "training", prefs: { diet: "vegan", exclude: ["gluten"], meals: 4 }, seed: 5 });
    expect(vegan.meals.length).toBe(4);
    expect(vegan.meals.every((m) => suits(m.meal, { diet: "vegan", exclude: ["gluten"] }))).toBe(true);
  });
});

describe("dayTypeOf", () => {
  it("reads the day from its sessions", () => {
    expect(dayTypeOf([])).toBe("rest");
    expect(dayTypeOf([{ strength: true }])).toBe("training");
    expect(dayTypeOf([{ cardio: { distanceKm: 18 } }])).toBe("long");
    expect(dayTypeOf([{ cardio: { durationMin: 45 } }])).toBe("training");
  });
});

describe("meal texts", () => {
  it("name every meal and food in the three languages", async () => {
    const { INGREDIENTS } = await import("./mealCatalog");
    for (const lang of ["fr", "en", "de"]) {
      const messages = (await import(`../messages/${lang}.json`)).default as { meals: Record<string, string>; food: Record<string, string> };
      expect(MEALS.filter((m) => !messages.meals[m.id]).map((m) => m.id), lang).toEqual([]);
      expect(Object.keys(INGREDIENTS).filter((k) => !messages.food[k]), lang).toEqual([]);
    }
  });
});
