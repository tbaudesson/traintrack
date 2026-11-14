"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Award, Plus, Trash2 } from "lucide-react";
import type { CompetitionResult } from "@/db";
import { deleteCompetition, saveCompetition, useCompetitions } from "@/hooks/useCompetitions";
import { finalScore, parseScore } from "@/lib/competitions";
import { localDate } from "@/lib/dates";
import { useFormat } from "@/lib/format";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/ui/page-parts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CompetitionResults } from "@/components/domain/CompetitionResults";

interface Draft {
  id?: number;
  date: string;
  event: string;
  category: string;
  horse: string;
  compulsory: string;
  technical: string;
  freestyle: string;
  rank: string;
  participants: string;
  notes: string;
}

const empty = (): Draft => ({ date: localDate(), event: "", category: "", horse: "", compulsory: "", technical: "", freestyle: "", rank: "", participants: "", notes: "" });
const text = (n: number | null | undefined) => (typeof n === "number" ? String(n).replace(".", ",") : "");
const toDraft = (r: CompetitionResult): Draft => ({
  id: r.id,
  date: r.date,
  event: r.event,
  category: r.category ?? "",
  horse: r.horse ?? "",
  compulsory: text(r.compulsory),
  technical: text(r.technical),
  freestyle: text(r.freestyle),
  rank: r.rank ? String(r.rank) : "",
  participants: r.participants ? String(r.participants) : "",
  notes: r.notes ?? "",
});
const whole = (s: string) => {
  const n = Number(s);
  return s.trim() && Number.isInteger(n) && n >= 1 ? n : null;
};

/**
 * The vaulting competitions: each one with its scores out of 10 (compulsory,
 * technical, freestyle), the final score worked out, the ranking, and the
 * curve of the season.
 */
export default function CompetitionsPage() {
  const t = useTranslations("competitions");
  const { num } = useFormat();
  const results = useCompetitions();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);

  const scores = draft ? { compulsory: parseScore(draft.compulsory), technical: parseScore(draft.technical), freestyle: parseScore(draft.freestyle) } : null;
  const badScore = !!draft && (["compulsory", "technical", "freestyle"] as const).some((k) => draft[k].trim() && scores![k] === null);
  const final = scores ? finalScore(scores) : null;

  async function save() {
    if (!draft || !draft.event.trim() || badScore) return;
    setSaving(true);
    try {
      await saveCompetition(
        {
          date: draft.date,
          event: draft.event.trim().slice(0, 120),
          category: draft.category.trim() || null,
          horse: draft.horse.trim() || null,
          ...scores!,
          rank: whole(draft.rank),
          participants: whole(draft.participants),
          notes: draft.notes.trim() || null,
        },
        draft.id
      );
      setDraft(null);
    } finally {
      setSaving(false);
    }
  }

  const set = (key: keyof Draft) => (e: { target: { value: string } }) => setDraft((d) => (d ? { ...d, [key]: e.target.value } : d));

  return (
    <>
      <PageHeader
        title={t("title")}
        showBack
        actions={
          <Button size="sm" onClick={() => setDraft(empty())}>
            <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
            {t("add")}
          </Button>
        }
      />
      <div className="space-y-4 p-4 pb-28">
        {results.length === 0 ? (
          <EmptyState icon={Award} title={t("empty")} />
        ) : (
          <CompetitionResults results={results} onEdit={(r) => setDraft(toDraft(r))} />
        )}
      </div>

      <Dialog open={draft !== null} onOpenChange={(open) => !open && setDraft(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          {draft && (
            <>
              <DialogHeader>
                <DialogTitle>{draft.id ? t("edit") : t("add")}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <Field label={t("event")}>
                  <Input value={draft.event} onChange={set("event")} placeholder={t("eventPlaceholder")} maxLength={120} />
                </Field>
                <div className="grid grid-cols-2 gap-2">
                  <Field label={t("date")}>
                    <Input type="date" value={draft.date} onChange={set("date")} />
                  </Field>
                  <Field label={t("category")}>
                    <Input value={draft.category} onChange={set("category")} placeholder={t("categoryPlaceholder")} maxLength={80} />
                  </Field>
                </div>
                <Field label={t("horse")}>
                  <Input value={draft.horse} onChange={set("horse")} maxLength={80} />
                </Field>
                <div className="grid grid-cols-3 gap-2">
                  {(["compulsory", "technical", "freestyle"] as const).map((k) => (
                    <Field key={k} label={t(`test_${k}`)}>
                      <Input value={draft[k]} onChange={set(k)} inputMode="decimal" placeholder="7,250" aria-invalid={!!draft[k].trim() && scores![k] === null} />
                    </Field>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {badScore ? t("scoreHint") : final !== null ? t("finalIs", { score: num(final, 3) }) : t("scoreHint")}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <Field label={t("rankLabel")}>
                    <Input value={draft.rank} onChange={set("rank")} inputMode="numeric" />
                  </Field>
                  <Field label={t("participants")}>
                    <Input value={draft.participants} onChange={set("participants")} inputMode="numeric" />
                  </Field>
                </div>
                <Field label={t("notes")}>
                  <Textarea value={draft.notes} onChange={set("notes")} rows={3} placeholder={t("notesPlaceholder")} maxLength={2000} />
                </Field>
                <Button className="w-full" onClick={save} disabled={saving || !draft.event.trim() || badScore}>
                  {t("save")}
                </Button>
                {draft.id && (
                  <Button
                    variant="ghost"
                    className="w-full text-destructive"
                    onClick={async () => {
                      await deleteCompetition(draft.id!);
                      setDraft(null);
                    }}
                  >
                    <Trash2 className="mr-1 h-4 w-4" aria-hidden="true" />
                    {t("delete")}
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1 text-sm font-medium">
      <span>{label}</span>
      {children}
    </label>
  );
}
