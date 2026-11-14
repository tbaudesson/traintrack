import { describe, expect, it } from "vitest";
import { SPINNING_TEMPLATES, beginnerSessions, blocksMinutes, hiitSessions, spinningTemplates } from "./spinningTemplates";
import { PROGRAM_TEMPLATES } from "./programTemplates";
import { programCategory } from "./programCategories";

describe("spinning plans", () => {
  it("come in every language with the same sessions, filed with cycling", () => {
    const [fr, en, de] = (["fr", "en", "de"] as const).map(spinningTemplates);
    for (const other of [en, de]) other.forEach((t, i) => expect(t.structure.map((d) => d.cardio?.blocks)).toEqual(fr[i].structure.map((d) => d.cardio?.blocks)));
    expect(PROGRAM_TEMPLATES).toEqual(expect.arrayContaining(SPINNING_TEMPLATES));
    for (const t of SPINNING_TEMPLATES) expect(programCategory(t)).toBe("cycling");
  });

  it("last as their description says, lighter in the easy weeks", () => {
    for (let w = 1; w <= 6; w++)
      for (const blocks of Object.values(beginnerSessions(w))) {
        const min = blocksMinutes(blocks);
        expect(min, `beginner w${w}`).toBeLessThanOrEqual(45);
        if (w !== 4) expect(min, `beginner w${w}`).toBeGreaterThanOrEqual(29);
      }
    for (let w = 1; w <= 8; w++)
      for (const blocks of Object.values(hiitSessions(w))) {
        const min = blocksMinutes(blocks);
        expect(min, `hiit w${w}`).toBeLessThanOrEqual(50);
        expect(min, `hiit w${w}`).toBeGreaterThanOrEqual(24);
      }
    const total = (w: number) => Object.values(hiitSessions(w)).reduce((s, b) => s + blocksMinutes(b), 0);
    expect(total(4)).toBeLessThan(total(3));
    expect(total(8)).toBeLessThan(total(7));
  });

  it("give every block a sensible cadence and resistance, starting easy and ending easy", () => {
    for (const t of SPINNING_TEMPLATES)
      for (const d of t.structure) {
        const blocks = d.cardio!.blocks!;
        expect(blocks[0].kind).toBe("warmup");
        expect(blocks.at(-1)!.kind).toBe("cooldown");
        expect(d.cardio!.durationMin).toBe(blocksMinutes(blocks));
        for (const x of blocks) {
          expect(x.rpm[0]).toBeLessThan(x.rpm[1]);
          expect(x.resistance).toBeGreaterThanOrEqual(1);
          expect(x.resistance).toBeLessThanOrEqual(10);
        }
      }
  });
});
