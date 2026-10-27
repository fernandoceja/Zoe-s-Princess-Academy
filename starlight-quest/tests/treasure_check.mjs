// Daily treasures (E2): date-seeded spots, idempotent pickup, per-day reset keeping lifetime totals, healed saves.
import { readFileSync } from 'node:fs';
import { todayKey, treasureSpots, collectTreasure, rolloverTreasures, sanitizeTreasures, treasuresGotToday,
  landTreasureCount, TREASURE_KINDS, TREASURE_LANDS, TREASURES_PER_LAND } from '../js/treasures.js';
const bad = [];
const ok = (name, cond) => { if (!cond) bad.push(name); };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

ok('todayKey format', todayKey(new Date(2026, 0, 5)) === '2026-01-05' && /^\d{4}-\d{2}-\d{2}$/.test(todayKey()));

const ids = new Set();
for (const land of TREASURE_LANDS) {
  const a = treasureSpots('2026-10-27', land, TREASURES_PER_LAND);
  ok(`${land}: 5 spots`, a.length === 5);
  ok(`${land}: same day twice is identical`, same(a, treasureSpots('2026-10-27', land, 5)));
  ok(`${land}: next day differs`, !same(a, treasureSpots('2026-10-28', land, 5)));
  ok(`${land}: kinds known, numbers finite`, a.every((s) => TREASURE_KINDS.includes(s.kind) && Number.isFinite(s.x) && Number.isFinite(s.z)));
  for (const s of a) { ok(`unique id ${s.id}`, !ids.has(s.id)); ids.add(s.id); }
}
ok('20 unique ids across lands', ids.size === 20);
ok('lands differ from each other', !same(treasureSpots('2026-10-27', 'library', 5).map((s) => [s.x, s.z]), treasureSpots('2026-10-27', 'meadow', 5).map((s) => [s.x, s.z])));
ok('custom rngFactory is used', treasureSpots('d', 'library', 2, () => () => 0.5).length === 2);

// Collect: idempotent, counts by kind
const save = { treasures: { day: '', got: [], total: {} } };
ok('first pickup is new', collectTreasure(save, 'library-0', 'shell', '2026-10-27') === true);
ok('repeat pickup is not new', collectTreasure(save, 'library-0', 'shell', '2026-10-27') === false);
ok('total counted once', save.treasures.total.shell === 1 && save.treasures.got.length === 1);
collectTreasure(save, 'meadow-2', 'gem', '2026-10-27');
ok('land count', landTreasureCount(save, 'library', '2026-10-27') === 1 && landTreasureCount(save, 'meadow', '2026-10-27') === 1);
ok('bad kind/id/day rejected', !collectTreasure(save, 'library-1', 'banana', '2026-10-27') && !collectTreasure(save, '../x', 'gem', '2026-10-27') && !collectTreasure(save, 'library-1', 'gem', 'today'));

// Rollover: got cleared, totals kept, same id collectable again
ok('got visible only today', treasuresGotToday(save, '2026-10-28').length === 0 && treasuresGotToday(save, '2026-10-27').length === 2);
ok('collect on new day is new', collectTreasure(save, 'library-0', 'shell', '2026-10-28') === true);
ok('rollover cleared got to one', same(save.treasures.got, ['library-0']) && save.treasures.day === '2026-10-28');
ok('totals kept across days', save.treasures.total.shell === 2 && save.treasures.total.gem === 1);
rolloverTreasures(save, '2026-10-29');
ok('rollover keeps total, clears got', save.treasures.got.length === 0 && save.treasures.total.shell === 2);

// Corrupted data healed
const junk = [null, undefined, 5, 'x', [], { day: 7, got: 'no', total: 'no' },
  { day: '2026-10-27', got: ['library-0', 'library-0', 42, '<b>', 'meadow-9'], total: { shell: -3, gem: 'x', star: 2.9, banana: 5, feather: Infinity } }];
for (const j of junk) {
  const h = sanitizeTreasures(j);
  ok('healed shape ' + JSON.stringify(j), typeof h.day === 'string' && Array.isArray(h.got) && h.total && typeof h.total === 'object');
}
const h = sanitizeTreasures(junk[6]);
ok('healed keeps only valid ids once', same(h.got, ['library-0', 'meadow-9']));
ok('healed totals', same(h.total, { star: 2 }));
const s2 = { treasures: 'garbage' };
ok('collect heals garbage save', collectTreasure(s2, 'village-1', 'star', '2026-10-27') && s2.treasures.total.star === 1);
const s3 = {};
ok('collect works with no field', collectTreasure(s3, 'village-1', 'star', '2026-10-27'));

// Wiring (source inspection; save.js and world.js need a browser)
const rd = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');
const saveSrc = rd('../js/save.js'), world = rd('../js/world.js'), main = rd('../js/main.js');
ok('save defaults has treasures', /treasures: \{ day: '', got: \[\], total: \{\}(, stars: \[\])? \}/.test(saveSrc));
ok('save merge sanitizes treasures', saveSrc.includes('sanitizeTreasures(raw.treasures)'));
ok('world and main wire onTreasure', world.includes('onTreasure(it.kind, it.landId, it.id)') && main.includes('onTreasure('));
const ph = world.slice(world.indexOf('const onPointerDown'), world.indexOf("addEventListener('pointerdown', onPointerDown)"));
ok('princess tap wins, then treasures, then tappables',
  ph.indexOf('npcHitMeshes') < ph.indexOf('treasureHits') && ph.indexOf('treasureHits') < ph.indexOf('intersectObjects(tappables'));
const up = world.slice(world.indexOf('function updateTreasures'), world.indexOf('// --- Tap-to-interact'));
ok('calm motion skips bob and spin', /if \(!calmMotion\) \{[^}]*position\.y[^}]*rotation\.y/.test(up));
ok('pickup needs input enabled', up.includes('inputEnabled &&'));

console.log(`treasures: ${ids.size} spots, problems ${bad.length}`);
if (bad.length) { console.log(bad.slice(0, 10).join('\n')); process.exit(1); }
