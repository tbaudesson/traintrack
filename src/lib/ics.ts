const BYDAY = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"];

const pad = (n: number) => String(n).padStart(2, "0");

/** Text as an iCalendar value: commas, semicolons and line breaks escaped. */
const escape = (text: string) => text.replace(/\\/g, "\\\\").replace(/([,;])/g, "\\$1").replace(/\n/g, "\\n");

/**
 * A calendar file with one weekly event on the training days, at the chosen
 * time, and an alarm half an hour before. The phone's calendar then reminds
 * the athlete, with nothing to run on a server.
 */
export function trainingCalendar(input: {
  /** 1 = Monday … 7 = Sunday */
  days: number[];
  /** "18:30" */
  time: string;
  title: string;
  description: string;
  /** Local date the reminders start from, YYYY-MM-DD. */
  from: string;
  /** Unique id of the series, so a new file replaces the old one. */
  uid: string;
  now: Date;
}): string {
  const days = [...new Set(input.days)].filter((d) => d >= 1 && d <= 7).sort();
  if (!days.length) throw new Error("No training day");
  const [hour, minute] = input.time.split(":").map(Number);

  // The first occurrence: the first training day on or after the start date.
  const [y, m, d] = input.from.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, d));
  while (!days.includes(((start.getUTCDay() + 6) % 7) + 1)) start.setUTCDate(start.getUTCDate() + 1);
  const date = `${start.getUTCFullYear()}${pad(start.getUTCMonth() + 1)}${pad(start.getUTCDate())}`;
  const stamp = input.now.toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//TrainTrack//Planning//FR",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${input.uid}`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${date}T${pad(hour)}${pad(minute)}00`,
    "DURATION:PT1H",
    `RRULE:FREQ=WEEKLY;BYDAY=${days.map((day) => BYDAY[day - 1]).join(",")}`,
    `SUMMARY:${escape(input.title)}`,
    `DESCRIPTION:${escape(input.description)}`,
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "TRIGGER:-PT30M",
    `DESCRIPTION:${escape(input.title)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}
