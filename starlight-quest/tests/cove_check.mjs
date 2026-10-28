// Seashell Cove (K4): the land is built only when its slot is "open" (built for real, or ?preview=cove), has its own
// treasure kind and one secret, respects calm motion, stays inside the draw-call budget, and uses no film characters.
// world.js and cove.js need a browser (three via importmap), so pure helpers are imported and the rest is source inspection.
import { readFileSync } from 'node:fs';
import {
  BUILT_SLOTS, PLANNED_SLOTS, builtSlotIds, closedSlots, openSlotIds, isSlotOpen, isCoveOpen, previewFlags, coveGeometry, COVE,
  slotPos, NEW_LAND_SLOTS, LAND_DISC_R, pathSegments, distToSegment, PATH_WIDTH, WORLD_RADIUS,
} from '../js/worldmap.js';
import {
  todayKey, treasureSpots, collectTreasure, sanitizeTreasures, treasureBookModel, treasureLandsFor, findsTotal, findsToday,
  awardRowStar, TREASURE_KINDS, ALL_TREASURE_KINDS, COVE_KIND, COVE_LAND, TREASURES_PER_LAND, TREASURE_INFO, TREASURE_LAND_NAMES,
  SECRETS, ALL_SECRETS, COVE_SECRETS, sanitizeSecrets, foundSecret, createSecretTracker, RHYME_PAIRS, rhymeLine,
} from '../js/treasures.js';
import { coveWet, COVE_SPOTS } from '../js/cove.js';

const bad = [];
const ok = (cond, msg) => { if (!cond) bad.push(msg); };
const src = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const day = '2026-10-27';

// --- "Open" -----------------------------------------------------------------------------------------------------
ok(same(Object.keys(BUILT_SLOTS).sort(), ['ese', 'nne', 'sse', 'ssw']) && BUILT_SLOTS.sse === 'ariel' && BUILT_SLOTS.ssw === 'moana' && BUILT_SLOTS.nne === 'jasmine' && BUILT_SLOTS.ese === 'anna' && builtSlotIds().includes('sse'), 'the cove slot is built (K5: Ariel plays there), and so are the isle (K7), the garden (K9) and the harbor (K11)');
ok(PLANNED_SLOTS.ariel === 'sse' && COVE.slot === 'sse', 'cove sits at the planned sse slot');
ok(previewFlags('').size === 0 && previewFlags().size === 0, 'no preview flag by default (node has no location)');
ok(isCoveOpen() && isCoveOpen('') && isCoveOpen('?x=1&preview=moana'), 'cove is open by default (built, no flag needed)');
ok(same([...openSlotIds('')].sort(), ['ese', 'nne', 'sse', 'ssw']) && closedSlots('').length === 2 && closedSlots().length === 2 && !closedSlots().some((s) => s.slot === 'sse'), 'default: the cove gate (and the isle, garden and harbor gates) are gone, two gates still drawn');
ok(isCoveOpen('?preview=cove') && isCoveOpen('?preview=all') && isCoveOpen('?a=1&preview=Cove') && isCoveOpen('?preview=x,cove'), 'preview=cove / all still parse and keep the cove open');
ok(same([...openSlotIds('?preview=cove')].sort(), ['ese', 'nne', 'sse', 'ssw']), 'the preview flag adds nothing: sse, ssw, nne and ese are open already');
const closedPreview = closedSlots('?preview=cove');
ok(closedPreview.length === 2 && !closedPreview.some((s) => s.slot === 'sse'), 'open slot loses its closed gate, the other two stay');
ok(previewFlags('?preview=%%%').size >= 0 && previewFlags(null).size === 0, 'bad query strings never throw');
ok(isSlotOpen('ese', '?preview=cove') && !isSlotOpen('wsw', '') && !isSlotOpen('ene', '?preview=all'), 'the harbor is built (K11); lands that are not built yet stay closed (the bayou only opens with ?preview=bayou / all, K12)');

