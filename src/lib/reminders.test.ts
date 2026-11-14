import { describe, expect, it } from "vitest";
import { localClock, notification, reminderDue, wants } from "../../supabase/functions/_shared/reminders";

describe("localClock", () => {
  it("reads the date, weekday and time where the device is", () => {
    // Friday 13 November 2026, 23:30 UTC: already Saturday in Paris.
    const now = new Date("2026-11-13T23:30:00Z");
    expect(localClock("Europe/Paris", now)).toEqual({ date: "2026-11-14", weekday: 6, minutes: 30 });
    expect(localClock("UTC", now)).toEqual({ date: "2026-11-13", weekday: 5, minutes: 23 * 60 + 30 });
    expect(localClock("Not/AZone", now).date).toBe("2026-11-13");
  });
});

describe("reminderDue", () => {
  const schedule = { trainingDays: [1, 3, 5], trainingTime: "18:30" };
  const at = (weekday: number, hh: number, mm: number) => ({ date: "2026-11-13", weekday, minutes: hh * 60 + mm });

  it("is due once, an hour before the usual time, on a training day", () => {
    expect(reminderDue(schedule, at(5, 17, 30))).toBe(true);
    expect(reminderDue(schedule, at(5, 17, 44))).toBe(true);
    expect(reminderDue(schedule, at(5, 17, 45))).toBe(false);
    expect(reminderDue(schedule, at(5, 17, 29))).toBe(false);
  });

  it("stays quiet on rest days or without a schedule", () => {
    expect(reminderDue(schedule, at(6, 17, 30))).toBe(false);
    expect(reminderDue({ trainingDays: [5] }, at(5, 17, 30))).toBe(false);
    expect(reminderDue({}, at(5, 17, 30))).toBe(false);
  });
});

describe("notifications", () => {
  it("are all on until turned off", () => {
    expect(wants(null, "message")).toBe(true);
    expect(wants({ message: false }, "message")).toBe(false);
  });

  it("speak the device's language and lead to the right page", () => {
    expect(notification("message", "de", "Léa")).toMatchObject({ title: "Neue Nachricht", body: "Léa hat dir geschrieben.", url: "/de/messages" });
    expect(notification("reminder", null, "18:30").body).toContain("18:30");
    expect(notification("program", "en", "Coach").url).toBe("/en/programs");
  });
});
