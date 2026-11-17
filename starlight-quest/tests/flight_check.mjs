// Nov 17 item 2: fly to a land from the Kingdom Map (pure part + wiring). Plain Node, no WebGL.
import { readFileSync } from 'node:fs';
import { FLIGHT, landingSpot, flightFrame, flyAskSay, flewLine, flewSay, FLY_TEXT } from '../src/flow/flight.js';
import { kingdomLands } from '../js/worldmap.js';
const NPC_INTERACT_DIST = Number((readFileSync(new URL('../js/world.js', import.meta.url), 'utf8').match(/const NPC_INTERACT_DIST = ([\d.]+)/) || [])[1]);

const bad = [];
const ok = (c, why) => { if (!c) bad.push(why); };
const clean = (t) => typeof t === 'string' && t.length > 0 && !/[\p{Extended_Pictographic}\d&]/u.test(t);

// 1. Quick: well under 2 seconds, and she is moved while the veil is full.
ok(FLIGHT.total < 2 && FLIGHT.total >= 1, 'flight lasts 1-2 s');
ok(FLIGHT.peak > 0 && FLIGHT.peak < FLIGHT.total, 'peak inside the flight');
const atPeak = flightFrame(FLIGHT.peak);
ok(atPeak.moved && Math.abs(atPeak.cover - 1) < 1e-9, 'moved exactly when the veil is full');
ok(!flightFrame(FLIGHT.peak - 0.01).moved, 'not moved before the peak');
ok(flightFrame(0).cover === 0 && flightFrame(0).lift === 0 && !flightFrame(0).moved, 'starts on the ground, no veil');
const end = flightFrame(FLIGHT.total);
ok(end.done && end.cover === 0 && end.lift === 0 && end.moved, 'ends landed, veil gone');
let prev = -1;
for (let t = 0; t <= FLIGHT.peak; t += 0.05) { const c = flightFrame(t).cover; ok(c >= prev - 1e-9, 'veil grows to the peak'); prev = c; }
for (let t = 0; t <= FLIGHT.total + 0.2; t += 0.05) {
  const f = flightFrame(t);
  ok(f.cover >= 0 && f.cover <= 1 && f.lift >= 0 && f.lift <= FLIGHT.height + 1e-9, `frame ${t.toFixed(2)} in range`);
  ok(flightFrame(t, true).lift === 0, 'Reduce Motion: no floating up');
}

// 2. She lands right by every princess, on the hub side, inside the world.
for (const l of kingdomLands()) {
  const s = landingSpot(l.npc);
  ok(s, `${l.npc}: has a landing spot`);
  const d = Math.hypot(s.x - l.pad.x, s.z - l.pad.z);
  ok(Math.abs(d - FLIGHT.land) < 1e-6, `${l.npc}: lands ${FLIGHT.land} from her`);
  ok(Math.hypot(s.x, s.z) < Math.hypot(l.pad.x, l.pad.z), `${l.npc}: lands on the hub side`);
  ok(d < NPC_INTERACT_DIST - 0.2 && d > 1.6, `${l.npc}: lands inside her talk ring, clear of her`);
}
ok(landingSpot('nobody') === null, 'unknown land: no flight');

// 3. Words she hears are clean.
for (const l of kingdomLands()) ok(clean(flyAskSay(l.npc)) && clean(flewSay(l.npc)) && flewLine('X').includes('X'), 'flight words');
ok(FLY_TEXT.fly && FLY_TEXT.walk, 'button words');

// 4. Wiring: the map offers Fly and Walk; the App flies or walks; pause freezes the flight and the fireflies.
const map = readFileSync(new URL('../src/components/KingdomMap.tsx', import.meta.url), 'utf8');
const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
const nav = readFileSync(new URL('../src/fx/navfx.js', import.meta.url), 'utf8');
const world = readFileSync(new URL('../js/world.js', import.meta.url), 'utf8');
ok(/go\(armedLand\.npc, 'fly'\)/.test(map) && /go\(armedLand\.npc, 'walk'\)/.test(map), 'map has Fly and Walk buttons');
ok(/min-h-\[60px\]/.test(map), 'big buttons');
ok(/mode === 'fly'/.test(app) && /navApi\.flyTo\(/.test(app) && /showTrail\(npcId\)/.test(app), 'App flies, and still walks with the fireflies');
ok(/navApi\.isFlying\(\)/.test(app), 'no map or talk while flying');
ok(/freezeTrail\?\.\(paused\)/.test(app) && /if \(!trailFrozen\) updateTrail\(dt, t\);/.test(world), 'pause holds the firefly trail still');
ok(/if \(paused\) return;/.test(nav) && /updateFlight\(player, dt\)/.test(nav), 'pause holds the flight still');
ok(!/className="[^"]*zsq-modal-wrap/.test(nav), 'the flight veil is not a world cover');
ok(/if \(!paused && navApi\.isFlying\(\)\) worldRef\.current\?\.setInputEnabled\(false\);/.test(app), 'resuming mid-flight keeps walking off until she lands');

if (bad.length) { for (const x of [...new Set(bad)].slice(0, 25)) console.log('  ' + x); console.log(`flight_check: ${new Set(bad).size} problem(s)`); process.exit(1); }
console.log('flight_check ok');
