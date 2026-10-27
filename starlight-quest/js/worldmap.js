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

// Later kingdom PRs mark a slot as built by adding  slot -> landId  here, e.g. { ese: 'anna' }.
// A slot listed here no longer shows its closed star gate (the new land replaces it).
export const BUILT_SLOTS = {};

export function builtSlotIds() {
  return NEW_LAND_SLOTS.map((s) => s.slot).filter((id) => Object.prototype.hasOwnProperty.call(BUILT_SLOTS, id));
}
export function closedSlots() {
  const built = new Set(builtSlotIds());
  return NEW_LAND_SLOTS.filter((s) => !built.has(s.slot));
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
