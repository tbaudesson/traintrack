"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Plus, Search, Trash2 } from "lucide-react";
import { FOODS_KEY, MEAL_IDEAS_KEY, MEAL_SLOTS, nameOf, parseFoods, parseMealIdeas, type FoodDef, type FoodTag, type FoodsReference, type MealIdea } from "@/lib/foods";
import { Frame, ListEditor, useSetting } from "@/components/domain/ReferenceTabs";
import { useFoods } from "@/hooks/useFoods";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const blank = { id: "", fr: "", en: "", de: "" };
const select = "h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground";
const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * The foods and the meal ideas (app settings "foods" and "meal_ideas"): the
 * foods with their values per 100 g, portion, tags and whether they keep
 * their portion; the tags and the diets; the meal ideas as foods and grams.
 * Each saved on its own, only when it holds together.
 */
export function FoodsTab() {
  const t = useTranslations("foodsAdmin");
  const [which, setWhich] = useState<"foods" | "diets" | "meals">("foods");
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" role="group" aria-label={t("title")}>
        {(["foods", "diets", "meals"] as const).map((k) => (
          <Button key={k} size="sm" variant={which === k ? "default" : "outline"} aria-pressed={which === k} onClick={() => setWhich(k)}>
            {t(`part_${k}`)}
          </Button>
        ))}
      </div>
      {which === "meals" ? <MealIdeasPart /> : <FoodsPart which={which} />}
    </div>
  );
}

function FoodsPart({ which }: { which: "foods" | "diets" }) {
  const t = useTranslations("foodsAdmin");
  const locale = useLocale();
  const s = useSetting<FoodsReference>(FOODS_KEY, parseFoods);
  const [query, setQuery] = useState("");
  const v = s.value;
  const put = (change: Partial<FoodsReference>) => v && s.change({ ...v, ...change });
  const num = (label: string, value: number | undefined, onChange: (n: number | undefined) => void) => (
    <label className="block space-y-1 text-xs">
      <span className="font-medium">{label}</span>
      <Input type="number" step="any" min={0} value={value ?? ""} onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))} className="h-9" />
    </label>
  );
  const q = fold(query.trim());
  return (
    <Frame
      state={s.state}
      title={t(`part_${which}`)}
      intro={t(`${which}Intro`)}
      missing={t("missing")}
      invalidText={t("invalid")}
      invalid={s.invalid}
      saving={s.saving}
      saved={s.saved}
      onSave={() => v && s.save(JSON.stringify(v, null, 2))}
    >
      {v && which === "foods" && (
        <>
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("search")} aria-label={t("search")} className="pl-10" />
          </label>
          <ListEditor<FoodDef>
            title={t("foods", { count: v.foods.length })}
            rows={v.foods}
            blank={{ ...blank, kcal: 0, protein: 0, carbs: 0, fat: 0, serving: 100, tags: [] }}
            onChange={(foods) => put({ foods })}
            shown={q ? (f) => [f.id, f.fr, f.en, f.de].some((n) => fold(n).includes(q)) : undefined}
            extra={(f, set) => (
              <div className="space-y-2">
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                  {num(t("kcal"), f.kcal, (n) => set({ kcal: n ?? 0 }))}
                  {num(t("protein"), f.protein, (n) => set({ protein: n ?? 0 }))}
                  {num(t("carbs"), f.carbs, (n) => set({ carbs: n ?? 0 }))}
                  {num(t("fat"), f.fat, (n) => set({ fat: n ?? 0 }))}
                  {num(t("serving"), f.serving, (n) => set({ serving: n ?? 0 }))}
                  {num(t("unitG"), f.unitG, (n) => set({ unitG: n || undefined }))}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  {v.tags.map((tag) => (
                    <label key={tag.id} className="flex min-h-9 items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        className="size-4 accent-accent-600"
                        checked={f.tags.includes(tag.id)}
                        onChange={(e) => set({ tags: e.target.checked ? [...f.tags, tag.id] : f.tags.filter((x) => x !== tag.id) })}
                      />
                      {nameOf(v.tags, tag.id, locale)}
                    </label>
                  ))}
                  <label className="flex min-h-9 items-center gap-2 text-xs">
                    <input type="checkbox" className="size-4 accent-accent-600" checked={!!f.keepsPortion} onChange={(e) => set({ keepsPortion: e.target.checked || undefined })} />
                    {t("keepsPortion")}
                  </label>
                </div>
              </div>
            )}
          />
        </>
      )}
      {v && which === "diets" && (
        <>
          <ListEditor<FoodTag>
            title={t("tags")}
            hint={t("tagsHint")}
            rows={v.tags}
            blank={blank}
            onChange={(tags) => put({ tags })}
            extra={(tag, set) => (
              <label className="flex min-h-9 items-center gap-2 text-xs">
                <input type="checkbox" className="size-4 accent-accent-600" checked={!!tag.excludable} onChange={(e) => set({ excludable: e.target.checked || undefined })} />
                {t("excludable")}
              </label>
            )}
          />
          <ListEditor
            title={t("diets")}
            hint={t("dietsHint")}
            rows={v.diets}
            blank={{ ...blank, bans: [] }}
            onChange={(diets) => put({ diets })}
            extra={(d, set) => (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <span className="text-xs font-medium">{t("bans")}</span>
                {v.tags.map((tag) => (
                  <label key={tag.id} className="flex min-h-9 items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      className="size-4 accent-accent-600"
                      checked={d.bans.includes(tag.id)}
                      onChange={(e) => set({ bans: e.target.checked ? [...d.bans, tag.id] : d.bans.filter((x) => x !== tag.id) })}
                    />
                    {nameOf(v.tags, tag.id, locale)}
                  </label>
                ))}
              </div>
            )}
          />
        </>
      )}
    </Frame>
  );
}

