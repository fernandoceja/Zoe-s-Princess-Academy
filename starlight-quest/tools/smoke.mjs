// Local browser smoke test for the R4 shell (P6.2 save continuity, P6.3 offline). Local only: not in CI.
// It needs Chromium and Playwright, so it is not part of the `shell` job in .github/workflows/starlight-tests.yml.
//
// Run from the repo root, after the site is assembled:
//   node starlight-quest/tools/assemble-site.mjs
//   NODE_PATH=<folder that contains node_modules/playwright> node starlight-quest/tools/smoke.mjs
//
// It serves _site on 127.0.0.1 under /Zoe-s-Princess-Academy/ (that path maps to _site/), drives Chromium,
// prints one summary line, and exits 0 only if every step passes. Optional: SMOKE_SHOTS=<dir> saves screenshots.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { createReadStream, existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';

const fail = (msg) => { console.log(`smoke: FAIL ${msg}`); process.exit(1); };

const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch {
  fail('playwright is not resolvable from here (set NODE_PATH to a folder that contains it)');
}

const here = dirname(fileURLToPath(import.meta.url));   // starlight-quest/tools/
const shellRoot = resolve(here, '..');                   // starlight-quest/
const repo = resolve(shellRoot, '..');                   // repo root
const SITE = join(repo, '_site');
const PREFIX = '/Zoe-s-Princess-Academy/';
const KEY = 'zoe-starlight-quest-v1';                    // save key (js/save.js), unchanged
const TUTORIAL_KEY = 'zsq_tutorial_seen_v1';             // main/App flag for "skip the tutorial"
const TITLE = "Zoe's Starlight Quest";
const SHOTS = process.env.SMOKE_SHOTS || '';
if (!existsSync(join(SITE, 'starlight-quest', 'sw.js'))) {
  fail('_site is missing. Run "node starlight-quest/tools/assemble-site.mjs" from the repo root first');
}
if (SHOTS) mkdirSync(SHOTS, { recursive: true });

const fixtureText = readFileSync(join(shellRoot, 'tests', 'fixtures', 'save-v1.json'), 'utf8');
const fixture = JSON.parse(fixtureText);
// The expected save is the engine's own merge() of the fixture (js/save.js, same stamped module the Node test uses).
const { merge } = await import(new URL('../js/save.js?v=20261028r3', import.meta.url).href);
const expectedSave = merge(JSON.parse(fixtureText));

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json',
  '.mp3': 'audio/mpeg', '.woff2': 'font/woff2', '.png': 'image/png', '.svg': 'image/svg+xml', '.txt': 'text/plain; charset=utf-8',
};

function startServer() {
  return new Promise((ok) => {
    const server = createServer((req, res) => {
      let pathname;
      try { pathname = decodeURIComponent(new URL(req.url, 'http://x').pathname); }
      catch { res.writeHead(400).end(); return; }
      if (!pathname.startsWith(PREFIX)) { res.writeHead(404).end('not found'); return; }
      let file = normalize(join(SITE, pathname.slice(PREFIX.length)));
      if (file !== SITE && !file.startsWith(SITE + sep)) { res.writeHead(403).end(); return; }
      if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
      if (!existsSync(file) || !statSync(file).isFile()) { res.writeHead(404).end('not found'); return; }
      res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream', 'cache-control': 'no-cache' });
      createReadStream(file).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => ok(server));
  });
}

const problems = [];
const notes = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); return ok; };

function watch(page, errors) {
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
}

async function poll(fn, timeoutMs, label) {
  const end = Date.now() + timeoutMs;
  let last = null;
  while (Date.now() < end) {
    last = await fn();
    if (last) return last;
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`timed out waiting for ${label}`);
}

async function shot(page, name) {
  if (SHOTS) await page.screenshot({ path: join(SHOTS, `${name}.png`) });
}

// --- P6.2: browser save continuity (T5 browser half) ------------------------------------------
async function saveContinuity(browser, base) {
  const context = await browser.newContext();
  // Seed the save before the page script runs. The tutorial flag only skips the first-run tutorial,
  // so the HUD (hidden on the title screen) is on screen after "Start Adventure".
  await context.addInitScript(({ key, value, tutorialKey }) => {
    localStorage.setItem(key, value);
    localStorage.setItem(tutorialKey, '1');
  }, { key: KEY, value: fixtureText, tutorialKey: TUTORIAL_KEY });
  const errors = [];
  const page = await context.newPage();
  watch(page, errors);
  // Fixed clock on the fixture's own day, so the daily-treasure rollover on boot leaves the save alone.
  await page.clock.setFixedTime(new Date('2026-10-27T12:00:00'));
  await page.goto(base);
  const start = page.getByRole('button', { name: /Start Adventure/ });
  await start.waitFor({ timeout: 30000 });

  const before = JSON.parse(await page.evaluate((k) => localStorage.getItem(k), KEY));
  check(isDeepStrictEqual(before, fixture), 'save: seeded value is not the fixture before any save');

  // The one Save.save() in this run: "Start Adventure" (App.tsx handleStartTitle). It is the first action that writes.
  await start.click();
  const hud = page.locator('[title$="lands glowing"]');
  await hud.waitFor({ timeout: 30000 });
  const lands = Number((await hud.getAttribute('title')).match(/^(\d+) of \d+ lands glowing/)?.[1]);
  const stars = Number((await page.locator('header').first().innerText()).match(/⭐\s*(\d+)/)?.[1]);
  await shot(page, 'save-hud');

  const stored = JSON.parse(await page.evaluate((k) => localStorage.getItem(k), KEY));
  check(stars === fixture.stars, `save: HUD stars ${stars}, fixture ${fixture.stars}`);
  check(lands === fixture.done.length, `save: HUD lands glowing ${lands}, fixture ${fixture.done.length}`);
  check(isDeepStrictEqual(stored, expectedSave), 'save: parsed localStorage after one Save.save() differs from merge(fixture)');
  check(errors.length === 0, `save: page errors: ${errors.slice(0, 3).join(' | ')}`);
  notes.push(`save ${stars} stars, ${lands} lands, parsed==merge(fixture)`);
  await context.close();
}

