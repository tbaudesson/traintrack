"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useExercises, createCustomExercise } from "@/hooks/useExercises";
import type { MuscleGroup, Equipment } from "@/db";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Search, Loader2, Dumbbell } from "lucide-react";

const MUSCLE_GROUPS: MuscleGroup[] = ["chest", "back", "legs", "shoulders", "arms", "core", "full_body", "other"];
const EQUIPMENT: Equipment[] = ["barbell", "dumbbell", "machine", "cable", "bodyweight", "kettlebell", "bands", "other"];

export default function ExercisesPage() {
  const t = useTranslations("exercises");
  const exercises = useExercises();
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [mg, setMg] = useState<MuscleGroup>("chest");
  const [equip, setEquip] = useState<Equipment>("barbell");
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return exercises.filter((e) => !q || e.name.toLowerCase().includes(q));
  }, [exercises, search]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    for (const e of filtered) {
      const k = e.muscleGroup ?? "other";
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(e);
    }
    return map;
  }, [filtered]);

  async function handleAdd() {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await createCustomExercise({ name: name.trim(), muscleGroup: mg, equipment: equip });
      setName("");
      setAdding(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader
        title={t("title")}
        actions={
          <Button size="sm" onClick={() => setAdding((v) => !v)}>
            <Plus className="mr-1 h-4 w-4" />
            {t("addCustom")}
          </Button>
        }
      />
      <div className="space-y-4 p-4 pb-24">
        {adding && (
          <Card>
            <CardContent className="space-y-3 py-4">
              <Input placeholder={t("name")} value={name} onChange={(e) => setName(e.target.value)} />
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">{t("muscleGroup")}</label>
                <div className="flex flex-wrap gap-1.5">
                  {MUSCLE_GROUPS.map((g) => (
                    <button
                      key={g}
                      onClick={() => setMg(g)}
                      className={`rounded-full border px-2.5 py-1 text-xs ${mg === g ? "border-accent-500 bg-accent-50 text-accent-700 dark:bg-accent-950/40" : "border-border text-muted-foreground"}`}
                    >
                      {t(`mg_${g}`)}
                    </button>
                  ))}
                </div>
              </div>
              <Button onClick={handleAdd} disabled={busy || !name.trim()} className="w-full">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : t("addCustom")}
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("search")}
            className="pl-10"
          />
        </div>

        {MUSCLE_GROUPS.filter((g) => grouped.has(g)).map((g) => (
          <section key={g} className="space-y-1.5">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t(`mg_${g}`)}</h2>
            {grouped.get(g)!.map((e) => (
              <Card key={e.id}>
                <CardContent className="flex items-center gap-3 py-2.5">
                  <Dumbbell className="h-4 w-4 text-accent-500" />
                  <span className="flex-1 text-sm font-medium">{e.name}</span>
                  {e.isCustom && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                      {t("custom")}
                    </span>
                  )}
                </CardContent>
              </Card>
            ))}
          </section>
        ))}
      </div>
    </>
  );
}
