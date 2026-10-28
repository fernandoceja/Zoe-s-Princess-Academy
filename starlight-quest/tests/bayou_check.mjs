// Firefly Bayou (K12): the land is built only when its slot ('wsw') is "open" (built for real since K13 when Tiana's quests landed; ?preview=bayou / all is harmless now),
// has its own treasure kind (lilies) and one secret (the tally board: four lines and a slash, then two more = 7; tap the board, then the basket of 7),
// respects calm motion, stays inside the draw-call budget, stays clear of Glass Slipper Village / the other lands / the castle / the paths, and uses no
// film characters, songs or iconic props. Pure helpers are imported; bayou.js itself runs here against the vendored three.js with a tiny stand-in for
// world.js (no browser needed), and the wiring in world/main/ui is checked by source inspection.
import { readFileSync } from 'node:fs';
import * as THREE from '../vendor/three.module.js';
import {
  BUILT_SLOTS, PLANNED_SLOTS, PREVIEW_LANDS, builtSlotIds, closedSlots, openSlotIds, isSlotOpen, isCoveOpen, isIsleOpen, isGardenOpen, isHarborOpen, isBayouOpen,
  openLandIds, previewFlags, bayouGeometry, harborGeometry, coveGeometry, isleGeometry, gardenGeometry, BAYOU, slotPos, NEW_LAND_SLOTS, LAND_DISC_R, LAND_DIST,
  INNER_LAND_ANGLES, CASTLE_POS, pathSegments, distToSegment, PATH_WIDTH, WORLD_RADIUS,
} from '../js/worldmap.js';
import {
  todayKey, treasureSpots, collectTreasure, treasureBookModel, treasureLandsFor, findsTotal, findsToday, awardRowStar, sanitizeTreasures,
  TREASURE_KINDS, ALL_TREASURE_KINDS, ALL_TREASURE_LANDS, BAYOU_KIND, BAYOU_LAND, TREASURES_PER_LAND, TREASURE_INFO, TREASURE_LAND_NAMES,
  SECRETS, COVE_SECRETS, ISLE_SECRETS, GARDEN_SECRETS, HARBOR_SECRETS, BAYOU_SECRETS, ALL_SECRETS, sanitizeSecrets, foundSecret, createSecretTracker,
  tallyLine, tallyMarks, tallyTotal, tallyRows, TALLY_TARGET, TALLY_BASKETS,
} from '../js/treasures.js';
import { buildBayou, bayouWet, inGarden, channelDist, BAYOU_SPOTS, BAYOU_STATICS, BAYOU_R, CHANNEL, BOARDWALK, DECK, GARDEN_PATCH, CYPRESS, BAYOU_FX } from '../js/bayou.js';
import { NPC_ORDER, PRINCESSES } from '../js/quests.js';

const bad = [];
const ok = (cond, msg) => { if (!cond) bad.push(msg); };
const src = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const day = '2026-10-28';
const FOUR = ['cove', 'isle', 'garden', 'harbor'];
const FIVE = [...FOUR, 'bayou'];

// --- "Open": open by default since K13 (the preview flag changes nothing) --------------------------------------------------------------
ok(PLANNED_SLOTS.tiana === 'wsw' && BAYOU.slot === 'wsw' && BAYOU.land === 'bayou' && BAYOU.princess === 'tiana', 'bayou sits at Tiana\'s planned wsw slot');
ok(BUILT_SLOTS.wsw === 'tiana' && builtSlotIds().includes('wsw'), 'wsw is built (Tiana\'s quests landed in K13)');
ok(isBayouOpen() && isBayouOpen('') && isBayouOpen('?x=1') && isBayouOpen('?preview=cove') && isBayouOpen('?preview=harbor') && isBayouOpen('?preview=tiana'), 'bayou is OPEN by default (K13) whatever the flags say');
ok(isBayouOpen('?preview=aurora') && isBayouOpen('?preview=wsw') && isBayouOpen('?preview=jasmine,moana') && isBayouOpen('?preview=firefly'), 'unknown / other preview names are harmless');
ok(isBayouOpen('?preview=bayou') && isBayouOpen('?preview=all') && isBayouOpen('?a=1&preview=Bayou') && isBayouOpen('?preview=cove,bayou') && isBayouOpen('?preview=harbor,all'), 'preview=bayou / all / lists are harmless (the bayou is open anyway)');
ok(PREVIEW_LANDS.bayou === 'wsw' && PREVIEW_LANDS.harbor === 'ese' && PREVIEW_LANDS.cove === 'sse' && PREVIEW_LANDS.isle === 'ssw' && PREVIEW_LANDS.garden === 'nne', 'bayou is in PREVIEW_LANDS (the other flags stay)');
ok(isCoveOpen() && isIsleOpen() && isGardenOpen() && isHarborOpen() && isHarborOpen('?preview=bayou'), 'the built lands stay open (and harmless with the bayou flag)');
ok(same(openLandIds(''), FIVE) && same(openLandIds('?preview=tiana'), FIVE) && same(openLandIds('?preview=harbor'), FIVE), 'without the bayou flag the bayou is open anyway: the five built lands');
ok(same(openLandIds('?preview=bayou'), FIVE) && same(openLandIds('?preview=all'), FIVE), 'with the flag nothing changes: the bayou is the fifth open land');
ok(same([...openSlotIds('')].sort(), ['ese', 'nne', 'sse', 'ssw', 'wsw']) && same([...openSlotIds('?preview=bayou')].sort(), ['ese', 'nne', 'sse', 'ssw', 'wsw']), 'open slots: wsw is open with or without the flag');
ok(closedSlots('').length === 1 && !closedSlots('').some((s) => s.slot === 'wsw') && closedSlots('').some((s) => s.slot === 'ene'), 'default: the wsw star gate is gone (only ene stays)');
ok(closedSlots('?preview=bayou').length === 1 && closedSlots('?preview=bayou')[0].slot === 'ene', 'open bayou has no gate; ene stays');
ok(closedSlots('?preview=all').length === 1 && closedSlots('?preview=all')[0].slot === 'ene', 'preview=all: only ene stays closed');
ok(isSlotOpen('wsw', '?preview=bayou') && isSlotOpen('wsw', '') && !isSlotOpen('ene', '?preview=all'), 'the last land (ene) is not built yet');
ok(previewFlags('?preview=%%%').size >= 0 && previewFlags(null).size === 0, 'bad query strings never throw');
ok(NPC_ORDER.includes('tiana') && NPC_ORDER.indexOf('tiana') === NPC_ORDER.indexOf('anna') + 1, 'Tiana follows Anna in NPC_ORDER (K13): world.js spawns her on the bayou pad');

