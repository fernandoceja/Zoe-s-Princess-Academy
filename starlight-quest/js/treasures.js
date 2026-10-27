/* Zoe's Starlight Quest — daily treasures (E2)
 * Pure helpers (no three.js, no DOM) so node tests can run them.
 * Each local day, every land hides a few small finds at date-seeded spots:
 * the same spots all day, new spots tomorrow.
 */

export const TREASURE_KINDS = ['shell', 'gem', 'feather', 'star', 'ribbon'];
export const TREASURES_PER_LAND = 5;
export const TREASURE_LANDS = ['library', 'frostfall', 'meadow', 'village'];

// Seashell Cove (K4): its own treasure kind, hidden only while the cove is open (see worldmap.js isCoveOpen).
// TREASURE_KINDS / TREASURE_LANDS stay the original lists so the other lands' daily spots never change.
export const COVE_LAND = 'cove';
export const COVE_KIND = 'seaglass';
// Wayfinder Isle (K6): blossoms (lei flowers), hidden only while the isle is open (worldmap.js isIsleOpen).
export const ISLE_LAND = 'isle';
export const ISLE_KIND = 'blossom';
export const ALL_TREASURE_KINDS = [...TREASURE_KINDS, COVE_KIND, ISLE_KIND];
export const ALL_TREASURE_LANDS = [...TREASURE_LANDS, COVE_LAND, ISLE_LAND];
const LAND_OWN_KIND = { [COVE_LAND]: COVE_KIND, [ISLE_LAND]: ISLE_KIND };

/** Lands that hide treasures today: the four inner lands plus every open new land.
 * `open` is a list of open land ids (['cove'], ['cove', 'isle'], see worldmap.js openLandIds); `true` still means just the cove. */
export function treasureLandsFor(open) {
  const extra = open === true ? [COVE_LAND] : Array.isArray(open) ? open : [];
  return ALL_TREASURE_LANDS.filter((l) => TREASURE_LANDS.includes(l) || extra.includes(l));
}
/** Treasures hidden in total today: 20 with no new land, 25 with the cove, 30 with the cove and the isle. */
export function findsTotal(open) { return treasureLandsFor(open).length * TREASURES_PER_LAND; }
/** Ids found today that belong to a land that is open (a closed land never counts). */
export function findsToday(save, dayKey, open) {
  const lands = treasureLandsFor(open);
  return treasuresGotToday(save, dayKey).filter((id) => lands.some((l) => id.startsWith(l + '-'))).length;
}

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
    // (the cove and the isle draw the same random numbers, then swap in their own kind, so the spots stay date-seeded and stable)
    let x = 0, z = 0;
    for (let tries = 0; tries < 12; tries++) {
      const a = rand() * Math.PI * 2;
      const r = 2.5 + rand() * 6;
      x = Math.cos(a) * r; z = Math.sin(a) * r;
      if (spots.every((s) => Math.hypot(s.x - x, s.z - z) >= 2.2)) break;
    }
    spots.push({ id: `${landId}-${i}`, kind: LAND_OWN_KIND[landId] || kind, x: Math.round(x * 100) / 100, z: Math.round(z * 100) / 100 });
  }
  return spots;
}

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const ID_RE = /^[a-z]{1,12}-\d{1,2}$/;

/** Heal anything into { day, got: [ids], total: { kind: count } }. Never throws. */
export function sanitizeTreasures(raw) {
  const out = { day: '', got: [], total: {}, stars: [] };
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  if (typeof raw.day === 'string' && DAY_RE.test(raw.day)) out.day = raw.day;
  if (Array.isArray(raw.got)) {
    for (const id of raw.got) {
      if (typeof id === 'string' && ID_RE.test(id) && !out.got.includes(id)) out.got.push(id);
      if (out.got.length >= 40) break;
    }
  }
  if (raw.total && typeof raw.total === 'object' && !Array.isArray(raw.total)) {
    for (const k of ALL_TREASURE_KINDS) {
      const v = raw.total[k];
      if (typeof v === 'number' && Number.isFinite(v) && v > 0) out.total[k] = Math.min(Math.floor(v), 99999);
    }
  }
  if (Array.isArray(raw.stars)) {
    for (const id of raw.stars) if (ALL_TREASURE_LANDS.includes(id) && !out.stars.includes(id)) out.stars.push(id);
  }
  if (!out.day) { out.got = []; out.stars = []; } // finds with no known day cannot be trusted
  return out;
}

