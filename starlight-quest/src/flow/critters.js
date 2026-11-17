/* Zoe's Starlight Quest — little friends in the open grass (Nov 17, item 4).
 * Bouncy flowers, butterflies and bunnies in the empty grass between the paths and the lands. Tap one (or walk right up
 * to it, which also works with a controller) and it reacts: the flower bounces, the butterfly loops up into the air,
 * the bunny hops a little circle. Each has its own sound. They are never on a path, in a land, near a princess or the
 * castle, have no colliders (Zoe walks straight through them) and only react while she roams.
 * Pure: no three.js, no DOM. src/fx/navfx.js draws them; tests/critters_check.mjs checks them.
 */
import { pathSegments, kingdomLands, CASTLE_POS, CASTLE_R, PLAZA_R, WORLD_RADIUS, LAND_DISC_R, distToSegment, seededRng } from '../engine-core.js';

export const CRITTER_KINDS = ['bunny', 'flower', 'butterfly'];
export const CRITTER_COUNT = { bunny: 3, flower: 6, butterfly: 4 };
export const CRITTER_REACT = { bunny: 1.3, flower: 0.9, butterfly: 1.6 };   // seconds a reaction plays
export const CRITTER_NEAR = 1.9;      // walking this close makes one react (once, then it rests)
export const CRITTER_REST = 4;        // seconds before the same friend reacts to walking again
export const CRITTER_HIT_R = 1.4;     // tap radius (with a 60 px finger at the usual camera height)
const PATH_CLEAR = 4.5;               // from any path's centre line (paths are 4.2 wide)
const SPREAD = 6;                     // two friends at least this far apart

/** All open grass spots, best first: [{ x, z }]. Same every day (they live there). */
export function grassSpots(search) {
  const segs = [...pathSegments().map((s) => [s.from, s.to]), ...kingdomLands(search).map((l) => [{ x: 0, z: 0 }, l.center])];
  const lands = kingdomLands(search);
  const out = [];
  for (let x = -56; x <= 56; x += 2.5) for (let z = -56; z <= 56; z += 2.5) {
    const r = Math.hypot(x, z);
    if (r < PLAZA_R + 5 || r > WORLD_RADIUS - 5) continue;
    if (segs.some(([a, b]) => distToSegment(x, z, a, b) < PATH_CLEAR)) continue;
    if (lands.some((l) => Math.hypot(x - l.center.x, z - l.center.z) < LAND_DISC_R + 2 || Math.hypot(x - l.pad.x, z - l.pad.z) < 7)) continue;
    if (Math.hypot(x - CASTLE_POS.x, z - CASTLE_POS.z) < CASTLE_R + 4) continue;
    out.push({ x, z });
  }
  const rand = seededRng('grass-friends');
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}

/** Pick homes for every friend from the grass spots, skipping spots near the world's own props (`blocked`: [{ x, z, r }]).
 * Returns [{ kind, x, z, i }] (i = index within its kind). */
export function placeCritters(spots, blocked = []) {
  const want = [];
  for (const k of CRITTER_KINDS) for (let i = 0; i < CRITTER_COUNT[k]; i++) want.push({ kind: k, i });
  // Interleave kinds so each part of the world gets a mix.
  want.sort((a, b) => a.i - b.i || CRITTER_KINDS.indexOf(a.kind) - CRITTER_KINDS.indexOf(b.kind));
  const homes = [];
  for (const s of spots) {
    if (homes.length >= want.length) break;
    if (blocked.some((b) => Math.hypot(s.x - b.x, s.z - b.z) < (b.r || 0) + 1.6)) continue;
    if (homes.some((h) => Math.hypot(s.x - h.x, s.z - h.z) < SPREAD)) continue;
    homes.push({ x: s.x, z: s.z });
  }
  return homes.map((h, n) => ({ ...want[n], x: h.x, z: h.z }));
}

/** Where a reacting friend is, relative to its home, at progress p (0..1): { dx, dy, dz, sy (squash), spin }.
 * Calm motion (Reduce Motion): only a small grow-and-back, nothing moves. */
export function reactPose(kind, p, calm = false) {
  const q = Math.max(0, Math.min(1, p));
  const pulse = Math.sin(Math.PI * q);
  if (calm) return { dx: 0, dy: 0, dz: 0, sy: 1 + 0.12 * pulse, spin: 0 };
  if (kind === 'flower') {
    const b = Math.sin(q * Math.PI * 3) * (1 - q);
    return { dx: 0, dy: Math.max(0, b) * 0.35, dz: 0, sy: 1 + b * 0.3, spin: Math.sin(q * Math.PI * 4) * 0.4 * (1 - q) };
  }
  if (kind === 'bunny') {   // three hops around a little circle and back home
    const a = q * Math.PI * 2;
    const hop = Math.abs(Math.sin(q * Math.PI * 3));
    return { dx: Math.sin(a) * 1.2, dy: hop * 0.6, dz: (1 - Math.cos(a)) * 0.6, sy: 1 - 0.15 * (1 - hop), spin: a };
  }
  // butterfly: a loop up into the air and back
  const a = q * Math.PI * 2;
  return { dx: Math.sin(a) * 1.4, dy: pulse * 1.8, dz: Math.sin(a * 2) * 0.7, sy: 1, spin: a };
}

/** Should walking past make it react? (close, not already playing, rested since last time) */
export function nearReacts(dist, playing, sinceLast) {
  return dist < CRITTER_NEAR && !playing && sinceLast >= CRITTER_REST;
}
