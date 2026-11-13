"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useTeams } from "@/hooks/useTeams";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import {
  createGroup,
  inviteGroupMember,
  getGroupMembers,
  removeGroupMember,
  respondToInvitation,
  type GroupMember,
} from "@/lib/groupService";
import { useTeamAdherence } from "@/hooks/useClientActivity";
import { byAttention, type Adherence } from "@/lib/adherence";
import { NudgeButton } from "@/components/domain/NudgeButton";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { EmptyState, SectionHeading } from "@/components/ui/page-parts";
import { DetailRow } from "@/components/ui/detail-row";
import {
  Plus,
  Users,
  Mail,
  Trash2,
  Check,
  X,
  Loader2,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
} from "lucide-react";

export default function TeamsPage() {
  const t = useTranslations("teams");
  const { hasFeature } = useFeatureAccess();
  const { myGroups, memberships, loading, refresh } = useTeams();

  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  async function handleCreate() {
    if (!newName.trim()) return;
    setBusy(true);
    try {
      await createGroup(newName.trim(), newDesc.trim() || undefined);
      setNewName("");
      setNewDesc("");
      setCreating(false);
      await refresh();
      showToast(t("inviteSent"));
    } finally {
      setBusy(false);
    }
  }

  const pendingInvites = memberships.filter((m) => m.status === "pending");

  return (
    <>
      <PageHeader
        title={t("title")}
        actions={
          hasFeature("coaching") ? (
            <Button size="sm" onClick={() => setCreating((v) => !v)}>
              <Plus className="mr-1 h-4 w-4" />
              {t("createTeam")}
            </Button>
          ) : undefined
        }
      />

      <div className="space-y-6 p-4 pb-24">
        {toast && (
          <div className="fixed left-1/2 top-16 z-50 -translate-x-1/2 rounded-lg bg-accent-600 px-4 py-2 text-sm font-medium text-white shadow-lg">
            {toast}
          </div>
        )}

        {creating && (
          <Card>
            <CardContent className="space-y-3 py-4">
              <Input
                aria-label={t("teamName")}
                placeholder={t("teamName")}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <Input
                aria-label={t("teamDescription")}
                placeholder={t("teamDescription")}
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
              />
              <Button onClick={handleCreate} disabled={busy || !newName.trim()} className="w-full">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : t("createTeam")}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Pending invitations */}
        {pendingInvites.length > 0 && (
          <section className="space-y-2">
            <SectionHeading>{t("pendingInvites")}</SectionHeading>
            {pendingInvites.map((inv) => (
              <Card key={inv.member_id} className="border-accent-200 dark:border-accent-900">
                <CardContent className="flex items-center gap-3 py-3">
                  <div className="flex-1">
                    <p className="font-medium">{inv.group_name}</p>
                    <p className="text-xs text-muted-foreground">{inv.owner_name}</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={async () => {
                      await respondToInvitation(inv.member_id, true);
                      await refresh();
                      showToast(t("accept"));
                    }}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      await respondToInvitation(inv.member_id, false);
                      await refresh();
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </section>
        )}

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Teams I coach */}
            <section className="space-y-2">
              <SectionHeading>{t("myTeams")}</SectionHeading>
              {myGroups.length === 0 ? (
                <EmptyState icon={Users} title={t("noTeams")} />
              ) : (
                myGroups.map((g) => (
                  <TeamCard
                    key={g.id}
                    groupId={g.id}
                    name={g.name}
                    memberCount={g.member_count}
                    expanded={expanded === g.id}
                    onToggle={() => setExpanded(expanded === g.id ? null : g.id)}
                    onChanged={refresh}
                    showToast={showToast}
                  />
                ))
              )}
            </section>

            {/* Teams I'm in */}
            <section className="space-y-2">
              <SectionHeading>{t("myMemberships")}</SectionHeading>
              {memberships.filter((m) => m.status === "active").length === 0 ? (
                <EmptyState icon={Users} title={t("noMemberships")} />
              ) : (
                memberships
                  .filter((m) => m.status === "active")
                  .map((m) => (
                    <DetailRow key={m.member_id} icon={Users} title={m.group_name} subtitle={m.owner_name} />
                  ))
              )}
            </section>
          </>
        )}
      </div>
    </>
  );
}

