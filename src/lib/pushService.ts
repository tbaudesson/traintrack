import { supabase } from "./supabase";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

/** Whether the browser supports Web Push at all. */
export function isPushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/** Whether a VAPID public key is configured for this deployment. */
export function isPushConfigured(): boolean {
  return !!VAPID_PUBLIC_KEY;
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/** The current push subscription, if any. */
export async function getPushSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}

/** What this device wants to be told: reminders, comments, programs, messages. */
export type NotifyPrefs = Partial<Record<"reminder" | "comment" | "program" | "message", boolean>>;

/** Subscribe to push and persist the subscription server-side, with the device's time zone and language. */
export async function subscribeToPush(locale?: string): Promise<void> {
  if (!isPushSupported()) throw new Error("PUSH_UNSUPPORTED");
  if (!VAPID_PUBLIC_KEY) throw new Error("PUSH_NOT_CONFIGURED");

  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("PERMISSION_DENIED");

  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
    });
  }

  const json = sub.toJSON();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("NOT_AUTHENTICATED");

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint: sub.endpoint,
      p256dh: json.keys?.p256dh,
      auth: json.keys?.auth,
      user_agent: navigator.userAgent,
      time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      ...(locale ? { locale } : {}),
    },
    { onConflict: "endpoint" }
  );
  if (error) throw new Error(error.message);
}

/** This device's notification choices, as saved server-side. */
export async function getPushPrefs(): Promise<NotifyPrefs | null> {
  const sub = await getPushSubscription();
  if (!sub) return null;
  const { data } = await supabase.from("push_subscriptions").select("notify_prefs").eq("endpoint", sub.endpoint).maybeSingle();
  return (data?.notify_prefs as NotifyPrefs | null) ?? {};
}

/** Save this device's choices, with its current time zone and language. */
export async function savePushPrefs(prefs: NotifyPrefs, locale: string): Promise<void> {
  const sub = await getPushSubscription();
  if (!sub) return;
  const { error } = await supabase
    .from("push_subscriptions")
    .update({ notify_prefs: prefs, time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone, locale })
    .eq("endpoint", sub.endpoint);
  if (error) throw new Error(error.message);
}

/** Remove the push subscription locally and server-side. */
export async function unsubscribeFromPush(): Promise<void> {
  const sub = await getPushSubscription();
  if (!sub) return;
  await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
  await sub.unsubscribe();
}
