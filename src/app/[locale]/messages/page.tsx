"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useAllMessages } from "@/hooks/useMessages";
import { getMessageableUsers, type MessageableUser } from "@/lib/messageService";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MessageCircle, Plus, ChevronRight, User } from "lucide-react";

export default function MessagesPage() {
  const t = useTranslations("messages");
  const router = useRouter();
  const { user } = useAuth();
  const me = user?.id;
  const messages = useAllMessages();
  const [people, setPeople] = useState<MessageableUser[]>([]);
  const [newOpen, setNewOpen] = useState(false);

  useEffect(() => {
    getMessageableUsers().then(setPeople).catch(() => setPeople([]));
  }, []);

  const nameOf = useMemo(() => {
    const map = new Map(people.map((p) => [p.user_id, p.display_name]));
    return (id: string) => map.get(id) ?? t("unknown");
  }, [people, t]);

  // Build conversation summaries keyed by the other participant.
  const conversations = useMemo(() => {
    const map = new Map<string, { otherId: string; last: string; lastAt: string; unread: number }>();
    for (const m of messages) {
      const other = m.userId === me ? m.recipientId : m.userId;
      if (!other) continue;
      const existing = map.get(other);
      const isUnread = m.recipientId === me && !m.readAt;
      if (!existing || m.createdAt > existing.lastAt) {
        map.set(other, {
          otherId: other,
          last: m.body,
          lastAt: m.createdAt,
          unread: (existing?.unread ?? 0) + (isUnread ? 1 : 0),
        });
      } else if (isUnread) {
        existing.unread += 1;
      }
    }
    return [...map.values()].sort((a, b) => (a.lastAt < b.lastAt ? 1 : -1));
  }, [messages, me]);

  return (
    <>
      <PageHeader
        title={t("title")}
        showBack
        actions={
          <Button size="sm" onClick={() => setNewOpen(true)}>
            <Plus className="mr-1 h-4 w-4" />{t("new")}
          </Button>
        }
      />
      <div className="space-y-2 p-4 pb-24">
        {conversations.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-sky-100 dark:bg-sky-900/30">
                <MessageCircle className="h-7 w-7 text-sky-500" />
              </div>
              <p className="text-sm text-muted-foreground">{t("empty")}</p>
            </CardContent>
          </Card>
        ) : (
          conversations.map((c) => (
            <Card key={c.otherId}>
              <CardContent className="py-0">
                <button
                  onClick={() => router.push(`/messages/${c.otherId}`)}
                  className="flex w-full items-center gap-3 py-3 text-left"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-sky-600 text-xs font-bold text-white">
                    {nameOf(c.otherId).slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{nameOf(c.otherId)}</p>
                    <p className="truncate text-xs text-muted-foreground">{c.last}</p>
                  </div>
                  {c.unread > 0 && (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-sky-500 px-1.5 text-[10px] font-bold text-white">
                      {c.unread}
                    </span>
                  )}
                  <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
                </button>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("newTitle")}</DialogTitle>
          </DialogHeader>
          {people.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">{t("noContacts")}</p>
          ) : (
            <div className="space-y-1">
              {people.map((p) => (
                <button
                  key={p.user_id}
                  onClick={() => { setNewOpen(false); router.push(`/messages/${p.user_id}`); }}
                  className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-accent"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
                    <User className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{p.display_name}</p>
                    <p className="text-xs text-muted-foreground">{t(`relation_${p.relation}`)}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