// --- Geometry: the path reaches the land, Ariel's pad is on the sand near the entrance --------------------------------
{
  const { center, pad } = coveGeometry();
  const c = slotPos(NEW_LAND_SLOTS.find((s) => s.slot === 'sse'));
  ok(Math.hypot(center.x - c.x, center.z - c.z) < 1e-9, 'cove centre is the slot position (the branch ends there)');
  const branch = pathSegments().find((s) => s.kind === 'branch' && s.slot === 'sse');
  ok(distToSegment(center.x, center.z, branch.from, branch.to) < 1e-6, 'the branch path runs into the cove');
  ok(distToSegment(pad.x, pad.z, branch.from, branch.to) < PATH_WIDTH / 2, 'Ariel\'s pad is on the path side of the cove');
  const dPad = Math.hypot(pad.x - center.x, pad.z - center.z);
  ok(dPad > 5 && dPad < LAND_DISC_R - 2, `pad is inside the disc near the entrance (${dPad.toFixed(1)})`);
  ok(Math.hypot(pad.x, pad.z) < Math.hypot(center.x, center.z), 'pad is on the hub side of the centre');
  ok(Math.hypot(pad.x, pad.z) < WORLD_RADIUS, 'pad is inside the world wall');
  for (const [k, [x, z]] of Object.entries(COVE_SPOTS)) {
    ok(Math.hypot(x, z) < LAND_DISC_R - 0.5, `${k} spot is inside the cove disc`);
    ok(Math.hypot(center.x + x, center.z + z) < WORLD_RADIUS - 0.5, `${k} spot is inside the world wall (reachable)`);
    ok(Math.hypot(x - (pad.x - center.x), z - (pad.z - center.z)) > 3.3, `${k} spot is clear of Ariel's pad`);
  }
  ok(coveWet(0, 8) && coveWet(COVE_SPOTS.pool[0], COVE_SPOTS.pool[1]) && !coveWet(0, -6), 'coveWet: sea and pool wet, entrance dry');
}

// --- Treasures: sea glass, 5 per day, date-seeded, only when open ----------------------------------------------------
ok(COVE_KIND === 'seaglass' && ALL_TREASURE_KINDS.includes('seaglass') && !TREASURE_KINDS.includes('seaglass'), 'seaglass is a cove-only kind (the other lands\' random kinds are unchanged)');
ok(TREASURE_INFO.seaglass && TREASURE_INFO.seaglass.emoji && TREASURE_INFO.seaglass.label, 'seaglass has Treasure Book info');
ok(TREASURE_LAND_NAMES.cove === 'Seashell Cove', 'cove has a book name');
const a = treasureSpots(day, COVE_LAND, TREASURES_PER_LAND);
ok(a.length === 5 && a.every((s) => s.kind === 'seaglass' && /^cove-\d$/.test(s.id)), '5 sea glass treasures with ids cove-0..4');
ok(same(a, treasureSpots(day, COVE_LAND, 5)), 'cove treasures: same day, same spots');
ok(!same(a, treasureSpots('2026-10-28', COVE_LAND, 5)), 'cove treasures: new day, new spots');
ok(a.every((s) => Number.isFinite(s.x) && Number.isFinite(s.z) && Math.hypot(s.x, s.z) < 9), 'cove spots are finite and inside the land');
ok(same(treasureSpots(day, 'library', 5).map((s) => s.kind), treasureSpots(day, 'library', 5).map((s) => s.kind)) && treasureSpots(day, 'library', 5).every((s) => s.kind !== 'seaglass'), 'inner lands never hide sea glass');
ok(same(treasureLandsFor(false), ['library', 'frostfall', 'meadow', 'village']) && same(treasureLandsFor(true), ['library', 'frostfall', 'meadow', 'village', 'cove']), 'treasure lands: 4 closed, 5 open');
ok(findsTotal(false) === 20 && findsTotal(true) === 25, 'finds total is 20 closed, 25 open');
{
  const save = {};
  for (let i = 0; i < 5; i++) ok(collectTreasure(save, `cove-${i}`, 'seaglass', day), `collect cove-${i}`);
  collectTreasure(save, 'library-0', 'shell', day);
  ok(findsToday(save, day, true) === 6, 'open: all six finds count');
  ok(findsToday(save, day, false) === 1, 'closed: cove finds do not count toward today');
  ok(save.treasures.total.seaglass === 5, 'sea glass total is kept');
  ok(awardRowStar(save, 'cove', day) === true && awardRowStar(save, 'cove', day) === false, 'cove row star once per day');
  ok(sanitizeTreasures(save.treasures).stars.includes('cove'), 'cove star survives healing');
  ok(!collectTreasure({}, 'cove-0', 'seaglass', 'today'), 'bad day still rejected');
}
{ // Treasure Book
  const closed = treasureBookModel({ treasures: { day, got: ['cove-0'], total: {} } }, day);
  ok(closed.kinds.length === 5 && closed.lands.length === 4 && closed.stickers.length === 4, 'book, cove closed: 5 kinds, 4 lands, 4 stickers (unchanged)');
  const open = treasureBookModel({}, day, { coveOpen: true });
  ok(open.kinds.length === 6 && open.kinds[5].kind === 'seaglass' && open.lands.length === 5 && open.lands[4].id === 'cove', 'book, cove open: 6 kinds, 5 lands');
  ok(open.stickers.length === 5 && open.stickers[4].id === 'shellrhyme' && !open.stickers[4].found, 'book, cove open: 5th sticker (unfound)');
  const kept = treasureBookModel({ treasures: { day, got: [], total: { seaglass: 2 } }, secrets: ['shellrhyme'] }, day);
  ok(kept.kinds.length === 6 && kept.stickers.length === 5 && kept.stickers[4].found, 'earlier cove finds stay visible even when the cove is closed');
  ok(treasureBookModel(null, day, { coveOpen: true }).total === 0, 'null save does not throw');
}

