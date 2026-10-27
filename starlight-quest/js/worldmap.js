// ============================================================================
// Zoe's Starlight Quest — world map data (pure: no three.js, no DOM).
// The four inner lands, the outer ring of new-kingdom slots, the paths that
// lead to them and the rules for the one-time "new kingdoms" card.
// world.js builds the 3D from this; tests/world_check.mjs checks the numbers.
// ============================================================================

// Angles are radians on the XZ plane, the same convention world.js uses to place
// things: x = cos(angle) * dist, z = sin(angle) * dist.
// 0 = east (+X), PI/2 = south (+Z), PI = west (-X), -PI/2 = north (-Z).
export const INNER_LAND_ANGLES = {
  library: -Math.PI / 2,   // north
  frostfall: 0,            // east
  meadow: Math.PI / 2,     // south
  village: Math.PI,        // west
};
export const LAND_DIST = 27;       // inner land centre distance from the hub
export const LAND_DISC_R = 10.5;   // radius of an inner land's tinted disc
export const PLAZA_R = 8.5;        // hub plaza radius
export const CASTLE_POS = { x: -11.5, z: -8.5 };

export const WORLD_RADIUS = 60;    // invisible wall; the outer ring sits inside it
export const OUTER_DIST = 50;      // outer-ring slot distance from the hub

const D = Math.PI / 180;

// Six new-kingdom slots between the inner lands (screen directions: north = -Z = up).
// The two between-directions nearest the castle (-112.5 and -157.5 degrees, the north-west
// side) are deliberately left empty so the ring never crowds the castle.
// Later PRs assign these to Ariel, Moana, Jasmine, Anna, Tiana and Aurora.
//
// RESERVED FOR ANNA: 'ese' (22.5 degrees). It sits right next to Elsa's Frostfall Peaks
// (east, 0 degrees), so the two sisters' lands are neighbours. ('ene', -22.5 degrees, is the
// other slot next to Frostfall; it is for someone else.)
export const NEW_LAND_SLOTS = [
  { slot: 'ese', angle: 22.5 * D,   trunk: 45 * D },    // east-south-east  (ANNA)
  { slot: 'sse', angle: 67.5 * D,   trunk: 45 * D },    // south-south-east
  { slot: 'ssw', angle: 112.5 * D,  trunk: 135 * D },   // south-south-west
  { slot: 'wsw', angle: 157.5 * D,  trunk: 135 * D },   // west-south-west
  { slot: 'ene', angle: -22.5 * D,  trunk: -45 * D },   // east-north-east
  { slot: 'nne', angle: -67.5 * D,  trunk: -45 * D },   // north-north-east
];

// The slot reserved for Anna (see above).
export const ANNA_SLOT = 'ese';

// PLANNED_SLOTS — which new-kingdom slot each new princess will get (princess id -> slot id).
// Nothing is built from this yet: it only records the plan so each kingdom PR knows where to
// put her land, and so no two of them pick the same slot. Anna is fixed at 'ese' (beside her
// sister Elsa's Frostfall Peaks).
//   anna    ese  east-south-east   Sunny Fjord Harbor     (next to Frostfall, sister's land)
//   ariel   sse  south-south-east  Seashell Cove          (south side, nearest the water theme)
//   moana   ssw  south-south-west  Wayfinder Isle         (south side, sand and sea)
//   tiana   wsw  west-south-west   Firefly Bayou          (west, near Glass Slipper Village)
//   aurora  ene  east-north-east   Rosewood Glen          (north-east, away from the castle)
//   jasmine nne  north-north-east  Moonlit Palace Garden  (north, near the Library at night)
export const PLANNED_SLOTS = {
  anna: 'ese',
  ariel: 'sse',
  moana: 'ssw',
  tiana: 'wsw',
  aurora: 'ene',
  jasmine: 'nne',
};

// Later kingdom PRs mark a slot as built by adding  slot -> landId  here, e.g. { ese: 'anna' }.
// A slot listed here no longer shows its closed star gate (the new land replaces it).
export const BUILT_SLOTS = { sse: 'ariel' };   // K5: Seashell Cove is open (Ariel's quests exist)

export function builtSlotIds() {
  return NEW_LAND_SLOTS.map((s) => s.slot).filter((id) => Object.prototype.hasOwnProperty.call(BUILT_SLOTS, id));
}

// Preview flags (K4+): a land can be drawn BEFORE its princess's quests exist, only when the owner asks for it
// with  ?preview=isle  (or  ?preview=all  /  ?preview=cove,isle). In normal play (no flag) nothing changes.
// previewable land flag -> slot id. Add a line here when another land gets built ahead of its quests.
// (cove is built for real since K5, so its flag is harmless.) K6: Wayfinder Isle is preview-only until K7.
export const PREVIEW_LANDS = { cove: 'sse', isle: 'ssw' };

/** Set of preview flags in a query string such as "?preview=cove,all". Never throws. */
export function previewFlags(search = (typeof location !== 'undefined' && location && location.search) || '') {
  const out = new Set();
  try {
    const v = new URLSearchParams(String(search)).getAll('preview').join(',');
    for (const f of v.split(',')) { const t = f.trim().toLowerCase(); if (t) out.add(t); }
  } catch (e) { /* bad query string: no flags */ }
  return out;
}