/** New day: forget today's finds, keep lifetime totals. Mutates and returns save.treasures. */
export function rolloverTreasures(save, dayKey) {
  const t = (save.treasures = sanitizeTreasures(save.treasures));
  if (t.day !== dayKey) { t.day = dayKey; t.got = []; t.stars = []; }
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
  if (typeof id !== 'string' || !ID_RE.test(id) || !ALL_TREASURE_KINDS.includes(kind)) return false;
  if (typeof dayKey !== 'string' || !DAY_RE.test(dayKey)) return false;
  const t = rolloverTreasures(save, dayKey);
  if (t.got.includes(id)) return false;
  t.got.push(id);
  t.total[kind] = (t.total[kind] || 0) + 1;
  return true;
}

/** Row star (E4): 1 star the first time all 5 treasures of one land are found on a day.
 * Returns true exactly once per land per day (and marks it); false otherwise. Caller adds the star. */
export function awardRowStar(save, landId, dayKey) {
  if (!ALL_TREASURE_LANDS.includes(landId)) return false;
  if (landTreasureCount(save, landId, dayKey) < TREASURES_PER_LAND) return false;
  const t = rolloverTreasures(save, dayKey);
  if (t.stars.includes(landId)) return false;
  t.stars.push(landId);
  return true;
}

/** Secret surprises (E4): one hidden spot per land. Each has a sticker. */
export const SECRETS = [
  { id: 'clock',     land: 'village',   npc: 'cinderella', label: 'Village clock', emoji: '🕰️' },
  { id: 'icetwins',  land: 'frostfall', npc: 'elsa',       label: 'Ice twins',     emoji: '❄️' },
  { id: 'bookstack', land: 'library',   npc: 'belle',      label: 'Book stack',    emoji: '📚' },
  { id: 'sunflower', land: 'meadow',    npc: 'rapunzel',   label: 'Super sunflower', emoji: '🌻' },
];
// Seashell Cove's secret (K4): tap three shells small to big. Ariel says a rhyme (her skill is rhyming).
// Kept apart from SECRETS so the four inner-land stickers never change; the cove one shows only while the cove is open.
export const COVE_SECRETS = [
  { id: 'shellrhyme', land: 'cove', npc: 'ariel', label: 'Rhyming shells', emoji: '🎶' },
];
// Wayfinder Isle's secret (K6): tap three stones in order of how many corners they have (circle 0, triangle 3, square 4).
// Moana says a shape fact (her skill is shapes). Shown only while the isle is open.
export const ISLE_SECRETS = [
  { id: 'shapestones', land: 'isle', npc: 'moana', label: 'Shape stones', emoji: '🔺' },
];
export const ALL_SECRETS = [...SECRETS, ...COVE_SECRETS, ...ISLE_SECRETS];
const SECRET_IDS = ALL_SECRETS.map((s) => s.id);

/** Heal anything into a list of known sticker ids (in SECRETS order). Never throws. */
export function sanitizeSecrets(raw) {
  if (!Array.isArray(raw)) return [];
  return SECRET_IDS.filter((id) => raw.includes(id));
}

/** Record a sticker. Returns true only the first time. */
export function foundSecret(save, id) {
  if (!SECRET_IDS.includes(id)) return false;
  save.secrets = sanitizeSecrets(save.secrets);
  if (save.secrets.includes(id)) return false;
  save.secrets.push(id);
  save.secrets = sanitizeSecrets(save.secrets);
  return true;
}

const SECRET_WINDOW_MS = 3000; // clock: 3 taps / ice twins: both crystals / cove shells: all three, within this long
const SECRET_COOL_MS = 3500;   // after a secret fires, ignore it for a moment (no speech spam)

/** Tap tracker. tap(part, nowMs) -> a secret id when that tap completes one, else null.
 * parts: 'clock', 'ice-a', 'ice-b', 'bookstack', 'sunflower', and the cove's 'shell-1' (small), 'shell-2', 'shell-3' (big). */
