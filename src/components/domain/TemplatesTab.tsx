"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { Copy, Eye, EyeOff, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  createTemplate, deleteTemplate, listTemplates, updateTemplate, type AdminTemplate,
} from "@/lib/templateService";

/** Admin: the ready-made programs offered to every user. */
export function TemplatesTab() {
  const t = useTranslations("adminTemplates");
  const tl = useTranslations("templates");
  const router = useRouter();
  const [items, setItems] = useState<AdminTemplate[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    return listTemplates().then(setItems).catch((e: Error) => setError(e.message));
  }
  useEffect(() => {
    load();
  }, []);

  async function run(action: () => Promise<unknown>) {
    setError(null);
    try {
      await action();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  async function addNew() {
    const id = await createTemplate({ name: t("untitled"), structure: [{ name: `${t("day")} 1`, exercises: [] }] });
    router.push(`/admin/templates/${id}`);
  }

  function duplicate(item: AdminTemplate) {
    // A copy starts hidden, so users don't see it half-edited.
    return run(() => createTemplate({ ...item, name: t("copyOf", { name: item.name }), isPublished: false }));
  }

  if (error && !items) return <p className="text-sm text-destructive">{t("loadError")}</p>;
  if (!items) return <Loader2 className="mx-auto my-8 h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />;

  return (
    <div className="space-y-3">
      <Button className="w-full" onClick={() => run(addNew)}>
        <Plus className="mr-1 h-4 w-4" aria-hidden="true" />
        {t("new")}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}

      {items.map((item) => (
        <Card key={item.id}>
          <CardContent className="space-y-2 py-3">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{item.name}</p>
                <p className="text-xs text-muted-foreground">
                  {tl(`goal_${item.goal}`)} · {tl(`level_${item.level}`)} · {item.daysPerWeek} {tl("daysShort")}
                </p>
              </div>
              {item.locale && (
                <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground uppercase">{item.locale}</span>
              )}
              {!item.isPublished && (
                <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">{t("hidden")}</span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href={`/admin/templates/${item.id}`} className={buttonVariants({ size: "sm", variant: "outline" })}>
                <Pencil className="mr-1 h-4 w-4" aria-hidden="true" />
                {t("edit")}
              </Link>
              <Button size="sm" variant="outline" onClick={() => duplicate(item)}>
                <Copy className="mr-1 h-4 w-4" aria-hidden="true" />
                {t("copy")}
              </Button>
              <Button
                size="icon-sm"
                variant="outline"
                aria-label={item.isPublished ? t("hide") : t("show")}
                onClick={() => run(() => updateTemplate(item.id, { isPublished: !item.isPublished }))}
              >
                {item.isPublished ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
              </Button>
              <Button
                size="icon-sm"
                variant="ghost"
                className="text-destructive"
                aria-label={t("delete")}
                onClick={() => {
                  if (window.confirm(t("deleteConfirm", { name: item.name }))) run(() => deleteTemplate(item.id));
                }}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
