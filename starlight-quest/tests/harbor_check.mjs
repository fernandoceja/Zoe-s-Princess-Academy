// Sunny Fjord Harbor (K10): the land is built only when its slot ('ese') is "open" (?preview=harbor / all now; for real when Anna's quests land in K11),
// has its own treasure kind (anchors) and one secret (three sentence flags: a capital letter, some words, an end mark . ? !), respects calm motion,
// stays inside the draw-call budget, stays clear of Frostfall Peaks / the other lands / the castle / the paths, and uses no film characters or iconic props.
// Pure helpers are imported; harbor.js itself runs here against the vendored three.js with a tiny stand-in for world.js (no browser needed), and the
// wiring in world/main/ui is checked by source inspection.
import { readFileSync } from 'node:fs';
import * as THREE from '../vendor/three.module.js';
import {
  BUILT_SLOTS, PLANNED_SLOTS, PREVIEW_LANDS, builtSlotIds, closedSlots, openSlotIds, isSlotOpen, isCoveOpen, isIsleOpen, isGardenOpen, isHarborOpen, openLandIds,
  previewFlags, harborGeometry, coveGeometry, isleGeometry, gardenGeometry, HARBOR, slotPos, NEW_LAND_SLOTS, LAND_DISC_R, LAND_DIST, INNER_LAND_ANGLES, CASTLE_POS,
  pathSegments, distToSegment, PATH_WIDTH, WORLD_RADIUS, ANNA_SLOT,
} from '../js/worldmap.js';
import {
  todayKey, treasureSpots, collectTreasure, treasureBookModel, treasureLandsFor, findsTotal, findsToday, awardRowStar,
  TREASURE_KINDS, ALL_TREASURE_KINDS, ALL_TREASURE_LANDS, HARBOR_KIND, HARBOR_LAND, TREASURES_PER_LAND, TREASURE_INFO, TREASURE_LAND_NAMES,
  SECRETS, COVE_SECRETS, ISLE_SECRETS, GARDEN_SECRETS, HARBOR_SECRETS, BAYOU_SECRETS, GLEN_SECRETS, ALL_SECRETS, sanitizeSecrets, foundSecret, createSecretTracker, sentenceLine, SENTENCE_FLAGS, END_MARKS,
} from '../js/treasures.js';
import { buildHarbor, harborWet, HARBOR_SPOTS, HARBOR_STATICS, HARBOR_R, WATER, DOCK, SENTENCE_FLAG_KEYS, PINES } from '../js/harbor.js';
import { NPC_ORDER, PRINCESSES } from '../js/quests.js';

const bad = [];
const ok = (cond, msg) => { if (!cond) bad.push(msg); };
const src = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const day = '2026-10-28';

// --- "Open": closed by default, open with the preview flag --------------------------------------------------------------
ok(PLANNED_SLOTS.anna === 'ese' && ANNA_SLOT === 'ese' && HARBOR.slot === 'ese' && HARBOR.land === 'harbor' && HARBOR.princess === 'anna', 'harbor sits at Anna\'s planned ese slot');
ok(BUILT_SLOTS.ese === 'anna' && builtSlotIds().includes('ese'), 'ese is built (Anna\'s quests landed in K11)');
ok(isHarborOpen() && isHarborOpen('') && isHarborOpen('?x=1') && isHarborOpen('?preview=cove') && isHarborOpen('?preview=isle') && isHarborOpen('?preview=garden') && isHarborOpen('?preview=anna'), 'harbor is OPEN by default (K11) whatever the flags say');
ok(isHarborOpen('?preview=tiana') && isHarborOpen('?preview=aurora') && isHarborOpen('?preview=ese') && isHarborOpen('?preview=jasmine,moana') && isHarborOpen('?preview=harbor'), 'unknown / other preview names are harmless, and ?preview=harbor changes nothing');
ok(isHarborOpen('?preview=harbor') && isHarborOpen('?preview=all') && isHarborOpen('?a=1&preview=Harbor') && isHarborOpen('?preview=cove,harbor'), 'preview=harbor / all / lists open it');
ok(PREVIEW_LANDS.harbor === 'ese' && PREVIEW_LANDS.cove === 'sse' && PREVIEW_LANDS.isle === 'ssw' && PREVIEW_LANDS.garden === 'nne', 'harbor is in PREVIEW_LANDS (the other flags stay)');
ok(isCoveOpen() && isIsleOpen() && isGardenOpen() && isCoveOpen('?preview=harbor') && isGardenOpen('?preview=harbor'), 'the built lands stay open (and harmless with the harbor flag)');
ok(same(openLandIds(''), ['cove', 'isle', 'garden', 'harbor', 'bayou', 'glen']) && same(openLandIds('?preview=tiana'), ['cove', 'isle', 'garden', 'harbor', 'bayou', 'glen']), 'without the harbor flag the harbor is open anyway (K11)');
ok(same(openLandIds('?preview=harbor'), ['cove', 'isle', 'garden', 'harbor', 'bayou', 'glen']) && same(openLandIds('?preview=all'), ['cove', 'isle', 'garden', 'harbor', 'bayou', 'glen']), 'built lands stay open; preview=all also includes the glen');
ok(same([...openSlotIds('')].sort(), ['ene', 'ese', 'nne', 'sse', 'ssw', 'wsw']) && same([...openSlotIds('?preview=harbor')].sort(), ['ene', 'ese', 'nne', 'sse', 'ssw', 'wsw']), 'open slots: ese is open with or without the flag');
ok(closedSlots('').length === 0 && !closedSlots('').some((s) => s.slot === 'ese'), 'default: the ese star gate is gone (1 gate left)');
ok(closedSlots('?preview=harbor').length === 0 && !closedSlots('?preview=harbor').some((s) => s.slot === 'ese'), 'open harbor has no gate; the last one stays');
ok(closedSlots('?preview=all').length === 0 && closedSlots('?preview=harbor').length === 0, 'ene stays closed normally; preview=all opens the glen');
ok(isSlotOpen('wsw', '') && (isSlotOpen('ene', '') && isSlotOpen('ene', '?preview=all')), 'the bayou is built (K13); the last land is preview-only');
ok(previewFlags('?preview=%%%').size >= 0 && previewFlags(null).size === 0, 'bad query strings never throw');

