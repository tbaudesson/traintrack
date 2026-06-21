"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  useAllHealth, useHealthForDate, upsertHealthMetric, importHealthCsv,
} from "@/hooks/useHealth";
import { useWorkouts } from "@/hooks/useWorkouts";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Activity, Footprints, HeartPulse, Moon, Upload, Heart, Loader2, Check } from "lucide-react";

function today() {
  return new Date().toISOString().split("T")[0];
}

export default function HealthPage() {
  const t = useTranslations("health");
  const allHealth = useAllHealth();
  const todayMetric = useHealthForDate(today());
  const workouts = useWorkouts();
  const fileRef = useRef<HTMLInputElement>(null);

  const [steps, setSteps] = useState("");
  const [rhr, setRhr] = useState("");
  const [hrv, setHrv] = useState("");
  const [sleep, setSleep] = useState("");
  const [saved, setSaved] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  // Seed inputs from today's stored metric once it loads.
  const seedKey = todayMetric?.id ?? "none";
  const [seededFor, setSeededFor] = useState<string | number>("");
  if (todayMetric && seededFor !== seedKey) {
    setSeededFor(seedKey);
    setSteps(todayMetric.steps?.toString() ?? "");
    setRhr(todayMetric.restingHr?.toString() ?? "");
    setHrv(todayMetric.hrv?.toString() ?? "");
    setSleep(todayMetric.sleepHours?.toString() ?? "");
  }

  async function save() {
    await upsertHealthMetric(today(), {
      steps: steps ? Number(steps) : undefined,
      restingHr: rhr ? Number(rhr) : undefined,
      hrv: hrv ? Number(hrv) : undefined,
      sleepHours: sleep ? Number(sleep) : undefined,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportMsg(null);
    try {
      const text = await file.text();
      const res = await importHealthCsv(text);
      setImportMsg(t("imported", { n: res.imported, skipped: res.skipped }));
    } catch {
      setImportMsg(t("importError"));
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const recentHrWorkouts = workouts.filter((w) => w.avgHr || w.maxHr).slice(0, 5);
  const history = allHealth.slice(0, 14);

  return (
    <>
      <PageHeader
        title={t("title")}
        showBack
        actions={
          <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={importing}>
            {importing ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Upload className="mr-1 h-4 w-4" />}
            {t("import")}
          </Button>
        }
      />
      <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={onFile} className="hidden" />

      <div className="space-y-5 p-4 pb-24">
        {importMsg && (
          <p className="rounded-md bg-accent-50 px-3 py-2 text-xs text-accent-700 dark:bg-accent-950/30">{importMsg}</p>
        )}

        {/* Today's metrics */}
        <Card>
          <CardContent className="space-y-3 py-4">
            <p className="text-sm font-semibold">{t("today")}</p>
            <div className="grid grid-cols-2 gap-3">
              <MetricInput icon={Footprints} label={t("steps")} value={steps} onChange={setSteps} />
              <MetricInput icon={HeartPulse} label={t("restingHr")} value={rhr} onChange={setRhr} unit="bpm" />
              <MetricInput icon={Activity} label={t("hrv")} value={hrv} onChange={setHrv} unit="ms" />
              <MetricInput icon={Moon} label={t("sleep")} value={sleep} onChange={setSleep} unit="h" />
            </div>
            <Button onClick={save} className="w-full">
              {saved ? <><Check className="mr-1 h-4 w-4" />{t("saved")}</> : t("save")}
            </Button>
            <p className="text-[11px] text-muted-foreground">{t("importHint")}</p>
          </CardContent>
        </Card>

        {/* Recent workout heart rate */}
        {recentHrWorkouts.length > 0 && (
          <section className="space-y-1.5">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("workoutHr")}</h2>
            {recentHrWorkouts.map((w) => (
              <Card key={w.id}>
                <CardContent className="flex items-center gap-3 py-2.5">
                  <Heart className="h-4 w-4 text-rose-500" />
                  <span className="flex-1 truncate text-sm">{w.title || w.date}</span>
                  <span className="text-xs text-muted-foreground">
                    {w.avgHr ? `${t("hrAvg")} ${Math.round(w.avgHr)}` : ""}
                    {w.maxHr ? ` · ${t("hrMax")} ${Math.round(w.maxHr)}` : ""}
                  </span>
                </CardContent>
              </Card>
            ))}
          </section>
        )}

        {/* History */}
        {history.length > 0 && (
          <section className="space-y-1.5">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("history")}</h2>
            {history.map((h) => (
              <Card key={h.id}>
                <CardContent className="flex items-center gap-2 py-2.5 text-xs">
                  <span className="w-20 shrink-0 font-medium">{h.date}</span>
                  <span className="flex flex-1 flex-wrap gap-x-3 gap-y-0.5 text-muted-foreground">
                    {h.steps != null && <span>{Math.round(h.steps).toLocaleString()} {t("stepsShort")}</span>}
                    {h.restingHr != null && <span>{Math.round(h.restingHr)} bpm</span>}
                    {h.hrv != null && <span>HRV {Math.round(h.hrv)}</span>}
                    {h.sleepHours != null && <span>{h.sleepHours}h</span>}
                  </span>
                </CardContent>
              </Card>
            ))}
          </section>
        )}
      </div>
    </>
  );
}

function MetricInput({
  icon: Icon, label, value, onChange, unit,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; value: string; onChange: (v: string) => void; unit?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}{unit ? ` (${unit})` : ""}
      </span>
      <Input type="number" inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} className="h-9" />
    </label>
  );
}
