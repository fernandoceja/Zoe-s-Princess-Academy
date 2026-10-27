// Moonlit Palace Garden (K8): the land is built only when its slot ('nne') is "open" (built for real in K9, or ?preview=garden / all),
// has its own treasure kind (moonstones) and one secret (three story lanterns: seed, sprout, flower), respects calm motion, stays
// inside the draw-call budget, stays clear of the Library and the castle, and uses no film characters or iconic props.
// Pure helpers are imported; garden.js itself runs here against the vendored three.js with a tiny stand-in for world.js (no browser
// needed), and the wiring in world/main/ui is checked by source inspection.
import { readFileSync } from 'node:fs';
import * as THREE from '../vendor/three.module.js';
import {
  BUILT_SLOTS, PLANNED_SLOTS, PREVIEW_LANDS, builtSlotIds, closedSlots, openSlotIds, isSlotOpen, isCoveOpen, isIsleOpen, isGardenOpen, openLandIds,
  previewFlags, gardenGeometry, coveGeometry, isleGeometry, GARDEN, slotPos, NEW_LAND_SLOTS, LAND_DISC_R, LAND_DIST, INNER_LAND_ANGLES, CASTLE_POS,
  pathSegments, distToSegment, PATH_WIDTH, WORLD_RADIUS,
} from '../js/worldmap.js';
import {
  todayKey, treasureSpots, collectTreasure, treasureBookModel, treasureLandsFor, findsTotal, findsToday, awardRowStar,
  TREASURE_KINDS, ALL_TREASURE_KINDS, GARDEN_KIND, GARDEN_LAND, TREASURES_PER_LAND, TREASURE_INFO, TREASURE_LAND_NAMES,
  SECRETS, COVE_SECRETS, ISLE_SECRETS, GARDEN_SECRETS, ALL_SECRETS, sanitizeSecrets, foundSecret, createSecretTracker, storyLine, STORY_STEPS,
} from '../js/treasures.js';
import { buildGarden, gardenWet, GARDEN_SPOTS, GARDEN_STATICS, GARDEN_R, POOL, FOUNTAIN_R, POOL_TILES, STORY_LANTERNS, LANTERN_POSTS } from '../js/garden.js';
import { NPC_ORDER, PRINCESSES } from '../js/quests.js';

const bad = [];
const ok = (cond, msg) => { if (!cond) bad.push(msg); };
const src = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const day = '2026-10-27';

// --- "Open" -----------------------------------------------------------------------------------------------------
ok(PLANNED_SLOTS.jasmine === 'nne' && GARDEN.slot === 'nne' && GARDEN.land === 'garden' && GARDEN.princess === 'jasmine', 'garden sits at the planned nne slot');
ok(!('nne' in BUILT_SLOTS) && !builtSlotIds().includes('nne'), 'nne is NOT built yet (K9 adds Jasmine\'s quests and BUILT_SLOTS)');
ok(!isGardenOpen() && !isGardenOpen('') && !isGardenOpen('?x=1') && !isGardenOpen('?preview=cove') && !isGardenOpen('?preview=isle') && !isGardenOpen('?preview=jasmine'), 'garden is closed by default');
ok(isGardenOpen('?preview=garden') && isGardenOpen('?preview=all') && isGardenOpen('?a=1&preview=Garden') && isGardenOpen('?preview=cove,garden'), 'preview=garden / all / lists open it');
ok(PREVIEW_LANDS.garden === 'nne' && PREVIEW_LANDS.cove === 'sse' && PREVIEW_LANDS.isle === 'ssw', 'garden is in PREVIEW_LANDS (cove and isle flags stay)');
ok(isCoveOpen('?preview=garden') && isIsleOpen('?preview=garden') && isCoveOpen() && isIsleOpen(), 'cove and isle stay open (and ?preview=cove / isle stay harmless)');
ok(same(openLandIds(''), ['cove', 'isle']) && same(openLandIds('?preview=cove'), ['cove', 'isle']) && same(openLandIds('?preview=isle'), ['cove', 'isle']), 'without the flag nothing changes: cove and isle only');
ok(same(openLandIds('?preview=garden'), ['cove', 'isle', 'garden']) && same(openLandIds('?preview=all'), ['cove', 'isle', 'garden']), 'with the flag the garden is a third open land');
ok(same([...openSlotIds('')].sort(), ['sse', 'ssw']) && same([...openSlotIds('?preview=garden')].sort(), ['nne', 'sse', 'ssw']), 'open slots: nne only with the flag');
ok(closedSlots('').length === 4 && closedSlots('').some((s) => s.slot === 'nne'), 'default: the nne star gate is still there (4 gates)');
ok(closedSlots('?preview=garden').length === 3 && !closedSlots('?preview=garden').some((s) => s.slot === 'nne'), 'open garden has no gate; the other three stay');
ok(closedSlots('?preview=all').length === 3, 'preview=all opens the garden too: three gates stay');
ok(!isSlotOpen('ese', '?preview=all') && !isSlotOpen('wsw', '?preview=all') && !isSlotOpen('ene', '?preview=all'), 'other lands are not built yet');
ok(previewFlags('?preview=%%%').size >= 0 && previewFlags(null).size === 0, 'bad query strings never throw');

