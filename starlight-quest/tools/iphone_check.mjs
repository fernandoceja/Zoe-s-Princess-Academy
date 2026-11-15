// iPhone-sized browser check for the visual polish layer. Local only (needs Chromium + Playwright), like smoke.mjs.
//
// Run from the repo root, after the site is assembled:
//   node starlight-quest/tools/assemble-site.mjs
//   NODE_PATH=<folder that contains node_modules/playwright> node starlight-quest/tools/iphone_check.mjs
// Optional: SHOTS=<dir> saves screenshots of three lands (meadow, frostfall, cove) on High and Low.
//
// It opens the game at iPhone 15 Pro Max size (430x932, touch), with ?fxdebug so it can move Zoe straight to a land.
// It fails on any console error or page error, on any readPixels / getImageData call from the page
// (the GPU readback guard), if a quality choice does not take effect, or if Auto never drops to Low on a slow GPU.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { createReadStream, existsSync, mkdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const fail = (msg) => { console.log(`iphone_check: FAIL ${msg}`); process.exit(1); };
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { fail('playwright is not resolvable from here (set NODE_PATH)'); }

const here = dirname(fileURLToPath(import.meta.url));
const shellRoot = resolve(here, '..');
const SITE = join(resolve(shellRoot, '..'), '_site');
const PREFIX = '/Zoe-s-Princess-Academy/';
const KEY = 'zoe-starlight-quest-v1';
const SHOTS = process.env.SHOTS || '';
const BASELINE = !!process.env.BASELINE; // "before" run on a build without the polish layer: screenshots only
if (!existsSync(join(SITE, 'starlight-quest', 'sw.js'))) fail('_site is missing. Run assemble-site.mjs first');
if (SHOTS) mkdirSync(SHOTS, { recursive: true });
const fixtureText = readFileSync(join(shellRoot, 'tests', 'fixtures', 'save-v1.json'), 'utf8');

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.mp3': 'audio/mpeg', '.woff2': 'font/woff2', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = await new Promise((ok) => {
  const s = createServer((req, res) => {
    let pathname;
    try { pathname = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch { res.writeHead(400).end(); return; }
    if (!pathname.startsWith(PREFIX)) { res.writeHead(404).end(); return; }
    let file = normalize(join(SITE, pathname.slice(PREFIX.length)));
    if (file !== SITE && !file.startsWith(SITE + sep)) { res.writeHead(403).end(); return; }
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
    if (!existsSync(file) || !statSync(file).isFile()) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream', 'cache-control': 'no-cache' });
    createReadStream(file).pipe(res);
  });
  s.listen(0, '127.0.0.1', () => ok(s));
});
const base = `http://127.0.0.1:${server.address().port}${PREFIX}starlight-quest/?fxdebug`;

// Land spots: a few steps into each land, on the hub side, so the princess and the scenery are in frame.
const LANDS = [
  { id: 'meadow', x: 0, z: 22 },
  { id: 'frostfall', x: 22, z: 0 },
  { id: 'cove', x: 16, z: 38 },
];

const problems = [];
const notes = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); return ok; };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function openGame(browser, quality, reduced = false) {
  const context = await browser.newContext({
    viewport: { width: 430, height: 932 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
    reducedMotion: reduced ? 'reduce' : 'no-preference',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  });
  await context.addInitScript(({ key, value, quality }) => {
    localStorage.setItem(key, value);
    localStorage.setItem('zsq_tutorial_seen_v1', '1');
    if (quality) localStorage.setItem('zsq_quality_v1', quality);
    // GPU readback guard: count every pixel read the page makes.
    window.__reads = 0;
    for (const C of [window.WebGLRenderingContext, window.WebGL2RenderingContext]) {
      if (!C) continue;
      const orig = C.prototype.readPixels;
      C.prototype.readPixels = function (...a) { window.__reads++; return orig.apply(this, a); };
    }
    const gid = CanvasRenderingContext2D.prototype.getImageData;
    CanvasRenderingContext2D.prototype.getImageData = function (...a) { window.__reads++; return gid.apply(this, a); };
    const gc = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, attrs) {
      if (/webgl/.test(type) && attrs && attrs.preserveDrawingBuffer) window.__preserve = true;
      return gc.call(this, type, attrs);
    };
  }, { key: KEY, value: fixtureText, quality });
  const errors = [];
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`console: ${m.text()}`); });
  await page.clock.setFixedTime(new Date('2026-10-27T12:00:00'));
  await page.goto(base);
  await page.getByRole('button', { name: /Start Adventure/ }).click({ timeout: 30000 });
  await page.locator('[title$="lands glowing"]').waitFor({ timeout: 30000 });
  { const yay = page.getByRole('button', { name: /Yay/ }); if (await yay.isVisible({ timeout: 1500 }).catch(() => false)) await yay.click(); }
  return { context, page, errors };
}

