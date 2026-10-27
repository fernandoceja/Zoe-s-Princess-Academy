// Secret surprises (E4): stickers, row stars, doubles/clock/spelling lines, tap tracker. Pure helpers plus source checks.
import { readFileSync } from 'node:fs';
import {
  sanitizeSecrets, foundSecret, awardRowStar, collectTreasure, rolloverTreasures, sanitizeTreasures, treasureBookModel,
  createSecretTracker, doublesLine, clockLine, spellLine, plantLine, SECRETS, TREASURES_PER_LAND,
} from '../js/treasures.js';
const bad = [];
const ok = (name, cond) => { if (!cond) bad.push(name); };
const rd = (f) => readFileSync(new URL(f, import.meta.url), 'utf8');

// Stickers: sanitize + first find only once
ok('sanitize junk', sanitizeSecrets('x').length === 0 && sanitizeSecrets(null).length === 0);
ok('sanitize drops unknown + dupes', sanitizeSecrets(['clock', 'nope', 'clock', 7, 'sunflower']).join() === 'clock,sunflower');
const sv = {};
ok('first find true', foundSecret(sv, 'clock') === true);
ok('second find false', foundSecret(sv, 'clock') === false);
ok('unknown id false', foundSecret(sv, 'dragon') === false && sv.secrets.length === 1);
ok('4 secrets, one per land', SECRETS.length === 4 && new Set(SECRETS.map((s) => s.land)).size === 4);

// Row star: once per land per day, resets on rollover
const day = '2026-10-27', next = '2026-10-28';
const save = { treasures: { day: '', got: [], total: {} } };
for (let i = 0; i < 4; i++) collectTreasure(save, `library-${i}`, 'shell', day);
ok('no star at 4 of 5', awardRowStar(save, 'library', day) === false);
collectTreasure(save, 'library-4', 'gem', day);
ok('star at 5 of 5', awardRowStar(save, 'library', day) === true);
ok('star only once that day', awardRowStar(save, 'library', day) === false);
ok('other land has no star', awardRowStar(save, 'meadow', day) === false);
ok('unknown land no star', awardRowStar(save, 'moon', day) === false);
ok('book row shows star', treasureBookModel(save, day).lands.find((l) => l.id === 'library').star === true);
ok('stars list is sanitized', sanitizeTreasures({ day, got: [], total: {}, stars: ['library', 'x', 'library'] }).stars.join() === 'library');
ok('stars dropped without a day', sanitizeTreasures({ stars: ['library'] }).stars.length === 0);
rolloverTreasures(save, next);
ok('rollover clears stars', save.treasures.stars.length === 0 && save.treasures.got.length === 0);
for (let i = 0; i < TREASURES_PER_LAND; i++) collectTreasure(save, `library-${i}`, 'shell', next);
ok('star again next day', awardRowStar(save, 'library', next) === true);
ok('lifetime totals kept', save.treasures.total.shell >= 9);
ok('book row star is for today only', treasureBookModel(save, '2026-10-29').lands.every((l) => !l.star));

// Book model: 4 stickers
const bm = treasureBookModel({ secrets: ['icetwins'] }, day);
ok('model has 4 stickers', bm.stickers.length === 4);
ok('only found sticker is found', bm.stickers.filter((s) => s.found).map((s) => s.id).join() === 'icetwins');
ok('stickers have emoji + label', bm.stickers.every((s) => s.emoji && s.label));
ok('null save: 4 unfound stickers', treasureBookModel(null, day).stickers.every((s) => !s.found));

