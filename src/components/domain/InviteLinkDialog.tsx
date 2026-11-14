"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { renderSVG } from "uqr";
import { Check, Copy, Link2, Loader2, Share2 } from "lucide-react";
import type { ProgramDay } from "@/db";
import { usePrograms } from "@/hooks/usePrograms";
import { useProgramTemplates } from "@/lib/templateService";
import { createInvite, inviteLink } from "@/lib/inviteService";
import { nextMonday } from "@/lib/programWeek";
import { sessionsPerWeek, suggestDays } from "@/lib/schedule";
import { localDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const weekdayName = (locale: string, day: number, width: "narrow" | "long") =>
  new Intl.DateTimeFormat(locale, { weekday: width, timeZone: "UTC" }).format(new Date(Date.UTC(2024, 0, day)));

/**
 * A coach makes an invitation link for one athlete: optionally a program
 * with its start and days, and a welcome message, all given on arrival. The
 * link (and its QR code) shows once: only its fingerprint is kept.
 */
export function InviteLinkDialog({ groupId, open, onOpenChange, onCreated }: { groupId: string; open: boolean; onOpenChange: (o: boolean) => void; onCreated: () => void }) {
  const t = useTranslations("inviteLink");
  const locale = useLocale();
  const programs = usePrograms();
  const templates = useProgramTemplates();
  const today = localDate();
  const [label, setLabel] = useState("");
  const [choice, setChoice] = useState("");
  const [start, setStart] = useState(() => nextMonday(today));
  const [days, setDays] = useState<number[]>([]);
  const [welcome, setWelcome] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // One's own programs (not the copies given to athletes), then the ready-made ones.
  const options = useMemo(
    () => [
      ...programs.filter((p) => !p.assignedToUserId && (p.structure ?? []).length).map((p) => ({ key: `p${p.id}`, name: p.name, structure: p.structure, own: true })),
      ...templates.map((tpl) => ({ key: `t${tpl.id}`, name: tpl.name, structure: tpl.structure, own: false })),
    ],
    [programs, templates]
  );
  const program = options.find((o) => o.key === choice) ?? null;
  const qr = useMemo(() => (link ? renderSVG(link, { border: 2 }) : null), [link]);

  function pick(key: string) {
    setChoice(key);
    const o = options.find((x) => x.key === key);
    setDays(o ? suggestDays(sessionsPerWeek({ structure: o.structure as ProgramDay[] }), []) : []);
  }

  function reset() {
    setLabel("");
    setChoice("");
    setDays([]);
    setWelcome("");
    setLink(null);
    setError(null);
    setCopied(false);
  }

  async function create() {
    setBusy(true);
    setError(null);
    try {
      const token = await createInvite({
        groupId,
        label: label.trim() || undefined,
        program: program ? { name: program.name, structure: program.structure } : null,
        startDate: program ? start : null,
        weekdays: program ? days : null,
        welcome: welcome.trim() || undefined,
      });
      setLink(inviteLink(window.location.origin, locale, token));
      onCreated();
    } catch (e) {
      const code = e instanceof Error ? e.message : "";
      setError(code === "TOO_MANY_INVITES" ? t("tooMany") : code === "PLAN_REQUIRED" ? t("plan") : navigator.onLine ? t("failed") : t("offline"));
    } finally {
      setBusy(false);
    }
  }

  async function share() {
    if (!link) return;
    try {
      if (navigator.share) await navigator.share({ title: t("shareTitle"), text: t("shareText"), url: link });
      else {
        await navigator.clipboard.writeText(link);
        setCopied(true);
      }
    } catch {
      // Cancelled: nothing to do.
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5 text-accent-text" aria-hidden="true" />
            {t("title")}
          </DialogTitle>
        </DialogHeader>

        {link ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{t("ready")}</p>
            {qr && (
              <div
                role="img"
                aria-label={t("qr")}
                className="mx-auto w-56 rounded-xl bg-white p-2 [&_svg]:h-auto [&_svg]:w-full"
                dangerouslySetInnerHTML={{ __html: qr }}
              />
            )}
            <Input readOnly value={link} aria-label={t("link")} onFocus={(e) => e.currentTarget.select()} className="font-mono text-xs" />
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                onClick={async () => {
                  await navigator.clipboard.writeText(link).catch(() => {});
                  setCopied(true);
                }}
              >
                {copied ? <Check className="mr-1 h-4 w-4" aria-hidden="true" /> : <Copy className="mr-1 h-4 w-4" aria-hidden="true" />}
                {copied ? t("copied") : t("copy")}
              </Button>
              <Button onClick={share}>
                <Share2 className="mr-1 h-4 w-4" aria-hidden="true" />
                {t("share")}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">{t("once")}</p>
            <Button variant="ghost" className="w-full" onClick={reset}>
              {t("another")}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{t("intro")}</p>
            <label className="block space-y-1 text-sm font-medium">
              <span>{t("label")}</span>
              <Input value={label} onChange={(e) => setLabel(e.target.value)} maxLength={80} placeholder={t("labelPlaceholder")} />
            </label>
            <label className="block space-y-1 text-sm font-medium">
              <span>{t("program")}</span>
              <select
                value={choice}
                onChange={(e) => pick(e.target.value)}
                className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">{t("noProgram")}</option>
                <optgroup label={t("mine")}>
                  {options.filter((o) => o.own).map((o) => (
                    <option key={o.key} value={o.key}>
                      {o.name}
                    </option>
                  ))}
                </optgroup>
                <optgroup label={t("readyMade")}>
                  {options.filter((o) => !o.own).map((o) => (
                    <option key={o.key} value={o.key}>
                      {o.name}
                    </option>
                  ))}
                </optgroup>
              </select>
            </label>
            {program && (
              <>
                <label className="flex items-center gap-3 text-sm font-medium">
                  <span className="flex-1">{t("start")}</span>
                  <Input type="date" value={start} min={today} onChange={(e) => setStart(e.target.value)} className="w-auto" />
                </label>
                <fieldset>
                  <legend className="mb-1.5 text-sm font-medium">{t("days")}</legend>
                  <div className="grid grid-cols-7 gap-1">
                    {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setDays(days.includes(d) ? days.filter((x) => x !== d) : [...days, d].sort())}
                        aria-pressed={days.includes(d)}
                        aria-label={weekdayName(locale, d, "long")}
                        className={cn("h-10 rounded-lg text-sm font-semibold", days.includes(d) ? "bg-accent-600 text-white" : "bg-muted text-muted-foreground")}
                      >
                        {weekdayName(locale, d, "narrow")}
                      </button>
                    ))}
                  </div>
                </fieldset>
              </>
            )}
            <label className="block space-y-1 text-sm font-medium">
              <span>{t("welcome")}</span>
              <Textarea value={welcome} onChange={(e) => setWelcome(e.target.value)} rows={3} maxLength={2000} placeholder={t("welcomePlaceholder")} />
            </label>
            {error && (
              <p role="alert" className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">
                {error}
              </p>
            )}
            <Button className="w-full" onClick={create} disabled={busy || (!!program && !days.length)}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
              {t("create")}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