// --- Geometry: the path reaches the land, Anna's pad is stored, clear of Frostfall, the castle, the plaza paths and the other lands ---
const { center, pad } = harborGeometry();
const segs = pathSegments();
const branch = segs.find((s) => s.kind === 'branch' && s.slot === 'ese');
const trunk45 = segs.find((s) => s.kind === 'trunk' && Math.abs(Math.atan2(s.to.z, s.to.x) - (45 * Math.PI / 180)) < 1e-6);
const frost = { x: Math.cos(INNER_LAND_ANGLES.frostfall) * LAND_DIST, z: Math.sin(INNER_LAND_ANGLES.frostfall) * LAND_DIST };
const local = (p) => [p.x - center.x, p.z - center.z];
{
  const c = slotPos(NEW_LAND_SLOTS.find((s) => s.slot === 'ese'));
  ok(Math.hypot(center.x - c.x, center.z - c.z) < 1e-9, 'harbor centre is the slot position (the branch ends there)');
  ok(distToSegment(center.x, center.z, branch.from, branch.to) < 1e-6, 'the branch path runs into the harbor');
  ok(distToSegment(pad.x, pad.z, branch.from, branch.to) < PATH_WIDTH / 2, 'the pad is on the path side of the harbor');
  const dPad = Math.hypot(pad.x - center.x, pad.z - center.z);
  ok(dPad > 5 && dPad < LAND_DISC_R - 2, `pad is inside the disc near the entrance (${dPad.toFixed(1)})`);
  ok(Math.hypot(pad.x, pad.z) < Math.hypot(center.x, center.z), 'pad is on the hub side of the centre');
  ok(Math.hypot(pad.x, pad.z) < WORLD_RADIUS, 'pad is inside the world wall');
  // Frostfall Peaks (Elsa's land, due east) is the neighbour: the two discs are well apart
  ok(Math.hypot(center.x - frost.x, center.z - frost.z) > 2 * LAND_DISC_R + 3, `harbor disc is clear of the Frostfall disc (${Math.hypot(center.x - frost.x, center.z - frost.z).toFixed(1)})`);
  for (const a of Object.values(INNER_LAND_ANGLES)) {
    ok(Math.hypot(center.x - Math.cos(a) * LAND_DIST, center.z - Math.sin(a) * LAND_DIST) > 2 * LAND_DISC_R + 3, 'harbor is clear of the inner lands');
  }
  ok(Math.hypot(center.x - CASTLE_POS.x, center.z - CASTLE_POS.z) > LAND_DISC_R + 8, 'harbor is clear of the castle');
  ok(Math.hypot(center.x, center.z) > 8.5 + LAND_DISC_R + 10, 'harbor is far outside the hub plaza');
  for (const [name, g] of [['cove', coveGeometry()], ['isle', isleGeometry()], ['garden', gardenGeometry()]]) {
    ok(Math.hypot(center.x - g.center.x, center.z - g.center.z) > 2 * LAND_DISC_R + 6, `harbor and ${name} are far apart`);
  }
  // Other paths: the harbor disc never touches a path that is not its own (its own branch and the shared 45-degree trunk)
  for (const sg of segs) {
    if (sg === branch || sg === trunk45) continue;
    ok(distToSegment(center.x, center.z, sg.from, sg.to) > LAND_DISC_R + PATH_WIDTH / 2, `the harbor disc does not touch another ${sg.kind} path`);
  }
  ok(distToSegment(center.x, center.z, trunk45.from, trunk45.to) > LAND_DISC_R + PATH_WIDTH / 2, 'the harbor disc does not touch the shared trunk either');
  // The fjord water reaches outside the grass in places: every point of its outer edge stays clear of Frostfall and inside the scatter-free ring
  for (let k = 0; k < 64; k++) {
    const a = k / 64 * Math.PI * 2, x = WATER.x + Math.cos(a) * (WATER.rx + 0.8), z = WATER.z + Math.sin(a) * (WATER.rz + 0.8);
    ok(Math.hypot(center.x + x - frost.x, center.z + z - frost.z) > LAND_DISC_R + 2.5, 'the fjord water and its beach stay clear of the Frostfall disc');
    ok(Math.hypot(WATER.x + Math.cos(a) * WATER.rx, WATER.z + Math.sin(a) * WATER.rz) < 11.5, 'the fjord water stays inside the ring the world keeps free of scatter (11.5 m)');
    ok(Math.hypot(WATER.x + Math.cos(a) * (WATER.rx + 0.75), WATER.z + Math.sin(a) * (WATER.rz + 0.7)) < 12.0, 'the beach edge is barely outside that ring');
    ok(Math.hypot(center.x + x, center.z + z) < WORLD_RADIUS, 'the fjord water stays inside the world wall');
  }
  const all = { ...HARBOR_SPOTS, ...HARBOR_STATICS };
  for (const [k, [x, z]] of Object.entries(all)) {
    ok(Math.hypot(x, z) < (k === 'gull' ? HARBOR_R : HARBOR_R - 0.2), `${k} spot is inside the harbor (${Math.hypot(x, z).toFixed(1)} of ${HARBOR_R})`);
    ok(Math.hypot(center.x + x, center.z + z) < WORLD_RADIUS - 0.5, `${k} spot is inside the world wall`);
    ok(Math.hypot(x - local(pad)[0], z - local(pad)[1]) > 3.3 || k in HARBOR_STATICS && Math.hypot(x - local(pad)[0], z - local(pad)[1]) > 2.5, `${k} spot is clear of Anna's pad`);
  }
  for (const [x, z] of PINES) ok(Math.hypot(x, z) < 10.0 && Math.hypot(x - local(pad)[0], z - local(pad)[1]) > 3.3 && !harborWet(x, z), 'pines are inside the harbor, off the water and clear of the pad');
  const tapKeys = Object.keys(HARBOR_SPOTS);
  for (let i = 0; i < tapKeys.length; i++) for (let j = i + 1; j < tapKeys.length; j++) {
    const a = HARBOR_SPOTS[tapKeys[i]], b = HARBOR_SPOTS[tapKeys[j]];
    ok(Math.hypot(a[0] - b[0], a[1] - b[1]) >= 1.8, `${tapKeys[i]} and ${tapKeys[j]} are not crowded (the tap system keeps props 1.8 apart)`);
  }
  for (const k of ['lighthouse', 'bunting', 'flowerbox', 'bell', 'flag1', 'flag2', 'flag3']) ok(!harborWet(...HARBOR_SPOTS[k]), `${k} stands on dry land`);
  ok(harborWet(WATER.x, WATER.z) && harborWet(DOCK.x, -6) && !harborWet(-5, 4) && !harborWet(5, 5) && !harborWet(0, 0), 'harborWet: the fjord and the dock are wet, the town is dry');
  ok(HARBOR_SPOTS.boat[1] < DOCK.z0 && HARBOR_SPOTS.gull[1] < DOCK.z0, 'the boat and the gull are out on the water / dock');
  ok(HARBOR_SPOTS.flag1[0] < HARBOR_SPOTS.flag2[0] && HARBOR_SPOTS.flag2[0] < HARBOR_SPOTS.flag3[0], 'the flags read left to right: capital letter, words, end mark');
}

