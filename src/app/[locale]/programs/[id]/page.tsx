"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useProgram, updateProgram, deleteProgram, assignProgramToClients } from "@/hooks/usePrograms";
import { DetailRow } from "@/components/ui/detail-row";
import { useExercises } from "@/hooks/useExercises";
import { useClients } from "@/hooks/useClients";
import type { ProgramDay, ProgramExercise } from "@/db";
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
import { Plus, Trash2, Dumbbell, Save, Loader2, UserCheck, Users, X } from "lucide-react";

export default function ProgramEditorPage() {
  const t = useTranslations("programs");
  const params = useParams();
  const router = useRouter();
  const programId = Number(params.id);
  const program = useProgram(programId);
  const exercises = useExercises();
  const { clients } = useClients();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [days, setDays] = useState<ProgramDay[]>([]);
  const [assignedTo, setAssignedTo] = useState<string | null>(null);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pickerDay, setPickerDay] = useState<number | null>(null);
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
    setLoaded(true);
  }

  function updateDay(i: number, day: ProgramDay) {
    setDays((d) => d.map((x, idx) => (idx === i ? day : x)));
  }
  function addDay() {
    setDays((d) => [...d, { name: `${t("day")} ${d.length + 1}`, exercises: [] }]);
  }
  function removeDay(i: number) {
    setDays((d) => d.filter((_, idx) => idx !== i));
  }
  function addExerciseToDay(dayIdx: number, name: string, uuid?: string) {
    const pe: ProgramExercise = { exerciseName: name, exerciseUuid: uuid, targetSets: 3, targetReps: "8-12", restSec: 90 };
    setDays((d) => d.map((x, idx) => (idx === dayIdx ? { ...x, exercises: [...x.exercises, pe] } : x)));
    setPickerDay(null);
  }
  function updateExercise(dayIdx: number, exIdx: number, patch: Partial<ProgramExercise>) {
    setDays((d) =>
      d.map((x, idx) =>
        idx === dayIdx ? { ...x, exercises: x.exercises.map((e, ei) => (ei === exIdx ? { ...e, ...patch } : e)) } : x
      )
    );
  }
  function removeExercise(dayIdx: number, exIdx: number) {
    setDays((d) => d.map((x, idx) => (idx === dayIdx ? { ...x, exercises: x.exercises.filter((_, ei) => ei !== exIdx) } : x)));
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
      });
      router.push("/programs");
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
        team.members
      );
      setTeamResult(t("teamAssigned", { team: team.groupName, count: result.created + result.updated }));
      setTeamOpen(false);
    } finally {
      setAssigningTeam(false);
    }
  }

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

        {/* Days */}
        {days.map((day, di) => (
          <Card key={di}>
            <CardContent className="space-y-3 py-3">
              <div className="flex items-center gap-2">
                <Input
                  value={day.name}
                  onChange={(e) => updateDay(di, { ...day, name: e.target.value })}
                  className="flex-1 font-semibold"
                />
                <button onClick={() => removeDay(di)} className="rounded-md p-2 text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              {day.exercises.map((ex, ei) => (
                <div key={ei} className="rounded-lg border border-border p-2">
                  <div className="mb-2 flex items-center gap-2">
                    <Dumbbell className="h-4 w-4 text-accent-500" />
                    <span className="flex-1 text-sm font-medium">{ex.exerciseName}</span>
                    <button onClick={() => removeExercise(di, ei)} className="text-muted-foreground hover:text-destructive">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <label className="text-xs text-muted-foreground">
                      {t("sets")}
                      <Input
                        type="number"
                        value={ex.targetSets}
                        onChange={(e) => updateExercise(di, ei, { targetSets: Number(e.target.value) })}
                        className="mt-0.5 h-10"
                      />
                    </label>
                    <label className="text-xs text-muted-foreground">
                      {t("reps")}
                      <Input
                        value={ex.targetReps}
                        onChange={(e) => updateExercise(di, ei, { targetReps: e.target.value })}
                        className="mt-0.5 h-10"
                      />
                    </label>
                    <label className="text-xs text-muted-foreground">
                      {t("rest")}
                      <Input
                        type="number"
                        value={ex.restSec ?? ""}
                        onChange={(e) => updateExercise(di, ei, { restSec: Number(e.target.value) })}
                        className="mt-0.5 h-10"
                      />
                    </label>
                  </div>
                </div>
              ))}

              <Button variant="ghost" size="sm" className="w-full" onClick={() => setPickerDay(di)}>
                <Plus className="mr-1 h-4 w-4" />
                {t("addExercise")}
              </Button>
            </CardContent>
          </Card>
        ))}

        <Button variant="outline" className="w-full" onClick={addDay}>
          <Plus className="mr-1 h-4 w-4" />
          {t("addDay")}
        </Button>

        <Button variant="ghost" className="w-full text-destructive" onClick={handleDelete}>
          <Trash2 className="mr-1 h-4 w-4" />
          {t("deleteProgram")}
        </Button>
      </div>

      {/* Exercise picker */}
      <Dialog open={pickerDay !== null} onOpenChange={(o) => !o && setPickerDay(null)}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("addExercise")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-1">
            {exercises.map((e) => (
              <button
                key={e.id}
                onClick={() => pickerDay !== null && addExerciseToDay(pickerDay, e.name, e.uuid)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-accent"
              >
                <Dumbbell className="h-4 w-4 text-accent-500" />
                {e.name}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

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
