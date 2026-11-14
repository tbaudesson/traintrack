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

/**
 * A calendar file of what is planned: each session on its day (at the
 * training time with an alarm half an hour before, or over the whole day
 * without a time), and each competition over its day. Ids are stable, so a
 * calendar that knows them updates the events instead of doubling them.
 */
export function planCalendar(input: {
  sessions: { date: string; title: string; description?: string }[];
  competitions: { date: string; title: string; description?: string }[];
  /** "18:30", or null for whole-day events. */
  time: string | null;
  /** Makes the ids unique to the athlete. */
  owner: string;
  calendarName: string;
  now: Date;
}): string {
  const stamp = input.now.toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  const compact = (date: string) => date.replace(/-/g, "");
  const nextDay = (date: string) => {
    const [y, m, d] = date.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10).replace(/-/g, "");
  };
  const [hour, minute] = (input.time ?? "").split(":").map(Number);
  const timed = input.time !== null && Number.isInteger(hour) && Number.isInteger(minute);
  const event = (kind: string, e: { date: string; title: string; description?: string }, at: boolean) => [
    "BEGIN:VEVENT",
    `UID:${kind}-${e.date}-${input.owner}@traintrack`,
    `DTSTAMP:${stamp}`,
    ...(at
      ? [`DTSTART:${compact(e.date)}T${pad(hour)}${pad(minute)}00`, "DURATION:PT1H"]
      : [`DTSTART;VALUE=DATE:${compact(e.date)}`, `DTEND;VALUE=DATE:${nextDay(e.date)}`]),
    `SUMMARY:${escape(e.title)}`,
    ...(e.description ? [`DESCRIPTION:${escape(e.description)}`] : []),
    ...(at ? ["BEGIN:VALARM", "ACTION:DISPLAY", "TRIGGER:-PT30M", `DESCRIPTION:${escape(e.title)}`, "END:VALARM"] : []),
    "END:VEVENT",
  ];
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//TrainTrack//Planning//FR",
    "CALSCALE:GREGORIAN",
    `X-WR-CALNAME:${escape(input.calendarName)}`,
    ...input.sessions.flatMap((e) => event("session", e, timed)),
    ...input.competitions.flatMap((e) => event("competition", e, false)),
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}