// --- Geometry: the path reaches the land, Tiana's pad is stored, clear of Glass Slipper Village, the castle, the plaza paths and the other lands ---
const { center, pad } = bayouGeometry();
const segs = pathSegments();
const branch = segs.find((s) => s.kind === 'branch' && s.slot === 'wsw');
const trunk135 = segs.find((s) => s.kind === 'trunk' && Math.abs(Math.atan2(s.to.z, s.to.x) - (135 * Math.PI / 180)) < 1e-6);
const village = { x: Math.cos(INNER_LAND_ANGLES.village) * LAND_DIST, z: Math.sin(INNER_LAND_ANGLES.village) * LAND_DIST };
const local = (p) => [p.x - center.x, p.z - center.z];
const [padLx, padLz] = local(pad);
{
  const c = slotPos(NEW_LAND_SLOTS.find((s) => s.slot === 'wsw'));
  ok(Math.hypot(center.x - c.x, center.z - c.z) < 1e-9, 'bayou centre is the slot position (the branch ends there)');
  ok(distToSegment(center.x, center.z, branch.from, branch.to) < 1e-6, 'the branch path runs into the bayou');
  ok(distToSegment(pad.x, pad.z, branch.from, branch.to) < PATH_WIDTH / 2, 'the pad is on the path side of the bayou');
  const dPad = Math.hypot(pad.x - center.x, pad.z - center.z);
  ok(dPad > 5 && dPad < LAND_DISC_R - 2, `pad is inside the disc near the entrance (${dPad.toFixed(1)})`);
  ok(Math.hypot(pad.x, pad.z) < Math.hypot(center.x, center.z), 'pad is on the hub side of the centre');
  ok(Math.hypot(pad.x, pad.z) < WORLD_RADIUS, 'pad is inside the world wall');
  ok(padLx > 5.5 && Math.abs(padLz) < 1.5, `the entrance is on the east side (pad at ${padLx.toFixed(1)}, ${padLz.toFixed(1)}), where the boardwalk starts`);
  // Glass Slipper Village (Cinderella's land, due west of the hub) is the neighbour: the two discs are well apart
  ok(Math.hypot(center.x - village.x, center.z - village.z) > 2 * LAND_DISC_R + 3, `bayou disc is clear of the Glass Slipper Village disc (${Math.hypot(center.x - village.x, center.z - village.z).toFixed(1)})`);
  for (const a of Object.values(INNER_LAND_ANGLES)) {
    ok(Math.hypot(center.x - Math.cos(a) * LAND_DIST, center.z - Math.sin(a) * LAND_DIST) > 2 * LAND_DISC_R + 3, 'bayou is clear of the inner lands');
  }
  ok(Math.hypot(center.x - CASTLE_POS.x, center.z - CASTLE_POS.z) > LAND_DISC_R + 8, 'bayou is clear of the castle');
  ok(Math.hypot(center.x, center.z) > 8.5 + LAND_DISC_R + 10, 'bayou is far outside the hub plaza');
  for (const [name, g] of [['cove', coveGeometry()], ['isle', isleGeometry()], ['garden', gardenGeometry()], ['harbor', harborGeometry()]]) {
    ok(Math.hypot(center.x - g.center.x, center.z - g.center.z) > 2 * LAND_DISC_R + 6, `bayou and ${name} are far apart`);
  }
  // Other paths: the bayou disc never touches a path that is not its own (its own branch and the shared 135-degree trunk)
  for (const sg of segs) {
    if (sg === branch || sg === trunk135) continue;
    ok(distToSegment(center.x, center.z, sg.from, sg.to) > LAND_DISC_R + PATH_WIDTH / 2, `the bayou disc does not touch another ${sg.kind} path`);
  }
  ok(distToSegment(center.x, center.z, trunk135.from, trunk135.to) > LAND_DISC_R + PATH_WIDTH / 2, 'the bayou disc does not touch the shared trunk either');
  // The water and its muddy bank reach outside the grass in places: every point of the outer edge stays clear of the village and inside the scatter-free ring
  for (let i = 0; i + 1 < CHANNEL.pts.length; i++) for (let k = 0; k < 8; k++) {
    const u = k / 8, x = CHANNEL.pts[i][0] + (CHANNEL.pts[i + 1][0] - CHANNEL.pts[i][0]) * u, z = CHANNEL.pts[i][1] + (CHANNEL.pts[i + 1][1] - CHANNEL.pts[i][1]) * u;
    ok(Math.hypot(x, z) + CHANNEL.r < 11.0, 'the channel water stays inside the ring the world keeps free of scatter (11.5 m)');
    ok(Math.hypot(x, z) + CHANNEL.r + CHANNEL.mud < 11.4, 'its muddy bank is barely outside the grass');
    ok(Math.hypot(center.x + x - village.x, center.z + z - village.z) > LAND_DISC_R + 2.5, 'the water stays clear of the village disc');
    ok(Math.hypot(center.x + x, center.z + z) < WORLD_RADIUS, 'the water stays inside the world wall');
  }
  const all = { ...BAYOU_SPOTS, ...BAYOU_STATICS };
  for (const [k, [x, z]] of Object.entries(all)) {
    ok(Math.hypot(x, z) < BAYOU_R - 0.2, `${k} spot is inside the bayou (${Math.hypot(x, z).toFixed(1)} of ${BAYOU_R})`);
    ok(Math.hypot(center.x + x, center.z + z) < WORLD_RADIUS - 0.5, `${k} spot is inside the world wall`);
    ok(Math.hypot(x - padLx, z - padLz) > 3.3 || k in BAYOU_STATICS && Math.hypot(x - padLx, z - padLz) > 2.5, `${k} spot is clear of Tiana's pad`);
  }
  for (const [x, z] of CYPRESS) ok(Math.hypot(x, z) < 9.6 && Math.hypot(x - padLx, z - padLz) > 3.3 && !bayouWet(x, z), 'cypress trees are inside the bayou, off the water and clear of the pad');
  const tapKeys = Object.keys(BAYOU_SPOTS);
  for (let i = 0; i < tapKeys.length; i++) for (let j = i + 1; j < tapKeys.length; j++) {
    const a = BAYOU_SPOTS[tapKeys[i]], b = BAYOU_SPOTS[tapKeys[j]];
    ok(Math.hypot(a[0] - b[0], a[1] - b[1]) >= 1.8, `${tapKeys[i]} and ${tapKeys[j]} are not crowded (the tap system keeps props 1.8 apart)`);
  }
  for (const k of ['reeds', 'chair', 'lantern', 'board', 'basket9', 'basket5', 'basket7']) ok(!bayouWet(...BAYOU_SPOTS[k]), `${k} stands on dry land`);
  for (const k of ['lily', 'boat', 'turtle']) ok(bayouWet(...BAYOU_SPOTS[k]), `${k} is out on the water`);
  ok(bayouWet(CHANNEL.pool.x, CHANNEL.pool.z) && bayouWet(-1.0, 0.4) && !bayouWet(-5.9, -0.3) && !bayouWet(5, 5) && !bayouWet(5.0, 0.4), 'bayouWet: the channel and pool are wet, the cabin porch and the yard are dry');
  ok(channelDist(-1.0, 0.4) < 0.2 && channelDist(8, 8) > 5, 'channelDist measures from the centre line');
  ok(BOARDWALK.bridge0 > -1.0 + CHANNEL.r + CHANNEL.mud && BOARDWALK.bridge1 < -1.0 - CHANNEL.r - CHANNEL.mud, 'the bridge spans the channel and its muddy banks where the boardwalk crosses');
  ok(Math.abs(BOARDWALK.z - padLz) < 0.5 && BOARDWALK.x0 < padLx, 'the boardwalk starts by the pad and runs west');
  ok(BOARDWALK.x1 > DECK.x1 - 1.0 && BOARDWALK.x1 < DECK.x1 + 1.2 && BOARDWALK.z > DECK.z0 && BOARDWALK.z < DECK.z1, 'the boardwalk ends at the porch steps');
  ok(inGarden(GARDEN_PATCH.x, GARDEN_PATCH.z) && !inGarden(0, 0) && !bayouWet(GARDEN_PATCH.x, GARDEN_PATCH.z), 'the vegetable patch is dry ground of its own');
}

