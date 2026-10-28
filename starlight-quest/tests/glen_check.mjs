// K14: preview-only Rosewood Glen, word-garden learning echo, real scene budget,
// daily finds and old-save compatibility. Uses vendored three.js without a DOM.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from '../vendor/three.module.js';
import { buildGlen, GLEN_SPOTS, GLEN_TREES, GLEN_R } from '../js/glen.js';
import { isGlenOpen, glenGeometry, openLandIds, closedSlots, builtSlotIds, shouldRunFinale, WORLD_RADIUS, distToSegment, pathSegments } from '../js/worldmap.js';
import { NPC_ORDER } from '../js/quests.js';
import { GLEN_KIND, GLEN_LAND, WORD_SIGNS, WORD_NAMES, WORD_ACTION, wordKind, wordLine, treasureSpots, treasureBookModel, findsTotal, findsToday, collectTreasure, sanitizeTreasures, createSecretTracker, foundSecret, awardRowStar, todayKey } from '../js/treasures.js';
const src = (f) => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const day = '2026-10-28';
assert.equal(isGlenOpen(''), true);
for (const flag of ['?preview=aurora', '?preview=ene', '?preview=rose', '?preview=bayou']) assert.equal(isGlenOpen(flag), true);
for (const flag of ['?preview=glen', '?preview=all', '?preview=Glen', '?preview=cove,glen']) assert.equal(isGlenOpen(flag), true);
assert.equal(closedSlots('').length, 0);
assert.equal(closedSlots('?preview=all').length, 0);
assert.equal(findsTotal(openLandIds('')), 50);
assert.equal(findsTotal(openLandIds('?preview=glen')), 50);
assert.equal(findsTotal(openLandIds('?preview=all')), 50);
assert.equal(NPC_ORDER.includes('aurora'), true);
assert.equal(builtSlotIds().length, 6);
for (const flag of ['', '?preview=glen', '?preview=all']) {
  assert.equal(openLandIds(flag).includes('glen'), isGlenOpen(flag));
  assert.equal(shouldRunFinale(NPC_ORDER.slice(0, -1), NPC_ORDER, builtSlotIds().length), false, 'preview cannot complete the finale');
}
assert.match(src('js/main.js'), /shouldRunFinale\(Save.data.done, NPC_IDS, builtSlotIds\(\).length\)/);
assert.equal(GLEN_KIND, 'rose'); assert.equal(GLEN_LAND, 'glen');
const opts = { coveOpen: true, isleOpen: true, gardenOpen: true, harborOpen: true, bayouOpen: true };
const base = treasureBookModel({}, day, opts), all = treasureBookModel({}, day, { ...opts, glenOpen: true });
assert.equal(base.lands.length, 9); assert.equal(base.kinds.length, 10); assert.equal(base.stickers.length, 9);
assert.equal(all.lands.length, 10); assert.equal(all.kinds.length, 11); assert.equal(all.stickers.length, 10);
assert.equal(all.kinds.at(-1).emoji, '🌹');
assert.equal(all.kinds.find((k) => k.kind === 'lily').emoji, '🌸');
const save = { treasures: { day, got: ['bayou-0'], total: { lily: 3 } } };
for (const spot of treasureSpots(day, 'glen')) {
  assert.equal(spot.kind, 'rose'); assert.equal(collectTreasure(save, spot.id, spot.kind, day), true);
  assert.equal(collectTreasure(save, spot.id, spot.kind, day), false);
}
assert.equal(save.treasures.total.lily, 3, 'old lily counts survive the icon swap');
assert.equal(save.treasures.total.rose, 5);
assert.equal(findsToday(save, day, openLandIds('')), 6);
assert.equal(findsToday(save, day, openLandIds('?preview=all')), 6);
assert.equal(awardRowStar(save, 'glen', day), true); assert.equal(awardRowStar(save, 'glen', day), false);
assert.equal(foundSecret(save, 'wordgarden'), true); assert.equal(foundSecret(save, 'wordgarden'), false);
const kept = treasureBookModel(save, day, opts);
assert.equal(kept.kinds.at(-1).count, 5); assert.equal(kept.stickers.at(-1).found, true);
const allIds = all.lands.flatMap((l) => Array.from({ length: 5 }, (_, i) => l.id + '-' + i));
assert.equal(sanitizeTreasures({ day, got: allIds }).got.length, 50);
assert.deepEqual(sanitizeTreasures(null).got, []);
assert.deepEqual(WORD_SIGNS, ['bird', 'run', 'rose']);
assert.deepEqual(WORD_NAMES, ['bird', 'rose']); assert.equal(WORD_ACTION, 'run');
assert.equal(wordKind('bird'), 'naming'); assert.equal(wordKind('rose'), 'naming'); assert.equal(wordKind('run'), 'action'); assert.equal(wordKind('unknown'), null);
assert.match(wordLine().say, /Bird and rose are naming words. Run is an action word!/);
for (const names of [['bird', 'rose'], ['rose', 'bird']]) {
  const t = createSecretTracker();
  assert.equal(t.tap('word-' + names[0], 1000), null);
  assert.equal(t.tap('word-' + names[1], 2000), null);
  assert.equal(t.tap('word-run', 3000), 'wordgarden');
  assert.equal(t.tap('word-run', 3100), null, 'no repeated speech');
}
for (const sequence of [
  [['word-run', 1000]], [['word-bird', 1000], ['word-run', 2000]],
  [['word-bird', 1000], ['word-bird', 2000], ['word-run', 3000]],
  [['word-bird', 1000], ['word-rose', 2000], ['word-run', 16001]],
  [['word-bird', 1000], ['word-run', 2000], ['word-rose', 3000], ['word-run', 4000]],
]) { const t = createSecretTracker(); for (const [part, ms] of sequence) assert.equal(t.tap(part, ms), null, 'wrong/late sequences do not award a sticker'); }