export function createSecretTracker() {
  let clock = [];
  let shells = []; // times of the in-order cove shell taps so far
  let shapes = []; // times of the in-order isle shape-stone taps so far
  const ice = { a: -Infinity, b: -Infinity };
  const cool = {};
  const fire = (id, now) => { if (now < (cool[id] ?? -Infinity) + SECRET_COOL_MS) return null; cool[id] = now; return id; };
  return {
    tap(part, now) {
      if (part === 'clock') {
        clock = clock.filter((t) => now - t <= SECRET_WINDOW_MS); clock.push(now);
        if (clock.length >= 3) { const r = fire('clock', now); if (r) clock = []; return r; }
        return null;
      }
      if (part === 'ice-a' || part === 'ice-b') {
        ice[part === 'ice-a' ? 'a' : 'b'] = now;
        if (now - ice.a <= SECRET_WINDOW_MS && now - ice.b <= SECRET_WINDOW_MS) {
          const r = fire('icetwins', now);
          if (r) { ice.a = ice.b = -Infinity; }
          return r;
        }
        return null;
      }
      if (part === 'bookstack' || part === 'sunflower') return fire(part, now);
      if (part === 'shell-1' || part === 'shell-2' || part === 'shell-3') {
        const n = Number(part.slice(-1));
        // Small to big, in order, all within the window. A wrong shell starts over (shell 1 starts a new try).
        if (shells.length && now - shells[0] > SECRET_WINDOW_MS) shells = [];
        if (n === shells.length + 1) shells.push(now); else shells = n === 1 ? [now] : [];
        if (shells.length === 3) { shells = []; return fire('shellrhyme', now); }
        return null;
      }
      if (part === 'shape-1' || part === 'shape-2' || part === 'shape-3') {
        const n = Number(part.slice(-1));
        // Fewest corners to most (circle, triangle, square), in order, all within the window. Same rules as the cove shells.
        if (shapes.length && now - shapes[0] > SECRET_WINDOW_MS) shapes = [];
        if (n === shapes.length + 1) shapes.push(now); else shapes = n === 1 ? [now] : [];
        if (shapes.length === 3) { shapes = []; return fire('shapestones', now); }
        return null;
      }
      return null;
    },
  };
}

/** Doubles line for Elsa: n + n make 2n, n from 1 to 5. */
export function doublesLine(rand = Math.random) {
  const n = 1 + Math.floor(rand() * 5);
  return { n, sum: n * 2, say: `${n} and ${n} make ${n * 2}!` };
}

/** Clock time for Cinderella: o'clock or half past. h is 1 to 12, m is 0 or 30. */
export function clockLine(rand = Math.random) {
  const h = 1 + Math.floor(rand() * 12);
  const m = rand() < 0.5 ? 0 : 30;
  return { h, m, say: m === 0 ? `It is ${h} o'clock!` : `It is half past ${h}!` };
}

const LETTER_SPEECH = { a: 'ay', b: 'bee', c: 'see', d: 'dee', e: 'ee', f: 'eff', g: 'jee', h: 'aitch', i: 'eye', j: 'jay',
  k: 'kay', l: 'ell', m: 'em', n: 'en', o: 'oh', p: 'pee', q: 'cue', r: 'are', s: 'ess', t: 'tee', u: 'you', v: 'vee',
  w: 'double you', x: 'ex', y: 'why', z: 'zee' };

/** Belle spells a word from the week pack: shown text "l - e - n - d" and spoken text with letter names. */
export function spellLine(words, rand = Math.random) {
  const list = (Array.isArray(words) ? words : []).filter((w) => typeof w === 'string' && /^[a-z]{1,12}$/.test(w));
  const word = list.length ? list[Math.floor(rand() * list.length)] : 'star';
  const letters = word.split('');
  return {
    word,
    show: `${letters.join(' - ')}... ${word}!`,
    say: `${letters.map((c) => LETTER_SPEECH[c]).join(', ')}... ${word}!`,
  };
}

// Rhyming pairs for Ariel: each pair ends the same after the first vowel (sh-ell / b-ell), starts differently.
export const RHYME_PAIRS = [
  ['shell', 'bell'], ['sand', 'hand'], ['wave', 'cave'], ['fish', 'dish'], ['tide', 'wide'],
  ['moon', 'spoon'], ['boat', 'coat'], ['star', 'jar'],
];
/** Ariel's rhyme for the shell secret: "Shell and bell rhyme!" */
export function rhymeLine(rand = Math.random) {
  const [a, b] = RHYME_PAIRS[Math.floor(rand() * RHYME_PAIRS.length) % RHYME_PAIRS.length];
  return { a, b, say: `${a[0].toUpperCase()}${a.slice(1)} and ${b} rhyme!` };
}

