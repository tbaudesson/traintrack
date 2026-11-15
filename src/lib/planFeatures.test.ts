import { describe, expect, it } from "vitest";
import fr from "@/messages/fr.json";
import en from "@/messages/en.json";
import de from "@/messages/de.json";
import { FEATURE_GROUPS, FEATURE_KEYS, SERVER_CHECKED } from "./adminService";

describe("licence features", () => {
  it("are listed once, each in a theme", () => {
    expect(new Set(FEATURE_KEYS).size).toBe(FEATURE_KEYS.length);
    expect(FEATURE_KEYS.length).toBe(13);
    for (const f of SERVER_CHECKED) expect(FEATURE_KEYS).toContain(f);
  });

  it("have a name and a hint in the three languages", () => {
    for (const messages of [fr, en, de]) {
      const admin = messages.admin as Record<string, string>;
      for (const g of FEATURE_GROUPS) expect(admin[`featGroup_${g.key}`]).toBeTruthy();
      for (const f of FEATURE_KEYS) {
        expect(admin[`feat_${f}`], f).toBeTruthy();
        expect(admin[`featHint_${f}`], f).toBeTruthy();
      }
    }
  });
});
