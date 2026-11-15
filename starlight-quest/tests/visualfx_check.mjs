// Visual polish checks: picture quality rules (Auto / High / Low), the frame-rate guard, land moods,
// the GPU readback guard, Reduce Motion, and that the effects never touch the engine or the answer cards.
// Usage: node starlight-quest/tests/visualfx_check.mjs
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  QUALITY_KEY, QUALITY_CHOICES, PRESETS, readQuality, writeQuality, effectiveLevel, qualityNote,
  makeFpsGuard, LAND_MOODS, LAND_CENTERS, moodWeights, moodAt,
} from '../src/flow/quality.js';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
let passed = 0, failed = 0;
const ok = (cond, msg) => { if (cond) passed++; else { failed++; console.log('  FAIL', msg); } };
const read = (rel) => readFileSync(join(root, rel), 'utf8');

// --- Quality choice --------------------------------------------------------------------------------
const mem = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), m }; };
{
  const s = mem();
  ok(readQuality(s) === 'auto', 'nothing saved reads as Auto');
  ok(writeQuality(s, 'low') === 'low' && readQuality(s) === 'low', 'Low is saved and read back');
  ok(s.m.get(QUALITY_KEY) === 'low', 'saved under zsq_quality_v1');
  ok(writeQuality(s, 'ultra') === 'auto' && readQuality(s) === 'auto', 'an unknown value falls back to Auto');
  ok(readQuality({ getItem() { throw new Error('private mode'); } }) === 'auto', 'storage that throws reads as Auto');
  ok(writeQuality(null, 'high') === 'high', 'no storage still returns the choice');
  ok(QUALITY_CHOICES.join() === 'auto,high,low', 'three choices: Auto, High, Low');
}
ok(effectiveLevel('auto', false) === 'high' && effectiveLevel('auto', true) === 'low', 'Auto is High until it drops');
ok(effectiveLevel('high', true) === 'high' && effectiveLevel('low', false) === 'low', 'High and Low are fixed');
ok(PRESETS.high.bloom && !PRESETS.low.bloom, 'bloom on High, off on Low');
ok(PRESETS.high.shadows && PRESETS.low.shadows && PRESETS.low.shadowSize < PRESETS.high.shadowSize, 'one shadow map, smaller on Low');
ok(PRESETS.high.shadowSize <= 1024, 'shadow map at most 1024 (phone memory)');
ok(/switched to Low/.test(qualityNote('auto', 'low')) && /High/.test(qualityNote('auto', 'high')), 'Parent Corner note explains Auto');

// --- Frame-rate guard (Auto drops when under 50 fps for about 3 s) ------------------------------------
const run = (guard, fps, ms, start = 0) => {
  let t = start, at = -1;
  while (t < start + ms) { t += 1000 / fps; if (guard.frame(t) && at < 0) at = t; }
  return { at, t };
};
{
  const g = makeFpsGuard();
  const r = run(g, 40, 10000);
  ok(r.at > 0, 'steady 40 fps drops to Low');
  ok(r.at >= 2500 + 3000 && r.at <= 2500 + 3000 + 700, `drop comes about 3 s after the warm-up (at ${Math.round(r.at)} ms)`);
  ok(g.tripped && !g.frame(r.t + 20), 'it drops once, then stays quiet');
}
ok(run(makeFpsGuard(), 60, 15000).at < 0, '60 fps never drops');
ok(run(makeFpsGuard(), 52, 15000).at < 0, '52 fps never drops');
{
  // 2 s slow, a smooth stretch, 2 s slow: never 3 s in a row, so no drop.
  const g = makeFpsGuard();
  let r = run(g, 60, 3000);
  r = run(g, 40, 2000, r.t); const a = r.at;
  r = run(g, 60, 1500, r.t);
  r = run(g, 40, 2000, r.t);
  ok(a < 0 && r.at < 0, 'short slow patches do not drop');
}
{
  // A covered world (no frames for a while) restarts the count, and a hidden tab resets it.
  const g = makeFpsGuard();
  let r = run(g, 60, 3000);
  r = run(g, 40, 2500, r.t);
  r = run(g, 40, 2500, r.t + 5000);   // 5 s pause in between
  ok(r.at < 0, 'a pause between two slow stretches does not add them up');
  g.frame(r.t + 10, true);
  ok(!g.tripped, 'hidden tab never drops');
}

// --- Land moods -----------------------------------------------------------------------------------------
ok(Object.keys(LAND_CENTERS).length === 10, `10 land centres (4 inner + 6 kingdoms), got ${Object.keys(LAND_CENTERS).length}`);
for (const id of Object.keys(LAND_CENTERS)) ok(LAND_MOODS[id], `${id} has its own mood colours`);
ok(LAND_MOODS.hub.horizon === 0xdff3ff && LAND_MOODS.hub.zenith === 0xbcd0f7, 'the hub keeps the original sky');
{
  const hub = moodWeights(0, 0);
  ok(hub.hub === 1, 'the hub centre is pure hub mood');
  for (const [id, c] of Object.entries(LAND_CENTERS)) {
    const w = moodWeights(c.x, c.z);
    ok(Math.abs(w[id] - 1) < 1e-9 && Math.abs(w.hub) < 1e-9, `${id} centre is its own mood`);
    ok(moodAt(c.x, c.z).fog === LAND_MOODS[id].fog, `${id} fog colour at its centre`);
  }
  const mid = moodWeights(0, 15);
  const sum = Object.values(mid).reduce((a, b) => a + b, 0);
  ok(mid.meadow > 0 && mid.hub > 0 && Math.abs(sum - 1) < 1e-9, 'between hub and meadow the colours blend (weights add to 1)');
  for (let a = 0; a < 360; a += 15) {
    const w = moodWeights(Math.cos(a) * 40, Math.sin(a) * 40);
    const s = Object.values(w).reduce((x, y) => x + y, 0);
    if (Math.abs(s - 1) > 1e-9 || Object.values(w).some((v) => v < -1e-9)) { ok(false, `weights broken at angle ${a}`); break; }
  }
  ok(true, 'weights add to 1 all round the outer ring');
}