// --- P6.3: offline after one online visit -----------------------------------------------------
async function offline(browser, base) {
  const context = await browser.newContext();   // fresh profile: no save, tutorial not seen
  const errors = [];
  const page = await context.newPage();
  watch(page, errors);
  await page.goto(base);
  const start = page.getByRole('button', { name: /Start Adventure/ });
  await start.waitFor({ timeout: 30000 });

  // The service worker is active and has cached the built app JS.
  const cache = await poll(() => page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return null;
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg || !reg.active || reg.active.state !== 'activated') return null;
    const name = (await caches.keys()).find((k) => k.startsWith('starlight-quest-'));
    if (!name) return null;
    const urls = (await (await caches.open(name)).keys()).map((r) => r.url);
    const appJs = urls.filter((u) => /\/starlight-quest\/app\/[^/]+\.js$/.test(u));
    return appJs.length ? { name, appJs: appJs.length, controlled: !!navigator.serviceWorker.controller } : null;
  }), 90000, 'service worker activation and app cache');
  notes.push(`cache ${cache.name} holds ${cache.appJs} app js file(s)`);

  // A reload while online makes the worker control the page, so the next offline load goes through it.
  await page.reload();
  await start.waitFor({ timeout: 30000 });
  await poll(() => page.evaluate(() => !!navigator.serviceWorker.controller), 30000, 'SW control of the page');

  await context.setOffline(true);
  await page.reload();
  await start.waitFor({ timeout: 30000 });
  check((await page.title()) === TITLE, `offline: title is "${await page.title()}"`);
  await shot(page, 'offline-title');

  // Tutorial (5 steps), then the world.
  await start.click();
  for (let i = 0; i < 4; i++) await page.getByRole('button', { name: /^Next/ }).click();
  await page.getByRole('button', { name: /Let's Play/ }).click();
  const hud = page.locator('[title$="lands glowing"]');
  await hud.waitFor({ timeout: 30000 });
  // A fresh save shows the "New kingdoms appeared" card once; dismiss it.
  await page.getByRole('button', { name: /Yay/ }).click();

  // Walk north to Belle (Zoe starts at the hub; Belle's land is north). The interact prompt names her when close.
  const belle = page.locator('button', { hasText: 'Belle' });
  await page.keyboard.down('ArrowUp');
  const reached = await poll(async () => (await belle.count()) > 0, 30000, 'Belle interact prompt').then(() => true, () => false);
  await page.keyboard.up('ArrowUp');
  check(reached, 'offline: never got close enough to Belle to see her prompt');
  // The prompt bounces (animate-bounce), so Playwright's stability wait never settles: force the click.
  if (reached) await belle.click({ force: true });

  // Her greeting: step through the lines, then start the quest.
  const startQuest = page.getByRole('button', { name: /Start Quest/ });
  for (let i = 0; i < 12 && !(await startQuest.count()); i++) {
    await page.getByRole('button', { name: /Next/ }).click();
  }
  check((await startQuest.count()) > 0, 'offline: Belle greeting never offered "Start Quest"');
  await startQuest.click();

  // First round visible: the quest pill reads "Belle · 1/5" and the round has answer buttons.
  const pill = page.locator('header').first();
  await poll(async () => /Belle\s*·\s*1\/5/.test(await pill.innerText()), 30000, 'Belle 1/5 quest pill').then(() => true, () => check(false, 'offline: quest pill never showed "Belle · 1/5"'));
  const choices = await page.locator('.zsq-modal-wrap button.rounded-2xl').count();
  check(choices >= 2, `offline: first round shows ${choices} answer buttons, expected at least 2`);
  await shot(page, 'offline-belle-round1');

  check(errors.length === 0, `offline: page errors: ${errors.slice(0, 3).join(' | ')}`);
  notes.push(`offline reload shows title; Belle round 1 with ${choices} choices`);
  await context.close();
}

const server = await startServer();
const base = `http://127.0.0.1:${server.address().port}${PREFIX}starlight-quest/`;
const browser = await chromium.launch();
try {
  await saveContinuity(browser, base);
  await offline(browser, base);
} catch (e) {
  const lines = e.message.split('\n').map((l) => l.trim()).filter(Boolean);
  problems.push(`exception: ${lines[0]} ${lines.find((l) => l.startsWith('- ') || l.startsWith('waiting for')) || ''}`.trim());
} finally {
  await browser.close();
  server.close();
}

if (problems.length) {
  console.log(`smoke: FAIL ${problems.join('; ')}`);
  process.exit(1);
}
console.log(`smoke: PASS ${notes.join('; ')}`);
