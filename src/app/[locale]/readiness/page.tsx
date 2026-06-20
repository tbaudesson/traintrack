"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  useReadiness,
  useTodayReadiness,
  saveTodayReadiness,
  readinessScore,
} from "@/hooks/useReadiness";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";

function Scale({
  label,
  value,
  onChange,
  invert,
}: {
  label: string;
  value: number | undefined;
  onChange: (v: number) => void;
  invert?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium">{label}</label>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => {
          // For normal scales high=good (green); for soreness invert (high=bad)
          const active = value === n;
          return (
            <button
              key={n}
              onClick={() => onChange(n)}
              className={cn(
                "flex h-10 flex-1 items-center justify-center rounded-lg border text-sm font-medium transition-colors",
                active
                  ? invert
                    ? "border-rose-500 bg-rose-500 text-white"
                    : "border-indigo-500 bg-indigo-500 text-white"
                  : "border-border text-muted-foreground hover:bg-accent"
              )}
            >
              {n}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function scoreColor(s: number) {
  if (s >= 75) return "text-green-600";
  if (s >= 50) return "text-amber-600";
  return "text-rose-600";
}

export default function ReadinessPage() {
  const t = useTranslations("readiness");
  const today = useTodayReadiness();
  const history = useReadiness();

  const [mood, setMood] = useState<number>();
  const [energy, setEnergy] = useState<number>();
  const [sleep, setSleep] = useState<number>();
  const [soreness, setSoreness] = useState<number>();
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedFlag, setSavedFlag] = useState(false);

  useEffect(() => {
    if (today) {
      setMood(today.mood);
      setEnergy(today.energy);
      setSleep(today.sleep);
      setSoreness(today.soreness);
      setNote(today.note ?? "");
    }
  }, [today]);

  async function save() {
    setSaving(true);
    try {
      await saveTodayReadiness({ mood, energy, sleep, soreness, note: note.trim() || undefined });
      setSavedFlag(true);
      setTimeout(() => setSavedFlag(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  const liveScore = readinessScore({ mood, energy, sleep, soreness });
  const rec =
    liveScore == null ? null : liveScore >= 75 ? t("recHigh") : liveScore >= 50 ? t("recMid") : t("recLow");

  return (
    <>
      <PageHeader title={t("title")} />
      <div className="space-y-5 p-4 pb-24">
        {liveScore != null && (
          <Card>
            <CardContent className="flex items-center gap-4 py-4">
              <div className="flex flex-col items-center">
                <span className={cn("text-3xl font-bold", scoreColor(liveScore))}>{liveScore}</span>
                <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{t("score")}</span>
              </div>
              <p className="flex-1 text-sm text-muted-foreground">{rec}</p>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="space-y-4 py-4">
            <p className="text-sm font-medium">{t("todayPrompt")}</p>
            <Scale label={t("mood")} value={mood} onChange={setMood} />
            <Scale label={t("energy")} value={energy} onChange={setEnergy} />
            <Scale label={t("sleep")} value={sleep} onChange={setSleep} />
            <Scale label={t("soreness")} value={soreness} onChange={setSoreness} invert />
            <div className="space-y-1.5">
              <label className="text-sm font-medium">{t("note")}</label>
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("notePlaceholder")} />
            </div>
            <Button onClick={save} disabled={saving} className="w-full">
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : savedFlag ? (
                <><Check className="mr-1 h-4 w-4" />{t("saved")}</>
              ) : (
                t("save")
              )}
            </Button>
          </CardContent>
        </Card>

        {history.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-muted-foreground">{t("history")}</h2>
            {history.map((r) => {
              const s = readinessScore(r);
              return (
                <Card key={r.id}>
                  <CardContent className="flex items-center gap-3 py-2.5">
                    <span className={cn("w-10 text-lg font-bold", s != null ? scoreColor(s) : "")}>{s ?? "–"}</span>
                    <span className="flex-1 text-sm">{r.date}</span>
                    {r.note && <span className="truncate text-xs text-muted-foreground">{r.note}</span>}
                  </CardContent>
                </Card>
              );
            })}
          </section>
        )}
      </div>
    </>
  );
}