// --- Geometry: path reaches the land, Jasmine's pad is stored, clear of the Library, castle, plaza paths and other lands -------
const { center, pad } = gardenGeometry();
const segs = pathSegments();
const branch = segs.find((s) => s.kind === 'branch' && s.slot === 'nne');
const trunkNNE = segs.find((s) => s.kind === 'trunk' && Math.abs(Math.atan2(s.to.z, s.to.x) - (-45 * Math.PI / 180)) < 1e-6);
const lib = { x: Math.cos(INNER_LAND_ANGLES.library) * LAND_DIST, z: Math.sin(INNER_LAND_ANGLES.library) * LAND_DIST };
{
  const c = slotPos(NEW_LAND_SLOTS.find((s) => s.slot === 'nne'));
  ok(Math.hypot(center.x - c.x, center.z - c.z) < 1e-9, 'garden centre is the slot position (the branch ends there)');
  ok(distToSegment(center.x, center.z, branch.from, branch.to) < 1e-6, 'the branch path runs into the garden');
  ok(distToSegment(pad.x, pad.z, branch.from, branch.to) < PATH_WIDTH / 2, 'the pad is on the path side of the garden');
  const dPad = Math.hypot(pad.x - center.x, pad.z - center.z);
  ok(dPad > 5 && dPad < LAND_DISC_R - 2, `pad is inside the disc near the entrance (${dPad.toFixed(1)})`);
  ok(Math.hypot(pad.x, pad.z) < Math.hypot(center.x, center.z), 'pad is on the hub side of the centre');
  ok(Math.hypot(pad.x, pad.z) < WORLD_RADIUS, 'pad is inside the world wall');
  // Not overlapping the Library (north inner land), the other inner lands, the castle, the plaza, the cove and the isle
  ok(Math.hypot(center.x - lib.x, center.z - lib.z) > 2 * LAND_DISC_R + 3, `garden disc is clear of the Library disc (${Math.hypot(center.x - lib.x, center.z - lib.z).toFixed(1)})`);
  for (const a of Object.values(INNER_LAND_ANGLES)) {
    ok(Math.hypot(center.x - Math.cos(a) * LAND_DIST, center.z - Math.sin(a) * LAND_DIST) > 2 * LAND_DISC_R + 3, 'garden is clear of the inner lands');
  }
  ok(Math.hypot(center.x - CASTLE_POS.x, center.z - CASTLE_POS.z) > LAND_DISC_R + 8, 'garden is clear of the castle');
  ok(Math.hypot(center.x, center.z) > 8.5 + LAND_DISC_R + 10, 'garden is far outside the hub plaza');
  ok(Math.hypot(center.x - coveGeometry().center.x, center.z - coveGeometry().center.z) > 2 * LAND_DISC_R + 6, 'garden and cove are far apart');
  ok(Math.hypot(center.x - isleGeometry().center.x, center.z - isleGeometry().center.z) > 2 * LAND_DISC_R + 6, 'garden and isle are far apart');
  // The other branch/trunk paths: the garden's disc never touches a path that is not its own (the eastern 'ene' branch is the nearest)
  for (const sg of segs) {
    if (sg === branch || sg === trunkNNE) continue;
    ok(distToSegment(center.x, center.z, sg.from, sg.to) > LAND_DISC_R + PATH_WIDTH / 2, `the garden disc does not touch another ${sg.kind} path`);
  }
  const local = (p) => [p.x - center.x, p.z - center.z];
  const all = { ...GARDEN_SPOTS, ...GARDEN_STATICS };
  for (const [k, [x, z]] of Object.entries(all)) {
    ok(Math.hypot(x, z) < (k.startsWith('arch') ? LAND_DISC_R - 0.5 : GARDEN_R - 0.2), `${k} spot is inside the hedge (${Math.hypot(x, z).toFixed(1)} of ${GARDEN_R}; the arch stands in the gate)`);
    ok(Math.hypot(center.x + x, center.z + z) < WORLD_RADIUS - 0.5, `${k} spot is inside the world wall`);
    ok(Math.hypot(x - local(pad)[0], z - local(pad)[1]) > 3.3, `${k} spot is clear of Jasmine's pad`);
  }
  for (const l of LANTERN_POSTS) ok(Math.hypot(l.x, l.z) < GARDEN_R - 0.5 && Math.hypot(l.x - local(pad)[0], l.z - local(pad)[1]) > 3.3, 'lantern posts are inside the hedge and clear of the pad');
  const tapKeys = Object.keys(GARDEN_SPOTS);
  for (let i = 0; i < tapKeys.length; i++) for (let j = i + 1; j < tapKeys.length; j++) {
    const a = GARDEN_SPOTS[tapKeys[i]], b = GARDEN_SPOTS[tapKeys[j]];
    ok(Math.hypot(a[0] - b[0], a[1] - b[1]) >= 1.8, `${tapKeys[i]} and ${tapKeys[j]} are not crowded (the tap system keeps props 1.8 apart)`);
  }
  for (const [x, z] of POOL_TILES) ok(!(((x - POOL.x) / POOL.rx) ** 2 + ((z - POOL.z) / POOL.rz) ** 2 > 0.9), 'stepping tiles are on the pool');
  ok(gardenWet(0, -0.2) && gardenWet(2.5, 0) && gardenWet(0, -5.3) && !gardenWet(0, 5) && !gardenWet(-6, 4) && !gardenWet(6, -1), 'gardenWet: pool and fountain wet, lawn dry');
  ok(GARDEN_SPOTS.pool[1] - POOL.rz > GARDEN_SPOTS.fountain[1] + FOUNTAIN_R - 0.01, 'the fountain basin sits just beyond the pool');
}