// --- Treasures: lilies, 5 per day, date-seeded, only when open ----------------------------------------------------------------
ok(BAYOU_KIND === 'lily' && BAYOU_LAND === 'bayou' && ALL_TREASURE_KINDS.includes('lily') && !TREASURE_KINDS.includes('lily') && ALL_TREASURE_LANDS.includes('bayou'), 'lily is a bayou-only kind (the other lands\' random kinds are unchanged)');
ok(TREASURE_INFO.lily && TREASURE_INFO.lily.emoji === '🪷' && TREASURE_INFO.lily.label === 'Lilies', 'lily has Treasure Book info');
{
  const emojis = Object.values(TREASURE_INFO).map((i) => i.emoji);
  ok(new Set(emojis).size === emojis.length && emojis.length === 10, 'every treasure kind has its own emoji');
  const stickers = ALL_SECRETS.map((s) => s.emoji);
  ok(new Set(stickers).size === stickers.length && stickers.length === 9, 'every sticker has its own emoji');
  ok(Object.keys(TREASURE_INFO).every((k) => ALL_TREASURE_KINDS.includes(k)) && ALL_TREASURE_KINDS.length === 10, 'ten treasure kinds in all');
}
ok(TREASURE_LAND_NAMES.bayou === 'Firefly Bayou' && PRINCESSES.tiana.landName === 'Firefly Bayou', 'bayou has a book name');
const a = treasureSpots(day, BAYOU_LAND, TREASURES_PER_LAND);
ok(a.length === 5 && a.every((s) => s.kind === 'lily' && /^bayou-\d$/.test(s.id)), '5 lily treasures with ids bayou-0..4');
ok(same(a, treasureSpots(day, BAYOU_LAND, 5)), 'bayou treasures: same day, same spots');
ok(!same(a, treasureSpots('2026-10-29', BAYOU_LAND, 5)), 'bayou treasures: new day, new spots');
ok(a.every((s) => Number.isFinite(s.x) && Number.isFinite(s.z) && Math.hypot(s.x, s.z) < 9), 'bayou spots are finite and inside the land');
ok(['library', 'frostfall', 'meadow', 'village', 'cove', 'isle', 'garden', 'harbor'].every((l) => treasureSpots(day, l, 5).every((s) => s.kind !== 'lily')), 'other lands never hide lilies');
ok(same(treasureSpots(day, 'cove', 5).map((s) => s.kind), Array(5).fill('seaglass')) && same(treasureSpots(day, 'isle', 5).map((s) => s.kind), Array(5).fill('blossom'))
  && same(treasureSpots(day, 'garden', 5).map((s) => s.kind), Array(5).fill('moonstone')) && same(treasureSpots(day, 'harbor', 5).map((s) => s.kind), Array(5).fill('anchor')), 'cove, isle, garden and harbor treasures are unchanged');
ok(same(treasureLandsFor(FOUR), ['library', 'frostfall', 'meadow', 'village', 'cove', 'isle', 'garden', 'harbor'])
  && same(treasureLandsFor([...FOUR, 'bayou']), ['library', 'frostfall', 'meadow', 'village', 'cove', 'isle', 'garden', 'harbor', 'bayou']), 'treasure lands: only open lands');
ok(findsTotal(openLandIds('')) === 45 && findsTotal(openLandIds('?preview=tiana')) === 45 && findsTotal(openLandIds('?preview=harbor')) === 45, 'finds total is 45 with the bayou open');
ok(findsTotal(openLandIds('?preview=bayou')) === 45 && findsTotal(openLandIds('?preview=all')) === 45, 'finds total is 45 when the bayou is open');
ok(findsTotal(false) === 20 && findsTotal(['cove']) === 25 && findsTotal(['cove', 'isle']) === 30 && findsTotal(['cove', 'isle', 'garden']) === 35 && findsTotal(FOUR) === 40, 'earlier totals unchanged (20, 25, 30, 35, 40)');
{
  const save = {};
  for (let i = 0; i < 5; i++) ok(collectTreasure(save, `bayou-${i}`, 'lily', day), `collect bayou-${i}`);
  collectTreasure(save, 'library-0', 'shell', day);
  ok(findsToday(save, day, [...FOUR, 'bayou']) === 6, 'bayou open: all six finds count');
  ok(findsToday(save, day, FOUR) === 1, 'bayou closed: bayou finds do not count toward today');
  ok(save.treasures.total.lily === 5, 'lily total is kept');
  ok(awardRowStar(save, 'bayou', day) === true && awardRowStar(save, 'bayou', day) === false, 'bayou row star once per day');
  ok(!collectTreasure({}, 'bayou-0', 'lily', 'today') && !collectTreasure({}, 'bayou-0', 'lilies', day), 'bad day / kind still rejected');
  const full = {};
  for (const l of treasureLandsFor([...FOUR, 'bayou'])) for (let i = 0; i < 5; i++) collectTreasure(full, `${l}-${i}`, l === 'bayou' ? 'lily' : 'shell', day);
  ok(findsToday(full, day, [...FOUR, 'bayou']) === 45, 'all 45 finds can be counted in one day');
  ok(sanitizeTreasures(full.treasures).got.length === 45, 'a healed save keeps all 45 ids (the cap was raised from 40)');
}
{ // Treasure Book: tile, row and sticker only when open
  const closed = treasureBookModel({}, day, { coveOpen: true, isleOpen: true, gardenOpen: true, harborOpen: true });
  ok(closed.kinds.length === 9 && closed.lands.length === 8 && closed.stickers.length === 8, 'book, bayou closed: 9 tiles, 8 land rows, 8 stickers (unchanged)');
  const open = treasureBookModel({}, day, { coveOpen: true, isleOpen: true, gardenOpen: true, harborOpen: true, bayouOpen: true });
  ok(open.kinds.length === 10 && open.kinds[9].kind === 'lily' && open.lands.length === 9 && open.lands[8].id === 'bayou', 'book, bayou open: 10 tiles, 9 land rows');
  ok(open.stickers.length === 9 && open.stickers[8].id === 'tallymarks' && !open.stickers[8].found, 'book, bayou open: 9th sticker (unfound)');
  const kept = treasureBookModel({ treasures: { day, got: [], total: { lily: 2 } }, secrets: ['tallymarks'] }, day);
  ok(kept.kinds.some((k) => k.kind === 'lily') && kept.stickers.some((s) => s.id === 'tallymarks' && s.found), 'earlier bayou finds stay visible even when the bayou is closed');
  ok(treasureBookModel(null, day, { bayouOpen: true }).total === 0, 'null save does not throw');
}

