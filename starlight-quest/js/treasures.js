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
// Moonlit Palace Garden (K8): moonstones (pale glowing pebbles), hidden only while the garden is open (worldmap.js isGardenOpen).
export const GARDEN_LAND = 'garden';
export const GARDEN_KIND = 'moonstone';
// Sunny Fjord Harbor (K10): little anchors, hidden only while the harbor is open (worldmap.js isHarborOpen).
export const HARBOR_LAND = 'harbor';
export const HARBOR_KIND = 'anchor';
// Firefly Bayou (K12): little lilies, hidden only while the bayou is open (worldmap.js isBayouOpen).
export const BAYOU_LAND = 'bayou';
export const BAYOU_KIND = 'lily';
// Rosewood Glen (K14): little roses, hidden only while the glen is open (worldmap.js isGlenOpen).
export const GLEN_LAND = 'glen';
export const GLEN_KIND = 'rose';
export const ALL_TREASURE_KINDS = [...TREASURE_KINDS, COVE_KIND, ISLE_KIND, GARDEN_KIND, HARBOR_KIND, BAYOU_KIND, GLEN_KIND];
export const ALL_TREASURE_LANDS = [...TREASURE_LANDS, COVE_LAND, ISLE_LAND, GARDEN_LAND, HARBOR_LAND, BAYOU_LAND, GLEN_LAND];
const LAND_OWN_KIND = { [COVE_LAND]: COVE_KIND, [ISLE_LAND]: ISLE_KIND, [GARDEN_LAND]: GARDEN_KIND, [HARBOR_LAND]: HARBOR_KIND, [BAYOU_LAND]: BAYOU_KIND, [GLEN_LAND]: GLEN_KIND };

/** Lands that hide treasures today: the four inner lands plus every open new land.
 * `open` is a list of open land ids (['cove'], ['cove', 'isle'], see worldmap.js openLandIds); `true` still means just the cove. */
export function treasureLandsFor(open) {
  const extra = open === true ? [COVE_LAND] : Array.isArray(open) ? open : [];
  return ALL_TREASURE_LANDS.filter((l) => TREASURE_LANDS.includes(l) || extra.includes(l));
}
/** Treasures hidden in total today: 20 with no new land, 25 with the cove, 30 with the cove and the isle, 35 with the garden too, 40 with the harbor, 45 with the bayou, 50 with the glen. */
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
 * The world adds the land center and nudges each spot to clear ground. `avoid` (optional) rejects land-local spots, e.g. the harbor's water. */
