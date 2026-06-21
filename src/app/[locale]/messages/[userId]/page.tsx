"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuth } from "@/contexts/AuthContext";
import { useConversation, sendMessage } from "@/hooks/useMessages";
import { getMessageableUsers, markMessagesRead } from "@/lib/messageService";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ConversationPage() {
  const t = useTranslations("messages");
  const params = useParams();
  const otherId = String(params.userId);
  const { user } = useAuth();
  const me = user?.id;
  const messages = useConversation(otherId);
  const [name, setName] = useState("");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getMessageableUsers()
      .then((users) => setName(users.find((u) => u.user_id === otherId)?.display_name ?? t("unknown")))
      .catch(() => setName(t("unknown")));
  }, [otherId, t]);

  // Mark received messages read whenever the thread changes.
  useEffect(() => {
    if (messages.some((m) => m.recipientId === me && !m.readAt)) {
      markMessagesRead(otherId).catch(() => {});
    }
  }, [messages, me, otherId]);

  // Scroll to the latest message.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function send() {
    const body = draft.trim();
    if (!body) return;
    setSending(true);
    try {
      await sendMessage(otherId, body);
      setDraft("");
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <PageHeader title={name || t("title")} showBack />
      <div className="flex flex-col gap-2 p-4 pb-28">
        {messages.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">{t("threadEmpty")}</p>
        ) : (
          messages.map((m) => {
            const mine = m.userId === me;
            return (
              <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[78%] rounded-2xl px-3.5 py-2 text-sm",
                    mine
                      ? "rounded-br-sm bg-accent-600 text-white"
                      : "rounded-bl-sm bg-muted text-foreground"
                  )}
                >
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                  <p className={cn("mt-0.5 text-[10px]", mine ? "text-white/70" : "text-muted-foreground")}>
                    {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={endRef} />
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto flex max-w-2xl items-center gap-2">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())}
            placeholder={t("typeMessage")}
          />
          <Button size="icon" onClick={send} disabled={sending || !draft.trim()} aria-label={t("send")}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </>
  );
}
