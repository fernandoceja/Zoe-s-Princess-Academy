// Bigger world (K2): six closed star-gate slots in an outer ring, a wider world wall, paths that clear the inner lands,
// tappable gates, calm motion, and a one-time card that can never show with zero built slots.
// world.js imports three via an importmap so it cannot load in node: pure data comes from worldmap.js, the rest is source inspection.
import { readFileSync } from 'node:fs';
import {
  INNER_LAND_ANGLES, LAND_DIST, LAND_DISC_R, CASTLE_POS, WORLD_RADIUS, OUTER_DIST, NEW_LAND_SLOTS, ANNA_SLOT,
  BUILT_SLOTS, builtSlotIds, closedSlots, slotPos, pathSegments, distToSegment, PATH_WIDTH, PLAZA_R, shouldShowNewKingdoms,
} from '../js/worldmap.js?v=20261027e2';
import { merge } from '../js/save.js?v=20261027e2';

const bad = [];
const ok = (cond, msg) => { if (!cond) bad.push(msg); };
const src = (f) => readFileSync(new URL(`../js/${f}`, import.meta.url), 'utf8');
const deg = (r) => (r * 180) / Math.PI;
const angDiff = (a, b) => { let d = Math.abs(a - b) % (2 * Math.PI); return deg(d > Math.PI ? 2 * Math.PI - d : d); };

// Slots
ok(NEW_LAND_SLOTS.length === 6, `6 slots, got ${NEW_LAND_SLOTS.length}`);
ok(new Set(NEW_LAND_SLOTS.map((s) => s.slot)).size === 6, 'slot ids are unique');
const want = [22.5, 67.5, 112.5, 157.5, -22.5, -67.5];
for (const w of want) ok(NEW_LAND_SLOTS.some((s) => Math.abs(deg(s.angle) - w) < 1e-6), `slot at ${w} degrees`);
ok(OUTER_DIST === 50, 'ring distance is 50');
const castleAngle = Math.atan2(CASTLE_POS.z, CASTLE_POS.x);
for (const s of NEW_LAND_SLOTS) {
  ok(angDiff(s.angle, castleAngle) > 25, `${s.slot} is ${angDiff(s.angle, castleAngle).toFixed(1)} degrees from the castle (need > 25)`);
  const p = slotPos(s);
  ok(Math.abs(Math.hypot(p.x, p.z) - 50) < 1e-6, `${s.slot} distance 50`);
  ok(Math.hypot(p.x, p.z) + 3 < WORLD_RADIUS, `${s.slot} gate is inside the world wall`);
  // Slots lie between inner land directions (never on one)
  for (const a of Object.values(INNER_LAND_ANGLES)) ok(angDiff(s.angle, a) > 20, `${s.slot} is between lands`);
}
// The inner lands are still the four compass points
ok(INNER_LAND_ANGLES.library === -Math.PI / 2 && INNER_LAND_ANGLES.frostfall === 0 && INNER_LAND_ANGLES.meadow === Math.PI / 2 && INNER_LAND_ANGLES.village === Math.PI, 'inner land angles unchanged');
ok(LAND_DIST === 27 && LAND_DISC_R === 10.5, 'inner land distance and disc radius unchanged');
// Anna's reserved slot sits next to Elsa's (east, angle 0)
const anna = NEW_LAND_SLOTS.find((s) => s.slot === ANNA_SLOT);
ok(anna && angDiff(anna.angle, INNER_LAND_ANGLES.frostfall) < 30, 'Anna slot is adjacent to Frostfall (east)');
ok(/RESERVED FOR ANNA/.test(readFileSync(new URL('../js/worldmap.js', import.meta.url), 'utf8')), 'worldmap.js documents the Anna slot');

// World wall
ok(WORLD_RADIUS >= 58, `WORLD_RADIUS ${WORLD_RADIUS} >= 58`);
const w = src('world.js');
ok(/const WORLD_RADIUS = WORLD_RADIUS_M/.test(w), 'world.js wall uses worldmap WORLD_RADIUS');
ok(/const LAND_DIST = LAND_DIST_M/.test(w) && /INNER_LAND_ANGLES\.library/.test(w), 'world.js reads land numbers from worldmap.js');
const groundR = Number((w.match(/new THREE\.CircleGeometry\((\d+), 64\)/) || [])[1]);
ok(groundR >= WORLD_RADIUS + 90, `ground disc radius ${groundR} reaches past the fog from the wall`);

