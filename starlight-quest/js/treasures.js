/* Zoe's Starlight Quest — daily treasures (E2)
 * Pure helpers (no three.js, no DOM) so node tests can run them.
 * Each local day, every land hides a few small finds at date-seeded spots:
 * the same spots all day, new spots tomorrow.
 */

export const TREASURE_KINDS = ['shell', 'gem', 'feather', 'star', 'ribbon'];
export const TREASURES_PER_LAND = 5;
export const TREASURE_LANDS = ['library', 'frostfall', 'meadow', 'village'];

/** Local date as YYYY-MM-DD. */
export function todayKey(date = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

function hashString(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/** Default rng factory: seed string -> () => number in [0, 1). */
export function seededRng(seed) {
  let a = hashString(String(seed));
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** `count` treasures for one land on one day, as land-local offsets (x, z) from the land center.
 * The world adds the land center and nudges each spot to clear ground. */
export function treasureSpots(dayKey, landId, count = TREASURES_PER_LAND, rngFactory = seededRng) {
  const rand = rngFactory(`${dayKey}|${landId}`);
  const spots = [];
  for (let i = 0; i < count; i++) {
    const kind = TREASURE_KINDS[Math.floor(rand() * TREASURE_KINDS.length)];
    let x = 0, z = 0;
    for (let tries = 0; tries < 12; tries++) {
      const a = rand() * Math.PI * 2;
      const r = 2.5 + rand() * 6;
      x = Math.cos(a) * r; z = Math.sin(a) * r;
      if (spots.every((s) => Math.hypot(s.x - x, s.z - z) >= 2.2)) break;
    }
    spots.push({ id: `${landId}-${i}`, kind, x: Math.round(x * 100) / 100, z: Math.round(z * 100) / 100 });
  }
  return spots;
}

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const ID_RE = /^[a-z]{1,12}-\d{1,2}$/;

/** Heal anything into { day, got: [ids], total: { kind: count } }. Never throws. */
export function sanitizeTreasures(raw) {
  const out = { day: '', got: [], total: {} };
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  if (typeof raw.day === 'string' && DAY_RE.test(raw.day)) out.day = raw.day;
  if (Array.isArray(raw.got)) {
    for (const id of raw.got) {
      if (typeof id === 'string' && ID_RE.test(id) && !out.got.includes(id)) out.got.push(id);
      if (out.got.length >= 40) break;
    }
  }
  if (raw.total && typeof raw.total === 'object' && !Array.isArray(raw.total)) {
    for (const k of TREASURE_KINDS) {
      const v = raw.total[k];
      if (typeof v === 'number' && Number.isFinite(v) && v > 0) out.total[k] = Math.min(Math.floor(v), 99999);
    }
  }
  if (!out.day) out.got = []; // finds with no known day cannot be trusted
  return out;
}

/** New day: forget today's finds, keep lifetime totals. Mutates and returns save.treasures. */
export function rolloverTreasures(save, dayKey) {
  const t = (save.treasures = sanitizeTreasures(save.treasures));
  if (t.day !== dayKey) { t.day = dayKey; t.got = []; }
  return t;
}

/** Ids collected today (empty when the stored day is not today). */
export function treasuresGotToday(save, dayKey) {
  const t = sanitizeTreasures(save.treasures);
  return t.day === dayKey ? t.got : [];
}

/** How many of one land's treasures are collected today. */
export function landTreasureCount(save, landId, dayKey) {
  return treasuresGotToday(save, dayKey).filter((id) => id.startsWith(landId + '-')).length;
}

/** Record a find. Returns true when it was new, false for repeats or bad input. */
export function collectTreasure(save, id, kind, dayKey) {
  if (typeof id !== 'string' || !ID_RE.test(id) || !TREASURE_KINDS.includes(kind)) return false;
  if (typeof dayKey !== 'string' || !DAY_RE.test(dayKey)) return false;
  const t = rolloverTreasures(save, dayKey);
  if (t.got.includes(id)) return false;
  t.got.push(id);
  t.total[kind] = (t.total[kind] || 0) + 1;
  return true;
}
