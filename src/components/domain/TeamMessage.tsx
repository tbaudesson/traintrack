"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Megaphone } from "lucide-react";
import { getCurrentUserIdSync } from "@/db";
import { sendMessage } from "@/hooks/useMessages";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

/**
 * One message to every athlete of a team: the week's instructions, a change
 * of slot. Each one receives it in their conversation with the coach, where
 * they can answer privately.
 */
export function TeamMessage({ team, members, onSent }: { team: string; members: { user_id?: string | null; status: string }[]; onSent: (count: number) => void }) {
  const t = useTranslations("teamMessage");
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const me = getCurrentUserIdSync();
  const recipients = [...new Set(members.filter((m) => m.status === "active" && m.user_id && m.user_id !== me).map((m) => m.user_id!))];

  async function send() {
    if (!body.trim() || !recipients.length) return;
    setSending(true);
    try {
      for (const id of recipients) await sendMessage(id, body);
      setBody("");
      setOpen(false);
      onSent(recipients.length);
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" className="w-full" onClick={() => setOpen(true)} disabled={!recipients.length}>
        <Megaphone className="mr-1 h-4 w-4" aria-hidden="true" />
        {t("button")}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="pr-8">{t("title", { team })}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{t("hint", { count: recipients.length })}</p>
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} placeholder={t("placeholder")} aria-label={t("title", { team })} />
          <Button onClick={send} disabled={sending || !body.trim()}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : t("send", { count: recipients.length })}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
