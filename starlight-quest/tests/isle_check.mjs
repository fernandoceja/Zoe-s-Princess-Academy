// Wayfinder Isle (K6): the land is built only when its slot is "open" (built for real in K7, or ?preview=isle), has its own
// treasure kind and one secret (shape stones), respects calm motion, stays inside the draw-call budget, and uses no film
// characters or iconic props. Pure helpers are imported; isle.js itself runs here against the vendored three.js with a tiny
// stand-in for world.js (no browser needed), and the wiring in world/main/ui is checked by source inspection.
import { readFileSync } from 'node:fs';
import * as THREE from '../vendor/three.module.js';
import {
  BUILT_SLOTS, PLANNED_SLOTS, builtSlotIds, closedSlots, openSlotIds, isSlotOpen, isCoveOpen, isIsleOpen, openLandIds, previewFlags,
  isleGeometry, coveGeometry, ISLE, COVE, slotPos, NEW_LAND_SLOTS, LAND_DISC_R, LAND_DIST, INNER_LAND_ANGLES, CASTLE_POS,
  pathSegments, distToSegment, PATH_WIDTH, WORLD_RADIUS,
} from '../js/worldmap.js';
import {
  todayKey, treasureSpots, collectTreasure, treasureBookModel, treasureLandsFor, findsTotal, findsToday, awardRowStar,
  TREASURE_KINDS, ALL_TREASURE_KINDS, ISLE_KIND, ISLE_LAND, TREASURES_PER_LAND, TREASURE_INFO, TREASURE_LAND_NAMES,
  SECRETS, COVE_SECRETS, ISLE_SECRETS, ALL_SECRETS, sanitizeSecrets, foundSecret, createSecretTracker, shapeLine, SHAPE_SIDES,
} from '../js/treasures.js';
import { buildIsle, isleWet, ISLE_SPOTS, ISLE_STATICS, ISLE_R, STEP_STONES, SHAPE_STONES, COMPASS_R } from '../js/isle.js';
import { NPC_ORDER, PRINCESSES } from '../js/quests.js';

const bad = [];
const ok = (cond, msg) => { if (!cond) bad.push(msg); };
const src = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const day = '2026-10-27';

// --- "Open" -----------------------------------------------------------------------------------------------------
ok(PLANNED_SLOTS.moana === 'ssw' && ISLE.slot === 'ssw' && ISLE.land === 'isle' && ISLE.princess === 'moana', 'isle sits at the planned ssw slot');
ok(BUILT_SLOTS.ssw === 'moana' && builtSlotIds().includes('ssw'), 'ssw is built (K7: Moana\'s quests exist)');
ok(isIsleOpen() && isIsleOpen('') && isIsleOpen('?x=1') && isIsleOpen('?preview=cove') && isIsleOpen('?preview=moana'), 'isle is open by default (built, no flag needed)');
ok(isIsleOpen('?preview=isle') && isIsleOpen('?preview=all') && isIsleOpen('?a=1&preview=Isle') && isIsleOpen('?preview=cove,isle'), 'preview=isle / all / cove,isle still parse and keep the isle open');
ok(isCoveOpen() && isCoveOpen('?preview=isle') && isCoveOpen('?preview=cove'), 'the cove stays open (and ?preview=cove stays harmless)');
ok(same(openLandIds(''), ['cove', 'isle', 'garden', 'harbor', 'bayou']) && same(openLandIds('?preview=isle'), ['cove', 'isle', 'garden', 'harbor', 'bayou']) && same(openLandIds('?preview=all'), ['cove', 'isle', 'garden', 'harbor', 'bayou', 'glen']), 'built lands stay open; preview=all also includes the glen');
ok(same(openSlotIds(''), openSlotIds('?preview=isle')) && same([...openSlotIds('')].sort(), ['ese', 'nne', 'sse', 'ssw', 'wsw']), 'open slots: the four built lands (the isle flag changes nothing)');
ok(closedSlots('').length === 1 && !closedSlots('').some((s) => s.slot === 'ssw'), 'default: the isle gate is gone (1 gate left, the garden, harbor and bayou are open too)');
ok(closedSlots('?preview=isle').length === 1 && !closedSlots('?preview=isle').some((s) => s.slot === 'ssw'), 'open isle has no gate, the last one stays');
ok(closedSlots('').length === 1 && closedSlots('?preview=isle').length === 1 && closedSlots('?preview=all').length === 0, 'the isle flag adds nothing new: one gate stays normally; preview=all opens it');
ok(isSlotOpen('ese', '') && isSlotOpen('wsw', '') && (!isSlotOpen('ene', '') && isSlotOpen('ene', '?preview=all')), 'the harbor (K11) and the bayou (K13) are built; the last land is preview-only');
ok(previewFlags('?preview=%%%').size >= 0 && previewFlags(null).size === 0, 'bad query strings never throw');

