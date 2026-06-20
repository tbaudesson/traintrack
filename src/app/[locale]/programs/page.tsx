"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { usePrograms, createProgram } from "@/hooks/usePrograms";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, ClipboardList, ChevronRight, Loader2, UserCheck } from "lucide-react";

export default function ProgramsPage() {
  const t = useTranslations("programs");
  const router = useRouter();
  const programs = usePrograms();
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);

  async function handleCreate() {
    setBusy(true);
    const id = await createProgram({ name: t("untitled"), structure: [{ name: t("day") + " 1", exercises: [] }] });
    router.push(`/programs/${id}`);
  }

  const mine = programs.filter((p) => !p.assignedToUserId || p.ownerUserId === user?.id);
  const assignedToMe = programs.filter((p) => p.assignedToUserId === user?.id && p.ownerUserId !== user?.id);

  return (
    <>
      <PageHeader
        title={t("title")}
        showBack
        actions={
          <Button size="sm" onClick={handleCreate} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="mr-1 h-4 w-4" />{t("create")}</>}
          </Button>
        }
      />
      <div className="space-y-6 p-4 pb-24">
        {assignedToMe.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-muted-foreground">{t("assignedToMe")}</h2>
            {assignedToMe.map((p) => (
              <Card key={p.id}>
                <CardContent className="flex items-center gap-3 py-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                    <UserCheck className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{p.name}</p>
                    <p className="text-xs text-muted-foreground">{(p.structure ?? []).length} {t("days")}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </section>
        )}

        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">{t("myPrograms")}</h2>
          {mine.length === 0 ? (
            <p className="rounded-lg bg-card/60 py-6 text-center text-sm text-muted-foreground">{t("noPrograms")}</p>
          ) : (
            mine.map((p) => (
              <Card key={p.id}>
                <CardContent className="py-0">
                  <button onClick={() => router.push(`/programs/${p.id}`)} className="flex w-full items-center gap-3 py-3 text-left">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
                      <ClipboardList className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(p.structure ?? []).length} {t("days")}
                        {p.assignedToUserId ? ` · ${t("assigned")}` : ""}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
                  </button>
                </CardContent>
              </Card>
            ))
          )}
        </section>
      </div>
    </>
  );
}