// --- Treasures: moonstones, 5 per day, date-seeded, only when open --------------------------------------------------------
ok(GARDEN_KIND === 'moonstone' && GARDEN_LAND === 'garden' && ALL_TREASURE_KINDS.includes('moonstone') && !TREASURE_KINDS.includes('moonstone'), 'moonstone is a garden-only kind (the other lands\' random kinds are unchanged)');
ok(TREASURE_INFO.moonstone && TREASURE_INFO.moonstone.emoji === '🌙' && TREASURE_INFO.moonstone.label === 'Moonstones', 'moonstone has Treasure Book info');
{
  const emojis = Object.values(TREASURE_INFO).map((i) => i.emoji);
  ok(new Set(emojis).size === emojis.length && emojis.length === 8, 'every treasure kind has its own emoji');
  const stickers = ALL_SECRETS.map((s) => s.emoji);
  ok(new Set(stickers).size === stickers.length && stickers.length === 7, 'every sticker has its own emoji');
}
ok(TREASURE_LAND_NAMES.garden === 'Moonlit Palace Garden' && PRINCESSES.jasmine.landName === 'Moonlit Palace Garden', 'garden has a book name');
const a = treasureSpots(day, GARDEN_LAND, TREASURES_PER_LAND);
ok(a.length === 5 && a.every((s) => s.kind === 'moonstone' && /^garden-\d$/.test(s.id)), '5 moonstone treasures with ids garden-0..4');
ok(same(a, treasureSpots(day, GARDEN_LAND, 5)), 'garden treasures: same day, same spots');
ok(!same(a, treasureSpots('2026-10-28', GARDEN_LAND, 5)), 'garden treasures: new day, new spots');
ok(a.every((s) => Number.isFinite(s.x) && Number.isFinite(s.z) && Math.hypot(s.x, s.z) < 9), 'garden spots are finite and inside the land');
ok(['library', 'frostfall', 'meadow', 'village', 'cove', 'isle'].every((l) => treasureSpots(day, l, 5).every((s) => s.kind !== 'moonstone')), 'other lands never hide moonstones');
ok(same(treasureSpots(day, 'cove', 5).map((s) => s.kind), Array(5).fill('seaglass')) && same(treasureSpots(day, 'isle', 5).map((s) => s.kind), Array(5).fill('blossom')), 'cove and isle treasures are unchanged');
ok(same(treasureLandsFor(['cove', 'isle']), ['library', 'frostfall', 'meadow', 'village', 'cove', 'isle'])
  && same(treasureLandsFor(['cove', 'isle', 'garden']), ['library', 'frostfall', 'meadow', 'village', 'cove', 'isle', 'garden']), 'treasure lands: only open lands');