// --- Geometry: path reaches the land, Moana's pad is stored, the lands do not overlap the cove --------------------------
const { center, pad } = isleGeometry();
{
  const c = slotPos(NEW_LAND_SLOTS.find((s) => s.slot === 'ssw'));
  ok(Math.hypot(center.x - c.x, center.z - c.z) < 1e-9, 'isle centre is the slot position (the branch ends there)');
  const branch = pathSegments().find((s) => s.kind === 'branch' && s.slot === 'ssw');
  ok(distToSegment(center.x, center.z, branch.from, branch.to) < 1e-6, 'the branch path runs into the isle');
  ok(distToSegment(pad.x, pad.z, branch.from, branch.to) < PATH_WIDTH / 2, 'the pad is on the path side of the isle');
  const dPad = Math.hypot(pad.x - center.x, pad.z - center.z);
  ok(dPad > 5 && dPad < LAND_DISC_R - 2, `pad is inside the disc near the entrance (${dPad.toFixed(1)})`);
  ok(Math.hypot(pad.x, pad.z) < Math.hypot(center.x, center.z), 'pad is on the hub side of the centre');
  ok(Math.hypot(pad.x, pad.z) < WORLD_RADIUS, 'pad is inside the world wall');
  const cv = coveGeometry().center;
  ok(Math.hypot(center.x - cv.x, center.z - cv.z) > 2 * LAND_DISC_R + 6, 'isle and cove discs are far apart (no visual or collider overlap)');
  for (const a of Object.values(INNER_LAND_ANGLES)) {
    ok(Math.hypot(center.x - Math.cos(a) * LAND_DIST, center.z - Math.sin(a) * LAND_DIST) > 2 * LAND_DISC_R + 3, 'isle is clear of the inner lands');
  }
  ok(Math.hypot(center.x - CASTLE_POS.x, center.z - CASTLE_POS.z) > LAND_DISC_R + 8, 'isle is clear of the castle');
  const local = (p) => [p.x - center.x, p.z - center.z];
  const all = { ...ISLE_SPOTS, ...ISLE_STATICS };
  for (const [k, [x, z]] of Object.entries(all)) {
    ok(Math.hypot(x, z) < ISLE_R - 0.4, `${k} spot is on dry land (${Math.hypot(x, z).toFixed(1)} of ${ISLE_R})`);
    ok(Math.hypot(center.x + x, center.z + z) < WORLD_RADIUS - 0.5, `${k} spot is inside the world wall`);
    ok(Math.hypot(x - local(pad)[0], z - local(pad)[1]) > 3.3, `${k} spot is clear of Moana's pad`);
  }
  const tapKeys = Object.keys(ISLE_SPOTS);
  for (let i = 0; i < tapKeys.length; i++) for (let j = i + 1; j < tapKeys.length; j++) {
    const a = ISLE_SPOTS[tapKeys[i]], b = ISLE_SPOTS[tapKeys[j]];
    ok(Math.hypot(a[0] - b[0], a[1] - b[1]) >= 1.8, `${tapKeys[i]} and ${tapKeys[j]} are not crowded (the tap system keeps props 1.8 apart)`);
  }
  for (const [x, z] of STEP_STONES) ok(Math.hypot(x, z) < ISLE_R && Math.hypot(x - ISLE_SPOTS.steps[0], z - ISLE_SPOTS.steps[1]) < 2.2, 'stepping stones are on land and inside the tap area');
  ok(Math.hypot(ISLE_SPOTS.compass[0], ISLE_SPOTS.compass[1]) + COMPASS_R < ISLE_R, 'the whole star-compass fits on dry land');
  ok(isleWet(0, 9) && isleWet(ISLE_R, 0) && !isleWet(0, 0) && !isleWet(0, -6), 'isleWet: lagoon wet, island dry');
}

