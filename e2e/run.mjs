// The main paths of an athlete, end to end, in a real browser.
//
// They run offline on the device's own data: a user is cached the way a sign-in
// leaves it, the pages come from the service worker, and nothing reaches the
// server — so no test account is needed and no real data is touched. Started
// by scripts/e2e.sh, which builds and serves the app.
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
const PAGES = ["", "/log", "/log/session", "/programs", "/progress", "/intervals", "/mobility", "/exercises", "/competitions", "/report", "/settings", "/more", "/horses", "/onboarding", "/readiness", "/join", "/tests", "/running"];
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

// A signed-in user as the app caches it, a profile, and a few library exercises.
await page.evaluate(async (user) => {
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
  await put("authMeta", { key: "currentUser", userId: user, email: "e2e@test.local", planFeatures: ["ai_programs","nutrition","readiness","coaching","advanced_progress","planning","level_tests","excel_import","running","meal_plans","reports","challenges","vaulting"] });
  await put("athleteProfiles", {
    userId: user, uuid: "e2e-profile", goals: ["general_fitness"], fitnessLevel: "beginner", equipment: ["dumbbell"],
    trainingDays: [1, 3, 5], trainingTime: "18:30", _dirty: 0, createdAt: now, updatedAt: now,
  });
  for (const [i, [name, muscleGroup, equipment]] of [
    ["Back Squat", "legs", "barbell"], ["Barbell Bench Press", "chest", "barbell"], ["Plank", "core", "bodyweight"], ["Push-up", "chest", "bodyweight"],
  ].entries()) {
    await put("exercises", { name, muscleGroup, equipment, isCustom: false, userId: null, uuid: `e2e-ex-${i}`, _dirty: 0, createdAt: now, updatedAt: now });
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
}, USER);

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
  await page.getByText("Changer de séance ou de programme").click();
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
  const card = page.locator("section", { hasText: "Charge d’entraînement" });
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
  await page.getByRole("button", { name: /Pas le temps \? Version courte/ }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("heading", { name: "Séance express" }).waitFor({ timeout: 5000 });
  const first = dialog.getByRole("group", { name: "Temps disponible" }).getByRole("button").first();
  expect((await first.getAttribute("aria-pressed")) === "true", "no time chosen by default");
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

await test("an empty session takes an exercise from the library", async () => {
  await page.goto(`${BASE}/fr/log`);
  await page.getByRole("button", { name: /Nouvelle séance/ }).first().click();
  await page.waitForURL(/\/fr\/log\/session\?id=\d+/, { timeout: 15000 });
  await page.getByRole("button", { name: /Ajouter un exercice/ }).click();
  await page.getByRole("dialog").getByText("Pompes").click();
  await page.getByText("Pompes").first().waitFor({ timeout: 5000 });
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
  await dialog.getByRole("button", { name: /Terminer la séance/ }).click();
});

await test("the style chosen in Settings restyles the whole app", async () => {
  await page.goto(`${BASE}/fr/settings`);
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
  const hero = page.locator("section", { hasText: "Changer de séance ou de programme" });
  await hero.getByText(/Séance du jour|Prochaine séance · /).first().waitFor({ timeout: 10000 });
  const choices = hero.getByRole("group", { name: "Séances prévues ce jour-là" }).getByRole("button");
  if ((await choices.count()) > 1) {
    const second = choices.nth(1);
    await second.click();
    expect((await second.getAttribute("aria-pressed")) === "true", "the session picked is not shown");
    const [name] = (await second.innerText()).replace("✓ ", "").split(" · ");
    await hero.getByRole("heading", { name, exact: true }).waitFor({ timeout: 5000 });
  }
  // The week lists the sessions of both, each with its program.
  const week = page.locator("section", { hasText: "prochaines semaines à mon agenda" });
  await week.getByText("· Full Body — Débutant").first().waitFor({ timeout: 10000 });
  await week.getByText("· program fr").first().waitFor({ timeout: 10000 });
  await snap("week-planning");
  const exportButton = week.getByRole("button", { name: /Ajouter les 8 prochaines semaines/ });
  // Centred, away from the menu button fixed at the bottom of the screen.
  await exportButton.evaluate((el) => el.scrollIntoView({ block: "center" }));
  const [download] = await Promise.all([page.waitForEvent("download"), exportButton.click({ timeout: 10000 })]);
  const ics = readFileSync(await download.path(), "utf8");
  expect(ics.includes("DESCRIPTION:program fr") && ics.includes("DESCRIPTION:Full Body — Débutant"), "the calendar misses a program");
});

await test("a session of the week moves to another day, and back", async () => {
  await page.goto(`${BASE}/fr`);
  const week = page.locator("section", { hasText: "prochaines semaines à mon agenda" });
  await week.getByText("Touchez un jour pour déplacer ou rattraper sa séance.").waitFor({ timeout: 10000 });
  const day = week.locator("button[data-date]").first();
  const from = await day.getAttribute("data-date");
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
  await page.goto(`${BASE}/fr/settings`);
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
  // The program is in the planning, and the week names it.
  await page.locator("section", { hasText: "prochaines semaines à mon agenda" }).getByText(`· ${name}`).first().waitFor({ timeout: 10000 });
  await page.getByRole("heading", { name: "Vos premiers pas" }).waitFor({ timeout: 5000 });
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
  // The tests are never put forward as the session of the day.
  await page.goto(`${BASE}/fr`);
  const hero = page.locator("section", { hasText: "Changer de séance ou de programme" });
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
  await player.getByRole("button", { name: /Terminer la séance/ }).click();
  expect(page.url().includes("/running"), "a session of a few seconds was saved");
});

await test("the home screen follows the sport practised, and offers it when another is chosen", async () => {
  // Mostly runs lately: the guided intervals among the sessions.
  await page.goto(`${BASE}/fr`);
  const overview = page.locator("section", { hasText: "Vue d’ensemble" }).or(page.locator("section", { hasText: "Vue d'ensemble" }));
  // The week in one line: kilos of loaded sets, or the activities done; never "0 kg" or "-100 %".
  const line = /Volume [\d\s\u202f]+ kg cette semaine|\d+ activités? cette semaine|Aucune activité cette semaine/;
  await overview.getByText(line).first().waitFor({ timeout: 10000 }).catch(async () => {
    throw new Error(`no week line in the overview: ${(await overview.first().innerText().catch(() => "?")).replace(/\n/g, " | ")}`);
  });
  expect(!/(^|\s)0 kg|-100 ?%/.test(await overview.first().innerText()), "0 kg or -100 % in the overview");
  await page.getByText("Changer de séance ou de programme").click();
  await page.getByRole("dialog").getByText("Fractionnés guidés").waitFor({ timeout: 5000 }).catch(() => {
    throw new Error("no guided intervals among the sessions");
  });
  await page.keyboard.press("Escape");
  // Weight training chosen in Settings: the app offers the sport the weeks show.
  await page.goto(`${BASE}/fr/settings`);
  await page.getByRole("button", { name: "Musculation", exact: true }).first().click();
  await page.goto(`${BASE}/fr`);
  // The load rising too fast comes first; the other notes are folded under "To look at".
  await page.getByText("Charge d’entraînement").first().waitFor({ timeout: 10000 });
  const more = page.locator("details", { hasText: "À voir aussi" });
  await more.locator("summary").click();
  await page.getByText("Vous pratiquez surtout : Course à pied ?").waitFor({ timeout: 10000 });
  await snap("home-sport-hint");
  await page.getByRole("button", { name: "Passer à ce sport" }).click();
  await page.getByText("Vous pratiquez surtout : Course à pied ?").waitFor({ state: "hidden", timeout: 5000 });
  const prefs = await page.evaluate(() => JSON.parse(localStorage.getItem("traintrack.prefs") ?? "{}"));
  expect(prefs.sport === "running" && prefs.sport2 === "bodybuilding", `prefs ${JSON.stringify(prefs)}`);
  // "All sports": nothing guessed, the app as it was, kilos and the usual order.
  await page.goto(`${BASE}/fr/settings`);
  await page.getByRole("button", { name: "Tous les sports", exact: true }).click();
  await page.getByText("Rien n’est mis en avant").waitFor({ timeout: 5000 });
  await page.goto(`${BASE}/fr`);
  await page.locator("section", { hasText: "Vue d'ensemble" }).getByText(line).first().waitFor({ timeout: 10000 });
  await page.getByText("Changer de séance ou de programme").click();
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
  const all = ["ai_programs","nutrition","readiness","coaching","advanced_progress","planning","level_tests","excel_import","running","meal_plans","reports","challenges","vaulting"];
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
  for (const name of ["Programmes", "Exercices", "Séance callisthenics"]) {
    await page.getByRole("link", { name: new RegExp(name) }).first().waitFor({ timeout: 5000 });
  }
  await page.getByText("Historique", { exact: true }).waitFor({ timeout: 5000 });
  await snap("train-hub");
  if (process.env.E2E_SHOTS) {
    await page.setViewportSize({ width: 1280, height: 900 });
    await snap("train-hub-desktop");
    await page.setViewportSize({ width: 390, height: 844 });
  }
});

/** A session of today with one exercise and its sets, straight in the device's store; its id. */
async function sessionWithSets(sets = 3, exercise = "Push-up") {
  return page.evaluate(async ({ user, sets, exercise }) => {
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
    const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const id = await add("workouts", { userId: user, uuid: `e2e-active-${Date.now()}`, date, title: "Séance active e2e", _dirty: 0, createdAt: now.toISOString(), updatedAt: now.toISOString() });
    for (let n = 1; n <= sets; n++) {
      await add("workoutSets", { userId: user, uuid: `e2e-active-${id}-${n}`, workoutId: id, exerciseId: ex.id, setNumber: n, completed: false, restSec: 90, _dirty: 0, createdAt: now.toISOString(), updatedAt: now.toISOString() });
    }
    db.close();
    return id;
  }, { user: USER, sets, exercise });
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
  await page.getByRole("button", { name: "Marquer comme faite" }).first().click();
  const rest = page.getByRole("timer", { name: "Repos" });
  await rest.waitFor({ timeout: 5000 });
  await page.waitForTimeout(1500);
  await page.reload();
  await rest.waitFor({ timeout: 10000 });
  const left = await rest.innerText();
  expect(/1:2\d|1:1\d|8\d|7\d/.test(left), `the rest did not go on from where it was: "${left}"`);
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

await test("no page threw an error", async () => {
  expect(errors.length === 0, errors.slice(0, 3).join(" | "));
});

await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length} passed, ${failed.length} failed`);
process.exit(failed.length ? 1 : 0);
