/* Zoe's Starlight Quest — save system
 * localStorage-backed progress. Defensive: corrupted storage is healed
 * by merging over the defaults, never by throwing.
 * ES module, no external requests.
 */

import { sanitizeTreasures, sanitizeSecrets } from './treasures.js?v=20261027e2';

const KEY = 'zoe-starlight-quest-v1';

const NPC_IDS = ['belle', 'elsa', 'rapunzel', 'cinderella'];

/** Star milestones. N10 can use this list to show rewards on Zoe. */
export const MILESTONES = [
  { id: 'trail-10', stars: 10, label: 'a new sparkle trail color', emoji: '✨' },
  { id: 'tiara-25', stars: 25, label: 'a new tiara gem color', emoji: '💎' },
  { id: 'skirt-50', stars: 50, label: 'a new skirt color', emoji: '👗' },
  { id: 'butterfly-100', stars: 100, label: 'a butterfly friend', emoji: '🦋' }
];

/** Unlock every milestone that data.stars has reached and data.milestones lacks.
 * Mutates data.milestones and returns the newly unlocked ones (oldest first).
 * An existing save past several milestones gets them all in one call. */
export function checkMilestones(data) {
  if (!Array.isArray(data.milestones)) data.milestones = [];
  const fresh = MILESTONES.filter((m) => data.stars >= m.stars && !data.milestones.includes(m.id));
  for (const m of fresh) data.milestones.push(m.id);
  return fresh;
}

/** Wardrobe: one slot per milestone reward. Each choice has an id (what is saved) and
 * a color (swatch + world). The first choice of a slot is the default look and is saved as nothing.
 * Colors are 0xRRGGBB; a trail choice has two colors it blends between (or rainbow: true). */
export const OUTFIT = {
  trail: { need: 'trail-10', name: 'Sparkle trail', choices: [
    { id: 'pinkgold', label: 'Pink gold', color: 0xff9fc4, trail: [0xff6fb8, 0xffc24d] },
    { id: 'rainbow', label: 'Rainbow', color: 0xffd36e, rainbow: true },
    { id: 'icy', label: 'Icy blue', color: 0x9fdcff, trail: [0xa9e4ff, 0x7fb6ff] },
    { id: 'lilac', label: 'Lilac', color: 0xcdb0ff, trail: [0xd3b2ff, 0xb58cff] }
  ] },
  gem: { need: 'tiara-25', name: 'Tiara gems', choices: [
    { id: 'pink', label: 'Pink', color: 0xff7fb0 },
    { id: 'blue', label: 'Blue', color: 0x7fc4ff },
    { id: 'purple', label: 'Purple', color: 0xb98cff },
    { id: 'green', label: 'Green', color: 0x7fe0a8 }
  ] },
  skirt: { need: 'skirt-50', name: 'Skirt', choices: [
    { id: 'rose', label: 'Rose', color: 0xff9cc4 },
    { id: 'lavender', label: 'Lavender', color: 0xb9a6f2 },
    { id: 'mint', label: 'Mint', color: 0x9be3c4 },
    { id: 'sunshine', label: 'Sunshine', color: 0xffe27a }
  ] }
};
export const BUDDY_NEED = 'butterfly-100';

/** Keep only known outfit keys with known values whose milestone is unlocked.
 * Default choices and "off" are dropped (absent = default). Never throws. */
export function sanitizeOutfit(raw, unlocked) {
  const out = {};
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
  const has = (id) => Array.isArray(unlocked) && unlocked.includes(id);
  for (const slot of Object.keys(OUTFIT)) {
    const def = OUTFIT[slot];
    const v = raw[slot];
    if (typeof v !== 'string' || !has(def.need)) continue;
    const i = def.choices.findIndex((c) => c.id === v);
    if (i > 0) out[slot] = v;
  }
  if (raw.buddy === true && has(BUDDY_NEED)) out.buddy = true;
  return out;
}