// --- Treasures: blossoms, 5 per day, date-seeded, only when open -----------------------------------------------------
ok(ISLE_KIND === 'blossom' && ALL_TREASURE_KINDS.includes('blossom') && !TREASURE_KINDS.includes('blossom'), 'blossom is an isle-only kind (the other lands\' random kinds are unchanged)');
ok(TREASURE_INFO.blossom && TREASURE_INFO.blossom.emoji === '🌺' && TREASURE_INFO.blossom.label, 'blossom has Treasure Book info');
{
  const emojis = Object.values(TREASURE_INFO).map((i) => i.emoji);
  ok(new Set(emojis).size === emojis.length, 'every treasure kind has its own emoji');
}
ok(TREASURE_LAND_NAMES.isle === 'Wayfinder Isle' && PRINCESSES.moana.landName === 'Wayfinder Isle', 'isle has a book name');
const a = treasureSpots(day, ISLE_LAND, TREASURES_PER_LAND);
ok(a.length === 5 && a.every((s) => s.kind === 'blossom' && /^isle-\d$/.test(s.id)), '5 blossom treasures with ids isle-0..4');
ok(same(a, treasureSpots(day, ISLE_LAND, 5)), 'isle treasures: same day, same spots');
ok(!same(a, treasureSpots('2026-10-28', ISLE_LAND, 5)), 'isle treasures: new day, new spots');
ok(a.every((s) => Number.isFinite(s.x) && Number.isFinite(s.z) && Math.hypot(s.x, s.z) < 9), 'isle spots are finite and inside the land');
ok(['library', 'frostfall', 'meadow', 'village', 'cove'].every((l) => treasureSpots(day, l, 5).every((s) => s.kind !== 'blossom')), 'other lands never hide blossoms');
ok(same(treasureSpots(day, 'library', 5), treasureSpots(day, 'library', 5)) && same(treasureSpots(day, 'cove', 5).map((s) => s.kind), Array(5).fill('seaglass')), 'inner lands and the cove are unchanged');
ok(same(treasureLandsFor(false), ['library', 'frostfall', 'meadow', 'village']) && same(treasureLandsFor(['cove']), ['library', 'frostfall', 'meadow', 'village', 'cove'])
  && same(treasureLandsFor(['cove', 'isle']), ['library', 'frostfall', 'meadow', 'village', 'cove', 'isle']) && same(treasureLandsFor(['isle']), ['library', 'frostfall', 'meadow', 'village', 'isle']), 'treasure lands: only open lands');
