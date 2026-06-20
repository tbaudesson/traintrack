"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter, usePathname, Link } from "@/i18n/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { deleteMyAccount } from "@/lib/adminService";
import { downloadJSONBackup } from "@/lib/exportService";
import db from "@/db";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Download, Shield, LogOut, Trash2, Loader2, Globe, Sparkles, Check, Type, ShieldCheck } from "lucide-react";
import { getApiKey, setApiKey, clearApiKey } from "@/lib/aiService";
import { getTextSize, applyTextSize, type TextSize } from "@/lib/textSize";

const LOCALES = ["fr", "en", "de"] as const;

export default function SettingsPage() {
  const t = useTranslations("settings");
  const tAuth = useTranslations("auth");
  const tai = useTranslations("ai");
  const ta11y = useTranslations("a11y");
  const { user, profile, signOut, isAdmin } = useAuth();
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

  function chooseTextSize(s: TextSize) {
    applyTextSize(s);
    setTextSize(s);
  }

  function saveKey() {
    if (!apiKeyInput.trim()) return;
    setApiKey(apiKeyInput.trim());
    setApiKeyInput("");
    setKeyIsSet(true);
    setKeySavedFlag(true);
    setTimeout(() => setKeySavedFlag(false), 2000);
  }
  function removeKey() {
    clearApiKey();
    setKeyIsSet(false);
  }

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
      <div className="space-y-6 p-4 pb-24">
        {/* Account */}
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">{t("account")}</h2>
          <Card>
            <CardContent className="py-4">
              <p className="font-medium">{profile?.display_name ?? user?.email}</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              {profile?.role === "admin" && (
                <span className="mt-1 inline-block rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-medium text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                  admin
                </span>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Language */}
        <section className="space-y-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <Globe className="h-4 w-4" /> {t("language")}
          </h2>
          <div className="flex gap-2">
            {LOCALES.map((l) => (
              <Button
                key={l}
                size="sm"
                variant={l === locale ? "default" : "outline"}
                onClick={() => router.replace(pathname, { locale: l })}
              >
                {l.toUpperCase()}
              </Button>
            ))}
          </div>
        </section>

        {/* Accessibility — text size */}
        <section className="space-y-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <Type className="h-4 w-4" /> {ta11y("section")}
          </h2>
          <Card>
            <CardContent className="space-y-2 py-4">
              <p className="text-xs text-muted-foreground">{ta11y("textSize")}</p>
              <div className="flex gap-2">
                {(["small", "normal", "large"] as TextSize[]).map((s) => (
                  <Button
                    key={s}
                    variant={textSize === s ? "default" : "outline"}
                    onClick={() => chooseTextSize(s)}
                    className="flex-1"
                  >
                    <span className={s === "small" ? "text-xs" : s === "large" ? "text-lg" : "text-sm"}>
                      {ta11y(s)}
                    </span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Admin console (admins only) */}
        {isAdmin && (
          <Link href="/admin" className="block">
            <Button variant="outline" className="w-full justify-start">
              <ShieldCheck className="mr-2 h-4 w-4 text-indigo-500" />
              {ta11y("adminConsole")}
            </Button>
          </Link>
        )}

        {/* Data & privacy */}
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">{t("export")}</h2>
          <Card>
            <CardContent className="space-y-3 py-4">
              <p className="text-sm text-muted-foreground">{t("exportDesc")}</p>
              <Button variant="outline" onClick={() => downloadJSONBackup()} className="w-full">
                <Download className="mr-2 h-4 w-4" />
                {t("exportJSON")}
              </Button>
              <Link href="/legal/privacy" className="block">
                <Button variant="ghost" className="w-full justify-start">
                  <Shield className="mr-2 h-4 w-4" />
                  {t("privacy")}
                </Button>
              </Link>
            </CardContent>
          </Card>
        </section>

        {/* AI program builder key */}
        <section className="space-y-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <Sparkles className="h-4 w-4 text-indigo-500" /> {tai("section")}
          </h2>
          <Card>
            <CardContent className="space-y-3 py-4">
              <p className="text-xs text-muted-foreground">{tai("keyDesc")}</p>
              {keyIsSet && (
                <p className="flex items-center gap-1.5 text-sm text-green-600">
                  <Check className="h-4 w-4" /> {tai("keySet")}
                </p>
              )}
              <Input
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder={tai("keyPlaceholder")}
              />
              <div className="flex gap-2">
                <Button onClick={saveKey} disabled={!apiKeyInput.trim()} className="flex-1">
                  {keySavedFlag ? <><Check className="mr-1 h-4 w-4" />{tai("keySaved")}</> : tai("saveKey")}
                </Button>
                {keyIsSet && (
                  <Button variant="outline" onClick={removeKey}>
                    {tai("clearKey")}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Sign out */}
        <Button variant="outline" className="w-full" onClick={() => signOut()}>
          <LogOut className="mr-2 h-4 w-4" />
          {tAuth("signOut")}
        </Button>

        {/* Danger zone */}
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-red-600">{t("dangerZone")}</h2>
          <Card className="border-red-200 dark:border-red-900">
            <CardContent className="space-y-3 py-4">
              <p className="text-sm text-muted-foreground">{t("deleteAccountDesc")}</p>
              {!showDelete ? (
                <Button variant="destructive" className="w-full" onClick={() => setShowDelete(true)}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  {t("deleteAccount")}
                </Button>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm">{t("deleteAccountConfirm")}</p>
                  <Input
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder={t("deleteAccountConfirmWord")}
                  />
                  <Button
                    variant="destructive"
                    className="w-full"
                    disabled={confirmText !== t("deleteAccountConfirmWord") || deleting}
                    onClick={handleDelete}
                  >
                    {deleting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      t("deleteAccount")
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </>
  );
}
