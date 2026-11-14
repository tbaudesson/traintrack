"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { useFormat } from "@/lib/format";
import { FileUp, Loader2 } from "lucide-react";
import { parseHistory, type ParsedHistory } from "@/lib/importCsv";
import { planImport, runImport, type ImportPlan } from "@/lib/importHistory";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const MAX_BYTES = 30 * 1024 * 1024;

/**
 * Bring a history from Strong or Hevy: pick the CSV they export, check what
 * will be added, then import. The file is read on the phone only.
 */
export function HistoryImport() {
  const t = useTranslations("importHistory");
  const { day } = useFormat();
  const inputId = useId();
  const [text, setText] = useState<string | null>(null);
  const [unit, setUnit] = useState<"kg" | "lb">("kg");
  const [history, setHistory] = useState<ParsedHistory | null>(null);
  const [plan, setPlan] = useState<ImportPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ workouts: number; sets: number } | null>(null);

  async function prepare(content: string, chosen: "kg" | "lb") {
    const parsed = parseHistory(content, chosen);
    if (!parsed || parsed.workouts.length === 0) {
      setError(t("unreadable"));
      return;
    }
    setHistory(parsed);
    setPlan(await planImport(parsed));
  }

  async function read(file: File | undefined) {
    if (!file) return;
    setError(null);
    setDone(null);
    if (file.size > MAX_BYTES) {
      setError(t("tooBig"));
      return;
    }
    const content = await file.text();
    setText(content);
    await prepare(content, unit);
  }

  async function confirm() {
    if (!plan) return;
    setBusy(true);
    try {
      setDone(await runImport(plan));
      setPlan(null);
      setHistory(null);
      setText(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const first = plan?.workouts[0]?.date;
  const last = plan?.workouts.at(-1)?.date;

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">{t("hint")}</p>
      <Button variant="outline" className="w-full" onClick={() => document.getElementById(inputId)?.click()}>
        <FileUp className="mr-2 h-4 w-4" aria-hidden="true" />
        {t("pick")}
      </Button>
      <input
        id={inputId}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          read(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
      {done && <p className="text-sm font-medium text-success-text">{t("done", done)}</p>}

      <Dialog open={plan !== null} onOpenChange={(open) => !open && setPlan(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("title", { source: history?.source === "hevy" ? "Hevy" : "Strong" })}</DialogTitle>
          </DialogHeader>
          {plan && history && (
            <div className="space-y-3 text-sm">
              {plan.workouts.length > 0 ? (
                <p>
                  {t("summary", { workouts: plan.workouts.length, sets: plan.sets })}
                  {first && last && ` · ${t("period", { from: day(first), to: day(last) })}`}
                </p>
              ) : (
                <p>{t("nothingNew")}</p>
              )}
              {plan.duplicates > 0 && <p className="text-muted-foreground">{t("duplicates", { count: plan.duplicates })}</p>}
              {history.skipped > 0 && <p className="text-muted-foreground">{t("skipped", { count: history.skipped })}</p>}

              {history.unitAsked && (
                <fieldset className="space-y-1.5">
                  <legend className="font-medium">{t("unit")}</legend>
                  <div className="grid grid-cols-2 gap-2">
                    {(["kg", "lb"] as const).map((u) => (
                      <button
                        key={u}
                        type="button"
                        aria-pressed={unit === u}
                        onClick={() => {
                          setUnit(u);
                          if (text) prepare(text, u);
                        }}
                        className={cn(
                          "min-h-11 rounded-lg border font-semibold",
                          unit === u ? "border-accent-500 bg-accent-500 text-white" : "border-border text-muted-foreground"
                        )}
                      >
                        {u}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">{t("unitHint")}</p>
                </fieldset>
              )}

              {plan.workouts.length > 0 && (
                <div className="space-y-1">
                  <p>{t("exercises", { matched: plan.matched.length, created: plan.created.length })}</p>
                  {plan.created.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {t("createdList")} {plan.created.slice(0, 12).join(", ")}
                      {plan.created.length > 12 && ` (+${plan.created.length - 12})`}
                    </p>
                  )}
                </div>
              )}

              <Button className="w-full" onClick={confirm} disabled={busy || plan.workouts.length === 0}>
                {busy && <Loader2 className="mr-1 h-4 w-4 animate-spin" aria-hidden="true" />}
                {t("confirm", { count: plan.workouts.length })}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