ok(findsTotal(false) === 20 && findsTotal([]) === 20, 'finds total is 20 with no new land');
ok(findsTotal(openLandIds('')) === 45, 'finds total is 45 today (4 inner lands + cove + isle + garden + harbor + bayou)');
ok(findsTotal(['cove']) === 25, 'finds total is 25 with only the cove open');
ok(findsTotal(openLandIds('?preview=isle')) === 45 && findsTotal(openLandIds('')) === 45 && findsTotal(openLandIds('?preview=all')) === 50 && findsTotal(['cove', 'isle', 'garden']) === 35 && findsTotal(['cove', 'isle']) === 30, 'normal play keeps its existing total; preview=all adds five glen roses');
{
  const save = {};
  for (let i = 0; i < 5; i++) ok(collectTreasure(save, `isle-${i}`, 'blossom', day), `collect isle-${i}`);
  collectTreasure(save, 'library-0', 'shell', day); collectTreasure(save, 'cove-0', 'seaglass', day);
  ok(findsToday(save, day, ['cove', 'isle']) === 7, 'isle open: all seven finds count');
  ok(findsToday(save, day, ['cove']) === 2, 'isle closed: isle finds do not count toward today');
  ok(findsToday(save, day, false) === 1, 'no new land: only inner finds count');
  ok(save.treasures.total.blossom === 5, 'blossom total is kept');
  ok(awardRowStar(save, 'isle', day) === true && awardRowStar(save, 'isle', day) === false, 'isle row star once per day');
  ok(!collectTreasure({}, 'isle-0', 'blossom', 'today') && !collectTreasure({}, 'isle-0', 'seaglass-x', day), 'bad day / kind still rejected');
}
{ // Treasure Book: tile, row and sticker only when open
  const base = treasureBookModel({}, day, { coveOpen: true });
  ok(base.kinds.length === 6 && base.lands.length === 5 && base.stickers.length === 5, 'book, isle closed: 6 tiles, 5 land rows, 5 stickers (unchanged)');
  const open = treasureBookModel({}, day, { coveOpen: true, isleOpen: true });
  ok(open.kinds.length === 7 && open.kinds[6].kind === 'blossom' && open.lands.length === 6 && open.lands[5].id === 'isle', 'book, isle open: 7 tiles, 6 land rows');
  ok(open.stickers.length === 6 && open.stickers[5].id === 'shapestones' && !open.stickers[5].found, 'book, isle open: 6th sticker (unfound)');
  const kept = treasureBookModel({ treasures: { day, got: [], total: { blossom: 2 } }, secrets: ['shapestones'] }, day);
  ok(kept.kinds.some((k) => k.kind === 'blossom') && kept.stickers.some((s) => s.id === 'shapestones' && s.found), 'earlier isle finds stay visible even when the isle is closed');
  ok(treasureBookModel(null, day, { isleOpen: true }).total === 0, 'null save does not throw');
}

