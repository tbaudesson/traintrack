"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Loader2, Plus, Trash2 } from "lucide-react";
import { getAppSettings, setAppSetting } from "@/lib/adminService";
import { MUSIC_KEY, parseMusicApps, type MusicApp } from "@/lib/music";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Row = Omit<MusicApp, "playlistPrefixes"> & { prefixes: string };
const toRow = (a: MusicApp): Row => ({ id: a.id, name: a.name, appUrl: a.appUrl, webUrl: a.webUrl, prefixes: a.playlistPrefixes.join("\n") });
const fromRow = (r: Row): MusicApp => ({
  id: r.id.trim(),
  name: r.name.trim(),
  appUrl: r.appUrl.trim(),
  webUrl: r.webUrl.trim(),
  playlistPrefixes: r.prefixes.split(/\s+/).filter(Boolean),
});

/**
 * The music apps an athlete can open from a session (app settings): how each
 * opens on a phone (its own address, "spotify:") and on a computer (its web
 * player), and the beginnings of its playlist links. Saved only when whole.
 */
export function MusicAppsTab() {
  const t = useTranslations("music");
  const ts = useTranslations("sync");
  const [rows, setRows] = useState<Row[]>([]);
  const [state, setState] = useState<"loading" | "missing" | "failed" | "ready">("loading");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    getAppSettings()
      .then((s) => {
        const parsed = parseMusicApps(s[MUSIC_KEY]);
        if (parsed) setRows(parsed.map(toRow));
        setState(parsed ? "ready" : "missing");
      })
      .catch(() => setState("failed"));
  }, []);

  if (state === "loading") return <Loader2 className="mx-auto my-8 h-6 w-6 animate-spin text-muted-foreground" />;
  if (state === "failed") return <p role="status" className="py-6 text-center text-sm text-muted-foreground">{ts("offline")}</p>;
  if (state === "missing") return <p role="status" className="py-6 text-center text-sm text-muted-foreground">{t("adminMissing")}</p>;

  const setRow = (i: number, change: Partial<Row>) => {
    setRows(rows.map((r, j) => (j === i ? { ...r, ...change } : r)));
    setSaved(false);
    setInvalid(false);
  };
  async function save() {
    const text = JSON.stringify(rows.map(fromRow), null, 2);
    if (!parseMusicApps(text)) return setInvalid(true);
    setSaving(true);
    try {
      await setAppSetting(MUSIC_KEY, text);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  const field = (i: number, key: keyof Omit<Row, "prefixes">, label: string) => (
    <label className="block space-y-1 text-xs">
      <span className="font-medium">{label}</span>
      <Input value={rows[i][key]} onChange={(e) => setRow(i, { [key]: e.target.value })} />
    </label>
  );

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{t("adminTitle")}</h2>
        <p className="text-sm text-muted-foreground">{t("adminIntro")}</p>
      </div>
      {rows.map((r, i) => (
        <Card key={i}>
          <CardContent className="grid gap-2 py-4 sm:grid-cols-2">
            {field(i, "name", t("adminName"))}
            {field(i, "id", t("adminId"))}
            {field(i, "appUrl", t("adminAppUrl"))}
            {field(i, "webUrl", t("adminWebUrl"))}
            <label className="block space-y-1 text-xs sm:col-span-2">
              <span className="font-medium">{t("adminPrefixes")}</span>
              <textarea
                value={r.prefixes}
                rows={2}
                onChange={(e) => setRow(i, { prefixes: e.target.value })}
                className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground"
              />
            </label>
            <Button
              variant="ghost"
              size="sm"
              className="justify-self-start text-destructive"
              onClick={() => {
                setRows(rows.filter((_, j) => j !== i));
                setSaved(false);
              }}
            >
              <Trash2 className="mr-1 h-4 w-4" aria-hidden="true" />
              {t("adminRemove", { app: r.name || r.id })}
            </Button>
          </CardContent>
        </Card>
      ))}
      <Button variant="outline" onClick={() => setRows([...rows, { id: "", name: "", appUrl: "", webUrl: "https://", prefixes: "" }])}>
        <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
        {t("adminAdd")}
      </Button>
      {invalid && <p role="alert" className="text-sm text-destructive">{t("adminInvalid")}</p>}
      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : saved ? <Check className="size-4" aria-hidden="true" /> : null}
          {saved ? t("adminSaved") : t("adminSave")}
        </Button>
      </div>
    </div>
  );
}
