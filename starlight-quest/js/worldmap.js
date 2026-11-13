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
export const BUILT_SLOTS = { sse: 'ariel', ssw: 'moana', nne: 'jasmine', ese: 'anna', wsw: 'tiana', ene: 'aurora' };   // K5: Seashell Cove, K7: Wayfinder Isle, K9: Moonlit Palace Garden, K11: Sunny Fjord Harbor, K13: Firefly Bayou (their princesses' quests exist)

export function builtSlotIds() {
  return NEW_LAND_SLOTS.map((s) => s.slot).filter((id) => Object.prototype.hasOwnProperty.call(BUILT_SLOTS, id));
}

// Preview flags (K4+): a land can be drawn BEFORE its princess's quests exist, only when the owner asks for it
// with  ?preview=isle  (or  ?preview=all  /  ?preview=cove,isle). In normal play (no flag) nothing changes.
// previewable land flag -> slot id. Add a line here when another land gets built ahead of its quests.
// (cove is built for real since K5, the isle since K7, the garden since K9, the harbor since K11 and the bayou since K13, so those five flags are harmless now.
// glen (K14) is preview-only until Aurora's quests land: it is the LAST closed slot, so ?preview=all now opens all six kingdoms. A preview never counts as
// "built": shouldRunFinale below is fed builtSlotIds(), not the open slots, so no preview flag can trigger the finale.)
export const PREVIEW_LANDS = { cove: 'sse', isle: 'ssw', garden: 'nne', harbor: 'ese', bayou: 'wsw', glen: 'ene' };

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

// Wayfinder Isle (K6) sits at the 'ssw' slot (the slot planned for Moana). Built for real since K7 ('ssw' is in BUILT_SLOTS and
// Moana is in NPC_ORDER, so she stands on her pad); ?preview=isle stays harmless.
export const ISLE = { slot: 'ssw', land: 'isle', princess: 'moana', discR: LAND_DISC_R, padDist: 6.5 };
export const isIsleOpen = (search) => isSlotOpen(ISLE.slot, search);
export function isleGeometry() { return slotLandGeometry(ISLE); }

// Moonlit Palace Garden (K8) sits at the 'nne' slot (the slot planned for Jasmine), north-north-east, past the Library. Drawn only
// when 'nne' is open: in BUILT_SLOTS (K9, with Jasmine's quests) or ?preview=garden (or ?preview=all). Built for real since K9: Jasmine is in NPC_ORDER and stands on her pad.
export const GARDEN = { slot: 'nne', land: 'garden', princess: 'jasmine', discR: LAND_DISC_R, padDist: 6.5 };
export const isGardenOpen = (search) => isSlotOpen(GARDEN.slot, search);
export function gardenGeometry() { return slotLandGeometry(GARDEN); }

// Sunny Fjord Harbor (K10) sits at the 'ese' slot (the slot reserved for Anna), right beside Elsa's Frostfall Peaks. Drawn only when 'ese' is
// open: in BUILT_SLOTS (K11, with Anna's quests) or ?preview=harbor (or ?preview=all). Built for real since K11: Anna is in NPC_ORDER and stands on her pad.
export const HARBOR = { slot: 'ese', land: 'harbor', princess: 'anna', discR: LAND_DISC_R, padDist: 6.5 };
export const isHarborOpen = (search) => isSlotOpen(HARBOR.slot, search);
export function harborGeometry() { return slotLandGeometry(HARBOR); }

// Firefly Bayou (K12) sits at the 'wsw' slot (the slot planned for Tiana), west-south-west, near Glass Slipper Village. Drawn only when 'wsw' is
// open: in BUILT_SLOTS (K13, with Tiana's quests) or ?preview=bayou (or ?preview=all). Built for real since K13: Tiana is in NPC_ORDER and stands on her pad.
export const BAYOU = { slot: 'wsw', land: 'bayou', princess: 'tiana', discR: LAND_DISC_R, padDist: 6.5 };
export const isBayouOpen = (search) => isSlotOpen(BAYOU.slot, search);
export function bayouGeometry() { return slotLandGeometry(BAYOU); }