// --- Treasures: anchors, 5 per day, date-seeded, only when open --------------------------------------------------------------
ok(HARBOR_KIND === 'anchor' && HARBOR_LAND === 'harbor' && ALL_TREASURE_KINDS.includes('anchor') && !TREASURE_KINDS.includes('anchor') && ALL_TREASURE_LANDS.includes('harbor'), 'anchor is a harbor-only kind (the other lands\' random kinds are unchanged)');
ok(TREASURE_INFO.anchor && TREASURE_INFO.anchor.emoji === '⚓' && TREASURE_INFO.anchor.label === 'Anchors', 'anchor has Treasure Book info');
{
  const emojis = Object.values(TREASURE_INFO).map((i) => i.emoji);
  ok(new Set(emojis).size === emojis.length && emojis.length === 11, 'every treasure kind has its own emoji');
  const stickers = ALL_SECRETS.map((s) => s.emoji);
  ok(new Set(stickers).size === stickers.length && stickers.length === 10, 'every sticker has its own emoji');
}
ok(TREASURE_LAND_NAMES.harbor === 'Sunny Fjord Harbor' && PRINCESSES.anna.landName === 'Sunny Fjord Harbor', 'harbor has a book name');
const a = treasureSpots(day, HARBOR_LAND, TREASURES_PER_LAND);
ok(a.length === 5 && a.every((s) => s.kind === 'anchor' && /^harbor-\d$/.test(s.id)), '5 anchor treasures with ids harbor-0..4');
ok(same(a, treasureSpots(day, HARBOR_LAND, 5)), 'harbor treasures: same day, same spots');
ok(!same(a, treasureSpots('2026-10-29', HARBOR_LAND, 5)), 'harbor treasures: new day, new spots');
ok(a.every((s) => Number.isFinite(s.x) && Number.isFinite(s.z) && Math.hypot(s.x, s.z) < 9), 'harbor spots are finite and inside the land');
ok(['library', 'frostfall', 'meadow', 'village', 'cove', 'isle', 'garden'].every((l) => treasureSpots(day, l, 5).every((s) => s.kind !== 'anchor')), 'other lands never hide anchors');
ok(same(treasureSpots(day, 'cove', 5).map((s) => s.kind), Array(5).fill('seaglass')) && same(treasureSpots(day, 'isle', 5).map((s) => s.kind), Array(5).fill('blossom'))
  && same(treasureSpots(day, 'garden', 5).map((s) => s.kind), Array(5).fill('moonstone')), 'cove, isle and garden treasures are unchanged');
ok(same(treasureLandsFor(['cove', 'isle', 'garden']), ['library', 'frostfall', 'meadow', 'village', 'cove', 'isle', 'garden'])
  && same(treasureLandsFor(['cove', 'isle', 'garden', 'harbor']), ['library', 'frostfall', 'meadow', 'village', 'cove', 'isle', 'garden', 'harbor']), 'treasure lands: only open lands');
