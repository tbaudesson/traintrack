"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { History, RotateCcw } from "lucide-react";
import type { Program } from "@/db";
import { updateProgram } from "@/hooks/usePrograms";
import { changeSummary } from "@/lib/planSnapshot";
import { useFormat } from "@/lib/format";
import { Button } from "@/components/ui/button";

/**
 * The changes of a program, newest first: when, and what changed from that
 * version to the next (days, exercises, targets). Any version can come back;
 * bringing it back is itself a change, so nothing is ever lost. The sessions
 * already done keep their own plan whatever happens here.
 */
export function ProgramHistory({ program }: { program: Program }) {
  const t = useTranslations("programHistory");
  const { day } = useFormat();
  const [confirm, setConfirm] = useState<number | null>(null);
  const revisions = program.revisions ?? [];
  if (!revisions.length || !program.id) return null;

  // Each version against the one that followed it (the last against the program today).
  const rows = revisions
    .map((r, i) => {
      const next = revisions[i + 1] ?? { name: program.name, structure: program.structure };
      const c = changeSummary(r.structure, next.structure);
      const parts = [
        r.name !== next.name ? t("renamed", { from: r.name }) : null,
        c.daysAdded ? t("daysAdded", { count: c.daysAdded }) : null,
        c.daysRemoved ? t("daysRemoved", { count: c.daysRemoved }) : null,
        c.exercisesAdded ? t("exercisesAdded", { count: c.exercisesAdded }) : null,
        c.exercisesRemoved ? t("exercisesRemoved", { count: c.exercisesRemoved }) : null,
        c.targetsChanged ? t("targetsChanged", { count: c.targetsChanged }) : null,
      ].filter(Boolean);
      return { index: i, at: r.at, what: parts.length ? parts.join(" · ") : t("reordered") };
    })
    .reverse();

  return (
    <details className="t-panel rounded-xl px-4 py-1">
      <summary className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold">
        <History className="size-4 text-accent-text" aria-hidden="true" />
        {t("title", { count: revisions.length })}
      </summary>
      <p className="pb-2 text-xs text-muted-foreground">{t("hint")}</p>
      <ul className="space-y-2 pb-3">
        {rows.map((row) => (
          <li key={row.index} className="flex items-start justify-between gap-2 text-sm">
            <div className="min-w-0">
              <p className="font-medium">{t("changedOn", { date: day(row.at.slice(0, 10)) })}</p>
              <p className="text-xs text-muted-foreground">{row.what}</p>
            </div>
            {confirm === row.index ? (
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  const r = revisions[row.index];
                  await updateProgram(program.id!, { name: r.name, structure: r.structure });
                  setConfirm(null);
                }}
              >
                {t("confirmRestore")}
              </Button>
            ) : (
              <Button size="sm" variant="ghost" onClick={() => setConfirm(row.index)}>
                <RotateCcw className="mr-1 h-4 w-4" aria-hidden="true" />
                {t("restore")}
              </Button>
            )}
          </li>
        ))}
      </ul>
    </details>
  );
}