// --- Secret: the tally board shows seven; tap the board, then the basket with seven ----------------------------------------------
ok(SECRETS.length === 4 && COVE_SECRETS.length === 1 && ISLE_SECRETS.length === 1 && GARDEN_SECRETS.length === 1 && HARBOR_SECRETS.length === 1 && BAYOU_SECRETS.length === 1
  && same(ALL_SECRETS, [...SECRETS, ...COVE_SECRETS, ...ISLE_SECRETS, ...GARDEN_SECRETS, ...HARBOR_SECRETS, ...BAYOU_SECRETS]), 'earlier secrets unchanged, one bayou secret after them');
ok(BAYOU_SECRETS[0].id === 'tallymarks' && BAYOU_SECRETS[0].npc === 'tiana' && BAYOU_SECRETS[0].emoji && BAYOU_SECRETS[0].label && BAYOU_SECRETS[0].land === 'bayou', 'bayou secret has a sticker, an owner and a label');
ok(same(sanitizeSecrets(['tallymarks', 'x', 'clock']), ['clock', 'tallymarks']), 'sticker id is a known id');
{ const s = {}; ok(foundSecret(s, 'tallymarks') && !foundSecret(s, 'tallymarks'), 'sticker is earned once'); }
{ // the tally math: four lines and a slash make five; the rest are single lines
  ok(TALLY_TARGET === 7 && same(TALLY_BASKETS, [9, 5, 7]), 'the board shows 7; the baskets hold 9, 5 and 7 (left to right)');
  ok(TALLY_BASKETS.filter((n) => n === TALLY_TARGET).length === 1, 'exactly one basket matches the tally');
  const g7 = tallyMarks(7);
  ok(same(g7, [{ lines: 4, slash: true, count: 5 }, { lines: 2, slash: false, count: 2 }]), 'seven = four lines and a slash (5), then two lines (2)');
  ok(same(tallyMarks(5), [{ lines: 4, slash: true, count: 5 }]) && same(tallyMarks(0), []) && same(tallyMarks(3), [{ lines: 3, slash: false, count: 3 }]), 'five is one slashed group; three is three lines; zero is nothing');
  ok(same(tallyMarks(10).map((g) => g.count), [5, 5]) && same(tallyMarks(9), [{ lines: 4, slash: true, count: 5 }, { lines: 4, slash: false, count: 4 }]), 'ten is two slashed groups; nine is a group of five and four lines');
  for (let n = 0; n <= 10; n++) {
    const g = tallyMarks(n);
    ok(tallyTotal(g) === n, `tally groups of ${n} add up to ${n}`);
    ok(g.every((x) => x.slash ? x.lines === 4 && x.count === 5 : x.lines === x.count && x.lines >= 1 && x.lines <= 4), `tally ${n}: a slash only ever crosses four lines, plain groups are 1-4 lines`);
    ok(g.filter((x) => x.slash).length === Math.floor(n / 5) && g.slice(0, -1).every((x) => x.slash), `tally ${n}: full fives first, then the rest`);
  }
  ok(tallyTotal(tallyMarks(NaN)) === 0 && tallyTotal(tallyMarks(-4)) === 0 && tallyTotal(tallyMarks(99)) === 10 && tallyTotal(tallyMarks('7')) === 7, 'tallyMarks heals bad input');
  for (let n = 1; n <= 12; n++) {
    const rows = tallyRows(n);
    ok(rows.reduce((s, v) => s + v, 0) === n && rows.every((v) => v >= 1 && v <= 4), `${n} vegetables are laid out in tidy rows of at most 4 (${rows.join('+')})`);
  }
  ok(same(tallyRows(7), [3, 4]) && same(tallyRows(5), [2, 3]) && same(tallyRows(9), [3, 3, 3]), 'the baskets\' rows: 3+4, 2+3 and 3+3+3');
  let tr = createSecretTracker();
  ok(tr.tap('tally-board', 0) === null && tr.tap('tally-7', 5000) === 'tallymarks', 'tap the board, then the basket of seven (5 s later): fires');
  tr = createSecretTracker();
  ok(tr.tap('tally-7', 0) === null, 'the basket of seven without looking at the board does not fire');
  tr = createSecretTracker(); tr.tap('tally-board', 0);
  ok(tr.tap('tally-5', 1000) === null && tr.tap('tally-7', 2000) === null, 'a wrong basket uses up the look: count again (look at the board again)');
  tr = createSecretTracker(); tr.tap('tally-board', 0); tr.tap('tally-9', 500);
  ok(tr.tap('tally-board', 1000) === null && tr.tap('tally-7', 3000) === 'tallymarks', 'wrong basket, then the board again, then the right basket: fires');
  tr = createSecretTracker(); tr.tap('tally-board', 0);
  ok(tr.tap('tally-7', 13000) === null, 'too slow (over 12 seconds) does not fire');
  tr = createSecretTracker(); tr.tap('tally-board', 0);
  ok(tr.tap('tally-7', 11500) === 'tallymarks', 'there is time to count (11.5 s is fine)');
  tr = createSecretTracker(); tr.tap('tally-board', 0); tr.tap('tally-7', 100);
  tr.tap('tally-board', 1000);
  ok(tr.tap('tally-7', 1100) === null, 'cooldown after firing (no speech spam)');
  tr = createSecretTracker(); tr.tap('tally-board', 0);
  ok(tr.tap('tally-x', 100) === null && tr.tap('tally-', 100) === null && tr.tap('tally-777', 100) === null && tr.tap('tally-7', 200) === 'tallymarks', 'odd part names are ignored');
  tr = createSecretTracker(); tr.tap('flag-1', 0); tr.tap('flag-2', 10);
  ok(tr.tap('tally-board', 20) === null && tr.tap('flag-3', 30) === 'sentenceflags', 'the harbor secret still works beside the bayou one');
  tr = createSecretTracker(); tr.tap('story-1', 0); tr.tap('story-2', 10);
  ok(tr.tap('story-3', 20) === 'storylanterns', 'the garden secret still works');
  tr = createSecretTracker(); tr.tap('shape-1', 0); tr.tap('shape-2', 10);
  ok(tr.tap('shape-3', 20) === 'shapestones', 'the isle secret still works');
  tr = createSecretTracker(); tr.tap('shell-1', 0); tr.tap('shell-2', 10);
  ok(tr.tap('shell-3', 20) === 'shellrhyme', 'the cove secret still works');
}
{ // The line Tiana says must be true to her skill: counting by 5s with tally marks
  const l = tallyLine();
  ok(l.say === 'Four lines and a slash make five! Five and two more is seven!', `Tiana says the tally line (got "${l.say}")`);
  ok(/^[A-Z]/.test(l.say) && /[.?!]$/.test(l.say) && /^[A-Za-z !]+$/.test(l.say), 'the line is plain spoken text that starts with a capital letter and ends with an end mark');
  ok(l.target === TALLY_TARGET && /four lines and a slash make five/i.test(l.say) && l.say.includes('seven'), 'the line matches the board (7 = 5 + 2)');
}

