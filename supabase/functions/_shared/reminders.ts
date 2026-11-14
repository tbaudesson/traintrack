// Shared by the send-reminders Edge Function and the app's tests: plain
// TypeScript, no Deno or browser API.

export type NotifyKind = "reminder" | "comment" | "program" | "message";

/** What a device wants to be told; everything on unless turned off. */
export type NotifyPrefs = Partial<Record<NotifyKind, boolean>>;

export const wants = (prefs: NotifyPrefs | null | undefined, kind: NotifyKind) => prefs?.[kind] !== false;

/** The reminder comes this long before the usual training time. */
export const REMINDER_LEAD_MIN = 60;

export interface LocalClock {
  /** YYYY-MM-DD in the device's time zone. */
  date: string;
  /** 1 = Monday … 7 = Sunday. */
  weekday: number;
  /** Minutes since midnight. */
  minutes: number;
}

const WEEKDAYS: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };

/** The date, weekday and time of day where the device is; UTC when the zone is unknown. */
export function localClock(timeZone: string | null | undefined, now: Date): LocalClock {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: timeZone || "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      weekday: "short",
      hourCycle: "h23",
    }).formatToParts(now);
  } catch {
    return localClock("UTC", now);
  }
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    weekday: WEEKDAYS[get("weekday")] ?? 1,
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
  };
}

/**
 * Whether the training reminder is due now: a training day, and the moment an
 * hour before the usual time fell within the last run's window. Run every
 * `windowMin` minutes, each reminder is due exactly once.
 */
export function reminderDue(
  schedule: { trainingDays?: number[] | null; trainingTime?: string | null },
  clock: LocalClock,
  windowMin = 15
): boolean {
  if (!schedule.trainingDays?.includes(clock.weekday) || !schedule.trainingTime) return false;
  const [h, m] = schedule.trainingTime.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return false;
  const at = h * 60 + m - REMINDER_LEAD_MIN;
  return at >= 0 && at > clock.minutes - windowMin && at <= clock.minutes;
}

type Lang = "fr" | "en" | "de";
const lang = (locale: string | null | undefined): Lang => (locale === "en" || locale === "de" ? locale : "fr");

const TEXT: Record<Lang, Record<NotifyKind, { title: string; body: (name: string) => string }>> = {
  fr: {
    reminder: { title: "Séance dans une heure", body: (time) => `C'est jour d'entraînement : votre séance est prévue à ${time}.` },
    comment: { title: "Nouveau commentaire", body: (name) => `${name} a commenté votre séance.` },
    program: { title: "Nouveau programme", body: (name) => `${name} vous a préparé un programme.` },
    message: { title: "Nouveau message", body: (name) => `${name} vous a écrit.` },
  },
  en: {
    reminder: { title: "Session in an hour", body: (time) => `It's a training day: your session is planned at ${time}.` },
    comment: { title: "New comment", body: (name) => `${name} commented on your session.` },
    program: { title: "New program", body: (name) => `${name} prepared a program for you.` },
    message: { title: "New message", body: (name) => `${name} wrote to you.` },
  },
  de: {
    reminder: { title: "Training in einer Stunde", body: (time) => `Heute ist Trainingstag: Deine Einheit ist um ${time} geplant.` },
    comment: { title: "Neuer Kommentar", body: (name) => `${name} hat deine Einheit kommentiert.` },
    program: { title: "Neues Programm", body: (name) => `${name} hat ein Programm für dich erstellt.` },
    message: { title: "Neue Nachricht", body: (name) => `${name} hat dir geschrieben.` },
  },
};

const URLS: Record<NotifyKind, string> = { reminder: "/", comment: "/log", program: "/programs", message: "/messages" };

/** The notification for a kind, in the device's language: title, body and where a tap leads. */
export function notification(kind: NotifyKind, locale: string | null | undefined, name: string) {
  const l = lang(locale);
  const text = TEXT[l][kind];
  return { title: text.title, body: text.body(name), url: `/${l}${URLS[kind]}`, tag: `traintrack-${kind}` };
}