ok(findsTotal(openLandIds('')) === 50 && findsTotal(openLandIds('?preview=tiana')) === 50, 'finds total is 45 with the harbor and bayou open');
ok(findsTotal(openLandIds('?preview=harbor')) === 50 && findsTotal(openLandIds('?preview=all')) === 50, 'normal play keeps its existing total; preview=all adds five glen roses');
ok(findsTotal(false) === 20 && findsTotal(['cove']) === 25 && findsTotal(['cove', 'isle']) === 30 && findsTotal(['cove', 'isle', 'garden']) === 35, 'earlier totals unchanged (20, 25, 30, 35)');
{
  const save = {};
  for (let i = 0; i < 5; i++) ok(collectTreasure(save, `harbor-${i}`, 'anchor', day), `collect harbor-${i}`);
  collectTreasure(save, 'library-0', 'shell', day);
  ok(findsToday(save, day, ['cove', 'isle', 'garden', 'harbor']) === 6, 'harbor open: all six finds count');
  ok(findsToday(save, day, ['cove', 'isle', 'garden']) === 1, 'harbor closed: harbor finds do not count toward today');
  ok(save.treasures.total.anchor === 5, 'anchor total is kept');
  ok(awardRowStar(save, 'harbor', day) === true && awardRowStar(save, 'harbor', day) === false, 'harbor row star once per day');
  ok(!collectTreasure({}, 'harbor-0', 'anchor', 'today') && !collectTreasure({}, 'harbor-0', 'anchors', day), 'bad day / kind still rejected');
  const full = {};
  for (const l of treasureLandsFor(['cove', 'isle', 'garden', 'harbor'])) for (let i = 0; i < 5; i++) collectTreasure(full, `${l}-${i}`, l === 'harbor' ? 'anchor' : 'shell', day);
  ok(findsToday(full, day, ['cove', 'isle', 'garden', 'harbor']) === 40, 'all 40 finds can be counted in one day (the healed save keeps up to 40 ids)');
}
{ // Treasure Book: tile, row and sticker only when open
  const closed = treasureBookModel({}, day, { coveOpen: true, isleOpen: true, gardenOpen: true });
  ok(closed.kinds.length === 8 && closed.lands.length === 7 && closed.stickers.length === 7, 'book, harbor closed: 8 tiles, 7 land rows, 7 stickers (unchanged)');
  const open = treasureBookModel({}, day, { coveOpen: true, isleOpen: true, gardenOpen: true, harborOpen: true });
  ok(open.kinds.length === 9 && open.kinds[8].kind === 'anchor' && open.lands.length === 8 && open.lands[7].id === 'harbor', 'book, harbor open: 9 tiles, 8 land rows');
  ok(open.stickers.length === 8 && open.stickers[7].id === 'sentenceflags' && !open.stickers[7].found, 'book, harbor open: 8th sticker (unfound)');
  const kept = treasureBookModel({ treasures: { day, got: [], total: { anchor: 2 } }, secrets: ['sentenceflags'] }, day);
  ok(kept.kinds.some((k) => k.kind === 'anchor') && kept.stickers.some((s) => s.id === 'sentenceflags' && s.found), 'earlier harbor finds stay visible even when the harbor is closed');
  ok(treasureBookModel(null, day, { harborOpen: true }).total === 0, 'null save does not throw');
}

// --- Secret: capital letter, then words, then an end mark -----------------------------------------------------------------
ok(SECRETS.length === 4 && COVE_SECRETS.length === 1 && ISLE_SECRETS.length === 1 && GARDEN_SECRETS.length === 1 && HARBOR_SECRETS.length === 1
  && same(ALL_SECRETS, [...SECRETS, ...COVE_SECRETS, ...ISLE_SECRETS, ...GARDEN_SECRETS, ...HARBOR_SECRETS, ...BAYOU_SECRETS, ...GLEN_SECRETS]), 'earlier secrets unchanged, one harbor secret after them (then the bayou one)');
ok(HARBOR_SECRETS[0].id === 'sentenceflags' && HARBOR_SECRETS[0].npc === 'anna' && HARBOR_SECRETS[0].emoji && HARBOR_SECRETS[0].label && HARBOR_SECRETS[0].land === 'harbor', 'harbor secret has a sticker, an owner and a label');
ok(same(sanitizeSecrets(['sentenceflags', 'x', 'clock']), ['clock', 'sentenceflags']), 'sticker id is a known id');
{ const s = {}; ok(foundSecret(s, 'sentenceflags') && !foundSecret(s, 'sentenceflags'), 'sticker is earned once'); }
{
  ok(same(SENTENCE_FLAG_KEYS.map((f) => f.key), ['flag1', 'flag2', 'flag3']) && same(SENTENCE_FLAGS.map((f) => f.what), ['a capital letter', 'words', 'an end mark']), 'the flags tell it in order: capital letter, words, end mark');
  ok(same(SENTENCE_FLAGS.map((f) => f.key), ['flag-1', 'flag-2', 'flag-3']) && same(END_MARKS, ['.', '?', '!']), 'tap parts flag-1..3; the end marks are . ? !');
  let tr = createSecretTracker();
  ok(tr.tap('flag-1', 0) === null && tr.tap('flag-2', 500) === null && tr.tap('flag-3', 1000) === 'sentenceflags', 'capital, words, end mark in order fires');
  tr = createSecretTracker(); tr.tap('flag-3', 0); tr.tap('flag-2', 100);
  ok(tr.tap('flag-1', 200) === null, 'wrong order (end mark first) does not fire');
  tr = createSecretTracker(); tr.tap('flag-1', 0); tr.tap('flag-3', 100);
  ok(tr.tap('flag-2', 200) === null, 'skipping the words does not fire');
  tr = createSecretTracker(); tr.tap('flag-1', 0); tr.tap('flag-2', 1000);
  ok(tr.tap('flag-3', 3500) === null, 'too slow (over 3 seconds) does not fire');
  tr = createSecretTracker(); tr.tap('flag-1', 0); tr.tap('flag-2', 100); tr.tap('flag-1', 200); tr.tap('flag-2', 300);
  ok(tr.tap('flag-3', 400) === 'sentenceflags', 'a wrong tap restarts; flag 1 starts a fresh try');
  tr = createSecretTracker(); tr.tap('flag-1', 0); tr.tap('flag-2', 10); tr.tap('flag-3', 20);
  tr.tap('flag-1', 1000); tr.tap('flag-2', 1010);
  ok(tr.tap('flag-3', 1020) === null, 'cooldown after firing (no speech spam)');
  tr = createSecretTracker(); tr.tap('story-1', 0); tr.tap('story-2', 10);
  ok(tr.tap('flag-3', 20) === null, 'a harbor flag does not finish the garden lanterns');
  ok(tr.tap('story-3', 30) === 'storylanterns', 'the garden secret still works beside the harbor one');
  tr = createSecretTracker(); tr.tap('shape-1', 0); tr.tap('shape-2', 10);
  ok(tr.tap('shape-3', 20) === 'shapestones', 'the isle secret still works');
  tr = createSecretTracker(); tr.tap('shell-1', 0); tr.tap('shell-2', 10);
  ok(tr.tap('shell-3', 20) === 'shellrhyme', 'the cove secret still works');
}
{ // The line Anna says must be true to her skill: capital letters and end marks
  const l = sentenceLine();
  ok(l.say === 'A sentence starts with a capital letter and ends with a mark!', `Anna says the capital-letter and end-mark line (got "${l.say}")`);
  ok(/^[A-Z]/.test(l.say) && /[.?!]$/.test(l.say), 'the line itself starts with a capital letter and ends with an end mark');
  ok(/capital letter/.test(l.say) && /mark/.test(l.say) && l.say.indexOf('starts') < l.say.indexOf('ends'), 'start before end');
  ok(/^[A-Za-z !]+$/.test(l.say) && same(l.marks, ['.', '?', '!']), 'plain spoken text');
}