// --- Secret: three shaped stones, fewest corners to most, then a shape fact ----------------------------------------------
ok(SECRETS.length === 4 && COVE_SECRETS.length === 1 && ISLE_SECRETS.length === 1 && same(ALL_SECRETS.slice(0, 6), [...SECRETS, ...COVE_SECRETS, ...ISLE_SECRETS]), 'inner + cove secrets unchanged, one isle secret after them');
ok(ISLE_SECRETS[0].id === 'shapestones' && ISLE_SECRETS[0].npc === 'moana' && ISLE_SECRETS[0].emoji && ISLE_SECRETS[0].label, 'isle secret has a sticker, an owner and a label');
ok(same(sanitizeSecrets(['shapestones', 'x', 'clock']), ['clock', 'shapestones']), 'sticker id is a known id');
{ const s = {}; ok(foundSecret(s, 'shapestones') && !foundSecret(s, 'shapestones'), 'sticker is earned once'); }
{
  // The stone order really is by corners: a circle has none, a triangle three, a square four.
  const REAL = { circle: 0, triangle: 3, square: 4 };
  ok(SHAPE_STONES.length === 3 && SHAPE_STONES.every((s) => REAL[s.shape] === s.corners), 'each secret stone has the right number of corners');
  ok(SHAPE_STONES.every((s, i) => i === 0 || s.corners > SHAPE_STONES[i - 1].corners), 'secret stones go from fewest corners to most');
  let tr = createSecretTracker();
  ok(tr.tap('shape-1', 0) === null && tr.tap('shape-2', 500) === null && tr.tap('shape-3', 1000) === 'shapestones', 'circle, triangle, square in order fires');
  tr = createSecretTracker(); tr.tap('shape-3', 0); tr.tap('shape-2', 100);
  ok(tr.tap('shape-1', 200) === null, 'wrong order does not fire');
  tr = createSecretTracker(); tr.tap('shape-1', 0); tr.tap('shape-3', 100);
  ok(tr.tap('shape-2', 200) === null, 'skipping a stone does not fire');
  tr = createSecretTracker(); tr.tap('shape-1', 0); tr.tap('shape-2', 1000);
  ok(tr.tap('shape-3', 3500) === null, 'too slow (over 3 seconds) does not fire');
  tr = createSecretTracker(); tr.tap('shape-1', 0); tr.tap('shape-2', 100); tr.tap('shape-1', 200); tr.tap('shape-2', 300);
  ok(tr.tap('shape-3', 400) === 'shapestones', 'a wrong tap restarts; stone 1 starts a fresh try');
  tr = createSecretTracker(); tr.tap('shape-1', 0); tr.tap('shape-2', 10); tr.tap('shape-3', 20);
  tr.tap('shape-1', 1000); tr.tap('shape-2', 1010);
  ok(tr.tap('shape-3', 1020) === null, 'cooldown after firing (no speech spam)');
  tr = createSecretTracker(); tr.tap('shell-1', 0); tr.tap('shell-2', 10);
  ok(tr.tap('shape-3', 20) === null, 'a shape stone does not finish the cove shells');
  ok(tr.tap('shell-3', 30) === 'shellrhyme', 'the cove secret still works beside the isle one');
}
{ // Shape facts must be true.
  const TRUE_SIDES = { triangle: 3, square: 4, rectangle: 4, pentagon: 5, hexagon: 6 };
  const WORD = { 3: 'three', 4: 'four', 5: 'five', 6: 'six' };
  ok(same(SHAPE_SIDES, TRUE_SIDES), 'SHAPE_SIDES holds the real side counts');
  ok(shapeLine(() => 0).say === 'A triangle has three sides and three corners!', 'first fact says "A triangle has three sides and three corners!"');
  const n = Object.keys(TRUE_SIDES).length + 3, seen = new Set();
  for (let i = 0; i < n; i++) {
    const l = shapeLine(() => i / n); seen.add(l.say);
    ok(l.say.endsWith('!') && /^[A-Za-z ,.!]+$/.test(l.say), `fact ${i} is plain spoken text`);
    if (TRUE_SIDES[l.shape]) {
      ok(l.say === `A ${l.shape} has ${WORD[TRUE_SIDES[l.shape]]} sides and ${WORD[TRUE_SIDES[l.shape]]} corners!` && l.sides === TRUE_SIDES[l.shape] && l.corners === TRUE_SIDES[l.shape], `${l.shape} fact is correct`);
    } else if (l.shape === 'circle') ok(/no corners/.test(l.say) && !/\b(one|two|three|four)\b corners/.test(l.say), 'circle fact: no corners');
    else if (l.shape === 'cube') ok(/six flat faces/.test(l.say) && /eight corners/.test(l.say), 'cube fact: six faces, eight corners');
    else if (l.shape === 'sphere') ok(/sphere/.test(l.say) && /no corners/.test(l.say), 'sphere fact: round, no corners');
    else ok(false, `unknown shape ${l.shape}`);
  }
  ok(seen.size === n, 'every fact is different');
  ok(shapeLine(() => 0.999999).say.endsWith('!') && shapeLine(() => 1).say.endsWith('!'), 'shapeLine upper edge');
}

