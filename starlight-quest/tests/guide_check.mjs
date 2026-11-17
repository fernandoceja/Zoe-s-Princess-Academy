// Nov 17 item 1: the guiding sparkle trail to today's princess (pure part). Plain Node, no WebGL.
import { readFileSync } from 'node:fs';
import { GUIDE, guidePad, guidePlan, firstAhead, isLost, guideArrived, guideState, stepGuide, sparkleGlow, guideColliders } from '../src/flow/guide.js';
import { kingdomLands, CASTLE_POS, CASTLE_R } from '../js/worldmap.js';

const bad = [];
const ok = (c, why) => { if (!c) bad.push(why); };
const d = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

// 1. A trail to every princess from the hub and from far out on the grass, ending at her and never through the castle.
const starts = [{ x: 0, z: 4 }, { x: -30, z: 30 }, { x: 40, z: -10 }];
for (const l of kingdomLands()) {
  const pad = guidePad(l.npc);
  ok(pad && d(pad, l.pad) < 1e-9, `${l.npc}: pad`);
  for (const s of starts) {
    const plan = guidePlan(s, l.npc);
    const tag = `${l.npc} from (${s.x},${s.z})`;
    ok(plan.route.length >= 2 && plan.dots.length > 0, `${tag}: has sparkles`);
    ok(d(plan.route[plan.route.length - 1], pad) < 0.01, `${tag}: ends at her`);
    for (let i = 1; i < plan.dots.length; i++) ok(d(plan.dots[i], plan.dots[i - 1]) <= GUIDE.spacing + 1e-6, `${tag}: no gaps`);
    ok(plan.dots.every((p) => Math.hypot(p.x - CASTLE_POS.x, p.z - CASTLE_POS.z) >= CASTLE_R - 0.05), `${tag}: never through the castle`);
    ok(!isLost(plan, s.x, s.z), `${tag}: she starts on it`);
  }
}
ok(guidePad('nobody') === null && guidePad(null) === null, 'unknown princess has no pad');
ok(guidePlan({ x: 0, z: 4 }, 'nobody').dots.length === 0, 'no trail to nowhere');
ok(!guideColliders('belle').some((c) => Math.abs(c.x - guidePad('belle').x) < 1e-9 && Math.abs(c.z - guidePad('belle').z) < 1e-9), 'her own spot is not an obstacle');

// 2. It eats behind her and is worked out again when she wanders off.
{
  const plan = guidePlan({ x: 0, z: 4 }, 'elsa');
  const mid = plan.dots[Math.floor(plan.dots.length / 2)];
  const f0 = firstAhead(plan, 0, 4), f1 = firstAhead(plan, mid.x, mid.z);
  ok(f0 <= 1 && f1 > f0 && f1 < plan.dots.length, 'sparkles behind her are gone');
  ok(isLost(plan, mid.x + GUIDE.lost + 2, mid.z + GUIDE.lost + 2) && !isLost(plan, mid.x + 1, mid.z), 'lost only when well off it');
  ok(isLost(null, 0, 0), 'no plan counts as lost');
}

// 3. Life: fades in, fades out when she gets there, stays out until today's princess changes; paused (dt 0) = still.
{
  const s = guideState();
  stepGuide(s, { target: 'belle', show: true, dt: 0.1 });
  ok(s.target === 'belle' && s.alpha > 0 && s.alpha < 1, 'fades in');
  for (let i = 0; i < 20; i++) stepGuide(s, { target: 'belle', show: true, dt: 0.1 });
  ok(s.alpha === 1, 'fully on');
  const before = JSON.stringify(s);
  for (let i = 0; i < 50; i++) stepGuide(s, { target: 'belle', arrived: true, show: true, dt: 0 });
  ok(JSON.stringify(s) === before, 'paused: nothing changes, even standing next to her');
  stepGuide(s, { target: 'belle', show: false, dt: 0.1 });
  ok(s.alpha < 1 && !s.reached, 'hidden (talking, map trail): fades, not reached');
  stepGuide(s, { target: 'belle', show: true, arrived: true, dt: 0.1 });
  ok(s.reached, 'reached');
  for (let i = 0; i < 30; i++) stepGuide(s, { target: 'belle', show: true, arrived: false, dt: 0.1 });
  ok(s.alpha === 0 && s.reached, 'fades out and stays out after she reached her (even walking away)');
  stepGuide(s, { target: 'elsa', show: true, dt: 0.1 });
  ok(s.target === 'elsa' && !s.reached && s.alpha > 0, 'a new princess today starts a new trail');
  stepGuide(s, { target: null, show: true, dt: 0.1 });
  ok(s.target === null, 'no princess today: no target');
  for (let i = 0; i < 30; i++) stepGuide(s, { target: null, show: true, dt: 0.1 });
  ok(s.alpha === 0, 'no princess today: no trail');
}
ok(guideArrived(1, 0, { x: 0, z: 0 }) && !guideArrived(GUIDE.arriveR + 0.5, 0, { x: 0, z: 0 }), 'arrival radius');

// 4. Glow stays in 0..1, the ends are soft, calm motion holds still.
for (let i = 0; i < 40; i++) { const g = sparkleGlow(i, 40, 1.3, false); ok(g >= 0 && g <= 1, 'glow in range'); }
ok(sparkleGlow(39, 40, 0, true) < sparkleGlow(20, 40, 0, true), 'last sparkle dims');
ok(sparkleGlow(5, 40, 0, true) === sparkleGlow(5, 40, 9, true), 'calm motion: no wave');

// 5. Wiring: the App sets it from today's princess (boot and after a quest), and pause freezes it.
const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
const nav = readFileSync(new URL('../src/fx/navfx.js', import.meta.url), 'utf8');
ok((app.match(/navApi\.setToday\(/g) || []).length >= 2, 'App sets today at boot and after a quest');
ok(/setTodayStar\(\(out\.todayStar/.test(app), 'the Today chip follows a new princess after a quest');
ok(/isPaused: \(\) => pausedRef\.current/.test(app), 'nav layer reads pause');
ok(/if \(paused\) return;/.test(nav), 'a paused frame changes nothing');
ok(!/readPixels|getImageData|fetch\(|XMLHttpRequest/.test(nav), 'no readbacks, no network');

if (bad.length) { for (const x of [...new Set(bad)].slice(0, 25)) console.log('  ' + x); console.log(`guide_check: ${new Set(bad).size} problem(s)`); process.exit(1); }
console.log('guide_check ok');
