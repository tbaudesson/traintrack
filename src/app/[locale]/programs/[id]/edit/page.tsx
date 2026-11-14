"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useFormat } from "@/lib/format";
import { useInjuriesOf } from "@/hooks/useAthleteProfile";
import { useRouter } from "@/i18n/navigation";
import { useProgram, updateProgram, deleteProgram, assignProgramToClients } from "@/hooks/usePrograms";
import { DetailRow } from "@/components/ui/detail-row";
import { ProgramDaysEditor } from "@/components/domain/ProgramDaysEditor";
import { useClients } from "@/hooks/useClients";
import type { ProgramDay } from "@/db";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Trash2, Save, Loader2, UserCheck, Users, CalendarDays } from "lucide-react";
import { nextMonday, programWeek } from "@/lib/programWeek";
import { localDate } from "@/lib/dates";
import { programOrigin } from "@/lib/programOrigin";
import { useReadyMadeNames } from "@/lib/templateService";
import { getCurrentUserIdSync } from "@/db";

export default function ProgramEditorPage() {
  const t = useTranslations("programs");
  const { day } = useFormat();
  const params = useParams();
  const router = useRouter();
  const programId = Number(params.id);
  const program = useProgram(programId);
  const readyMade = useReadyMadeNames();
  const origin = program ? programOrigin(program, getCurrentUserIdSync(), readyMade) : null;
  // Only one's own programs are edited here; the others are followed as they are.
  useEffect(() => {
    if (program && origin !== "mine") router.replace(`/programs/${programId}`);
  }, [program, origin, router, programId]);
  const { clients } = useClients();
  // A team program has no single athlete: no injury to flag.
  const forTeam = !!program?.groupId && !program.assignedToUserId;
  const athleteInjuries = useInjuriesOf(program?.assignedToUserId);
  const injuries = forTeam ? [] : athleteInjuries;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [days, setDays] = useState<ProgramDay[]>([]);
  const [assignedTo, setAssignedTo] = useState<string | null>(null);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [teamOpen, setTeamOpen] = useState(false);
  const [teamResult, setTeamResult] = useState<string | null>(null);
  const [assigningTeam, setAssigningTeam] = useState(false);

  if (program && !loaded) {
    setName(program.name);
    setDescription(program.description ?? "");
    setDays(program.structure ?? []);
    setAssignedTo(program.assignedToUserId ?? null);
    setGroupId(program.groupId ?? null);
    setStartDate(program.startDate ?? "");
    setLoaded(true);
  }

  async function save() {
    setSaving(true);
    try {
      await updateProgram(programId, {
        name: name.trim() || t("untitled"),
        description: description.trim() || undefined,
        structure: days,
        assignedToUserId: assignedTo,
        groupId,
        startDate: startDate || null,
      });
      router.push(`/programs/${programId}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    await deleteProgram(programId);
    router.push("/programs");
  }

  function assignClient(userId: string | null, gId: string | null) {
    setAssignedTo(userId);
    setGroupId(gId);
    setAssignOpen(false);
  }

  const assignedClient = clients.find((c) => c.userId === assignedTo);
  const weekInfo = startDate ? programWeek({ startDate, structure: days }, localDate()) : null;

  // Every team the coach has clients in, with those clients.
  const teams = [...new Map(clients.map((c) => [c.groupId, c.groupName])).entries()].map(([groupId, groupName]) => ({
    groupId,
    groupName,
    members: clients.filter((c) => c.groupId === groupId),
  }));

  async function assignToTeam(team: (typeof teams)[number]) {
    setAssigningTeam(true);
    try {
      const finalName = name.trim() || t("untitled");
      // Hand out what is on screen, and keep the model in step with it.
      await updateProgram(programId, { name: finalName, description: description.trim() || undefined, structure: days });
      const result = await assignProgramToClients(
        { name: finalName, description: description.trim() || undefined, structure: days },
        team.members,
        startDate || null
      );
      setTeamResult(t("teamAssigned", { team: team.groupName, count: result.created + result.updated }));
      setTeamOpen(false);
    } finally {
      setAssigningTeam(false);
    }
  }

  if (program && origin !== "mine") return null;

  if (!program) {
    return (
      <div className="flex justify-center p-10">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title={t("edit")}
        showBack
        actions={
          <Button size="sm" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="mr-1 h-4 w-4" />{t("save")}</>}
          </Button>
        }
      />
      <div className="space-y-5 p-4 pb-28">
        <div className="space-y-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("name")} />
          <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t("description")} />
        </div>

        {teamResult && <p role="status" className="text-sm font-medium text-success-text">{teamResult}</p>}

        {/* Assignment */}
        <Card>
          <CardContent className="flex items-center gap-3 py-3">
            <UserCheck className="h-5 w-5 text-green-600" />
            <div className="flex-1">
              <p className="text-sm font-medium">{t("assignTo")}</p>
              <p className="text-xs text-muted-foreground">
                {assignedClient ? assignedClient.displayName : t("notAssigned")}
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Button size="sm" variant="outline" onClick={() => setAssignOpen(true)}>
                {t("assign")}
              </Button>
              {!assignedTo && teams.length > 0 && (
                <Button size="sm" variant="outline" onClick={() => setTeamOpen(true)}>
                  <Users className="mr-1 h-4 w-4" aria-hidden="true" />
                  {t("assignTeam")}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Start date */}
        <Card>
          <CardContent className="space-y-2 py-3">
            <div className="flex items-center gap-3">
              <CalendarDays className="h-5 w-5 text-accent-text" aria-hidden="true" />
              <label htmlFor="program-start" className="flex-1 text-sm font-medium">{t("startDate")}</label>
              <Input
                id="program-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-auto"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => setStartDate(nextMonday(localDate()))}>
                {t("startNextMonday")}
              </Button>
              {startDate && (
                <Button size="sm" variant="ghost" onClick={() => setStartDate("")}>
                  {t("startNone")}
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {startDate && weekInfo
                ? weekInfo.started
                  ? weekInfo.total
                    ? t("weekOf", { week: weekInfo.week, total: weekInfo.total })
                    : t("weekSince", { week: weekInfo.week })
                  : t("startsOn", { date: day(startDate) })
                : t("startHint")}
            </p>
          </CardContent>
        </Card>

        <ProgramDaysEditor days={days} setDays={setDays} injuries={injuries} />

        <Button variant="ghost" className="w-full text-destructive" onClick={handleDelete}>
          <Trash2 className="mr-1 h-4 w-4" />
          {t("deleteProgram")}
        </Button>
      </div>

      <Dialog open={teamOpen} onOpenChange={setTeamOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("assignTeam")}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{t("assignTeamHint")}</p>
          <div className="space-y-2">
            {teams.map((team) => (
              <DetailRow
                key={team.groupId}
                onClick={() => assignToTeam(team)}
                disabled={assigningTeam}
                icon={Users}
                title={team.groupName}
                subtitle={t("teamMembers", { count: team.members.length })}
              />
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Assign client */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("assignTo")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-1">
            <button
              onClick={() => assignClient(null, null)}
              className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-accent"
            >
              {t("notAssigned")}
            </button>
            {clients.map((c) => (
              <button
                key={c.userId}
                onClick={() => assignClient(c.userId, c.groupId)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-accent"
              >
                <UserCheck className="h-4 w-4 text-green-600" />
                <span className="flex-1">{c.displayName}</span>
                <span className="text-xs text-muted-foreground">{c.groupName}</span>
              </button>
            ))}
            {clients.length === 0 && (
              <p className="px-2 py-2 text-xs text-muted-foreground">{t("noClients")}</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