ok(findsTotal(openLandIds('')) === 30, 'finds total is 30 now (garden closed)');
ok(findsTotal(openLandIds('?preview=garden')) === 35 && findsTotal(openLandIds('?preview=all')) === 35, 'finds total is 35 when the garden is open');
ok(findsTotal(false) === 20 && findsTotal(['cove']) === 25 && findsTotal(['cove', 'isle']) === 30, 'earlier totals unchanged (20, 25, 30)');
{
  const save = {};
  for (let i = 0; i < 5; i++) ok(collectTreasure(save, `garden-${i}`, 'moonstone', day), `collect garden-${i}`);
  collectTreasure(save, 'library-0', 'shell', day);
  ok(findsToday(save, day, ['cove', 'isle', 'garden']) === 6, 'garden open: all six finds count');
  ok(findsToday(save, day, ['cove', 'isle']) === 1, 'garden closed: garden finds do not count toward today');
  ok(save.treasures.total.moonstone === 5, 'moonstone total is kept');
  ok(awardRowStar(save, 'garden', day) === true && awardRowStar(save, 'garden', day) === false, 'garden row star once per day');
  ok(!collectTreasure({}, 'garden-0', 'moonstone', 'today') && !collectTreasure({}, 'garden-0', 'moonstones', day), 'bad day / kind still rejected');
}
{ // Treasure Book: tile, row and sticker only when open
  const base = treasureBookModel({}, day, { coveOpen: true, isleOpen: true });
  ok(base.kinds.length === 7 && base.lands.length === 6 && base.stickers.length === 6, 'book, garden closed: 7 tiles, 6 land rows, 6 stickers (unchanged)');
  const open = treasureBookModel({}, day, { coveOpen: true, isleOpen: true, gardenOpen: true });
  ok(open.kinds.length === 8 && open.kinds[7].kind === 'moonstone' && open.lands.length === 7 && open.lands[6].id === 'garden', 'book, garden open: 8 tiles, 7 land rows');
  ok(open.stickers.length === 7 && open.stickers[6].id === 'storylanterns' && !open.stickers[6].found, 'book, garden open: 7th sticker (unfound)');
  const kept = treasureBookModel({ treasures: { day, got: [], total: { moonstone: 2 } }, secrets: ['storylanterns'] }, day);
  ok(kept.kinds.some((k) => k.kind === 'moonstone') && kept.stickers.some((s) => s.id === 'storylanterns' && s.found), 'earlier garden finds stay visible even when the garden is closed');
  ok(treasureBookModel(null, day, { gardenOpen: true }).total === 0, 'null save does not throw');
}

// --- Secret: story lanterns in order (first, next, last), then a sequencing line ---------------------------------------------
ok(SECRETS.length === 4 && COVE_SECRETS.length === 1 && ISLE_SECRETS.length === 1 && GARDEN_SECRETS.length === 1
  && same(ALL_SECRETS, [...SECRETS, ...COVE_SECRETS, ...ISLE_SECRETS, ...GARDEN_SECRETS]), 'earlier secrets unchanged, one garden secret after them');
ok(GARDEN_SECRETS[0].id === 'storylanterns' && GARDEN_SECRETS[0].npc === 'jasmine' && GARDEN_SECRETS[0].emoji && GARDEN_SECRETS[0].label, 'garden secret has a sticker, an owner and a label');
ok(same(sanitizeSecrets(['storylanterns', 'x', 'clock']), ['clock', 'storylanterns']), 'sticker id is a known id');
{ const s = {}; ok(foundSecret(s, 'storylanterns') && !foundSecret(s, 'storylanterns'), 'sticker is earned once'); }
{
  ok(same(STORY_LANTERNS.map((s) => s.thing), ['seed', 'sprout', 'flower']) && same(STORY_LANTERNS.map((s) => s.word), ['first', 'next', 'last']), 'lanterns tell the story in growing order: seed, sprout, flower (first, next, last)');
  let tr = createSecretTracker();
  ok(tr.tap('story-1', 0) === null && tr.tap('story-2', 500) === null && tr.tap('story-3', 1000) === 'storylanterns', 'seed, sprout, flower in order fires');
  tr = createSecretTracker(); tr.tap('story-3', 0); tr.tap('story-2', 100);
  ok(tr.tap('story-1', 200) === null, 'wrong order (flower first) does not fire');
  tr = createSecretTracker(); tr.tap('story-1', 0); tr.tap('story-3', 100);
  ok(tr.tap('story-2', 200) === null, 'skipping the sprout does not fire');
  tr = createSecretTracker(); tr.tap('story-1', 0); tr.tap('story-2', 1000);
  ok(tr.tap('story-3', 3500) === null, 'too slow (over 3 seconds) does not fire');
  tr = createSecretTracker(); tr.tap('story-1', 0); tr.tap('story-2', 100); tr.tap('story-1', 200); tr.tap('story-2', 300);
  ok(tr.tap('story-3', 400) === 'storylanterns', 'a wrong tap restarts; lantern 1 starts a fresh try');
  tr = createSecretTracker(); tr.tap('story-1', 0); tr.tap('story-2', 10); tr.tap('story-3', 20);
  tr.tap('story-1', 1000); tr.tap('story-2', 1010);
  ok(tr.tap('story-3', 1020) === null, 'cooldown after firing (no speech spam)');
  tr = createSecretTracker(); tr.tap('shape-1', 0); tr.tap('shape-2', 10);
  ok(tr.tap('story-3', 20) === null, 'a story lantern does not finish the isle shapes');
  ok(tr.tap('shape-3', 30) === 'shapestones', 'the isle secret still works beside the garden one');
  tr = createSecretTracker(); tr.tap('shell-1', 0); tr.tap('shell-2', 10);
  ok(tr.tap('shell-3', 20) === 'shellrhyme', 'the cove secret still works');
}
{ // The line Jasmine says must be true to the story order
  const l = storyLine();
  ok(l.say === 'First a seed, next a sprout, last a flower!', `Jasmine says the sequencing line (got "${l.say}")`);
  ok(same(l.steps, ['a seed', 'a sprout', 'a flower']) && /^[A-Za-z ,!]+$/.test(l.say), 'plain spoken text');
  ok(same(STORY_STEPS.map((s) => s.word), ['First', 'next', 'last']) && l.say.indexOf('seed') < l.say.indexOf('sprout') && l.say.indexOf('sprout') < l.say.indexOf('flower'), 'seed comes before sprout before flower');
}

