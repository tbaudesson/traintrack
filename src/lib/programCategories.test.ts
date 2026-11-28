import { describe, expect, it } from "vitest";
import { CATEGORY_ORDER, planWeeks, programCategory, shelves } from "./programCategories";
import { templatesForTests } from "./templatesForTests";

const PROGRAM_TEMPLATES = templatesForTests();

const byId = (id: string) => PROGRAM_TEMPLATES.find((t) => t.id === id)!;

describe("programCategory", () => {
  it("files a plan by its sport", () => {
    expect(programCategory(byId("plan-marathon-16"))).toBe("running");
    expect(programCategory(byId("plan-natation-8-en"))).toBe("swimming");
    expect(programCategory(byId("plan-velo-8-de"))).toBe("cycling");
    expect(programCategory(byId("voltige-debuter-8"))).toBe("vaulting");
  });

  it("files a strengthening plan with its sport, in every language", () => {
    expect(programCategory(byId("renfo-coureur"))).toBe("running");
    expect(programCategory(byId("renfo-nageur-de"))).toBe("swimming");
    expect(programCategory(byId("voltige-prepa-en"))).toBe("vaulting");
  });

  it("files the others by goal", () => {
    for (const t of PROGRAM_TEMPLATES.filter((t) => t.goal === "hypertrophy" && !t.id.startsWith("trx-"))) expect(programCategory(t)).toBe("bodybuilding");
    for (const t of PROGRAM_TEMPLATES.filter((t) => t.goal === "strength")) expect(programCategory(t)).toBe("strength");
  });

  it("files a program of one's own by the ready-made one it came from, else not at all", () => {
    const fromTemplate = byId("renfo-cycliste");
    expect(programCategory({ name: fromTemplate.name, structure: fromTemplate.structure }, PROGRAM_TEMPLATES)).toBe("cycling");
    expect(programCategory({ name: "Mon programme", structure: [{ name: "J1", exercises: [] }] }, PROGRAM_TEMPLATES)).toBeNull();
  });
});

describe("shelves", () => {
  it("puts every ready-made program on one shelf, the athlete's level first", () => {
    const fr = PROGRAM_TEMPLATES.filter((t) => t.locale === "fr" || !t.locale);
    const all = shelves(fr, "advanced");
    expect([...all.keys()]).toEqual(CATEGORY_ORDER);
    expect([...all.values()].flat()).toHaveLength(fr.length);
    for (const list of all.values()) expect(list.length).toBeGreaterThan(0);
    const body = all.get("bodybuilding")!;
    expect(body[0].level).toBe("advanced");
  });
});

it("counts the weeks of a plan", () => {
  expect(planWeeks(byId("voltige-competition-12").structure)).toBe(12);
  expect(planWeeks(byId("voltige-prepa").structure)).toBeNull();
});

it("files a program on the shelf its ready-made program says, whatever its goal", () => {
  const fromServer = [{ id: "5f0c2c1e-0000-4000-8000-000000000001", name: "Poids du corps", goal: "general" as const, category: "callisthenics" }];
  expect(programCategory({ name: "Poids du corps" }, fromServer)).toBe("callisthenics");
  // Without a shelf said (or one the app does not know), its sport and goal tell.
  expect(programCategory({ name: "Poids du corps" }, [{ ...fromServer[0], category: undefined }])).toBe("fitness");
  expect(programCategory({ name: "Poids du corps" }, [{ ...fromServer[0], category: "curling" }])).toBe("fitness");
});

describe("a program on a sport's shelf", () => {
  it("is on its own sport's shelf only", async () => {
    const { onShelf } = await import("./programCategories");
    expect(onShelf({}, "running", "running")).toBe(true);
    expect(onShelf({}, "running", "swimming")).toBe(false);
  });

  it("built from scratch, is on every shelf but an outing sport's when it has no outing", async () => {
    const { onShelf } = await import("./programCategories");
    const sets = { structure: [{ name: "Pompes", exercises: [] }] };
    const outing = { structure: [{ name: "Sortie", exercises: [], cardio: { sport: "run" as const } }] };
    expect(onShelf(sets, null, "fitness")).toBe(true);
    expect(onShelf(sets, null, "running")).toBe(false);
    expect(onShelf(outing as never, null, "running")).toBe(true);
  });
});
