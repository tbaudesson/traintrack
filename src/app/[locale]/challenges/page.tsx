"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useAuth } from "@/contexts/AuthContext";
import { getMyGroups, createGroup, type Group } from "@/lib/groupService";
import {
  getMyChallenges, createChallenge, deleteChallenge, getChallengeLeaderboard,
  type Challenge, type ChallengeType, type LeaderboardRow,
} from "@/lib/challengeService";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Flag, Plus, Loader2, Trophy, Trash2, ChevronDown, ChevronUp, Medal } from "lucide-react";
import { cn } from "@/lib/utils";

const TYPES: ChallengeType[] = ["volume", "sessions", "consistency"];

function todayISO(offset = 0) {
  return new Date(Date.now() + offset * 86400000).toISOString().split("T")[0];
}

export default function ChallengesPage() {
  const t = useTranslations("challenges");
  const { user } = useAuth();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ch, gr] = await Promise.all([getMyChallenges(), getMyGroups().catch(() => [])]);
      setChallenges(ch);
      setGroups(gr);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <>
      <PageHeader
        title={t("title")}
        showBack
        actions={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1 h-4 w-4" />{t("create")}
          </Button>
        }
      />
      <div className="space-y-3 p-4 pb-24">
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : challenges.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/30">
                <Flag className="h-7 w-7 text-orange-500" />
              </div>
              <p className="text-sm text-muted-foreground">{t("empty")}</p>
            </CardContent>
          </Card>
        ) : (
          challenges.map((c) => (
            <ChallengeCard key={c.id} challenge={c} currentUserId={user?.id} onDeleted={load} />
          ))
        )}
      </div>

      <CreateChallengeDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        groups={groups}
        onCreated={() => { setCreateOpen(false); load(); }}
      />
    </>
  );
}

function ChallengeCard({
  challenge, currentUserId, onDeleted,
}: { challenge: Challenge; currentUserId?: string; onDeleted: () => void }) {
  const t = useTranslations("challenges");
  const [open, setOpen] = useState(false);
  const [board, setBoard] = useState<LeaderboardRow[] | null>(null);
  const [loading, setLoading] = useState(false);

  const now = todayISO();
  const status = now < challenge.start_date ? "upcoming" : now > challenge.end_date ? "ended" : "active";

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && board === null) {
      setLoading(true);
      try { setBoard(await getChallengeLeaderboard(challenge.id)); }
      catch { setBoard([]); }
      finally { setLoading(false); }
    }
  }

  async function remove() {
    await deleteChallenge(challenge.id);
    onDeleted();
  }

  const unit = challenge.type === "volume" ? "kg" : challenge.type === "sessions" ? t("sessionsUnit") : t("daysUnit");

  return (
    <Card>
      <CardContent className="py-3">
        <button onClick={toggle} className="flex w-full items-center gap-3 text-left">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-900/30">
            <Flag className="h-5 w-5 text-orange-500" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{challenge.name}</p>
            <p className="text-xs text-muted-foreground">
              {challenge.group_name} · {t(`type_${challenge.type}`)}
            </p>
          </div>
          <span className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-medium",
            status === "active" ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
              : status === "upcoming" ? "bg-accent-100 text-accent-700 dark:bg-accent-900/40"
              : "bg-muted text-muted-foreground"
          )}>
            {t(`status_${status}`)}
          </span>
          {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>

        {open && (
          <div className="mt-3 space-y-2 border-t border-border pt-3">
            <p className="text-xs text-muted-foreground">
              {challenge.start_date} → {challenge.end_date}
            </p>
            {loading ? (
              <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : board && board.length > 0 ? (
              <ol className="space-y-1">
                {board.map((row, i) => (
                  <li
                    key={row.user_id}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-2 py-1.5",
                      row.user_id === currentUserId && "bg-accent-50 dark:bg-accent-950/30"
                    )}
                  >
                    <span className="w-6 text-center text-sm font-semibold">
                      {i === 0 ? <Medal className="mx-auto h-4 w-4 text-amber-500" />
                        : i === 1 ? <Medal className="mx-auto h-4 w-4 text-slate-400" />
                        : i === 2 ? <Medal className="mx-auto h-4 w-4 text-orange-700" />
                        : i + 1}
                    </span>
                    <span className="flex-1 truncate text-sm">{row.display_name}</span>
                    <span className="text-sm font-semibold tabular-nums">
                      {Math.round(row.score).toLocaleString()} <span className="text-xs font-normal text-muted-foreground">{unit}</span>
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="py-2 text-center text-xs text-muted-foreground">{t("noScores")}</p>
            )}

            {challenge.is_owner && (
              <Button size="sm" variant="ghost" className="text-destructive" onClick={remove}>
                <Trash2 className="mr-1 h-4 w-4" />{t("delete")}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CreateChallengeDialog({
  open, onOpenChange, groups, onCreated,
}: { open: boolean; onOpenChange: (v: boolean) => void; groups: Group[]; onCreated: () => void }) {
  const t = useTranslations("challenges");
  const tt = useTranslations("teams");
  const noTeam = groups.length === 0;
  const [groupId, setGroupId] = useState("");
  const [teamName, setTeamName] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState<ChallengeType>("volume");
  const [start, setStart] = useState(todayISO());
  const [end, setEnd] = useState(todayISO(7));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && groups.length && !groupId) setGroupId(groups[0].id);
  }, [open, groups, groupId]);

  async function submit() {
    if (!name.trim()) return;
    if (noTeam && !teamName.trim()) return;
    if (!noTeam && !groupId) return;
    setBusy(true);
    setError(null);
    try {
      // First-time users have no team — create one on the fly.
      const gid = noTeam ? await createGroup(teamName.trim()) : groupId;
      await createChallenge({ groupId: gid, name: name.trim(), type, start, end });
      setName("");
      setTeamName("");
      onCreated();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-orange-500" />{t("createTitle")}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {noTeam ? (
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">{t("newTeamLabel")}</label>
              <Input value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder={tt("teamName")} />
              <p className="mt-1 text-[11px] text-muted-foreground">{t("newTeamHint")}</p>
            </div>
          ) : groups.length > 1 ? (
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">{t("team")}</label>
              <div className="flex flex-wrap gap-1.5">
                {groups.map((g) => (
                  <button key={g.id} onClick={() => setGroupId(g.id)}
                    className={cn("rounded-full border px-2.5 py-1 text-xs",
                      groupId === g.id ? "border-accent-500 bg-accent-50 text-accent-700 dark:bg-accent-950/40" : "border-border text-muted-foreground")}>
                    {g.name}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">{t("name")}</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("namePlaceholder")} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">{t("type")}</label>
            <div className="flex flex-wrap gap-1.5">
              {TYPES.map((ty) => (
                <button key={ty} onClick={() => setType(ty)}
                  className={cn("rounded-full border px-2.5 py-1 text-xs",
                    type === ty ? "border-accent-500 bg-accent-50 text-accent-700 dark:bg-accent-950/40" : "border-border text-muted-foreground")}>
                  {t(`type_${ty}`)}
                </button>
              ))}
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">{t(`typeHint_${type}`)}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">{t("start")}</label>
              <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">{t("end")}</label>
              <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
            </div>
          </div>
          {error && <p className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">{error}</p>}
          <Button className="w-full" onClick={submit} disabled={busy || !name.trim() || (noTeam ? !teamName.trim() : !groupId)}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : t("create")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