// Rosewood Glen (K14) sits at the 'ene' slot (the slot planned for Aurora), east-north-east, beside Frostfall Peaks on its north side. Drawn only when 'ene' is
// open: in BUILT_SLOTS (K15, with Aurora's quests) or ?preview=glen (or ?preview=all). Aurora is NOT spawned until K15 (not in NPC_ORDER yet).
export const GLEN = { slot: 'ene', land: 'glen', princess: 'aurora', discR: LAND_DISC_R, padDist: 6.5 };
export const isGlenOpen = (search) => isSlotOpen(GLEN.slot, search);
export function glenGeometry() { return slotLandGeometry(GLEN); }

/** Ids of the optional (new-kingdom) lands that are open right now, e.g. ['cove'], ['cove', 'isle', 'garden'], all five built lands, and the glen when previewed. */
export function openLandIds(search) {
  const out = [];
  if (isCoveOpen(search)) out.push(COVE.land);
  if (isIsleOpen(search)) out.push(ISLE.land);
  if (isGardenOpen(search)) out.push(GARDEN.land);
  if (isHarborOpen(search)) out.push(HARBOR.land);
  if (isBayouOpen(search)) out.push(BAYOU.land);
  if (isGlenOpen(search)) out.push(GLEN.land);
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

/** Built slots the player has not been told about yet (K7): the card shows again when a new kingdom opens.
 * `seenSlots` is Save.data.seenKingdoms (a list of slot ids). Never throws. */
export function unseenKingdomSlots(builtSlots, seenSlots) {
  const seen = new Set(Array.isArray(seenSlots) ? seenSlots : []);
  return (Array.isArray(builtSlots) ? builtSlots : []).filter((s) => !seen.has(s));
}

// Starlight finale gate. The crown finale plays only when every princess in the play list is restored AND
// every new-kingdom slot has been built, so finishing one new land (e.g. Ariel's) just gets that land's own
// celebration. Called from main.js after a quest completes, never on load. K16 builds the 10-land finale.
export function shouldRunFinale(doneIds, orderIds, builtCount) {
  const done = Array.isArray(doneIds) ? doneIds : [];
  return builtCount >= NEW_LAND_SLOTS.length && orderIds.length > 0 && orderIds.every((id) => done.includes(id));
}

// ============================================================================
// B2: kingdom map + firefly trail. Pure functions: where every land is, and a walking route that leads Zoe there.
// ============================================================================
export const INNER_PAD_DIST = 18.5;   // an inner land's princess stands this far from the hub, on the land's angle (world.js uses this too)
export const CASTLE_R = 5.2;          // the castle's collider radius (world.js adds it at CASTLE_POS)

// Princess -> land id (the same pairs as world.js NPC_DEFS and treasures.js).
export const NPC_LAND = { belle: 'library', elsa: 'frostfall', rapunzel: 'meadow', cinderella: 'village', ariel: 'cove', moana: 'isle', jasmine: 'garden', anna: 'harbor', tiana: 'bayou', aurora: 'glen' };

const OUTER_GEOMETRY = { cove: coveGeometry, isle: isleGeometry, garden: gardenGeometry, harbor: harborGeometry, bayou: bayouGeometry, glen: glenGeometry };
const OUTER_SLOT = { cove: COVE.slot, isle: ISLE.slot, garden: GARDEN.slot, harbor: HARBOR.slot, bayou: BAYOU.slot, glen: GLEN.slot };

/** All ten lands for the map and the trail: [{ npc, land, center: {x,z}, pad: {x,z}, open }]. Inner lands are always open;
 * the six outer ones are open when built (or previewed). */
export function kingdomLands(search) {
  const open = new Set(openLandIds(search));
  return Object.entries(NPC_LAND).map(([npc, land]) => {
    if (Object.prototype.hasOwnProperty.call(INNER_LAND_ANGLES, land)) {
      const a = INNER_LAND_ANGLES[land];
      return { npc, land, center: { x: Math.cos(a) * LAND_DIST, z: Math.sin(a) * LAND_DIST }, pad: { x: Math.cos(a) * INNER_PAD_DIST, z: Math.sin(a) * INNER_PAD_DIST }, open: true };
    }
    const g = OUTER_GEOMETRY[land]();
    return { npc, land, center: { x: g.center.x, z: g.center.z }, pad: { x: g.pad.x, z: g.pad.z }, open: open.has(land) };
  });
}

// --- geometry helpers ---
const _d = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
function closestOnSegment(p, a, b) {
  const dx = b.x - a.x, dz = b.z - a.z, len2 = dx * dx + dz * dz;
  const t = len2 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / len2)) : 0;
  return { x: a.x + dx * t, z: a.z + dz * t, t };
}

