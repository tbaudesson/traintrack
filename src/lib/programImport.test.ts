import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { columnOf, libraryName, parsePercents, parseProgramRows, parseReps, parseRest, templateRows } from "./programImport";
import { readXlsx, writeXlsx, XlsxError } from "./xlsx";

const fixture = (name: string) => readFileSync(new URL(`./__fixtures__/${name}`, import.meta.url));
const dayName = (n: number) => `Session ${n}`;

describe("readXlsx", () => {
  it("reads a sheet with inline strings, merged cells and numbers (openpyxl, deflated)", async () => {
    const rows = await readXlsx(fixture("program-fr.xlsx"));
    expect(rows[0]).toEqual(["Mon programme de force"]);
    expect(rows[1]).toEqual([]);
    expect(rows[2]).toEqual(["Semaine", "Séance", "Exercice", "Séries", "Répétitions", "Repos", "% 1RM"]);
    expect(rows[3]).toEqual(["1", "Haut du corps", "Développé couché à la barre", "4", "6-8", "2 min", "0.75"]);
  });

  it("reads shared and rich strings, the first sheet by its link, cells without a reference", async () => {
    const rows = await readXlsx(fixture("program-de.xlsx"));
    expect(rows[0]).toEqual(["Woche", "Einheit", "", "Übung", "Wdh"]);
    expect(rows[1]).toEqual(["1", "A & B ", "", "Seitheben", "12-15"]);
    expect(rows[3]).toEqual(["1", "A & B ", "", "Kreuzheben", ""]);
  });

  it("reads back what it writes", async () => {
    const bytes = writeXlsx({ sheet: "Programme", rows: templateRows("fr"), widths: [9, 18, 32, 8, 13, 10, 14], textColumns: [4, 6] });
    const rows = await readXlsx(bytes);
    expect(rows[0][1]).toBe("Séance");
    expect(rows[1]).toEqual(["1", "Haut du corps", "Développé couché à la barre", "4", "6-8", "120", "70/75/80/80"]);
  });

  it("refuses what is not a workbook", async () => {
    await expect(readXlsx(new TextEncoder().encode("Semaine;Séance"))).rejects.toBeInstanceOf(XlsxError);
  });
});

describe("parseProgramRows", () => {
  it("turns a French sheet into a plan in weeks", async () => {
    const result = parseProgramRows(await readXlsx(fixture("program-fr.xlsx")), dayName);
    expect(result.weeks).toBe(2);
    expect(result.unknown).toEqual(["Curl araignée maison"]);
    expect(result.badReps).toBe(1);
    expect(result.structure).toEqual([
      {
        name: "Haut du corps",
        week: 1,
        exercises: [
          { exerciseName: "Barbell Bench Press", targetSets: 4, targetReps: "6-8", restSec: 120, percents: [75] },
          { exerciseName: "Barbell Row", targetSets: 4, targetReps: "8-10", restSec: 90 },
          { exerciseName: "Curl araignée maison", targetSets: 3, targetReps: "12" },
        ],
      },
      {
        name: "Bas du corps",
        week: 1,
        exercises: [
          { exerciseName: "Back Squat", targetSets: 5, targetReps: "5", restSec: 90, percents: [70, 75, 80] },
          { exerciseName: "Bulgarian Split Squat", targetSets: 3, targetReps: "8-12", restSec: 90 },
        ],
      },
      { name: "Haut du corps", week: 2, exercises: [{ exerciseName: "Barbell Bench Press", targetSets: 4, targetReps: "5", restSec: 120, percents: [80] }] },
    ]);
  });

  it("reads German headers and fills in what is missing", async () => {
    const result = parseProgramRows(await readXlsx(fixture("program-de.xlsx")), dayName);
    expect(result.structure).toEqual([
      {
        name: "A & B",
        week: 1,
        exercises: [
          { exerciseName: "Lateral Raise", targetSets: 3, targetReps: "12-15" },
          { exerciseName: "Deadlift", targetSets: 3, targetReps: "8-12" },
        ],
      },
    ]);
    expect(result.unknown).toEqual([]);
  });

  it("makes a rotation without weeks, naming sessions when the sheet does not", () => {
    const result = parseProgramRows([["Exercise", "Sets"], ["Pull-up", "5"], ["Push-up", "4"]], dayName);
    expect(result.weeks).toBe(0);
    expect(result.structure).toEqual([
      { name: "Session 1", exercises: [{ exerciseName: "Pull-up", targetSets: 5, targetReps: "8-12" }, { exerciseName: "Push-up", targetSets: 4, targetReps: "8-12" }] },
    ]);
  });

  it("refuses a sheet without an exercise column, or without exercises", () => {
    expect(() => parseProgramRows([["Name", "Date"]], dayName)).toThrow("NO_HEADER");
    expect(() => parseProgramRows([["Exercice"], [""]], dayName)).toThrow("EMPTY");
  });

  it("reads the template of each language", async () => {
    for (const locale of ["fr", "en", "de"]) {
      const rows = await readXlsx(writeXlsx({ sheet: "P", rows: templateRows(locale), widths: [10], textColumns: [4] }));
      const result = parseProgramRows(rows, dayName);
      expect(result.unknown, locale).toEqual([]);
      expect(result.structure.length, locale).toBe(4);
    }
  });
});

describe("cells", () => {
  it("names the columns in three languages", () => {
    expect(["Séance", "Répétitions", "Repos (s)", "% 1RM", "Übung", "Sätze", "Wiederholungen", "SETS", "Notes"].map(columnOf)).toEqual([
      "day",
      "reps",
      "rest",
      "percent",
      "exercise",
      "sets",
      "reps",
      "sets",
      null,
    ]);
  });

  it("finds library exercises under any of their names", () => {
    expect(libraryName("  développé COUCHÉ à la barre ")).toEqual({ name: "Barbell Bench Press", known: true });
    expect(libraryName("Bench Press (Barbell)")).toEqual({ name: "Barbell Bench Press", known: true });
    expect(libraryName("Kniebeuge")).toEqual({ name: "Back Squat", known: true });
    expect(libraryName("Mon exo")).toEqual({ name: "Mon exo", known: false });
  });

  it("reads rests, loads and reps however they are written", () => {
    expect(["90", "90 s", "1:30", "1'30", "2 min", "1,5 min", "0.0010416666666666667", "", "soon"].map(parseRest)).toEqual([
      90, 90, 90, 90, 120, 90, 90, undefined, undefined,
    ]);
    expect(parsePercents("70/75/80")).toEqual([70, 75, 80]);
    expect(parsePercents("0.75")).toEqual([75]);
    expect(parsePercents("72,5 %")).toEqual([73]);
    expect([parseReps("8 à 12"), parseReps("10 bis 12"), parseReps("AMRAP"), parseReps("46217"), parseReps("")]).toEqual(["8-12", "10-12", "AMRAP", null, undefined]);
  });
});