// Shape facts for Moana. Flat shapes: the number of sides always equals the number of corners.
export const SHAPE_SIDES = { triangle: 3, square: 4, rectangle: 4, pentagon: 5, hexagon: 6 };
const COUNT_WORD = { 3: 'three', 4: 'four', 5: 'five', 6: 'six' };
/** The shape fact Moana says for the stones secret: "A triangle has three sides and three corners!" */
export function shapeLine(rand = Math.random) {
  const names = Object.keys(SHAPE_SIDES);
  const extra = [
    { shape: 'circle', say: 'A circle has no corners and no straight sides. It is round!' },
    { shape: 'cube', say: 'A cube has six flat faces and eight corners!' },
    { shape: 'sphere', say: 'A ball is a sphere. It is round and has no corners!' },
  ];
  const i = Math.floor(rand() * (names.length + extra.length)) % (names.length + extra.length);
  if (i < names.length) {
    const shape = names[i], n = SHAPE_SIDES[shape];
    return { shape, sides: n, corners: n, say: `A ${shape} has ${COUNT_WORD[n]} sides and ${COUNT_WORD[n]} corners!` };
  }
  return extra[i - names.length];
}

/** Rapunzel's short science lines (count by 2s, or a plant fact). */
export function plantLine(rand = Math.random) {
  const facts = [
    'Sunflowers love to face the sun!',
    'A sunflower seed can grow into a new sunflower!',
    'Plants drink water with their roots!',
    'Plants make food from sunlight. That is science!',
  ];
  const i = Math.floor(rand() * (facts.length + 2));
  if (i < facts.length) return { say: facts[i] };
  const top = i === facts.length ? 10 : 12;
  const nums = []; for (let k = 2; k <= top; k += 2) nums.push(k);
  return { say: `Let us count the petals by twos: ${nums.join(', ')}!`, nums };
}

/** Kid-facing names + emoji for the Treasure Book (original emoji art). */
export const TREASURE_INFO = {
  shell:   { label: 'Shells',   emoji: '🐚' },
  gem:     { label: 'Gems',     emoji: '💎' },
  feather: { label: 'Feathers', emoji: '🪶' },
  star:    { label: 'Stars',    emoji: '⭐' },
  ribbon:  { label: 'Ribbons',  emoji: '🎀' },
  seaglass: { label: 'Sea glass', emoji: '💠' },
  blossom: { label: 'Blossoms', emoji: '🌺' },
};
export const TREASURE_LAND_NAMES = {
  library: 'Whispering Library', frostfall: 'Frostfall Peaks',
  meadow: 'Sunflower Meadows', village: 'Glass Slipper Village', cove: 'Seashell Cove', isle: 'Wayfinder Isle',
};

/** Everything the Treasure Book page shows, from plain save data. Never throws.
 * opts.coveOpen / opts.isleOpen: add Seashell Cove / Wayfinder Isle (its tile, its row and its sticker). A closed land stays
 * hidden unless the save already holds something from it (so a preview's finds are never lost from view). */
export function treasureBookModel(save, dayKey, opts = {}) {
  const coveOpen = !!(opts && opts.coveOpen), isleOpen = !!(opts && opts.isleOpen);
  const t = sanitizeTreasures(save && save.treasures);
  const have = sanitizeSecrets(save && save.secrets);
  const kindIds = ALL_TREASURE_KINDS.filter((k) => TREASURE_KINDS.includes(k)
    || (k === COVE_KIND && (coveOpen || t.total[COVE_KIND])) || (k === ISLE_KIND && (isleOpen || t.total[ISLE_KIND])));
  const kinds = kindIds.map((kind) => {
    const count = t.total[kind] || 0;
    return { kind, label: TREASURE_INFO[kind].label, emoji: TREASURE_INFO[kind].emoji, count, found: count > 0 };
  });
  const lands = treasureLandsFor([...(coveOpen ? [COVE_LAND] : []), ...(isleOpen ? [ISLE_LAND] : [])]).map((id) => ({
    id, name: TREASURE_LAND_NAMES[id], count: landTreasureCount({ treasures: t }, id, dayKey), of: TREASURES_PER_LAND,
  }));
  for (const l of lands) l.star = t.day === dayKey && t.stars.includes(l.id);
  const secretDefs = ALL_SECRETS.filter((s) => SECRETS.includes(s)
    || (COVE_SECRETS.includes(s) && (coveOpen || have.includes(s.id))) || (ISLE_SECRETS.includes(s) && (isleOpen || have.includes(s.id))));
  const stickers = secretDefs.map((s) => ({ id: s.id, label: s.label, emoji: s.emoji, found: have.includes(s.id) }));
  const total = kinds.reduce((n, k) => n + k.count, 0);
  return { kinds, lands, stickers, total };
}