// --- Run harbor.js for real against the vendored three.js (a tiny stand-in for world.js) ---------------------------------------
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
  const harbor = buildHarbor({ THREE, scene, center, pad, G, M, addCollider: (x, z, r) => colliders.push({ x, z, r }), addTappable, starGeometry: () => new THREE.BufferGeometry(), softDot: null, calmMotion });
  return { scene, colliders, tapItems, harbor };
}
const names = ['lighthouse', 'boat', 'bunting', 'gull', 'flowerbox', 'bell'];
{
  const h = harness(false);
  // Draw calls: every drawable object the harbor adds (hit boxes use an invisible material, glow sprites are hidden at rest).
  const drawables = []; h.scene.traverse((o) => { if ((o.isMesh && o.material.visible !== false) || o.isPoints) drawables.push(o); });
  console.log(`harbor draw calls (real build): ${drawables.length} drawables`);
  ok(drawables.length <= 8, `buildHarbor makes at most 8 draw calls (built ${drawables.length})`);
  ok(drawables.length >= 5, 'draw call count looks sane');
  ok(h.tapItems.length === 9, 'nine tappables: six surprises + three sentence flags');
  const secrets = h.tapItems.filter((i) => i.secret).map((i) => i.secret);
  ok(same(secrets, ['flag-1', 'flag-2', 'flag-3']), 'the three flags report flag-1..3 in order');
  const sp = h.tapItems.filter((i) => i.secret).map((i) => i.group.position.x - center.x);
  ok(sp[0] < sp[1] && sp[1] < sp[2], 'flags read left to right: capital letter, words, end mark');
  names.forEach((k, i) => {
    const t = h.tapItems[i];
    ok(Math.abs(t.group.position.x - (center.x + HARBOR_SPOTS[k][0])) < 1e-9 && Math.abs(t.group.position.z - (center.z + HARBOR_SPOTS[k][1])) < 1e-9, `${k} tap prop is exactly on its spot`);
  });
  SENTENCE_FLAG_KEYS.forEach((f, i) => {
    const t = h.tapItems[6 + i];
    ok(Math.abs(t.group.position.x - (center.x + HARBOR_SPOTS[f.key][0])) < 1e-9 && Math.abs(t.group.position.z - (center.z + HARBOR_SPOTS[f.key][1])) < 1e-9, `${f.key} tap prop is exactly on its spot`);
  });
  // Nothing sits on Anna's pad; every prop is inside the harbor
  for (const it of h.tapItems) {
    const lx = it.group.position.x - center.x, lz = it.group.position.z - center.z;
    ok(Math.hypot(lx, lz) < HARBOR_R && Math.hypot(it.group.position.x - pad.x, it.group.position.z - pad.z) > 3.2, 'tap props stay inside the harbor and off the pad');
  }
  const ux = (pad.x - center.x) / Math.hypot(pad.x - center.x, pad.z - center.z), uz = (pad.z - center.z) / Math.hypot(pad.x - center.x, pad.z - center.z);
  const lane = { a: branch.from, b: { x: center.x + ux * 3.0, z: center.z + uz * 3.0 } };
  for (const c of h.colliders) {
    ok(Math.hypot(c.x - center.x, c.z - center.z) < LAND_DISC_R + 0.3, `harbor colliders stay inside the harbor disc (${Math.hypot(c.x - center.x, c.z - center.z).toFixed(2)} at ${(c.x - center.x).toFixed(2)},${(c.z - center.z).toFixed(2)})`);
    ok(Math.hypot(c.x - frost.x, c.z - frost.z) > LAND_DISC_R + 3, 'harbor colliders never reach Frostfall Peaks');
    ok(Math.hypot(c.x - CASTLE_POS.x, c.z - CASTLE_POS.z) > 5.2 + 8, 'harbor colliders never reach the castle');
    ok(Math.hypot(c.x - pad.x, c.z - pad.z) > c.r + 1.5, 'no collider on Anna\'s pad');
    ok(distToSegment(c.x, c.z, lane.a, lane.b) - c.r > 1.0, 'the path from the branch to the middle is clear of colliders (Zoe can walk in)');
    ok(Math.hypot(c.x, c.z) + c.r < WORLD_RADIUS + 0.5, 'harbor colliders sit inside the world wall');
    for (const t of h.tapItems) ok(Math.hypot(c.x - t.group.position.x, c.z - t.group.position.z) > 0.2 || c.r <= 0.35 || (c.r > 1.2 && t === h.tapItems[0]), 'only a slim post (or the lighthouse itself) may stand under a tap prop');
  }
  ok(h.colliders.length >= 20, `solid props have colliders (${h.colliders.length})`);
  // Cottages, the boathouse, the lighthouse and the market stall are solid
  for (const k of ['cottageA', 'cottageB', 'cottageC', 'boathouse']) {
    ok(h.colliders.some((c) => Math.hypot(c.x - (center.x + HARBOR_STATICS[k][0]), c.z - (center.z + HARBOR_STATICS[k][1])) < 0.01), `${k} is solid`);
  }
  ok(h.colliders.some((c) => Math.hypot(c.x - (center.x + HARBOR_SPOTS.lighthouse[0]), c.z - (center.z + HARBOR_SPOTS.lighthouse[1])) < 0.01 && c.r >= 1.2), 'the lighthouse is solid');
  ok(h.colliders.filter((c) => Math.hypot(c.x - (center.x + HARBOR_STATICS.market[0]), c.z - (center.z + HARBOR_STATICS.market[1])) < 1.5).length >= 2, 'the market stall is solid');
  // Every reaction runs cleanly from 0 to 1 and leaves the prop where it started
  const restY = new Map(); for (const k of ['boat', 'bunting', 'gull', 'flowerbox', 'bell']) { const it = h.tapItems[names.indexOf(k)]; const mesh = k === 'boat' ? it.group.children[0].children[0] : it.group.children[0]; restY.set(k, mesh.position.y); }
  for (const k of ['boat', 'bunting', 'gull', 'flowerbox', 'bell']) {
    const it = h.tapItems[names.indexOf(k)];
    ok(typeof it.react === 'function', `${k} has its own reaction`);
    const x0 = it.group.position.x, y0 = it.group.position.y, z0 = it.group.position.z;
    for (let i = 0; i <= 40; i++) it.react(it, i / 40);
    const mesh = k === 'boat' ? it.group.children[0].children[0] : it.group.children[0];
    ok(Math.abs(it.group.position.x - x0) < 1e-6 && Math.abs(it.group.position.z - z0) < 1e-6 && Math.abs(it.group.position.y - y0) < 1e-6, `${k} ends back where it started`);
    ok(Math.abs(mesh.scale.x - 1) < 1e-9 && Math.abs(mesh.scale.y - 1) < 1e-9 && Math.abs(mesh.scale.z - 1) < 1e-9, `${k} ends at its resting size`);
    ok(Math.abs(mesh.rotation.z) < 1e-9 && Math.abs(mesh.rotation.x) < 1e-9 && Math.abs(mesh.rotation.y) < 1e-9, `${k} ends level`);
    ok(Math.abs(mesh.position.x) < 1e-9 && Math.abs(mesh.position.y - restY.get(k)) < 1e-9, `${k} ends in place`);
    let moved = false;
    for (let i = 1; i < 40; i++) { it.react(it, i / 40); if (Math.abs(mesh.rotation.z) + Math.abs(mesh.rotation.x) + Math.abs(mesh.rotation.y) + Math.abs(mesh.position.y - restY.get(k)) + Math.abs(mesh.scale.y - 1) > 1e-3) moved = true; }
    it.react(it, 1);
    ok(moved, `${k} actually moves during its reaction`);
  }
  // The shared Points: soft lamp halo at rest, effects start on tap and park themselves again
  const pts = drawables.find((o) => o.isPoints);
  ok(pts && pts.visible, 'lamp halo is drawn at rest (one Points draw call)');
  const posA = pts.geometry.attributes.position, colA = pts.geometry.attributes.color;
  const nHalo = 1 + SENTENCE_FLAG_KEYS.length;
  const lit = (i) => colA.getX(i) + colA.getY(i) + colA.getZ(i) > 0.3 && posA.getY(i) > -40;
  const effectsOn = () => { let n = 0; for (let i = nHalo; i < posA.count; i++) if (posA.getY(i) > -40) n++; return n; };
  ok(lit(0), 'the lighthouse lamp glows at rest');
  ok(effectsOn() === 0, 'no effect dots show at rest');
  for (const k of names) {
    const it = h.tapItems[names.indexOf(k)];
    ok(typeof it.onTap === 'function', `${k} starts its effect on tap`);
    it.onTap(it);
    let peak = 0, peakLamp = 0;
    for (let i = 0; i < 500; i++) {
      h.harbor.update(i * 0.016, 0.016); peak = Math.max(peak, effectsOn()); peakLamp = Math.max(peakLamp, colA.getX(0));
    }
    ok(peak > 0, `${k} effect shows dots`);
    ok(effectsOn() === 0, `${k} effect parks its dots again`);
    if (k === 'lighthouse') ok(peak >= 8, 'the lighthouse beam sweeps a whole ray of dots');
  }
  for (let s = 0; s < 3; s++) {
    const it = h.tapItems[6 + s]; it.onTap(it);
    h.harbor.update(0.5, 0.016);
    ok(colA.getX(1 + s) > 0.5, `flag ${s + 1} lights up when tapped`);
    for (let i = 0; i < 200; i++) h.harbor.update(i * 0.016, 0.016);
    ok(colA.getX(1 + s) < 0.3, `flag ${s + 1} settles again`);
  }
  // the lamp blinks slowly (never a hard flash): its brightness stays inside a gentle band between frames
  {
    let lo = 9, hi = 0, jump = 0, prev = null;
    for (let i = 0; i < 600; i++) { h.harbor.update(i * 0.016, 0.016); const v = colA.getX(0); lo = Math.min(lo, v); hi = Math.max(hi, v); if (prev !== null) jump = Math.max(jump, Math.abs(v - prev)); prev = v; }
    ok(hi > lo && jump < 0.05, `the lamp breathes gently (range ${lo.toFixed(2)}-${hi.toFixed(2)}, biggest step ${jump.toFixed(3)})`);
  }
  // Treasure placement, the way world.js does it (spots on dry land, then nudged clear of props): every day's five anchors end up free, dry and inside the harbor
  {
    const wetW = (x, z) => !h.harbor.dry(x, z);
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
      for (const sp of treasureSpots(dayKey, 'harbor', 5, undefined, (lx, lz) => wetW(center.x + lx, center.z + lz))) {
        const wx0 = center.x + sp.x, wz0 = center.z + sp.z;
        const [px, pz] = h.harbor.settle(wx0, wz0, free);
        total++;
        if (!(free(px, pz) && !wetW(px, pz)) || Math.hypot(px - center.x, pz - center.z) > HARBOR_R) failed++;
        if (Math.hypot(px - wx0, pz - wz0) < 3.0) closeToSpot++;
        worst = Math.max(worst, Math.hypot(px - wx0, pz - wz0));
        placed.push([px, pz]);
      }
    }
    ok(failed === 0, `every anchor finds a free dry spot inside the harbor on 400 different days (${failed} failed)`);
    ok(worst < 8 && closeToSpot / total > 0.8, `anchors stay near their seeded spots (worst move ${worst.toFixed(1)} m; ${(100 * closeToSpot / total).toFixed(0)}% within 3 m)`);
    ok(same(treasureSpots(day, 'harbor', 5), treasureSpots(day, 'harbor', 5, undefined, null)) && same(treasureSpots(day, 'cove', 5), treasureSpots(day, 'cove', 5, undefined, null)), 'the optional avoid test changes nothing for the other lands');
  }
  ok(h.harbor.wet(center.x + WATER.x, center.z + WATER.z) && !h.harbor.wet(center.x - 5, center.z + 4) && h.harbor.dry(center.x - 5, center.z + 4) && !h.harbor.dry(center.x + WATER.x, center.z + WATER.z), 'wet() / dry() use world coordinates');
  ok(!h.harbor.dry(center.x + DOCK.x, center.z - 5), 'finds are never put on the dock');
  // Every drawn vertex stays inside the harbor's neighbourhood: nothing spills over Frostfall
  const box = new THREE.Box3();
  for (const o of drawables) { if (o.isMesh) { o.geometry.computeBoundingBox(); const b = o.geometry.boundingBox.clone().translate(o.position); box.union(b); } }
  ok(center.x + box.min.x > frost.x + LAND_DISC_R + 1.5, `no harbor art reaches into the Frostfall disc (west edge ${(center.x + box.min.x).toFixed(1)} vs ${(frost.x + LAND_DISC_R).toFixed(1)})`);
  ok(box.max.y < 9, 'the tallest harbor prop (the lighthouse) stays under 9 m');
}
{
  const h = harness(true);
  const pts = []; h.scene.traverse((o) => { if (o.isPoints) pts.push(o); });
  const before = Array.from(pts[0].geometry.attributes.position.array).concat(Array.from(pts[0].geometry.attributes.color.array));
  const boat = h.tapItems[1].group.children[0];
  const y0 = boat.position.y, r0 = boat.rotation.z;
  for (let i = 0; i < 20; i++) h.harbor.update(i, 0.016);
  const after = Array.from(pts[0].geometry.attributes.position.array).concat(Array.from(pts[0].geometry.attributes.color.array));
  ok(boat.position.y === y0 && boat.rotation.z === r0 && same(before, after), 'calm motion: update moves and flickers nothing (no bobbing, no blinking)');
  ok(pts[0].visible && before.slice(0, 3).some((v) => v !== 0), 'calm motion: the lamp halo still sits there, softly lit');
}

