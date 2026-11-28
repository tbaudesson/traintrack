import { describe, expect, it, vi } from "vitest";
import { injuryAreasOf, parsePainAreas, equipmentWith, itemLabel, loadStep, barOf, movementShort, needsNoGear, parseChoices, parseEquipment, parseMovements, parseSwimStrokes, skipsWarmup } from "./references";
import { equipmentOnDeviceForTests, settingFromMigrations } from "./settingsFromMigrations";
import { libraryFromMigrations } from "./libraryFromMigrations";
import { programEquipmentFromMigrations } from "./injuryGuidanceFromMigrations";

const EQUIPMENT = parseEquipment(settingFromMigrations("093_lists.sql", "equipment"))!;
const MOVEMENTS = parseMovements(settingFromMigrations("093_lists.sql", "movements"))!;
const STROKES = parseSwimStrokes(settingFromMigrations("093_lists.sql", "swim_strokes"))!;
const CHOICES = parseChoices(settingFromMigrations("093_lists.sql", "choices"))!;

describe("the lists of migration 093", () => {
  it("name the equipment, movements and strokes in three languages, with their roles", () => {
    expect(EQUIPMENT.map((e) => e.id)).toEqual(["barbell", "dumbbell", "machine", "cable", "pullup_bar", "bodyweight", "kettlebell", "bands", "suspension", "other"]);
    expect(itemLabel(EQUIPMENT, "bodyweight", "fr")).toBe("Poids du corps");
    expect(equipmentWith(EQUIPMENT, "noGear")).toEqual(["bodyweight"]);
    expect(equipmentWith(EQUIPMENT, "home")).toEqual(["dumbbell", "bodyweight", "bands"]);
    expect(movementShort(MOVEMENTS, "overhead", "fr")).toBe("bras au-dessus de la tête");
    expect(STROKES.map((s) => s.id)).toEqual(["free", "breast", "back", "fly", "mixed"]);
    expect(CHOICES.restDefaults).toEqual([60, 90, 120, 180]);
  });

  it("cover every id the library and the programs' guide use", () => {
    const ids = EQUIPMENT.map((e) => e.id);
    const moves = MOVEMENTS.map((m) => m.id);
    for (const e of libraryFromMigrations()) {
      if (e.equipment) expect(ids, e.name).toContain(e.equipment);
      for (const m of (e as { movements?: string[] }).movements ?? []) expect(moves, e.name).toContain(m);
    }
    const guide = programEquipmentFromMigrations();
    for (const need of Object.values(guide.needs)) expect(ids).toContain(need);
    for (const g of guide.gym) expect(ids).toContain(g);
  });

  it("give the load step, the bar and the warm-up as the list says, read on the device", () => {
    equipmentOnDeviceForTests(vi.stubGlobal);
    expect(loadStep("dumbbell")).toBe(2);
    expect(loadStep("barbell")).toBe(2.5);
    expect(barOf("barbell")).toBe(20);
    expect(needsNoGear("bodyweight") && skipsWarmup("bands") && !skipsWarmup("barbell")).toBe(true);
    vi.unstubAllGlobals();
    // Never read: the plates' step, nothing else assumed.
    expect(loadStep("dumbbell")).toBe(2.5);
    expect(needsNoGear("bodyweight")).toBe(false);
  });

  it("refuse a list that does not hold together", () => {
    expect(parseEquipment(JSON.stringify([{ ...EQUIPMENT[0], stepKg: 0 }]))).toBeNull();
    expect(parseEquipment(JSON.stringify([{ ...EQUIPMENT[0], id: "Bad Id" }]))).toBeNull();
    expect(parseMovements(JSON.stringify([{ ...MOVEMENTS[0], shortDe: "" }]))).toBeNull();
    expect(parseChoices(JSON.stringify({ ...CHOICES, poolLengths: [] }))).toBeNull();
  });
});

describe("the body's areas of migration 094", () => {
  const AREAS = parsePainAreas(settingFromMigrations("094_pain_areas.sql", "pain_areas"))!;
  it("name every area in three languages; the unsorted one is never an injury", () => {
    expect(AREAS.map((a) => a.id)).toEqual(["shoulder", "elbow", "wrist", "neck", "upper_back", "lower_back", "hip", "knee", "ankle", "other"]);
    expect(itemLabel(AREAS, "knee", "fr")).toBe("Genou");
    expect(injuryAreasOf(AREAS)).not.toContain("other");
    expect(parsePainAreas(JSON.stringify(AREAS.map((a) => ({ ...a, unspecified: true }))))).toBeNull();
  });
});

