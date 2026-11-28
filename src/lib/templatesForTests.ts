import { readFileSync } from "node:fs";
import type { ProgramTemplate } from "./programTemplates";

/**
 * For the tests only: the ready-made programs as program_templates holds
 * them once migration 098 is applied (the e2e tests keep them on the device
 * too). The app reads them from the server, never from here.
 */
export const templatesForTests = (): ProgramTemplate[] => JSON.parse(readFileSync("e2e/fixtures/program_templates.json", "utf8"));

const FAMILIES = {
  SWIM_TEMPLATES: /^natation-(apprendre-crawl|forme|1500-2k|triathlon)/,
  HIKING_TEMPLATES: /^rando-/,
  TRX_TEMPLATES: /^trx-/,
  INJURY_TEMPLATES: /^blessure-/,
  ENDURANCE_TEMPLATES: /^(plan-|renfo-)/,
  VAULTING_TEMPLATES: /^voltige-/,
  SPINNING_TEMPLATES: /^spinning-/,
};

/** One family of them, by the ids the tests know. */
export const familyForTests = (family: keyof typeof FAMILIES): ProgramTemplate[] => templatesForTests().filter((t) => FAMILIES[family].test(t.id));