/** The walkable paths as a graph: hub, each inner land's pad (straight along its angle), and for every outer slot the trunk,
 * the branch and the princess's pad on the branch. Built from pathSegments() so it cannot drift from the 3D paths. */
export function walkGraph(search) {
  const nodes = [{ x: 0, z: 0 }];           // 0 = hub
  const edges = [];
  const at = (p) => {                       // reuse a node already there
    const i = nodes.findIndex((n) => _d(n, p) < 0.01);
    if (i >= 0) return i;
    nodes.push({ x: p.x, z: p.z });
    return nodes.length - 1;
  };
  const link = (a, b) => { if (a !== b) edges.push([a, b]); };
  for (const l of kingdomLands(search)) {
    if (!l.open) continue;
    if (Object.prototype.hasOwnProperty.call(INNER_LAND_ANGLES, l.land)) link(0, at(l.pad));
  }
  for (const sg of pathSegments()) {
    if (sg.kind === 'trunk') link(0, at(sg.from)), link(at(sg.from), at(sg.to));
  }
  for (const l of kingdomLands(search)) {
    if (!l.open || Object.prototype.hasOwnProperty.call(INNER_LAND_ANGLES, l.land)) continue;
    const sg = pathSegments().find((s) => s.kind === 'branch' && s.slot === OUTER_SLOT[l.land]);
    const from = at(sg.from);
    link(from, at(l.pad));                  // the pad sits on the branch, near the land's entrance: a spur, so a route never runs through the princess
    link(from, at(sg.to));                  // the branch runs on to the land's centre (and bends around any princess standing on it)
  }
  return { nodes, edges };
}

/** Push route points out of round obstacles ({x, z, r}): any segment closer than r + margin gets a waypoint beside the obstacle. */
export function avoidColliders(pts, colliders, margin = 0.8) {
  let out = pts.map((p) => ({ x: p.x, z: p.z }));
  for (let pass = 0; pass < 4; pass++) {
    let changed = false;
    const next = [out[0]];
    for (let i = 1; i < out.length; i++) {
      const a = out[i - 1], b = out[i];
      let worst = null;
      for (const c of colliders || []) {
        const need = c.r + margin;
        if (_d(a, c) < need || _d(b, c) < need) continue;   // an end of this leg is inside the obstacle (a pad, or where she stands): it cannot be avoided
        const near = closestOnSegment(c, a, b);
        const d = Math.hypot(near.x - c.x, near.z - c.z);
        if (d < need - 1e-6 && (!worst || need - d > worst.gap)) worst = { c, near, gap: need - d, need };
      }
      if (worst) {
        const { c, near } = worst;
        let dx = near.x - c.x, dz = near.z - c.z, len = Math.hypot(dx, dz);
        if (len < 1e-6) { const sx = b.x - a.x, sz = b.z - a.z, sl = Math.hypot(sx, sz) || 1; dx = -sz / sl; dz = sx / sl; len = 1; }   // dead centre: step sideways
        const r = c.r + margin + 0.7;
        next.push({ x: c.x + (dx / len) * r, z: c.z + (dz / len) * r });
        changed = true;
      }
      next.push(b);
    }
    out = next;
    if (!changed) break;
  }
  return out.map((p) => {                    // stay inside the invisible wall
    const r = Math.hypot(p.x, p.z), max = WORLD_RADIUS - 1;
    return r > max ? { x: (p.x / r) * max, z: (p.z / r) * max } : p;
  });
}

const routeLen = (r) => r.reduce((t, p, i) => (i ? t + _d(p, r[i - 1]) : 0), 0);
const dedupeRoute = (r) => r.filter((p, i) => i === 0 || _d(p, r[i - 1]) > 0.05);   // drop zero-length hops (the entry point is often where she stands)

