"use client";

import { useState, useEffect } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter, usePathname, Link } from "@/i18n/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { deleteMyAccount, updateMyDisplayName } from "@/lib/adminService";
import { downloadJSONBackup } from "@/lib/exportService";
import db from "@/db";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { getApiKey, setApiKey, clearApiKey } from "@/lib/aiService";
import { forceFullResync } from "@/lib/syncEngine";
import {
  isPushSupported, isPushConfigured, getPushSubscription, subscribeToPush, unsubscribeFromPush,
} from "@/lib/pushService";
import { getTextSize, applyTextSize, type TextSize } from "@/lib/textSize";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { useAthleteProfile, updateFitnessLevel, updateTrainingSchedule } from "@/hooks/useAthleteProfile";
import { trainingCalendar } from "@/lib/ics";
import type { FitnessLevel } from "@/db";
import { getMode, applyMode, getAccent, applyAccent, ACCENTS, type ThemeMode, type Accent } from "@/lib/appTheme";
import {
  NAV_CATALOG, getNavItemIds, setNavItemIds, resetNavItemIds, MAX_NAV_ITEMS, LOCKED_NAV_ID,
} from "@/lib/navConfig";
import {
  Download, Shield, LogOut, Trash2, Loader2, Sparkles, Check, Type, ShieldCheck,
  Palette, LayoutGrid, Monitor, Sun, Moon, Globe, RotateCcw, CheckCircle2, User, Trophy,
  Home, Dumbbell, TrendingUp, Apple, Menu, ListChecks, ClipboardList, Users, HeartPulse,
  Pencil, X, Bell, BellOff, KeyRound, Newspaper, Gauge, CalendarDays, CalendarPlus,
  type LucideIcon,
} from "lucide-react";
import { localDate } from "@/lib/dates";

const LOCALES = [
  { id: "fr", label: "Français", flag: "🇫🇷" },
  { id: "en", label: "English", flag: "🇬🇧" },
  { id: "de", label: "Deutsch", flag: "🇩🇪" },
] as const;

const ACCENT_SWATCH: Record<Accent, string> = {
  violet: "#8b5cf6",
  indigo: "#6366f1", emerald: "#10b981", rose: "#f43f5e", amber: "#f59e0b", slate: "#64748b",
};

const NAV_ICONS: Record<string, LucideIcon> = {
  Home, Newspaper, Dumbbell, TrendingUp, Apple, Menu, ListChecks, ClipboardList, Users, HeartPulse, Trophy,
};

const WEEKDAYS = [1, 2, 3, 4, 5, 6, 7];

/** "L", "Lundi"… from 1 = Monday, in the app's language. 1 January 2024 was a Monday. */
function weekdayName(locale: string, day: number, width: "narrow" | "long") {
  return new Intl.DateTimeFormat(locale, { weekday: width, timeZone: "UTC" }).format(new Date(Date.UTC(2024, 0, day)));
}

