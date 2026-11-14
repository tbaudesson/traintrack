// The main paths of an athlete, end to end, in a real browser.
//
// They run offline on the device's own data: a user is cached the way a sign-in
// leaves it, the pages come from the service worker, and nothing reaches the
// server — so no test account is needed and no real data is touched. Started
// by scripts/e2e.sh, which builds and serves the app.
import { chromium } from "playwright-core";
import { existsSync, mkdirSync, readdirSync } from "node:fs";
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
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "fr-FR" });
const page = await context.newPage();
const errors = [];
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
const PAGES = ["", "/log", "/log/session", "/programs", "/progress", "/intervals", "/mobility", "/exercises", "/competitions", "/report", "/settings", "/more", "/horses"];
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

await test("the monthly report counts the sessions of the month", async () => {
  await page.goto(`${BASE}/fr/report`);
  await page.getByText(/Séances : \d+ muscu/).first().waitFor({ timeout: 10000 });
});

await test("no page threw an error", async () => {
  expect(errors.length === 0, errors.slice(0, 3).join(" | "));
});

await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length} passed, ${failed.length} failed`);
process.exit(failed.length ? 1 : 0);
