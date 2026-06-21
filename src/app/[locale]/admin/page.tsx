"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useAuth } from "@/contexts/AuthContext";
import {
  adminListUsers,
  adminUpdateUserStatus,
  adminSetRole,
  adminSetUserPlan,
  listPlans,
  createPlan,
  updatePlan,
  deletePlan,
  getAppSettings,
  setAppSetting,
  FEATURE_KEYS,
  type AdminUserProfile,
  type Plan,
  type FeatureKey,
} from "@/lib/adminService";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Check, Trash2, Loader2, ShieldCheck, Plus, Users2, CreditCard, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Tab = "users" | "plans" | "gdpr";

const TABS: { id: Tab; icon: LucideIcon }[] = [
  { id: "users", icon: Users2 },
  { id: "plans", icon: CreditCard },
  { id: "gdpr", icon: ShieldCheck },
];

export default function AdminPage() {
  const t = useTranslations("admin");
  const router = useRouter();
  const { isAdmin, loading } = useAuth();
  const [tab, setTab] = useState<Tab>("users");
  const [counts, setCounts] = useState<{ users?: number; plans?: number }>({});

  useEffect(() => {
    if (!loading && !isAdmin) router.replace("/");
  }, [loading, isAdmin, router]);

  useEffect(() => {
    if (!isAdmin) return;
    Promise.all([adminListUsers(), listPlans()])
      .then(([u, p]) => setCounts({ users: u.length, plans: p.length }))
      .catch(() => {});
  }, [isAdmin]);

  if (!isAdmin) return null;

  return (
    <>
      <PageHeader title={t("title")} showBack />
      <div className="space-y-4 p-4 pb-24">
        <div className="grid grid-cols-3 gap-2">
          {TABS.map(({ id, icon: Icon }) => {
            const count = id === "users" ? counts.users : id === "plans" ? counts.plans : undefined;
            return (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-lg border p-3 text-xs font-medium transition-colors",
                  tab === id
                    ? "border-accent-500 bg-accent-50 text-accent-700 dark:bg-accent-900/20"
                    : "border-border text-muted-foreground hover:border-accent-300"
                )}
              >
                <Icon className="h-5 w-5" />
                <span>{t(id)}{count != null ? ` (${count})` : ""}</span>
              </button>
            );
          })}
        </div>

        {tab === "users" && <UsersTab />}
        {tab === "plans" && <PlansTab />}
        {tab === "gdpr" && <GdprTab />}
      </div>
    </>
  );
}

