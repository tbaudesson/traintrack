import type { FoodItem } from "./foodCatalog";

const round1 = (v: unknown): number => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? Math.round(n * 10) / 10 : 0;
};

/**
 * Look up a barcode via the free Open Food Facts API and map it to a FoodItem
 * (per-100g macros). Returns null if the product is unknown or has no data.
 */
export async function lookupBarcode(code: string): Promise<FoodItem | null> {
  const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=product_name,brands,nutriments,serving_quantity`;
  let data: {
    status?: number;
    product?: {
      product_name?: string;
      brands?: string;
      serving_quantity?: number | string;
      nutriments?: Record<string, number | string>;
    };
  };
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    data = await res.json();
  } catch {
    return null;
  }
  if (data.status !== 1 || !data.product) return null;

  const p = data.product;
  const n = p.nutriments ?? {};
  let kcal = Number(n["energy-kcal_100g"]);
  if (!Number.isFinite(kcal) && n["energy_100g"]) kcal = Number(n["energy_100g"]) / 4.184; // kJ → kcal
  if (!Number.isFinite(kcal)) kcal = 0;

  const name = [p.product_name, p.brands].filter(Boolean).join(" · ") || `Product ${code}`;
  const serving = p.serving_quantity ? Number(p.serving_quantity) : 100;

  return {
    name: name.slice(0, 80),
    kcal: Math.round(kcal),
    protein: round1(n["proteins_100g"]),
    carbs: round1(n["carbohydrates_100g"]),
    fat: round1(n["fat_100g"]),
    serving: Number.isFinite(serving) && serving > 0 ? serving : 100,
    cat: "snack",
  };
}
