// Nov 17 item 3: gems on the paths between lands (pure part + save + wiring). Plain Node, no WebGL.
import { readFileSync } from 'node:fs';
import { GEMS_PER_PATH, GEM_PICKUP_R, gemPaths, pathGemSpots, pathGemsGot, collectPathGem, counterFinds, gemLine } from '../src/flow/pathgems.js';
import { kingdomLands, pathSegments, distToSegment, PATH_WIDTH, CASTLE_POS, CASTLE_R, WORLD_RADIUS, PLAZA_R } from '../js/worldmap.js';
import { merge, sanitizePathGems } from '../js/save.js';
import { findsTotal } from '../js/treasures.js';
import { openLandIds } from '../js/worldmap.js';

const bad = [];
const ok = (c, why) => { if (!c) bad.push(why); };
const D1 = '2026-11-17', D2 = '2026-11-18';

// 1. Three to five on every path between two places, on the path, clear of the princesses, the plaza and the castle.
const paths = gemPaths();
ok(paths.length >= 10, `paths between places: ${paths.length}`);
ok(GEMS_PER_PATH >= 3 && GEMS_PER_PATH <= 5, 'three to five per path');
const spots = pathGemSpots(D1);
ok(spots.length === paths.length * GEMS_PER_PATH, 'every path has its gems');
ok(new Set(spots.map((s) => s.id)).size === spots.length, 'ids are unique');
ok(spots.every((s) => /^p\d{1,2}-\d$/.test(s.id)), 'id shape');
const segs = [...pathSegments().map((s) => [s.from, s.to]), ...kingdomLands().filter((l) => l.open).map((l) => [{ x: 0, z: 0 }, l.pad])];
for (const s of spots) {
  const onPath = segs.some(([a, b]) => distToSegment(s.x, s.z, a, b) <= PATH_WIDTH / 2);
  ok(onPath, `${s.id} is on a path`);
  ok(kingdomLands().every((l) => Math.hypot(s.x - l.pad.x, s.z - l.pad.z) > 3.5), `${s.id} is outside every talk ring`);
  ok(Math.hypot(s.x, s.z) > PLAZA_R, `${s.id} is outside the plaza`);
  ok(Math.hypot(s.x - CASTLE_POS.x, s.z - CASTLE_POS.z) > CASTLE_R + 1, `${s.id} is clear of the castle`);
  ok(Math.hypot(s.x, s.z) < WORLD_RADIUS - 2, `${s.id} is inside the world`);
}
for (let day = 1; day <= 60; day++) {   // two months of days: never two gems on top of each other
  const ds = pathGemSpots(`2027-0${1 + Math.floor((day - 1) / 30)}-${String(1 + ((day - 1) % 28)).padStart(2, '0')}`);
  for (let i = 0; i < ds.length; i++) for (let j = i + 1; j < ds.length; j++) {
    ok(Math.hypot(ds[i].x - ds[j].x, ds[i].z - ds[j].z) > GEM_PICKUP_R * 1.1, `${ds[i].id} and ${ds[j].id} too close`);
  }
}
ok(JSON.stringify(pathGemSpots(D1)) === JSON.stringify(spots), 'same spots all day');
ok(JSON.stringify(pathGemSpots(D2)) !== JSON.stringify(spots), 'new spots tomorrow');

// 2. Saving: picked up once, saved, counted in the Treasure Book's Gems, cleared on a new day.
{
  const save = merge({});
  ok(JSON.stringify(save.pathGems) === JSON.stringify({ day: '', got: [] }), 'fresh save has no path gems');
  ok(collectPathGem(save, spots[0].id, D1) && !collectPathGem(save, spots[0].id, D1), 'picked up once');
  ok(!collectPathGem(save, 'shell-1', D1) && !collectPathGem(save, 'p1-x', D1), 'bad ids are refused');
  ok(collectPathGem(save, spots[1].id, D1), 'second gem');
  ok(pathGemsGot(save, D1).length === 2 && pathGemsGot(save, D2).length === 0, 'got today only');
  ok(save.treasures.total.gem === 2, 'each one adds a Gem to the Treasure Book');
  ok(save.treasures.got.length === 0, "land treasures' list untouched (its 50-id cap stays safe)");
  const reloaded = merge(JSON.parse(JSON.stringify(save)));
  ok(JSON.stringify(reloaded.pathGems) === JSON.stringify(save.pathGems), 'survives save and reload');
  ok(collectPathGem(save, spots[0].id, D2) && pathGemsGot(save, D2).length === 1, 'a new day starts fresh');
  ok(sanitizePathGems({ day: 'x', got: ['p1-0', 'p1-0', 5, 'nope'] }).got.length === 1 && sanitizePathGems(null).day === '', 'sanitize heals junk');
}

// 3. The counter: land treasures plus path gems, never more than its total (no new currency, still "of 50").
const total = findsTotal(openLandIds());
ok(total === 50, `counter total stays ${total}`);
ok(counterFinds(3, 4, total) === 7 && counterFinds(48, 10, total) === total && counterFinds(0, 0, total) === 0, 'counter adds and stops at the total');
ok(/of 50 today/.test(gemLine(7, 50)), 'gem line');

// 4. Wiring.
const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
const nav = readFileSync(new URL('../src/fx/navfx.js', import.meta.url), 'utf8');
ok(/collectPathGem\(Save\.data, id, day\)/.test(app) && /Save\.save\(\);\s*SoundFX\.chime\(\);/.test(app), 'pickup saves and chimes');
ok(!/findsToday\(Save\.data, day, openLands\)\)/.test(app) && /setTreasuresToday\(finds\(/.test(app), 'every counter update includes path gems');
ok(/InstancedMesh\(geo, mat, GEM_MAX\)/.test(nav), 'gems are one draw call');
ok(/bursts\.fire\(g\.x/.test(nav), 'sparkle on pickup');
ok(/if \(paused\) return;/.test(nav), 'pause holds gems and pickups still');

if (bad.length) { for (const x of [...new Set(bad)].slice(0, 25)) console.log('  ' + x); console.log(`pathgems_check: ${new Set(bad).size} problem(s)`); process.exit(1); }
console.log('pathgems_check ok');