/** Slot ids that are "open": really built (BUILT_SLOTS) or switched on by a preview flag. Only open slots get a land. */
export function openSlotIds(search) {
  const open = new Set(builtSlotIds());
  const flags = previewFlags(search);
  for (const [flag, slot] of Object.entries(PREVIEW_LANDS)) if (flags.has(flag) || flags.has('all')) open.add(slot);
  return NEW_LAND_SLOTS.map((s) => s.slot).filter((id) => open.has(id));
}
export function isSlotOpen(slot, search) { return openSlotIds(search).includes(slot); }

// Seashell Cove (K4) sits at the 'sse' slot. The branch path runs on into the middle of the land.
export const COVE = { slot: 'sse', land: 'cove', princess: 'ariel', discR: LAND_DISC_R, padDist: 6.5 };
export const isCoveOpen = (search) => isSlotOpen(COVE.slot, search);
/** Land centre and the princess's pad for a new-kingdom slot: the pad is near the entrance, on the hub side, like the inner lands' pads. */
function slotLandGeometry(land) {
  const slot = NEW_LAND_SLOTS.find((s) => s.slot === land.slot);
  const center = slotPos(slot);
  const branch = pathSegments().find((sg) => sg.kind === 'branch' && sg.slot === land.slot);
  const dx = branch.from.x - center.x, dz = branch.from.z - center.z, len = Math.hypot(dx, dz) || 1;
  return { center, pad: { x: center.x + (dx / len) * land.padDist, z: center.z + (dz / len) * land.padDist } };
}
export function coveGeometry() { return slotLandGeometry(COVE); }

// Wayfinder Isle (K6) sits at the 'ssw' slot (the slot planned for Moana). Drawn only when the slot is open: built for real
// (K7 adds 'ssw' to BUILT_SLOTS) or ?preview=isle. Her pad is stored, but she is not spawned until K7 adds her to NPC_ORDER.
export const ISLE = { slot: 'ssw', land: 'isle', princess: 'moana', discR: LAND_DISC_R, padDist: 6.5 };
export const isIsleOpen = (search) => isSlotOpen(ISLE.slot, search);
export function isleGeometry() { return slotLandGeometry(ISLE); }

/** Ids of the optional (new-kingdom) lands that are open right now, e.g. ['cove'] or ['cove', 'isle']. */
export function openLandIds(search) {
  const out = [];
  if (isCoveOpen(search)) out.push(COVE.land);
  if (isIsleOpen(search)) out.push(ISLE.land);
  return out;
}

/** Closed gates: slots that are neither built nor previewed open. */
export function closedSlots(search) {
  const open = new Set(openSlotIds(search));
  return NEW_LAND_SLOTS.filter((s) => !open.has(s.slot));
}

export function slotPos(s) {
  return { x: Math.cos(s.angle) * OUTER_DIST, z: Math.sin(s.angle) * OUTER_DIST };
}

// Paths: every pair of slots shares one trunk that leaves the plaza on the diagonal between two
// inner lands (so it stays well clear of their discs), then a short branch runs on to each slot.
export const PATH_WIDTH = 4.2;
export const TRUNK_START = 9;     // just outside the gold plaza ring
export const TRUNK_END = 30;      // where the trunk splits into two branches
export function pathSegments() {
  const segs = [];
  const seen = new Set();
  for (const s of NEW_LAND_SLOTS) {
    const t = s.trunk;
    const a = { x: Math.cos(t) * TRUNK_START, z: Math.sin(t) * TRUNK_START };
    const b = { x: Math.cos(t) * TRUNK_END, z: Math.sin(t) * TRUNK_END };
    const key = t.toFixed(4);
    if (!seen.has(key)) { seen.add(key); segs.push({ kind: 'trunk', from: a, to: b }); }
    segs.push({ kind: 'branch', slot: s.slot, from: b, to: slotPos(s) });
  }
  return segs;
}

// Distance from point (x, z) to the segment a-b.
export function distToSegment(x, z, a, b) {
  const dx = b.x - a.x, dz = b.z - a.z;
  const len2 = dx * dx + dz * dz;
  const t = len2 ? Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / len2)) : 0;
  return Math.hypot(x - (a.x + dx * t), z - (a.z + dz * t));
}

// One-time "New kingdoms appeared" card: never with zero built slots, and only once.
export function shouldShowNewKingdoms(builtCount, seen) {
  return builtCount > 0 && !seen;
}

// Starlight finale gate. The crown finale plays only when every princess in the play list is restored AND
// every new-kingdom slot has been built, so finishing one new land (e.g. Ariel's) just gets that land's own
// celebration. Called from main.js after a quest completes, never on load. K16 builds the 10-land finale.
export function shouldRunFinale(doneIds, orderIds, builtCount) {
  const done = Array.isArray(doneIds) ? doneIds : [];
  return builtCount >= NEW_LAND_SLOTS.length && orderIds.length > 0 && orderIds.every((id) => done.includes(id));
}
