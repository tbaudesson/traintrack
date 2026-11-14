"use client";

import { useId, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { AlertTriangle, Download, FileSpreadsheet, Loader2 } from "lucide-react";
import { useRouter } from "@/i18n/navigation";
import { createProgram } from "@/hooks/usePrograms";
import { parseCsv } from "@/lib/importCsv";
import { parseProgramRows, ProgramImportError, templateRows, type ProgramImport } from "@/lib/programImport";
import { MAX_XLSX_BYTES, readXlsx, writeXlsx, XlsxError } from "@/lib/xlsx";
import { useExerciseLabel } from "@/lib/exerciseNames";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** A CSV in UTF-8, or in the Windows encoding Excel uses for "CSV" in French. */
function decodeText(bytes: ArrayBuffer): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes).replace(/^﻿/, "");
  } catch {
    return new TextDecoder("windows-1252").decode(bytes);
  }
}

/** The separator of a CSV: the most frequent of ; , and tab on its first line. */
function separatorOf(text: string): string {
  const line = text.split(/\r?\n/, 1)[0];
  return [";", "\t", ","].map((s) => [s, line.split(s).length] as const).sort((a, b) => b[1] - a[1])[0][0];
}

/**
 * Import a program from a spreadsheet (.xlsx or .csv): a template to start
 * from, the file read on the device, a preview of the sessions and of the
 * exercises not found in the library, then the program created.
 */
export function ProgramImportDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const t = useTranslations("programImport");
  const locale = useLocale();
  const router = useRouter();
  const xl = useExerciseLabel();
  const inputId = useId();
  const [result, setResult] = useState<ProgramImport | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function reset() {
    setResult(null);
    setError(null);
    setName("");
  }

  function downloadTemplate() {
    const bytes = writeXlsx({ sheet: t("sheetName"), rows: templateRows(locale), widths: [9, 18, 34, 8, 14, 10, 14], textColumns: [4, 6] });
    const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${t("templateFile")}.xlsx`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function read(file: File | undefined) {
    if (!file) return;
    reset();
    const lower = file.name.toLowerCase();
    if (lower.endsWith(".xls") || lower.endsWith(".numbers") || lower.endsWith(".ods")) return setError(t("errorFormat"));
    if (file.size > MAX_XLSX_BYTES) return setError(t("errorTooBig"));
    setBusy(true);
    try {
      const bytes = await file.arrayBuffer();
      const isCsv = lower.endsWith(".csv") || lower.endsWith(".tsv") || lower.endsWith(".txt");
      const rows = isCsv ? (() => { const text = decodeText(bytes); return parseCsv(text, separatorOf(text)); })() : await readXlsx(bytes);
      setResult(parseProgramRows(rows, (n) => t("session", { n })));
      setName(file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim().slice(0, 120) || t("untitled"));
    } catch (e) {
      const code = e instanceof XlsxError || e instanceof ProgramImportError ? e.message : "";
      setError(
        code === "NO_HEADER" ? t("errorHeader") : code === "EMPTY" ? t("errorEmpty") : code === "TOO_BIG" ? t("errorTooBig") : t("errorFormat")
      );
    } finally {
      setBusy(false);
    }
  }

  async function create() {
    if (!result || !name.trim()) return;
    setBusy(true);
    try {
      const id = await createProgram({ name: name.trim(), structure: result.structure });
      onOpenChange(false);
      reset();
      router.push(`/programs/${id}`);
    } finally {
      setBusy(false);
    }
  }

  const exercises = result?.structure.reduce((sum, d) => sum + d.exercises.length, 0) ?? 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-accent-text" aria-hidden="true" />
            {t("title")}
          </DialogTitle>
        </DialogHeader>

        {!result ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{t("intro")}</p>
            <ul className="list-disc space-y-0.5 pl-5 text-sm text-muted-foreground">
              <li>{t("ruleColumns")}</li>
              <li>{t("ruleBlank")}</li>
              <li>{t("ruleNames")}</li>
            </ul>
            <Button variant="outline" className="w-full" onClick={downloadTemplate}>
              <Download className="mr-2 h-4 w-4" aria-hidden="true" />
              {t("template")}
            </Button>
            <Button className="w-full" onClick={() => document.getElementById(inputId)?.click()} disabled={busy}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <FileSpreadsheet className="mr-2 h-4 w-4" aria-hidden="true" />}
              {t("pick")}
            </Button>
            <input
              id={inputId}
              type="file"
              accept=".xlsx,.csv,.tsv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
              className="hidden"
              onChange={(e) => {
                void read(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            {error && (
              <p role="alert" className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">
                {error}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <label className="block space-y-1 text-sm font-medium">
              <span>{t("name")}</span>
              <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
            </label>
            <p className="text-sm">
              {result.weeks
                ? t("summaryWeeks", { sessions: result.structure.length, weeks: result.weeks, exercises })
                : t("summaryRotation", { sessions: result.structure.length, exercises })}
            </p>
            <ol className="t-surface max-h-56 space-y-1.5 overflow-y-auto rounded-xl p-3 text-sm ring-1 ring-foreground/5">
              {result.structure.map((d, i) => (
                <li key={i}>
                  <span className="font-medium">
                    {d.week ? `${t("week", { n: d.week })} · ` : ""}
                    {d.name}
                  </span>
                  <span className="text-muted-foreground"> — {d.exercises.map((e) => xl(e.exerciseName)).join(", ")}</span>
                </li>
              ))}
            </ol>
            {result.unknown.length > 0 && (
              <div className="flex gap-2 rounded-xl bg-amber-500/10 p-3 text-sm">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" aria-hidden="true" />
                <p>{t("unknown", { count: result.unknown.length, list: result.unknown.join(", ") })}</p>
              </div>
            )}
            {result.badReps > 0 && (
              <div className="flex gap-2 rounded-xl bg-amber-500/10 p-3 text-sm">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" aria-hidden="true" />
                <p>{t("badReps", { count: result.badReps })}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={reset} disabled={busy}>
                {t("other")}
              </Button>
              <Button onClick={create} disabled={busy || !name.trim()}>
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                {t("create")}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
