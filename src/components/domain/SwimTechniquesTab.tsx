"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Loader2, Plus, Trash2, Waves } from "lucide-react";
import { getAppSettings, setAppSetting } from "@/lib/adminService";
import { parseSwimTechniques, SWIM_TECHNIQUES_KEY, type Lang, type SwimTechnique } from "@/lib/swimTechniques";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const LANGS: Lang[] = ["fr", "en", "de"];
const blank = (): SwimTechnique => ({
  key: "",
  kind: "drill",
  name: { fr: "", en: "", de: "" },
  points: { fr: [], en: [], de: [] },
  mistakes: { fr: [], en: [], de: [] },
  video: null,
});

/**
 * The swim technique sheets, as the app reads them (app settings): their
 * names, key points and mistakes in three languages, and their video. A
 * program's session links to a sheet by its key. Saved only when whole.
 */
export function SwimTechniquesTab() {
  const t = useTranslations("swimTechniquesAdmin");
  const ts = useTranslations("sync");
  const [list, setList] = useState<SwimTechnique[] | null>(null);
  const [state, setState] = useState<"loading" | "missing" | "failed" | "ready">("loading");
  const [error, setError] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getAppSettings()
      .then((s) => {
        const parsed = parseSwimTechniques(s[SWIM_TECHNIQUES_KEY]);
        setList(parsed);
        setState(parsed ? "ready" : "missing");
      })
      .catch(() => setState("failed"));
  }, []);

  if (state === "loading") return <Loader2 className="mx-auto my-8 h-6 w-6 animate-spin text-muted-foreground" />;
  if (state === "failed") return <p role="status" className="py-6 text-center text-sm text-muted-foreground">{ts("offline")}</p>;
  if (state === "missing" || !list) return <p role="status" className="py-6 text-center text-sm text-muted-foreground">{t("missing")}</p>;

  const change = (i: number, next: SwimTechnique) => {
    setList(list.map((x, j) => (j === i ? next : x)));
    setError(false);
    setSaved(false);
  };
  const toLines = (v: string) => v.split("\n").map((l) => l.trim()).filter(Boolean);

  async function save() {
    const text = JSON.stringify(list);
    if (!parseSwimTechniques(text)) {
      setError(true);
      return;
    }
    await setAppSetting(SWIM_TECHNIQUES_KEY, text);
    setSaved(true);
  }

  return (
    <Card>
      <CardContent className="space-y-4 py-4">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Waves className="h-4 w-4 text-accent-500" aria-hidden="true" /> {t("title")}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{t("intro")}</p>
        </div>

        {list.map((x, i) => (
          <details key={i} className="rounded-xl border border-border p-3">
            <summary className="cursor-pointer text-sm font-medium">
              {x.name.fr || t("untitled")} <span className="text-xs text-muted-foreground">· {x.key || "—"} · {t(x.kind)}</span>
            </summary>
            <div className="mt-3 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <label className="block text-xs text-muted-foreground">
                  {t("key")}
                  <Input value={x.key} onChange={(e) => change(i, { ...x, key: e.target.value.trim().toLowerCase() })} className="mt-0.5 h-9" />
                </label>
                <label className="block text-xs text-muted-foreground">
                  {t("kind")}
                  <select className="mt-0.5 h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={x.kind} onChange={(e) => change(i, { ...x, kind: e.target.value as SwimTechnique["kind"] })}>
                    <option value="stroke">{t("stroke")}</option>
                    <option value="drill">{t("drill")}</option>
                  </select>
                </label>
              </div>
              <label className="block text-xs text-muted-foreground">
                {t("video")}
                <Input value={x.video ?? ""} onChange={(e) => change(i, { ...x, video: e.target.value.trim() || null })} className="mt-0.5 h-9" placeholder="https://www.youtube.com/watch?v=…" />
              </label>
              {LANGS.map((l) => (
                <fieldset key={l} className="space-y-1.5 rounded-lg bg-muted/40 p-2">
                  <legend className="text-xs font-semibold uppercase text-muted-foreground">{l}</legend>
                  <Input aria-label={`${t("name")} (${l})`} placeholder={t("name")} value={x.name[l]} onChange={(e) => change(i, { ...x, name: { ...x.name, [l]: e.target.value } })} className="h-9" />
                  <textarea
                    aria-label={`${t("points")} (${l})`}
                    placeholder={t("points")}
                    className="min-h-20 w-full rounded-md border border-input bg-background p-2 text-sm"
                    defaultValue={x.points[l].join("\n")}
                    onBlur={(e) => change(i, { ...x, points: { ...x.points, [l]: toLines(e.target.value) } })}
                  />
                  <textarea
                    aria-label={`${t("mistakes")} (${l})`}
                    placeholder={t("mistakes")}
                    className="min-h-14 w-full rounded-md border border-input bg-background p-2 text-sm"
                    defaultValue={x.mistakes[l].join("\n")}
                    onBlur={(e) => change(i, { ...x, mistakes: { ...x.mistakes, [l]: toLines(e.target.value) } })}
                  />
                </fieldset>
              ))}
              <Button variant="outline" size="sm" onClick={() => { setList(list.filter((_, j) => j !== i)); setSaved(false); }}>
                <Trash2 className="mr-1 h-4 w-4" aria-hidden="true" />
                {t("remove")}
              </Button>
            </div>
          </details>
        ))}

        <Button variant="outline" className="w-full" onClick={() => { setList([...list, blank()]); setSaved(false); }}>
          <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
          {t("add")}
        </Button>
        <p className="text-xs text-muted-foreground">{t("linesHint")}</p>
        {error && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{t("invalid")}</p>}
        <Button onClick={save} className="w-full">
          {saved ? <><Check className="mr-1 h-4 w-4" aria-hidden="true" />{t("saved")}</> : t("save")}
        </Button>
      </CardContent>
    </Card>
  );
}