/** The route from `start` to the princess pad of `npcId`: straight if she is already inside that land, otherwise onto the nearest path,
 * along the paths (shortest way) to the pad, with the obstacles stepped around. Returns [{x, z}, ...] (start first, pad last), or [] for an unknown or closed land. */
export function trailRoute(start, npcId, colliders = [], search) {
  const land = kingdomLands(search).find((l) => l.npc === npcId);
  if (!land || !land.open || !start || !Number.isFinite(start.x) || !Number.isFinite(start.z)) return [];
  const s = { x: start.x, z: start.z }, pad = land.pad;
  if (_d(s, land.center) <= LAND_DISC_R) return avoidColliders([s, pad], colliders);
  const { nodes, edges } = walkGraph(search);
  // Entry: the nearest point on any path.
  let best = null;
  edges.forEach(([a, b], i) => {
    const q = closestOnSegment(s, nodes[a], nodes[b]);
    const d = _d(s, q);
    if (!best || d < best.d) best = { d, i, q };
  });
  const [ea, eb] = edges[best.i];
  const g = nodes.map(() => []);            // adjacency with the entry point inserted on its edge
  const add = (a, b) => { const w = _d(allNodes[a], allNodes[b]); g[a].push([b, w]); g[b].push([a, w]); };
  const allNodes = [...nodes, { x: best.q.x, z: best.q.z }];
  g.push([]);
  const ENTRY = nodes.length;
  edges.forEach(([a, b], i) => { if (i !== best.i) add(a, b); });
  add(ea, ENTRY); add(ENTRY, eb);
  const goal = nodes.findIndex((n) => _d(n, pad) < 0.01);
  if (goal < 0) return avoidColliders([s, pad], colliders);
  const dist = allNodes.map(() => Infinity), prev = allNodes.map(() => -1), done = allNodes.map(() => false);
  dist[ENTRY] = 0;
  for (;;) {                                // Dijkstra on at most ~20 nodes
    let u = -1;
    for (let i = 0; i < dist.length; i++) if (!done[i] && dist[i] < Infinity && (u < 0 || dist[i] < dist[u])) u = i;
    if (u < 0 || u === goal) break;
    done[u] = true;
    for (const [v, w] of g[u]) if (dist[u] + w < dist[v]) { dist[v] = dist[u] + w; prev[v] = u; }
  }
  if (dist[goal] === Infinity) return avoidColliders([s, pad], colliders);
  const chain = [];
  for (let n = goal; n >= 0; n = prev[n]) chain.push(allNodes[n]);
  chain.reverse();
  const viaPaths = dedupeRoute(avoidColliders([s, ...chain], colliders));
  // Walking the paths is nicest, but if that is a long detour (she is far out on the grass) lead her straight across instead.
  const straight = dedupeRoute(avoidColliders([s, pad], colliders));
  return routeLen(viaPaths) <= 1.6 * routeLen(straight) + 6 ? viaPaths : straight;
}

/** Dots along a route: [{x, z, arc}] every `spacing` units (the first one is one step in), at most `max`. */
export function sampleTrail(route, spacing = 1.6, max = 200) {
  const out = [];
  if (!Array.isArray(route) || route.length < 2 || !(spacing > 0)) return out;
  let arc = 0, next = spacing;
  for (let i = 1; i < route.length && out.length < max; i++) {
    const a = route[i - 1], b = route[i], len = _d(a, b);
    while (next <= arc + len && out.length < max) {
      const t = len ? (next - arc) / len : 0;
      out.push({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t, arc: next });
      next += spacing;
    }
    arc += len;
  }
  return out;
}

/** How far along the route a point is: { arc, dist } = distance from the start to the nearest point on the route, and how far off it she is. */
export function progressAlong(route, x, z) {
  let best = { arc: 0, dist: Infinity }, acc = 0;
  for (let i = 1; i < (route || []).length; i++) {
    const a = route[i - 1], b = route[i], len = _d(a, b);
    const q = closestOnSegment({ x, z }, a, b), d = Math.hypot(x - q.x, z - q.z);
    if (d < best.dist) best = { arc: acc + len * q.t, dist: d };
    acc += len;
  }
  return best;
}

/** Has she reached the princess's pad? */
export function trailArrived(x, z, pad, r = 3.5) {
  return !!pad && Math.hypot(x - pad.x, z - pad.z) < r;
}
