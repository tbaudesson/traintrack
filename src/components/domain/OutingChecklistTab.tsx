"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, ListChecks, Loader2, Plus, Trash2 } from "lucide-react";
import { getAppSettings, setAppSetting } from "@/lib/adminService";
import { OUTING_CHECKLIST_KEY, parseChecklist, type ChecklistItem, type ChecklistSection, type Lang } from "@/lib/outingChecklist";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const LANGS: Lang[] = ["fr", "en", "de"];
const empty = { fr: "", en: "", de: "" };

/**
 * The pre-departure checklist, as the app reads it (app settings): its
 * sections and items in three languages, each item for every outing or only
 * for a night out on one's own. Saved only when whole.
 */
export function OutingChecklistTab() {
  const t = useTranslations("outingChecklistAdmin");
  const ts = useTranslations("sync");
  const [list, setList] = useState<ChecklistSection[] | null>(null);
  const [state, setState] = useState<"loading" | "missing" | "failed" | "ready">("loading");
  const [error, setError] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getAppSettings()
      .then((s) => {
        const parsed = parseChecklist(s[OUTING_CHECKLIST_KEY]);
        setList(parsed);
        setState(parsed ? "ready" : "missing");
      })
      .catch(() => setState("failed"));
  }, []);

  if (state === "loading") return <Loader2 className="mx-auto my-8 h-6 w-6 animate-spin text-muted-foreground" />;
  if (state === "failed") return <p role="status" className="py-6 text-center text-sm text-muted-foreground">{ts("offline")}</p>;
  if (state === "missing" || !list) return <p role="status" className="py-6 text-center text-sm text-muted-foreground">{t("missing")}</p>;

  const put = (next: ChecklistSection[]) => {
    setList(next);
    setError(false);
    setSaved(false);
  };
  const setSection = (si: number, s: ChecklistSection) => put(list.map((x, j) => (j === si ? s : x)));
  const setItem = (si: number, ii: number, item: ChecklistItem) => setSection(si, { ...list[si], items: list[si].items.map((x, j) => (j === ii ? item : x)) });

  async function save() {
    const text = JSON.stringify(list);
    if (!parseChecklist(text)) {
      setError(true);
      return;
    }
    await setAppSetting(OUTING_CHECKLIST_KEY, text);
    setSaved(true);
  }

  return (
    <Card>
      <CardContent className="space-y-4 py-4">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold">
            <ListChecks className="h-4 w-4 text-accent-500" aria-hidden="true" /> {t("title")}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{t("intro")}</p>
        </div>

        {list.map((s, si) => (
          <details key={si} className="rounded-xl border border-border p-3">
            <summary className="cursor-pointer text-sm font-medium">
              {s.title.fr || t("untitled")} <span className="text-xs text-muted-foreground">· {t("count", { count: s.items.length })}</span>
            </summary>
            <div className="mt-3 space-y-3">
              <div className="grid gap-1.5 sm:grid-cols-3">
                {LANGS.map((l) => (
                  <Input key={l} aria-label={`${t("sectionTitle")} (${l})`} placeholder={`${t("sectionTitle")} (${l})`} value={s.title[l]} onChange={(e) => setSection(si, { ...s, title: { ...s.title, [l]: e.target.value } })} className="h-9" />
                ))}
              </div>
              {s.items.map((item, ii) => (
                <div key={ii} className="space-y-1.5 rounded-lg bg-muted/40 p-2">
                  {LANGS.map((l) => (
                    <Input key={l} aria-label={`${t("item")} (${l})`} placeholder={`${t("item")} (${l})`} value={item.text[l]} onChange={(e) => setItem(si, ii, { ...item, text: { ...item.text, [l]: e.target.value } })} className="h-9" />
                  ))}
                  <div className="flex items-center justify-between gap-2">
                    <label className="flex items-center gap-2 text-xs">
                      <input type="checkbox" className="size-4 accent-accent-600" checked={!!item.autonomy} onChange={(e) => setItem(si, ii, { ...item, autonomy: e.target.checked || undefined })} />
                      {t("autonomyOnly")}
                    </label>
                    <Button variant="ghost" size="sm" onClick={() => setSection(si, { ...s, items: s.items.filter((_, j) => j !== ii) })}>
                      <Trash2 className="mr-1 h-4 w-4" aria-hidden="true" />
                      {t("removeItem")}
                    </Button>
                  </div>
                </div>
              ))}
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => setSection(si, { ...s, items: [...s.items, { key: `item-${Date.now().toString(36)}`, text: { ...empty } }] })}>
                  <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
                  {t("addItem")}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => put(list.filter((_, j) => j !== si))}>
                  <Trash2 className="mr-1 h-4 w-4" aria-hidden="true" />
                  {t("removeSection")}
                </Button>
              </div>
            </div>
          </details>
        ))}

        <Button variant="outline" className="w-full" onClick={() => put([...list, { key: `section-${Date.now().toString(36)}`, title: { ...empty }, items: [{ key: `item-${Date.now().toString(36)}`, text: { ...empty } }] }])}>
          <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
          {t("addSection")}
        </Button>
        {error && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{t("invalid")}</p>}
        <Button onClick={save} className="w-full">
          {saved ? <><Check className="mr-1 h-4 w-4" aria-hidden="true" />{t("saved")}</> : t("save")}
        </Button>
      </CardContent>
    </Card>
  );
}
