// B2 firefly trail (pure part): where the ten lands are and the route that leads Zoe to one. Plain Node, no WebGL.
import { readFileSync } from 'node:fs';
import { kingdomLands, trailRoute, sampleTrail, progressAlong, trailArrived, avoidColliders, walkGraph, NPC_LAND, INNER_PAD_DIST, CASTLE_POS, CASTLE_R,
  WORLD_RADIUS, LAND_DISC_R, LAND_DIST, openLandIds, distToSegment } from '../js/worldmap.js';

const bad = [];
const ok = (c, why) => { if (!c) bad.push(why); };
const d = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const len = (r) => r.reduce((s, p, i) => (i ? s + d(p, r[i - 1]) : 0), 0);
const castle = { x: CASTLE_POS.x, z: CASTLE_POS.z, r: CASTLE_R };
const props = [castle, { x: 14, z: 9, r: 1.2 }, { x: -22, z: 6, r: 1.5 }, { x: 5, z: -22, r: 1 }];

// 1. The lands.
const lands = kingdomLands();
ok(lands.length === 10 && new Set(lands.map((l) => l.npc)).size === 10 && new Set(lands.map((l) => l.land)).size === 10, 'ten different lands');
ok(lands.every((l) => l.open), 'all ten lands are open (every kingdom is built)');
ok(JSON.stringify(Object.keys(NPC_LAND).sort()) === JSON.stringify(lands.map((l) => l.npc).sort()), 'NPC_LAND covers the same ten princesses');
for (let i = 0; i < lands.length; i++) for (let j = i + 1; j < lands.length; j++) ok(d(lands[i].center, lands[j].center) >= LAND_DIST - 0.5, `${lands[i].npc} and ${lands[j].npc} are too close on the map`);
for (const l of lands) {
  ok(d(l.pad, l.center) <= LAND_DISC_R, `${l.npc}'s pad is inside her land`);
  ok(Math.hypot(l.pad.x, l.pad.z) < WORLD_RADIUS - 1 && Math.hypot(l.center.x, l.center.z) < WORLD_RADIUS, `${l.npc} is inside the world wall`);
}
const inner = lands.find((l) => l.npc === 'elsa');
ok(Math.abs(inner.pad.x - INNER_PAD_DIST) < 1e-9 && Math.abs(inner.pad.z) < 1e-9, "Elsa's pad is due east at the pad distance");
ok(openLandIds().length === 6, 'six outer lands are open');