// --- Secret: three shells small to big, then a rhyme ---------------------------------------------------------------
ok(SECRETS.length === 4 && COVE_SECRETS.length === 1 && same(ALL_SECRETS.slice(0, 5), [...SECRETS, ...COVE_SECRETS]), 'four inner secrets unchanged + one cove secret (the isle adds a sixth after them)');
ok(COVE_SECRETS[0].id === 'shellrhyme' && COVE_SECRETS[0].npc === 'ariel' && COVE_SECRETS[0].emoji && COVE_SECRETS[0].label, 'cove secret has a sticker, an owner and a label');
ok(same(sanitizeSecrets(['shellrhyme', 'x', 'clock']), ['clock', 'shellrhyme']), 'sticker id is a known id');
{ const s = {}; ok(foundSecret(s, 'shellrhyme') && !foundSecret(s, 'shellrhyme'), 'sticker is earned once'); }
{
  let tr = createSecretTracker();
  ok(tr.tap('shell-1', 0) === null && tr.tap('shell-2', 500) === null && tr.tap('shell-3', 1000) === 'shellrhyme', 'small, middle, big in order fires');
  tr = createSecretTracker();
  tr.tap('shell-3', 0); tr.tap('shell-2', 100);
  ok(tr.tap('shell-1', 200) === null, 'wrong order does not fire');
  tr = createSecretTracker();
  tr.tap('shell-1', 0); tr.tap('shell-3', 100);
  ok(tr.tap('shell-2', 200) === null, 'skipping a shell does not fire');
  tr = createSecretTracker();
  tr.tap('shell-1', 0); tr.tap('shell-2', 1000);
  ok(tr.tap('shell-3', 3500) === null, 'too slow (over 3 seconds) does not fire');
  tr = createSecretTracker();
  tr.tap('shell-1', 0); tr.tap('shell-2', 100); tr.tap('shell-1', 200); tr.tap('shell-2', 300);
  ok(tr.tap('shell-3', 400) === 'shellrhyme', 'a wrong tap restarts; shell 1 starts a fresh try');
  tr = createSecretTracker();
  tr.tap('shell-1', 0); tr.tap('shell-2', 10); tr.tap('shell-3', 20);
  tr.tap('shell-1', 1000); tr.tap('shell-2', 1010);
  ok(tr.tap('shell-3', 1020) === null, 'cooldown after firing (no speech spam)');
  ok(createSecretTracker().tap('clock', 0) === null, 'other parts still work');
}
{ // rhymes actually rhyme: identical ending from the first vowel on, different start
  const rime = (w) => w.slice(w.search(/[aeiou]/));
  const onset = (w) => w.slice(0, w.search(/[aeiou]/));
  ok(RHYME_PAIRS.length >= 6, 'enough rhyme pairs');
  for (const [x, y] of RHYME_PAIRS) {
    ok(/^[a-z]+$/.test(x) && /^[a-z]+$/.test(y), `${x}/${y} are plain words`);
    ok(rime(x) === rime(y) && rime(x).length >= 2, `${x} and ${y} end the same (${rime(x)} / ${rime(y)})`);
    ok(x !== y && onset(x) !== onset(y), `${x} and ${y} start differently`);
  }
  ok(RHYME_PAIRS.some(([x, y]) => x === 'shell' && y === 'bell'), 'shell and bell is in the list');
  ok(rhymeLine(() => 0).say === 'Shell and bell rhyme!', 'first rhyme says "Shell and bell rhyme!"');
  for (let i = 0; i < RHYME_PAIRS.length; i++) {
    const l = rhymeLine(() => i / RHYME_PAIRS.length);
    ok(RHYME_PAIRS.some(([x, y]) => x === l.a && y === l.b) && l.say.endsWith('rhyme!'), `rhymeLine ${i} comes from the list`);
  }
  ok(rhymeLine(() => 0.999999).say.endsWith('rhyme!'), 'rhymeLine upper edge');
}

