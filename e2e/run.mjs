// The main paths of an athlete, end to end, in a real browser.
//
// They run offline on the device's own data: a user is cached the way a sign-in
// leaves it, the pages come from the service worker, and nothing reaches the
// server — so no test account is needed and no real data is touched. Started
// by scripts/e2e.sh, which builds and serves the app.
import { Encoder, Profile } from "@garmin/fitsdk";
import { chromium } from "playwright-core";
import { existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const BASE = process.env.E2E_BASE ?? "http://localhost:3300";
const USER = "00000000-0000-4000-8000-0000000000e2";
const ARTIFACTS = join(process.cwd(), "e2e", "artifacts");
mkdirSync(ARTIFACTS, { recursive: true });

/** Chromium from the Playwright cache, unless E2E_CHROMIUM says where it is. */
function chromiumPath() {
  if (process.env.E2E_CHROMIUM) return process.env.E2E_CHROMIUM;
  const cache = join(homedir(), "Library/Caches/ms-playwright");
  const alt = join(homedir(), ".cache/ms-playwright");
  for (const root of [cache, alt]) {
    if (!existsSync(root)) continue;
    for (const dir of readdirSync(root).filter((d) => d.startsWith("chromium_headless_shell-")).sort().reverse()) {
      for (const sub of readdirSync(join(root, dir))) {
        const bin = join(root, dir, sub, "chrome-headless-shell");
        if (existsSync(bin)) return bin;
      }
    }
  }
  throw new Error("No Chromium: run `npx playwright-core install chromium-headless-shell` or set E2E_CHROMIUM.");
}

const results = [];
/** One's sport, as Settings sets it: on the device and with the profile, which the app follows (migration 074). */
const setSportChoice = (sport) => page.evaluate(async (v) => {
  const p = JSON.parse(localStorage.getItem("traintrack.prefs") || "{}");
  p.sport = v; p.sport2 = null; p.allSports = false;
  localStorage.setItem("traintrack.prefs", JSON.stringify(p));
  const db = await new Promise((res, rej) => { const r = indexedDB.open("TrainTrack"); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  const tx = db.transaction("athleteProfiles", "readwrite");
  const st = tx.objectStore("athleteProfiles");
  const all = await new Promise((res) => { const r = st.getAll(); r.onsuccess = () => res(r.result); });
  for (const row of all) st.put({ ...row, favoriteSport: v ?? "none", secondSport: null });
  await new Promise((res) => { tx.oncomplete = res; });
  db.close();
}, sport);

/** The session card's other options, behind "⋯": change the session, the short version. */
const sessionOption = async (name) => {
  await page.getByRole("button", { name: "Autres options de séance" }).click();
  await page.getByRole("menuitem", { name }).click();
};
const heroCard = () => page.locator("section.t-hero");

/** With E2E_ONLY=<regex>, only the matching paths run (the setup always does). */
const only = process.env.E2E_ONLY ? new RegExp(process.env.E2E_ONLY) : null;
async function test(name, fn) {
  if (only && !only.test(name)) return;
  const started = Date.now();
  try {
    await fn();
    results.push({ name, ok: true, ms: Date.now() - started });
    console.log(`  ✓ ${name}`);
  } catch (e) {
    results.push({ name, ok: false, error: e.message });
    // What the page looked like, for the one who reads the failure.
    const shot = join(ARTIFACTS, `${results.length}-${name.replace(/[^a-z0-9]+/gi, "-").slice(0, 50)}.png`);
    await page.screenshot({ path: shot }).catch(() => {});
    console.log(`  ✗ ${name}\n      ${e.message.split("\n")[0]}\n      at ${page.url()} — ${shot}`);
  }
}
const expect = (cond, message) => {
  if (!cond) throw new Error(message);
};

const browser = await chromium.launch({ executablePath: chromiumPath() });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "fr-FR", acceptDownloads: true });
// The voice coach speaks into a list the tests can read.
await context.addInitScript(() => {
  window.__spoken = [];
  if (window.speechSynthesis) window.speechSynthesis.speak = (u) => u.text && window.__spoken.push(u.text);
});
const page = await context.newPage();
const errors = [];
/** With E2E_SHOTS=1, a picture of the screen at the key steps, in e2e/artifacts. */
const snap = async (name) => {
  if (!process.env.E2E_SHOTS) return;
  mkdirSync(ARTIFACTS, { recursive: true });
  await page.screenshot({ path: join(ARTIFACTS, `${name}.png`), fullPage: true }).catch(() => {});
};
page.on("pageerror", (e) => errors.push(e.message));

// ── Setup: the service worker, the pages, a cached user ─────────────
console.log("Setup");
await page.goto(`${BASE}/fr`);
for (let i = 0; i < 30; i++) {
  await page.waitForTimeout(1000);
  if (await page.evaluate(() => !!navigator.serviceWorker.controller).catch(() => false)) break;
}
await page.waitForLoadState("load");
expect(await page.evaluate(() => !!navigator.serviceWorker.controller), "the service worker never took control");

// What the background warm-up does once signed in: every page and its files.
const PAGES = ["", "/log", "/log/session", "/history", "/lessons", "/programs", "/progress", "/intervals", "/mobility", "/exercises", "/competitions", "/report", "/settings", "/more", "/horses", "/swim-techniques", "/outing-checklist", "/onboarding", "/readiness", "/join", "/tests", "/running"];
const warmed = await page.evaluate(async (pages) => {
  const files = new Set();
  for (const p of pages) {
    const html = await (await fetch(`/fr${p}`)).text();
    for (const m of html.matchAll(/(?:src|href)="(\/_next\/static\/[^"]+\.(?:js|css))"/g)) files.add(m[1]);
  }
  for (const f of files) await fetch(f);
  return files.size;
}, PAGES);
console.log(`  ${PAGES.length} pages and ${warmed} files cached`);

// What the library's exercises load when injured, as migration 059 fills it.
const exerciseRules = Object.fromEntries(
  [...readFileSync("supabase/migrations/059_exercise_injury_rules.sql", "utf8").matchAll(/SET injury_rules = '(.+?)'::jsonb, updated_at = now\(\) WHERE user_id IS NULL AND name = '((?:[^']|'')+)'/g)]
    .map((m) => [m[2].replace(/''/g, "'"), JSON.parse(m[1].replace(/''/g, "'"))])
);

// The exercise library as the migrations leave it, as a synced device holds it:
// names, groups, equipment, descriptions and translations, videos, injury rules.
const sqlValues = (tuple) => [...tuple.matchAll(/'((?:[^']|'')*)'|\bNULL\b/g)].map((m) => (m[1] === undefined ? null : m[1].replace(/''/g, "'")));
const library = new Map();
const addExercise = ([name, muscleGroup, equipment, description, nameFr, nameDe, descriptionFr, descriptionDe]) => {
  if (name && !library.has(name)) library.set(name, { name, muscleGroup, equipment, description, nameFr, nameDe, descriptionFr, descriptionDe });
};
for (const file of ["006_seed_exercises", "024_endurance", "038_interval_sessions", "040_vaulting", "053_more_timed_exercises"]) {
  let inExercises = false;
  for (const line of readFileSync(`supabase/migrations/${file}.sql`, "utf8").split("\n")) {
    if (line.startsWith("INSERT INTO exercises")) inExercises = true;
    else if (/^\) AS v\(/.test(line)) inExercises = false;
    else if (inExercises && /^\s+\('/.test(line)) addExercise(sqlValues(line));
  }
}
for (const m of readFileSync("supabase/migrations/055_trx.sql", "utf8").matchAll(/SELECT NULL, (.+?), false, (.+)\nWHERE NOT EXISTS \(SELECT 1 FROM exercises/g)) {
  const [name, group, equipment] = sqlValues(m[1]);
  addExercise([name, group, equipment, ...sqlValues(m[2])]);
}
for (const line of readFileSync("supabase/migrations/064_exercise_content.sql", "utf8").split("\n")) {
  if (!line.startsWith("UPDATE exercises SET name_fr")) continue;
  const row = library.get(sqlValues(line.slice(line.indexOf("AND name =")))[0]);
  if (!row) continue;
  const pick = (col) => {
    const m = line.match(new RegExp(`${col} = COALESCE\\(${col}, ('(?:[^']|'')*'|NULL)\\)`));
    return m && m[1] !== "NULL" ? m[1].slice(1, -1).replace(/''/g, "'") : null;
  };
  row.nameFr ??= pick("name_fr");
  row.nameDe ??= pick("name_de");
  row.descriptionFr ??= pick("description_fr");
  row.descriptionDe ??= pick("description_de");
  row.videoUrl ??= pick("video_url") ?? undefined;
}
// Each exercise's level, movements and secondary muscles, as migration 076 fills them.
const exerciseDetails = Object.fromEntries(
  [...readFileSync("supabase/migrations/076_exercise_details_and_restrictions.sql", "utf8").matchAll(/SET movements = '(.+?)'::jsonb, level = '(\w+)', secondary_muscles = '(.+?)'::jsonb, updated_at = now\(\) WHERE user_id IS NULL AND name = '((?:[^']|'')+)'/g)]
    .map((m) => [m[4].replace(/''/g, "'"), { movements: JSON.parse(m[1]), level: m[2], secondaryMuscles: JSON.parse(m[3]) }])
);
if (Object.keys(exerciseDetails).length !== 141) throw new Error(`076: ${Object.keys(exerciseDetails).length} exercises described`);
// Their key points and usual faults, as migration 079 fills them.
const exerciseCues = {};
for (const m of readFileSync("supabase/migrations/079_exercise_cues.sql", "utf8").matchAll(/SET (cues|mistakes) = '(.+?)'::jsonb, updated_at = now\(\) WHERE user_id IS NULL AND name = '((?:[^']|'')+)'/g)) {
  const name = m[3].replace(/''/g, "'");
  exerciseCues[name] = { ...(exerciseCues[name] ?? {}), [m[1]]: JSON.parse(m[2].replace(/''/g, "'")) };
}
if (Object.keys(exerciseCues).length !== 141) throw new Error(`079: ${Object.keys(exerciseCues).length} exercises with cues`);
const libraryRows = [...library.values()].map((e) => ({ ...e, injuryRules: exerciseRules[e.name] ?? null, ...(exerciseDetails[e.name] ?? {}), ...(exerciseCues[e.name] ?? {}) }));
// The boxing combinations, each whole in one INSERT of migration 085.
const m085 = readFileSync("supabase/migrations/085_boxing.sql", "utf8");
const boxingRows = libraryRows.length;
for (const line of m085.split("\n").filter((l) => l.startsWith("SELECT NULL, "))) {
  const [name, muscleGroup, equipment, description, nameFr, nameDe, descriptionFr, descriptionDe, videoUrl, rules, level, movements, secondary, cues, mistakes] = sqlValues(line.slice("SELECT NULL, ".length));
  libraryRows.push({
    name, muscleGroup, equipment, description, nameFr, nameDe, descriptionFr, descriptionDe, videoUrl,
    injuryRules: JSON.parse(rules), level, movements: JSON.parse(movements), secondaryMuscles: JSON.parse(secondary), cues: JSON.parse(cues), mistakes: JSON.parse(mistakes),
  });
}
if (libraryRows.length - boxingRows !== 10) throw new Error("085: the boxing combinations were not read");
// The muscles each one works, as migration 086 fills them.
let tagged = 0;
for (const m of readFileSync("supabase/migrations/086_muscles.sql", "utf8").matchAll(/SET target_muscles = '(.+?)'::jsonb, assist_muscles = (NULL|'(.+?)'::jsonb), updated_at = now\(\) WHERE user_id IS NULL AND name = '((?:[^']|'')+)'/g)) {
  const row = libraryRows.find((e) => e.name === m[4].replace(/''/g, "'"));
  if (!row) continue;
  row.targetMuscles = JSON.parse(m[1]);
  row.assistMuscles = m[3] ? JSON.parse(m[3]) : null;
  tagged++;
}
if (tagged !== libraryRows.length) throw new Error(`086: ${tagged} of ${libraryRows.length} exercises given their muscles`);

// The lesson exercises of the one library: the tennis drills of 088 (moved by 092) and the vaulting exercises of 092.
const unq = (v) => v.replace(/''/g, "'");
const lessonExercises = [
  ...[...readFileSync("supabase/migrations/088_tennis.sql", "utf8").matchAll(/^INSERT INTO tennis_drills .*? VALUES \(NULL, '((?:[^']|'')+)', '((?:[^']|'')+)', '((?:[^']|'')+)', '((?:[^']|'')+)', '((?:[^']|'')+)', '((?:[^']|'')+)', '([\w-]+)', (\d+), '(\[.*?\])'::jsonb, '(\[.*?\])'::jsonb\)/gm)].map((m) => ({
    name: unq(m[1]), nameFr: unq(m[2]), nameDe: unq(m[3]), description: unq(m[4]), descriptionFr: unq(m[5]), descriptionDe: unq(m[6]),
    muscleGroup: "other", sport: "tennis", theme: m[7], minutes: Number(m[8]), ages: JSON.parse(m[9]), gear: JSON.parse(m[10]),
  })),
  ...[...readFileSync("supabase/migrations/092_group_lessons.sql", "utf8").matchAll(/^INSERT INTO exercises .*? SELECT NULL, '((?:[^']|'')+)', '((?:[^']|'')+)', '((?:[^']|'')+)', '((?:[^']|'')+)', '((?:[^']|'')+)', '((?:[^']|'')+)', '(\w+)', false, '(\w+)', '([\w-]+)', (\d+), '(\[.*?\])'::jsonb, '(\[.*?\])'::jsonb WHERE/gm)].map((m) => ({
    name: unq(m[1]), nameFr: unq(m[2]), nameDe: unq(m[3]), description: unq(m[4]), descriptionFr: unq(m[5]), descriptionDe: unq(m[6]),
    muscleGroup: m[7], sport: m[8], theme: m[9], minutes: Number(m[10]), ages: JSON.parse(m[11]), gear: JSON.parse(m[12]),
  })),
];
if (lessonExercises.filter((e) => e.sport === "tennis").length !== 35 || lessonExercises.filter((e) => e.sport === "vaulting").length !== 25) throw new Error("088/092: the lesson exercises were not read");

// A signed-in user as the app caches it, a profile, and the exercise library.
await page.evaluate(async ({ user, libraryRows, lessonExercises }) => {
  const db = await new Promise((resolve, reject) => {
    const req = indexedDB.open("TrainTrack");
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  const now = new Date().toISOString();
  const put = (store, value) =>
    new Promise((resolve, reject) => {
      const tx = db.transaction(store, "readwrite");
      tx.objectStore(store).put(value);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  // The licence as last seen online: every feature.
  await put("authMeta", { key: "currentUser", userId: user, email: "e2e@test.local", planFeatures: ["ai_programs","nutrition","readiness","coaching","advanced_progress","planning","level_tests","excel_import","running","meal_plans","reports","challenges","vaulting","group_lessons"] });
  await put("athleteProfiles", {
    userId: user, uuid: "e2e-profile", goals: ["general_fitness"], fitnessLevel: "beginner", equipment: ["dumbbell"],
    trainingDays: [1, 3, 5], trainingTime: "18:30", _dirty: 0, createdAt: now, updatedAt: now,
  });
  for (const [i, e] of libraryRows.entries()) {
    await put("exercises", { ...e, isCustom: false, userId: null, uuid: `e2e-ex-${i}`, _dirty: 0, createdAt: now, updatedAt: now });
  }
  for (const [i, e] of lessonExercises.entries()) {
    await put("exercises", { ...e, isCustom: false, userId: null, uuid: `e2e-lesson-${i}`, _dirty: 0, createdAt: now, updatedAt: now });
  }
  // Five weeks of easy runs, then a much harder week: the load jumps.
  const day = (ago) => {
    const d = new Date();
    d.setDate(d.getDate() - ago);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  const runs = [
    ...[8, 10, 12, 15, 17, 19, 22, 24, 26, 29, 31, 33].map((ago) => ({ ago, min: 30 })),
    ...[1, 2, 3, 4].map((ago) => ({ ago, min: 90 })),
  ];
  for (const [i, r] of runs.entries()) {
    await put("workouts", {
      userId: user, uuid: `e2e-run-${i}`, date: day(r.ago), kind: "cardio", sport: "run", title: "Footing",
      durationSec: r.min * 60, distanceM: r.min * 180, _dirty: 0, createdAt: now, updatedAt: now,
    });
  }
}, { user: USER, libraryRows, lessonExercises });

// The injury references as the app keeps them after reading them online once (migration 058).
{
  const sql = readFileSync("supabase/migrations/058_injury_guidance.sql", "utf8");
  const base = JSON.parse(sql.slice(sql.indexOf("{"), sql.lastIndexOf("}") + 1));
  // Migration 059 adds what each warm-up and stretch move loads.
  const rules = readFileSync("supabase/migrations/059_exercise_injury_rules.sql", "utf8");
  const tail = rules.slice(rules.indexOf("UPDATE app_settings"));
  const added = JSON.parse(tail.slice(tail.indexOf("{"), tail.lastIndexOf("}") + 1));
  await page.evaluate((g) => localStorage.setItem("traintrack.guidance.injury_guidance", g), JSON.stringify({ ...base, ...added }));
  // The swim technique sheets, as migration 060 seeds them.
  const swim = readFileSync("supabase/migrations/060_swimming.sql", "utf8");
  const sheets = swim.slice(swim.indexOf("'", swim.indexOf("'swim_techniques',") + 18) + 1, swim.indexOf("')\nON CONFLICT")).replace(/''/g, "'");
  await page.evaluate((v) => localStorage.setItem("traintrack.guidance.swim_techniques", v), JSON.stringify(JSON.parse(sheets)));
  // The pre-departure checklist, as migration 063 seeds it.
  const check = readFileSync("supabase/migrations/063_outing_checklist.sql", "utf8");
  const checklist = check.slice(check.indexOf("["), check.lastIndexOf("]") + 1).replace(/''/g, "'");
  await page.evaluate((v) => localStorage.setItem("traintrack.guidance.outing_checklist", v), JSON.stringify(JSON.parse(checklist)));
  // Warm-ups and timed sessions, as migration 065 seeds them, yoga and tai-chi added by 072 and 084 (their moves, and their injury rules).
  const m065 = readFileSync("supabase/migrations/065_mobility_and_timed_sessions.sql", "utf8");
  // Yoga (072) and tai-chi (084): each its part of the warm-ups and its moves' injury rules.
  const extraModes = [["yoga", "072_hiit_rounds_and_yoga.sql"], ["taichi", "084_taichi.sql"]].map(([name, file]) => {
    const text = readFileSync(`supabase/migrations/${file}`, "utf8");
    const [mode, rules] = [...text.matchAll(/FROM \(SELECT '\n([\s\S]*?)\n'::jsonb AS data\) AS \w/g)].map((m) => JSON.parse(m[1].replace(/''/g, "'")));
    return { name, mode, rules };
  });
  for (const key of ["mobility_moves", "timed_sessions"]) {
    const start = m065.indexOf(`'${key}', '`) + key.length + 5;
    const value = JSON.parse(m065.slice(start, m065.indexOf("')\nON CONFLICT", start)).replace(/''/g, "'"));
    if (key === "mobility_moves") {
      for (const { name, mode } of extraModes) {
        value.minutes[name] = mode.minutes;
        value.timing[name] = mode.timing;
        value.moves.push(...mode.moves);
      }
    }
    await page.evaluate(([k, v]) => localStorage.setItem(`traintrack.guidance.${k}`, v), [key, JSON.stringify(value)]);
  }
  await page.evaluate((rules) => {
    const g = JSON.parse(localStorage.getItem("traintrack.guidance.injury_guidance"));
    g.mobility = { ...rules, ...g.mobility };
    localStorage.setItem("traintrack.guidance.injury_guidance", JSON.stringify(g));
  }, Object.assign({}, ...extraModes.map((a) => a.rules)));
  // What the ready-made programs need, as migration 066 seeds it.
  const m066 = readFileSync("supabase/migrations/066_program_equipment.sql", "utf8");
  const equipment = m066.slice(m066.indexOf("'program_equipment', '") + 22, m066.indexOf("')\nON CONFLICT")).replace(/''/g, "'");
  await page.evaluate((v) => localStorage.setItem("traintrack.guidance.program_equipment", v), JSON.stringify(JSON.parse(equipment)));
  // Which display mode shows what, as migration 082 seeds it.
  const m082 = readFileSync("supabase/migrations/082_display_modes.sql", "utf8");
  const modes = m082.slice(m082.indexOf("'\n{") + 1, m082.indexOf("}\n'") + 1);
  await page.evaluate((v) => localStorage.setItem("traintrack.guidance.display_modes", v), JSON.stringify(JSON.parse(modes)));
  // The boxing rounds, as migration 085 seeds them.
  const boxingRounds = m085.slice(m085.indexOf("'boxing_rounds', '") + 18, m085.indexOf("')\nON CONFLICT"));
  await page.evaluate((v) => localStorage.setItem("traintrack.guidance.boxing_rounds", v), JSON.stringify(JSON.parse(boxingRounds)));
  // The music apps, as migration 083 seeds them.
  const m083 = readFileSync("supabase/migrations/083_music_apps.sql", "utf8");
  const music = m083.slice(m083.indexOf("'\n[") + 1, m083.indexOf("]\n'") + 1);
  await page.evaluate((v) => localStorage.setItem("traintrack.guidance.music_apps", v), JSON.stringify(JSON.parse(music)));
  // The body map's muscles (089), the muscle groups (091) and the group lessons' sports (092), as the app keeps them.
  const m089 = readFileSync("supabase/migrations/089_tennis_teams_and_references.sql", "utf8");
  const m091 = readFileSync("supabase/migrations/091_muscle_groups.sql", "utf8");
  const m092 = readFileSync("supabase/migrations/092_group_lessons.sql", "utf8").match(/jsonb_build_array\(\n\s*'(\{[\s\S]*?\})'::jsonb \|\| COALESCE[\s\S]*?,\n\s*'(\{[\s\S]*?\})'::jsonb\n\)\)/);
  const lessonsRef = JSON.stringify({ sports: [JSON.parse(m092[1].replace(/''/g, "'")), JSON.parse(m092[2].replace(/''/g, "'"))] });
  await page.evaluate((v) => localStorage.setItem("traintrack.guidance.group_lessons", v), lessonsRef);
  const m093 = readFileSync("supabase/migrations/093_lists.sql", "utf8");
  for (const [key, sql] of [["body_muscles", m089], ["muscle_groups", m091], ["equipment", m093], ["movements", m093], ["swim_strokes", m093], ["choices", m093], ["pain_areas", readFileSync("supabase/migrations/094_pain_areas.sql", "utf8")]]) {
    const text = sql.match(new RegExp(`VALUES \\('${key}', '([\\s\\S]*?)'\\) ON CONFLICT`))[1].replace(/''/g, "'");
    await page.evaluate(({ key, text }) => localStorage.setItem(`traintrack.guidance.${key}`, text), { key, text: JSON.stringify(JSON.parse(text)) });
  }
}

await context.setOffline(true);
console.log("  offline from here on\n");

// ── The paths ───────────────────────────────────────────────────────
console.log("Paths");

await test("the home screen opens offline, with the offline banner", async () => {
  await page.goto(`${BASE}/fr`);
  await page.getByText(/Bonjour/).first().waitFor({ timeout: 15000 });
  expect(await page.getByText(/Hors ligne/).count(), "no offline banner");
});

await test("a ready-made program is added from the home screen", async () => {
  await sessionOption("Changer de séance ou de programme");
  // Found by typing a few letters, accents left out, rather than scrolling a long list.
  await page.getByRole("dialog").getByPlaceholder("Chercher un programme ou une séance").fill("full body deb");
  await page.getByRole("dialog").getByText("Full Body — Débutant").first().click();
  // Saved: it joins the programs to start, at the top of the picker.
  await page.getByRole("dialog").locator("section", { hasText: "Mes programmes" }).getByText("Full Body — Débutant").first().waitFor({ timeout: 10000 });
  await page.keyboard.press("Escape");
  // It now appears in "My programs", on the training page (the home screen keeps the next session only).
  await page.goto(`${BASE}/fr/log`);
  await page.locator("section", { hasText: "Mes programmes" }).getByText("Full Body — Débutant").first().waitFor({ timeout: 10000 });
  await page.goto(`${BASE}/fr`);
});

await test("the weeks ahead go to the phone's calendar", async () => {
  await page.goto(`${BASE}/fr`);
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: /Ajouter les 8 prochaines semaines à mon agenda/ }).click(),
  ]);
  const ics = readFileSync(await download.path(), "utf8");
  expect(download.suggestedFilename().endsWith(".ics"), "not a calendar file");
  expect((ics.match(/BEGIN:VEVENT/g) ?? []).length >= 20, "too few sessions in the calendar");
  expect(/SUMMARY:Entraînement : .+/.test(ics) && ics.includes("T183000"), "sessions not at the training time");
});