const { center, pad } = glenGeometry();
function harness(calmMotion) {
  const scene = new THREE.Scene(), colliders = [], taps = [], gc = {}, mc = {};
  const addTappable = (builder, x, z, arg, color, secret) => {
    // Mirror world.js's nudge rules so misplaced colliders/taps cannot hide behind a mock.
    const free = (px, pz) => Math.hypot(px - pad.x, pz - pad.z) >= 3.2 && colliders.every((c) => Math.hypot(px - c.x, pz - c.z) >= c.r + 0.8) && taps.every((it) => Math.hypot(px - it.group.position.x, pz - it.group.position.z) >= 1.8);
    let px = x, pz = z;
    for (let k = 0; k < 60 && !free(px, pz); k++) { px = x + Math.cos(k * 2.4) * 0.4 * k; pz = z + Math.sin(k * 2.4) * 0.4 * k; }
    assert.equal(px, x, 'planned tappable must not be nudged'); assert.equal(pz, z);
    const group = new THREE.Group(); group.position.set(x, 0, z); group.scale.setScalar(1.25);
    builder(group, arg); scene.add(group);
    const it = { group, secret: secret || null, baseY: 0, t: -1 }; taps.push(it); return it;
  };
  const glen = buildGlen({ THREE, scene, center, pad, G: (k, f) => gc[k] ||= f(), M: (k, f) => mc[k] ||= f(), addCollider: (x, z, r) => colliders.push({ x, z, r }), addTappable, calmMotion });
  return { scene, colliders, taps, glen };
}
for (const calm of [false, true]) {
  const h = harness(calm), meshes = [];
  h.scene.traverse((o) => { if (o.isMesh || o.isPoints || o.isSprite) meshes.push(o); assert.equal(!!o.isLight, false); assert.equal(o.castShadow, false); });
  assert.equal(meshes.length, 8, 'at most eight draw calls at rest');
  assert.equal(h.taps.length, 9, 'six surprises + three word signs');
  assert.deepEqual(h.taps.filter((t) => t.secret).map((t) => t.secret), WORD_SIGNS.map((w) => 'word-' + w));
  assert.equal(meshes.filter((m) => m.material.isMeshBasicMaterial).length, 1, 'one unlit lettering mesh');
  for (const it of h.taps.slice(0, 6)) {
    const b = it.group.children[0], state = () => [...b.position.toArray(), ...b.quaternion.toArray(), ...b.scale.toArray()];
    const rest = state(); let moves = false;
    for (let i = 0; i <= 40; i++) { it.react(it, i / 40); if (JSON.stringify(state()) !== JSON.stringify(rest)) moves = true; }
    assert.deepEqual(state(), rest, 'reaction settles exactly'); assert.equal(moves, !calm);
  }
  h.scene.updateMatrixWorld(true);
  const v = new THREE.Vector3(); let maxR = 0;
  for (const mesh of meshes) for (let i = 0; i < mesh.geometry.attributes.position.count; i++) {
    v.fromBufferAttribute(mesh.geometry.attributes.position, i).applyMatrix4(mesh.matrixWorld);
    assert.ok(Number.isFinite(v.x + v.y + v.z));
    maxR = Math.max(maxR, Math.hypot(v.x - center.x, v.z - center.z));
    assert.ok(v.y > -0.5 && v.y < 6);
  }
  assert.ok(maxR < 11, 'art stays inside the clearing');
  for (const c of h.colliders) {
    assert.ok(Math.hypot(c.x, c.z) + c.r < WORLD_RADIUS);
    assert.ok(Math.hypot(c.x - pad.x, c.z - pad.z) > c.r + 1.5);
    for (const tap of h.taps) assert.ok(Math.hypot(c.x - tap.group.position.x, c.z - tap.group.position.z) >= c.r + 0.8);
  }
  for (const [x, z] of Object.values(GLEN_SPOTS)) assert.ok(Math.hypot(x, z) < GLEN_R);
  assert.equal(h.colliders.length, GLEN_TREES.length);
  const branch = pathSegments().find((s) => s.kind === 'branch' && s.slot === 'ene');
  for (const c of h.colliders) assert.ok(distToSegment(c.x, c.z, branch.from, branch.to) > c.r + 1);
  // 2,000 seeded treasures: bounded, clear of props/pad/each other and deterministic.
  const placements = (date) => {
    const placed = [];
    const free = (x, z) => Math.hypot(x - pad.x, z - pad.z) >= 3.2 && h.colliders.every((c) => Math.hypot(x - c.x, z - c.z) >= c.r + 0.8) && h.taps.every((t) => Math.hypot(x - t.group.position.x, z - t.group.position.z) >= 1.8) && placed.every(([px, pz]) => Math.hypot(x - px, z - pz) >= 1.6);
    for (const sp of treasureSpots(date, 'glen')) {
      const p = h.glen.settle(center.x + sp.x, center.z + sp.z, free);
      assert.ok(free(...p)); assert.ok(Math.hypot(p[0] - center.x, p[1] - center.z) < GLEN_R); placed.push(p);
    }
    return placed;
  };
  for (let d = 0; d < 400; d++) placements(todayKey(new Date(2026, 0, d + 1)));
  assert.deepEqual(placements(day), placements(day));
  for (let i = 0; i < 50; i++) h.glen.update(i, 0.016);
}
assert.match(src('js/world.js'), /if \(glenOpen\) \{\s*glen = buildGlen/);
assert.match(src('js/world.js'), /landCenters\[GLEN.land\]/);
assert.match(src('js/world.js'), /glen.settle\(wx, wz, treasureFree\)/);
assert.match(src('js/world.js'), /rose\(g\)/);
assert.match(src('js/ui.js'), /glenOpen: isGlenOpen\(\)/);
assert.match(src('js/ui.js'), /zsq-tb-glen/);
assert.match(src('sw.js'), /\.\/js\/glen.js\?v=20261027e2/);
assert.match(readFileSync(new URL('../../.github/workflows/starlight-tests.yml', import.meta.url), 'utf8'), /glen_check.mjs/);
console.log('glen_check ok: preview-only, 50 finds, ten rows, secret order, eight draw calls, 400-day placement, calm motion');