function defaults() {
  return {
    stars: 0,
    shards: { belle: 0, elsa: 0, rapunzel: 0, cinderella: 0 },
    done: [],
    milestones: [], // unlocked milestone ids (see MILESTONES)
    outfit: {},     // worn rewards: { trail, gem, skirt, buddy } (see OUTFIT)
    treasures: { day: '', got: [], total: {}, stars: [] }, // daily finds (see treasures.js): got = ids found on `day`, total = lifetime by kind
    secrets: [],    // secret-surprise sticker ids found (see treasures.js SECRETS)
    lang: 'EN',
    muted: false,
    started: false,
    ladder: {},   // per land: { tier, review } (see ladder.js)
    lastPlay: {}, // per land: local day of the last finished quest
    week: null,     // this week's school pack (Parent Corner); null = defaults
    schoolWords: [] // teacher's sight words (Parent Corner); [] = built-in list
  };
}

function merge(raw) {
  const d = defaults();
  if (!raw || typeof raw !== 'object') return d;
  const out = { ...d };

  if (typeof raw.stars === 'number' && Number.isFinite(raw.stars) && raw.stars >= 0) {
    out.stars = Math.floor(raw.stars);
  }

  if (raw.shards && typeof raw.shards === 'object') {
    for (const id of NPC_IDS) {
      const v = raw.shards[id];
      if (typeof v === 'number' && Number.isFinite(v) && v >= 0) {
        out.shards[id] = Math.floor(v);
      }
    }
  }

  if (Array.isArray(raw.done)) {
    out.done = raw.done.filter(x => typeof x === 'string');
  }

  if (Array.isArray(raw.milestones)) {
    out.milestones = MILESTONES.map((m) => m.id).filter((id) => raw.milestones.includes(id));
  }

  out.outfit = sanitizeOutfit(raw.outfit, out.milestones);
  out.treasures = sanitizeTreasures(raw.treasures);
  out.secrets = sanitizeSecrets(raw.secrets);

  if (raw.lang === 'ES' || raw.lang === 'EN') out.lang = raw.lang;
  if (typeof raw.muted === 'boolean') out.muted = raw.muted;
  if (typeof raw.started === 'boolean') out.started = raw.started;

  out.ladder = {};
  out.lastPlay = {};
  for (const id of NPC_IDS) {
    if (raw.ladder && raw.ladder[id] && typeof raw.ladder[id] === 'object') out.ladder[id] = raw.ladder[id];
    if (raw.lastPlay && typeof raw.lastPlay[id] === 'string') out.lastPlay[id] = raw.lastPlay[id];
  }

  if (Array.isArray(raw.schoolWords)) {
    const seen = [];
    for (const w of raw.schoolWords) {
      if (typeof w === 'string' && /^[a-z']{1,12}$/.test(w) && /[a-z]/.test(w) && !seen.includes(w)) seen.push(w);
      if (seen.length >= 30) break;
    }
    out.schoolWords = seen;
  }

  if (raw.week && typeof raw.week === 'object') {
    const list = (v) => (Array.isArray(v) ? v.filter((w) => typeof w === 'string' && /^[a-z]{1,12}$/.test(w)).slice(0, 15) : []);
    out.week = {
      spelling: list(raw.week.spelling), sight: list(raw.week.sight), vowels: list(raw.week.vowels),
      dictation: typeof raw.week.dictation === 'string' ? raw.week.dictation.slice(0, 60) : ''
    };
  }

  return out;
}

export const Save = {
  data: defaults(),

  /** Load from localStorage, merging defensively over defaults. */
  load() {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw == null) {
        this.data = defaults();
      } else {
        this.data = merge(JSON.parse(raw));
      }
    } catch (e) {
      // Corrupt storage → heal by resetting to defaults.
      this.data = defaults();
    }
    return this.data;
  },

  /** Persist current data to localStorage. */
  save() {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(this.data));
    } catch (e) {
      // Storage full / unavailable — play session continues in memory.
    }
    return this.data;
  },

  /** Wipe progress back to defaults and persist. */
  reset() {
    this.data = defaults();
    this.save();
    return this.data;
  }
};
