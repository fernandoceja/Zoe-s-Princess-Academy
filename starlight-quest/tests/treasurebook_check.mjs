// Treasure Book (E3): pure page model + pause-menu wiring.
import { readFileSync } from 'node:fs';
import { treasureBookModel, TREASURE_KINDS, TREASURE_LANDS, TREASURES_PER_LAND } from '../js/treasures.js';
const bad = [];
const ok = (name, cond) => { if (!cond) bad.push(name); };

const e = treasureBookModel({}, '2026-10-27');
ok('empty: all kinds listed', e.kinds.map((k) => k.kind).join() === TREASURE_KINDS.join());
ok('empty: all unfound, zero counts', e.kinds.every((k) => !k.found && k.count === 0));
ok('empty: total 0', e.total === 0);
ok('empty: every land 0 of 5', e.lands.length === TREASURE_LANDS.length && e.lands.every((l) => l.count === 0 && l.of === TREASURES_PER_LAND && l.name));
ok('null save does not throw', treasureBookModel(null, '2026-10-27').total === 0);

const save = { treasures: { day: '2026-10-27', got: ['library-0', 'library-3', 'meadow-1'], total: { shell: 7, star: 5 } } };
const m = treasureBookModel(save, '2026-10-27');
const k = (n) => m.kinds.find((x) => x.kind === n);
ok('shell 7 found', k('shell').count === 7 && k('shell').found);
ok('star 5 found', k('star').count === 5 && k('star').found);
ok('gem unfound', !k('gem').found && k('gem').count === 0);
ok('total 12', m.total === 12);
const l = (id) => m.lands.find((x) => x.id === id).count;
ok('today per land', l('library') === 2 && l('meadow') === 1 && l('frostfall') === 0 && l('village') === 0);

const stale = treasureBookModel(save, '2026-10-28');
ok('stale day ignored for today', stale.lands.every((x) => x.count === 0));
ok('stale day keeps lifetime totals', stale.total === 12);

const ui = readFileSync(new URL('../js/ui.js', import.meta.url), 'utf8');
ok('ui has Treasure Book button', /Treasure Book'\)/.test(ui) && ui.includes("'🧺 Treasure Book'"));
ok('ui has showTreasureBook', ui.includes('showTreasureBook('));

if (bad.length) { console.error('FAIL treasurebook:', bad.join('; ')); process.exit(1); }
console.log('treasurebook_check OK');
