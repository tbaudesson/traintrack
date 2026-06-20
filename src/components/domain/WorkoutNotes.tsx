"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkoutNotes, addWorkoutNote, deleteWorkoutNote } from "@/hooks/useWorkoutNotes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageSquare, Send, Trash2, Loader2 } from "lucide-react";

/** Async notes thread on a workout — author is the athlete or their coach. */
export function WorkoutNotes({ workoutId }: { workoutId: number }) {
  const t = useTranslations("notes");
  const { user, profile } = useAuth();
  const notes = useWorkoutNotes(workoutId);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!body.trim()) return;
    setBusy(true);
    try {
      const authorName = profile?.display_name ?? user?.email?.split("@")[0];
      await addWorkoutNote(workoutId, body.trim(), authorName ?? undefined);
      setBody("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <MessageSquare className="h-3.5 w-3.5" /> {t("title")}
      </h4>

      {notes.map((n) => {
        const mine = n.userId === user?.id;
        return (
          <div key={n.id} className="rounded-lg bg-muted/50 px-3 py-2 text-sm">
            <div className="mb-0.5 flex items-center gap-2">
              <span className="text-xs font-medium text-accent-600">{n.authorName ?? "—"}</span>
              <span className="text-[10px] text-muted-foreground">{n.createdAt.split("T")[0]}</span>
              {mine && n.id && (
                <button
                  onClick={() => deleteWorkoutNote(n.id!)}
                  className="ml-auto text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
            <p className="whitespace-pre-wrap">{n.body}</p>
          </div>
        );
      })}

      <div className="flex gap-2">
        <Input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={t("placeholder")}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
        <Button size="sm" onClick={submit} disabled={busy || !body.trim()}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
