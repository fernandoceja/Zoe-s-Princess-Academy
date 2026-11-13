// B2 Kingdom Map (pure part): words, picture per land, positions, and that no two 60px tap targets overlap on a phone-size map.
import { readFileSync } from 'node:fs';
import { kingdomLands } from '../js/worldmap.js';
import { PRINCESSES } from '../js/quests.js';
import { KINGDOM_MAP, LAND_ICON, MAP_HALF, MIN_TARGET_PX, mapPercent, mapSay, landSay, followLine, followSay, arrivedLine, landLook, landLabel, mapLayout }
  from '../src/flow/kingdommap.js';

const bad = [];
const ok = (c, why) => { if (!c) bad.push(why); };
const clean = (t) => typeof t === 'string' && t.length > 0 && !/[\p{Extended_Pictographic}\d&]/u.test(t);

const lands = kingdomLands();
ok(lands.length === 10, 'ten lands');
for (const l of lands) {
  ok(LAND_ICON[l.land], `icon for ${l.land}`);
  ok(PRINCESSES[l.npc] && PRINCESSES[l.npc].landName, `landName for ${l.npc}`);
  const p = mapPercent(l.center.x, l.center.z);
  ok(p.left >= 0 && p.left <= 100 && p.top >= 0 && p.top <= 100, `${l.npc} is on the map`);
  ok(l.center.x > -MAP_HALF && l.center.x < MAP_HALF && l.center.z > -MAP_HALF && l.center.z < MAP_HALF, `${l.npc} is inside the map range`);
}
ok(Object.keys(LAND_ICON).length === 10, 'ten icons');

// Words she hears have no emoji or digits.
ok(clean(mapSay('Meadow')) && clean(mapSay('')), 'mapSay is clean');
for (const l of lands) {
  const name = PRINCESSES[l.npc].landName;
  ok(clean(landSay(name, true)) && clean(landSay(name, false)), `landSay ${name}`);
  ok(clean(followSay(name)), `followSay ${name}`);
  ok(clean(arrivedLine(name)), `arrivedLine ${name}`);
  ok(followLine(name).includes(name), 'follow line names the land');
}
ok(clean(KINGDOM_MAP.heading) && clean(KINGDOM_MAP.sub) && clean(KINGDOM_MAP.close), 'map strings are clean');

// Looks and labels.
const a = lands[0], b = lands[1];
ok(landLook(a, [], a.npc) === 'today', 'today wins');
ok(landLook(b, [b.npc], a.npc) === 'glow', 'finished glows');
ok(landLook(b, [], a.npc) === 'new', 'unfinished is new');
ok(landLook({ ...b, open: false }, [], a.npc) === 'closed', 'closed');
ok(landLabel('Meadow', 'glow') === 'Meadow. Glowing.' && landLabel('Meadow', 'new') === 'Meadow.', 'labels');
ok(/Not open yet/.test(landLabel('Meadow', 'closed')), 'closed label');

// No two tap targets overlap, on a small map (240px is the least the layout is allowed to use) and a big one.
for (const size of [290, 300, 360, 520]) {
  const pts = mapLayout(lands, size);
  for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
    const d = Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y);
    ok(d >= MIN_TARGET_PX, `${pts[i].npc}/${pts[j].npc} ${Math.round(d)}px apart at ${size}px`);
  }
}
const src = readFileSync(new URL('../src/components/KingdomMap.tsx', import.meta.url), 'utf8');
ok(/aria-modal="true"/.test(src), 'dialog is modal');
ok(/zsq-modal-wrap/.test(src), 'map pauses the world through the modal wrapper');

if (bad.length) { for (const x of [...new Set(bad)].slice(0, 20)) console.log('  ' + x); console.log(`kingdommap_check: ${new Set(bad).size} problem(s)`); process.exit(1); }
console.log('kingdommap_check ok');
