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
    for (const k of TREASURE_KINDS) {
      const v = raw.total[k];
      if (typeof v === 'number' && Number.isFinite(v) && v > 0) out.total[k] = Math.min(Math.floor(v), 99999);
    }
  }
  if (Array.isArray(raw.stars)) {
    for (const id of raw.stars) if (TREASURE_LANDS.includes(id) && !out.stars.includes(id)) out.stars.push(id);
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
  if (typeof id !== 'string' || !ID_RE.test(id) || !TREASURE_KINDS.includes(kind)) return false;
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
  if (!TREASURE_LANDS.includes(landId)) return false;
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
const SECRET_IDS = SECRETS.map((s) => s.id);

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

const SECRET_WINDOW_MS = 3000; // clock: 3 taps / ice twins: both crystals, within this long
const SECRET_COOL_MS = 3500;   // after a secret fires, ignore it for a moment (no speech spam)

/** Tap tracker. tap(part, nowMs) -> a secret id when that tap completes one, else null.
 * parts: 'clock', 'ice-a', 'ice-b', 'bookstack', 'sunflower'. */
export function createSecretTracker() {
  let clock = [];
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
};
export const TREASURE_LAND_NAMES = {
  library: 'Whispering Library', frostfall: 'Frostfall Peaks',
  meadow: 'Sunflower Meadows', village: 'Glass Slipper Village',
};

/** Everything the Treasure Book page shows, from plain save data. Never throws. */
export function treasureBookModel(save, dayKey) {
  const t = sanitizeTreasures(save && save.treasures);
  const kinds = TREASURE_KINDS.map((kind) => {
    const count = t.total[kind] || 0;
    return { kind, label: TREASURE_INFO[kind].label, emoji: TREASURE_INFO[kind].emoji, count, found: count > 0 };
  });
  const lands = TREASURE_LANDS.map((id) => ({
    id, name: TREASURE_LAND_NAMES[id], count: landTreasureCount({ treasures: t }, id, dayKey), of: TREASURES_PER_LAND,
  }));
  for (const l of lands) l.star = t.day === dayKey && t.stars.includes(l.id);
  const have = sanitizeSecrets(save && save.secrets);
  const stickers = SECRETS.map((s) => ({ id: s.id, label: s.label, emoji: s.emoji, found: have.includes(s.id) }));
  const total = kinds.reduce((n, k) => n + k.count, 0);
  return { kinds, lands, stickers, total };
}