// --- Run garden.js for real against the vendored three.js (a tiny stand-in for world.js) ---------------------------------------
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
  const garden = buildGarden({ THREE, scene, center, pad, G, M, addCollider: (x, z, r) => colliders.push({ x, z, r }), addTappable, starGeometry: () => new THREE.BufferGeometry(), softDot: null, calmMotion });
  return { scene, colliders, tapItems, garden };
}
{
  const h = harness(false);
  // Draw calls: every drawable object the garden adds (hit boxes use an invisible material, glow sprites are hidden at rest).
  const drawables = []; h.scene.traverse((o) => { if ((o.isMesh && o.material.visible !== false) || o.isPoints) drawables.push(o); });
  console.log(`garden draw calls (real build): ${drawables.length} drawables`);
  ok(drawables.length <= 8, `buildGarden makes at most 8 draw calls (built ${drawables.length})`);
  ok(drawables.length >= 5, 'draw call count looks sane');
  ok(h.tapItems.length === 9, 'nine tappables: six surprises + three story lanterns');
  const secrets = h.tapItems.filter((i) => i.secret).map((i) => i.secret);
  ok(same(secrets, ['story-1', 'story-2', 'story-3']), 'the three story lanterns report story-1..3 in story order');
  // The lanterns sit where the layout says they do (the tap system did not have to nudge them), in a left-to-right reading order
  const sp = h.tapItems.filter((i) => i.secret).map((i) => i.group.position.x - center.x);
  ok(sp[0] < sp[1] && sp[1] < sp[2], 'story lanterns read left to right: seed, sprout, flower');
  const names = ['lanterns', 'fountain', 'flowers', 'chime', 'pool', 'hedge'];
  names.forEach((k, i) => {
    const t = h.tapItems[i];
    ok(Math.abs(t.group.position.x - (center.x + GARDEN_SPOTS[k][0])) < 1e-9 && Math.abs(t.group.position.z - (center.z + GARDEN_SPOTS[k][1])) < 1e-9, `${k} tap prop is exactly on its spot`);
  });
  // Nothing sits on Jasmine's pad; every prop is inside the hedge and on dry ground
  for (const it of h.tapItems) {
    const lx = it.group.position.x - center.x, lz = it.group.position.z - center.z;
    ok(Math.hypot(lx, lz) < GARDEN_R && Math.hypot(it.group.position.x - pad.x, it.group.position.z - pad.z) > 3.2, 'tap props stay inside the garden and off the pad');
  }
  const libCenter = lib;
  const lane = { a: branch.from, b: { x: center.x + Math.sin(Math.atan2(pad.x - center.x, pad.z - center.z)) * 3.0, z: center.z + Math.cos(Math.atan2(pad.x - center.x, pad.z - center.z)) * 3.0 } };
  for (const c of h.colliders) {
    ok(Math.hypot(c.x - center.x, c.z - center.z) < LAND_DISC_R + 0.3, 'garden colliders stay inside the garden disc');
    ok(Math.hypot(c.x - libCenter.x, c.z - libCenter.z) > LAND_DISC_R + 3, 'garden colliders never reach the Library');
    ok(Math.hypot(c.x - CASTLE_POS.x, c.z - CASTLE_POS.z) > 5.2 + 8, 'garden colliders never reach the castle');
    ok(Math.hypot(c.x - pad.x, c.z - pad.z) > c.r + 1.5, 'no collider on Jasmine\'s pad');
    ok(distToSegment(c.x, c.z, lane.a, lane.b) - c.r > 1.0, 'the path from the branch to the pool is clear of colliders (Zoe can walk in)');
    for (const t of h.tapItems) ok(Math.hypot(c.x - t.group.position.x, c.z - t.group.position.z) > 0.2 || c.r <= 0.35 || (c.r > FOUNTAIN_R && t === h.tapItems[1]), 'only a slim lantern post (or the fountain itself) may stand under a tap prop');
  }
  ok(h.colliders.length >= 30, `solid props have colliders (${h.colliders.length})`);
  // The hedge has one gate: a gap in the collider ring where the path comes in (wide enough for Zoe: 2 x 0.55 + margin)
  {
    const ring = h.colliders.filter((c) => Math.abs(Math.hypot(c.x - center.x, c.z - center.z) - GARDEN_R) < 0.01).sort((p, q) => Math.atan2(p.z - center.z, p.x - center.x) - Math.atan2(q.z - center.z, q.x - center.x));
    let gaps = 0, widest = 0;
    for (let i = 0; i < ring.length; i++) {
      const p = ring[i], q = ring[(i + 1) % ring.length], gap = Math.hypot(p.x - q.x, p.z - q.z) - p.r - q.r;
      if (gap > 1.2) { gaps++; widest = Math.max(widest, gap); }
    }
    ok(gaps === 1 && widest > 3.2, `the outer hedge has exactly one gate, wide enough to walk through (gaps ${gaps}, widest ${widest.toFixed(1)})`);
  }
  // Every reaction runs cleanly from 0 to 1 and leaves the prop where it started
  for (const k of ['fountain', 'flowers', 'chime', 'pool']) {
    const it = h.tapItems[names.indexOf(k)];
    ok(typeof it.react === 'function', `${k} has its own reaction`);
    const x0 = it.group.position.x, y0 = it.group.position.y, z0 = it.group.position.z;
    for (let i = 0; i <= 40; i++) it.react(it, i / 40);
    const mesh = it.group.children[0];
    ok(Math.abs(it.group.position.x - x0) < 1e-6 && Math.abs(it.group.position.z - z0) < 1e-6 && Math.abs(it.group.position.y - y0) < 1e-6, `${k} ends back where it started`);
    ok(Math.abs(mesh.scale.x - 1) < 1e-9 && Math.abs(mesh.scale.y - 1) < 1e-9 && Math.abs(mesh.scale.z - 1) < 1e-9 || k === 'chime', `${k} ends at its resting size`);
    ok(Math.abs(mesh.rotation.z) < 1e-9 && Math.abs(mesh.rotation.x) < 1e-9, `${k} ends level`);
    ok(Math.abs(mesh.position.x) < 1e-9, `${k} ends in place`);
  }
  // The shared Points: soft lantern halos at rest, effects start on tap and park themselves again
  const pts = drawables.find((o) => o.isPoints);
  ok(pts && pts.visible, 'lantern halos are drawn at rest (one Points draw call)');
  const posA = pts.geometry.attributes.position, colA = pts.geometry.attributes.color;
  const nHalo = LANTERN_POSTS.length + 1 + STORY_LANTERNS.length;
  const lit = (i) => colA.getX(i) + colA.getY(i) + colA.getZ(i) > 0.3 && posA.getY(i) > -40;
  const effectsOn = () => { let n = 0; for (let i = nHalo; i < posA.count; i++) if (posA.getY(i) > -40) n++; return n; };
  ok(Array.from({ length: nHalo }, (_, i) => i).every(lit), `all ${nHalo} lantern halos glow at rest`);
  ok(effectsOn() === 0, 'no effect dots show at rest');
  for (const k of ['lanterns', 'fountain', 'flowers', 'chime', 'pool', 'hedge']) {
    const it = h.tapItems[names.indexOf(k)];
    ok(typeof it.onTap === 'function', `${k} starts its effect on tap`);
    it.onTap(it);
    let peak = 0, peakHalo = 0;
    for (let i = 0; i < 400; i++) {
      h.garden.update(i * 0.016, 0.016); peak = Math.max(peak, effectsOn());
      for (let j = 0; j < nHalo; j++) peakHalo = Math.max(peakHalo, colA.getX(j));
    }
    if (k === 'lanterns') ok(peakHalo > 0.9, 'the lantern wave makes the halos brighter');
    else ok(peak > 0, `${k} effect shows dots`);
    ok(effectsOn() === 0, `${k} effect parks its dots again`);
  }
  for (let s = 0; s < 3; s++) {
    const it = h.tapItems[6 + s]; it.onTap(it);
    h.garden.update(0.5, 0.016);
    ok(colA.getX(nHalo - 3 + s) > 0.9, `story lantern ${s + 1} lights up when tapped`);
    for (let i = 0; i < 200; i++) h.garden.update(i * 0.016, 0.016);
  }
  ok(h.garden.wet(center.x, center.z - 0.2) && !h.garden.wet(center.x - 6, center.z + 4) && h.garden.dry(center.x - 6, center.z + 4) && !h.garden.dry(center.x, center.z - 0.2), 'wet() / dry() use world coordinates');
}
{
  const h = harness(true);
  const pts = []; h.scene.traverse((o) => { if (o.isPoints) pts.push(o); });
  const before = Array.from(pts[0].geometry.attributes.position.array).concat(Array.from(pts[0].geometry.attributes.color.array));
  const r0 = h.tapItems[3].group.children[0].rotation.z;
  for (let i = 0; i < 20; i++) h.garden.update(i, 0.016);
  const after = Array.from(pts[0].geometry.attributes.position.array).concat(Array.from(pts[0].geometry.attributes.color.array));
  ok(h.tapItems[3].group.children[0].rotation.z === r0 && same(before, after), 'calm motion: update moves and flickers nothing');
  ok(pts[0].visible && before.slice(0, 3).some((v) => v !== 0), 'calm motion: the halos still sit there, softly lit');
}

