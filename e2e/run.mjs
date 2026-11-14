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
async function test(name, fn) {
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
const PAGES = ["", "/log", "/log/session", "/programs", "/progress", "/intervals", "/mobility", "/exercises", "/competitions", "/report", "/settings", "/more", "/horses", "/onboarding", "/readiness", "/join"];
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
  await put("authMeta", { key: "currentUser", userId: user, email: "e2e@test.local" });
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
  await page.keyboard.press("Escape");
  // It now appears in "My programs" on the home screen.
  await page.locator("section", { hasText: "Mes programmes" }).getByText("Full Body — Débutant").first().waitFor({ timeout: 10000 });
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
  const voice = dialog.getByRole("button", { name: "Coach vocal" });
  expect((await voice.getAttribute("aria-pressed")) === "true", "voice coach off by default");
  await voice.click();
  expect((await voice.getAttribute("aria-pressed")) === "false", "voice coach did not turn off");
  await voice.click();
  await dialog.getByRole("button", { name: /Terminer la séance/ }).click();
  expect(page.url().includes("/intervals"), "left the page although nothing was done");
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

await test("no page threw an error", async () => {
  expect(errors.length === 0, errors.slice(0, 3).join(" | "));
});

await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length} passed, ${failed.length} failed`);
process.exit(failed.length ? 1 : 0);