// --- Source guards --------------------------------------------------------------------------------------
const fx = read('src/fx/worldfx.js');
const srcFiles = [];
const walk = (d) => { for (const n of readdirSync(join(root, d))) { const p = join(d, n); if (statSync(join(root, p)).isDirectory()) walk(p); else if (/\.(js|tsx?|mjs)$/.test(n)) srcFiles.push(p); } };
walk('src');
for (const f of srcFiles) {
  const t = read(f).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');   // code only, not comments
  ok(!/readPixels|getImageData|preserveDrawingBuffer|toDataURL/.test(t), `${f}: no GPU/canvas readback`);
  ok(!/fetch\(|XMLHttpRequest|sendBeacon|WebSocket/.test(t) || !/fx\//.test(f), `${f}: no network calls in the effects layer`);
}
ok(/ACESFilmicToneMapping/.test(fx) && /SRGBColorSpace/.test(fx), 'ACES tone mapping with sRGB output');
ok(/PCFSoftShadowMap/.test(fx) && /castShadow/.test(fx), 'soft shadow map');
ok(/HemisphereLight|isHemisphereLight/.test(fx) && /isDirectionalLight/.test(fx), 'warm key light and hemisphere fill');
ok(/prefers-reduced-motion: reduce/.test(fx), 'reads Reduce Motion');
{
  // Under Reduce Motion: no breathing, no sway, no water motion, no camera ease.
  const before = fx.slice(fx.indexOf('function before('), fx.indexOf('function after('));
  ok(/const still = calm\(\)/.test(before), 'before() checks Reduce Motion each frame');
  ok(/if \(still\) \{ g\.scale\.setScalar\(c\.base\);/.test(before), 'Reduce Motion: characters stand still (no breathing or sway)');
  ok(/U\.water\.value = still \? 0/.test(before) && /U\.time\.value = still \? 0/.test(before), 'Reduce Motion: water shimmer off');
  ok(/if \(still \|\| !smReady/.test(before), 'Reduce Motion: no camera ease');
}
ok(/let guard = makeFpsGuard\(\)/.test(fx) && /rearm\(\) \{ guard = makeFpsGuard\(\); \}/.test(fx) && /state\.fx\.rearm\(\)/.test(fx),
  'choosing a level again re-arms the same guard the render loop uses (Auto can drop again)');
ok(/colorWrite: false/.test(fx) && /scene\.overrideMaterial = depthOnly;\s*render\(scene, camera\);[\s\S]{0,120}camera\.layers\.set\(GLOW_LAYER\);\s*render\(scene, camera\);/.test(fx),
  'bloom draws a depth-only pass of the whole scene first, so hidden glows stay hidden');
ok(/fxdebug/.test(fx) && /\[\?&\]fxdebug\\b/.test(fx), 'the test hook only exists with ?fxdebug');
ok(!/from '\.\.\/\.\.\/js\//.test(fx) && !/js\/world\.js/.test(fx.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')), 'the effects layer does not import the engine directly');

// App installs it before the world is created.
const app = read('src/App.tsx');
ok(app.indexOf('installWorldFx();') > 0 && app.indexOf('installWorldFx();') < app.indexOf('createWorld(containerRef.current'), 'installWorldFx runs before createWorld');

// Parent Corner: three choices with big buttons.
const pc = read('src/components/ParentCorner.tsx');
ok(/Picture quality/.test(pc) && /QUALITY_CHOICES\.map/.test(pc) && /setFxQuality\(c\)/.test(pc), 'Parent Corner has the Auto / High / Low picker');
ok(/role="radio"/.test(pc) && /aria-checked/.test(pc), 'the picker reads as a radio group');

// Sparkle burst: behind the card (card z-10, burst z-0), off under Reduce Motion, only on a correct answer.
const ch = read('src/components/ChallengeModal.tsx');
const css = read('src/styles.css');
ok(/feedback\.kind === 'correct' && \(\s*<div className="zsq-burst"/.test(ch), 'burst only on a correct answer');
ok(ch.indexOf('zsq-burst') < ch.indexOf('relative z-10 my-auto'), 'burst is drawn before (behind) the card');
ok(/\.zsq-burst\{[^}]*z-index:0/.test(css) && /\.zsq-burst\{[^}]*pointer-events:none/.test(css), 'burst sits at z 0 and never takes taps');
ok(/prefers-reduced-motion:reduce\)\{\.zsq-burst\{display:none;\}\}/.test(css), 'Reduce Motion hides the burst');

// Cache bumped (the service worker must pick up the new files).
const sw = read('sw.js');
ok(/CACHE_VERSION = 'v47-20261115'/.test(sw), 'CACHE_VERSION bumped to v47-20261115');

console.log(`visualfx_check: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