export function treasureSpots(dayKey, landId, count = TREASURES_PER_LAND, rngFactory = seededRng, avoid = null) {
  const rand = rngFactory(`${dayKey}|${landId}`);
  const spots = [];
  for (let i = 0; i < count; i++) {
    const kind = TREASURE_KINDS[Math.floor(rand() * TREASURE_KINDS.length)];
    // (the cove, the isle, the garden, the harbor, the bayou and the glen draw the same random numbers, then swap in their own kind, so the spots stay date-seeded and stable)
    let x = 0, z = 0;
    for (let tries = 0; tries < 12; tries++) {
      const a = rand() * Math.PI * 2;
      const r = 2.5 + rand() * 6;
      x = Math.cos(a) * r; z = Math.sin(a) * r;
      if (spots.every((s) => Math.hypot(s.x - x, s.z - z) >= 2.2) && !(avoid && avoid(x, z))) break;   // avoid(x, z): optional "not here" test (the harbor, the bayou and the glen pass their water)
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
      if (out.got.length >= 50) break;   // up to 10 open lands x 5 finds a day
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
// Moonlit Palace Garden's secret (K8): tap three story lanterns in order (seed, sprout, flower: first, next, last).
// Jasmine says a story-order line (her skill is sequencing). Shown only while the garden is open.
export const GARDEN_SECRETS = [
  { id: 'storylanterns', land: 'garden', npc: 'jasmine', label: 'Story lanterns', emoji: '🌱' },
];
// Sunny Fjord Harbor's secret (K10): tap three harbor flags in order (a capital letter, some words, an end mark . ? !).
// Anna says a capital-letters-and-end-marks line (her skill). Shown only while the harbor is open.
export const HARBOR_SECRETS = [
  { id: 'sentenceflags', land: 'harbor', npc: 'anna', label: 'Sentence flags', emoji: '🚩' },
];
// Firefly Bayou's secret (K12): a tally board on the vegetable stand shows seven (four lines and a slash, then two more lines).
// Tap the board, then the basket with seven vegetables. Tiana says her tally line (counting by 5s). Shown only while the bayou is open.
export const BAYOU_SECRETS = [
  { id: 'tallymarks', land: 'bayou', npc: 'tiana', label: 'Tally marks', emoji: '🥕' },
];
// Rosewood Glen's secret (K14): the word garden has three little signs: bird, run, rose. Bird and rose are naming words (nouns), run is an
// action word (a verb). Tap the two naming words (either order), then the action word. Aurora says her naming-and-action-words line.
// Shown only while the glen is open.
export const GLEN_SECRETS = [
  { id: 'wordgarden', land: 'glen', npc: 'aurora', label: 'Word garden', emoji: '🐦' },
];
export const ALL_SECRETS = [...SECRETS, ...COVE_SECRETS, ...ISLE_SECRETS, ...GARDEN_SECRETS, ...HARBOR_SECRETS, ...BAYOU_SECRETS, ...GLEN_SECRETS];
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
const TALLY_WINDOW_MS = 12000; // bayou: time to count the baskets after looking at the tally board (a 6-year-old counts slowly)
const WORD_WINDOW_MS = 15000;  // glen: time to tap the two naming words and then the action word (a 6-year-old reads slowly)
const SECRET_COOL_MS = 3500;   // after a secret fires, ignore it for a moment (no speech spam)

/** Tap tracker. tap(part, nowMs) -> a secret id when that tap completes one, else null.
 * parts: 'clock', 'ice-a', 'ice-b', 'bookstack', 'sunflower', and the cove's 'shell-1' (small), 'shell-2', 'shell-3' (big). */
export function createSecretTracker() {
  let clock = [];
  let shells = []; // times of the in-order cove shell taps so far
  let shapes = []; // times of the in-order isle shape-stone taps so far
  let story = [];  // times of the in-order garden story-lantern taps so far
  let flags = [];  // times of the in-order harbor sentence-flag taps so far
  let tallyAt = -Infinity; // time the bayou tally board was last tapped
  const nameAt = {};       // glen: when each naming word sign was last tapped (word -> time)
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
      if (part === 'story-1' || part === 'story-2' || part === 'story-3') {
        const n = Number(part.slice(-1));
        // First (seed), next (sprout), last (flower), in order, all within the window. Same rules as the cove shells.
        if (story.length && now - story[0] > SECRET_WINDOW_MS) story = [];
        if (n === story.length + 1) story.push(now); else story = n === 1 ? [now] : [];
        if (story.length === 3) { story = []; return fire('storylanterns', now); }
        return null;
      }
      if (part === 'flag-1' || part === 'flag-2' || part === 'flag-3') {
        const n = Number(part.slice(-1));
        // Capital letter, then words, then the end mark, in order, all within the window. Same rules as the cove shells.
        if (flags.length && now - flags[0] > SECRET_WINDOW_MS) flags = [];
        if (n === flags.length + 1) flags.push(now); else flags = n === 1 ? [now] : [];
        if (flags.length === 3) { flags = []; return fire('sentenceflags', now); }
        return null;
      }
      if (part === 'tally-board') { tallyAt = now; return null; }   // look at the tally first
      if (/^tally-\d{1,2}$/.test(part)) {
        // A basket (named by how many vegetables it holds). Only the basket that matches the tally, tapped soon after the board, fires.
        // Any basket tap uses up the look, so a wrong basket means "look at the board and count again".
        const n = Number(part.slice(6)), seen = now - tallyAt <= TALLY_WINDOW_MS;
        tallyAt = -Infinity;
        return seen && n === TALLY_TARGET ? fire('tallymarks', now) : null;
      }
      if (part === 'word-' + WORD_ACTION || WORD_NAMES.some((w) => part === 'word-' + w)) {
        // The word garden: tap bird and rose (any order), then run. Tapping run too early (or after a long wait) starts over.
        const fresh = (w) => now - (nameAt[w] ?? -Infinity) <= WORD_WINDOW_MS;
        if (part === 'word-' + WORD_ACTION) {
          const ready = WORD_NAMES.every(fresh);
          for (const w of WORD_NAMES) nameAt[w] = -Infinity;
          return ready ? fire('wordgarden', now) : null;
        }
        nameAt[part.slice(5)] = now;
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

// Story order for Jasmine: a seed, then a sprout, then a flower (first, next, last).
export const STORY_STEPS = [
  { word: 'First', thing: 'a seed', emoji: '🌱' },
  { word: 'next', thing: 'a sprout', emoji: '🌿' },
  { word: 'last', thing: 'a flower', emoji: '🌸' },
];
/** The sequencing line Jasmine says for the lantern secret: "First a seed, next a sprout, last a flower!" */
export function storyLine() {
  return { steps: STORY_STEPS.map((s) => s.thing), say: `${STORY_STEPS.map((s) => `${s.word} ${s.thing}`).join(', ')}!` };
}

// A sentence for Anna: it starts with a capital letter and ends with a mark (. ? !). The three harbor flags show them in that order.
export const SENTENCE_FLAGS = [
  { key: 'flag-1', show: 'A', what: 'a capital letter' },
  { key: 'flag-2', show: 'abc', what: 'words' },
  { key: 'flag-3', show: '. ? !', what: 'an end mark' },
];
export const END_MARKS = ['.', '?', '!'];
/** The line Anna says for the flag secret. */
export function sentenceLine() {
  return { marks: END_MARKS.slice(), say: 'A sentence starts with a capital letter and ends with a mark!' };
}

// Tiana's tally marks (counting by 5s). Four lines and a slash make a group of five; any left over are single lines.
// The vegetable stand's board shows TALLY_TARGET; the three baskets hold TALLY_BASKETS (left to right); only the matching one is right.
export const TALLY_TARGET = 7;
export const TALLY_BASKETS = [9, 5, 7];
const NUMBER_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
/** Tally groups for n (0-10): full groups are { lines: 4, slash: true, count: 5 }; the rest { lines: k, slash: false, count: k }. */
export function tallyMarks(n) {
  let left = Math.max(0, Math.min(10, Math.floor(Number(n) || 0)));
  const out = [];
  while (left > 0) {
    if (left >= 5) { out.push({ lines: 4, slash: true, count: 5 }); left -= 5; } else { out.push({ lines: left, slash: false, count: left }); left = 0; }
  }
  return out;
}
/** What a list of tally groups adds up to. */
export function tallyTotal(groups) { return groups.reduce((s, g) => s + g.count, 0); }
/** Tidy rows for n vegetables in a basket (rows of at most 4), as counts per row, e.g. 7 -> [3, 4]. */
export function tallyRows(n) {
  const k = Math.max(0, Math.min(12, Math.floor(Number(n) || 0)));
  const rows = Math.ceil(k / 4) || 0, out = [];
  for (let i = 0; i < rows; i++) out.push(Math.floor((k + i) / rows));
  return out;
}
/** The line Tiana says for the tally secret. */
export function tallyLine() {
  const rest = TALLY_TARGET - 5;
  return { target: TALLY_TARGET, say: `Four lines and a slash make five! Five and ${NUMBER_WORDS[rest]} more is ${NUMBER_WORDS[TALLY_TARGET]}!` };
}

// Aurora's word garden (naming words and action words). The three signs, left to right; the first two names are nouns, the middle one a verb.
export const WORD_SIGNS = ['bird', 'run', 'rose'];
export const WORD_NAMES = ['bird', 'rose'];
export const WORD_ACTION = 'run';
/** What kind of word a sign shows: 'naming' (a noun: a person, animal, place or thing), 'action' (a verb) or null. */
export function wordKind(w) { return WORD_NAMES.includes(w) ? 'naming' : w === WORD_ACTION ? 'action' : null; }
/** The line Aurora says for the word-garden secret. */
export function wordLine() {
  const [a, b] = WORD_NAMES, cap = a[0].toUpperCase() + a.slice(1);
  return { names: WORD_NAMES.slice(), action: WORD_ACTION, say: `${cap} and ${b} are naming words. ${WORD_ACTION[0].toUpperCase() + WORD_ACTION.slice(1)} is an action word!` };
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
  moonstone: { label: 'Moonstones', emoji: '🌙' },
  anchor: { label: 'Anchors', emoji: '⚓' },
  lily: { label: 'Lilies', emoji: '🌸' },
  rose: { label: 'Roses', emoji: '🌹' },
};
export const TREASURE_LAND_NAMES = {
  library: 'Whispering Library', frostfall: 'Frostfall Peaks',
  meadow: 'Sunflower Meadows', village: 'Glass Slipper Village', cove: 'Seashell Cove', isle: 'Wayfinder Isle', garden: 'Moonlit Palace Garden', harbor: 'Sunny Fjord Harbor', bayou: 'Firefly Bayou', glen: 'Rosewood Glen',
};

/** Everything the Treasure Book page shows, from plain save data. Never throws.
 * opts.coveOpen / isleOpen / gardenOpen / harborOpen / bayouOpen / glenOpen: add Seashell Cove / Wayfinder Isle / Moonlit Palace Garden / Sunny Fjord Harbor / Firefly Bayou / Rosewood Glen (its tile, its row and its sticker). A closed land stays
 * hidden unless the save already holds something from it (so a preview's finds are never lost from view). */
export function treasureBookModel(save, dayKey, opts = {}) {
  const coveOpen = !!(opts && opts.coveOpen), isleOpen = !!(opts && opts.isleOpen), gardenOpen = !!(opts && opts.gardenOpen), harborOpen = !!(opts && opts.harborOpen), bayouOpen = !!(opts && opts.bayouOpen), glenOpen = !!(opts && opts.glenOpen);
  const t = sanitizeTreasures(save && save.treasures);
  const have = sanitizeSecrets(save && save.secrets);
  const kindIds = ALL_TREASURE_KINDS.filter((k) => TREASURE_KINDS.includes(k)
    || (k === COVE_KIND && (coveOpen || t.total[COVE_KIND])) || (k === ISLE_KIND && (isleOpen || t.total[ISLE_KIND])) || (k === GARDEN_KIND && (gardenOpen || t.total[GARDEN_KIND])) || (k === HARBOR_KIND && (harborOpen || t.total[HARBOR_KIND])) || (k === BAYOU_KIND && (bayouOpen || t.total[BAYOU_KIND])) || (k === GLEN_KIND && (glenOpen || t.total[GLEN_KIND])));
  const kinds = kindIds.map((kind) => {
    const count = t.total[kind] || 0;
    return { kind, label: TREASURE_INFO[kind].label, emoji: TREASURE_INFO[kind].emoji, count, found: count > 0 };
  });
  const lands = treasureLandsFor([...(coveOpen ? [COVE_LAND] : []), ...(isleOpen ? [ISLE_LAND] : []), ...(gardenOpen ? [GARDEN_LAND] : []), ...(harborOpen ? [HARBOR_LAND] : []), ...(bayouOpen ? [BAYOU_LAND] : []), ...(glenOpen ? [GLEN_LAND] : [])]).map((id) => ({
    id, name: TREASURE_LAND_NAMES[id], count: landTreasureCount({ treasures: t }, id, dayKey), of: TREASURES_PER_LAND,
  }));
  for (const l of lands) l.star = t.day === dayKey && t.stars.includes(l.id);
  const secretDefs = ALL_SECRETS.filter((s) => SECRETS.includes(s)
    || (COVE_SECRETS.includes(s) && (coveOpen || have.includes(s.id))) || (ISLE_SECRETS.includes(s) && (isleOpen || have.includes(s.id)))
    || (GARDEN_SECRETS.includes(s) && (gardenOpen || have.includes(s.id))) || (HARBOR_SECRETS.includes(s) && (harborOpen || have.includes(s.id))) || (BAYOU_SECRETS.includes(s) && (bayouOpen || have.includes(s.id))) || (GLEN_SECRETS.includes(s) && (glenOpen || have.includes(s.id))));
  const stickers = secretDefs.map((s) => ({ id: s.id, label: s.label, emoji: s.emoji, found: have.includes(s.id) }));
  const total = kinds.reduce((n, k) => n + k.count, 0);
  return { kinds, lands, stickers, total };
}
