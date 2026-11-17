/* Zoe's Starlight Quest — gems on the paths between lands (Nov 17, item 3).
 * Three gems on every path between two places (hub to an inner princess, hub trunk to a fork, fork to an outer princess):
 * 39 a day with all ten lands open. New spots every day (date-seeded, like the daily treasures), the same spots all day.
 * They count toward the 💎 counter she already has (no new currency): the counter adds land treasures and path gems
 * but never shows more than its total (50 with all lands), and each gem adds one to the Treasure Book's Gems.
 * Saved with progress in Save.data.pathGems = { day, got: [ids] } (js/save.js sanitizePathGems).
 * Pure: no three.js, no DOM. src/fx/navfx.js draws them; tests/pathgems_check.mjs checks them.
 */
import { walkGraph, kingdomLands, seededRng, rolloverTreasures, sanitizePathGems, PLAZA_R } from '../engine-core.js';

export const GEMS_PER_PATH = 3;
export const GEM_PICKUP_R = 1.15;      // walking this close picks one up (the daily treasures use 1.2)
const PAD_CLEAR = 4;                   // no gem this close to a princess (her talk ring is 3.5)
const EDGE_CLEAR = 2;                  // nor this close to where a path begins
const JITTER_SIDE = 0.7, JITTER_ALONG = 0.6;

const _d = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

/** The paths that run between two places, as [{ id, a, b }] (a nearer the hub). The short stubs inside the plaza and the
 * branch that runs on into a land's centre (beside the princess's spur) are left out. */
export function gemPaths(search) {
  const { nodes, edges } = walkGraph(search);
  const pads = kingdomLands(search).filter((l) => l.open).map((l) => l.pad);
  const isPad = (n) => pads.some((p) => _d(p, n) < 0.01);
  const out = [];
  edges.forEach(([ia, ib], i) => {
    const a = nodes[ia], b = nodes[ib];
    const len = _d(a, b);
    if (_d(b, { x: 0, z: 0 }) <= PLAZA_R + 1) return;                       // a stub inside the plaza
    const fromHub = ia === 0, toPad = isPad(b);
    if (!fromHub && !toPad && _d(a, { x: 0, z: 0 }) > PLAZA_R + 1) return;   // fork -> land centre (runs beside the spur)
    if (len < 8) return;
    out.push({ id: i, a, b });
  });
  return out;
}

/** Today's gem spots: [{ id, x, z }]. Ids look like "p12-0" (path id, gem index). */
export function pathGemSpots(dayKey, search, rngFactory = seededRng) {
  const spots = [];
  const pads = kingdomLands(search).filter((l) => l.open).map((l) => l.pad);
  for (const p of gemPaths(search)) {
    const rand = rngFactory(`${dayKey}|path|${p.id}`);
    const len = _d(p.a, p.b), ux = (p.b.x - p.a.x) / len, uz = (p.b.z - p.a.z) / len;
    const start = Math.max(EDGE_CLEAR, p.a.x === 0 && p.a.z === 0 ? PLAZA_R + 0.5 : EDGE_CLEAR);
    const end = len - (pads.some((q) => _d(q, p.b) < 0.01) ? PAD_CLEAR : EDGE_CLEAR);
    for (let i = 0; i < GEMS_PER_PATH; i++) {
      const gap = (end - start) / GEMS_PER_PATH;
      const along = start + (i + 0.5) * gap + (rand() - 0.5) * 2 * Math.min(JITTER_ALONG, gap * 0.15);
      const side = (rand() - 0.5) * 2 * JITTER_SIDE;
      spots.push({ id: `p${p.id}-${i}`, x: p.a.x + ux * along - uz * side, z: p.a.z + uz * along + ux * side });
    }
  }
  return spots;
}

/** Ids picked up today (empty when the saved day is another day). */
export function pathGemsGot(save, dayKey) {
  const g = sanitizePathGems(save && save.pathGems);
  return g.day === dayKey ? g.got : [];
}

/** Record a pickup. Returns true when it was new. Also adds one to the Treasure Book's Gems (lifetime). */
export function collectPathGem(save, id, dayKey) {
  if (!save || typeof id !== 'string' || !/^p\d{1,2}-\d$/.test(id)) return false;
  const g = (save.pathGems = sanitizePathGems(save.pathGems));
  if (g.day !== dayKey) { g.day = dayKey; g.got = []; }
  if (g.got.includes(id)) return false;
  g.got.push(id);
  const t = rolloverTreasures(save, dayKey);
  t.total.gem = (t.total.gem || 0) + 1;
  return true;
}

/** What the 💎 counter shows: land treasures plus path gems found today, never more than its total. */
export function counterFinds(landFinds, pathFinds, total) {
  return Math.max(0, Math.min(total, (landFinds || 0) + (pathFinds || 0)));
}

export const gemLine = (n, total) => `You found a gem! ${n} of ${total} today`;