function MealIdeasPart() {
  const t = useTranslations("foodsAdmin");
  const locale = useLocale();
  const s = useSetting<MealIdea[]>(MEAL_IDEAS_KEY, parseMealIdeas);
  const foods = useFoods()?.foods ?? [];
  const v = s.value;
  // Every food of an idea must be in the list: one it lacks would never be offered.
  const unknown = (v ?? []).filter((m) => m.items.some(([k]) => !foods.some((f) => f.id === k)));
  return (
    <Frame
      state={s.state}
      title={t("part_meals")}
      intro={t("mealsIntro")}
      missing={t("missing")}
      invalidText={t("invalid")}
      invalid={s.invalid}
      saving={s.saving}
      saved={s.saved}
      onSave={() => v && s.save(JSON.stringify(v, null, 2))}
    >
      {v && (
        <>
          {foods.length > 0 && unknown.length > 0 && (
            <p role="alert" className="text-sm text-destructive">{t("unknownFoods", { names: unknown.map((m) => nameOf([m], m.id, locale)).join(", ") })}</p>
          )}
          <ListEditor<MealIdea>
            title={t("meals", { count: v.length })}
            rows={v}
            blank={{ ...blank, slot: "main", items: [] }}
            onChange={(meals) => s.change(meals)}
            extra={(m, set) => (
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs">
                  <span className="font-medium">{t("slot")}</span>
                  <select className={select} value={m.slot} onChange={(e) => set({ slot: e.target.value as MealIdea["slot"] })}>
                    {MEAL_SLOTS.map((slot) => (
                      <option key={slot} value={slot}>{t(`slot_${slot}`)}</option>
                    ))}
                  </select>
                </label>
                {m.items.map(([k, g], i) => (
                  <div key={i} className="flex items-center gap-2">
                    <select
                      className={`${select} min-w-0 flex-1`}
                      aria-label={t("food")}
                      value={k}
                      onChange={(e) => set({ items: m.items.map((x, j) => (j === i ? [e.target.value, x[1]] : x)) })}
                    >
                      {!foods.some((f) => f.id === k) && <option value={k}>{k}</option>}
                      {foods.map((f) => (
                        <option key={f.id} value={f.id}>{nameOf(foods, f.id, locale)}</option>
                      ))}
                    </select>
                    <Input
                      type="number"
                      min={1}
                      aria-label={t("grams")}
                      value={g}
                      onChange={(e) => set({ items: m.items.map((x, j) => (j === i ? [x[0], Number(e.target.value)] : x)) })}
                      className="h-9 w-20"
                    />
                    <span className="text-xs text-muted-foreground">g</span>
                    <Button variant="ghost" size="icon-sm" aria-label={t("removeFood")} onClick={() => set({ items: m.items.filter((_, j) => j !== i) })}>
                      <Trash2 className="size-4" aria-hidden="true" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" disabled={!foods.length} onClick={() => set({ items: [...m.items, [foods[0].id, 100]] })}>
                  <Plus className="mr-1 size-4" aria-hidden="true" />
                  {t("addFood")}
                </Button>
              </div>
            )}
          />
        </>
      )}
    </Frame>
  );
}