await test("a sharp rise of the training load is flagged on the home screen", async () => {
  await page.goto(`${BASE}/fr`);
  // One line among what is worth knowing; the chart and its explanation in Performance.
  const card = page.getByRole("link", { name: /Charge en hausse trop rapide/ });
  await card.getByText(/Hausse trop brutale|Hausse marquée/).waitFor({ timeout: 10000 });
  await card.scrollIntoViewIfNeeded();
  await snap("load-card");
  if (process.env.E2E_SHOTS) {
    // The same home screen on a large screen: the signal of the day beside the session and the week.
    await page.setViewportSize({ width: 1280, height: 900 });
    await snap("home-desktop");
    await page.setViewportSize({ width: 390, height: 844 });
  }
});

await test("pressed for time, the session of the day has a short version", async () => {
  await page.goto(`${BASE}/fr`);
  await heroCard().getByRole("button", { name: "Pas le temps aujourd'hui ?" }).click();
  await page.getByRole("dialog").getByRole("button", { name: /Version courte de la séance/ }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("heading", { name: "Séance express" }).waitFor({ timeout: 5000 });
  const times = dialog.getByRole("group", { name: "Temps disponible" }).getByRole("button");
  expect((await times.count()) >= 2, "only one time offered: nothing to choose");
  expect((await dialog.getByRole("group", { name: "Temps disponible" }).locator('[aria-pressed="true"]').count()) === 1, "no time chosen by default");
  // Another time can be chosen, and the plan follows it.
  await times.first().click();
  expect((await times.first().getAttribute("aria-pressed")) === "true", "the time tapped is not chosen");
  expect((await dialog.locator("li").count()) >= 1, "the short version has no exercise");
  await dialog.getByText(/Environ \d+ min, échauffement compris/).waitFor({ timeout: 5000 });
  await snap("express");
  await page.keyboard.press("Escape");
  await dialog.waitFor({ state: "hidden", timeout: 5000 });
});

await test("its first session starts, with its sets ready, at the fixed session address", async () => {
  await page.goto(`${BASE}/fr`);
  await page.getByRole("button", { name: /Commencer/ }).first().click();
  await page.waitForURL(/\/fr\/log\/session\?id=\d+/, { timeout: 15000 });
  await page.getByText("Squat arrière").first().waitFor({ timeout: 15000 });
  expect((await page.getByRole("button", { name: /Lancer le mode guidé/ }).count()) === 1, "no guided mode button");
});

await test("in guided mode, a set is done and the rest starts", async () => {
  await page.getByRole("button", { name: /Lancer le mode guidé/ }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("spinbutton", { name: "Répétitions" }).fill("8");
  await dialog.getByRole("button", { name: /Série terminée/ }).click();
  await dialog.getByText(/Repos/).first().waitFor({ timeout: 5000 });
  await dialog.getByRole("button", { name: /Passer/ }).first().click();
  await dialog.getByRole("button", { name: /Quitter le mode guidé/ }).click();
});

await test("the session keeps its plan: the program changed afterwards, planned vs done stays, the change is in its history", async () => {
  // Still on the Full Body session, a squat set done in guided mode.
  const sessionUrl = page.url();
  await page.getByText("Prévu / fait").first().click();
  await page.getByText(/Squat arrière · modifié/).first().waitFor({ timeout: 5000 });
  // The program is made one's own, and its squat removed.
  await page.goto(`${BASE}/fr/programs`);
  await page.getByText("Full Body — Débutant", { exact: true }).first().click();
  await page.getByRole("button", { name: "Personnaliser ce programme" }).click();
  await page.waitForURL(/\/fr\/programs\/\d+\/edit$/, { timeout: 10000 });
  await page.getByRole("button", { name: "Retirer Squat arrière" }).first().click();
  await page.getByRole("button", { name: "Enregistrer" }).first().click();
  await page.waitForURL(/\/fr\/programs\/\d+$/, { timeout: 10000 });
  await page.getByText(/Historique des modifications \(2\)/).click();
  await page.getByText(/1 exercice retiré/).first().waitFor({ timeout: 5000 });
  // The session still shows the squat it was planned with.
  await page.goto(sessionUrl);
  await page.getByText("Prévu / fait").first().click();
  await page.getByText(/Squat arrière · modifié/).first().waitFor({ timeout: 5000 });
  await page.getByText(/prévu 3 × /).first().waitFor({ timeout: 5000 });
});

await test("a session done says how hard it felt, counted in the history", async () => {
  // Still on the Full Body session, a set done.
  const card = page.locator("section", { has: page.getByRole("heading", { name: "Comment c’était ?" }) }).first();
  await card.getByRole("button", { name: /^8 sur 10/ }).click();
  await card.getByRole("button", { name: /^8 sur 10/, pressed: true }).waitFor({ timeout: 5000 });
  await card.getByRole("button", { name: "Bien" }).click();
  await page.goto(`${BASE}/fr/history`);
  await page.getByText(/effort 8\/10/).first().waitFor({ timeout: 10000 });
});

await test("a session opened for nothing is called off, kept in the history, and brought back", async () => {
  await page.goto(`${BASE}/fr/log`);
  await page.getByRole("button", { name: /Nouvelle séance/ }).first().click();
  await page.waitForURL(/\/fr\/log\/session\?id=\d+/, { timeout: 15000 });
  const url = page.url();
  await page.getByRole("button", { name: "Modifier la séance" }).click();
  await page.getByRole("button", { name: "Annuler la séance" }).click();
  await page.getByText(/Séance annulée/).waitFor({ timeout: 5000 });
  await page.goto(`${BASE}/fr/history`);
  await page.getByText(/· annulée/).first().waitFor({ timeout: 10000 });
  await page.goto(url);
  await page.getByRole("button", { name: "Rétablir" }).click();
  await page.getByText(/Séance annulée/).waitFor({ state: "detached", timeout: 5000 });
});

await test("an empty session takes an exercise from the library", async () => {
  await page.goto(`${BASE}/fr/log`);
  await page.getByRole("button", { name: /Nouvelle séance/ }).first().click();
  await page.waitForURL(/\/fr\/log\/session\?id=\d+/, { timeout: 15000 });
  await page.getByRole("button", { name: /Ajouter un exercice/ }).click();
  // The whole library, shown at once and scrolled with the finger (not empty then filled: an iPhone may not scroll it).
  const list = page.getByRole("dialog").locator("[aria-live=polite]");
  await list.getByText("Tous les exercices").waitFor({ timeout: 10000 });
  const box = await list.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(0, 600);
  await page.waitForFunction(() => (document.querySelector("[role=dialog] [aria-live=polite]")?.scrollTop ?? 0) > 0, null, { timeout: 5000 });
  // The search reads the names in every language: "push" finds "Pompes".
  await page.getByRole("dialog").getByPlaceholder(/Chercher un exercice/).fill("push");
  await page.getByRole("dialog").getByText("Pompes", { exact: true }).click();
  await page.getByText("Pompes").first().waitFor({ timeout: 5000 });
});

let reusedProgramUrl = "";
await test("a session done becomes a program of its own", async () => {
  // Still on the session that took "Pompes".
  await page.getByRole("button", { name: "Réutiliser cette séance" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByText(/1 exercice repris/).waitFor({ timeout: 5000 });
  await dialog.getByLabel("Nom de la séance").fill("Séance pompes e2e");
  await dialog.getByText("En faire un nouveau programme").click();
  await page.waitForURL(/\/fr\/programs\/\d+$/, { timeout: 10000 });
  await page.getByText("Séance pompes e2e").first().waitFor({ timeout: 5000 });
  reusedProgramUrl = page.url();
});

await test("a program is duplicated and the copy takes an existing session", async () => {
  await page.getByRole("button", { name: "Dupliquer" }).click();
  await page.waitForURL(/\/fr\/programs\/\d+\/edit$/, { timeout: 10000 });
  await page.waitForTimeout(500);
  const values = () => page.locator("input").evaluateAll((els) => els.map((e) => e.value));
  expect((await values()).includes("Séance pompes e2e (copie)"), "the copy is not named as one");
  const before = (await values()).length;
  await page.getByRole("button", { name: "Reprendre une séance existante" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Séances faites", exact: true }).click();
  await dialog.locator("button").filter({ hasText: "1 exercice" }).first().click();
  await dialog.waitFor({ state: "detached", timeout: 5000 });
  expect((await values()).length > before, "no day added from the session");
  // The original is untouched.
  await page.goto(reusedProgramUrl);
  await page.getByText("Séance pompes e2e").first().waitFor({ timeout: 5000 });
  expect(!(await page.getByText("(copie)").count()), "the original changed");
});

await test("a program kept as a favourite, then archived out of the way", async () => {
  await page.goto(reusedProgramUrl);
  const star = page.getByRole("button", { name: "Mettre en favori" });
  await star.click();
  await page.getByRole("button", { name: "Retirer des favoris" }).waitFor({ timeout: 5000 });
  await page.getByRole("button", { name: "Archiver" }).click();
  await page.getByText(/Programme archivé/).waitFor({ timeout: 5000 });
  await page.goto(`${BASE}/fr/programs`);
  await page.getByText(/Archivés \(1\)/).waitFor({ timeout: 10000 });
  // Out of the session picker too.
  await page.goto(`${BASE}/fr`);
  await sessionOption("Changer de séance ou de programme");
  const picker = page.getByRole("dialog");
  await picker.getByPlaceholder("Chercher un programme ou une séance").fill("pompes e2e");
  // The copy, not archived, is there; the archived original is not.
  await picker.getByRole("heading", { name: "Séance pompes e2e (copie)", exact: true }).waitFor({ timeout: 5000 });
  expect(!(await picker.getByRole("heading", { name: "Séance pompes e2e", exact: true }).count()), "an archived program in the picker");
  await page.keyboard.press("Escape");
  // Brought back.
  await page.goto(reusedProgramUrl);
  await page.getByRole("button", { name: "Ressortir" }).click();
  await page.getByRole("button", { name: "Archiver" }).waitFor({ timeout: 5000 });
});

await test("the history shows as a calendar of the month, a day opening its sessions, and the year", async () => {
  await page.goto(`${BASE}/fr/history`);
  const history = page.locator("section", { has: page.locator("#history-title") });
  try {
    await history.getByRole("button", { name: "Calendrier" }).click();
    const grid = history.getByRole("grid");
    await grid.waitFor({ timeout: 5000 });
    const trained = grid.getByRole("button", { name: /\d+ séances?/ });
    expect((await trained.count()) > 0, "no day marked done");
    await trained.first().click();
    expect((await history.locator("button, a").filter({ hasText: /\d{2}\/\d{2}\/\d{4}/ }).count()) > 0, "the day's sessions are not shown");
    await history.getByText(/^Faites \(\d+\)/).waitFor({ timeout: 5000 });
    // The year, month by month; a month opens its calendar.
    await history.getByRole("button", { name: "Année", exact: true }).click();
    await history.getByText(/^\d+ séances? · /).waitFor({ timeout: 5000 });
    expect((await history.locator("ol li").count()) === 12, "the year has not twelve months");
    await history.locator("ol li button").nth(new Date().getMonth()).click();
    await history.getByRole("grid").waitFor({ timeout: 5000 });
  } finally {
    // Put back for the other tests.
    await history.getByRole("button", { name: "Liste" }).click().catch(() => {});
  }
});

await test("the session picker narrows the ready-made programs by sport, a few at a time", async () => {
  await page.goto(`${BASE}/fr`);
  await sessionOption("Changer de séance ou de programme");
  const dialog = page.getByRole("dialog");
  const readyMade = dialog.locator("section", { has: page.locator("#picker-ready-made") });
  const sports = dialog.getByRole("group", { name: "Sport" });
  await sports.getByRole("button", { name: "Tous", exact: true }).click();
  const all = await readyMade.locator("a, button").filter({ hasText: " · " }).count();
  expect(all <= 6, `${all} ready-made programs shown at once`);
  expect(await readyMade.getByRole("button", { name: /Voir plus/ }).count(), "no way to see more");
  await sports.getByRole("button", { name: "Natation", exact: true }).click();
  const rows = readyMade.locator("a, button").filter({ hasText: " · " });
  const n = await rows.count();
  expect(n > 0, "no swimming program");
  for (let i = 0; i < n; i++) expect((await rows.nth(i).innerText()).includes("Natation"), "another sport under swimming");
  // A search that finds nothing says so and offers to clear it.
  await dialog.getByPlaceholder("Chercher un programme ou une séance").fill("zzzz");
  await dialog.getByText("Rien ne correspond.").first().waitFor({ timeout: 5000 });
  await page.keyboard.press("Escape");
});

await test("the library finds an exercise by its French name", async () => {
  await page.goto(`${BASE}/fr/exercises`);
  await page.getByPlaceholder(/Rechercher|Chercher/).first().fill("developpe couche halt");
  await page.getByText("Développé couché aux haltères").first().waitFor({ timeout: 5000 });
  expect(!(await page.getByText("Squat arrière", { exact: true }).count()), "the search keeps unrelated exercises");
});

await test("the changes wait on the device, counted in the banner", async () => {
  const banner = await page.getByText(/modifications? enregistrées? sur l’appareil|modifications? enregistrées? sur l'appareil/).first().innerText();
  const count = Number(banner.match(/(\d+)/)?.[1] ?? 0);
  expect(count >= 3, `only ${count} pending change(s)`);
});

await test("a timed callisthenics session plays and stops without saving", async () => {
  await page.goto(`${BASE}/fr/intervals`);
  await page.getByRole("button", { name: /Démarrer/ }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByText(/Préparez-vous/).waitFor({ timeout: 5000 });
  await dialog.getByRole("button", { name: /Passer/ }).click();
  await dialog.getByText(/Effort/).waitFor({ timeout: 5000 });
  // The voice coach announced the first exercise, then the effort.
  const spoken = await page.evaluate(() => window.__spoken);
  expect(spoken.some((s) => s.startsWith("Préparez-vous. Premier exercice")), `not announced: ${JSON.stringify(spoken)}`);
  expect(spoken.some((s) => / secondes?\.$/.test(s)), `effort not announced: ${JSON.stringify(spoken)}`);
  await snap("player-voice");
  expect(!(await page.getByRole("button", { name: "Ouvrir le menu" }).count()), "the menu wheel is still there during the timed session");
  const voice = dialog.getByRole("button", { name: "Coach vocal" });
  expect((await voice.getAttribute("aria-pressed")) === "true", "voice coach off by default");
  await voice.click();
  expect((await voice.getAttribute("aria-pressed")) === "false", "voice coach did not turn off");
  await voice.click();
  await dialog.getByRole("button", { name: /Terminer la séance/ }).click();
  expect(page.url().includes("/intervals"), "left the page although nothing was done");
  await page.getByRole("button", { name: "Ouvrir le menu" }).waitFor({ timeout: 5000 });
});

await test("a stretching session names the side", async () => {
  await page.goto(`${BASE}/fr/mobility?mode=stretch`);
  await page.getByRole("button", { name: /Démarrer/ }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: /Passer/ }).click();
  await dialog.getByText(/Côté gauche|Côté droit|Étirement/).first().waitFor({ timeout: 5000 });
  expect(!(await page.getByRole("button", { name: "Ouvrir le menu" }).count()), "the menu wheel is still there during the session");
  await dialog.getByRole("button", { name: /Terminer la séance/ }).click();
});

await test("a stretch done is kept with the suppleness felt, and followed on the mobility page", async () => {
  // Short holds and no countdown for the test, the references put back after.
  const kept = await page.evaluate(() => {
    const m = localStorage.getItem("traintrack.guidance.mobility_moves");
    const t = localStorage.getItem("traintrack.guidance.timed_sessions");
    const mm = JSON.parse(m);
    for (const mode of ["warmup", "stretch"]) mm.timing[mode] = { hold: 5, sideHold: 5, transition: 0 };
    const tt = JSON.parse(t);
    tt.getReadySec = 0;
    localStorage.setItem("traintrack.guidance.mobility_moves", JSON.stringify(mm));
    localStorage.setItem("traintrack.guidance.timed_sessions", JSON.stringify(tt));
    return { m, t };
  });
  try {
    await page.goto(`${BASE}/fr/mobility?mode=stretch`);
    await page.getByRole("button", { name: /Démarrer/ }).click();
    const dialog = page.getByRole("dialog");
    await page.waitForTimeout(12000);
    await dialog.getByRole("button", { name: /Terminer la séance/ }).click();
    await page.getByText("Souplesse ressentie après la séance").waitFor({ timeout: 10000 });
    await page.getByRole("button", { name: /^4 sur 5/ }).click();
    await page.getByRole("button", { name: /^4 sur 5/, pressed: true }).waitFor({ timeout: 5000 });
    await page.goto(`${BASE}/fr/history`);
    await page.getByText(/souplesse 4\/5/).first().waitFor({ timeout: 10000 });
    await page.goto(`${BASE}/fr/mobility?mode=stretch`);
    await page.getByRole("heading", { name: "Votre suivi" }).waitFor({ timeout: 10000 });
    expect((await page.getByText(/1 séance/).count()) > 0, "the follow-up does not count the stretch");
  } finally {
    await page.evaluate(({ m, t }) => {
      localStorage.setItem("traintrack.guidance.mobility_moves", m);
      localStorage.setItem("traintrack.guidance.timed_sessions", t);
    }, kept);
  }
});

await test("yoga: a session of its own, from the breathing to the final relaxation", async () => {
  await page.goto(`${BASE}/fr/mobility?mode=yoga`);
  await page.getByRole("button", { name: "Yoga : une séance à part", pressed: true }).waitFor({ timeout: 10000 });
  const moves = page.locator("ol").first().locator("li");
  await moves.first().waitFor({ timeout: 5000 });
  expect((await moves.first().innerText()).includes("Respiration assise"), "yoga does not open with the breathing");
  expect((await moves.last().innerText()).includes("Relaxation finale"), "yoga does not close with the final relaxation");
  // The longest length takes more postures than the shortest.
  const count = await moves.count();
  await page.getByRole("button", { name: "25 min", exact: true }).click();
  expect((await moves.count()) > count, "a longer yoga session holds no more postures");
});

await test("tai-chi: the Yang form followed in its order, a part of it or the whole, always closed", async () => {
  await page.goto(`${BASE}/fr/mobility`);
  await page.getByRole("button", { name: "Tai-chi : une séance à part" }).click();
  await page.getByRole("button", { name: "Tai-chi : une séance à part", pressed: true }).waitFor({ timeout: 10000 });
  // A form has no muscles to aim at.
  expect(!(await page.getByRole("group", { name: "Muscles visés" }).count()), "a target is offered for tai-chi");
  const moves = page.locator("ol").first().locator("li");
  await page.getByRole("button", { name: "10 min", exact: true }).click();
  await moves.first().waitFor({ timeout: 5000 });
  expect((await moves.first().innerText()).includes("Posture de l’arbre"), "tai-chi does not open standing");
  expect((await moves.last().innerText()).includes("Clôture"), "tai-chi does not end with the closing");
  expect((await moves.nth(await moves.count() - 2).innerText()).includes("Simple fouet"), "the short session does not end the form's first part");
  await page.getByRole("button", { name: "25 min", exact: true }).click();
  expect((await moves.count()) === 26, `the long session holds ${await moves.count()} movements, not the whole form`);
  await snap("taichi");
  // Played like yoga, each step a movement.
  await page.getByRole("button", { name: /Démarrer/ }).click();
  const player = page.getByRole("dialog");
  await player.getByRole("button", { name: /Passer/ }).click();
  await player.getByText("Mouvement", { exact: true }).waitFor({ timeout: 5000 });
  await player.getByText("Posture de l’arbre").waitFor({ timeout: 5000 });
  await player.getByRole("button", { name: /Terminer la séance/ }).click();
});

await test("the style chosen in Settings restyles the whole app", async () => {
  await page.goto(`${BASE}/fr/settings?section=appearance`);
  await page.getByRole("button", { name: /Dynamique/ }).click();
  expect(await page.evaluate(() => document.documentElement.classList.contains("style-dynamic")), "no style-dynamic class");
  await page.getByRole("button", { name: /Classique/ }).click();
  expect(!(await page.evaluate(() => document.documentElement.classList.contains("style-dynamic"))), "style not reset");
});

await test("a program is imported from an Excel file, after a preview", async () => {
  await page.goto(`${BASE}/fr/programs`);
  await page.getByRole("button", { name: "Importer" }).click();
  const dialog = page.getByRole("dialog");
  const [template] = await Promise.all([page.waitForEvent("download"), dialog.getByRole("button", { name: /Télécharger le modèle/ }).click()]);
  expect(template.suggestedFilename().endsWith(".xlsx"), "the template is not an .xlsx file");
  await dialog.locator('input[type="file"]').setInputFiles(new URL("../src/lib/__fixtures__/program-fr.xlsx", import.meta.url).pathname);
  await dialog.getByText("3 séances sur 2 semaines, 6 exercices.").waitFor({ timeout: 5000 });
  await dialog.getByText(/créé comme exercice personnel : Curl araignée maison/).waitFor();
  await snap("import-preview");
  await dialog.getByRole("button", { name: "Créer le programme" }).click();
  await page.waitForURL(/\/fr\/programs\/\d+$/, { timeout: 10000 });
  await page.getByText("Haut du corps").first().waitFor({ timeout: 10000 });
});

await test("two programs planned on their own days show together in the week and the calendar", async () => {
  // The imported plan, still open: into the planning, on suggested days.
  await page.getByRole("button", { name: "Ajouter à mon planning" }).click();
  const days = page.locator('fieldset button[aria-pressed="true"]');
  await page.getByRole("heading", { name: "Mon planning", exact: true }).waitFor({ timeout: 5000 });
  expect((await days.count()) === 2, `the plan asks for 2 days a week, ${await days.count()} chosen`);
  // The ready-made program too.
  await page.goto(`${BASE}/fr/programs`);
  await page.getByText("Full Body — Débutant").first().click();
  await page.waitForURL(/\/fr\/programs\/\d+$/, { timeout: 10000 });
  await page.getByRole("button", { name: "Ajouter à mon planning" }).click();
  await page.getByRole("heading", { name: "Mon planning", exact: true }).waitFor({ timeout: 5000 });
  // Home: the session card names its day, and offers each session of that day.
  await page.goto(`${BASE}/fr`);
  const hero = heroCard();
  await hero.getByText(/Séance du jour|Prochaine séance · /).first().waitFor({ timeout: 10000 });
  // Both plans loaded first: the choices of the day are only counted once the week shows them.
  const planned = page.locator("section", { has: page.locator("#week-title") });
  await planned.locator('[aria-label*=": prévu"]').first().waitFor({ timeout: 10000 });
  await page.waitForTimeout(500);
  const choices = hero.getByRole("group", { name: "Séances prévues ce jour-là" }).getByRole("button");
  if ((await choices.count()) > 1) {
    const second = choices.nth(1);
    await second.click();
    expect((await second.getAttribute("aria-pressed")) === "true", "the session picked is not shown");
    const [name] = (await second.innerText()).replace("✓ ", "").split(" · ");
    await hero.getByRole("heading", { name, exact: true }).waitFor({ timeout: 5000 });
  }
  // The week holds the sessions of both; the calendar file names each program.
  const week = page.locator("section", { has: page.locator("#week-title") });
  await week.locator('[aria-label*=": prévu"]').first().waitFor({ timeout: 10000 });
  await snap("week-planning");
  const exportButton = week.getByRole("button", { name: /Ajouter les 8 prochaines semaines/ });
  // Centred, away from the menu button fixed at the bottom of the screen.
  await exportButton.evaluate((el) => el.scrollIntoView({ block: "center" }));
  const [download] = await Promise.all([page.waitForEvent("download"), exportButton.click({ timeout: 10000 })]);
  const ics = readFileSync(await download.path(), "utf8");
  expect(ics.includes("DESCRIPTION:program fr") && ics.includes("DESCRIPTION:Full Body — Débutant"), "the calendar misses a program");
});

await test("the calendar shows the planning ahead: the sessions to come, each named", async () => {
  await page.goto(`${BASE}/fr/history`);
  const history = page.locator("section", { has: page.locator("#history-title") });
  try {
    await history.getByRole("button", { name: "Calendrier" }).click();
    const grid = history.getByRole("grid");
    await grid.waitFor({ timeout: 5000 });
    // This month or the next holds planned sessions, two programs being planned.
    if (!(await grid.getByRole("button", { name: /prévue/ }).count())) await history.getByRole("button", { name: "Mois suivant" }).click();
    await history.getByText(/^Prévues \((?!0\))\d+\)/).waitFor({ timeout: 5000 });
    await grid.getByRole("button", { name: /prévue/ }).first().click();
    await history.getByText(/^Prévu : /).first().waitFor({ timeout: 5000 });
  } finally {
    await history.getByRole("button", { name: "Liste" }).click().catch(() => {});
  }
});

await test("this week's time: the assistant fits the planned sessions to it, applied only when asked", async () => {
  await page.goto(`${BASE}/fr/assistant`);
  const card = page.locator("section", { has: page.locator("#week-fit") });
  await card.waitFor({ timeout: 10000 });
  // Only today, 30 minutes: the other sessions of the week have to move or wait.
  const days = card.getByRole("group", { name: "Jours disponibles" }).getByRole("button");
  await days.first().click();
  await card.getByRole("button", { name: "30 min", exact: true }).click();
  await card.getByRole("button", { name: "30 min", pressed: true }).waitFor({ timeout: 5000 });
  const verdict = card.getByText(/tiennent dans ce temps|→/).first();
  await verdict.waitFor({ timeout: 5000 });
  const apply = card.getByRole("button", { name: /^Appliquer/ });
  if (await apply.count()) {
    await apply.click();
    await card.getByText(/C’est fait|tiennent dans ce temps|version courte/).first().waitFor({ timeout: 5000 });
  }
  // Put the week back as it was for the other tests.
  await page.evaluate(async () => {
    const db = await new Promise((res) => { const r = indexedDB.open("TrainTrack"); r.onsuccess = () => res(r.result); });
    const store = db.transaction("athleteProfiles", "readwrite").objectStore("athleteProfiles");
    await new Promise((res) => { const r = store.getAll(); r.onsuccess = () => { for (const p of r.result) store.put({ ...p, weekAvailability: null, scheduleMoves: [] }); res(); }; });
    db.close();
  });
});

await test("a session of the week moves to another day, and back", async () => {
  await page.goto(`${BASE}/fr`);
  const week = page.locator("section", { has: page.locator("#week-title") });
  await week.locator("button[data-date]").first().waitFor({ timeout: 10000 });
  // The week fills in as the plans load: wait until its first day holds still, then click that very day.
  const firstDay = () => week.locator("button[data-date]").first().getAttribute("data-date");
  let from = await firstDay();
  for (let i = 0; i < 20; i++) {
    await page.waitForTimeout(300);
    const now = await firstDay();
    if (now === from) break;
    from = now;
  }
  const day = week.locator(`button[data-date="${from}"]`).first();
  await day.evaluate((el) => el.scrollIntoView({ block: "center" }));
  await day.click();
  const dialog = page.getByRole("dialog");
  await dialog.getByText(/La déplacer au :|La rattraper le :/).first().waitFor({ timeout: 5000 });
  await snap("move-session");
  const target = dialog.locator("button[data-date]").first();
  const to = await target.getAttribute("data-date");
  await target.click();
  await dialog.waitFor({ state: "hidden", timeout: 5000 });
  const moves = () =>
    page.evaluate(
      () =>
        new Promise((resolve, reject) => {
          const open = indexedDB.open("TrainTrack");
          open.onerror = reject;
          open.onsuccess = () => {
            const all = open.result.transaction("athleteProfiles").objectStore("athleteProfiles").getAll();
            all.onerror = reject;
            all.onsuccess = () => {
              resolve(all.result.flatMap((p) => p.scheduleMoves ?? []));
              open.result.close();
            };
          };
        })
    );
  const saved = await moves();
  expect(saved.length === 1 && saved[0].from === from && saved[0].to === to, `the move kept is ${JSON.stringify(saved)}`);
  // Back from the day it went to, in the week that shows it.
  const moved = week.locator(`button[data-date="${to}"]`);
  for (const arrow of ["Semaine précédente", "Semaine suivante", "Semaine suivante"]) {
    if (await moved.count()) break;
    await week.getByRole("button", { name: arrow }).click();
  }
  await moved.evaluate((el) => el.scrollIntoView({ block: "center" }));
  await moved.click();
  await dialog.getByRole("button", { name: /La remettre au/ }).click();
  await dialog.waitFor({ state: "hidden", timeout: 5000 });
  const after = await moves();
  expect(after.length === 0, `the move is still there: ${JSON.stringify(after)}`);
});

await test("the monthly report counts the sessions of the month", async () => {
  await page.goto(`${BASE}/fr/report`);
  await page.getByText(/Séances : \d+ muscu/).first().waitFor({ timeout: 10000 });
});

await test("sign-up: sport, injuries, a program of that sport put in the planning", async () => {
  // From Settings, the set-up guide runs again, opening on its welcome screen.
  await page.goto(`${BASE}/fr/settings?section=level`);
  await page.getByRole("link", { name: "Relancer l’assistant de démarrage" }).click();
  await page.getByRole("heading", { name: "Bienvenue sur TrainTrack" }).waitFor({ timeout: 10000 });
  await snap("onboarding-welcome");
  await page.getByRole("button", { name: "C’est parti" }).click();
  await page.getByRole("button", { name: "Course à pied" }).click();
  expect((await page.getByRole("button", { name: "Endurance", pressed: true }).count()) === 1, "the sport did not suggest its goal");
  await page.getByRole("button", { name: "Continuer" }).click();
  await page.getByRole("button", { name: "Genou" }).click();
  await page.getByRole("button", { name: "Continuer" }).click();
  await page.getByRole("button", { name: "Continuer" }).click();
  // The programs of the sport come first: pick the first one.
  const first = page.locator("button[aria-pressed]", { hasText: /course|km|marathon/i }).first();
  const name = (await first.locator("p").first().innerText()).trim();
  await first.click();
  await page.getByText(/Consentement données de santé/).click();
  await snap("onboarding-last-step");
  await page.getByRole("button", { name: "Terminer la configuration" }).click();
  await page.waitForURL(/\/fr\/?$/, { timeout: 10000 });
  // Run again, the guide keeps the display mode one has (everything, for a profile that never chose).
  const modes = await page.evaluate(async () => {
    const db = await new Promise((res) => { const r = indexedDB.open("TrainTrack"); r.onsuccess = () => res(r.result); });
    const all = await new Promise((res) => { const r = db.transaction("athleteProfiles").objectStore("athleteProfiles").getAll(); r.onsuccess = () => res(r.result); });
    db.close();
    return all.map((p) => p.displayMode);
  });
  expect(modes.length > 0 && modes.every((m) => m === "expert"), `the guide changed the display mode: ${JSON.stringify(modes)}`);
  // The program is in the planning: its page shows the days it is trained on.
  await page.goto(`${BASE}/fr/programs`);
  await page.getByText(name, { exact: true }).first().click();
  await page.getByRole("heading", { name: "Mon planning", exact: true }).waitFor({ timeout: 10000 });
  await page.goto(`${BASE}/fr`);
  await page.getByRole("heading", { name: "Vos premiers pas" }).waitFor({ timeout: 10000 });
  // One line: the next step only, the list on demand.
  const steps = page.locator("section", { has: page.getByRole("heading", { name: "Vos premiers pas" }) });
  await steps.getByText(/^Suivant : /).waitFor({ timeout: 5000 });
  expect(!(await steps.locator("li").count()), "the first steps are open on the home screen");
  await steps.getByRole("button", { name: "Voir les étapes" }).click();
  expect((await steps.locator("li").count()) >= 4, "the steps do not open");
  await snap("home-first-steps");
});

await test("an invitation link is kept, out of the address bar, and asks for a connection offline", async () => {
  const token = "0123456789abcdef".repeat(4);
  await page.goto(`${BASE}/fr/join#${token}`);
  await page.getByText(/Il faut une connexion pour ouvrir l’invitation/).waitFor({ timeout: 10000 });
  expect(!page.url().includes("#"), "the token stayed in the address bar");
  expect((await page.evaluate(() => localStorage.getItem("traintrack-join"))) === token, "the token was not kept for after sign-in");
  await page.getByRole("button", { name: "Aller à l’accueil" }).click();
  await page.waitForURL(/\/fr\/?$/, { timeout: 10000 });
  expect((await page.evaluate(() => localStorage.getItem("traintrack-join"))) === null, "the token was not forgotten");
});

await test("level tests are set up, started, and wait for a first result", async () => {
  await page.goto(`${BASE}/fr/more`);
  await page.getByRole("link", { name: "Tests de niveau" }).click();
  await page.getByRole("button", { name: "Préparer mes tests" }).click();
  await page.getByRole("button", { name: /Test Poids du corps/ }).waitFor({ timeout: 10000 });
  await page.getByText("Pas encore de résultat : faites un premier test.").waitFor({ timeout: 5000 });
  await snap("tests");
  await page.getByRole("button", { name: /Test Force/ }).click();
  await page.waitForURL(/\/fr\/log\/session\?id=\d+/, { timeout: 10000 });
  await page.getByRole("button", { name: /Terminer la séance/ }).waitFor({ timeout: 10000 });
  expect(!(await page.getByRole("button", { name: "Ouvrir le menu" }).count()), "the menu wheel is still there during the session");
  // The tests are never put forward as the session of the day.
  await page.goto(`${BASE}/fr`);
  const hero = heroCard();
  await hero.getByRole("heading").first().waitFor({ timeout: 10000 });
  expect(!(await hero.getByText("Tests de niveau").count()), "the tests became the session of the day");
});

await test("running paces come from a race time, and an interval session plays at those paces", async () => {
  await page.goto(`${BASE}/fr/more`);
  await page.getByRole("link", { name: "Course à pied" }).click();
  await page.getByRole("heading", { name: "Mes allures" }).waitFor({ timeout: 10000 });
  await page.getByText(/Estimées pour votre niveau/).waitFor({ timeout: 5000 });
  await page.getByRole("button", { name: "Définir" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "10 km" }).click();
  await dialog.getByRole("textbox").fill("50:00");
  await dialog.getByText("VMA : 13,3 km/h").waitFor({ timeout: 5000 });
  await dialog.getByRole("button", { name: "Enregistrer" }).click();
  await page.getByText(/VMA 13,3 km\/h, d’après votre course/).waitFor({ timeout: 5000 });
  // 13.3 km/h: the VMA zone runs from 4:36 to 4:25 a kilometre.
  await page.locator("dl", { hasText: "VMA" }).getByText("4:36–4:25").first().waitFor({ timeout: 5000 });
  await snap("running");
  const card = page.locator("li", { hasText: "Séries de 400 m" });
  await card.getByText(/× 400 m/).waitFor({ timeout: 5000 });
  await card.getByRole("button", { name: "Courir" }).click();
  const player = page.getByRole("dialog");
  await player.getByText(/Préparez-vous/).waitFor({ timeout: 5000 });
  await player.getByRole("button", { name: /Passer/ }).click();
  await player.getByText("Échauffement").first().waitFor({ timeout: 5000 });
  expect(!(await page.getByRole("button", { name: "Ouvrir le menu" }).count()), "the menu wheel is still there during the session");
  await player.getByRole("button", { name: /Terminer la séance/ }).click();
  expect(page.url().includes("/running"), "a session of a few seconds was saved");
});

await test("the home screen follows the sport practised, and offers it when another is chosen", async () => {
  // Mostly runs lately: the guided intervals among the sessions.
  await page.goto(`${BASE}/fr`);
  const overview = page.locator("section", { has: page.locator("#home-progress") });
  // The week in one line: kilos of loaded sets, or the activities done; never "0 kg" or "-100 %".
  const line = /Volume [\d\s\u202f]+ kg cette semaine|\d+ activités? cette semaine|Aucune activité cette semaine/;
  await overview.getByText(line).first().waitFor({ timeout: 10000 }).catch(async () => {
    throw new Error(`no week line in the overview: ${(await overview.first().innerText().catch(() => "?")).replace(/\n/g, " | ")}`);
  });
  expect(!/(^|\s)0 kg|-100 ?%/.test(await overview.first().innerText()), "0 kg or -100 % in the overview");
  await sessionOption("Changer de séance ou de programme");
  await page.getByRole("dialog").getByText("Fractionnés guidés").waitFor({ timeout: 5000 }).catch(() => {
    throw new Error("no guided intervals among the sessions");
  });
  await page.keyboard.press("Escape");
  // Weight training chosen in Settings: the app offers the sport the weeks show.
  await page.goto(`${BASE}/fr/settings?section=sport`);
  await page.getByRole("button", { name: "Musculation", exact: true }).first().click();
  await page.getByRole("button", { name: "Musculation", exact: true, pressed: true }).first().waitFor({ timeout: 5000 });
  await page.goto(`${BASE}/fr`);

  // The load rising too fast comes first; the other notes are folded under "To look at".
  await page.getByRole("link", { name: /Charge en hausse trop rapide/ }).waitFor({ timeout: 10000 });
  const more = page.locator("details", { hasText: "À voir aussi" });
  await more.locator("summary").click();
  await page.getByText("Vous pratiquez surtout : Course à pied ?").waitFor({ timeout: 10000 });
  await snap("home-sport-hint");
  await page.getByRole("button", { name: "Passer à ce sport" }).click();
  await page.getByText("Vous pratiquez surtout : Course à pied ?").waitFor({ state: "hidden", timeout: 5000 });
  const prefs = await page.evaluate(() => JSON.parse(localStorage.getItem("traintrack.prefs") ?? "{}"));
  expect(prefs.sport === "running" && prefs.sport2 === "bodybuilding", `prefs ${JSON.stringify(prefs)}`);
  // "All sports": nothing guessed, the app as it was, kilos and the usual order.
  await page.goto(`${BASE}/fr/settings?section=sport`);
  await page.getByRole("button", { name: "Tous les sports", exact: true }).click();
  await page.getByText("Rien n’est mis en avant").waitFor({ timeout: 5000 });
  await page.goto(`${BASE}/fr`);
  await page.locator("section", { has: page.locator("#home-progress") }).getByText(line).first().waitFor({ timeout: 10000 });
  await sessionOption("Changer de séance ou de programme");
  const rows = page.getByRole("dialog").locator("section", { hasText: "Sans programme" });
  await rows.getByText("Séance libre").waitFor({ timeout: 5000 });
  expect(!(await rows.getByText("Fractionnés guidés").count()), "the guided intervals are put forward in all-sports mode");
  await page.keyboard.press("Escape");
});

await test("a feature left out of the licence is locked, offline too", async () => {
  const setFeatures = (features) =>
    page.evaluate(async (features) => {
      const db = await new Promise((resolve, reject) => {
        const req = indexedDB.open("TrainTrack");
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      await new Promise((resolve, reject) => {
        const tx = db.transaction("authMeta", "readwrite");
        const store = tx.objectStore("authMeta");
        const get = store.get("currentUser");
        get.onsuccess = () => store.put({ ...get.result, planFeatures: features });
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      });
      db.close();
    }, features);
  const all = ["ai_programs","nutrition","readiness","coaching","advanced_progress","planning","level_tests","excel_import","running","meal_plans","reports","challenges","vaulting","group_lessons"];
  await setFeatures(all.filter((f) => f !== "running" && f !== "level_tests"));
  await page.goto(`${BASE}/fr/running`);
  await page.getByText("Licence requise").waitFor({ timeout: 10000 });
  await page.goto(`${BASE}/fr/more`);
  await page.getByText("Programmes").first().waitFor({ timeout: 10000 });
  expect(!(await page.getByText("Course à pied", { exact: true }).count()), "running is still in the list");
  expect(!(await page.getByText("Tests de niveau", { exact: true }).count()), "the level tests are still in the list");
  await setFeatures(all);
  await page.goto(`${BASE}/fr/running`);
  await page.getByText("Licence requise").waitFor({ state: "detached", timeout: 10000 }).catch(() => {});
  expect(!(await page.getByText("Licence requise").count()), "running stays locked with the feature back");
});

await test("the training hub puts three ways to train first, and keeps every other way to start", async () => {
  await page.goto(`${BASE}/fr/log`);
  for (const name of ["Séance planifiée", "Séance libre", "Endurance"]) {
    await page.locator("section", { has: page.getByText(name, { exact: true }) }).first().waitFor({ timeout: 10000 });
  }
  // The planned session can be swapped for another one, in the same picker as the home screen.
  await page.getByRole("button", { name: /Choisir une autre séance|Choisir une séance/ }).first().click();
  await page.getByRole("dialog").getByText("Sans programme").first().waitFor({ timeout: 5000 });
  await page.keyboard.press("Escape");
  // An outing picks its sport.
  await page.getByRole("button", { name: "Sortie d'endurance" }).first().click();
  await page.getByRole("dialog").waitFor({ timeout: 5000 });
  await page.keyboard.press("Escape");
  await page.getByRole("dialog").waitFor({ state: "detached", timeout: 5000 });
  // Nothing wider than the phone: no sideways scrolling.
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow <= 0, `the page is ${overflow}px wider than the screen`);
  // The rest, one tap away; the programs in progress, and the history.
  for (const name of ["Programmes", "Exercices", "HIIT · séance minutée"]) {
    await page.getByRole("link", { name: new RegExp(name) }).first().waitFor({ timeout: 5000 });
  }
  // The history has its own page: a line here, not the whole list at the bottom.
  await page.getByRole("link", { name: /^Historique/ }).waitFor({ timeout: 5000 });
  expect(!(await page.locator("#history-title").count()), "the whole history is still at the bottom of the hub");
  await snap("train-hub");
  if (process.env.E2E_SHOTS) {
    await page.setViewportSize({ width: 1280, height: 900 });
    await snap("train-hub-desktop");
    await page.setViewportSize({ width: 390, height: 844 });
  }
});

/** A session of today with one exercise and its sets, straight in the device's store; its id. */
async function sessionWithSets(sets = 3, exercise = "Push-up", { daysAgo = 0, reps = [] } = {}) {
  return page.evaluate(async ({ user, sets, exercise, daysAgo, reps }) => {
    const db = await new Promise((resolve, reject) => {
      const req = indexedDB.open("TrainTrack");
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    const all = (store) => new Promise((resolve) => { const r = db.transaction(store).objectStore(store).getAll(); r.onsuccess = () => resolve(r.result); });
    const add = (store, value) => new Promise((resolve, reject) => {
      const tx = db.transaction(store, "readwrite");
      const r = tx.objectStore(store).add(value);
      tx.oncomplete = () => resolve(r.result);
      tx.onerror = () => reject(tx.error);
    });
    const ex = (await all("exercises")).find((e) => e.name === exercise);
    const now = new Date();
    const day = new Date(now);
    day.setDate(now.getDate() - daysAgo);
    const date = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
    const id = await add("workouts", { userId: user, uuid: `e2e-active-${Date.now()}`, date, title: "Séance active e2e", _dirty: 0, createdAt: now.toISOString(), updatedAt: now.toISOString() });
    for (let n = 1; n <= sets; n++) {
      const done = reps[n - 1] !== undefined;
      await add("workoutSets", { userId: user, uuid: `e2e-active-${id}-${n}`, workoutId: id, exerciseId: ex.id, setNumber: n, completed: done, reps: done ? reps[n - 1] : undefined, restSec: 90, _dirty: 0, createdAt: now.toISOString(), updatedAt: now.toISOString() });
    }
    db.close();
    return id;
  }, { user: USER, sets, exercise, daysAgo, reps });
}

await test("a session keeps what is typed and the rest running across a reload", async () => {
  const id = await sessionWithSets();
  await page.goto(`${BASE}/fr/log/session?id=${id}`);
  const reps = page.getByRole("spinbutton", { name: "Répétitions" });
  await reps.first().waitFor({ timeout: 10000 });
  // Typed, not left: saved on the device a moment later all the same.
  await reps.first().fill("12");
  await page.waitForTimeout(900);
  await page.reload();
  await reps.first().waitFor({ timeout: 10000 });
  expect((await reps.first().inputValue()) === "12", `the reps typed were lost: "${await reps.first().inputValue()}"`);
  // A set done starts the rest; reloaded, the rest goes on to the same moment.
  const current = page.locator('[aria-current="step"]');
  expect((await current.count()) === 1, "not exactly one current set");
  await page.getByRole("button", { name: "Marquer comme faite" }).first().click();
  // The set done says so; the next one becomes the one to do.
  await page.getByText("Série 1 validée").waitFor({ timeout: 5000 });
  await current.getByText("Série en cours").waitFor({ timeout: 5000 });
  expect((await current.locator("span:not(.sr-only)").first().innerText()).trim() === "2", "the current set did not move to set 2");
  const rest = page.getByRole("timer", { name: "Repos" });
  await rest.waitFor({ timeout: 5000 });
  // The rest says what comes next, without opening anything.
  await rest.getByText("Ensuite : Pompes · série 2").waitFor({ timeout: 5000 });
  if (process.env.E2E_SHOTS) await page.screenshot({ path: join(ARTIFACTS, "rest-bar.png") });
  await page.waitForTimeout(1500);
  await page.reload();
  await rest.waitFor({ timeout: 10000 });
  const left = await rest.innerText();
  expect(/1:2\d|1:1\d|8\d|7\d/.test(left), `the rest did not go on from where it was: "${left}"`);
});

await test("a set's menu holds its RPE and deletes it, with 5 s to undo", async () => {
  const id = await sessionWithSets(3);
  await page.goto(`${BASE}/fr/log/session?id=${id}`);
  const ticks = page.getByRole("button", { name: "Marquer comme faite" });
  await ticks.first().waitFor({ timeout: 10000 });
  expect((await ticks.count()) === 3, "three sets expected");
  // The RPE is no longer on every line: it is in the set's menu.
  expect(!(await page.getByRole("spinbutton", { name: "RPE" }).count()), "an RPE field is still on the lines");
  await snap("active-session");
  await page.getByRole("button", { name: "Options de la série 3" }).click();
  const menu = page.getByRole("dialog");
  await menu.getByRole("spinbutton", { name: "RPE" }).fill("8");
  await menu.getByRole("button", { name: "Supprimer la série" }).click();
  // Gone from the list at once, back with Undo.
  await page.getByText("Série supprimée").waitFor({ timeout: 5000 });
  expect((await ticks.count()) === 2, "the set deleted is still shown");
  await page.getByRole("button", { name: "Annuler" }).click();
  expect((await ticks.count()) === 3, "the set did not come back with Undo");
  // Deleted again and left alone: gone for good after 5 s, a reload included.
  await page.getByRole("button", { name: "Options de la série 3" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Supprimer la série" }).click();
  await page.getByText("Série supprimée").waitFor({ state: "detached", timeout: 8000 });
  await page.reload();
  await ticks.first().waitFor({ timeout: 10000 });
  expect((await ticks.count()) === 2, "the set came back after the 5 s");
  // Finishing and adding an exercise are at the bottom of the screen.
  const finish = page.getByRole("button", { name: /Terminer la séance/ });
  const box = await finish.boundingBox();
  expect(box && box.y > 844 - 120, `"Finish" is not at the bottom: ${box?.y}`);
  expect(box && box.x >= 0 && box.x + box.width <= 390, `"Finish" goes past the screen: ${box?.x}+${box?.width}`);
  if (process.env.E2E_SHOTS) await page.screenshot({ path: join(ARTIFACTS, "active-session-screen.png") });
  await page.getByRole("button", { name: /Ajouter un exercice/ }).waitFor({ timeout: 5000 });
});

await test("each set shows what it was last time, and takes it again in one tap", async () => {
  await sessionWithSets(3, "Plank", { daysAgo: 3, reps: [45, 40, 35] });
  const id = await sessionWithSets(3, "Plank");
  await page.goto(`${BASE}/fr/log/session?id=${id}`);
  await page.getByText("Dernière fois : 45", { exact: true }).waitFor({ timeout: 10000 });
  await page.getByText("Dernière fois : 35", { exact: true }).waitFor({ timeout: 5000 });
  await page.getByRole("button", { name: "Reprendre 45 pour la série 1" }).click();
  const first = page.getByRole("spinbutton").first();
  await page.waitForFunction(() => document.querySelector('input[type="number"]')?.value === "45", null, { timeout: 5000 });
  expect((await first.inputValue()) === "45", `set 1 not filled: "${await first.inputValue()}"`);
  // Taken: nothing more to take for that set.
  expect(!(await page.getByRole("button", { name: "Reprendre 45 pour la série 1" }).count()), "Reuse still offered once taken");
});

await test("a program session made 20 % harder, guided only while sets are left, locked once finished, and reopened", async () => {
  const startProgramDay = async () => {
    await page.goto(`${BASE}/fr/log`);
    const days = page.locator("details", { hasText: "Tous les jours de mes programmes" });
    await days.locator("summary").click();
    await days.getByRole("button").first().click();
    await page.waitForURL(/\/fr\/log\/session\?id=\d+/, { timeout: 15000 });
    return Number(new URL(page.url()).searchParams.get("id"));
  };
  const scale = (target, pct) => target.replace(/\d+/g, (n) => String(Math.max(1, Math.ceil(Math.round(Number(n) * (100 + pct)) / 100))));
  const id = await startProgramDay();
  const intensity = page.getByRole("group", { name: "Intensité" });
  await intensity.getByRole("button", { name: "Normale", pressed: true }).waitFor({ timeout: 10000 });
  const firstTarget = page.getByText(/^Objectif : \d+ × /).first();
  const before = (await firstTarget.innerText()).replace(/^Objectif : \d+ × /, "").split(" · ")[0];
  await intensity.getByRole("button", { name: "+20 %" }).click();
  await intensity.getByRole("button", { name: "+20 %", pressed: true }).waitFor({ timeout: 5000 });
  const after = (await page.getByText(/^Objectif : \d+ × /).first().innerText()).replace(/^Objectif : \d+ × /, "").split(" · ")[0];
  expect(after === scale(before, 20), `the target went from ${before} to ${after}, not ${scale(before, 20)}`);
  await page.getByRole("button", { name: "Lancer le mode guidé" }).waitFor({ timeout: 5000 });
  await snap("session-intensity");

  // Every set done: no guided mode left to start.
  await page.evaluate(async (workoutId) => {
    const db = await new Promise((res) => { const r = indexedDB.open("TrainTrack"); r.onsuccess = () => res(r.result); });
    const store = db.transaction("workoutSets", "readwrite").objectStore("workoutSets");
    await new Promise((res) => { const r = store.getAll(); r.onsuccess = () => { for (const s of r.result) if (s.workoutId === workoutId) store.put({ ...s, completed: true, reps: s.reps ?? 10 }); res(); }; });
    db.close();
  }, id);
  await page.goto(`${BASE}/fr/log/session?id=${id}`);
  await page.getByRole("button", { name: "Terminer la séance" }).waitFor({ timeout: 10000 });
  expect(!(await page.getByRole("button", { name: "Lancer le mode guidé" }).count()), "the guided mode is offered with every set done");

  // Finished: locked, nothing to add nor to finish again, until reopened.
  await page.getByRole("button", { name: "Terminer la séance" }).click();
  await page.getByRole("dialog").getByRole("heading", { name: "Séance terminée" }).waitFor({ timeout: 10000 });
  await page.goto(`${BASE}/fr/log/session?id=${id}`);
  await page.getByRole("status").getByText(/Séance terminée à \d/).waitFor({ timeout: 10000 });
  expect(!(await page.getByRole("button", { name: "Terminer la séance" }).count()), "a finished session can be finished again");
  expect(!(await page.getByRole("button", { name: "Ajouter un exercice" }).count()), "a finished session takes another exercise");
  expect(!(await page.getByRole("group", { name: "Intensité" }).count()), "the intensity of a finished session can be changed");
  expect((await page.locator("fieldset[disabled]").count()) === 1, "the sets of a finished session are not read only");
  expect(await page.locator("fieldset[disabled]").getByRole("button").first().isDisabled(), "a button of a finished session's sets still works");
  expect(await page.getByRole("button", { name: "Ouvrir le menu" }).isVisible(), "the menu wheel stays hidden on a finished session");
  await snap("session-finished");
  await page.getByRole("button", { name: "Rouvrir la séance" }).click();
  await page.getByRole("button", { name: "Terminer la séance" }).waitFor({ timeout: 5000 });
  await page.getByRole("button", { name: "Terminer la séance" }).click();
  await page.getByRole("dialog").getByRole("heading", { name: "Séance terminée" }).waitFor({ timeout: 10000 });

  // The program's next session starts at the same intensity.
  await startProgramDay();
  await page.getByRole("group", { name: "Intensité" }).getByRole("button", { name: "+20 %", pressed: true }).waitFor({ timeout: 10000 });
  await page.getByRole("group", { name: "Intensité" }).getByRole("button", { name: "Normale" }).click();
});

await test("an endurance outing of today hides the menu wheel too", async () => {
  await page.goto(`${BASE}/fr/log`);
  await page.getByRole("button", { name: "Sortie d'endurance" }).first().click();
  await page.getByRole("dialog").getByText("Course à pied").first().click();
  await page.waitForURL(/\/fr\/log\/session\?id=\d+/, { timeout: 10000 });
  await page.getByRole("button", { name: /Terminer la séance/ }).waitFor({ timeout: 10000 });
  expect(!(await page.getByRole("button", { name: "Ouvrir le menu" }).count()), "the menu wheel is still there during the session");
});

await test("a timed session left half-way is taken up again where it stood, for 6 hours", async () => {
  await page.goto(`${BASE}/fr/intervals`);
  await page.getByRole("button", { name: /Démarrer/ }).click();
  const player = page.getByRole("dialog");
  await player.getByText(/Préparez-vous/).waitFor({ timeout: 5000 });
  // The countdown, then two steps skipped: the third is under way when the page is left.
  for (let i = 0; i < 3; i++) await player.getByRole("button", { name: /Passer/ }).click();
  const kept = await page.evaluate(() => JSON.parse(localStorage.getItem("traintrack.timed.intervals") ?? "null"));
  expect(kept?.index === 2, `kept at step ${kept?.index}`);
  await page.reload();
  const left = page.locator("section", { hasText: "Séance minutée interrompue" });
  await left.getByText(/étape 3 sur \d+/).waitFor({ timeout: 10000 });
  await left.getByRole("button", { name: "Reprendre" }).click();
  await player.getByText(/Préparez-vous/).waitFor({ timeout: 5000 });
  await player.getByRole("button", { name: /Passer/ }).click();
  const back = await page.evaluate(() => JSON.parse(localStorage.getItem("traintrack.timed.intervals") ?? "null"));
  expect(back?.index === 2, `taken up at step ${back?.index}, not 2`);
  // Stopped: nothing done, nothing saved, nothing left to take up.
  await player.getByRole("button", { name: /Terminer la séance/ }).click();
  expect(!(await page.evaluate(() => localStorage.getItem("traintrack.timed.intervals"))), "still kept once stopped");
  // Left more than 6 hours ago: only started over or given up.
  await page.getByRole("button", { name: /Démarrer/ }).click();
  await player.getByRole("button", { name: /Passer/ }).click();
  await page.evaluate(() => {
    const k = JSON.parse(localStorage.getItem("traintrack.timed.intervals"));
    localStorage.setItem("traintrack.timed.intervals", JSON.stringify({ ...k, updatedAt: Date.now() - 7 * 3600 * 1000 }));
  });
  await page.reload();
  await left.getByText(/plus de 6 heures/).waitFor({ timeout: 10000 });
  expect(!(await left.getByRole("button", { name: "Reprendre" }).count()), "an old session can still be taken up");
  await left.getByRole("button", { name: "Abandonner" }).click();
  await left.waitFor({ state: "detached", timeout: 5000 });
  expect(!(await page.evaluate(() => localStorage.getItem("traintrack.timed.intervals"))), "still kept once given up");
});

await test("Performance opens on what stands out, with its dates and evidence", async () => {
  await page.goto(`${BASE}/fr/progress`);
  const card = page.locator("section", { has: page.getByText("Ce que disent vos 4 dernières semaines") }).first();
  await card.waitFor({ timeout: 10000 });
  // Five easy weeks then a much harder one: safety first.
  await card.getByRole("heading", { name: "Charge en hausse trop rapide" }).waitFor({ timeout: 5000 });
  await card.getByText(/^Du \d{2}\/\d{2}\/\d{4} au \d{2}\/\d{2}\/\d{4}, comparé au/).waitFor({ timeout: 5000 });
  await card.getByText(/Ratio de charge : \d/).waitFor({ timeout: 5000 });
  // One thing to do, and the other readings folded under it.
  await card.getByText("À faire").waitFor({ timeout: 5000 });
  await card.getByText(/Allégez cette semaine|semaine de décharge/).waitFor({ timeout: 5000 });
  await snap("insight");
  // No more counters of all time; the charts folded until asked for.
  expect(!(await page.getByText("Volume total (kg)").count()), "the all-time counters are still there");
  const fold = page.locator("details#chart-load");
  expect(!(await fold.evaluate((d) => d.open)), "the load chart is open from the start");
  // A piece of evidence opens its chart, and puts the focus on it.
  await card.getByRole("button", { name: /^Voir le graphique : Ratio de charge/ }).click();
  await page.waitForFunction(() => document.querySelector("details#chart-load")?.open === true, null, { timeout: 5000 });
  expect(await page.evaluate(() => document.activeElement?.closest("details")?.id === "chart-load"), "the focus is not on the load chart");
  await fold.getByText("Charge d’entraînement").first().waitFor({ timeout: 5000 });
  // The home screen reads the same four weeks: whatever it says, Performance says too.
  await page.goto(`${BASE}/fr`);
  await page.getByRole("button", { name: "Autres options de séance" }).waitFor({ timeout: 10000 });
  const more = page.locator("details", { hasText: "À voir aussi" });
  await more.first().waitFor({ timeout: 5000 }).catch(() => {});
  if (await more.count()) await more.locator("summary").click();
  const homeTitles = await page.locator("section", { has: page.getByRole("link", { name: "Voir dans Performance" }) }).locator("h2").allInnerTexts();
  await page.goto(`${BASE}/fr/progress`);
  await page.getByText("Ce que disent vos 4 dernières semaines").waitFor({ timeout: 10000 });
  const others = page.locator("details", { hasText: /Autres? lectures?/ });
  if (homeTitles.length) {
    await others.first().waitFor({ timeout: 10000 });
    await others.locator("summary").click();
  }
  for (const title of homeTitles) {
    expect((await page.getByText(title.trim(), { exact: true }).count()) > 0, `the home screen says "${title}", Performance does not`);
  }
});

await test("a session opened then left counts nowhere as activity, the advice included", async () => {
  // Opened today, nothing done: it stays in the history, and nothing counts it.
  await sessionWithSets(2, "Push-up");
  await page.goto(`${BASE}/fr/progress`);
  await page.getByText("Ce que disent vos 4 dernières semaines").waitFor({ timeout: 10000 });
  // The days of the last 7 with a session done, by the same rule as the app.
  const doneDays = await page.evaluate(async () => {
    const db = await new Promise((resolve) => { const r = indexedDB.open("TrainTrack"); r.onsuccess = () => resolve(r.result); });
    const all = (store) => new Promise((resolve) => { const r = db.transaction(store).objectStore(store).getAll(); r.onsuccess = () => resolve(r.result); });
    const [workouts, sets] = [await all("workouts"), await all("workoutSets")];
    db.close();
    const ticked = new Set(sets.filter((x) => x.completed && !x.isWarmup && !x.deletedAt).map((x) => x.workoutId));
    const since = new Date(Date.now() - 7 * 86400000);
    const from = `${since.getFullYear()}-${String(since.getMonth() + 1).padStart(2, "0")}-${String(since.getDate()).padStart(2, "0")}`;
    const done = workouts.filter((w) => !w.deletedAt && w.date >= from && (ticked.has(w.id) || (w.kind === "cardio" && ((w.distanceM ?? 0) > 0 || (w.durationSec ?? 0) > 0)) || (w.durationMin ?? 0) > 0 || (w.durationSec ?? 0) > 0));
    return new Set(done.map((w) => w.date)).size;
  });
  const text = await page.locator("main").innerText();
  const said = /(\d+) séances ces 7 derniers jours/.exec(text);
  if (said) expect(Number(said[1]) <= doneDays, `the advice counts ${said[1]} sessions, ${doneDays} days with a session done`);
});

// ── The menu wheel, with real pointer input ─────────────────────────
// Mouse moves and touches go through the browser's own input pipeline (not
// element.click()), so pointer capture, hit-testing and pointercancel behave
// as they do on a phone or a desktop.
const WHEEL = 'nav[aria-label="Navigation principale"]';
const wheel = {
  async open(path = "/fr") {
    await page.goto(`${BASE}${path}`);
    await page.getByRole("button", { name: "Ouvrir le menu" }).click();
    await page.locator(WHEEL).waitFor({ timeout: 10000 });
  },
  /** The rotation of the ring of the open wheel, in degrees. */
  rotation: (nav = WHEEL) =>
    page.locator(`${nav} ul`).first().evaluate((ul) => Number(/rotate\((-?[\d.]+)deg\)/.exec(ul.style.transform)?.[1] ?? NaN)),
  count: (nav = WHEEL) => page.locator(`${nav} > ul > li`).count(),
  /** The centre of an item of the wheel, found by its label. */
  async centre(label, nav = WHEEL) {
    const box = await page.locator(`${nav} > ul > li`).filter({ hasText: label }).first().locator("button, a").first().boundingBox();
    expect(box, `no item "${label}" in the wheel`);
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  },
  /** Waits for the end of the 240 ms turn, then checks the ring sits on a notch. */
  async onNotch(nav = WHEEL) {
    await page.waitForTimeout(400);
    const deg = await wheel.rotation(nav);
    const step = 360 / (await wheel.count(nav));
    const off = Math.abs(deg / step - Math.round(deg / step));
    expect(off < 0.01, `the wheel stopped between two notches: ${deg}° (notch every ${step}°)`);
    return deg;
  },
};
const mouseDrag = async (from, dx) => {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) await page.mouse.move(from.x + (dx * i) / 10, from.y);
  await page.mouse.up();
};

await test("the menu wheel: a click opens a section, and its wheel leads to a page", async () => {
  await page.setViewportSize({ width: 1280, height: 800 });
  try {
    await wheel.open();
    const train = await wheel.centre("S’entraîner");
    await page.mouse.click(train.x, train.y);
    const sub = 'nav[aria-label="S’entraîner"]';
    await page.locator(sub).waitFor({ timeout: 5000 });
    await page.getByText("Toutes les sections").waitFor();
    const programs = await wheel.centre("Programmes", sub);
    await page.mouse.click(programs.x, programs.y);
    await page.waitForURL(/\/fr\/programs$/, { timeout: 10000 });
    await page.locator(sub).waitFor({ state: "detached", timeout: 5000 });
  } finally {
    await page.setViewportSize({ width: 390, height: 844 });
  }
});

await test("the menu wheel's History leads to the history alone, under its own title", async () => {
  await page.setViewportSize({ width: 1280, height: 800 });
  try {
    await wheel.open();
    const train = await wheel.centre("S’entraîner");
    await page.mouse.click(train.x, train.y);
    const sub = 'nav[aria-label="S’entraîner"]';
    await page.locator(sub).waitFor({ timeout: 5000 });
    const history = await wheel.centre("Historique", sub);
    await page.mouse.click(history.x, history.y);
    await page.waitForURL(/\/fr\/history$/, { timeout: 10000 });
    await page.getByRole("heading", { name: "Historique", level: 1 }).waitFor({ timeout: 10000 });
    await page.getByRole("button", { name: "Calendrier" }).waitFor({ timeout: 10000 });
    expect(!(await page.getByText("Séance libre", { exact: true }).count()), "the history page shows the ways to train");
  } finally {
    await page.setViewportSize({ width: 390, height: 844 });
  }
  await snap("history-page");
});

await test("the menu wheel: dragged with the mouse, from the empty ring or from an icon, it turns, snaps, and opens nothing", async () => {
  await page.setViewportSize({ width: 1280, height: 800 });
  try {
    await wheel.open();
    const box = await page.locator(WHEEL).boundingBox();
    // On the ring, between two icons: nothing to open there.
    const empty = { x: box.x + box.width * 0.78, y: box.y + box.height * 0.22 };
    await mouseDrag(empty, -170);
    expect((await wheel.onNotch()) !== 0, "the wheel did not turn");
    expect(!(await page.locator('nav[aria-label="S’entraîner"]').count()), "a drag opened a section");

    // Started on an icon: it turns too, and the icon under the finger is not opened.
    const start = await wheel.rotation();
    await mouseDrag(await wheel.centre("Performance"), 170);
    expect((await wheel.onNotch()) !== start, "a drag started on an icon did not turn the wheel");
    expect(!(await page.locator('nav[aria-label="Performance"]').count()), "the icon under the drag was opened");

    // In a section, a drag from a link does not follow it.
    const performance = await wheel.centre("Performance");
    await page.mouse.click(performance.x, performance.y);
    const sub = 'nav[aria-label="Performance"]';
    await page.locator(sub).waitFor({ timeout: 5000 });
    await mouseDrag(await wheel.centre("Progrès", sub), -170);
    await wheel.onNotch(sub);
    expect(/\/fr$/.test(page.url()), `a drag from a link followed it: ${page.url()}`);
    // And a click right after a drag still works.
    const progress = await wheel.centre("Progrès", sub);
    await page.mouse.click(progress.x, progress.y);
    await page.waitForURL(/\/fr\/progress$/, { timeout: 10000 });
  } finally {
    await page.setViewportSize({ width: 390, height: 844 });
  }
});

await test("the menu wheel: touched on a phone, a tap opens, a drag snaps after the finger lifts or the gesture is cancelled", async () => {
  const cdp = await context.newCDPSession(page);
  await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 1 });
  const touch = (type, p) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: p ? [{ x: p.x, y: p.y }] : [] });
  const swipe = async (from, dx, end) => {
    await touch("touchStart", from);
    for (let i = 1; i <= 10; i++) await touch("touchMove", { x: from.x + (dx * i) / 10, y: from.y });
    await touch(end, end === "touchCancel" ? null : { x: from.x + dx, y: from.y });
  };
  const tap = async (p) => {
    await touch("touchStart", p);
    await touch("touchEnd", p);
  };
  try {
    await wheel.open();
    // A tap on a section opens it.
    await tap(await wheel.centre("S’entraîner"));
    const sub = 'nav[aria-label="S’entraîner"]';
    await page.locator(sub).waitFor({ timeout: 5000 });

    // Lifted: pointerup snaps the wheel, and the link under the finger is not followed.
    await swipe(await wheel.centre("Programmes", sub), -120, "touchEnd");
    const lifted = await wheel.onNotch(sub);
    expect(lifted !== 0, "the swipe did not turn the wheel");
    expect(/\/fr$/.test(page.url()), `a swipe followed a link: ${page.url()}`);

    // Cancelled by the browser mid-way: pointercancel snaps it too.
    await swipe(await wheel.centre("Exercices", sub), -70, "touchCancel");
    await wheel.onNotch(sub);
    expect(/\/fr$/.test(page.url()), `a cancelled swipe followed a link: ${page.url()}`);

    // A tap on a link of the section's wheel follows it.
    await tap(await wheel.centre("Programmes", sub));
    await page.waitForURL(/\/fr\/programs$/, { timeout: 10000 });
  } finally {
    await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: false });
    await cdp.detach();
    // Leaving touch emulation puts the page back online while Playwright still
    // believes it offline: toggle, so the next paths run offline again.
    await context.setOffline(false);
    await context.setOffline(true);
  }
});

await test("the menu wheel is gone during today's session, and stays on a past one", async () => {
  const [today, past] = await page.evaluate(async (user) => {
    const db = await new Promise((resolve, reject) => {
      const req = indexedDB.open("TrainTrack");
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    const now = new Date();
    const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const lastWeek = new Date(now);
    lastWeek.setDate(now.getDate() - 7);
    const add = (date, uuid) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction("workouts", "readwrite");
        const req = tx.objectStore("workouts").add({ userId: user, uuid, date, title: "Séance e2e", _dirty: 0, createdAt: now.toISOString(), updatedAt: now.toISOString() });
        tx.oncomplete = () => resolve(req.result);
        tx.onerror = () => reject(tx.error);
      });
    const ids = [await add(iso(now), "e2e-nav-today"), await add(iso(lastWeek), "e2e-nav-past")];
    db.close();
    return ids;
  }, USER);
  const menu = page.getByRole("button", { name: "Ouvrir le menu" });
  await page.goto(`${BASE}/fr/log/session?id=${past}`);
  await menu.waitFor({ timeout: 10000 });
  await page.goto(`${BASE}/fr/log/session?id=${today}`);
  await page.getByRole("button", { name: /Terminer/ }).first().waitFor({ timeout: 10000 });
  await page.waitForTimeout(300);
  expect(!(await menu.count()), "the menu wheel is still there during today's session");
  // Leaving the session brings it back.
  await page.goto(`${BASE}/fr`);
  await menu.waitFor({ timeout: 10000 });
});

await test("the menu wheel works from the keyboard: in, turned, opened, and closed with Escape", async () => {
  await page.goto(`${BASE}/fr`);
  const toggle = page.getByRole("button", { name: "Ouvrir le menu" });
  await toggle.focus();
  await page.keyboard.press("Enter");
  await page.locator(WHEEL).waitFor({ timeout: 5000 });
  // The focus goes into the wheel, not back to the top of the page.
  expect(await page.evaluate(() => !!document.activeElement?.closest("aside")), "the focus is not in the wheel once opened");
  const before = await wheel.rotation();
  await page.keyboard.press("ArrowRight");
  await page.waitForTimeout(300);
  expect((await wheel.rotation()) !== before, "the arrows do not turn the wheel");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  await page.locator('aside nav:not([aria-label="Navigation principale"])').waitFor({ timeout: 5000 });
  await page.keyboard.press("Escape");
  await page.locator("aside").waitFor({ state: "detached", timeout: 5000 });
  expect(await page.evaluate(() => document.activeElement?.getAttribute("aria-label") === "Ouvrir le menu"), "the focus is not back on the menu button");
});

await test("in Dynamic the menu is a dial: slices turn with the arrows, the outer ring leads to a page", async () => {
  await page.evaluate(() => { const p = JSON.parse(localStorage.getItem("traintrack.prefs") || "{}"); p.style = "dynamic"; localStorage.setItem("traintrack.prefs", JSON.stringify(p)); });
  await page.goto(`${BASE}/fr`);
  await page.getByRole("button", { name: "Ouvrir le menu" }).click();
  const dial = page.getByRole("navigation", { name: "Toutes les sections" });
  await dial.waitFor({ timeout: 5000 });
  expect(await dial.evaluate((el) => el === document.activeElement), "the dial does not take the focus");
  const pressed = () => dial.locator('button[aria-pressed="true"]').innerText();
  const first = (await pressed()).trim();
  await page.keyboard.press("ArrowRight");
  const second = (await pressed()).trim();
  expect(first !== second, "the arrow did not turn the dial");
  const links = dial.getByRole("link");
  expect((await links.count()) >= 3, "the outer ring has no destinations");
  const href = await links.first().getAttribute("href");
  await links.first().click();
  await page.waitForURL((url) => url.pathname === href, { timeout: 10000 });
  await page.evaluate(() => { const p = JSON.parse(localStorage.getItem("traintrack.prefs") || "{}"); p.style = "classic"; localStorage.setItem("traintrack.prefs", JSON.stringify(p)); });
});

await test("in Classic the dial can be chosen in Settings, and the round buttons back", async () => {
  await page.goto(`${BASE}/fr/settings?section=navigation`);
  const looks = page.getByRole("group", { name: "Apparence de la roue" });
  await looks.getByRole("button", { name: "Cadran" }).click();
  expect((await looks.getByRole("button", { name: "Cadran" }).getAttribute("aria-pressed")) === "true", "the dial is not chosen");
  await page.goto(`${BASE}/fr`);
  await page.getByRole("button", { name: "Ouvrir le menu" }).click();
  await page.getByRole("navigation", { name: "Toutes les sections" }).locator(".t-dial-slice").first().waitFor({ timeout: 5000 });
  await page.keyboard.press("Escape");
  await page.goto(`${BASE}/fr/settings?section=navigation`);
  await page.getByRole("group", { name: "Apparence de la roue" }).getByRole("button", { name: "Pastilles" }).click();
  await page.goto(`${BASE}/fr`);
  await page.getByRole("button", { name: "Ouvrir le menu" }).click();
  await page.waitForTimeout(300);
  expect(!(await page.locator(".t-dial").count()), "the dial is still there after choosing the round buttons");
  await page.keyboard.press("Escape");
  await page.evaluate(() => { const p = JSON.parse(localStorage.getItem("traintrack.prefs") || "{}"); delete p.wheel; localStorage.setItem("traintrack.prefs", JSON.stringify(p)); });
});

await test("the injury shelf offers a program per injured area, and the others that suit it", async () => {
  // The whole library and what each exercise loads, as a device holds it once synced; taken back after.
  const library = (op) => page.evaluate(async ({ op, exerciseRules }) => {
    const db = await new Promise((res, rej) => { const r = indexedDB.open("TrainTrack"); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    const now = new Date().toISOString();
    await new Promise((res, rej) => {
      const tx = db.transaction("exercises", "readwrite");
      const os = tx.objectStore("exercises");
      const all = os.getAll();
      all.onsuccess = () => {
        const have = new Set(all.result.map((e) => e.name));
        if (op === "add") {
          for (const [name, injuryRules] of Object.entries(exerciseRules)) {
            if (!have.has(name)) os.add({ name, muscleGroup: "other", isCustom: false, userId: null, uuid: `e2e-rules-${name}`, injuryRules, _dirty: 0, createdAt: now, updatedAt: now });
          }
        } else {
          for (const e of all.result) if (String(e.uuid).startsWith("e2e-rules-")) os.delete(e.id);
        }
      };
      tx.oncomplete = res;
      tx.onerror = () => rej(tx.error);
    });
    db.close();
  }, { op, exerciseRules });
  await page.goto(`${BASE}/fr/programs`);
  await library("add");
  try {
  await page.goto(`${BASE}/fr/programs`);
  await page.getByRole("button", { name: /Adapté à une blessure/ }).click();
  const dialog = page.getByRole("dialog");
  const areas = dialog.getByRole("group", { name: "Zone blessée" });
  await areas.getByRole("button", { name: "Genou" }).click();
  await dialog.getByText("Genou blessé : haut du corps et hanches").waitFor({ timeout: 5000 });
  expect((await dialog.getByText("Épaule blessée : jambes et abdos").count()) === 0, "the shoulder program shows for a knee");
  // No ready-made program spares the shoulder: only the one written for it.
  await areas.getByRole("button", { name: "Épaule" }).click();
  await dialog.getByText("Épaule blessée : jambes et abdos").waitFor({ timeout: 5000 });
  await dialog.getByText("Aucun autre programme ne convient pour cette zone.").waitFor({ timeout: 5000 });
  expect((await areas.getByRole("button", { name: "Épaule" }).getAttribute("aria-pressed")) === "true", "the shoulder chip is not marked chosen");
  expect((await areas.getByRole("button", { name: "Genou" }).getAttribute("aria-pressed")) === "false", "the knee chip is still marked chosen");
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(ARTIFACTS, "injury-shelf.png") });
  await page.keyboard.press("Escape");
  } finally {
    await library("remove");
  }
});

await test("a ready-made program followed is left from the list, with a confirmation; a coach's has no such button", async () => {
  await page.goto(`${BASE}/fr/programs`);
  await page.getByRole("button", { name: /TRX \(sangles\)/ }).click();
  const dialog = page.getByRole("dialog");
  await dialog.locator("li", { hasText: "TRX débutant" }).getByRole("button", { name: "Ajouter à mes programmes" }).click();
  await page.waitForURL(/\/fr\/programs\/\d+$/, { timeout: 10000 });
  await page.goto(`${BASE}/fr/programs`);
  const followed = page.locator("section", { has: page.getByRole("heading", { name: "Programmes suivis" }) });
  const leave = followed.getByRole("button", { name: "Me désinscrire de « TRX débutant »" });
  await leave.waitFor({ timeout: 10000 });
  await snap("programs-leave");
  // Cancelled: still followed.
  await leave.click();
  await page.getByRole("dialog").getByRole("heading", { name: "Quitter « TRX débutant » ?" }).waitFor({ timeout: 5000 });
  await page.getByRole("dialog").getByRole("button", { name: "Annuler" }).click();
  await page.getByRole("dialog").waitFor({ state: "detached", timeout: 5000 });
  expect(await followed.getByText("TRX débutant", { exact: true }).count(), "cancelling left the program");
  // Confirmed: gone from the list.
  await leave.click();
  await page.getByRole("dialog").getByRole("button", { name: "Me désinscrire" }).click();
  await followed.getByText("TRX débutant", { exact: true }).waitFor({ state: "detached", timeout: 10000 });
  // Every other button of the section leaves a ready-made program, never a coach's.
  const labels = await followed.getByRole("button", { name: /^Me désinscrire de/ }).evaluateAll((els) => els.map((e) => e.closest("div.flex")?.textContent ?? ""));
  expect(labels.every((t) => !t.includes("par votre coach")), "a coach's program can be left from the list");
});

await test("TRX: a shelf of programs, and straps in the timed sessions", async () => {
  await page.goto(`${BASE}/fr/programs`);
  await page.getByRole("button", { name: /TRX \(sangles\)/ }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByText("TRX débutant").waitFor({ timeout: 5000 });
  await dialog.getByText("TRX intermédiaire").waitFor({ timeout: 5000 });
  await page.keyboard.press("Escape");
  await page.goto(`${BASE}/fr/intervals`);
  const straps = page.getByRole("button", { name: "Sangles TRX" });
  await straps.click();
  expect((await straps.getAttribute("aria-pressed")) === "true", "the straps are not chosen");
  // About half the round with the straps, each named in the session shown.
  const names = ["Tirage TRX", "Développé pectoraux TRX", "Squat TRX", "Pike TRX", "Genoux-poitrine TRX", "Mountain climber TRX", "Curl biceps TRX", "Extension triceps TRX", "Élévation en Y TRX", "Squat sauté TRX", "Pompe atomique TRX", "Départ de sprinteur TRX"];
  let shown = 0;
  for (const n of names) shown += await page.getByText(n, { exact: true }).count();
  expect(shown >= 2, `only ${shown} TRX exercise(s) in the session`);
  await page.getByText(/^(Tirage|Développé pectoraux|Squat|Pike|Genoux-poitrine|Mountain climber|Curl biceps|Extension triceps|Élévation en Y|Squat sauté|Pompe atomique|Départ de sprinteur) TRX$/).first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(ARTIFACTS, "trx-intervals.png") });
  // Back to the body alone, for the paths after this one.
  await page.getByRole("button", { name: "Poids du corps" }).click();
});

await test("every page has a way back, home when it was opened directly", async () => {
  for (const path of ["/settings", "/exercises", "/log", "/more", "/nutrition", "/progress", "/readiness", "/teams"]) {
    await page.goto(`${BASE}/fr${path}`);
    await page.getByRole("button", { name: "Retour" }).first().waitFor({ timeout: 10000 });
  }
  // Within the app: back to the page before.
  await page.goto(`${BASE}/fr/more`);
  await page.locator('main a[href$="/settings"]').first().click();
  await page.waitForURL(/\/fr\/settings$/, { timeout: 10000 });
  await page.getByRole("button", { name: "Retour" }).first().click();
  await page.waitForURL(/\/fr\/more$/, { timeout: 10000 });
  // A tab opened straight on Settings: back leads home.
  const fresh = await context.newPage();
  await fresh.goto(`${BASE}/fr/settings`);
  await fresh.getByRole("button", { name: "Retour" }).first().click();
  await fresh.waitForURL(/\/fr$/, { timeout: 10000 });
  await fresh.close();
});

await test("the menu wheel brings one's sport: a runner goes straight to running", async () => {
  const setSport = setSportChoice;
  await page.setViewportSize({ width: 1280, height: 800 });
  try {
    await page.goto(`${BASE}/fr`);
    await setSport("running");
    await page.goto(`${BASE}/fr`);
    await wheel.open();
    const train = await wheel.centre("S’entraîner");
    await page.mouse.click(train.x, train.y);
    const sub = 'nav[aria-label="S’entraîner"]';
    await page.locator(sub).waitFor({ timeout: 5000 });
    expect(!(await page.locator(sub).getByText("Sports", { exact: true }).count()), "the generic Sports entry is still there for a runner");
    const running = await wheel.centre("Course à pied", sub);
    await page.mouse.click(running.x, running.y);
    await page.waitForURL(/\/fr\/running$/, { timeout: 10000 });
  } finally {
    await setSport(null);
    await page.setViewportSize({ width: 390, height: 844 });
  }
});

await test("nutrition for one's sport: carbohydrates by the kilo, and food around the session", async () => {
  // Targets, a weight, and a long run today, then all taken back for the paths after.
  const store = (args) => page.evaluate(async ([name, op, value]) => {
    const db = await new Promise((res, rej) => { const r = indexedDB.open("TrainTrack"); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    return new Promise((res, rej) => {
      const tx = db.transaction(name, "readwrite");
      const os = tx.objectStore(name);
      let out;
      if (op === "put") { const r = os.put(value); r.onsuccess = () => { out = r.result; }; }
      if (op === "delete") os.delete(value);
      if (op === "profile") { const g = os.getAll(); g.onsuccess = () => { for (const p of g.result) os.put({ ...p, nutritionTargets: value }); }; }
      tx.oncomplete = () => res(out);
      tx.onerror = () => rej(tx.error);
    });
  }, args);
  const today = await page.evaluate(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; });
  const now = new Date().toISOString();
  await page.goto(`${BASE}/fr`);
  await store(["athleteProfiles", "profile", { calories: 2400, protein: 120 }]);
  const metric = await store(["bodyMetrics", "put", { userId: "00000000-0000-4000-8000-0000000000e2", uuid: "e2e-weight", date: today, weightKg: 60, _dirty: 0, createdAt: now, updatedAt: now }]);
  const long = await store(["workouts", "put", { userId: "00000000-0000-4000-8000-0000000000e2", uuid: "e2e-long-today", date: today, kind: "cardio", sport: "run", title: "Sortie longue", durationSec: 110 * 60, distanceM: 18000, _dirty: 0, createdAt: now, updatedAt: now }]);
  await setSportChoice("running");
  // The references as the app keeps them after reading them online once (migrations 056 and 057).
  const json = (file) => { const sql = readFileSync(`supabase/migrations/${file}`, "utf8"); return JSON.parse(sql.slice(sql.indexOf("{"), sql.lastIndexOf("}") + 1)); };
  const guidance = JSON.stringify({ ...json("056_nutrition_guidance.sql"), ...json("057_nutrition_targets_guidance.sql") });
  try {
    // Without the references, the card shares nothing out by sport.
    await page.goto(`${BASE}/fr/nutrition`);
    await page.getByText("Idées de repas", { exact: false }).first().waitFor({ timeout: 10000 });
    expect(!(await page.getByText("Autour de la séance", { exact: true }).count()), "food around the session shown without the references");
    await page.evaluate((g) => localStorage.setItem("traintrack.guidance.nutrition_guidance", g), guidance);
    await page.goto(`${BASE}/fr/nutrition`);
    await page.getByText(/Course à pied : [\d,]+ g de glucides par kg aujourd’hui \(repère 6–10 g\/kg\)/).waitFor({ timeout: 10000 });
    await page.getByText("Autour de la séance", { exact: true }).waitFor({ timeout: 5000 });
    // A long run: carbohydrates and water by the hour during it.
    await page.getByText("30–60 g de glucides/h · 400–800 ml d’eau/h").waitFor({ timeout: 5000 });
    await page.getByText("Autour de la séance", { exact: true }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: join(ARTIFACTS, "sport-nutrition.png"), fullPage: false });
  } finally {
    await setSportChoice(null);
    await page.evaluate(() => localStorage.removeItem("traintrack.guidance.nutrition_guidance"));
    await store(["workouts", "delete", long]);
    await store(["bodyMetrics", "delete", metric]);
    await store(["athleteProfiles", "profile", undefined]);
  }
});

await test("timed sets follow each other by themselves: count down, rest, next set", async () => {
  const id = await page.evaluate(async (user) => {
    const db = await new Promise((res, rej) => { const r = indexedDB.open("TrainTrack"); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    const all = (store) => new Promise((res) => { const r = db.transaction(store).objectStore(store).getAll(); r.onsuccess = () => res(r.result); });
    const add = (store, value) => new Promise((res, rej) => { const tx = db.transaction(store, "readwrite"); const r = tx.objectStore(store).add(value); tx.oncomplete = () => res(r.result); tx.onerror = () => rej(tx.error); });
    const now = new Date().toISOString();
    const plank = (await all("exercises")).find((e) => e.name === "Plank");
    const programId = await add("programs", {
      userId: user, uuid: `e2e-hold-${Date.now()}`, name: "Gainage e2e", _dirty: 0, createdAt: now, updatedAt: now,
      structure: [{ name: "Jour", exercises: [{ exerciseName: "Plank", targetSets: 2, targetReps: "3s", restSec: 3 }] }],
    });
    const d = new Date();
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const workoutId = await add("workouts", { userId: user, uuid: `e2e-hold-w-${Date.now()}`, date, title: "Gainage e2e — Jour", programId, programDayIndex: 0, _dirty: 0, createdAt: now, updatedAt: now });
    for (const n of [1, 2]) await add("workoutSets", { userId: user, uuid: `e2e-hold-${workoutId}-${n}`, workoutId, exerciseId: plank.id, setNumber: n, completed: false, restSec: 3, _dirty: 0, createdAt: now, updatedAt: now });
    db.close();
    return workoutId;
  }, USER);
  await page.goto(`${BASE}/fr/log/session?id=${id}`);
  await page.getByRole("button", { name: "Démarrer la série 1" }).click();
  // Counting down from the target, then nothing more to tap: rest, set 2, done.
  const effort = page.getByRole("timer", { name: "Effort" });
  await effort.waitFor({ timeout: 5000 });
  expect(/0:0[1-3]/.test(await effort.innerText()), `not counting down from 3 s: ${await effort.innerText()}`);
  await page.screenshot({ path: join(ARTIFACTS, "big-timer-effort.png") });
  await page.getByRole("timer", { name: "Repos" }).waitFor({ timeout: 8000 });
  await page.screenshot({ path: join(ARTIFACTS, "big-timer-rest.png") });
  await effort.getByText("Série 2", { exact: true }).waitFor({ timeout: 10000 });
  // Both held to the end: the exercise folds, its two sets of 3 seconds done.
  await page.getByText(/2 séries · 3, 3 s/).waitFor({ timeout: 10000 });
});

await test("an injured knee gets gentle moves on the home screen, and a pain coming back says to see someone", async () => {
  const setProfile = (fields) => page.evaluate(async (fields) => {
    const db = await new Promise((res, rej) => { const r = indexedDB.open("TrainTrack"); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    await new Promise((res, rej) => {
      const tx = db.transaction("athleteProfiles", "readwrite");
      const os = tx.objectStore("athleteProfiles");
      const all = os.getAll();
      all.onsuccess = () => { for (const p of all.result) os.put({ ...p, ...fields }); };
      tx.oncomplete = res;
      tx.onerror = () => rej(tx.error);
    });
    db.close();
  }, fields);
  await page.goto(`${BASE}/fr`);
  await setProfile({ injuryAreas: [{ area: "knee", since: "2026-11-01" }] });
  try {
    await page.goto(`${BASE}/fr`);
    // On the home screen: one line, never folded with the other notes, leading to the care.
    const line = page.getByRole("link", { name: /Blessure en cours · Genou/ });
    await line.waitFor({ timeout: 10000 });
    expect(!(await page.locator("details", { hasText: "À voir aussi" }).getByRole("link", { name: /Blessure en cours/ }).count()), "the injury is folded with the notes");
    expect(!(await page.getByText("Mouvements doux · Genou").count()), "the gentle moves are on the home screen");
    await line.click();
    await page.waitForURL(/\/fr\/health/, { timeout: 10000 });
    const card = page.locator("section", { hasText: "Prendre soin d’une blessure" });
    await card.getByText("Mouvements doux · Genou").waitFor({ timeout: 10000 });
    await card.getByText("Ponts fessiers").waitFor({ timeout: 5000 });
    await card.getByText(/à valider avec un professionnel de santé/).waitFor({ timeout: 5000 });
    // A move to avoid for a knee is never offered.
    expect(!(await card.getByText("Étirement des quadriceps debout").count()), "a move to avoid for the knee is offered");
  } finally {
    await setProfile({ injuryAreas: null });
  }
});

await test("swimming: the shelf leads to the technique sheets, each with its key points and video", async () => {
  await page.goto(`${BASE}/fr/programs`);
  await page.getByRole("button", { name: /^Natation/ }).click();
  const dialog = page.getByRole("dialog");
  for (const name of ["Apprendre le crawl en 8 semaines", "Natation forme", "Vers 1 500 m et 2 km de crawl", "Prépa triathlon et eau libre"]) {
    await dialog.getByText(name).first().waitFor({ timeout: 5000 });
  }
  await dialog.getByRole("link", { name: /Techniques de nage/ }).click();
  await page.waitForURL(/\/fr\/swim-techniques$/, { timeout: 10000 });
  await page.getByRole("heading", { name: "Les nages" }).waitFor({ timeout: 10000 });
  await page.getByRole("button", { name: /^Crawl/ }).click();
  const sheet = page.getByRole("dialog");
  await sheet.getByText("Points clés").waitFor({ timeout: 5000 });
  await sheet.getByText("Erreurs fréquentes").waitFor({ timeout: 5000 });
  // The video waits behind its thumbnail until tapped.
  expect((await sheet.getByRole("button", { name: "Voir la vidéo" }).count()) === 1, "no video on the crawl sheet");
  await page.keyboard.press("Escape");
});

await test("hiking: its shelf, its place among the sports, and the metres climbed on an outing", async () => {
  await page.goto(`${BASE}/fr/programs`);
  await page.getByRole("button", { name: /^Randonnée/ }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByText("Préparer un trek de plusieurs jours").waitFor({ timeout: 5000 });
  await dialog.getByText("Randonnée en montagne").waitFor({ timeout: 5000 });
  await page.keyboard.press("Escape");
  await page.goto(`${BASE}/fr/settings?section=sport`);
  await page.getByRole("button", { name: "Randonnée", exact: true }).first().waitFor({ timeout: 10000 });
  // An outing on foot: the metres climbed are asked, and kept.
  const id = await page.evaluate(async (user) => {
    const db = await new Promise((res, rej) => { const r = indexedDB.open("TrainTrack"); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    const now = new Date().toISOString();
    const d = new Date();
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const out = await new Promise((res, rej) => { const tx = db.transaction("workouts", "readwrite"); const r = tx.objectStore("workouts").add({ userId: user, uuid: `e2e-hike-${Date.now()}`, date, title: "Randonnée", kind: "cardio", sport: "hike", _dirty: 0, createdAt: now, updatedAt: now }); tx.oncomplete = () => res(r.result); tx.onerror = () => rej(tx.error); });
    db.close();
    return out;
  }, USER);
  await page.goto(`${BASE}/fr/log/session?id=${id}`);
  const climb = page.getByLabel("Dénivelé positif (m)");
  await climb.waitFor({ timeout: 10000 });
  await climb.fill("650");
  await climb.blur();
  await page.waitForTimeout(800);
  await page.reload();
  await climb.waitFor({ timeout: 10000 });
  expect((await climb.inputValue()) === "650", `the metres climbed were not kept: "${await climb.inputValue()}"`);
});

await test("the pre-departure checklist: ticked items are kept, a night out on one's own adds its own", async () => {
  await page.goto(`${BASE}/fr/outing-checklist`);
  const route = page.getByLabel("Itinéraire et heure de retour prévue laissés à un proche");
  await route.waitFor({ timeout: 10000 });
  const total = async () => Number((await page.getByText(/^\d+\/\d+ prêts$/).innerText()).split("/")[1].split(" ")[0]);
  const before = await total();
  expect(!(await page.getByText("Un abri pour la nuit", { exact: false }).count()), "the shelter is asked for a day out");
  await route.check();
  await page.getByLabel(/Sortie en autonomie, nuit dehors/).check();
  await page.getByText("Un abri pour la nuit", { exact: false }).waitFor({ timeout: 5000 });
  expect((await total()) > before, "a night out adds nothing");
  await page.reload();
  await route.waitFor({ timeout: 10000 });
  expect(await route.isChecked(), "the ticked item was not kept");
  expect(await page.getByLabel(/Sortie en autonomie, nuit dehors/).isChecked(), "the night-out choice was not kept");
  await page.getByRole("button", { name: "Tout décocher" }).click();
});

await test("progress shows a hike's metres climbed and its longest outing", async () => {
  await page.evaluate(async (user) => {
    const db = await new Promise((res, rej) => { const r = indexedDB.open("TrainTrack"); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    const now = new Date().toISOString();
    const d = new Date();
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    await new Promise((res, rej) => { const tx = db.transaction("workouts", "readwrite"); tx.objectStore("workouts").add({ userId: user, uuid: `e2e-hike-done-${Date.now()}`, date, title: "Randonnée", kind: "cardio", sport: "hike", distanceM: 12000, durationSec: 4 * 3600, elevationGainM: 650, _dirty: 0, createdAt: now, updatedAt: now }); tx.oncomplete = res; tx.onerror = () => rej(tx.error); });
    db.close();
  }, USER);
  await page.goto(`${BASE}/fr/progress`);
  const card = page.locator("div", { hasText: /^Randonnée · / }).first();
  await page.getByText("Plus gros dénivelé").first().waitFor({ timeout: 10000 });
  await page.getByText("+650 m").first().waitFor({ timeout: 5000 });
  await page.getByText("Plus longue sortie").first().waitFor({ timeout: 5000 });
  void card;
});

await test("the load over months, by discipline, in one unit", async () => {
  await page.goto(`${BASE}/fr/progress`);
  await page.getByText("Charge par discipline").first().click();
  const card = page.getByText("Part de chaque discipline, 4 dernières semaines").locator("..").locator("..");
  await card.waitFor({ timeout: 10000 });
  expect((await card.locator("li").count()) > 0, "no discipline listed");
  await page.getByRole("img", { name: /Charge d’entraînement par semaine sur 12 semaines/ }).waitFor({ timeout: 5000 });
  await card.locator("..").getByRole("button", { name: "26 semaines" }).click();
  await page.getByRole("img", { name: /sur 26 semaines/ }).waitFor({ timeout: 5000 });
  await page.getByRole("img", { name: /sur 26 semaines/ }).screenshot({ path: join(ARTIFACTS, "load-history.png") });
  await card.locator("..").screenshot({ path: join(ARTIFACTS, "load-history-card.png") });
});

await test("a watch file (TCX) fills a ride with its power, placed in the FTP's zones; a pool swim gets its SWOLF", async () => {
  const add = (sport, title) =>
    page.evaluate(async ({ user, sport, title }) => {
      const db = await new Promise((res, rej) => { const r = indexedDB.open("TrainTrack"); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
      const now = new Date().toISOString();
      const d = new Date();
      const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const out = await new Promise((res, rej) => { const tx = db.transaction("workouts", "readwrite"); const r = tx.objectStore("workouts").add({ userId: user, uuid: `e2e-${sport}-${Date.now()}`, date, title, kind: "cardio", sport, _dirty: 0, createdAt: now, updatedAt: now }); tx.oncomplete = () => res(r.result); tx.onerror = () => rej(tx.error); });
      db.close();
      return out;
    }, { user: USER, sport, title });
  const tp = (alt, w, cad) => `<Trackpoint><AltitudeMeters>${alt}</AltitudeMeters><Cadence>${cad}</Cadence><Extensions><ns3:TPX><ns3:Watts>${w}</ns3:Watts></ns3:TPX></Extensions></Trackpoint>`;
  const tcx = `<?xml version="1.0"?><TrainingCenterDatabase><Activities><Activity Sport="Biking"><Id>2026-11-20T08:00:00Z</Id><Lap StartTime="x"><TotalTimeSeconds>3600</TotalTimeSeconds><DistanceMeters>30000</DistanceMeters><AverageHeartRateBpm><Value>140</Value></AverageHeartRateBpm><MaximumHeartRateBpm><Value>165</Value></MaximumHeartRateBpm><Track>${tp(100, 180, 88)}${tp(140, 220, 92)}</Track></Lap></Activity></Activities></TrainingCenterDatabase>`;
  const ride = await add("bike", "Vélo");
  await page.goto(`${BASE}/fr/log/session?id=${ride}`);
  await page.getByRole("button", { name: /Remplir depuis un fichier de montre/ }).waitFor({ timeout: 10000 });
  await page.locator('input[type="file"][accept*=".tcx"]').first().setInputFiles({ name: "ride.tcx", mimeType: "application/xml", buffer: Buffer.from(tcx) });
  const dialog = page.getByRole("dialog");
  await dialog.getByText("Puissance moy. · max").waitFor({ timeout: 5000 });
  await dialog.getByRole("button", { name: "Remplir la séance" }).click();
  await dialog.waitFor({ state: "detached", timeout: 10000 });
  // The fields take the file's figures once the session is saved.
  const valueOf = (label) => page.getByLabel(label).inputValue();
  for (let i = 0; i < 50 && (await valueOf("Puissance moyenne")) !== "200"; i++) await page.waitForTimeout(100);
  expect((await valueOf("Puissance moyenne")) === "200", `power not filled: ${await valueOf("Puissance moyenne")}`);
  expect((await valueOf("Cadence moyenne")) === "90", "cadence not filled");
  await page.getByLabel("Ma FTP").fill("250");
  await page.getByLabel("Ma FTP").blur();
  await page.getByText(/Zone 3 \(tempo\) · IF 0,80? · TSS estimé 64/).waitFor({ timeout: 5000 });

  const swim = await add("swim", "Natation");
  await page.goto(`${BASE}/fr/log/session?id=${swim}`);
  await page.getByLabel("Distance (m)").fill("1000");
  await page.getByLabel("Minutes").fill("20");
  await page.getByLabel("Minutes").blur();
  await page.getByRole("button", { name: "Crawl", exact: true }).click();
  await page.getByRole("button", { name: "25 m", exact: true }).click();
  // The strokes per length wait under "More details" (the registry's advanced fields).
  await page.getByText("Plus de détails").first().click();
  await page.getByLabel("Mouvements de bras").fill("16");
  await page.getByLabel("Mouvements de bras").blur();
  await page.getByText(/40 longueurs · SWOLF 46/).waitFor({ timeout: 5000 });

  // A FIT file of a pool swim (as a Garmin writes it): pool, stroke and strokes come with it.
  const enc = new Encoder();
  const at = new Date("2026-11-20T07:00:00Z");
  enc.onMesg(Profile.MesgNum.FILE_ID, { type: "activity", manufacturer: "garmin", product: 0, timeCreated: at, serialNumber: 1 });
  enc.onMesg(Profile.MesgNum.SESSION, { startTime: at, timestamp: at, sport: "swimming", subSport: "lapSwimming", totalTimerTime: 1500, totalDistance: 1500, poolLength: 25, avgStrokeCount: 18, swimStroke: "breaststroke" });
  const fit = enc.close();
  const pool = await add("swim", "Natation FIT");
  await page.goto(`${BASE}/fr/log/session?id=${pool}`);
  await page.locator('input[type="file"][accept*=".fit"]').first().setInputFiles({ name: "swim.fit", mimeType: "application/octet-stream", buffer: Buffer.from(fit) });
  const fitDialog = page.getByRole("dialog");
  await fitDialog.getByRole("button", { name: "Remplir la séance" }).click();
  await fitDialog.waitFor({ state: "detached", timeout: 10000 });
  await page.getByRole("button", { name: "Brasse", pressed: true }).waitFor({ timeout: 5000 });
  await page.getByRole("button", { name: "25 m", pressed: true }).waitFor({ timeout: 5000 });
  // 60 lengths in 25 min: 25 s a length + 18 strokes.
  await page.getByText(/60 longueurs · SWOLF 43/).waitFor({ timeout: 5000 });
});

await test("the assistant explains a proposal from the sessions done, and applies it only when asked", async () => {
  // A program whose push-ups were left out in 2 of its last 3 sessions.
  const programId = await page.evaluate(async (user) => {
    const db = await new Promise((res, rej) => { const r = indexedDB.open("TrainTrack"); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    const all = (store) => new Promise((res) => { const r = db.transaction(store).objectStore(store).getAll(); r.onsuccess = () => res(r.result); });
    const add = (store, row) => new Promise((res, rej) => { const tx = db.transaction(store, "readwrite"); const r = tx.objectStore(store).add(row); tx.oncomplete = () => res(r.result); tx.onerror = () => rej(tx.error); });
    const lib = await all("exercises");
    const id = (name) => lib.find((e) => e.name === name && !e.isCustom).id;
    const now = new Date().toISOString();
    const day = { key: "e2e-a", name: "Jour A", exercises: [
      { exerciseName: "Back Squat", targetSets: 3, targetReps: "8-10", restSec: 120 },
      { exerciseName: "Push-up", targetSets: 3, targetReps: "10-15", restSec: 60 },
    ] };
    const pid = await add("programs", { userId: user, ownerUserId: user, uuid: `e2e-coach-${Date.now()}`, name: "Programme assistant", structure: [day], _dirty: 0, createdAt: now, updatedAt: now });
    const dates = [12, 8, 4].map((n) => { const d = new Date(Date.now() - n * 86400000); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; });
    for (const [i, date] of dates.entries()) {
      const wid = await add("workouts", { userId: user, uuid: `e2e-coach-w${i}-${Date.now()}`, date, title: "Programme assistant — Jour A", kind: "strength", programId: pid, programDayIndex: 0, plannedDay: day, _dirty: 0, createdAt: now, updatedAt: now });
      const done = [["Back Squat", [8, 8, 8]], ...(i === 0 ? [["Push-up", [12, 12, 12]]] : [])];
      for (const [name, reps] of done) for (const [n, r] of reps.entries()) await add("workoutSets", { userId: user, uuid: `e2e-coach-s${i}-${name}-${n}-${Date.now()}`, workoutId: wid, exerciseId: id(name), setNumber: n + 1, reps: r, weightKg: name === "Back Squat" ? 60 : undefined, completed: true, _dirty: 0, createdAt: now, updatedAt: now });
    }
    db.close();
    return pid;
  }, USER);
  await page.goto(`${BASE}/fr/assistant`);
  const card = page.getByRole("article", { name: "Un exercice souvent laissé de côté" }).filter({ hasText: "Programme assistant" });
  await card.first().waitFor({ timeout: 10000 });
  const found = await card.allInnerTexts();
  expect(found.length === 1, `more than one proposal: ${JSON.stringify(found)}`);
  await card.getByText(/pas fait lors de 2 des 3 dernières séances/).waitFor({ timeout: 5000 });
  await card.getByText(/Proposition :/).waitFor({ timeout: 5000 });
  // The AI is optional: without a key it offers to add one, and sends nothing.
  const ask = page.locator("section", { has: page.locator("#ask-coach") });
  await ask.getByRole("link", { name: "L’ajouter dans les Réglages" }).waitFor({ timeout: 5000 });
  expect(!(await ask.getByRole("textbox").count()), "a question box without a key");
  // Nothing changed before "Apply".
  const pushUps = () => page.evaluate(async (id) => {
    const db = await new Promise((res) => { const r = indexedDB.open("TrainTrack"); r.onsuccess = () => res(r.result); });
    const p = await new Promise((res) => { const r = db.transaction("programs").objectStore("programs").get(id); r.onsuccess = () => res(r.result); });
    db.close();
    return p.structure[0].exercises.some((e) => e.exerciseName === "Push-up");
  }, programId);
  expect(await pushUps(), "the program changed before Apply");
  await card.getByRole("button", { name: "Appliquer" }).click();
  await page.getByText(/Appliqué\. La version d’avant reste/).waitFor({ timeout: 5000 });
  expect(!(await pushUps()), "the push-ups are still in the program");
  await page.getByRole("link", { name: "Voir le programme" }).click();
  await page.getByText(/Historique des modifications \(1\)/).waitFor({ timeout: 10000 });
});

await test("the AI asks for the athlete's agreement before anything is sent", async () => {
  const sent = [];
  const watch = (req) => { if (req.url().includes("api.anthropic.com")) sent.push(req.url()); };
  page.on("request", watch);
  await page.goto(`${BASE}/fr/assistant`);
  await page.evaluate(() => { localStorage.setItem("traintrack.anthropicApiKey", "sk-ant-e2e-not-a-key"); localStorage.removeItem("traintrack.aiConsent"); });
  await page.reload();
  const ask = page.locator("section", { has: page.locator("#ask-coach") });
  await ask.getByText("Votre accord avant d'utiliser l'IA").waitFor({ timeout: 10000 });
  await ask.getByText(/des données de santé/).waitFor({ timeout: 5000 });
  expect(!(await ask.getByRole("textbox").count()), "a question box before the agreement");
  await ask.getByRole("button", { name: "J'accepte" }).click();
  await ask.getByRole("textbox").waitFor({ timeout: 5000 });
  expect(sent.length === 0, `sent before any question: ${sent.join(", ")}`);
  // Withdrawn from Settings, it is asked again.
  await page.goto(`${BASE}/fr/settings?section=ai`);
  await page.getByRole("button", { name: "Retirer mon accord" }).click();
  await page.getByText(/Accord retiré/).waitFor({ timeout: 5000 });
  expect(await page.evaluate(() => localStorage.getItem("traintrack.aiConsent")) === null, "the agreement is still stored");
  await page.evaluate(() => localStorage.removeItem("traintrack.anthropicApiKey"));
  page.off("request", watch);
});

await test("a coach's program is followed as it is: nothing on it can be changed by the client", async () => {
  const pid = await page.evaluate(async (user) => {
    const db = await new Promise((res, rej) => { const r = indexedDB.open("TrainTrack"); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    const add = (store, row) => new Promise((res, rej) => { const tx = db.transaction(store, "readwrite"); const r = tx.objectStore(store).add(row); tx.oncomplete = () => res(r.result); tx.onerror = () => rej(tx.error); });
    const now = new Date().toISOString();
    const coach = "00000000-0000-4000-8000-00000000c0ac";
    const day = { key: "e2e-c", name: "Jour coach", exercises: [{ exerciseName: "Back Squat", targetSets: 3, targetReps: "5", restSec: 120 }] };
    const id = await add("programs", { userId: coach, ownerUserId: coach, assignedToUserId: user, uuid: `e2e-coachprog-${Date.now()}`, name: "Plan du coach", structure: [day], _dirty: 0, createdAt: now, updatedAt: now });
    db.close();
    return id;
  }, USER);
  await page.goto(`${BASE}/fr/programs/${pid}`);
  await page.getByText("Proposé par votre coach").waitFor({ timeout: 10000 });
  expect(!(await page.getByRole("button", { name: /favori/i }).count()), "a favourite star on a coach's program");
  expect(!(await page.getByRole("button", { name: "Archiver" }).count()), "an archive button on a coach's program");
  expect(!(await page.getByRole("button", { name: "Modifier" }).count()), "an edit button on a coach's program");
  await page.getByRole("button", { name: "Dupliquer" }).waitFor({ timeout: 5000 });
  // Its editor, opened by its address, sends back to the program.
  await page.goto(`${BASE}/fr/programs/${pid}/edit`);
  await page.waitForURL(new RegExp(`/fr/programs/${pid}$`), { timeout: 10000 });
  const dirty = await page.evaluate(async (id) => {
    const db = await new Promise((res) => { const r = indexedDB.open("TrainTrack"); r.onsuccess = () => res(r.result); });
    const p = await new Promise((res) => { const r = db.transaction("programs").objectStore("programs").get(id); r.onsuccess = () => res(r.result); });
    db.close();
    return p._dirty;
  }, pid);
  expect(dirty === 0, "the coach's program was changed on the client's device");
});

await test("a program is created in three answers, then filled in a compact editor", async () => {
  await page.goto(`${BASE}/fr/programs`);
  await page.getByRole("button", { name: "Nouveau programme" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nom").fill("Natation e2e");
  await dialog.getByRole("button", { name: "Natation" }).click();
  await dialog.getByRole("button", { name: "4 jours par semaine" }).click();
  await dialog.getByRole("button", { name: "Créer et remplir les séances" }).click();
  await page.waitForURL(/\/fr\/programs\/\d+\/edit$/, { timeout: 10000 });
  await page.getByLabel("Nom du jour").nth(3).waitFor({ timeout: 10000 });
  expect((await page.getByLabel("Nom du jour").count()) === 4, "not 4 days");
  expect((await page.getByRole("combobox", { name: "Sport" }).first().inputValue()) === "swim", "not swimming days");
  // Distance and time first; intensity and the rest under "More details".
  expect(!(await page.getByLabel("Intensité").first().isVisible()), "intensity shown before More details");
  await page.getByText("Plus de détails").first().click();
  await page.getByLabel("Intensité").first().waitFor({ timeout: 5000 });

  // A strength program: an exercise is one line, opened to change it.
  await page.goto(`${BASE}/fr/programs`);
  await page.getByRole("button", { name: "Nouveau programme" }).click();
  await dialog.getByLabel("Nom").fill("Force e2e");
  await dialog.getByRole("button", { name: "1 jour par semaine" }).click();
  await dialog.getByRole("button", { name: "Créer et remplir les séances" }).click();
  await page.waitForURL(/\/fr\/programs\/\d+\/edit$/, { timeout: 10000 });
  await page.getByRole("button", { name: "Ajouter un exercice" }).click();
  await page.getByRole("dialog").getByPlaceholder(/Chercher un exercice/).fill("push");
  await page.getByRole("dialog").getByText("Pompes", { exact: true }).click();
  const row = page.getByRole("button", { name: "Modifier Pompes" });
  await row.getByText("3 × 8-12 · 90 s de repos").waitFor({ timeout: 5000 });
  await page.getByLabel("Séries").waitFor({ timeout: 5000 });
  await row.click();
  await page.getByLabel("Séries").waitFor({ state: "detached", timeout: 5000 });
});

await test("Settings opens in four groups, and the menu opens it on the section asked", async () => {
  await page.goto(`${BASE}/fr/settings`);
  await page.getByRole("button", { name: /Données et compte/ }).waitFor({ timeout: 10000 });
  expect(!(await page.getByText("Niveau d'entraînement").count()), "a group open by default");
  await page.getByRole("button", { name: /^Entraînement/ }).click();
  await page.getByText("Niveau d'entraînement").waitFor({ timeout: 5000 });
  await page.goto(`${BASE}/fr/settings?section=import`);
  await page.getByText("Importer mon historique (Strong, Hevy)").waitFor({ timeout: 10000 });
  expect((await page.getByRole("button", { name: /Données et compte/ }).getAttribute("aria-expanded")) === "true", "the data group is closed");
});

await test("an injury is declared from the Health page, not only in Settings", async () => {
  await page.goto(`${BASE}/fr/health`);
  await page.getByRole("button", { name: "Déclarer ou mettre à jour une blessure" }).click();
  const dialog = page.getByRole("dialog");
  const knee = dialog.getByRole("button", { name: /^Genou/ });
  await knee.click();
  await dialog.getByRole("button", { name: /^Genou/, pressed: true }).waitFor({ timeout: 5000 });
  // Healed, then gone: as it was.
  await knee.click();
  await knee.click();
  await dialog.getByRole("button", { name: /^Genou/, pressed: false }).waitFor({ timeout: 5000 });
  await dialog.getByRole("button", { name: "Terminé" }).click();
});

await test("a ride asks distance, time and power first; the rest waits under More details", async () => {
  const id = await page.evaluate(async (user) => {
    const db = await new Promise((res, rej) => { const r = indexedDB.open("TrainTrack"); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    const add = (store, row) => new Promise((res, rej) => { const tx = db.transaction(store, "readwrite"); const r = tx.objectStore(store).add(row); tx.oncomplete = () => res(r.result); tx.onerror = () => rej(tx.error); });
    const now = new Date().toISOString();
    const d = new Date();
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const wid = await add("workouts", { userId: user, uuid: `e2e-ride-${Date.now()}`, date, kind: "cardio", sport: "bike", title: "Vélo e2e", _dirty: 0, createdAt: now, updatedAt: now });
    db.close();
    return wid;
  }, USER);
  await page.goto(`${BASE}/fr/log/session?id=${id}`);
  await page.getByLabel("Puissance moyenne").waitFor({ timeout: 10000 });
  expect(!(await page.getByLabel("Puissance max").isVisible()), "max power shown before More details");
  await page.getByText("Plus de détails").first().click();
  await page.getByLabel("Puissance max").waitFor({ timeout: 5000 });

  // When it started and what it was for: optional, kept with the session.
  await page.getByRole("button", { name: "Modifier la séance" }).click();
  await page.getByText("Plus de détails").first().click();
  await page.getByLabel("Heure de début").fill("07:30");
  await page.getByLabel("Objectif de la séance").fill("Travail au seuil");
  await page.getByRole("button", { name: "Enregistrer" }).first().click();
  const saved = await page.evaluate(async (wid) => {
    const db = await new Promise((res) => { const r = indexedDB.open("TrainTrack"); r.onsuccess = () => res(r.result); });
    const w = await new Promise((res) => { const r = db.transaction("workouts").objectStore("workouts").get(wid); r.onsuccess = () => res(r.result); });
    db.close();
    return { time: w.startTime, goal: w.sessionGoal };
  }, id);
  expect(saved.time === "07:30" && saved.goal === "Travail au seuil", `saved ${JSON.stringify(saved)}`);
});

await test("the sport chosen goes with the profile, so other devices follow", async () => {
  await page.goto(`${BASE}/fr/settings?section=sport`);
  await page.getByRole("button", { name: "Tous les sports", exact: true }).click();
  const stored = await page.evaluate(async () => {
    const db = await new Promise((res) => { const r = indexedDB.open("TrainTrack"); r.onsuccess = () => res(r.result); });
    const all = await new Promise((res) => { const r = db.transaction("athleteProfiles").objectStore("athleteProfiles").getAll(); r.onsuccess = () => res(r.result); });
    db.close();
    return all.map((p) => p.favoriteSport);
  });
  expect(stored.length > 0 && stored.every((v) => v === "all"), `profile ${JSON.stringify(stored)}`);
  // Another device's choice reaches this one through the profile.
  await page.evaluate(async () => {
    const db = await new Promise((res) => { const r = indexedDB.open("TrainTrack"); r.onsuccess = () => res(r.result); });
    const tx = db.transaction("athleteProfiles", "readwrite");
    const st = tx.objectStore("athleteProfiles");
    const all = await new Promise((res) => { const r = st.getAll(); r.onsuccess = () => res(r.result); });
    for (const row of all) st.put({ ...row, favoriteSport: "swimming", secondSport: null });
    await new Promise((res) => { tx.oncomplete = res; });
    db.close();
  });
  await page.goto(`${BASE}/fr`);
  await page.waitForFunction(() => JSON.parse(localStorage.getItem("traintrack.prefs") || "{}").sport === "swimming", null, { timeout: 10000 });
  await setSportChoice(null);
});

await test("a goal of any sport: 10 km under 50 min, followed in Progress and on the home screen", async () => {
  await page.goto(`${BASE}/fr/progress`);
  await page.getByRole("button", { name: "Nouvel objectif" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Temps sur une distance" }).click();
  await dialog.getByRole("button", { name: "Course à pied" }).click();
  await dialog.getByLabel("Distance (km)").fill("10");
  await dialog.getByLabel("Temps visé").fill("50:00");
  await dialog.getByRole("button", { name: "Enregistrer l'objectif" }).click();
  await dialog.waitFor({ state: "detached", timeout: 5000 });
  await page.getByText("Course à pied : 10 km").first().waitFor({ timeout: 5000 });
  await page.getByText("Objectif : moins de 50:00").first().waitFor({ timeout: 5000 });
  // The first goal is the main one: on the home screen, with where it stands.
  await page.goto(`${BASE}/fr`);
  const line = page.getByRole("link", { name: /Course à pied : 10 km · 50:00/ });
  await line.waitFor({ timeout: 10000 });
  // A 10 km in 49 min: reached.
  await page.evaluate(async (user) => {
    const db = await new Promise((res, rej) => { const r = indexedDB.open("TrainTrack"); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    const now = new Date().toISOString();
    const d = new Date();
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    await new Promise((res, rej) => { const tx = db.transaction("workouts", "readwrite"); tx.objectStore("workouts").add({ userId: user, uuid: `e2e-10k-${Date.now()}`, date, kind: "cardio", sport: "run", title: "10 km e2e", distanceM: 10000, durationSec: 49 * 60, _dirty: 0, createdAt: now, updatedAt: now }); tx.oncomplete = res; tx.onerror = () => rej(tx.error); });
    db.close();
  }, USER);
  await page.reload();
  await page.getByRole("link", { name: /Course à pied : 10 km · 50:00.*Atteint le/ }).waitFor({ timeout: 10000 });
  // The last session done, one line.
  await page.locator("details", { hasText: "À voir aussi" }).locator("summary").click();
  await page.getByText(/Dernière séance :/).waitFor({ timeout: 5000 });
  // Cleaned up: the goal deleted from Progress.
  await page.goto(`${BASE}/fr/progress`);
  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Supprimer l'objectif" }).first().click();
  await page.getByText("Course à pied : 10 km").waitFor({ state: "detached", timeout: 5000 });
});

await test("a movement ruled out is flagged, and its exercise replaced only when asked", async () => {
  // "No arms overhead", from Settings.
  await page.goto(`${BASE}/fr/settings?section=restrictions`);
  await page.getByRole("button", { name: "Ajouter une restriction" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Bras au-dessus de la tête" }).click();
  await dialog.getByRole("button", { name: "Enregistrer" }).click();
  await dialog.waitFor({ state: "detached", timeout: 5000 });
  await page.getByText(/Bras au-dessus de la tête · À éviter/).waitFor({ timeout: 5000 });

  // A session with an overhead press: a replacement is proposed, nothing changed before the tap.
  const wid = await page.evaluate(async (user) => {
    const db = await new Promise((res, rej) => { const r = indexedDB.open("TrainTrack"); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    const all = (store) => new Promise((res) => { const r = db.transaction(store).objectStore(store).getAll(); r.onsuccess = () => res(r.result); });
    const add = (store, row) => new Promise((res, rej) => { const tx = db.transaction(store, "readwrite"); const r = tx.objectStore(store).add(row); tx.oncomplete = () => res(r.result); tx.onerror = () => rej(tx.error); });
    const ohp = (await all("exercises")).find((e) => e.name === "Overhead Press" && !e.isCustom);
    const now = new Date().toISOString();
    const d = new Date();
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const w = await add("workouts", { userId: user, uuid: `e2e-ohp-${Date.now()}`, date, kind: "strength", title: "Épaules e2e", _dirty: 0, createdAt: now, updatedAt: now });
    for (const n of [1, 2, 3]) await add("workoutSets", { userId: user, uuid: `e2e-ohp-s${n}-${Date.now()}`, workoutId: w, exerciseId: ohp.id, setNumber: n, reps: 8, completed: false, _dirty: 0, createdAt: now, updatedAt: now });
    db.close();
    return w;
  }, USER);
  await page.goto(`${BASE}/fr/log/session?id=${wid}`);
  const banner = page.locator("section", { has: page.locator("#to-adapt") });
  await banner.waitFor({ timeout: 10000 });
  await page.getByText(/Exclu par vos restrictions \(bras au-dessus de la tête\)/).first().waitFor({ timeout: 5000 });
  const replace = banner.getByRole("button", { name: /^Remplacer Développé militaire par / });
  const label = await replace.innerText();
  await replace.click();
  await banner.waitFor({ state: "detached", timeout: 5000 });
  const to = label.replace(/^Remplacer Développé militaire par /, "").trim();
  await page.getByText(to, { exact: true }).first().waitFor({ timeout: 5000 });

  // Removed again: as before.
  await page.goto(`${BASE}/fr/settings?section=restrictions`);
  await page.getByRole("button", { name: /Retirer la restriction/ }).click();
  await page.getByText("Aucune restriction.").waitFor({ timeout: 5000 });
});

await test("the body's signals sit beside the check-in, against one's usual values", async () => {
  const today = new Date();
  const dayOf = (n) => { const d = new Date(today.getTime() - n * 86400000); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
  const rows = [[20, 52, 70], [16, 51, 72], [12, 53, 69], [8, 52, 71], [4, 52, 70], [0, 59, 55]].map(([n, rhr, hrv]) => ({ date: dayOf(n), restingHr: rhr, hrv }));
  const ids = await page.evaluate(async ({ user, rows }) => {
    const db = await new Promise((res, rej) => { const r = indexedDB.open("TrainTrack"); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    const now = new Date().toISOString();
    const out = [];
    for (const [i, row] of rows.entries()) {
      out.push(await new Promise((res, rej) => { const tx = db.transaction("healthMetrics", "readwrite"); const r = tx.objectStore("healthMetrics").add({ ...row, userId: user, uuid: `e2e-hm-${i}-${Date.now()}`, _dirty: 0, createdAt: now, updatedAt: now }); tx.oncomplete = () => res(r.result); tx.onerror = () => rej(tx.error); }));
    }
    db.close();
    return out;
  }, { user: USER, rows });
  try {
    await page.goto(`${BASE}/fr/readiness`);
    const card = page.locator("section", { has: page.locator("#body-signals") });
    await card.waitFor({ timeout: 10000 });
    await card.getByText(/59 bpm, contre 52 d'habitude \(\+7\)/).waitFor({ timeout: 5000 });
    await card.getByText(/55 ms, contre 70 d'habitude \(-22 %\)/).waitFor({ timeout: 5000 });
    await card.getByText(/Ce n'est pas un avis médical/).waitFor({ timeout: 5000 });
    await page.getByRole("heading", { name: "Votre forme sur 4 semaines" }).waitFor({ timeout: 5000 });
  } finally {
    await page.evaluate(async (ids) => {
      const db = await new Promise((res) => { const r = indexedDB.open("TrainTrack"); r.onsuccess = () => res(r.result); });
      await new Promise((res) => { const tx = db.transaction("healthMetrics", "readwrite"); for (const id of ids) tx.objectStore("healthMetrics").delete(id); tx.oncomplete = res; });
      db.close();
    }, ids);
  }
});

await test("Progress draws the pace of each outing over six months", async () => {
  await page.goto(`${BASE}/fr/progress`);
  const fold = page.getByText("Allure et puissance sur six mois");
  await fold.waitFor({ timeout: 10000 });
  await fold.click();
  await page.getByRole("img", { name: /Allure \(\/km\).*séances sur six mois/ }).or(page.getByText(/Il faut au moins trois sorties/)).first().waitFor({ timeout: 5000 });
});

await test("a watch file already imported is not logged a second time", async () => {
  const add = (title) =>
    page.evaluate(async ({ user, title }) => {
      const db = await new Promise((res, rej) => { const r = indexedDB.open("TrainTrack"); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
      const now = new Date().toISOString();
      const d = new Date();
      const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const out = await new Promise((res, rej) => { const tx = db.transaction("workouts", "readwrite"); const r = tx.objectStore("workouts").add({ userId: user, uuid: `e2e-dup-${Date.now()}-${Math.random()}`, date, title, kind: "cardio", sport: "run", _dirty: 0, createdAt: now, updatedAt: now }); tx.oncomplete = () => res(r.result); tx.onerror = () => rej(tx.error); });
      db.close();
      return out;
    }, { user: USER, title });
  const tcx = `<?xml version="1.0"?><TrainingCenterDatabase><Activities><Activity Sport="Running"><Id>2026-11-19T06:30:00Z</Id><Lap StartTime="x"><TotalTimeSeconds>2700</TotalTimeSeconds><DistanceMeters>9000</DistanceMeters></Lap></Activity></Activities></TrainingCenterDatabase>`;
  const load = async (id) => {
    await page.goto(`${BASE}/fr/log/session?id=${id}`);
    await page.getByRole("button", { name: /Remplir depuis un fichier de montre/ }).waitFor({ timeout: 10000 });
    await page.locator('input[type="file"][accept*=".tcx"]').first().setInputFiles({ name: "run.tcx", mimeType: "application/xml", buffer: Buffer.from(tcx) });
    return page.getByRole("dialog");
  };
  const first = await add("Footing e2e");
  let dialog = await load(first);
  await dialog.getByRole("button", { name: "Remplir la séance" }).click();
  await dialog.waitFor({ state: "detached", timeout: 10000 });
  // The same file into another session: refused, with the way to the first.
  const second = await add("Autre footing e2e");
  dialog = await load(second);
  await dialog.getByText(/Ce fichier est déjà importé : séance du .* \(« Footing e2e »\)/).waitFor({ timeout: 5000 });
  expect(await dialog.getByRole("button", { name: "Remplir la séance" }).isDisabled(), "the duplicate can still be saved");
  await dialog.getByRole("link", { name: "Ouvrir cette séance" }).click();
  await page.waitForURL(new RegExp(`id=${first}$`), { timeout: 10000 });
});

await test("an exercise's card gives its key points and usual faults in one's language", async () => {
  await page.goto(`${BASE}/fr/exercises`);
  await page.getByPlaceholder(/Rechercher/).fill("soulevé de terre");
  await page.getByRole("button", { name: /^Soulevé de terre$/ }).first().click();
  await page.getByText("Points clés").first().waitFor({ timeout: 5000 });
  await page.getByText("Erreurs fréquentes").first().waitFor({ timeout: 5000 });
  await page.getByText("Placer la barre au-dessus du milieu des pieds").waitFor({ timeout: 5000 });
});

await test("the body map: muscles chosen or ruled out filter the library, and a session shows the muscles it works", async () => {
  await page.goto(`${BASE}/fr/exercises`);
  await page.getByRole("button", { name: "Filtrer par muscle" }).click();
  const list = page.getByRole("group", { name: "Filtrer par muscle" });
  // The hamstrings, chosen from the list: the leg curl mainly, never the leg extension.
  await list.getByRole("button", { name: "Ischio-jambiers : non choisi" }).click();
  await list.getByRole("button", { name: "Ischio-jambiers : choisi" }).waitFor({ timeout: 5000 });
  const curl = page.getByRole("button", { name: /^Leg curl\s*Principal$/ });
  await curl.waitFor({ timeout: 5000 });
  expect(!(await page.getByRole("button", { name: /^Leg extension/ }).count()), "the leg extension came up for the hamstrings");
  await snap("body-map-filter");
  // The quads, tapped on the body: the squat now heads the list (hamstrings and quads both).
  await page.locator('g[data-muscle="quads"] path').first().click();
  await list.getByRole("button", { name: "Quadriceps : choisi" }).waitFor({ timeout: 5000 });
  // The hamstrings ruled out with a second tap: the leg curl goes.
  await list.getByRole("button", { name: "Ischio-jambiers : choisi" }).click();
  await list.getByRole("button", { name: "Ischio-jambiers : exclu" }).waitFor({ timeout: 5000 });
  await page.getByRole("button", { name: /^Leg extension\s*Principal$/ }).waitFor({ timeout: 5000 });
  expect(!(await page.getByRole("button", { name: /^Leg curl/ }).count()), "an exercise mainly for a muscle ruled out stayed");
  await page.getByRole("button", { name: "Tout effacer" }).click();
  // Cleared: the whole library again, by group, the leg curl without a badge.
  await page.getByRole("button", { name: /^Leg curl$/ }).first().waitFor({ timeout: 5000 });
  // An exercise's card: its muscles, said and drawn.
  await page.getByPlaceholder(/Rechercher/).fill("leg curl");
  await page.getByRole("button", { name: /^Leg curl$/ }).first().click();
  await page.getByText("Ischio-jambiers", { exact: false }).first().waitFor({ timeout: 5000 });
  // A HIIT before it starts: the muscles it works, on the body.
  await page.goto(`${BASE}/fr/intervals?focus=lower`);
  await page.getByRole("button", { name: /^Muscles travaillés/ }).click();
  await page.getByRole("img", { name: /^Muscles travaillés : / }).waitFor({ timeout: 5000 });
  const said = await page.getByRole("img", { name: /^Muscles travaillés : / }).getAttribute("aria-label");
  expect(/Quadriceps|Fessiers/.test(said), `a lower-body session said ${said}`);
  await snap("body-map-hiit");
});

await test("Strava: the section in Settings, a declined return, and an imported session's link to Strava", async () => {
  await page.goto(`${BASE}/fr/settings?section=strava`);
  // Offline here: the section says so rather than offering a connection it cannot make.
  await page.getByText(/Hors ligne : l'état de la connexion Strava/).waitFor({ timeout: 10000 });
  await page.getByText(/ni votre coach ni l'assistant IA ne les reçoivent/).waitFor({ timeout: 5000 });
  await page.goto(`${BASE}/fr/strava?error=access_denied`);
  await page.getByText(/La connexion à Strava n'a pas été autorisée/).waitFor({ timeout: 10000 });
  const id = await page.evaluate(async (user) => {
    const db = await new Promise((res, rej) => { const r = indexedDB.open("TrainTrack"); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    const now = new Date().toISOString();
    const out = await new Promise((res, rej) => { const tx = db.transaction("workouts", "readwrite"); const r = tx.objectStore("workouts").add({ userId: user, uuid: `e2e-strava-${Date.now()}`, date: "2026-11-20", title: "Sortie Strava", kind: "cardio", sport: "run", distanceM: 10000, durationSec: 3000, source: "strava", externalId: "123456", _dirty: 0, createdAt: now, updatedAt: now }); tx.oncomplete = () => res(r.result); tx.onerror = () => rej(tx.error); });
    db.close();
    return out;
  }, USER);
  await page.goto(`${BASE}/fr/log/session?id=${id}`);
  const link = page.getByRole("link", { name: "Voir sur Strava" });
  await link.waitFor({ timeout: 10000 });
  expect((await link.getAttribute("href")) === "https://www.strava.com/activities/123456", "wrong Strava link");
});

await test("the home screen: the session, what matters, the week, the progress; the rest folded", async () => {
  await page.goto(`${BASE}/fr`);
  await heroCard().getByRole("button", { name: /Démarrer|Continuer/ }).waitFor({ timeout: 10000 });
  await page.locator("#week-title").waitFor({ timeout: 5000 });
  await page.getByRole("link", { name: "Planning complet" }).waitFor({ timeout: 5000 });
  // No quick-access tiles, no injury care, no load chart on the home screen: their places are elsewhere.
  expect(!(await page.getByText("Mouvements doux").count()), "the injury care is on the home screen");
  expect(!(await page.getByRole("img", { name: /Charge d’entraînement par semaine/ }).count()), "a load chart is on the home screen");
  // The other ways to train today, behind "⋯".
  await page.getByRole("button", { name: "Autres options de séance" }).click();
  await page.getByRole("menuitem", { name: "Changer de séance ou de programme" }).waitFor({ timeout: 5000 });
  await page.keyboard.press("Escape");
  await page.getByRole("menuitem").first().waitFor({ state: "detached", timeout: 5000 });
  // Nothing wider than the phone.
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), "the home screen is wider than the phone");
  // The full planning opens on its calendar.
  const full = page.getByRole("link", { name: "Planning complet" });
  await full.evaluate((el) => el.scrollIntoView({ block: "center" }));
  await full.click();
  await page.waitForURL(/\/fr\/history\?view=calendar/, { timeout: 10000 });
  await page.getByRole("grid").first().waitFor({ timeout: 10000 });
  // Each style, light and dark, on a phone and on a large screen (with E2E_SHOTS).
  if (process.env.E2E_SHOTS) {
    for (const style of ["classic", "dynamic", "soft", "contrast"]) {
      for (const mode of ["light", "dark"]) {
        await page.evaluate(({ style, mode }) => {
          const p = JSON.parse(localStorage.getItem("traintrack.prefs") || "{}");
          p.style = style;
          localStorage.setItem("traintrack.prefs", JSON.stringify(p));
          localStorage.setItem("traintrack-theme", mode);
        }, { style, mode });
        for (const [w, h, size] of [[390, 844, "phone"], [1280, 900, "desktop"]]) {
          await page.setViewportSize({ width: w, height: h });
          await page.goto(`${BASE}/fr`);
          await heroCard().waitFor({ timeout: 10000 });
          await page.waitForTimeout(400);
          await page.screenshot({ path: join(ARTIFACTS, `home-${style}-${mode}-${size}.png`), fullPage: true });
        }
      }
    }
    await page.evaluate(() => { const p = JSON.parse(localStorage.getItem("traintrack.prefs") || "{}"); p.style = "classic"; localStorage.setItem("traintrack.prefs", JSON.stringify(p)); localStorage.setItem("traintrack-theme", "light"); });
    await page.setViewportSize({ width: 390, height: 844 });
  }
});

await test("pressed for time, a run of the day has a short version too: same intensity, less time", async () => {
  await page.evaluate(async (user) => {
    const db = await new Promise((res, rej) => { const r = indexedDB.open("TrainTrack"); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    const now = new Date().toISOString();
    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const weekday = ((d.getDay() + 6) % 7) + 1;
    const day = { key: "e2e-run", name: "Sortie tempo", exercises: [], cardio: { sport: "run", distanceKm: 10, durationMin: 50, intensity: "Z3", steps: ["10 min facile", "30 min Z3", "10 min facile"] } };
    await new Promise((res, rej) => { const tx = db.transaction("programs", "readwrite"); tx.objectStore("programs").add({ userId: user, ownerUserId: user, uuid: `e2e-run-${Date.now()}`, name: "Course express e2e", structure: [day], weekdays: [weekday], startDate: today, _dirty: 0, createdAt: now, updatedAt: now }); tx.oncomplete = res; tx.onerror = () => rej(tx.error); });
    db.close();
  }, USER);
  await page.goto(`${BASE}/fr`);
  const hero = heroCard();
  const chip = hero.getByRole("group", { name: "Séances prévues ce jour-là" }).getByRole("button", { name: /Course express e2e/ });
  await chip.or(hero.getByRole("heading", { name: "Sortie tempo" })).first().waitFor({ timeout: 10000 });
  if (await chip.count()) await chip.click();
  await hero.getByRole("heading", { name: "Sortie tempo" }).waitFor({ timeout: 10000 });
  await hero.getByRole("button", { name: "Pas le temps aujourd'hui ?" }).click();
  await page.getByRole("dialog").getByRole("button", { name: /Version courte de la séance/ }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("heading", { name: "Séance express" }).waitFor({ timeout: 5000 });
  await dialog.getByRole("button", { name: "20 min" }).click();
  await dialog.getByText(/Course à pied · 4 km · 20 min · Z3/).waitFor({ timeout: 5000 });
  await dialog.getByText(/déroulé détaillé de la séance complète est laissé de côté/).waitFor({ timeout: 5000 });
  await dialog.getByRole("button", { name: "Commencer la version courte" }).click();
  await page.waitForURL(/\/fr\/log\/session\?id=\d+/, { timeout: 10000 });
  const planned = await page.evaluate(async () => {
    const id = Number(new URL(location.href).searchParams.get("id"));
    const db = await new Promise((res) => { const r = indexedDB.open("TrainTrack"); r.onsuccess = () => res(r.result); });
    const w = await new Promise((res) => { const r = db.transaction("workouts").objectStore("workouts").get(id); r.onsuccess = () => res(r.result); });
    db.close();
    return w.plannedDay?.cardio;
  });
  expect(planned?.durationMin === 20 && planned?.distanceKm === 4 && planned?.intensity === "Z3" && !planned?.steps, `planned ${JSON.stringify(planned)}`);
});

await test("a plan B chosen once is one tap away from the session card", async () => {
  await page.goto(`${BASE}/fr/settings?section=planb`);
  const section = page.locator("#settings-planb");
  await section.getByRole("button", { name: "HIIT", exact: true }).click();
  await section.getByRole("button", { name: "Abdos", exact: true }).click();
  await section.getByRole("button", { name: "Abdos", exact: true, pressed: true }).waitFor({ timeout: 5000 });
  // Kept with the profile too, so the other devices follow (migration 081).
  const stored = await page.evaluate(async () => {
    const db = await new Promise((res) => { const r = indexedDB.open("TrainTrack"); r.onsuccess = () => res(r.result); });
    const all = await new Promise((res) => { const r = db.transaction("athleteProfiles").objectStore("athleteProfiles").getAll(); r.onsuccess = () => res(r.result); });
    db.close();
    return all.map((p) => p.planB);
  });
  expect(stored.length > 0 && stored.every((b) => b?.kind === "timed" && b?.focus === "abs"), `profile plan B ${JSON.stringify(stored)}`);
  // A session of the day not begun yet.
  await page.evaluate(async (user) => {
    const db = await new Promise((res, rej) => { const r = indexedDB.open("TrainTrack"); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    const now = new Date().toISOString();
    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const day = { key: "e2e-planb", name: "Séance plan B", exercises: [{ exerciseName: "Back Squat", targetSets: 3, targetReps: "5" }] };
    await new Promise((res, rej) => { const tx = db.transaction("programs", "readwrite"); tx.objectStore("programs").add({ userId: user, ownerUserId: user, uuid: `e2e-planb-${Date.now()}`, name: "Programme plan B", structure: [day], weekdays: [((d.getDay() + 6) % 7) + 1], startDate: today, _dirty: 0, createdAt: now, updatedAt: now }); tx.oncomplete = res; tx.onerror = () => rej(tx.error); });
    db.close();
  }, USER);
  await page.goto(`${BASE}/fr`);
  const hero = heroCard();
  const chip = hero.getByRole("group", { name: "Séances prévues ce jour-là" }).getByRole("button", { name: /Programme plan B/ });
  await chip.or(hero.getByRole("heading", { name: "Séance plan B" })).first().waitFor({ timeout: 10000 });
  if (await chip.count()) await chip.click();
  await hero.getByRole("heading", { name: "Séance plan B" }).waitFor({ timeout: 10000 });
  // From "No time today?": the plan B among the choices.
  await hero.getByRole("button", { name: "Pas le temps aujourd'hui ?" }).click();
  await page.getByRole("dialog").getByRole("button", { name: /Mon plan B à la place/ }).waitFor({ timeout: 5000 });
  await page.keyboard.press("Escape");
  // The session opened, nothing done: the plan B, always on the card, calls it off and starts.
  await hero.getByRole("button", { name: /^Démarrer|^Commencer/ }).click();
  await page.waitForURL(/\/fr\/log\/session\?id=\d+/, { timeout: 10000 });
  const opened = Number(new URL(page.url()).searchParams.get("id"));
  await page.goto(`${BASE}/fr`);
  await heroCard().getByRole("button", { name: /^Plan B : HIIT · Abdos/ }).click();
  await page.waitForURL(/\/fr\/intervals\?focus=abs&minutes=\d+/, { timeout: 10000 });
  const cancelled = await page.evaluate(async (id) => {
    const db = await new Promise((res) => { const r = indexedDB.open("TrainTrack"); r.onsuccess = () => res(r.result); });
    const w = await new Promise((res) => { const r = db.transaction("workouts").objectStore("workouts").get(id); r.onsuccess = () => res(r.result); });
    db.close();
    return !!w?.cancelledAt;
  }, opened);
  expect(cancelled, "the session opened for nothing was not called off");
  // Back to none: as before.
  await page.goto(`${BASE}/fr/settings?section=planb`);
  await page.locator("#settings-planb").getByRole("button", { name: "Aucun", exact: true }).click();
});

await test("stretching, yoga and tai-chi are always one tap away: the session card and the Sports page", async () => {
  await page.goto(`${BASE}/fr`);
  const link = heroCard().getByRole("link", { name: "Étirements, yoga, tai-chi" });
  await link.waitFor({ timeout: 10000 });
  await snap("home-mobility");
  await link.click();
  await page.waitForURL(/\/fr\/mobility$/, { timeout: 10000 });
  await page.goto(`${BASE}/fr/more`);
  await page.getByRole("link", { name: "Échauffement, étirements, yoga et tai-chi" }).click();
  await page.waitForURL(/\/fr\/mobility$/, { timeout: 10000 });
});

await test("the sport followed is changed from the top of the home screen", async () => {
  await page.goto(`${BASE}/fr`);
  await page.getByRole("button", { name: /^Sport suivi : .*Changer de sport/ }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Natation" }).click();
  await dialog.waitFor({ state: "detached", timeout: 5000 });
  await page.getByRole("button", { name: /^Sport suivi : Natation/ }).waitFor({ timeout: 5000 });
  const stored = await page.evaluate(async () => {
    const db = await new Promise((res) => { const r = indexedDB.open("TrainTrack"); r.onsuccess = () => res(r.result); });
    const all = await new Promise((res) => { const r = db.transaction("athleteProfiles").objectStore("athleteProfiles").getAll(); r.onsuccess = () => res(r.result); });
    db.close();
    return { prefs: JSON.parse(localStorage.getItem("traintrack.prefs") || "{}").sport, profile: all.map((p) => p.favoriteSport) };
  });
  expect(stored.prefs === "swimming" && stored.profile.every((f) => f === "swimming"), `stored ${JSON.stringify(stored)}`);
  // Nothing wider than the phone with the new button in the header.
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), "the header is wider than the phone");
  await setSportChoice(null);
});

await test("the Essential mode keeps the extras for later, safety first, and is changed back in Settings", async () => {
  const setMode = (mode) => page.evaluate(async (v) => {
    const db = await new Promise((res, rej) => { const r = indexedDB.open("TrainTrack"); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    const tx = db.transaction("athleteProfiles", "readwrite");
    const st = tx.objectStore("athleteProfiles");
    const all = await new Promise((res) => { const r = st.getAll(); r.onsuccess = () => res(r.result); });
    for (const row of all) st.put({ ...row, displayMode: v });
    await new Promise((res) => { tx.oncomplete = res; });
    db.close();
  }, mode);
  // As before for a profile that never chose: everything, the plan B on the card.
  await page.goto(`${BASE}/fr`);
  await heroCard().getByRole("button", { name: /Choisir un plan B|^Plan B :/ }).waitFor({ timeout: 10000 });
  await setMode("essential");
  await page.goto(`${BASE}/fr`);
  await heroCard().getByRole("button", { name: /^Commencer|^Démarrer|^Continuer/ }).first().waitFor({ timeout: 10000 });
  // Gone once the profile is read.
  await heroCard().getByRole("button", { name: /Choisir un plan B|^Plan B :/ }).waitFor({ state: "detached", timeout: 5000 });
  // The load rising too fast still says so: safety shows in every mode.
  await page.getByRole("link", { name: /Charge en hausse trop rapide/ }).waitFor({ timeout: 10000 });
  // Performance: the main reading and one's figures; the expert charts wait, and it says so.
  await page.goto(`${BASE}/fr/progress`);
  await page.getByText(/Mode Essentiel : certaines analyses sont masquées/).waitFor({ timeout: 10000 });
  expect(!(await page.locator("#chart-load-history").count()), "the load history shows in Essential");
  // The load calling for care keeps its chart, where the home screen's alert leads.
  await page.locator("#chart-load").waitFor({ timeout: 5000 });
  // Back to Expert from Settings: kept with the profile, everything shows again.
  await page.getByRole("link", { name: "Changer" }).click();
  await page.waitForURL(/section=display/, { timeout: 10000 });
  const section = page.locator("#settings-display");
  await section.getByRole("radio", { name: /Essentiel/ }).and(page.locator("[aria-checked=true]")).waitFor({ timeout: 10000 });
  await section.scrollIntoViewIfNeeded();
  await snap("settings-display-mode");
  await section.getByRole("radio", { name: /Expert/ }).click();
  await section.getByRole("radio", { name: /Expert/ }).and(page.locator("[aria-checked=true]")).waitFor({ timeout: 5000 });
  await page.goto(`${BASE}/fr/progress`);
  await page.locator("#chart-load-history").waitFor({ timeout: 10000 });
  expect(!(await page.getByText(/certaines analyses sont masquées/).count()), "the hint shows in Expert");
  await setMode(null);
});

await test("the session picker follows the sport chosen in the header: one's programs and the ready-made ones", async () => {
  const dialog = page.getByRole("dialog");
  const pickSport = async (name) => {
    await page.goto(`${BASE}/fr`);
    await page.getByRole("button", { name: /^Sport suivi : .*Changer de sport/ }).click();
    await dialog.getByRole("button", { name, exact: true }).click();
    await dialog.waitFor({ state: "detached", timeout: 5000 });
  };
  const mine = () => dialog.locator("section", { hasText: "Mes programmes" }).locator("h4");
  await pickSport("Course à pied");
  await sessionOption("Changer de séance ou de programme");
  const sports = dialog.getByRole("group", { name: "Sport" });
  await sports.getByRole("button", { name: "Course à pied", pressed: true }).waitFor({ timeout: 5000 });
  // The ready-made programs of that sport only.
  const readyMade = dialog.locator("section", { has: page.locator("#picker-ready-made") }).locator("a, button").filter({ hasText: " · " });
  for (let i = 0; i < (await readyMade.count()); i++) expect((await readyMade.nth(i).innerText()).includes("Course à pied"), "another sport among the running programs");
  // One's programs of other sports wait one tap away.
  const running = await mine().allInnerTexts();
  const others = dialog.getByRole("button", { name: /d’autres? sports? · Voir tous/ });
  await others.waitFor({ timeout: 5000 });
  await others.click();
  await sports.getByRole("button", { name: "Tous", pressed: true }).waitFor({ timeout: 5000 });
  expect((await mine().count()) > running.length, `no other program under "All": ${running.join(", ")}`);
  await page.keyboard.press("Escape");
  // Another sport followed: the picker follows it, the "All" chosen before is forgotten.
  await pickSport("Natation");
  await sessionOption("Changer de séance ou de programme");
  await sports.getByRole("button", { name: "Natation", pressed: true }).waitFor({ timeout: 5000 });
  // A search looks everywhere, whatever the sport.
  await dialog.getByPlaceholder("Chercher un programme ou une séance").fill("full body");
  await dialog.getByText(/Full Body/).first().waitFor({ timeout: 5000 });
  await page.keyboard.press("Escape");
  await setSportChoice(null);
});

await test("a timed session done ends on its recap, with Done back home and back leading home too", async () => {
  // Five seconds of effort, no rest and no countdown for the test, the reference put back after.
  const kept = await page.evaluate(() => {
    const t = localStorage.getItem("traintrack.guidance.timed_sessions");
    const tt = JSON.parse(t);
    tt.getReadySec = 0;
    tt.patterns = [...tt.patterns, "5-0"];
    localStorage.setItem("traintrack.guidance.timed_sessions", JSON.stringify(tt));
    return { t, minutes: tt.minutes[0] };
  });
  let id = 0;
  try {
    await page.goto(`${BASE}/fr`);
    await page.getByRole("button", { name: "Ouvrir le menu" }).waitFor({ timeout: 10000 });
    await page.goto(`${BASE}/fr/intervals?focus=full&dumbbells=0&trx=0&pattern=5-0&minutes=${kept.minutes}&seed=7`);
    await page.getByRole("button", { name: /Démarrer/ }).click();
    const player = page.getByRole("dialog");
    await player.getByText(/Effort/).waitFor({ timeout: 5000 });
    // The first exercise done to the end, then the session stopped.
    await page.waitForTimeout(6500);
    await player.getByRole("button", { name: /Terminer la séance/ }).click();
    await page.waitForURL(/\/fr\/log\/session\?id=\d+&done=1/, { timeout: 10000 });
    id = Number(new URL(page.url()).searchParams.get("id"));
    const done = page.getByRole("button", { name: "Terminé", exact: true });
    await done.waitFor({ timeout: 10000 });
    await snap("interval-recap-done");
    // The timer is no longer behind the recap: back leads where the session was started from.
    await page.getByRole("button", { name: "Retour" }).click();
    await page.waitForURL(new RegExp(`${BASE}/fr/?$`), { timeout: 10000 });
    await page.goForward();
    await done.click();
    await page.waitForURL(new RegExp(`${BASE}/fr/?$`), { timeout: 10000 });
    // Opened again from the history: a recap, nothing more to end.
    await page.goto(`${BASE}/fr/log/session?id=${id}`);
    await page.getByRole("button", { name: /Refaire cette séance/ }).waitFor({ timeout: 10000 });
    expect(!(await page.getByRole("button", { name: "Terminé", exact: true }).count()), "Done shown on a session opened from the history");
  } finally {
    if (id) {
      page.once("dialog", (d) => d.accept());
      await page.getByRole("button", { name: /Supprimer la séance/ }).click();
      await page.waitForURL(/\/fr\/log$/, { timeout: 10000 });
    }
    await page.evaluate(({ t }) => localStorage.setItem("traintrack.guidance.timed_sessions", t), kept);
  }
});

await test("music: one's app and playlist chosen in Settings, opened from a session, or chosen there the first time", async () => {
  // What the app opens is noted rather than opened.
  const stub = () => page.evaluate(() => {
    window.__opened = [];
    window.open = (url, target) => {
      window.__opened.push([url, target]);
      return null;
    };
  });
  const opened = () => page.evaluate(() => window.__opened);
  const list = "https://open.spotify.com/playlist/37i9dQZF1DX76Wlfdnj7AP";
  try {
    await page.goto(`${BASE}/fr/settings?section=music`);
    const section = page.locator("#settings-music");
    await section.getByRole("button", { name: "Aucune", pressed: true }).waitFor({ timeout: 10000 });
    await section.getByRole("button", { name: "Spotify", exact: true }).click();
    const field = section.getByRole("textbox", { name: /Playlist/ });
    // A link of another app is refused.
    await field.fill("https://music.apple.com/fr/playlist/x");
    await field.press("Enter");
    await section.getByRole("alert").getByText("Ce lien n'est pas une playlist Spotify.").waitFor({ timeout: 5000 });
    await field.fill(list);
    await field.press("Enter");
    await section.getByRole("alert").waitFor({ state: "detached", timeout: 5000 });
    const kept = await page.evaluate(() => JSON.parse(localStorage.getItem("traintrack.prefs")).music);
    expect(kept?.app === "spotify" && kept?.playlist === list, `kept ${JSON.stringify(kept)}`);
    await stub();
    await section.getByRole("button", { name: "Essayer" }).click();
    expect(JSON.stringify(await opened()) === JSON.stringify([[list, "_blank"]]), `tried ${JSON.stringify(await opened())}`);

    // In a timed session: one tap, the session goes on.
    await page.goto(`${BASE}/fr/intervals`);
    await page.getByRole("button", { name: /Démarrer/ }).click();
    const player = page.getByRole("dialog");
    await player.getByText(/Préparez-vous/).waitFor({ timeout: 5000 });
    await stub();
    await player.getByRole("button", { name: "Musique : ouvrir Spotify" }).click();
    expect((await opened())[0]?.[0] === list, `opened ${JSON.stringify(await opened())}`);
    expect(await player.isVisible(), "the session stopped when the music opened");
    await snap("player-music");
    await player.getByRole("button", { name: /Terminer la séance/ }).click();

    // Never chosen: the app is picked right there, then opens (its web player on a computer).
    await page.evaluate(() => {
      const prefs = JSON.parse(localStorage.getItem("traintrack.prefs"));
      localStorage.setItem("traintrack.prefs", JSON.stringify({ ...prefs, music: null }));
    });
    await page.goto(`${BASE}/fr/intervals`);
    await page.getByRole("button", { name: /Démarrer/ }).click();
    await player.getByText(/Préparez-vous/).waitFor({ timeout: 5000 });
    await stub();
    await player.getByRole("button", { name: "Musique : choisir son appli" }).click();
    await player.getByRole("group", { name: "Musique : choisir son appli" }).getByRole("button", { name: "Deezer" }).click();
    expect(JSON.stringify(await opened()) === JSON.stringify([["https://www.deezer.com", "_blank"]]), `opened ${JSON.stringify(await opened())}`);
    await player.getByRole("button", { name: "Musique : ouvrir Deezer" }).waitFor({ timeout: 5000 });
    await player.getByRole("button", { name: /Terminer la séance/ }).click();
  } finally {
    await page.evaluate(() => {
      const prefs = JSON.parse(localStorage.getItem("traintrack.prefs") ?? "{}");
      localStorage.setItem("traintrack.prefs", JSON.stringify({ ...prefs, music: null }));
    });
  }
});

await test("on an iPhone, starting one's music from a session turns the voice coach off (it would pause the music), and it can be turned back on", async () => {
  const prefs = () => page.evaluate(() => JSON.parse(localStorage.getItem("traintrack.prefs") ?? "{}"));
  const setPrefs = (v) => page.evaluate((v) => localStorage.setItem("traintrack.prefs", JSON.stringify({ ...JSON.parse(localStorage.getItem("traintrack.prefs") ?? "{}"), ...v })), v);
  const stub = () => page.evaluate(() => {
    window.__opened = [];
    window.open = (url, target) => {
      window.__opened.push([url, target]);
      return null;
    };
  });
  try {
    // The voice coach, with its warning, in Settings > Music.
    await page.goto(`${BASE}/fr/settings?section=music`);
    const coach = page.locator("#settings-music").getByRole("checkbox", { name: /Coach vocal/ });
    await coach.waitFor({ timeout: 10000 });
    expect(await coach.isChecked(), "the voice coach is off by default");
    await page.locator("#settings-music").getByText(/Sur iPhone, la voix met votre musique en pause/).waitFor({ timeout: 5000 });
    await setPrefs({ music: { app: "spotify", playlist: null }, voice: true });

    // On a computer, the music leaves the voice as it is.
    await page.goto(`${BASE}/fr/intervals`);
    await page.getByRole("button", { name: /Démarrer/ }).click();
    const player = page.getByRole("dialog");
    await player.getByText(/Préparez-vous/).waitFor({ timeout: 5000 });
    await stub();
    await player.getByRole("button", { name: "Musique : ouvrir Spotify" }).click();
    expect((await prefs()).voice === true, "the voice turned off on a computer");
    expect(!(await player.getByText(/Coach vocal coupé/).count()), "a note on a computer");
    await player.getByRole("button", { name: /Terminer la séance/ }).click();

    // On an iPhone: the voice is turned off, a note says so.
    await page.goto(`${BASE}/fr/intervals`);
    await page.getByRole("button", { name: /Démarrer/ }).click();
    await player.getByText(/Préparez-vous/).waitFor({ timeout: 5000 });
    await stub();
    await page.evaluate(() => Object.defineProperty(navigator, "userAgent", { value: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1" }));
    await player.getByRole("button", { name: "Musique : ouvrir Spotify" }).click();
    await player.getByRole("status").getByText(/Coach vocal coupé : sur iPhone, la voix mettrait votre musique en pause/).waitFor({ timeout: 5000 });
    expect((await prefs()).voice === false, "the voice still on");
    await player.getByRole("button", { name: "Coach vocal", pressed: false }).waitFor({ timeout: 5000 });
    await snap("player-voice-off");
    await player.getByRole("button", { name: "Réactiver la voix" }).click();
    expect((await prefs()).voice === true, "the voice not back on");
    await player.getByRole("button", { name: "Coach vocal", pressed: true }).waitFor({ timeout: 5000 });
    expect(!(await player.getByText(/Coach vocal coupé/).count()), "the note stayed");
    await player.getByRole("button", { name: /Terminer la séance/ }).click();
  } finally {
    await setPrefs({ music: null, voice: true });
  }
});

await test("boxing rounds in the HIIT: combinations called out, a burst to end each round, a rest between rounds", async () => {
  await page.goto(`${BASE}/fr/intervals`);
  await page.getByRole("button", { name: "Boxe", exact: true }).click();
  await page.getByText(/Des rounds de boxe dans le vide/).waitFor({ timeout: 10000 });
  // A beginner: two-minute rounds; no equipment to choose.
  await page.getByRole("button", { name: "2 min / 60 s", pressed: true }).waitFor({ timeout: 5000 });
  expect(!(await page.getByRole("group", { name: "Matériel" }).count()), "equipment offered for boxing");
  await page.getByRole("button", { name: "15 min", exact: true }).click();
  await page.getByText(/^5 rounds de 2 min, 60 s de récupération · 4 enchaînements de 30 s par round/).waitFor({ timeout: 5000 });
  const round = page.locator("ol").first().locator("li");
  expect((await round.count()) === 4, `a round of ${await round.count()} combinations`);
  expect((await round.last().innerText()).includes("Rafale de directs"), "the round does not end with the burst");
  await page.getByRole("button", { name: "3 min / 60 s" }).click();
  await page.getByText(/^4 rounds de 3 min/).waitFor({ timeout: 5000 });
  await snap("boxing");

  // A short round for the test, the references put back after: boxed to the end, then stopped.
  const kept = await page.evaluate(() => {
    const b = localStorage.getItem("traintrack.guidance.boxing_rounds");
    const t = localStorage.getItem("traintrack.guidance.timed_sessions");
    const bb = JSON.parse(b);
    Object.assign(bb, { minutes: [1], formats: ["20-10"], comboSec: 10, formatForLevel: { beginner: "20-10", intermediate: "20-10", advanced: "20-10" } });
    const tt = JSON.parse(t);
    tt.getReadySec = 0;
    localStorage.setItem("traintrack.guidance.boxing_rounds", JSON.stringify(bb));
    localStorage.setItem("traintrack.guidance.timed_sessions", JSON.stringify(tt));
    return { b, t };
  });
  let id = 0;
  try {
    await page.goto(`${BASE}/fr/intervals?focus=boxing&pattern=20-10&minutes=1&seed=3`);
    await page.getByText(/^2 rounds de 20 s, 10 s de récupération/).waitFor({ timeout: 10000 });
    await page.getByRole("button", { name: /Démarrer/ }).click();
    const player = page.getByRole("dialog");
    await player.getByText("Effort", { exact: true }).waitFor({ timeout: 5000 });
    await page.waitForTimeout(21500);
    await player.getByText(/Récupération/).waitFor({ timeout: 5000 });
    await player.getByRole("button", { name: /Terminer la séance/ }).click();
    await page.waitForURL(/\/fr\/log\/session\?id=\d+&done=1/, { timeout: 10000 });
    id = Number(new URL(page.url()).searchParams.get("id"));
    await page.getByText("Boxe · 20 s / 10 s").waitFor({ timeout: 10000 });
    await page.getByText("Tours complets").waitFor({ timeout: 5000 });
    // What was boxed, by name: the burst among it.
    await page.getByText("Rafale de directs").first().waitFor({ timeout: 10000 });
    await snap("boxing-recap");
  } finally {
    if (id) {
      page.once("dialog", (d) => d.accept());
      await page.getByRole("button", { name: /Supprimer la séance/ }).click();
      await page.waitForURL(/\/fr\/log$/, { timeout: 10000 });
    }
    await page.evaluate(({ b, t }) => {
      localStorage.setItem("traintrack.guidance.boxing_rounds", b);
      localStorage.setItem("traintrack.guidance.timed_sessions", t);
    }, kept);
  }
});

await test("a link asking for boxing waits for the rounds' reference on a first visit, and falls back to a circuit without it", async () => {
  const kept = await page.evaluate(() => {
    const b = localStorage.getItem("traintrack.guidance.boxing_rounds");
    localStorage.removeItem("traintrack.guidance.boxing_rounds");
    return b;
  });
  // The reference read from the server, a little after the rest: only that request is answered, nothing reaches a server.
  const settings = (route) =>
    new Promise((resolve) => setTimeout(resolve, 1500))
      .then(() => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([{ key: "boxing_rounds", value: kept }]) }))
      // A request the page let go meanwhile (it moved on): nothing left to answer.
      .catch(() => {});
  const isSettings = (url) => url.pathname.endsWith("/rest/v1/app_settings");
  try {
    await context.route(isSettings, settings);
    await page.goto(`${BASE}/fr/intervals?focus=boxing`);
    await page.getByRole("button", { name: "Boxe", pressed: true }).waitFor({ timeout: 10000 });
    await page.getByText("Rounds", { exact: true }).waitFor({ timeout: 5000 });
    await context.unroute(isSettings, settings);
    // Never read (offline, nothing kept): a circuit, after a short wait.
    await page.evaluate(() => localStorage.removeItem("traintrack.guidance.boxing_rounds"));
    await page.goto(`${BASE}/fr/intervals?focus=boxing`);
    await page.getByRole("button", { name: "Full body", pressed: true }).waitFor({ timeout: 10000 });
    expect(!(await page.getByRole("button", { name: "Boxe" }).count()), "boxing offered without its reference");
  } finally {
    await context.unroute(isSettings, settings).catch(() => {});
    await page.evaluate((b) => localStorage.setItem("traintrack.guidance.boxing_rounds", b), kept);
  }
});

await test("group lessons, tennis: a coach's group, a lesson prepared with exercises for its age, run with the clock, marked given, followed week by week", async () => {
  // In Coaching > Teams, the way to the notebook.
  await page.goto(`${BASE}/fr/teams`);
  await page.getByRole("link", { name: "Carnet de cours" }).click();
  await page.waitForURL(/\/fr\/lessons$/, { timeout: 10000 });
  await page.getByText(/Créez votre premier groupe/).waitFor({ timeout: 10000 });

  // A tennis group training today: its age, level, slot and how many play (no names).
  const today = ((new Date().getDay() + 6) % 7) + 1;
  await page.getByRole("button", { name: "Nouveau groupe" }).click();
  const form = page.getByRole("dialog");
  await form.getByRole("button", { name: "Tennis", pressed: true }).waitFor({ timeout: 5000 });
  await form.getByRole("textbox", { name: "Nom du groupe" }).fill("Mardi 17h · 8-10 ans");
  await form.getByRole("button", { name: "8-10 ans" }).click();
  await form.getByRole("button", { name: "Débutant" }).click();
  await form.getByLabel("Jour").selectOption(String(today));
  await form.getByLabel("Nombre de joueurs").fill("8");
  await form.getByRole("button", { name: "Enregistrer" }).click();
  await form.waitFor({ state: "detached", timeout: 5000 });
  const week = page.locator("section", { has: page.getByRole("heading", { name: "Cette semaine" }) });
  await week.getByText("À préparer").waitFor({ timeout: 5000 });
  await snap("lessons-home");
  // A team without accounts, in Coaching > Teams beside the teams.
  await page.goto(`${BASE}/fr/teams`);
  const teams = page.locator("section", { has: page.getByRole("heading", { name: "Groupes de cours · sans comptes" }) });
  await teams.getByRole("link", { name: /Mardi 17h · 8-10 ans/ }).waitFor({ timeout: 10000 });
  expect(await teams.getByText(/Tennis · 8-10 ans · 8 joueurs/).count(), "the group's sport, age and players are not shown");
  await page.goto(`${BASE}/fr/lessons`);
  await week.getByText("À préparer").waitFor({ timeout: 10000 });

  // The lesson of today: a theme, exercises of the library that suit the age band.
  await week.getByRole("button", { name: /Mardi 17h · 8-10 ans/ }).click();
  await page.waitForURL(/\/fr\/lessons\/lesson\?id=\d+/, { timeout: 10000 });
  const theme = page.getByRole("textbox", { name: "Thème du jour" });
  await theme.fill("Service : le lancer");
  await theme.blur();
  for (const name of ["Mini-tennis", "Le lancer de balle", "Roi du court"]) {
    await page.getByRole("button", { name: "Ajouter un exercice" }).click();
    const picker = page.getByRole("dialog");
    await picker.getByRole("button", { name: "Pour les 8-10 ans", pressed: true }).waitFor({ timeout: 5000 });
    expect(!(await picker.getByRole("button", { name: "Ajouter « Revers le long de la ligne »" }).count()), "an exercise for older players is offered to 8-10 year-olds");
    expect(!(await picker.getByRole("button", { name: "Ajouter « Assise de base au tonneau »" }).count()), "a vaulting exercise is offered to a tennis group");
    await picker.getByPlaceholder("Chercher un exercice").fill(name.slice(0, 8));
    await picker.getByRole("button", { name: `Ajouter « ${name} »` }).click();
    await picker.waitFor({ state: "detached", timeout: 5000 });
  }
  await page.getByText("31 min sur 60").waitFor({ timeout: 5000 });
  await page.getByRole("spinbutton", { name: "Minutes de « Roi du court »" }).fill("20");
  await page.getByText("36 min sur 60").waitFor({ timeout: 5000 });
  await page.getByRole("button", { name: "Monter « Le lancer de balle »" }).click();
  await page.locator("ol li").first().getByText("Le lancer de balle").waitFor({ timeout: 5000 });

  // One's own exercise, made right there: it joins the one library.
  await page.getByRole("button", { name: "Ajouter un exercice" }).click();
  const picker = page.getByRole("dialog");
  await picker.getByRole("button", { name: "Nouvel exercice" }).click();
  await picker.getByRole("textbox", { name: "Nom" }).fill("Mon jeu des cibles");
  await picker.getByRole("button", { name: "Jeux" }).click();
  await picker.getByRole("button", { name: "Enregistrer" }).click();
  await picker.waitFor({ state: "detached", timeout: 5000 });
  await page.getByText("46 min sur 60").waitFor({ timeout: 5000 });
  await snap("lessons-lesson");

  // On the court: the clock, then what went on.
  await page.getByRole("button", { name: "Lancer au chrono" }).click();
  const player = page.getByRole("dialog");
  await player.getByText(/Préparez-vous/).waitFor({ timeout: 5000 });
  await player.getByRole("button", { name: /Terminer la séance/ }).click();
  const given = page.getByRole("dialog");
  await given.getByRole("heading", { name: "Cours donné" }).waitFor({ timeout: 5000 });
  expect(!(await given.getByLabel("Cheval").count()), "a horse is asked for a tennis lesson");
  await given.getByLabel("Joueurs présents").fill("7");
  await given.getByRole("button", { name: /^3 · moyenne/ }).click();
  await given.getByRole("textbox", { name: "Note" }).fill("Le lancer progresse");
  await given.getByRole("button", { name: "Enregistrer" }).click();
  await page.getByRole("status").getByText(/Cours donné le/).waitFor({ timeout: 5000 });
  await page.getByText("7 présents · intensité 3/5 (moyenne)").waitFor({ timeout: 5000 });

  // The group, week by week: the themes worked, those left aside.
  await page.goto(`${BASE}/fr/lessons`);
  await week.getByText("Donné").waitFor({ timeout: 10000 });
  await page.getByRole("link", { name: /Mardi 17h · 8-10 ans/ }).click();
  await page.waitForURL(/\/fr\/lessons\/group\?id=\d+/, { timeout: 10000 });
  const themes = page.locator("section", { has: page.getByRole("heading", { name: "Thèmes des 4 dernières semaines" }) });
  await themes.getByText("Service").waitFor({ timeout: 5000 });
  await themes.getByText(/À revoir : .*Coup droit/).waitFor({ timeout: 5000 });
  await snap("lessons-group");

  // One library: the exercises page has the tennis ones, one's own among them.
  await page.goto(`${BASE}/fr/exercises`);
  await page.getByRole("group", { name: "Sport" }).getByRole("button", { name: "Tennis" }).click();
  await page.getByText("Mini-tennis", { exact: true }).first().waitFor({ timeout: 5000 });
  await page.getByText("Mon jeu des cibles", { exact: true }).first().waitFor({ timeout: 5000 });
  expect(!(await page.getByText("Back Squat", { exact: true }).count()) && !(await page.getByText("Squat arrière", { exact: true }).count()), "a general exercise shows among the tennis ones");
});

await test("group lessons, vaulting: a group's lesson on a horse logs the horse's work; a vaulting exercise goes in an adult's session too", async () => {
  // A horse to work.
  await page.goto(`${BASE}/fr/horses`);
  await page.getByRole("button", { name: "Ajouter un cheval" }).click();
  const horseForm = page.getByRole("dialog");
  await horseForm.getByRole("textbox", { name: "Nom" }).fill("Joker");
  await horseForm.getByRole("button", { name: "Enregistrer" }).click();
  await horseForm.waitFor({ state: "detached", timeout: 5000 });

  // A vaulting group, on today.
  const today = ((new Date().getDay() + 6) % 7) + 1;
  await page.goto(`${BASE}/fr/lessons`);
  await page.getByRole("button", { name: "Nouveau groupe" }).click();
  const form = page.getByRole("dialog");
  await form.getByRole("button", { name: "Voltige" }).click();
  await form.getByRole("textbox", { name: "Nom du groupe" }).fill("Voltige mercredi");
  await form.getByRole("button", { name: "11-13 ans" }).click();
  await form.getByLabel("Jour").selectOption(String(today));
  await form.getByRole("button", { name: "Enregistrer" }).click();
  await form.waitFor({ state: "detached", timeout: 5000 });
  const week = page.locator("section", { has: page.getByRole("heading", { name: "Cette semaine" }) });
  await week.getByRole("button", { name: /Voltige mercredi/ }).click();
  await page.waitForURL(/\/fr\/lessons\/lesson\?id=\d+/, { timeout: 10000 });
  await page.getByRole("button", { name: "Ajouter un exercice" }).click();
  const picker = page.getByRole("dialog");
  await picker.getByRole("group", { name: "Thème" }).getByRole("button", { name: "Tonneau", exact: true }).click();
  await picker.getByRole("button", { name: "Ajouter « Assise de base au tonneau »" }).click();
  await picker.waitFor({ state: "detached", timeout: 5000 });

  // Given on Joker: its walk, trot and canter go to its week.
  await page.getByRole("button", { name: "Marquer comme donné" }).click();
  const given = page.getByRole("dialog");
  await given.getByLabel("Cheval").selectOption({ label: "Joker" });
  await given.getByLabel("Pas (min)").fill("10");
  await given.getByLabel("Trot (min)").fill("5");
  await given.getByLabel("Galop (min)").fill("8");
  await given.getByRole("button", { name: "Enregistrer" }).click();
  await page.getByRole("status").getByText(/Cours donné le/).waitFor({ timeout: 5000 });
  await page.goto(`${BASE}/fr/horses`);
  await page.getByText(/^23 \/ \d+ min cette semaine/).waitFor({ timeout: 10000 });
  await snap("lessons-horse");

  // The review changed: the horse's work follows, not added twice.
  await page.goBack();
  await page.getByRole("button", { name: "Modifier le bilan" }).click();
  const again = page.getByRole("dialog");
  expect((await again.getByLabel("Galop (min)").inputValue()) === "8", "the canter logged is not shown back");
  await again.getByLabel("Galop (min)").fill("4");
  await again.getByRole("button", { name: "Enregistrer" }).click();
  await again.waitFor({ state: "detached", timeout: 5000 });
  await page.goto(`${BASE}/fr/horses`);
  await page.getByText(/^19 \/ \d+ min cette semaine/).waitFor({ timeout: 10000 });

  // Classic coaching: an adult's session takes a vaulting exercise from the same library.
  await page.goto(`${BASE}/fr/log`);
  await page.getByRole("button", { name: /Nouvelle séance/ }).first().click();
  await page.waitForURL(/\/fr\/log\/session\?id=\d+/, { timeout: 15000 });
  await page.getByRole("button", { name: /Ajouter un exercice/ }).click();
  const choose = page.getByRole("dialog");
  expect(!(await choose.getByText("Assise de base au tonneau", { exact: true }).count()), "a vaulting exercise shows among the general ones");
  await choose.getByRole("group", { name: "Sport" }).getByRole("button", { name: "Voltige" }).click();
  await choose.getByText("Assise de base au tonneau", { exact: true }).click();
  await page.getByText("Assise de base au tonneau").first().waitFor({ timeout: 5000 });
});

await test("no page threw an error", async () => {
  expect(errors.length === 0, errors.slice(0, 3).join(" | "));
});

await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length} passed, ${failed.length} failed`);
process.exit(failed.length ? 1 : 0);