// --- Source checks ----------------------------------------------------------------------------------------------------
const harbor = src('js/harbor.js'), world = src('js/world.js'), main = src('js/main.js'), ui = src('js/ui.js'), sw = src('sw.js');
const worldmap = src('js/worldmap.js'), treasures = src('js/treasures.js'), wf = readFileSync(new URL('../../.github/workflows/starlight-tests.yml', import.meta.url), 'utf8');
{ // Draw-call budget by source inspection (same method as garden_check): Mesh/Points/Sprite constructors + own(...) calls.
  const body = harbor.slice(harbor.indexOf('export function buildHarbor'));
  const ownDef = body.match(/const own = \(m, mat\) => new THREE\.Mesh\([^\n]*\);/);
  ok(!!ownDef, 'own() helper found');
  const rest = ownDef ? body.replace(ownDef[0], '') : body;
  const direct = (rest.match(/new THREE\.(Mesh|InstancedMesh|SkinnedMesh|Points|Sprite|Line|LineSegments)\(/g) || []).length;
  const owned = (rest.match(/\bown\([a-z]+(?:, *\w+)?\)/g) || []).length;
  console.log(`harbor draw calls (source count): ${direct + owned} (${direct} direct + ${owned} via own())`);
  ok(direct + owned <= 8, `buildHarbor makes at most 8 draw calls (counted ${direct + owned})`);
  ok(direct + owned >= 5, 'source draw call count looks sane');
  ok(!/new THREE\.\w*Light\(/.test(harbor) && !/castShadow|receiveShadow|shadowMap/.test(harbor), 'no extra lights, no shadow maps');
  ok(/makeMerger/.test(harbor), 'repeats are merged');
  ok(!/\.load\(|new Audio|Image\(|fetch\(|\.png|\.mp3|\.wav|\.jpg|\.svg|CanvasTexture|createElement/.test(harbor), 'no new audio or image files (the flag signs are plain shapes)');
  ok(/MeshBasicMaterial/.test(harbor), 'the lamp, windows and flag signs glow with an unlit material');
}
ok(/calmMotion/.test(harbor) && /if \(calmMotion\) return;/.test(harbor), 'harbor update does nothing under calm motion');
ok(/if \(it\.onTap && !calmMotion\) it\.onTap\(it\)/.test(world), 'effects start only when motion is allowed');
{
  const rs = world.indexOf('function tapReact('), re = world.indexOf('function startTapReaction(', rs), r = world.slice(rs, re);
  const calmAt = r.indexOf('if (calmMotion) {'), elseAt = r.indexOf('} else {', calmAt);
  ok(calmAt > 0 && elseAt > calmAt && !/react\(/.test(r.slice(calmAt, elseAt)), 'calm branch never runs the harbor\'s custom motion (glow only)');
}
// Only when open
ok(/const harborOpen = isHarborOpen\(\)/.test(world) && /if \(harborOpen\) \{\s*harbor = buildHarbor\(/.test(world), 'world builds the harbor only when open');
ok(/const openLands = openLandIds\(\)/.test(world) && /treasureLandsFor\(openLands\)/.test(world), 'world hides harbor treasures only when open');
ok(/closedSlots\(\)\.map/.test(world), 'world draws gates from closedSlots (an open slot is skipped)');
ok(/landPads\[HARBOR\.land\]/.test(world) && /landCenters\[HARBOR\.land\]/.test(world), 'the harbor centre and Anna\'s pad are stored like the garden\'s');
ok(/harbor\.dry\(/.test(world) && /harbor\.settle\(/.test(world), 'treasures stay out of the water and off the dock (the harbor settles every find on clear dry ground)');
ok(/anchor\(g\)/.test(world) && /anchor: 0x/.test(world), 'world draws the anchor treasure and gives it a glow colour');
ok(NPC_ORDER.includes('anna') && NPC_ORDER.indexOf('anna') === NPC_ORDER.indexOf('jasmine') + 1, 'Anna follows Jasmine in NPC_ORDER (K11), so world.js spawns her on the harbor pad');
ok(/anna:\s*\{[^}]*land: 'harbor'/.test(world), 'NPC_DEFS.anna.land is the harbor (K11 spawns her on the stored pad)');
ok(/ese:\s*'anna'/.test(worldmap.replace(/\/\/.*$/gm, '').replace(/PLANNED_SLOTS[\s\S]*?\};/, '')), 'BUILT_SLOTS holds ese: anna');
ok(/BUILT_SLOTS\s*=\s*\{\s*sse:\s*'ariel',\s*ssw:\s*'moana',\s*nne:\s*'jasmine',\s*ese:\s*'anna',\s*wsw:\s*'tiana',\s*ene:\s*'aurora'\s*\}/.test(worldmap.replace(/\/\/.*$/gm, '')), 'BUILT_SLOTS holds sse, ssw, nne and ese');
ok(/PREVIEW_LANDS\s*=\s*\{\s*cove:\s*'sse',\s*isle:\s*'ssw',\s*garden:\s*'nne',\s*harbor:\s*'ese',\s*bayou:\s*'wsw',\s*glen:\s*'ene'\s*\}/.test(worldmap), 'preview flags map to slots (cove, isle, garden, harbor, bayou)');
ok(/import \{ buildHarbor \} from '\.\/harbor\.js\?v=20261028r3'/.test(world), 'world imports harbor.js with the existing ?v= stamp');
ok(/import \{ makeMerger \} from '\.\/cove\.js\?v=20261028r3'/.test(harbor), 'harbor.js shares the cove\'s merger with the existing stamp');
ok(/'\.\/js\/harbor\.js\?v=20261028r3'/.test(sw), 'harbor.js is precached with the existing stamp');
ok(!/CACHE_VERSION\s*=\s*['"][^'"]*harbor/i.test(sw) && !/\?v=2026\d+(?!r3)\w*/.test(harbor.replace(/\?v=20261028r3/g, '')), 'cache version and stamps untouched');
ok(/findsTotal\(OPEN_LANDS\)/.test(main) && /findsToday\(Save\.data, todayKey\(\), OPEN_LANDS\)/.test(main), 'main counts only open lands (45 now)');
ok(/id === 'sentenceflags'\) line = sentenceLine\(\)\.say/.test(main) && /Narrator\.speakExact\(def\.npc, line\)/.test(main), 'the sentence line is spoken with Anna\'s voice via speakExact');
ok(/an anchor/.test(main), 'the find toast says "an anchor"');
ok(/harborOpen: isHarborOpen\(\)/.test(ui), 'Treasure Book asks for the harbor only when open');
ok(/zsq-tb-nine/.test(ui) && /zsq-tb-eight/.test(ui) && /zsq-tb-tight/.test(ui), 'Treasure Book has the compact 9-tile / 8-row / 8-sticker layout');
ok(/Sunny Fjord Harbor check/.test(wf) && /harbor_check\.mjs/.test(wf), 'CI runs this test');
// Six surprises
for (const k of names) ok(new RegExp(`items\\.${k} = addTappable\\(`).test(harbor), `surprise: ${k}`);
ok(/'flag-' \+ \(i \+ 1\)/.test(harbor), 'the three sentence flags report flag-1..3');
// No film characters, songs or iconic props (original art only)
{
  const banned = /arendelle|\bolaf\b|kristoff|\bsven\b|\bhans\b|elsa'?s palace|let it go|snowman|open door|first time in forever|reindeer|carrot|ice palace|build a snow/i;
  for (const [name, text] of [['harbor.js', harbor], ['treasures.js', treasures], ['worldmap.js', worldmap], ['main.js', main], ['ui.js', ui]]) {
    const m = text.match(banned);
    ok(!m, `${name} has no Frozen film terms (found ${m && m[0]})`);
  }
  ok(!/\bfrozen\b|\bsnow\b|\bice\b/i.test(harbor.replace(/\/\/.*$/gm, '')), 'the harbor art has no snow or ice (it is the warm, summery contrast to Frostfall)');
  ok(!/rosemaling|castle|palace|\bturret\b|\bspire\b|\bparrot\b|\bcrown\b/i.test(harbor.replace(/\/\/.*$/gm, '')), 'no film castle silhouette or copied pattern words in the harbor');
}

if (bad.length) { console.log('FAIL'); for (const b of bad) console.log(' -', b); process.exit(1); }
console.log('harbor_check ok');