// --- Run isle.js for real against the vendored three.js (a tiny stand-in for world.js) ------------------------------------
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
  const starGeometry = () => new THREE.BufferGeometry();
  const isle = buildIsle({ THREE, scene, center, G, M, addCollider: (x, z, r) => colliders.push({ x, z, r }), addTappable, starGeometry, softDot: null, calmMotion });
  return { scene, colliders, tapItems, isle };
}
{
  const h = harness(false);
  // Draw calls: every drawable object the isle adds (hit boxes use an invisible material, glow sprites are hidden at rest).
  const drawables = []; h.scene.traverse((o) => { if ((o.isMesh && o.material.visible !== false) || o.isPoints) drawables.push(o); });
  const atRest = drawables.filter((o) => o.visible && (!o.parent || o.parent.visible));
  console.log(`isle draw calls (real build): ${drawables.length} drawables, ${atRest.length} drawn at rest`);
  ok(drawables.length <= 8, `buildIsle makes at most 8 draw calls (built ${drawables.length})`);
  ok(drawables.length >= 5, 'draw call count looks sane');
  ok(h.tapItems.length === 9, 'nine tappables: six surprises + three secret stones');
  const secrets = h.tapItems.filter((i) => i.secret).map((i) => i.secret);
  ok(same(secrets, ['shape-1', 'shape-2', 'shape-3']), 'the three shape stones report shape-1..3 in order of corners');
  // Nothing sits on a prop or on Moana's pad; every prop is on dry land
  for (const it of h.tapItems) {
    const lx = it.group.position.x - center.x, lz = it.group.position.z - center.z;
    ok(Math.hypot(lx, lz) < ISLE_R && Math.hypot(it.group.position.x - pad.x, it.group.position.z - pad.z) > 3.2, 'tap props stay on land and off the pad');
  }
  for (const c of h.colliders) {
    ok(Math.hypot(c.x - center.x, c.z - center.z) < LAND_DISC_R + 0.5, 'isle colliders stay inside the isle disc');
    const cv = coveGeometry().center;
    ok(Math.hypot(c.x - cv.x, c.z - cv.z) > LAND_DISC_R + 3, 'isle colliders never reach the cove');
    ok(Math.hypot(c.x - pad.x, c.z - pad.z) > c.r + 1.5, 'no collider on Moana\'s pad');
  }
  ok(h.colliders.length >= 14, `solid props have colliders (${h.colliders.length})`);
  // Every reaction runs cleanly from 0 to 1 and leaves the prop where it started
  for (const [k, expectReact] of [['palm', 1], ['canoe', 1], ['conch', 1], ['bird', 1], ['steps', 0], ['compass', 0]]) {
    const it = h.tapItems[['palm', 'canoe', 'conch', 'steps', 'bird', 'compass'].indexOf(k)];
    ok(!!it && !!it.react === !!expectReact, `${k} reaction is ${expectReact ? 'custom' : 'the shared sparkle with lights'}`);
    if (it && it.react) {
      const x0 = it.group.position.x, y0 = it.group.position.y, z0 = it.group.position.z;
      for (let i = 0; i <= 40; i++) it.react(it, i / 40);
      it.group.position.y = it.baseY; it.group.rotation.z = 0; it.group.scale.setScalar(1.25);
      ok(Math.abs(it.group.position.x - x0) < 1e-6 && Math.abs(it.group.position.z - z0) < 1e-6 && Math.abs(it.group.position.y - y0) < 1e-6, `${k} ends back where it started`);
      ok(Math.abs(it.group.rotation.x) < 1e-9, `${k} ends level`);
    }
  }
  // The shared Points light up when stones / compass / horn are tapped and switch themselves off again
  const pts = drawables.find((o) => o.isPoints);
  ok(pts && !pts.visible, 'glow Points are hidden at rest');
  const [palmIt, , , stepsIt, , compassIt] = h.tapItems; const conchIt = h.tapItems[2];
  for (const it of [stepsIt, compassIt, conchIt]) {
    ok(typeof it.onTap === 'function', 'light/sound props start their effect on tap');
    it.onTap(it); ok(pts.visible, 'glow Points show while an effect plays');
    for (let i = 0; i < 400; i++) h.isle.update(i * 0.016, 0.016);
    ok(!pts.visible, 'glow Points hide again when the effect ends');
  }
  h.isle.update(1, 0.016); ok(Math.abs(palmIt.group.rotation.z) <= 0.02 + 1e-9, 'the tap palm only sways gently while idle');
  ok(h.isle.wet(center.x, center.z + 9.5) && !h.isle.wet(center.x, center.z), 'wet() uses world coordinates');
}
{
  const h = harness(true);
  const pts = []; h.scene.traverse((o) => { if (o.isPoints) pts.push(o); });
  const z0 = h.tapItems[0].group.rotation.z;
  for (let i = 0; i < 20; i++) h.isle.update(i, 0.016);
  ok(h.tapItems[0].group.rotation.z === z0 && !pts[0].visible, 'calm motion: update moves nothing');
}