// Doubles
for (let n = 1; n <= 5; n++) {
  const d = doublesLine(() => (n - 1) / 5 + 0.01);
  ok(`doubles ${n}`, d.n === n && d.sum === 2 * n && d.say === `${n} and ${n} make ${2 * n}!`);
}
// Clock
const seen = new Set();
for (let i = 0; i < 200; i++) {
  const c = clockLine(Math.random);
  ok('clock h/m range', c.h >= 1 && c.h <= 12 && (c.m === 0 || c.m === 30));
  ok('clock phrase', c.m === 0 ? c.say === `It is ${c.h} o'clock!` : c.say === `It is half past ${c.h}!`);
  seen.add(c.m);
}
ok('clock gives both kinds', seen.size === 2);
// Spelling
const words = ['lend', 'send', 'fast'];
for (let i = 0; i < 30; i++) {
  const sp = spellLine(words);
  ok('spell uses a week word', words.includes(sp.word) && sp.say.endsWith(`... ${sp.word}!`));
  ok('spell letters are names, not bare letters', !/\b[a-z],/.test(sp.say));
}
ok('spell: "a" is ay', spellLine(['fast'], () => 0).say.startsWith('eff, ay, ess, tee'));
ok('spell fallback on empty list', spellLine([]).word === 'star');
ok('plant line is short', plantLine(() => 0.99).say.includes('2, 4, 6, 8, 10, 12') && plantLine(() => 0).say.length < 80);

// Tap tracker
let tr = createSecretTracker();
ok('clock: 2 taps no', tr.tap('clock', 0) === null && tr.tap('clock', 500) === null);
ok('clock: 3rd tap fires', tr.tap('clock', 900) === 'clock');
tr = createSecretTracker();
tr.tap('clock', 0); tr.tap('clock', 2000);
ok('clock: slow taps do not fire', tr.tap('clock', 4500) === null);
tr = createSecretTracker();
ok('ice: one crystal no', tr.tap('ice-a', 0) === null);
ok('ice: same crystal twice no', tr.tap('ice-a', 500) === null);
ok('ice: both within 3s fires', tr.tap('ice-b', 1500) === 'icetwins');
tr = createSecretTracker();
tr.tap('ice-a', 0);
ok('ice: too slow', tr.tap('ice-b', 3500) === null);
tr = createSecretTracker();
ok('books fire', tr.tap('bookstack', 0) === 'bookstack');
ok('books cooldown (no speech spam)', tr.tap('bookstack', 500) === null);
ok('books again later', tr.tap('bookstack', 5000) === 'bookstack');
ok('sunflower fires', createSecretTracker().tap('sunflower', 0) === 'sunflower');

// Source checks
const save_js = rd('../js/save.js'), main = rd('../js/main.js'), world = rd('../js/world.js'), ui = rd('../js/ui.js');
ok('save.js sanitizes secrets', /out\.secrets = sanitizeSecrets\(raw\.secrets\)/.test(save_js));
ok('main only reacts while roaming', /onSecretTap\(part\)\s*\{\s*if \(state !== 'roam' \|\| paused\) return;/.test(main));
ok('main toasts new sticker once', /New sticker: \$\{def\.label\}/.test(main) && /if \(foundSecret\(/.test(main));
ok('main row star toast', /All \$\{TREASURES_PER_LAND\} treasures in \$\{TREASURE_LAND_NAMES\[landId\]\}! \+1 ⭐/.test(main));
ok('main row star uses stars path', /awardRowStar[\s\S]{0,200}Save\.data\.stars \+= 1[\s\S]{0,80}UI\.updateStars/.test(main));
ok('main updates finds counter on load and pickup', (main.match(/UI\.updateFinds\(/g) || []).length >= 2);
ok('princess raycast still first', world.indexOf('intersectObjects(npcHitMeshes') < world.indexOf('intersectObjects(tappables'));
ok('world secret hook', /onSecretTap\(it\.secret\)/.test(world));
ok('secret tap never moves Zoe', !/playerPos|startQuest/.test(world.slice(world.indexOf('const fresh = startTapReaction'), world.indexOf('const fresh = startTapReaction') + 400)));
ok('ui stickers row + finds pill', ui.includes('zsq-tb-stickers') && ui.includes('updateFinds(n, total)'));
const calmAt = world.indexOf('function tapReact(');
const calmBranch = world.slice(world.indexOf('if (calmMotion) {', calmAt), world.indexOf('} else {', calmAt));
ok('calm reaction has no motion', !/position\.|rotation\./.test(calmBranch));

if (bad.length) { console.error('FAIL secret:', bad.join('; ')); process.exit(1); }
console.log('secret_check OK');