// Paths: endpoint of every path and the whole way clear every inner land disc (path half-width + margin)
const segs = pathSegments();
ok(segs.filter((s) => s.kind === 'branch').length === 6, 'one branch per slot');
const MARGIN = 1.0;
const centers = Object.values(INNER_LAND_ANGLES).map((a) => ({ x: Math.cos(a) * LAND_DIST, z: Math.sin(a) * LAND_DIST }));
for (const sg of segs) {
  for (const c of centers) {
    const d = distToSegment(c.x, c.z, sg.from, sg.to);
    ok(d >= LAND_DISC_R + PATH_WIDTH / 2 + MARGIN, `${sg.kind} ${sg.slot || ''} clears an inner land disc (${d.toFixed(1)} < ${(LAND_DISC_R + PATH_WIDTH / 2 + MARGIN).toFixed(1)})`);
  }
  const dc = distToSegment(CASTLE_POS.x, CASTLE_POS.z, sg.from, sg.to);
  ok(dc > 5.2 + PATH_WIDTH / 2, `${sg.kind} clears the castle`);
}
for (const s of NEW_LAND_SLOTS) {
  const p = slotPos(s);
  const br = segs.find((x) => x.slot === s.slot);
  ok(br && Math.hypot(br.to.x - p.x, br.to.z - p.z) < 1e-6, `${s.slot} path ends at its slot`);
  for (const c of centers) ok(Math.hypot(p.x - c.x, p.z - c.z) > LAND_DISC_R + 8, `${s.slot} endpoint clear of an inner land disc`);
}
const trunk = segs.find((x) => x.kind === 'trunk');
ok(Math.hypot(trunk.from.x, trunk.from.z) > PLAZA_R, 'trunks start outside the plaza');

// Built-slot map: empty for now, and closed gates shrink as slots are built
ok(Object.keys(BUILT_SLOTS).length === 5 && builtSlotIds().length === 5 && BUILT_SLOTS.sse === 'ariel' && BUILT_SLOTS.ssw === 'moana' && BUILT_SLOTS.nne === 'jasmine' && BUILT_SLOTS.ese === 'anna' && BUILT_SLOTS.wsw === 'tiana', 'five slots are built (the cove, K5, the isle, K7, the garden, K9, the harbor, K11, and the bayou, K13)');
ok(closedSlots().length === 1, 'the last gate is still closed');

// Gates: tappable after the princess raycast (and after treasures and props), with a chime + toast hook, collider, and calm motion
const iNpc = w.indexOf('intersectObjects(npcHitMeshes');
const iTre = w.indexOf('intersectObjects(treasureHits');
const iTap = w.indexOf('intersectObjects(tappables');
const iGate = w.indexOf('intersectObjects(gateHits');
ok(iNpc > 0 && iNpc < iTre && iTre < iTap && iTap < iGate, 'gate raycast comes after princesses, treasures and props');
ok(/onGateTap\(gHits\[0\]\.object\.userData\.gateSlot\)/.test(w), 'gate tap calls onGateTap');
ok(/addCollider\(g\.x, g\.z, 2\.5\)/.test(w), 'gate has a collider');
ok(/function updateGates[\s\S]*?calmMotion/.test(w) && /if \(!calmMotion\) gateFlash = 1/.test(w), 'gate glow respects calmMotion');
const m = src('main.js');
ok(/onGateTap\(\)[\s\S]*?SoundFX\.chime\(\)[\s\S]*?A new kingdom will open here soon/.test(m), 'main.js: gate tap chimes and toasts');

// New-kingdoms card
ok(shouldShowNewKingdoms(0, false) === false, 'card never shows with zero built slots');
ok(shouldShowNewKingdoms(0, true) === false, 'card never shows with zero built, seen');
ok(shouldShowNewKingdoms(1, false) === true, 'card shows once a slot is built');
ok(shouldShowNewKingdoms(3, true) === false, 'card shows only once');
ok(/unseenKingdomSlots\(builtSlotIds\(\), Save\.data\.seenKingdoms\)/.test(m) && /Save\.data\.seenNewKingdoms = true/.test(m), 'main.js gates the card on built slots the save has not seen (K7: a newly opened kingdom shows it again)');
ok(/New kingdoms appeared beyond the Starlight Hub!/.test(src('ui.js')), 'card text');
ok(merge(null).seenNewKingdoms === false, 'default flag is false');
ok(merge({ seenNewKingdoms: true }).seenNewKingdoms === true, 'flag survives merge');
ok(merge({ seenNewKingdoms: 'yes' }).seenNewKingdoms === false, 'junk flag is sanitized');

if (bad.length) { console.log('FAIL\n' + bad.map((b) => ' - ' + b).join('\n')); process.exit(1); }
console.log('World check OK: 6 slots, ring 50, wall', WORLD_RADIUS, ', paths clear, gates tappable.');
