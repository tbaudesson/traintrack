/**
 * The end of a rest, announced by the service worker: it keeps a timer even
 * when the page sleeps behind a locked screen, and shows a notification.
 * Needs the notification permission; without it, nothing happens.
 */
const TAG = "traintrack-rest";

async function worker(): Promise<ServiceWorker | null> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.ready;
    return reg.active;
  } catch {
    return null;
  }
}

export async function scheduleRestEnd(endsAt: number, title: string, body: string): Promise<void> {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  (await worker())?.postMessage({ type: "SCHEDULE_NOTIFICATION", tag: TAG, title, body, scheduledTime: endsAt });
}

export async function cancelRestEnd(): Promise<void> {
  (await worker())?.postMessage({ type: "CANCEL_NOTIFICATION", tag: TAG });
}

/** Ask for the permission, from a tap: true when notifications may be shown. */
export async function allowRestNotifications(): Promise<boolean> {
  if (typeof Notification === "undefined") return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  return (await Notification.requestPermission()) === "granted";
}