function Section({ icon: Icon, title, action, children }: {
  icon: LucideIcon; title: string; action?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="py-4">
        <div className="mb-3 flex items-center gap-2">
          <Icon className="h-4 w-4 text-accent-500" />
          <h2 className="text-sm font-semibold">{title}</h2>
          {action && <div className="ml-auto">{action}</div>}
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  const t = useTranslations("settings");
  const tAuth = useTranslations("auth");
  const tai = useTranslations("ai");
  const ta11y = useTranslations("a11y");
  const ta = useTranslations("appearance");
  const tnav = useTranslations("nav");
  const tn = useTranslations("notifications");
  const tc = useTranslations("common");
  const tm = useTranslations("more");
  const to = useTranslations("onboarding");
  const athlete = useAthleteProfile();
  const { user, profile, signOut, isAdmin, refreshProfile } = useAuth();
  const { hasFeature } = useFeatureAccess();
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [keyIsSet, setKeyIsSet] = useState(() => !!getApiKey());
  const [keySavedFlag, setKeySavedFlag] = useState(false);
  const [textSize, setTextSize] = useState<TextSize>(() => getTextSize());
  const [mode, setMode] = useState<ThemeMode>(() => getMode());
  const [accent, setAccent] = useState<Accent>(() => getAccent());
  const [navIds, setNavIds] = useState<string[]>(() => getNavItemIds());
  const [editName, setEditName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [pushOn, setPushOn] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);
  const [resyncState, setResyncState] = useState<"idle" | "busy" | "done">("idle");

  async function handleResync() {
    setResyncState("busy");
    try {
      await forceFullResync();
      setResyncState("done");
      setTimeout(() => setResyncState("idle"), 2500);
    } catch {
      setResyncState("idle");
    }
  }

  useEffect(() => {
    if (isPushSupported()) getPushSubscription().then((s) => setPushOn(!!s)).catch(() => {});
  }, []);

  async function togglePush() {
    setPushBusy(true);
    setPushError(null);
    try {
      if (pushOn) {
        await unsubscribeFromPush();
        setPushOn(false);
      } else {
        await subscribeToPush();
        setPushOn(true);
      }
    } catch (e) {
      const code = e instanceof Error ? e.message : "";
      setPushError(
        code === "PERMISSION_DENIED" ? tn("denied")
          : code === "PUSH_NOT_CONFIGURED" ? tn("notConfigured")
          : code === "PUSH_UNSUPPORTED" ? tn("unsupported")
          : code || tn("error")
      );
    } finally {
      setPushBusy(false);
    }
  }

  const name = profile?.display_name ?? user?.email?.split("@")[0] ?? "";
  const initials = name.slice(0, 2).toUpperCase();

  async function saveName() {
    setSavingName(true);
    try {
      await updateMyDisplayName(nameDraft.trim());
      await refreshProfile();
      setEditName(false);
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setSavingName(false);
    }
  }

  function chooseTextSize(s: TextSize) { applyTextSize(s); setTextSize(s); }
  function chooseMode(m: ThemeMode) { applyMode(m); setMode(m); }
  function chooseAccent(a: Accent) { applyAccent(a); setAccent(a); }
  function toggleNav(id: string) {
    if (id === LOCKED_NAV_ID) return; // "more" is mandatory
    setNavIds((cur) => {
      let next: string[];
      if (cur.includes(id)) {
        next = cur.filter((x) => x !== id);
      } else {
        next = [...cur, id];
        // If over the cap, evict the oldest removable tab so adding always works
        if (next.length > MAX_NAV_ITEMS) {
          const victim = next.find((x) => x !== LOCKED_NAV_ID && x !== id);
          if (victim) next = next.filter((x) => x !== victim);
        }
      }
      setNavItemIds(next);
      return next;
    });
  }

  function saveKey() {
    if (!apiKeyInput.trim()) return;
    setApiKey(apiKeyInput.trim());
    setApiKeyInput("");
    setKeyIsSet(true);
    setKeySavedFlag(true);
    setTimeout(() => setKeySavedFlag(false), 2000);
  }
  function removeKey() { clearApiKey(); setKeyIsSet(false); }

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteMyAccount();
      await db.delete();
      await signOut();
      router.replace("/auth/login");
    } catch (e) {
      setDeleting(false);
      alert(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <>
      <PageHeader title={t("title")} />
      <div className="mx-auto max-w-lg space-y-4 p-4 pb-24">
        {/* User header */}
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent-500 to-accent-700 text-sm font-bold text-white">
              {initials || <User className="h-5 w-5" />}
            </div>
            <div className="min-w-0 flex-1">
              {editName ? (
                <div className="flex items-center gap-1.5">
                  <Input
                    autoFocus
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && saveName()}
                    aria-label={tc("edit")}
                  />
                  <Button size="icon-sm" aria-label={tc("save")} onClick={saveName} disabled={savingName}>
                    {savingName ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  </Button>
                  <Button size="icon-sm" variant="ghost" aria-label={tc("cancel")} onClick={() => setEditName(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <button
                  className="flex min-h-10 max-w-full items-center gap-1.5 text-left"
                  aria-label={`${tc("edit")} : ${name}`}
                  onClick={() => { setNameDraft(profile?.display_name ?? ""); setEditName(true); }}
                >
                  <span className="truncate font-semibold">{name}</span>
                  <Pencil className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                </button>
              )}
              <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
              {profile?.plan_name && (
                <span className="mt-1 inline-block rounded-full bg-accent-100 px-2 py-0.5 text-xs font-medium text-accent-700 dark:bg-accent-900/40 dark:text-accent-300">
                  {profile.plan_name}
                </span>
              )}
            </div>
            <div className="flex gap-1">
              <Link href="/profile" aria-label={tm("profile")} className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }))}>
                  <Trophy className="h-5 w-5" aria-hidden="true" />
                </Link>
              {isAdmin && (
                <Link href="/admin" aria-label={tm("admin")} className={cn(buttonVariants({ variant: "ghost", size: "icon-sm" }), "text-accent-text")}>
                  <Shield className="h-5 w-5" aria-hidden="true" />
                </Link>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Training level */}
        <Section icon={Gauge} title={t("level")}>
          <p className="mb-2 text-xs text-muted-foreground">{t("levelHint")}</p>
          {athlete ? (
            <div className="grid grid-cols-3 gap-2">
              {(["beginner", "intermediate", "advanced"] as FitnessLevel[]).map((level) => (
                <button
                  key={level}
                  onClick={() => updateFitnessLevel(level)}
                  aria-pressed={athlete.fitnessLevel === level}
                  className={cn(
                    "min-h-11 rounded-lg border p-2 text-xs transition-colors",
                    athlete.fitnessLevel === level
                      ? "border-accent-500 bg-accent-50 font-semibold text-accent-700 dark:bg-accent-900/20"
                      : "border-border text-muted-foreground hover:border-accent-300"
                  )}
                >
                  {to(`level_${level}`)}
                </button>
              ))}
            </div>
          ) : (
            <Link href="/onboarding" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-full")}>
              {t("levelSetup")}
            </Link>
          )}
        </Section>

        {/* Week plan */}
        <Section icon={CalendarDays} title={t("plan")}>
          <p className="mb-2 text-xs text-muted-foreground">{t("planHint")}</p>
          {athlete ? (
            <>
              <div className="grid grid-cols-7 gap-1.5">
                {WEEKDAYS.map((day) => {
                  const on = (athlete.trainingDays ?? []).includes(day);
                  return (
                    <button
                      key={day}
                      onClick={() =>
                        updateTrainingSchedule({
                          trainingDays: on
                            ? (athlete.trainingDays ?? []).filter((d) => d !== day)
                            : [...(athlete.trainingDays ?? []), day].sort(),
                        })
                      }
                      aria-pressed={on}
                      aria-label={weekdayName(locale, day, "long")}
                      className={cn(
                        "min-h-11 rounded-lg border text-sm font-semibold transition-colors",
                        on
                          ? "border-accent-500 bg-accent-500 text-white"
                          : "border-border text-muted-foreground hover:border-accent-300"
                      )}
                    >
                      {weekdayName(locale, day, "narrow")}
                    </button>
                  );
                })}
              </div>
              <div className="mt-3 flex items-end gap-2">
                <label className="flex-1 text-xs text-muted-foreground">
                  {t("planTime")}
                  <Input
                    type="time"
                    value={athlete.trainingTime ?? "18:00"}
                    onChange={(e) => /^\d\d:\d\d$/.test(e.target.value) && updateTrainingSchedule({ trainingTime: e.target.value })}
                    className="mt-1"
                  />
                </label>
                <Button
                  variant="outline"
                  className="h-11"
                  disabled={!(athlete.trainingDays ?? []).length}
                  onClick={() => {
                    const ics = trainingCalendar({
                      days: athlete.trainingDays ?? [],
                      time: athlete.trainingTime ?? "18:00",
                      title: t("planEventTitle"),
                      description: t("planEventDescription"),
                      from: localDate(new Date()),
                      uid: `training-${user?.id ?? "me"}@traintrack`,
                      now: new Date(),
                    });
                    const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
                    const link = document.createElement("a");
                    link.href = url;
                    link.download = "traintrack-planning.ics";
                    link.click();
                    setTimeout(() => URL.revokeObjectURL(url), 1000);
                  }}
                >
                  <CalendarPlus className="mr-1 h-4 w-4" aria-hidden="true" />
                  {t("planCalendar")}
                </Button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{t("planCalendarHint")}</p>
            </>
          ) : (
            <Link href="/onboarding" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-full")}>
              {t("levelSetup")}
            </Link>
          )}
        </Section>

        {/* Theme mode */}
        <Section icon={Palette} title={ta("section")}>
          <p className="mb-2 text-xs text-muted-foreground">{ta("mode")}</p>
          <div className="mb-4 grid grid-cols-3 gap-2">
            {([
              { id: "system" as ThemeMode, icon: Monitor, label: ta("system") },
              { id: "light" as ThemeMode, icon: Sun, label: ta("light") },
              { id: "dark" as ThemeMode, icon: Moon, label: ta("dark") },
            ]).map((opt) => (
              <button
                key={opt.id}
                onClick={() => chooseMode(opt.id)}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-lg border p-3 text-xs transition-colors",
                  mode === opt.id
                    ? "border-accent-500 bg-accent-50 text-accent-700 dark:bg-accent-900/20"
                    : "border-border text-muted-foreground hover:border-accent-300"
                )}
              >
                <opt.icon className="h-5 w-5" />
                {opt.label}
              </button>
            ))}
          </div>

          {/* Visual style / accent */}
          <p className="mb-2 text-xs text-muted-foreground">{ta("style")}</p>
          <div className="grid grid-cols-2 gap-2">
            {ACCENTS.map((a) => (
              <button
                key={a}
                onClick={() => chooseAccent(a)}
                className={cn(
                  "flex items-start gap-2 rounded-lg border p-3 text-left transition-all",
                  accent === a
                    ? "border-accent-500 bg-accent-50 ring-1 ring-accent-500 dark:bg-accent-900/20"
                    : "border-border hover:border-accent-300"
                )}
              >
                <span className="mt-0.5 h-5 w-5 shrink-0 rounded-full" style={{ backgroundColor: ACCENT_SWATCH[a] }} />
                <div>
                  <p className="text-sm font-medium">{ta(`acc_${a}`)}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{ta(`acc_${a}_d`)}</p>
                </div>
              </button>
            ))}
          </div>
        </Section>

        {/* Accessibility — text size */}
        <Section icon={Type} title={ta11y("section")}>
          <p className="mb-2 text-xs text-muted-foreground">{ta11y("textSize")}</p>
          <div className="grid grid-cols-3 gap-2">
            {(["small", "normal", "large"] as TextSize[]).map((s) => (
              <button
                key={s}
                onClick={() => chooseTextSize(s)}
                className={cn(
                  "flex items-center justify-center gap-1 rounded-lg border p-3 transition-colors",
                  textSize === s
                    ? "border-accent-500 bg-accent-50 text-accent-700 dark:bg-accent-900/20"
                    : "border-border text-muted-foreground hover:border-accent-300"
                )}
              >
                <span className={s === "small" ? "text-xs" : s === "large" ? "text-lg" : "text-sm"}>A</span>
                <span className="text-xs">{ta11y(s)}</span>
              </button>
            ))}
          </div>
        </Section>

        {/* Language */}
        <Section icon={Globe} title={t("language")}>
          <div className="grid grid-cols-3 gap-2">
            {LOCALES.map((l) => (
              <button
                key={l.id}
                onClick={() => router.replace(pathname, { locale: l.id })}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-lg border p-2.5 text-xs transition-colors",
                  locale === l.id
                    ? "border-accent-500 bg-accent-50 text-accent-700 dark:bg-accent-900/20"
                    : "border-border text-muted-foreground hover:border-accent-300"
                )}
              >
                <span className="text-lg">{l.flag}</span>
                {l.label}
              </button>
            ))}
          </div>
        </Section>

        {/* Bottom navigation */}
        <Section
          icon={LayoutGrid}
          title={ta("navSection")}
          action={
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground"
              onClick={() => setNavIds(resetNavItemIds())}
            >
              <RotateCcw className="mr-1 h-3 w-3" />
              {ta("reset")}
            </Button>
          }
        >
          <p className="mb-3 text-xs text-muted-foreground">{ta("navDesc")}</p>
          <div className="grid grid-cols-2 gap-2">
            {NAV_CATALOG.filter((item) => !item.feature || hasFeature(item.feature)).map((item) => {
              const checked = navIds.includes(item.id);
              const locked = item.id === LOCKED_NAV_ID;
              const Icon = NAV_ICONS[item.icon] ?? Home;
              return (
                <button
                  key={item.id}
                  onClick={() => toggleNav(item.id)}
                  disabled={locked}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border p-2.5 text-xs transition-colors",
                    checked || locked
                      ? "border-accent-500 bg-accent-50 text-accent-700 dark:bg-accent-900/20"
                      : "border-border text-muted-foreground hover:border-accent-300",
                    locked && "opacity-70"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {tnav(item.key)}
                  {(checked || locked) && <CheckCircle2 className="ml-auto h-3.5 w-3.5 text-accent-500" />}
                </button>
              );
            })}
          </div>
        </Section>

        {/* AI program builder key */}
        <Section icon={Sparkles} title={tai("section")}>
          <p className="mb-2 text-xs text-muted-foreground">{tai("keyDesc")}</p>
          {keyIsSet && (
            <p className="mb-2 flex items-center gap-1.5 text-sm text-green-600">
              <Check className="h-4 w-4" /> {tai("keySet")}
            </p>
          )}
          <Input
            type="password"
            aria-label={tc("apiKey")}
            value={apiKeyInput}
            onChange={(e) => setApiKeyInput(e.target.value)}
            placeholder={tai("keyPlaceholder")}
          />
          <div className="mt-2 flex gap-2">
            <Button onClick={saveKey} disabled={!apiKeyInput.trim()} className="flex-1">
              {keySavedFlag ? <><Check className="mr-1 h-4 w-4" />{tai("keySaved")}</> : tai("saveKey")}
            </Button>
            {keyIsSet && <Button variant="outline" onClick={removeKey}>{tai("clearKey")}</Button>}
          </div>
        </Section>

        {/* Push notifications */}
        {isPushSupported() && (
          <Section icon={Bell} title={tn("section")}>
            <p className="mb-3 text-xs text-muted-foreground">{tn("desc")}</p>
            {!isPushConfigured() ? (
              <p className="rounded-md bg-muted p-2 text-xs text-muted-foreground">{tn("notConfigured")}</p>
            ) : (
              <>
                <Button
                  variant={pushOn ? "outline" : "default"}
                  onClick={togglePush}
                  disabled={pushBusy}
                  className="w-full"
                >
                  {pushBusy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    : pushOn ? <BellOff className="mr-1 h-4 w-4" /> : <Bell className="mr-1 h-4 w-4" />}
                  {pushOn ? tn("disable") : tn("enable")}
                </Button>
                {pushError && <p className="mt-2 text-xs text-destructive">{pushError}</p>}
              </>
            )}
          </Section>
        )}

        {/* Refresh from server */}
        <Section icon={RotateCcw} title={t("resyncTitle")}>
          <p className="mb-3 text-xs text-muted-foreground">{t("resyncDesc")}</p>
          <Button variant="outline" onClick={handleResync} disabled={resyncState === "busy"} className="w-full">
            {resyncState === "busy" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              : resyncState === "done" ? <Check className="mr-2 h-4 w-4" />
              : <RotateCcw className="mr-2 h-4 w-4" />}
            {resyncState === "done" ? t("resyncDone") : t("resyncBtn")}
          </Button>
        </Section>

        {/* Data & privacy */}
        <Section icon={Download} title={t("export")}>
          <p className="mb-3 text-xs text-muted-foreground">{t("exportDesc")}</p>
          <Button variant="outline" onClick={() => downloadJSONBackup()} className="w-full">
            <Download className="mr-2 h-4 w-4" />
            {t("exportJSON")}
          </Button>
          <Link href="/legal/privacy" className="mt-2 block">
            <Button variant="ghost" className="w-full justify-start">
              <ShieldCheck className="mr-2 h-4 w-4" />
              {t("privacy")}
            </Button>
          </Link>
        </Section>

        <Link href="/auth/reset?recovery=1" className={cn(buttonVariants({ variant: "outline" }), "w-full")}>
          <KeyRound className="mr-2 h-4 w-4" aria-hidden="true" />
          {t("changePassword")}
        </Link>

        {/* Sign out */}
        <Button variant="outline" className="w-full" onClick={() => signOut()}>
          <LogOut className="mr-2 h-4 w-4" />
          {tAuth("signOut")}
        </Button>

        {/* Danger zone */}
        <Card className="border-red-200 dark:border-red-900">
          <CardContent className="space-y-3 py-4">
            <div className="flex items-center gap-2">
              <Trash2 className="h-4 w-4 text-red-600" />
              <h2 className="text-sm font-semibold text-red-600">{t("dangerZone")}</h2>
            </div>
            <p className="text-xs text-muted-foreground">{t("deleteAccountDesc")}</p>
            {!showDelete ? (
              <Button variant="destructive" className="w-full" onClick={() => setShowDelete(true)}>
                <Trash2 className="mr-2 h-4 w-4" />
                {t("deleteAccount")}
              </Button>
            ) : (
              <div className="space-y-2">
                <p className="text-sm">{t("deleteAccountConfirm")}</p>
                <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder={t("deleteAccountConfirmWord")} />
                <Button
                  variant="destructive"
                  className="w-full"
                  disabled={confirmText !== t("deleteAccountConfirmWord") || deleting}
                  onClick={handleDelete}
                >
                  {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : t("deleteAccount")}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