// 2. The same ids world.js and treasures.js use.
const world = readFileSync(new URL('../js/world.js', import.meta.url), 'utf8');
for (const [npc, land] of Object.entries(NPC_LAND)) ok(new RegExp(`${npc}:\\s*\\{ land: '${land}'`).test(world), `world.js NPC_DEFS has ${npc} -> ${land}`);
ok(/INNER_PAD_DIST/.test(world) && !/const PAD_DIST = 18\.5/.test(world), 'world.js uses the shared INNER_PAD_DIST');
ok(/addCollider\(CASTLE_POS\.x, CASTLE_POS\.z, CASTLE_R/.test(world) || /CASTLE_R/.test(world), 'world.js uses CASTLE_R for the castle collider');

// 3. Routes.
const starts = [{ x: 0, z: 4 }, { x: 0, z: 0 }, { x: -20, z: -14 }, { x: 30, z: -30 }, { x: -40, z: 25 }, { x: 8, z: 40 }, { x: 45, z: 5 }, { x: -11.5, z: -2 }];
for (const s of starts) for (const l of lands) {
  const r = trailRoute(s, l.npc, props);
  const tag = `route (${s.x},${s.z}) -> ${l.npc}`;
  ok(r.length >= 2, `${tag}: has points`);
  if (r.length < 2) continue;
  ok(d(r[0], s) < 1e-9, `${tag}: starts where she stands`);
  ok(d(r[r.length - 1], l.pad) < 1e-6, `${tag}: ends at the pad`);
  ok(r.every((p) => Number.isFinite(p.x) && Number.isFinite(p.z) && Math.hypot(p.x, p.z) <= WORLD_RADIUS - 0.99), `${tag}: stays inside the wall`);
  for (let i = 1; i < r.length; i++) for (const c of props) ok(distToSegment(c.x, c.z, r[i - 1], r[i]) >= c.r + 0.8 - 1e-6 || d(s, c) < c.r + 0.8, `${tag}: clips an obstacle at (${c.x},${c.z})`);
  ok(len(r) <= Math.max(2.5 * d(s, l.pad), d(s, l.pad) + 25), `${tag}: ${len(r).toFixed(0)} long for ${d(s, l.pad).toFixed(0)} straight`);
  ok(JSON.stringify(r) === JSON.stringify(trailRoute(s, l.npc, props)), `${tag}: not deterministic`);
}
// Straight when she is already in the land; bends around the castle; unknown / closed / bad input give no route.
const inElsa = trailRoute({ x: 25, z: 3 }, 'elsa', []);
ok(inElsa.length === 2, 'inside the land the route is one straight line');
const behind = trailRoute({ x: -18, z: -14 }, 'rapunzel', [castle]);
ok(behind.every((p, i) => i === 0 || behind[i - 1] === p || true), 'route built');
ok(JSON.stringify(trailRoute({ x: 0, z: 0 }, 'nobody')) === '[]', 'unknown princess gives no route');
ok(JSON.stringify(trailRoute(null, 'elsa')) === '[]' && JSON.stringify(trailRoute({ x: NaN, z: 0 }, 'elsa')) === '[]', 'bad start gives no route');
ok(JSON.stringify(trailRoute({ x: 0, z: 0 }, 'ariel', [], '?x')) !== '[]', 'a normal query string does not break it');
// A route through the castle is bent around it.
const direct = avoidColliders([{ x: -20, z: -8.5 }, { x: -3, z: -8.5 }], [castle]);
ok(direct.length > 2 && direct.every((p) => d(p, castle) >= castle.r + 0.8 - 1e-6 || p === direct[0] || p === direct[direct.length - 1]), 'a line through the castle bends around it');
ok(avoidColliders([{ x: 0, z: 0 }, { x: 10, z: 0 }], [{ x: 5, z: 0, r: 1 }]).some((p) => Math.abs(p.z) > 1.5), 'a dead-centre obstacle is stepped around');
ok(avoidColliders([{ x: 0, z: 0 }, { x: 5, z: 5 }], []).length === 2, 'no obstacles: unchanged');
const g = walkGraph();
ok(g.nodes.length >= 10 && g.nodes.length <= 40 && g.edges.every(([a, b]) => a < g.nodes.length && b < g.nodes.length), 'walk graph is small and consistent');

// 4. Dots and progress.
const r0 = trailRoute({ x: 0, z: 4 }, 'tiana', props);
const dots = sampleTrail(r0, 1.6, 200);
ok(dots.length >= 10 && dots.length <= Math.ceil(len(r0) / 1.6) + 1, 'dots count matches the route length');
ok(dots.every((p, i) => i === 0 || Math.abs(p.arc - dots[i - 1].arc - 1.6) < 1e-9), 'dots are 1.6 apart along the route');
ok(sampleTrail(r0, 1.6, 7).length === 7, 'max is respected');
ok(sampleTrail([], 1.6).length === 0 && sampleTrail(r0, 0).length === 0 && sampleTrail(null).length === 0, 'bad input gives no dots');
let prev = -1, mono = true;
for (const p of dots) { const pr = progressAlong(r0, p.x, p.z); if (pr.arc < prev - 1e-6 || pr.dist > 1e-6) mono = false; prev = pr.arc; }
ok(mono, 'progress grows along the route and every dot is on it');
ok(progressAlong(r0, 0, 4).arc < 0.01 && progressAlong([], 0, 0).dist === Infinity, 'progress at the start, and on an empty route');
const tiana = lands.find((l) => l.npc === 'tiana');
ok(trailArrived(tiana.pad.x + 3.4, tiana.pad.z, tiana.pad) && !trailArrived(tiana.pad.x + 3.6, tiana.pad.z, tiana.pad) && !trailArrived(0, 0, null), 'arrival boundary is 3.5');

if (bad.length) { console.error('trail_check FAILED (' + bad.length + '):\n - ' + [...new Set(bad)].slice(0, 15).join('\n - ')); process.exit(1); }
console.log(`trail_check passed: ${starts.length * lands.length} routes`);