// --- Source checks ----------------------------------------------------------------------------------------------------
const cove = src('js/cove.js'), world = src('js/world.js'), main = src('js/main.js'), ui = src('js/ui.js'), sw = src('sw.js');
const worldmap = src('js/worldmap.js');

// Draw-call budget (approximate, by source inspection): count the places buildCove creates drawables.
//   new THREE.Mesh( / InstancedMesh( / Points( / Sprite( / SkinnedMesh(, plus calls of the own(...) helper, which wraps one
//   `new THREE.Mesh` and is called once per owned mesh. Hit boxes are made by world.js addTappable (invisible material) and
//   glow sprites are hidden except during a reaction, so neither counts at rest.
{
  const body = cove.slice(cove.indexOf('export function buildCove'));
  const ownDef = body.match(/const own = \(m\) => \{[^\n]*\};/); // the helper itself holds one `new THREE.Mesh`, counted once per call below
  ok(!!ownDef, 'own() helper found');
  const rest = ownDef ? body.replace(ownDef[0], '') : body;
  const direct = (rest.match(/new THREE\.(Mesh|InstancedMesh|SkinnedMesh|Points|Sprite|Line|LineSegments)\(/g) || []).length;
  const owned = (rest.match(/\bown\([a-z]+\)/g) || []).length;
  const draws = direct + owned;
  console.log(`cove draw calls at rest (source count): ${draws} (${direct} direct + ${owned} via own())`);
  ok(draws <= 8, `buildCove makes at most 8 draw calls (counted ${draws})`);
  ok(draws >= 5, 'draw call count looks sane (counter works)');
  ok(!/new THREE\.\w*Light\(/.test(cove) && !/castShadow|receiveShadow|shadowMap/.test(cove), 'no extra lights, no shadow maps');
  ok(/InstancedMesh|makeMerger/.test(cove), 'repeats are merged/instanced');
}
// Calm motion
ok(/calmMotion/.test(cove) && /if \(calmMotion\) return;/.test(cove), 'cove update does nothing under calm motion');
ok(/if \(it\.onTap && !calmMotion\) it\.onTap\(it\)/.test(world), 'bubbles/ripples start only when motion is allowed');
{
  const rs = world.indexOf('function tapReact('), re = world.indexOf('function startTapReaction(', rs), r = world.slice(rs, re);
  const calmAt = r.indexOf('if (calmMotion) {'), elseAt = r.indexOf('} else {', calmAt);
  ok(calmAt > 0 && elseAt > calmAt && !/react\(/.test(r.slice(calmAt, elseAt)), 'calm branch never runs the cove\'s custom motion (glow only)');
  ok(/it\.react\(it, p\)/.test(r.slice(elseAt)), 'custom reactions live in the motion branch');
}
// Only when open
ok(/const coveOpen = isCoveOpen\(\)/.test(world) && /if \(coveOpen\) \{\s*cove = buildCove\(/.test(world), 'world builds the cove only when open');
ok(/treasureLandsFor\(openLands\)/.test(world) && /const openLands = openLandIds\(\)/.test(world) && !/TREASURE_LANDS/.test(world), 'world hides cove treasures only when open');
ok(/closedSlots\(\)\.map/.test(world), 'world draws gates from closedSlots (the open slot is skipped)');
ok(/landPads\[COVE\.land\]/.test(world) && !/NPC_ORDER\.push|NPC_ORDER = /.test(world), 'Ariel\'s pad is stored; world.js spawns her from NPC_ORDER like the others');
ok(/export const NPC_ORDER = \['belle', 'elsa', 'rapunzel', 'cinderella', 'ariel'(, 'moana')?(, 'jasmine')?(, 'anna')?\]/.test(src('js/quests.js')), 'ariel is appended to NPC_ORDER (K5; Moana follows in K7, Jasmine in K9, Anna in K11)');
ok(/import \{ buildCove \} from '\.\/cove\.js\?v=20261027e2'/.test(world), 'world imports cove.js with the existing ?v= stamp');
ok(/'\.\/js\/cove\.js\?v=20261027e2'/.test(sw), 'cove.js is precached with the existing stamp');
ok(/openLandIds\(\)/.test(main) && /findsTotal\(OPEN_LANDS\)/.test(main) && /findsToday\(Save\.data, todayKey\(\), OPEN_LANDS\)/.test(main) && !/TREASURE_LANDS\.length/.test(main), 'main counts only open lands (20 with none open, 25 with the cove)');
ok(/Narrator\.speakExact\(def\.npc, line\)/.test(main) && /rhymeLine\(\)/.test(main), 'the rhyme is spoken with Ariel\'s voice via speakExact');
ok(/coveOpen: isCoveOpen\(\)/.test(ui), 'Treasure Book asks for the cove only when open');
ok(/BUILT_SLOTS\s*=\s*\{\s*sse:\s*'ariel',\s*ssw:\s*'moana',\s*nne:\s*'jasmine',\s*ese:\s*'anna'\s*\}/.test(worldmap.replace(/\/\/.*$/gm, '')), 'BUILT_SLOTS holds sse: ariel, ssw: moana, nne: jasmine and ese: anna in source');
ok(/'shell-' \+ \(i \+ 1\)/.test(cove) && /\['shell1', 'shell2', 'shell3'\]/.test(cove), 'the three secret shells report shell-1..3 (small to big)');
// Six surprises
for (const k of ['clam', 'pool', 'starfish', 'coral', 'hermit', 'chime']) ok(new RegExp(`items\\.${k} = addTappable\\(`).test(cove), `surprise: ${k}`);
// No film characters or iconic props (original art only)
{
  const banned = /sebastian|flounder|trident|ursula|scuttle|king triton|triton|little mermaid|under the sea|eric\b|nemo|dory|moana's|heihei|maui/i;
  for (const [name, text] of [['cove.js', cove], ['treasures.js', src('js/treasures.js')], ['worldmap.js', worldmap]]) {
    const m = text.match(banned);
    ok(!m, `${name} has no film character names (found ${m && m[0]})`);
  }
}

if (bad.length) { console.log('FAIL'); for (const b of bad) console.log(' -', b); process.exit(1); }
console.log('cove_check ok');