// --- Source checks ----------------------------------------------------------------------------------------------------
const garden = src('js/garden.js'), world = src('js/world.js'), main = src('js/main.js'), ui = src('js/ui.js'), sw = src('sw.js');
const worldmap = src('js/worldmap.js'), treasures = src('js/treasures.js'), wf = readFileSync(new URL('../../.github/workflows/starlight-tests.yml', import.meta.url), 'utf8');
{ // Draw-call budget by source inspection (same method as isle_check): Mesh/Points/Sprite constructors + own(...) calls.
  const body = garden.slice(garden.indexOf('export function buildGarden'));
  const ownDef = body.match(/const own = \(m, mat\) => new THREE\.Mesh\([^\n]*\);/);
  ok(!!ownDef, 'own() helper found');
  const rest = ownDef ? body.replace(ownDef[0], '') : body;
  const direct = (rest.match(/new THREE\.(Mesh|InstancedMesh|SkinnedMesh|Points|Sprite|Line|LineSegments)\(/g) || []).length;
  const owned = (rest.match(/\bown\([a-z]+(?:, *\w+)?\)/g) || []).length;
  console.log(`garden draw calls (source count): ${direct + owned} (${direct} direct + ${owned} via own())`);
  ok(direct + owned <= 8, `buildGarden makes at most 8 draw calls (counted ${direct + owned})`);
  ok(direct + owned >= 5, 'source draw call count looks sane');
  ok(!/new THREE\.\w*Light\(/.test(garden) && !/castShadow|receiveShadow|shadowMap/.test(garden), 'no extra lights, no shadow maps');
  ok(/makeMerger/.test(garden), 'repeats are merged');
  ok(!/\.load\(|new Audio|Image\(|fetch\(|\.png|\.mp3|\.wav|\.jpg|\.svg/.test(garden), 'no new audio or image files');
  ok(/emissive|MeshBasicMaterial/.test(garden), 'lanterns glow with an unlit / emissive material');
}
ok(/calmMotion/.test(garden) && /if \(calmMotion\) return;/.test(garden), 'garden update does nothing under calm motion');
ok(/if \(it\.onTap && !calmMotion\) it\.onTap\(it\)/.test(world), 'effects start only when motion is allowed');
{
  const rs = world.indexOf('function tapReact('), re = world.indexOf('function startTapReaction(', rs), r = world.slice(rs, re);
  const calmAt = r.indexOf('if (calmMotion) {'), elseAt = r.indexOf('} else {', calmAt);
  ok(calmAt > 0 && elseAt > calmAt && !/react\(/.test(r.slice(calmAt, elseAt)), 'calm branch never runs the garden\'s custom motion (glow only)');
}
// Only when open
ok(/const gardenOpen = isGardenOpen\(\)/.test(world) && /if \(gardenOpen\) \{\s*garden = buildGarden\(/.test(world), 'world builds the garden only when open');
ok(/const openLands = openLandIds\(\)/.test(world) && /treasureLandsFor\(openLands\)/.test(world), 'world hides garden treasures only when open');
ok(/closedSlots\(\)\.map/.test(world), 'world draws gates from closedSlots (an open slot is skipped)');
ok(/landPads\[GARDEN\.land\]/.test(world) && /landCenters\[GARDEN\.land\]/.test(world), 'the garden centre and Jasmine\'s pad are stored like the isle\'s');
ok(/garden\.dry\(/.test(world), 'treasures stay out of the pool and fountain');
ok(!NPC_ORDER.includes('jasmine') && !/jasmine/.test(src('js/save.js')), 'Jasmine is NOT playable yet: not in NPC_ORDER, so world.js does not spawn her');
ok(/jasmine:\s*\{[^}]*land: 'garden'/.test(world), 'NPC_DEFS.jasmine.land is the garden (K9 spawns her on the stored pad)');
ok(!('nne' in BUILT_SLOTS) && /BUILT_SLOTS\s*=\s*\{\s*sse:\s*'ariel',\s*ssw:\s*'moana'\s*\}/.test(worldmap.replace(/\/\/.*$/gm, '')), 'BUILT_SLOTS still holds only sse and ssw in source');
ok(/PREVIEW_LANDS\s*=\s*\{\s*cove:\s*'sse',\s*isle:\s*'ssw',\s*garden:\s*'nne'\s*\}/.test(worldmap), 'preview flags map to slots (cove, isle, garden)');
ok(/import \{ buildGarden \} from '\.\/garden\.js\?v=20261027e2'/.test(world), 'world imports garden.js with the existing ?v= stamp');
ok(/import \{ makeMerger \} from '\.\/cove\.js\?v=20261027e2'/.test(garden), 'garden.js shares the cove\'s merger with the existing stamp');
ok(/'\.\/js\/garden\.js\?v=20261027e2'/.test(sw), 'garden.js is precached with the existing stamp');
ok(!/CACHE_VERSION\s*=\s*['"][^'"]*garden/i.test(sw) && !/\?v=2026\d+(?!e2)\w*/.test(garden.replace(/\?v=20261027e2/g, '')), 'cache version and stamps untouched');
ok(/findsTotal\(OPEN_LANDS\)/.test(main) && /findsToday\(Save\.data, todayKey\(\), OPEN_LANDS\)/.test(main), 'main counts only open lands (30 now, 35 with the garden)');
ok(/id === 'storylanterns'\) line = storyLine\(\)\.say/.test(main) && /Narrator\.speakExact\(def\.npc, line\)/.test(main), 'the story line is spoken with Jasmine\'s voice via speakExact');
ok(/gardenOpen: isGardenOpen\(\)/.test(ui), 'Treasure Book asks for the garden only when open');
ok(/zsq-tb-eight/.test(ui) && /zsq-tb-tight/.test(ui), 'Treasure Book has the compact 8-tile / 7-row / 7-sticker layout');
ok(/Moonlit Palace Garden check/.test(wf) && /garden_check\.mjs/.test(wf), 'CI runs this test');
// Six surprises
for (const k of ['lanterns', 'fountain', 'flowers', 'chime', 'pool', 'hedge']) ok(new RegExp(`items\\.${k} = addTappable\\(`).test(garden), `surprise: ${k}`);
ok(/'story-' \+ \(i \+ 1\)/.test(garden), 'the three story lanterns report story-1..3');
// No film characters, songs or iconic props (original art only)
{
  const banned = /aladdin|genie|\babu\b|rajah|\biago\b|jafar|agrabah|\blamp\b|carpet|whole new world|magic lamp|cave of wonders|tiger|monkey|parrot/i;
  for (const [name, text] of [['garden.js', garden], ['treasures.js', treasures], ['worldmap.js', worldmap], ['main.js', main], ['ui.js', ui]]) {
    const m = text.match(banned);
    ok(!m, `${name} has no Aladdin film terms (found ${m && m[0]})`);
  }
  const w = world.match(/aladdin|genie|\babu\b|rajah|\biago\b|jafar|agrabah|carpet|whole new world|magic lamp|cave of wonders/i);
  ok(!w, `world.js has no Aladdin film terms (found ${w && w[0]})`);
  ok(!/\bsultan\b|minaret|onion dome/i.test(garden), 'no film palace silhouette words in the garden');
}

if (bad.length) { console.log('FAIL'); for (const b of bad) console.log(' -', b); process.exit(1); }
console.log('garden_check ok');
