// New princess roster (K3): six princesses defined with original portraits and voices, but not spawned or in NPC_ORDER yet.
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PRINCESSES, NPC_ORDER, NO_CLIP_IDS } from '../js/quests.js?v=20261027e2';
import { NEW_LAND_SLOTS, PLANNED_SLOTS } from '../js/worldmap.js?v=20261027e2';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(resolve(root, p), 'utf8');
const bad = [];
const expect = (what, ok) => { if (!ok) bad.push(what); };
const NEW = {
  ariel: ['Ariel', 'seashell-cove', 'Seashell Cove'], moana: ['Moana', 'wayfinder-isle', 'Wayfinder Isle'],
  jasmine: ['Jasmine', 'moonlit-palace-garden', 'Moonlit Palace Garden'], anna: ['Anna', 'sunny-fjord-harbor', 'Sunny Fjord Harbor'],
  tiana: ['Tiana', 'firefly-bayou', 'Firefly Bayou'], aurora: ['Aurora', 'rosewood-glen', 'Rosewood Glen'],
};
const ids = Object.keys(NEW);
for (const id of ids) {
  const p = PRINCESSES[id];
  if (!p) { bad.push(id + ': missing'); continue; }
  const [name, landId, landName] = NEW[id];
  expect(id + ' name', p.name === name);
  expect(id + ' landId', p.landId === landId);
  expect(id + ' landName', p.landName === landName);
  expect(id + ' color', /^#[0-9a-f]{6}$/i.test(p.color));
  expect(id + ' voice range', p.voice && p.voice.pitch >= 1.0 && p.voice.pitch <= 1.3 && p.voice.rate >= 0.85 && p.voice.rate <= 1.0);
  const u = String(p.portrait);
  expect(id + ' portrait is svg data uri', u.startsWith('data:image/svg+xml,'));
  expect(id + ' portrait under 4 KB', u.length < 4096);
  const svg = decodeURIComponent(u.slice('data:image/svg+xml,'.length));
  expect(id + ' portrait is an svg', svg.startsWith('<svg') && svg.endsWith('</svg>'));
  expect(id + ' portrait has no script', !/<script/i.test(svg) && !/\bon\w+\s*=/i.test(svg));
  expect(id + ' portrait has no external href', !/href\s*=|https?:|<image|<foreignObject/i.test(svg.replace(' xmlns="http://www.w3.org/2000/svg"', '')));
}
// Voices (pitch + rate) are distinct across all princesses, and so are accent colors.
const all = Object.entries(PRINCESSES);
expect('11 princesses (5 original + 6 new)', all.length === 11);
const vs = all.map(([, p]) => p.voice.pitch + '/' + p.voice.rate);
expect('voices distinct', new Set(vs).size === vs.length);
const cs = all.map(([, p]) => p.color.toLowerCase());
expect('colors distinct', new Set(cs).size === cs.length);
// Not in the game yet.
expect('NPC_ORDER is the original four plus Ariel (K5), Moana (K7), Jasmine (K9) and Anna (K11); the other two are not in it yet', JSON.stringify(NPC_ORDER) === JSON.stringify(['belle', 'elsa', 'rapunzel', 'cinderella', 'ariel', 'moana', 'jasmine', 'anna']));
// Planned slots.
expect('PLANNED_SLOTS covers exactly the six', JSON.stringify(Object.keys(PLANNED_SLOTS).sort()) === JSON.stringify([...ids].sort()));
const valid = new Set(NEW_LAND_SLOTS.map((s) => s.slot));
const planned = Object.values(PLANNED_SLOTS);
expect('planned slots valid', planned.every((s) => valid.has(s)));
expect('planned slots distinct', new Set(planned).size === planned.length);
expect('anna -> ese', PLANNED_SLOTS.anna === 'ese');
// world.js: defs exist, spawn comes from NPC_ORDER.
const world = read('js/world.js');
const defs = world.match(/const NPC_DEFS = \{([\s\S]*?)\n\};/);
expect('NPC_DEFS found', !!defs);
for (const id of ids) {
  expect('world.js NPC_DEFS has ' + id, !!defs && new RegExp('\\n\\s+' + id + ':\\s*\\{ land:').test(defs[1]));
}
expect('world.js spawns from NPC_ORDER', /NPC_ORDER\.map\(\(id\) => \[id, NPC_DEFS\[id\]\]\)/.test(world));
expect('world.js does not iterate all NPC_DEFS', !/Object\.(entries|keys|values)\(NPC_DEFS\)/.test(world));
expect('world.js has curls hair style', /hairStyle === 'curls'/.test(world));
// audio.js: no clip lookup for the new ids.
const audio = read('js/audio.js');
expect('NO_CLIP_IDS has the six', ids.every((id) => NO_CLIP_IDS.includes(id)));
expect('NO_CLIP_IDS has no original four', ['belle', 'elsa', 'rapunzel', 'cinderella'].every((id) => !NO_CLIP_IDS.includes(id)));
expect('Ariel and Moana have no recorded clips (they use the speech voice)', NO_CLIP_IDS.includes('ariel') && NO_CLIP_IDS.includes('moana'));
const iSkip = audio.indexOf('NO_CLIP_IDS.includes(princessId)');
const iClip = audio.indexOf("new Audio()");
expect('audio.js skips clips before creating Audio', iSkip > 0 && iClip > iSkip);
expect('portraits file precached', /portraits-new\.js\?v=/.test(read('sw.js')));
console.log('roster checks done, problems:', bad.length);
for (const b of bad) console.log('  ' + b);
if (bad.length) process.exit(1);