async function landShots(page, tag) {
  for (const land of LANDS) {
    const moved = await page.evaluate(({ x, z, b }) => (b ? window.__zsqBase : window.__zsqFx).teleport(x, z), { ...land, b: BASELINE });
    check(moved, `${tag}: could not move Zoe to ${land.id}`);
    await wait(2500); // camera and land colours settle
    if (SHOTS) await page.screenshot({ path: join(SHOTS, `${tag}-${land.id}.png`) });
  }
}

const browser = await chromium.launch();
try {
  if (BASELINE) {
    const { context, page, errors } = await openGame(browser, null);
    await landShots(page, 'before');
    check(errors.length === 0, `baseline errors: ${errors.slice(0, 3).join(' | ')}`);
    notes.push('baseline screenshots');
    await context.close();
  } else {
    // High: effects on, screenshots, no errors, no readback.
    {
      const { context, page, errors } = await openGame(browser, 'high');
      const s = await page.evaluate(() => window.__zsqFx.status());
      check(s.choice === 'high' && s.level === 'high', `High: status ${JSON.stringify(s)}`);
      const counts = await page.evaluate(() => window.__zsqFx.counts());
      check(counts && counts.characters >= 5, `High: found ${counts && counts.characters} characters, expected Zoe + princesses`);
      await landShots(page, 'after-high');
      const reads = await page.evaluate(() => [window.__reads, !!window.__preserve]);
      check(reads[0] === 0, `High: page read pixels back ${reads[0]} times`);
      check(!reads[1], 'High: a WebGL context asked for preserveDrawingBuffer');
      const calls = await page.evaluate(() => window.__zsqFx.drawCalls());
      notes.push(`High: ${counts.characters} characters, ${counts.glowPoints} sparkle sets, ${calls} draw calls, 0 readbacks`);
      // Parent Corner shows the three choices; picking Low applies it at once.
      check(errors.length === 0, `High: page errors: ${errors.slice(0, 3).join(' | ')}`);
      await page.evaluate(() => window.__zsqFx.set('low'));
      await wait(1200);
      check((await page.evaluate(() => window.__zsqFx.status())).level === 'low', 'set(low) did not switch to Low');
      if (SHOTS) for (const land of LANDS.slice(0, 1)) {
        await page.evaluate(({ x, z }) => window.__zsqFx.teleport(x, z), land); await wait(2000);
        await page.screenshot({ path: join(SHOTS, `after-low-${land.id}.png`) });
      }
      check(errors.length === 0, `Low: page errors: ${errors.slice(0, 3).join(' | ')}`);
      // Sparkle burst on a correct answer: it must sit behind the answer card (never over the answers).
      await page.evaluate(() => window.__zsqFx.teleport(0, -15.5));
      const belle = page.locator('button', { hasText: 'Belle' });
      await belle.first().waitFor({ timeout: 15000 }).catch(() => {});
      if (await belle.count()) {
        await belle.first().click({ force: true, timeout: 5000 }).catch(() => {});
        const startQuest = page.getByRole('button', { name: /Start Quest|Let's Go/ });
        for (let i = 0; i < 12 && !(await startQuest.count()); i++) {
          await page.getByRole('button', { name: /Next/ }).first().click({ timeout: 3000 }).catch(() => {});
          await wait(300);
        }
        await startQuest.click({ timeout: 5000 }).catch(() => {});
        await wait(1500);
        let burst = false;
        for (let tries = 0; tries < 8 && !burst; tries++) {
          const cards = page.locator('.zsq-modal-wrap .grid button:not([aria-label^="Hear"]):not([disabled])');
          const n = await cards.count();
          if (!n) break;   // not a choice-card round (tiles or sort): skip
          await cards.nth(tries % n).click({ timeout: 3000 }).catch(() => {});
          await wait(250);
          burst = (await page.locator('.zsq-burst').count()) > 0;
          if (!burst) await wait(2600); // a wrong pick unlocks by itself
        }
        if (burst) {
          const z = await page.evaluate(() => {
            const b = document.querySelector('.zsq-burst');
            const card = b.nextElementSibling;
            return [getComputedStyle(b).zIndex, getComputedStyle(card).zIndex];
          });
          check(Number(z[0]) < Number(z[1]), `burst z-index ${z[0]} is not below the card ${z[1]}`);
          await wait(250);
          if (SHOTS) await page.screenshot({ path: join(SHOTS, 'after-correct-burst.png') });
          notes.push('sparkle burst behind the card');
        } else notes.push('sparkle burst not reached (first round was not choice cards)');
      }
      await context.close();
    }
    // Auto: the software GPU here runs well under 50 fps, so Auto must drop to Low within a few seconds.
    {
      const { context, page, errors } = await openGame(browser, null);
      const first = await page.evaluate(() => window.__zsqFx.status());
      check(first.choice === 'auto', `Auto: default choice is ${first.choice}`);
      let dropped = null;
      for (let i = 0; i < 40 && !dropped; i++) { await wait(500); const s = await page.evaluate(() => window.__zsqFx.status()); if (s.level === 'low') dropped = s; }
      const last = await page.evaluate(() => window.__zsqFx.status());
      check(!!dropped && dropped.autoDropped, `Auto never dropped to Low on a slow GPU (last ${JSON.stringify(last)})`);
      if (dropped) notes.push(`Auto dropped to Low at ${dropped.fps} fps`);
      // Parent Corner: pause, open it, pass the grown-up gate, see the picture quality buttons.
      await page.getByRole('button', { name: 'Pause Menu' }).click();
      const pc = page.getByRole('button', { name: /Parent Corner/i }).first();
      await pc.click();   // pause buttons say their name first, then go (second tap or about 2 s)
      await wait(400);
      if (await pc.isVisible().catch(() => false)) await pc.click().catch(() => {});
      await wait(2500);
      const q = page.locator('text=Tap the answer to').first();
      const txt = await q.innerText({ timeout: 5000 }).catch(() => '');
      const m = txt.match(/(\d+)\s*\+\s*(\d+)/);
      if (m) await page.getByRole('button', { name: String(+m[1] + +m[2]), exact: true }).click();
      const radios = page.getByRole('radio');
      check((await radios.count()) === 3, `Parent Corner shows ${await radios.count()} quality buttons, expected 3`);
      const note = await page.getByTestId('quality-note').innerText().catch(() => '');
      check(/switched to Low/.test(note), `Parent Corner note after the drop: "${note}"`);
      if (SHOTS) { await page.getByRole('radiogroup').scrollIntoViewIfNeeded(); await page.screenshot({ path: join(SHOTS, 'parent-corner-quality.png') }); }
      await page.getByRole('radio', { name: 'High' }).click();
      check((await page.evaluate(() => window.__zsqFx.status())).level === 'high', 'Picking High in Parent Corner did not apply');
      check(errors.length === 0, `Auto: page errors: ${errors.slice(0, 3).join(' | ')}`);
      await context.close();
    }
    // Reduce Motion: no errors, Zoe stands still (no breathing scale change).
    {
      const { context, page, errors } = await openGame(browser, 'high', true);
      await wait(1500);
      const sc = [];
      for (let i = 0; i < 6; i++) { sc.push(await page.evaluate(() => window.__zsqFx.playerScale())); await wait(150); }
      check(sc.every((v) => v === sc[0]) && sc[0] > 0, `Reduce Motion: Zoe still breathes (${sc.join(', ')})`);
      check(errors.length === 0, `Reduce Motion: page errors: ${errors.slice(0, 3).join(' | ')}`);
      notes.push('Reduce Motion clean');
      await context.close();
    }
  }
} catch (e) {
  problems.push(`exception: ${e.message.split('\n')[0]}`);
} finally {
  await browser.close();
  server.close();
}
if (problems.length) { console.log(`iphone_check: FAIL ${problems.join('; ')}`); process.exit(1); }
console.log(`iphone_check: PASS ${notes.join('; ')}`);