// --- Run bayou.js for real against the vendored three.js (a tiny stand-in for world.js) ---------------------------------------
function harness(calmMotion) {
  const scene = new THREE.Scene();
  const colliders = [], tapItems = [];
  const Gc = {}, Mc = {};
  const G = (k, f) => (Gc[k] || (Gc[k] = f())), M = (k, f) => (Mc[k] || (Mc[k] = f()));
  const hitGeo = new THREE.SphereGeometry(1, 8, 6), hitMat = new THREE.MeshBasicMaterial(); hitMat.visible = false;
  const addTappable = (kind, x, z, arg, colorHex, secret) => {
    const group = new THREE.Group(); group.position.set(x, 0, z); group.rotation.y = (tapItems.length * 1.9) % 6.28; group.scale.setScalar(1.25);
    const info = kind(group, arg);
    const hit = new THREE.Mesh(hitGeo, hitMat); hit.position.y = info.glowY * 0.8; hit.scale.setScalar(info.hitR); group.add(hit);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ color: colorHex })); glow.position.y = info.glowY; glow.visible = false; group.add(glow);
    scene.add(group);
    const item = { group, hit, glow, baseY: 0, t: -1, secret: secret || null };
    tapItems.push(item);
    return item;
  };
  const bayou = buildBayou({ THREE, scene, center, pad, G, M, addCollider: (x, z, r) => colliders.push({ x, z, r }), addTappable, starGeometry: () => new THREE.BufferGeometry(), softDot: null, calmMotion });
  return { scene, colliders, tapItems, bayou };
}
const names = ['reeds', 'lily', 'chair', 'boat', 'turtle', 'lantern'];   // the six surprises, in build order
const secretKeys = ['board', 'basket9', 'basket5', 'basket7'];
{
  const h = harness(false);
  // Draw calls: every drawable object the bayou adds (hit boxes use an invisible material, glow sprites are hidden at rest).
  const drawables = []; h.scene.traverse((o) => { if ((o.isMesh && o.material.visible !== false) || o.isPoints) drawables.push(o); });
  console.log(`bayou draw calls (real build): ${drawables.length} drawables`);
  ok(drawables.length <= 8, `buildBayou makes at most 8 draw calls (built ${drawables.length})`);
  ok(drawables.length >= 5, 'draw call count looks sane');
  ok(h.tapItems.length === 10, 'ten tappables: six surprises + the board + three baskets');
  const secrets = h.tapItems.filter((i) => i.secret).map((i) => i.secret);
  ok(same(secrets, ['tally-board', 'tally-9', 'tally-5', 'tally-7']), 'the board and the baskets report tally-board and tally-<count>');
  ok(same(secrets.slice(1).map((s) => Number(s.slice(6))), TALLY_BASKETS), 'basket parts are named by how many vegetables they hold');
  [...names, ...secretKeys].forEach((k, i) => {
    const t = h.tapItems[i];
    ok(Math.abs(t.group.position.x - (center.x + BAYOU_SPOTS[k][0])) < 1e-9 && Math.abs(t.group.position.z - (center.z + BAYOU_SPOTS[k][1])) < 1e-9, `${k} tap prop is exactly on its spot`);
  });
  // The tap system would not have to nudge any prop (no collider, pad or other prop too close)
  for (const it of h.tapItems) {
    const x = it.group.position.x, z = it.group.position.z;
    ok(Math.hypot(x - pad.x, z - pad.z) > 3.2, 'tap props stay off the pad');
    ok(Math.hypot(x - center.x, z - center.z) < BAYOU_R, 'tap props stay inside the bayou');
    for (const c of h.colliders) ok(Math.hypot(x - c.x, z - c.z) >= c.r + 0.8 || c.r <= 0.1, `tap prop at ${(x - center.x).toFixed(1)},${(z - center.z).toFixed(1)} is not nudged by a collider`);
  }
  const ux = padLx / Math.hypot(padLx, padLz), uz = padLz / Math.hypot(padLx, padLz);
  const lane = { a: branch.from, b: { x: center.x + ux * 3.0, z: center.z + uz * 3.0 } };
  for (const c of h.colliders) {
    ok(Math.hypot(c.x - center.x, c.z - center.z) < LAND_DISC_R + 0.3, `bayou colliders stay inside the bayou disc (${Math.hypot(c.x - center.x, c.z - center.z).toFixed(2)} at ${(c.x - center.x).toFixed(2)},${(c.z - center.z).toFixed(2)})`);
    ok(Math.hypot(c.x - village.x, c.z - village.z) > LAND_DISC_R + 3, 'bayou colliders never reach Glass Slipper Village');
    ok(Math.hypot(c.x - CASTLE_POS.x, c.z - CASTLE_POS.z) > 5.2 + 8, 'bayou colliders never reach the castle');
    ok(Math.hypot(c.x - pad.x, c.z - pad.z) > c.r + 1.5, 'no collider on Tiana\'s pad');
    ok(distToSegment(c.x, c.z, lane.a, lane.b) - c.r > 1.0, 'the path from the branch to the middle is clear of colliders (Zoe can walk in)');
    ok(Math.hypot(c.x, c.z) + c.r < WORLD_RADIUS + 0.5, 'bayou colliders sit inside the world wall');
    ok(!bayouWet(c.x - center.x, c.z - center.z) || c.r <= 0.3, 'no big collider stands in the water');
  }
  ok(h.colliders.length >= 14, `solid props have colliders (${h.colliders.length})`);
  ok(h.colliders.some((c) => Math.hypot(c.x - (center.x + BAYOU_STATICS.cabin[0]), c.z - (center.z + BAYOU_STATICS.cabin[1])) < 0.01 && c.r >= 1.3), 'the cabin is solid');
  for (const [x, z] of CYPRESS) ok(h.colliders.some((c) => Math.hypot(c.x - (center.x + x), c.z - (center.z + z)) < 0.01), 'every cypress trunk is solid');
  ok(h.colliders.filter((c) => Math.hypot(c.x - (center.x + BAYOU_STATICS.stand[0]), c.z - (center.z + BAYOU_STATICS.stand[1])) < 3).length >= 2, 'the vegetable stand is solid at both ends');
  ok(h.colliders.some((c) => Math.hypot(c.x - (center.x + BAYOU_STATICS.mailbox[0]), c.z - (center.z + BAYOU_STATICS.mailbox[1])) < 0.01), 'the mailbox post is solid');
  // Every reaction runs cleanly from 0 to 1 and leaves the prop where it started
  const state = (it) => { const b = it.group.children[0]; return [b.position.x, b.position.y, b.position.z, b.rotation.x, b.rotation.y, b.rotation.z, b.scale.x, b.scale.y, b.scale.z]; };
  const dist = (p, q) => p.reduce((s, v, i) => s + Math.abs(v - q[i]), 0);
  for (const k of ['lily', 'chair', 'boat', 'turtle', 'lantern']) {
    const it = h.tapItems[names.indexOf(k)];
    ok(typeof it.react === 'function', `${k} has its own reaction`);
    const x0 = it.group.position.x, y0 = it.group.position.y, z0 = it.group.position.z, rest = state(it);
    for (let i = 0; i <= 40; i++) it.react(it, i / 40);
    ok(Math.abs(it.group.position.x - x0) < 1e-6 && Math.abs(it.group.position.z - z0) < 1e-6 && Math.abs(it.group.position.y - y0) < 1e-6, `${k} ends back where it started`);
    ok(dist(state(it), rest) < 1e-9, `${k} ends at rest (same place, turn and size)`);
    let moved = 0;
    for (let i = 1; i < 40; i++) { it.react(it, i / 40); moved = Math.max(moved, dist(state(it), rest)); }
    it.react(it, 1);
    ok(moved > 0.05, `${k} actually moves during its reaction (${moved.toFixed(2)})`);
    ok(dist(state(it), rest) < 1e-9, `${k} settles at rest after a full reaction`);
  }
  {   // the flower really opens: wider and shorter at the peak, narrow and tall at rest
    const it = h.tapItems[names.indexOf('lily')], b = it.group.children[0];
    it.react(it, 0.45);
    ok(b.scale.x > 2 * (1 / 1.25) * 0.55 && b.scale.y < (1 / 1.25) * 1.25, 'the lily flower opens wider and lower at the peak');
    it.react(it, 1);
  }
  {   // the turtle pops UP out of the water and looks round
    const it = h.tapItems[names.indexOf('turtle')], b = it.group.children[0], low = b.position.y;
    let high = low, turn = 0;
    for (let i = 1; i < 40; i++) { it.react(it, i / 40); high = Math.max(high, b.position.y); turn = Math.max(turn, Math.abs(b.rotation.y)); }
    it.react(it, 1);
    ok(high - low > 0.25 / 1.25 - 0.01 && turn > 0.3, 'the turtle rises out of the water and turns to look round');
  }
  {   // the chair rocks about its rockers: it stays on the porch floor (the contact point does not sink or float)
    const it = h.tapItems[names.indexOf('chair')], b = it.group.children[0];
    let lo = Infinity, hi = -Infinity;
    for (let i = 0; i <= 80; i++) { it.react(it, i / 80); lo = Math.min(lo, b.position.y); hi = Math.max(hi, b.position.y); }
    it.react(it, 1);
    ok(hi - lo < 0.06, `the chair rocks without bouncing (height range ${(hi - lo).toFixed(3)})`);
  }
  // The shared Points: lantern halo + fireflies at rest, effects start on tap and park themselves again
  const pts = drawables.find((o) => o.isPoints);
  ok(pts && pts.visible, 'the fireflies are drawn at rest (one Points draw call)');
  const posA = pts.geometry.attributes.position, colA = pts.geometry.attributes.color;
  const nStatic = BAYOU_FX.halos * BAYOU_FX.haloDots + BAYOU_FX.fireflies;
  const lit = (i) => colA.getX(i) + colA.getY(i) + colA.getZ(i) > 0.3 && posA.getY(i) > -40;
  const effectsOn = () => { let n = 0; for (let i = nStatic; i < posA.count; i++) if (posA.getY(i) > -40) n++; return n; };
  ok(lit(0) && lit(1) && lit(2), 'the porch lantern glows at rest');
  ok(effectsOn() === 0, 'no effect dots show at rest');
  let flies = 0; for (let i = BAYOU_FX.halos * BAYOU_FX.haloDots; i < nStatic; i++) if (lit(i)) flies++;
  ok(flies === BAYOU_FX.fireflies, `all ${BAYOU_FX.fireflies} fireflies are glowing at rest (${flies})`);
  for (let i = BAYOU_FX.halos * BAYOU_FX.haloDots; i < nStatic; i++) {
    const x = posA.getX(i) - center.x, y = posA.getY(i), z = posA.getZ(i) - center.z;
    ok(Math.hypot(x, z) < BAYOU_R && y > 0.3 && y < 3.2 && Math.hypot(x - padLx, z - padLz) > 1.0, 'every firefly floats inside the bayou, above the ground');
  }
  for (const k of names) {
    const it = h.tapItems[names.indexOf(k)];
    ok(typeof it.onTap === 'function', `${k} starts its effect on tap`);
    it.onTap(it);
    let peak = 0;
    for (let i = 0; i < 600; i++) { h.bayou.update(i * 0.016, 0.016); peak = Math.max(peak, effectsOn()); }
    ok(peak > 0, `${k} effect shows dots`);
    ok(effectsOn() === 0, `${k} effect parks its dots again`);
    if (k === 'reeds') ok(peak >= 8, 'the fireflies swirl up out of the reeds in a whole spiral of dots');
    if (k === 'lily') ok(peak >= 8, 'the lily pads ripple in rings (and petals sparkle)');
  }
  for (let s = 0; s < 4; s++) {   // the board and the baskets light up when tapped
    const it = h.tapItems[6 + s]; it.onTap(it);
    h.bayou.update(0.5, 0.016);
    ok(lit((1 + s) * BAYOU_FX.haloDots), `${secretKeys[s]} lights up when tapped`);
    for (let i = 0; i < 200; i++) h.bayou.update(i * 0.016, 0.016);
    ok(!lit((1 + s) * BAYOU_FX.haloDots), `${secretKeys[s]} settles again`);
  }
  // fireflies and the lantern glow gently: brightness never jumps between frames
  {
    let jump = 0, prev = null, lo = 9, hi = 0;
    for (let i = 0; i < 900; i++) {
      h.bayou.update(i * 0.016, 0.016);
      const v = [colA.getX(0), colA.getX(15), colA.getX(20), colA.getX(30)];
      lo = Math.min(lo, v[0]); hi = Math.max(hi, v[0]);
      if (prev) for (let j = 0; j < v.length; j++) jump = Math.max(jump, Math.abs(v[j] - prev[j]));
      prev = v;
    }
    ok(hi > lo && jump < 0.05, `the lantern and the fireflies breathe gently (biggest step ${jump.toFixed(3)})`);
  }
  // Treasure placement, the way world.js does it (spots on dry land, then nudged clear of props): every day's five lilies end up free, dry and inside the bayou
  {
    const wetW = (x, z) => !h.bayou.dry(x, z);
    let worst = 0, failed = 0, closeToSpot = 0, total = 0;
    for (let d = 0; d < 400; d++) {
      const dayKey = todayKey(new Date(2026, 0, 1 + d));
      const placed = [];
      const free = (x, z) => {
        for (const c of h.colliders) if (Math.hypot(x - c.x, z - c.z) < c.r + 0.8) return false;
        if (Math.hypot(x - pad.x, z - pad.z) < 3.2) return false;
        for (const it of h.tapItems) if (Math.hypot(x - it.group.position.x, z - it.group.position.z) < 1.8) return false;
        for (const p of placed) if (Math.hypot(x - p[0], z - p[1]) < 1.6) return false;
        return true;
      };
      for (const sp of treasureSpots(dayKey, 'bayou', 5, undefined, (lx, lz) => wetW(center.x + lx, center.z + lz))) {
        const wx0 = center.x + sp.x, wz0 = center.z + sp.z;
        const [px, pz] = h.bayou.settle(wx0, wz0, free);
        total++;
        if (!(free(px, pz) && !wetW(px, pz)) || Math.hypot(px - center.x, pz - center.z) > BAYOU_R) failed++;
        if (bayouWet(px - center.x, pz - center.z) || inGarden(px - center.x, pz - center.z)) failed++;
        if (Math.hypot(px - wx0, pz - wz0) < 3.0) closeToSpot++;
        worst = Math.max(worst, Math.hypot(px - wx0, pz - wz0));
        placed.push([px, pz]);
      }
    }
    ok(failed === 0, `every lily finds a free dry spot inside the bayou on 400 different days (${failed} failed)`);
    ok(worst < 8 && closeToSpot / total > 0.7, `lilies stay near their seeded spots (worst move ${worst.toFixed(1)} m; ${(100 * closeToSpot / total).toFixed(0)}% within 3 m)`);
    ok(same(treasureSpots(day, 'bayou', 5), treasureSpots(day, 'bayou', 5, undefined, null)) && same(treasureSpots(day, 'cove', 5), treasureSpots(day, 'cove', 5, undefined, null)), 'the optional avoid test changes nothing for the other lands');
    // the water avoid test really moves spots that would have been wet
    const wetSpots = (() => { let n = 0; for (let d = 0; d < 400; d++) for (const sp of treasureSpots(todayKey(new Date(2026, 0, 1 + d)), 'bayou', 5)) if (bayouWet(sp.x, sp.z)) n++; return n; })();
    const wetAvoid = (() => { let n = 0; for (let d = 0; d < 400; d++) for (const sp of treasureSpots(todayKey(new Date(2026, 0, 1 + d)), 'bayou', 5, undefined, (x, z) => bayouWet(x, z))) if (bayouWet(sp.x, sp.z)) n++; return n; })();
    console.log(`bayou treasure spots in the water over 400 days: ${wetSpots} without avoid, ${wetAvoid} with avoid (of 2000)`);
    ok(wetAvoid < wetSpots || wetSpots === 0, 'asking for dry spots reduces the seeded spots that start in the water');
  }
  ok(h.bayou.wet(center.x + CHANNEL.pool.x, center.z + CHANNEL.pool.z) && !h.bayou.wet(center.x - 5.5, center.z + 0.2) && h.bayou.dry(center.x - 5.9, center.z + 0.3) && !h.bayou.dry(center.x + CHANNEL.pool.x, center.z + CHANNEL.pool.z), 'wet() / dry() use world coordinates');
  ok(!h.bayou.dry(center.x + GARDEN_PATCH.x, center.z + GARDEN_PATCH.z), 'finds are never hidden in the vegetable patch');
  // Every drawn vertex stays inside the bayou's neighbourhood: nothing spills over Glass Slipper Village
  const box = new THREE.Box3();
  let maxR = 0;
  h.scene.updateMatrixWorld(true);
  const v = new THREE.Vector3();
  for (const o of drawables) {
    if (!o.isMesh) continue;
    const p = o.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld);
      box.expandByPoint(v);
      maxR = Math.max(maxR, Math.hypot(v.x - center.x, v.z - center.z));
    }
  }
  console.log(`bayou biggest radius: ${maxR.toFixed(2)} m; tallest prop: ${box.max.y.toFixed(2)} m`);
  ok(maxR < 11.2, `all bayou art stays within 11.2 m of its centre (${maxR.toFixed(2)})`);
  ok(Math.hypot(center.x - village.x, center.z - village.z) - maxR - LAND_DISC_R > 2, 'no bayou art reaches into the Glass Slipper Village disc');
  ok(box.max.y < 7, `the tallest bayou prop (a cypress) stays under 7 m (${box.max.y.toFixed(2)})`);
  ok(box.min.y > -0.5, 'nothing sinks far below the ground');
}
{
  const h = harness(true);
  const pts = []; h.scene.traverse((o) => { if (o.isPoints) pts.push(o); });
  const before = Array.from(pts[0].geometry.attributes.position.array).concat(Array.from(pts[0].geometry.attributes.color.array));
  const boat = h.tapItems[names.indexOf('boat')].group.children[0], lamp = h.tapItems[names.indexOf('lantern')].group.children[0];
  const y0 = boat.position.y, r0 = boat.rotation.z, l0 = lamp.rotation.z;
  for (let i = 0; i < 20; i++) h.bayou.update(i, 0.016);
  const after = Array.from(pts[0].geometry.attributes.position.array).concat(Array.from(pts[0].geometry.attributes.color.array));
  ok(boat.position.y === y0 && boat.rotation.z === r0 && lamp.rotation.z === l0 && same(before, after), 'calm motion: update moves and flickers nothing (no drifting fireflies, no swinging)');
  ok(pts[0].visible && before.slice(0, 3).some((v) => v !== 0), 'calm motion: the lantern halo and the fireflies still sit there, softly lit');
  let litFlies = 0; for (let i = BAYOU_FX.halos * BAYOU_FX.haloDots; i < BAYOU_FX.halos * BAYOU_FX.haloDots + BAYOU_FX.fireflies; i++) if (pts[0].geometry.attributes.color.getX(i) > 0.3) litFlies++;
  ok(litFlies === BAYOU_FX.fireflies, 'calm motion: every firefly is still softly glowing');
}