/** How regularly an athlete trains: green, amber or red, with the reason. */
function AdherenceBadge({ value }: { value: Adherence | undefined }) {
  const t = useTranslations("teams");
  if (!value) return null;
  const week = value.weeks.at(-1)!;
  const text =
    value.daysSinceLast === null ? t("noActivity")
    : value.daysSinceLast >= 4 ? t("daysAgo", { days: value.daysSinceLast })
    : week.planned !== null ? t("adherenceWeek", { done: week.done, planned: week.planned })
    : t("adherenceSessions", { count: week.done });
  return (
    <span
      title={t("complianceTip")}
      className={cn(
        "flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-xs font-medium",
        value.status === "good" && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
        value.status === "watch" && "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
        value.status === "alert" && "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300"
      )}
    >
      {value.status !== "good" && <AlertTriangle className="h-3 w-3" aria-hidden="true" />}
      {text}
      {value.recentRpe !== null && value.recentRpe >= 9 && <span>· RPE {value.recentRpe}</span>}
    </span>
  );
}

function TeamCard({
  groupId,
  name,
  memberCount,
  expanded,
  onToggle,
  onChanged,
  showToast,
}: {
  groupId: string;
  name: string;
  memberCount: number;
  expanded: boolean;
  onToggle: () => void;
  onChanged: () => Promise<void>;
  showToast: (m: string) => void;
}) {
  const t = useTranslations("teams");
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [membersLoaded, setMembersLoaded] = useState(false);
  const loadingMembers = expanded && !membersLoaded;
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!expanded) return;
    getGroupMembers(groupId)
      .then(setMembers)
      .catch(() => setMembers([]))
      .finally(() => setMembersLoaded(true));
    return () => setMembersLoaded(false);
  }, [expanded, groupId]);

  const adherenceByUser = useTeamAdherence(members.filter((m) => m.status === "active" && m.user_id).map((m) => m.user_id!));
  const ordered = byAttention(members, (m) => (m.user_id ? adherenceByUser?.get(m.user_id)?.status : undefined));

  async function reloadMembers() {
    setMembers(await getGroupMembers(groupId));
  }

  async function handleInvite() {
    if (!email.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      await inviteGroupMember(groupId, email.trim());
      setEmail("");
      await reloadMembers();
      await onChanged();
      showToast(t("inviteSent"));
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardContent className="py-3">
        <button onClick={onToggle} className="flex w-full items-center gap-3 text-left">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-100 dark:bg-accent-900/30">
            <Users className="h-5 w-5 text-accent-text" />
          </div>
          <div className="flex-1">
            <p className="font-medium">{name}</p>
            <p className="text-xs text-muted-foreground">
              {memberCount} · {t("roster")}
            </p>
          </div>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        {expanded && (
          <div className="mt-3 space-y-3 border-t border-border pt-3">
            <div className="flex gap-2">
              <Input
                type="email"
                aria-label={t("inviteEmail")}
                placeholder={t("inviteEmail")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Button onClick={handleInvite} disabled={busy || !email.trim()} aria-label={t("invite")}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              </Button>
            </div>
            {err && <p className="text-xs text-red-600">{err}</p>}

            {loadingMembers ? (
              <Loader2 className="mx-auto my-3 h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              <div className="space-y-1">
                {ordered.map((m) => (
                  <div key={m.id} className="flex items-center gap-2 rounded-md px-1 py-1.5 text-sm">
                    {m.status === "active" && m.user_id ? (
                      <Link href={`/client/${m.user_id}`} className="flex-1 truncate hover:underline">
                        {m.display_name}
                      </Link>
                    ) : (
                      <span className="flex-1 truncate">{m.display_name}</span>
                    )}
                    {m.status === "active" && m.user_id && <AdherenceBadge value={adherenceByUser?.get(m.user_id)} />}
                    {m.status === "active" && m.user_id && (
                      <NudgeButton
                        compact
                        userId={m.user_id}
                        name={m.display_name}
                        adherence={adherenceByUser?.get(m.user_id)}
                        onSent={() => showToast(t("nudgeSent"))}
                      />
                    )}
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      {m.status === "pending" ? t("status_pending") : t(`role_${m.role}`)}
                    </span>
                    <button
                      onClick={async () => {
                        await removeGroupMember(m.id);
                        await reloadMembers();
                        await onChanged();
                      }}
                      className="rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                {members.length === 0 && (
                  <p className="py-2 text-center text-xs text-muted-foreground">{t("roster")}</p>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
