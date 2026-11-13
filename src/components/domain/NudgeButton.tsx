"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, MessageCircle, Send } from "lucide-react";
import { sendMessage } from "@/hooks/useMessages";
import type { Adherence } from "@/lib/adherence";
import { nudgeFor } from "@/lib/nudge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

/**
 * Check in with an athlete in one tap: a message written for the reason the
 * badge shows, editable, sent through the app's messages.
 */
export function NudgeButton({
  userId,
  name,
  adherence,
  compact = false,
  onSent,
}: {
  userId: string;
  name?: string;
  adherence: Adherence | undefined;
  compact?: boolean;
  onSent?: () => void;
}) {
  const t = useTranslations("teams");
  const [draft, setDraft] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const nudge = nudgeFor(adherence);
  if (!nudge) return null;

  const first = name?.trim().split(/\s+/)[0];
  function open() {
    const hello = first ? t("nudgeHello", { name: first }) : t("nudgeHelloAnon");
    setDraft(`${hello} ${t(`nudge_${nudge!.kind}`, { days: nudge!.days ?? 0, percent: nudge!.percent ?? 0, rpe: nudge!.rpe ?? 0 })}`);
  }

  async function send() {
    if (!draft?.trim()) return;
    setSending(true);
    try {
      await sendMessage(userId, draft);
      setDraft(null);
      onSent?.();
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      {compact ? (
        <button
          type="button"
          onClick={open}
          aria-label={t("nudge")}
          title={t("nudge")}
          className="flex size-9 shrink-0 items-center justify-center rounded-md text-accent-text hover:bg-accent/10"
        >
          <MessageCircle className="h-4 w-4" aria-hidden="true" />
        </button>
      ) : (
        <Button variant="outline" className="w-full" onClick={open}>
          <MessageCircle className="mr-1 h-4 w-4" aria-hidden="true" />
          {first ? t("nudgeNamed", { name: first }) : t("nudge")}
        </Button>
      )}

      <Dialog open={draft !== null} onOpenChange={(isOpen) => !isOpen && setDraft(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{first ? t("nudgeNamed", { name: first }) : t("nudge")}</DialogTitle>
          </DialogHeader>
          <Textarea value={draft ?? ""} onChange={(e) => setDraft(e.target.value)} rows={5} aria-label={t("nudge")} />
          <Button onClick={send} disabled={sending || !draft?.trim()}>
            {sending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="mr-1 h-4 w-4" aria-hidden="true" />}
            {t("nudgeSend")}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