function UsersTab() {
  const t = useTranslations("admin");
  const [users, setUsers] = useState<AdminUserProfile[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    const [u, p] = await Promise.all([adminListUsers(), listPlans()]);
    setUsers(u);
    setPlans(p);
    setLoading(false);
  }
  useEffect(() => {
    refresh();
  }, []);

  if (loading) return <Loader2 className="mx-auto my-8 h-6 w-6 animate-spin text-muted-foreground" />;
  if (users.length === 0) return <p className="py-6 text-center text-sm text-muted-foreground">{t("noUsers")}</p>;

  const statusColor: Record<string, string> = {
    pending: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    active: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
    deactivated: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  };

  return (
    <div className="space-y-2">
      {users.map((u) => (
        <Card key={u.id}>
          <CardContent className="space-y-2 py-3">
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <p className="truncate font-medium">{u.display_name ?? u.email}</p>
                <p className="truncate text-xs text-muted-foreground">{u.email}</p>
              </div>
              <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", statusColor[u.status])}>
                {t(u.status)}
              </span>
              {u.role === "admin" && (
                <span className="rounded-full bg-accent-100 px-2 py-0.5 text-[10px] font-medium text-accent-700 dark:bg-accent-900/40 dark:text-accent-300">
                  {t("role_admin")}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {u.status === "pending" && (
                <Button size="xs" onClick={async () => { await adminUpdateUserStatus(u.user_id, "active"); refresh(); }}>
                  <Check className="mr-1 h-3 w-3" />{t("approve")}
                </Button>
              )}
              {u.status === "active" && (
                <Button size="xs" variant="outline" onClick={async () => { await adminUpdateUserStatus(u.user_id, "deactivated"); refresh(); }}>
                  {t("deactivate")}
                </Button>
              )}
              {u.status === "deactivated" && (
                <Button size="xs" variant="outline" onClick={async () => { await adminUpdateUserStatus(u.user_id, "active"); refresh(); }}>
                  {t("reactivate")}
                </Button>
              )}
              <Button
                size="xs"
                variant="ghost"
                onClick={async () => { await adminSetRole(u.user_id, u.role === "admin" ? "user" : "admin"); refresh(); }}
              >
                {u.role === "admin" ? t("revokeAdmin") : t("makeAdmin")}
              </Button>

              <select
                value={u.plan_id ?? ""}
                onChange={async (e) => { await adminSetUserPlan(u.user_id, e.target.value); refresh(); }}
                className="ml-auto rounded-md border border-border bg-transparent px-2 py-1 text-xs"
              >
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function PlansTab() {
  const t = useTranslations("admin");
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  async function refresh() {
    setLoading(true);
    setPlans(await listPlans());
    setLoading(false);
  }
  useEffect(() => {
    refresh();
  }, []);

  if (loading) return <Loader2 className="mx-auto my-8 h-6 w-6 animate-spin text-muted-foreground" />;

  return (
    <div className="space-y-3">
      <Button
        className="w-full"
        disabled={creating}
        onClick={async () => {
          setCreating(true);
          try { await createPlan({ name: t("newPlan"), features: [] }); await refresh(); }
          finally { setCreating(false); }
        }}
      >
        {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="mr-1 h-4 w-4" />{t("createPlan")}</>}
      </Button>

      {plans.map((p) => (
        <PlanCard key={p.id} plan={p} onChanged={refresh} />
      ))}
    </div>
  );
}

function PlanCard({ plan, onChanged }: { plan: Plan; onChanged: () => void }) {
  const t = useTranslations("admin");
  const [name, setName] = useState(plan.name);
  const [desc, setDesc] = useState(plan.description ?? "");
  const [features, setFeatures] = useState<string[]>(plan.features ?? []);
  const [busy, setBusy] = useState(false);

  function toggle(f: FeatureKey) {
    setFeatures((arr) => (arr.includes(f) ? arr.filter((x) => x !== f) : [...arr, f]));
  }

  return (
    <Card>
      <CardContent className="space-y-3 py-3">
        <div className="flex items-center gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} className="font-semibold" />
          {plan.is_default && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">{t("default")}</span>
          )}
        </div>
        <Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder={t("planDesc")} />
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">{t("features")}</p>
          {FEATURE_KEYS.map((f) => (
            <button
              key={f}
              onClick={() => toggle(f)}
              className="flex w-full items-center gap-2 text-left text-sm"
            >
              <span className={cn(
                "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                features.includes(f) ? "border-accent-500 bg-accent-500 text-white" : "border-gray-400"
              )}>
                {features.includes(f) && <Check className="h-3 w-3" />}
              </span>
              {t(`feat_${f}`)}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            className="flex-1"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try { await updatePlan(plan.id, { name: name.trim(), description: desc.trim() || undefined, features }); onChanged(); }
              finally { setBusy(false); }
            }}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : t("save")}
          </Button>
          {!plan.is_default && (
            <Button size="sm" variant="ghost" className="text-destructive" onClick={async () => { await deletePlan(plan.id); onChanged(); }}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function GdprTab() {
  const t = useTranslations("admin");
  const [s, setS] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getAppSettings().then((v) => { setS(v); setLoading(false); });
  }, []);

  async function save() {
    await Promise.all(
      ["company_name", "company_address", "dpo_email", "contact_email"].map((k) => setAppSetting(k, s[k] ?? ""))
    );
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (loading) return <Loader2 className="mx-auto my-8 h-6 w-6 animate-spin text-muted-foreground" />;

  const field = (key: string, label: string) => (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">{label}</label>
      <Input value={s[key] ?? ""} onChange={(e) => setS({ ...s, [key]: e.target.value })} />
    </div>
  );

  return (
    <Card>
      <CardContent className="space-y-3 py-4">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <ShieldCheck className="h-4 w-4 text-accent-500" /> {t("gdpr")}
        </p>
        {field("company_name", t("companyName"))}
        {field("company_address", t("companyAddress"))}
        {field("dpo_email", t("dpoEmail"))}
        {field("contact_email", t("contactEmail"))}
        <Button onClick={save} className="w-full">
          {saved ? <><Check className="mr-1 h-4 w-4" />{t("saved")}</> : t("saveSettings")}
        </Button>
      </CardContent>
    </Card>
  );
}
