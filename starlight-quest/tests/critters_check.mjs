// Nov 17 item 4: little friends in the open grass (pure part + wiring). Plain Node, no WebGL.
import { readFileSync } from 'node:fs';
import { CRITTER_KINDS, CRITTER_COUNT, CRITTER_REACT, CRITTER_NEAR, CRITTER_REST, grassSpots, placeCritters, reactPose, nearReacts } from '../src/flow/critters.js';
import { pathSegments, kingdomLands, distToSegment, PATH_WIDTH, CASTLE_POS, CASTLE_R, WORLD_RADIUS, LAND_DISC_R } from '../js/worldmap.js';
import { pathGemSpots } from '../src/flow/pathgems.js';

const bad = [];
const ok = (c, why) => { if (!c) bad.push(why); };

// 1. Homes: in the open grass, never on a path, in a land, near a princess, the castle or a gem.
const spots = grassSpots();
ok(spots.length > 50, 'plenty of open grass');
ok(JSON.stringify(grassSpots()) === JSON.stringify(spots), 'same homes every time');
const homes = placeCritters(spots);
const total = CRITTER_KINDS.reduce((n, k) => n + CRITTER_COUNT[k], 0);
ok(homes.length === total, `all ${total} friends have a home`);
for (const k of CRITTER_KINDS) ok(homes.filter((h) => h.kind === k).length === CRITTER_COUNT[k], `${k}: all placed`);
ok(['bunny', 'flower', 'butterfly'].every((k) => CRITTER_KINDS.includes(k)), 'butterflies, flowers, bunnies');
const segs = [...pathSegments().map((s) => [s.from, s.to]), ...kingdomLands().map((l) => [{ x: 0, z: 0 }, l.center])];
const gems = pathGemSpots('2026-11-17');
for (const h of homes) {
  const tag = `${h.kind} at (${h.x},${h.z})`;
  // A bunny's hop circle reaches 1.2 out; still well off every path.
  ok(segs.every(([a, b]) => distToSegment(h.x, h.z, a, b) > PATH_WIDTH / 2 + 1.5), `${tag}: off the paths`);
  ok(kingdomLands().every((l) => Math.hypot(h.x - l.center.x, h.z - l.center.z) > LAND_DISC_R && Math.hypot(h.x - l.pad.x, h.z - l.pad.z) > 6), `${tag}: out of the lands, away from the princesses`);
  ok(Math.hypot(h.x - CASTLE_POS.x, h.z - CASTLE_POS.z) > CASTLE_R + 3, `${tag}: away from the castle`);
  ok(Math.hypot(h.x, h.z) < WORLD_RADIUS - 4, `${tag}: inside the world`);
  ok(gems.every((g) => Math.hypot(h.x - g.x, h.z - g.z) > 3), `${tag}: not on a gem`);
}
for (let i = 0; i < homes.length; i++) for (let j = i + 1; j < homes.length; j++) ok(Math.hypot(homes[i].x - homes[j].x, homes[i].z - homes[j].z) >= 6, 'friends spread out');
// The world's own props are skipped.
const blocked = homes.slice(0, 3).map((h) => ({ x: h.x, z: h.z, r: 1 }));
const again = placeCritters(spots, blocked);
ok(again.length === total && again.every((h) => blocked.every((b) => Math.hypot(h.x - b.x, h.z - b.z) > 2.5)), 'props are skipped');

// 2. Reactions: start and end at home, stay small, Reduce Motion only pulses.
for (const k of CRITTER_KINDS) {
  ok(CRITTER_REACT[k] > 0.5 && CRITTER_REACT[k] <= 2, `${k}: short reaction`);
  for (const p of [0, 1]) { const q = reactPose(k, p); ok(Math.abs(q.dx) < 1e-9 && Math.abs(q.dy) < 1e-9 && Math.abs(q.dz) < 1e-9, `${k}: home at ${p}`); }
  for (let p = 0; p <= 1; p += 0.05) {
    const q = reactPose(k, p);
    ok(Math.hypot(q.dx, q.dz) <= 1.6 && q.dy >= 0 && q.dy <= 2, `${k}: stays near home`);
    const c = reactPose(k, p, true);
    ok(c.dx === 0 && c.dy === 0 && c.dz === 0 && c.spin === 0 && c.sy >= 1 && c.sy <= 1.13, `${k}: calm motion only pulses`);
  }
  ok(reactPose(k, 0.33).dy > 0 || reactPose(k, 0.5).dy > 0, `${k}: something visibly happens`);
}
ok(nearReacts(CRITTER_NEAR - 0.1, false, CRITTER_REST) && !nearReacts(CRITTER_NEAR + 0.1, false, 99) && !nearReacts(0.5, true, 99) && !nearReacts(0.5, false, CRITTER_REST - 0.5), 'walk-up reaction rules');

// 3. Wiring: taps only while roaming (not paused, not flying), no colliders, sound per kind, pause freezes.
const nav = readFileSync(new URL('../src/fx/navfx.js', import.meta.url), 'utf8');
const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
ok(/nav\.opts\.isPaused\(\) \|\| nav\.flight \|\| nav\.opts\.getPhase\(\) !== 'roam'/.test(nav), 'taps only while roaming');
ok(!/addCollider|colliders\.push/.test(nav), 'no colliders: never blocks a path');
ok(/critterSound\(kind\)/.test(app) && /SoundFX\.sparkle\(\)/.test(app) && /SoundFX\.pop\(\)/.test(app), 'each kind has a sound');
ok(/if \(paused\) return;/.test(nav) && /updateCritters\(player\.position, dt\)/.test(nav), 'pause holds them still');

if (bad.length) { for (const x of [...new Set(bad)].slice(0, 25)) console.log('  ' + x); console.log(`critters_check: ${new Set(bad).size} problem(s)`); process.exit(1); }
console.log('critters_check ok');