// --- Source checks ----------------------------------------------------------------------------------------------------
const bayou = src('js/bayou.js'), world = src('js/world.js'), main = src('js/main.js'), ui = src('js/ui.js'), sw = src('sw.js');
const worldmap = src('js/worldmap.js'), treasures = src('js/treasures.js'), wf = readFileSync(new URL('../../.github/workflows/starlight-tests.yml', import.meta.url), 'utf8');
{ // Draw-call budget by source inspection (same method as harbor_check): Mesh/Points/Sprite constructors + own(...) calls.
  const body = bayou.slice(bayou.indexOf('export function buildBayou'));
  const ownDef = body.match(/const own = \(m, mat\) => new THREE\.Mesh\([^\n]*\);/);
  ok(!!ownDef, 'own() helper found');
  const rest = ownDef ? body.replace(ownDef[0], '') : body;
  const direct = (rest.match(/new THREE\.(Mesh|InstancedMesh|SkinnedMesh|Points|Sprite|Line|LineSegments)\(/g) || []).length;
  const owned = (rest.match(/\bown\([a-z]+(?:, *\w+)?\)/g) || []).length;
  console.log(`bayou draw calls (source count): ${direct + owned} (${direct} direct + ${owned} via own())`);
  ok(direct + owned <= 8, `buildBayou makes at most 8 draw calls (counted ${direct + owned})`);
  ok(direct + owned >= 5, 'source draw call count looks sane');
  ok(!/new THREE\.\w*Light\(/.test(bayou) && !/castShadow|receiveShadow|shadowMap/.test(bayou), 'no extra lights, no shadow maps');
  ok(/makeMerger/.test(bayou), 'repeats are merged');
  ok(!/\.load\(|new Audio|Image\(|fetch\(|\.png|\.mp3|\.wav|\.jpg|\.svg|CanvasTexture|createElement/.test(bayou), 'no new audio or image files (the tally marks are plain shapes)');
  ok(/MeshBasicMaterial/.test(bayou), 'the windows, bulbs, lantern and chalk marks glow with an unlit material');
}
ok(/calmMotion/.test(bayou) && /if \(calmMotion\) return;/.test(bayou), 'bayou update does nothing under calm motion');
ok(/if \(it\.onTap && !calmMotion\) it\.onTap\(it\)/.test(world), 'effects start only when motion is allowed');
{
  const rs = world.indexOf('function tapReact('), re = world.indexOf('function startTapReaction(', rs), r = world.slice(rs, re);
  const calmAt = r.indexOf('if (calmMotion) {'), elseAt = r.indexOf('} else {', calmAt);
  ok(calmAt > 0 && elseAt > calmAt && !/react\(/.test(r.slice(calmAt, elseAt)), 'calm branch never runs the bayou\'s custom motion (glow only)');
}
// Only when open
ok(/const bayouOpen = isBayouOpen\(\)/.test(world) && /if \(bayouOpen\) \{\s*bayou = buildBayou\(/.test(world), 'world builds the bayou only when open');
ok(/const openLands = openLandIds\(\)/.test(world) && /treasureLandsFor\(openLands\)/.test(world), 'world hides bayou treasures only when open');
ok(/closedSlots\(\)\.map/.test(world), 'world draws gates from closedSlots (an open slot is skipped)');
ok(/landPads\[BAYOU\.land\]/.test(world) && /landCenters\[BAYOU\.land\]/.test(world), 'the bayou centre and Tiana\'s pad are stored like the harbor\'s');
ok(/bayou\.dry\(/.test(world) && /bayou\.settle\(/.test(world), 'treasures stay out of the water (the bayou settles every find on clear dry ground)');
ok(/lily\(g\)/.test(world) && /lily: 0x/.test(world), 'world draws the lily treasure and gives it a glow colour');
ok(/tiana:\s*\{[^}]*land: 'bayou'/.test(world) && PRINCESSES.tiana.name === 'Tiana', 'NPC_DEFS.tiana.land is the bayou (the pad is stored and Tiana is spawned on it, K13)');
ok(NPC_ORDER.includes('tiana') && /NPC_TO_LAND = \{[^}]*tiana: 'bayou'/.test(main), 'Tiana is in NPC_ORDER and NPC_TO_LAND (K13)');
ok(/wsw:\s*'tiana'/.test(worldmap.replace(/\/\/.*$/gm, '').replace(/PLANNED_SLOTS[\s\S]*?\};/, '')), 'BUILT_SLOTS holds wsw: tiana');
ok(/BUILT_SLOTS\s*=\s*\{\s*sse:\s*'ariel',\s*ssw:\s*'moana',\s*nne:\s*'jasmine',\s*ese:\s*'anna',\s*wsw:\s*'tiana'\s*\}/.test(worldmap.replace(/\/\/.*$/gm, '')), 'BUILT_SLOTS holds sse, ssw, nne, ese and wsw');
ok(/PREVIEW_LANDS\s*=\s*\{\s*cove:\s*'sse',\s*isle:\s*'ssw',\s*garden:\s*'nne',\s*harbor:\s*'ese',\s*bayou:\s*'wsw'\s*\}/.test(worldmap), 'preview flags map to slots (cove, isle, garden, harbor, bayou)');
ok(/import \{ buildBayou \} from '\.\/bayou\.js\?v=20261027e2'/.test(world), 'world imports bayou.js with the existing ?v= stamp');
ok(/import \{ makeMerger \} from '\.\/cove\.js\?v=20261027e2'/.test(bayou) && /from '\.\/treasures\.js\?v=20261027e2'/.test(bayou), 'bayou.js shares the cove\'s merger and the tally helpers with the existing stamp');
ok(/'\.\/js\/bayou\.js\?v=20261027e2'/.test(sw), 'bayou.js is precached with the existing stamp');
ok(!/CACHE_VERSION\s*=\s*['"][^'"]*bayou/i.test(sw) && !/\?v=2026\d+(?!e2)\w*/.test(bayou.replace(/\?v=20261027e2/g, '')), 'cache version and stamps untouched');
ok(/findsTotal\(OPEN_LANDS\)/.test(main) && /findsToday\(Save\.data, todayKey\(\), OPEN_LANDS\)/.test(main), 'main counts only open lands (45 now)');
ok(/id === 'tallymarks'\) line = tallyLine\(\)\.say/.test(main) && /Narrator\.speakExact\(def\.npc, line\)/.test(main), 'the tally line is spoken with Tiana\'s voice via speakExact');
ok(/bayouOpen: isBayouOpen\(\)/.test(ui), 'Treasure Book asks for the bayou only when open');
ok(/zsq-tb-ten/.test(ui) && /zsq-tb-vast/.test(ui) && /zsq-tb-ninest/.test(ui) && /zsq-tb-nine/.test(ui) && /zsq-tb-tight/.test(ui), 'Treasure Book has the compact 10-tile / 9-row / 9-sticker layout');
ok(/Firefly Bayou check/.test(wf) && /bayou_check\.mjs/.test(wf), 'CI runs this test');
// Six surprises
for (const k of names) ok(new RegExp(`items\\.${k} = addTappable\\(`).test(bayou), `surprise: ${k}`);
ok(/'tally-board'/.test(bayou) && /'tally-' \+ n/.test(bayou), 'the board and baskets report tally-board and tally-<count>');
// No film characters, songs, lines or iconic props (original art only)
{
  const banned = [/\bNaveen\b/, /\bLouis\b/, /\bRay\b/, /\bFacilier\b/, /Mama Odie/i, /\bCharlotte\b/, /frog prince/i, /voodoo/i, /Almost There/i, /dig a little deeper/i, /Tiana'?s Palace/i, /\bEvangeline\b/];
  const more = [/\bfrogs?\b/i, /alligator|\bgator\b/i, /shadow man|tarot|\bmasks?\b|\bmardi\b|\bgumbo\b|\bbeignet/i, /\bcrown\b|\btiara\b|\bpalace\b/i];
  for (const [name, text] of [['bayou.js', bayou], ['treasures.js', treasures], ['worldmap.js', worldmap], ['main.js', main], ['ui.js', ui], ['world.js', world]]) {
    for (const re of banned) { const m = text.match(re); ok(!m, `${name} has no film terms (found ${m && m[0]})`); }
  }
  const code = bayou.replace(/\/\/.*$/gm, '');
  for (const re of more) { const m = code.match(re); ok(!m, `bayou.js has no frog / alligator / shadow-magic / parade / palace props (found ${m && m[0]})`); }
  ok(!/the princess and the frog|Dr\.? Facilier/i.test(bayou + treasures + worldmap), 'no film titles');
  ok(/firefl/i.test(bayou) && !/\b(Ray|Evangeline)\b/.test(bayou), 'fireflies are plain glowing dots with no name');
  ok(!/Lightning|Louisiana|Naveen/.test(bayou), 'no other film or place names in the bayou art');
}

if (bad.length) { console.log('FAIL'); for (const b of bad) console.log(' -', b); process.exit(1); }
console.log('bayou_check ok');
