"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useExercises, createCustomExercise, updateExercise, deleteExercise, patchExerciseLocal } from "@/hooks/useExercises";
import { useAuth } from "@/contexts/AuthContext";
import { adminUpdateExerciseContent } from "@/lib/adminService";
import type { Exercise, MuscleGroup, Equipment } from "@/db";
import { PageHeader } from "@/components/layout/PageHeader";
import { VideoEmbed } from "@/components/domain/VideoEmbed";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Plus, Search, Loader2, Dumbbell, ChevronDown, ChevronUp, Pencil, Trash2, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

const MUSCLE_GROUPS: MuscleGroup[] = ["chest", "back", "legs", "shoulders", "arms", "core", "full_body", "other"];
const EQUIPMENT: Equipment[] = ["barbell", "dumbbell", "machine", "cable", "bodyweight", "kettlebell", "bands", "other"];

export default function ExercisesPage() {
  const t = useTranslations("exercises");
  const exercises = useExercises();
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);

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
        {adding && <AddExerciseForm onDone={() => setAdding(false)} />}

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("search")} className="pl-10" />
        </div>

        {MUSCLE_GROUPS.filter((g) => grouped.has(g)).map((g) => (
          <section key={g} className="space-y-1.5">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t(`mg_${g}`)}</h2>
            {grouped.get(g)!.map((e) => (
              <ExerciseRow key={e.id} ex={e} />
            ))}
          </section>
        ))}
      </div>
    </>
  );
}

function AddExerciseForm({ onDone }: { onDone: () => void }) {
  const t = useTranslations("exercises");
  const [name, setName] = useState("");
  const [mg, setMg] = useState<MuscleGroup>("chest");
  const [equip, setEquip] = useState<Equipment>("barbell");
  const [description, setDescription] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleAdd() {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await createCustomExercise({
        name: name.trim(), muscleGroup: mg, equipment: equip,
        description: description.trim() || undefined,
        videoUrl: videoUrl.trim() || undefined,
      });
      onDone();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardContent className="space-y-3 py-4">
        <Input placeholder={t("name")} value={name} onChange={(e) => setName(e.target.value)} />
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">{t("muscleGroup")}</label>
          <div className="flex flex-wrap gap-1.5">
            {MUSCLE_GROUPS.map((g) => (
              <button key={g} onClick={() => setMg(g)}
                className={cn("rounded-full border px-2.5 py-1 text-xs", mg === g ? "border-accent-500 bg-accent-50 text-accent-700 dark:bg-accent-950/40" : "border-border text-muted-foreground")}>
                {t(`mg_${g}`)}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground">{t("equipment")}</label>
          <div className="flex flex-wrap gap-1.5">
            {EQUIPMENT.map((eq) => (
              <button key={eq} onClick={() => setEquip(eq)}
                className={cn("rounded-full border px-2.5 py-1 text-xs", equip === eq ? "border-accent-500 bg-accent-50 text-accent-700 dark:bg-accent-950/40" : "border-border text-muted-foreground")}>
                {eq}
              </button>
            ))}
          </div>
        </div>
        <Input placeholder={t("descPlaceholder")} value={description} onChange={(e) => setDescription(e.target.value)} />
        <Input placeholder={t("videoPlaceholder")} value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} />
        <Button onClick={handleAdd} disabled={busy || !name.trim()} className="w-full">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : t("addCustom")}
        </Button>
      </CardContent>
    </Card>
  );
}

function ExerciseRow({ ex }: { ex: Exercise }) {
  const t = useTranslations("exercises");
  const { isAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState(ex.name);
  const [description, setDescription] = useState(ex.description ?? "");
  const [videoUrl, setVideoUrl] = useState(ex.videoUrl ?? "");
  const hasDetail = !!ex.description || !!ex.videoUrl;
  // Custom exercises are fully editable by their owner; admins can also curate
  // the description/video on the shared built-in library.
  const canEdit = ex.isCustom || isAdmin;

  async function save() {
    setBusy(true);
    try {
      if (ex.isCustom) {
        await updateExercise(ex.id!, {
          name: name.trim() || ex.name,
          description: description.trim() || undefined,
          videoUrl: videoUrl.trim() || undefined,
        });
      } else if (isAdmin && ex.uuid) {
        // Built-in row: write server-side via the admin RPC, then reflect locally.
        await adminUpdateExerciseContent(ex.uuid, description.trim(), videoUrl.trim());
        await patchExerciseLocal(ex.id!, {
          description: description.trim() || undefined,
          videoUrl: videoUrl.trim() || undefined,
        });
      }
      setEditing(false);
      setOpen(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardContent className="py-2.5">
        <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-3 text-left">
          <Dumbbell className="h-4 w-4 text-accent-500" />
          <span className="flex-1 text-sm font-medium">{ex.name}</span>
          {ex.isCustom && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">{t("custom")}</span>
          )}
          {(hasDetail || canEdit) && (open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />)}
        </button>

        {open && (
          <div className="mt-2 space-y-2 border-t border-border pt-2">
            {editing ? (
              <>
                {ex.isCustom && <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("name")} />}
                <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t("descPlaceholder")} />
                <Input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder={t("videoPlaceholder")} />
                <p className="text-[11px] text-muted-foreground">{t("videoEmbedHint")}</p>
                <div className="flex gap-2">
                  <Button size="sm" onClick={save} disabled={busy} className="flex-1">
                    {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Check className="mr-1 h-4 w-4" />}{t("save")}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(false)}><X className="h-4 w-4" /></Button>
                </div>
              </>
            ) : (
              <>
                {ex.description && <p className="text-sm text-muted-foreground">{ex.description}</p>}
                {ex.videoUrl && <VideoEmbed url={ex.videoUrl} />}
                {!hasDetail && !ex.isCustom && (
                  <p className="text-xs text-muted-foreground">{ex.equipment ?? ""}</p>
                )}
                {canEdit && (
                  <div className="flex gap-2 pt-1">
                    <Button size="xs" variant="outline" onClick={() => setEditing(true)}>
                      <Pencil className="mr-1 h-3 w-3" />{t("edit")}
                    </Button>
                    {ex.isCustom && (
                      <Button size="xs" variant="ghost" className="text-destructive" onClick={() => ex.id && deleteExercise(ex.id)}>
                        <Trash2 className="mr-1 h-3 w-3" />{t("delete")}
                      </Button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