// --- Source checks ----------------------------------------------------------------------------------------------------
const isle = src('js/isle.js'), world = src('js/world.js'), main = src('js/main.js'), ui = src('js/ui.js'), sw = src('sw.js');
const worldmap = src('js/worldmap.js'), treasures = src('js/treasures.js'), quests = src('js/quests.js');
{ // Draw-call budget by source inspection (same method as cove_check): Mesh/Points/Sprite constructors + own(...) calls.
  const body = isle.slice(isle.indexOf('export function buildIsle'));
  const ownDef = body.match(/const own = \(m\) => \{[^\n]*\};/);
  ok(!!ownDef, 'own() helper found');
  const rest = ownDef ? body.replace(ownDef[0], '') : body;
  const direct = (rest.match(/new THREE\.(Mesh|InstancedMesh|SkinnedMesh|Points|Sprite|Line|LineSegments)\(/g) || []).length;
  const owned = (rest.match(/\bown\([a-z]+\)/g) || []).length;
  console.log(`isle draw calls (source count): ${direct + owned} (${direct} direct + ${owned} via own())`);
  ok(direct + owned <= 8, `buildIsle makes at most 8 draw calls (counted ${direct + owned})`);
  ok(direct + owned >= 5, 'source draw call count looks sane');
  ok(!/new THREE\.\w*Light\(/.test(isle) && !/castShadow|receiveShadow|shadowMap/.test(isle), 'no extra lights, no shadow maps');
  ok(/makeMerger/.test(isle), 'repeats are merged');
  ok(!/\.load\(|new Audio|Image\(|fetch\(|\.png|\.mp3|\.wav|\.jpg|\.svg/.test(isle), 'no new audio or image files');
}
ok(/calmMotion/.test(isle) && /if \(calmMotion\) return;/.test(isle), 'isle update does nothing under calm motion');
ok(/if \(it\.onTap && !calmMotion\) it\.onTap\(it\)/.test(world), 'lights and rings start only when motion is allowed');
{
  const rs = world.indexOf('function tapReact('), re = world.indexOf('function startTapReaction(', rs), r = world.slice(rs, re);
  const calmAt = r.indexOf('if (calmMotion) {'), elseAt = r.indexOf('} else {', calmAt);
  ok(calmAt > 0 && elseAt > calmAt && !/react\(/.test(r.slice(calmAt, elseAt)), 'calm branch never runs the isle\'s custom motion (glow only)');
}
// Only when open
ok(/const isleOpen = isIsleOpen\(\)/.test(world) && /if \(isleOpen\) \{\s*isle = buildIsle\(/.test(world), 'world builds the isle only when open');
ok(/const openLands = openLandIds\(\)/.test(world) && /treasureLandsFor\(openLands\)/.test(world), 'world hides isle treasures only when open');
ok(/closedSlots\(\)\.map/.test(world), 'world draws gates from closedSlots (an open slot is skipped)');
ok(/landPads\[ISLE\.land\]/.test(world) && /landCenters\[ISLE\.land\]/.test(world), 'the isle centre and Moana\'s pad are stored like the cove\'s');
ok(!/NPC_ORDER\.push|NPC_ORDER = /.test(world) && NPC_ORDER.indexOf('moana') === NPC_ORDER.indexOf('ariel') + 1 && /moana/.test(quests.slice(quests.indexOf('export const NPC_ORDER'), quests.indexOf('\n', quests.indexOf('export const NPC_ORDER')))), 'Moana follows Ariel in NPC_ORDER (Jasmine follows in K9): world.js spawns her on the isle pad like the others');
ok(PRINCESSES.moana && PRINCESSES.moana.landName === 'Wayfinder Isle', 'Moana\'s princess entry names the land');
ok(/import \{ buildIsle \} from '\.\/isle\.js\?v=20261027e2'/.test(world), 'world imports isle.js with the existing ?v= stamp');
ok(/import \{ makeMerger \} from '\.\/cove\.js\?v=20261027e2'/.test(isle), 'isle.js shares the cove\'s merger with the existing stamp');
ok(/'\.\/js\/isle\.js\?v=20261027e2'/.test(sw), 'isle.js is precached with the existing stamp');
ok(!/CACHE_VERSION\s*=\s*['"][^'"]*isle/i.test(sw), 'cache version untouched');
ok(/openLandIds\(\)/.test(main) && /findsTotal\(OPEN_LANDS\)/.test(main) && /findsToday\(Save\.data, todayKey\(\), OPEN_LANDS\)/.test(main), 'main counts only open lands (25 now, 30 with the isle)');
ok(/id === 'shapestones'\) line = shapeLine\(\)\.say/.test(main) && /Narrator\.speakExact\(def\.npc, line\)/.test(main), 'the shape fact is spoken with Moana\'s voice via speakExact');
ok(/coveOpen: isCoveOpen\(\), isleOpen: isIsleOpen\(\)/.test(ui), 'Treasure Book asks for the isle only when open');
ok(/zsq-tb-seven/.test(ui) && /zsq-tb-many/.test(ui), 'Treasure Book has the compact 7-tile / 6-sticker layout');
ok(/BUILT_SLOTS\s*=\s*\{\s*sse:\s*'ariel',\s*ssw:\s*'moana',\s*nne:\s*'jasmine',\s*ese:\s*'anna',\s*wsw:\s*'tiana'\s*\}/.test(worldmap.replace(/\/\/.*$/gm, '')), 'BUILT_SLOTS holds sse: ariel, ssw: moana, nne: jasmine and ese: anna in source');
ok(/PREVIEW_LANDS\s*=\s*\{\s*cove:\s*'sse',\s*isle:\s*'ssw'(,\s*garden:\s*'nne')?(,\s*harbor:\s*'ese')?(,\s*bayou:\s*'wsw')?,\s*glen:\s*'ene'\s*\}/.test(worldmap), 'preview flags map to slots (cove, isle)');
// Six surprises
for (const k of ['palm', 'canoe', 'conch', 'steps', 'bird', 'compass']) ok(new RegExp(`items\\.${k} = addTappable\\(`).test(isle), `surprise: ${k}`);
ok(/'shape-' \+ \(i \+ 1\)/.test(isle), 'the three shape stones report shape-1..3');
// No film characters, songs or iconic props (original art only)
{
  const banned = /\bmaui\b|te fiti|te k[aā]\b|heihei|\bpua\b|kakamora|tamatoa|heart of|heart stone|heart-stone|demigod|fish-?hook|how far i'?ll go|you'?re welcome|shiny|lava monster|spiral heart/i;
  for (const [name, text] of [['isle.js', isle], ['treasures.js', treasures], ['worldmap.js', worldmap], ['main.js', main], ['ui.js', ui], ['world.js', world]]) {
    const m = text.match(banned);
    ok(!m, `${name} has no Moana film terms (found ${m && m[0]})`);
  }
}

if (bad.length) { console.log('FAIL'); for (const b of bad) console.log(' -', b); process.exit(1); }
console.log('isle_check ok');
