import { describe, expect, it } from "vitest";
import { parseFoods, searchFoods } from "./foods";
import { settingFromMigrations } from "./settingsFromMigrations";

const foods = parseFoods(settingFromMigrations("096_foods.sql", "foods"))!.foods;

describe("searchFoods", () => {
  it("finds a food by its name in any of the three languages, named in the app's", () => {
    expect(searchFoods(foods, "poulet", "fr").map((f) => f.name)).toContain("Blanc de poulet cuit");
    expect(searchFoods(foods, "chicken", "fr").map((f) => f.name)).toContain("Blanc de poulet cuit");
    expect(searchFoods(foods, "Hähnchen", "en").length).toBeGreaterThan(0);
  });

  it("ignores accents and case, and nothing typed finds nothing", () => {
    expect(searchFoods(foods, "ECREME", "fr").map((f) => f.name)).toContain("Lait écrémé");
    expect(searchFoods(foods, "  ", "fr")).toEqual([]);
  });

  it("gives the values per 100 g and the usual portion", () => {
    const [rice] = searchFoods(foods, "riz complet", "fr");
    expect(rice).toMatchObject({ kcal: 123, protein: 2.7, carbs: 26, fat: 1, serving: 200 });
  });
});
