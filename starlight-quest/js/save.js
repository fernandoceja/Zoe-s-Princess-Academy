/* Zoe's Starlight Quest — save system
 * localStorage-backed progress. Defensive: corrupted storage is healed
 * by merging over the defaults, never by throwing.
 * ES module, no external requests.
 */

const KEY = 'zoe-starlight-quest-v1';

const NPC_IDS = ['belle', 'elsa', 'rapunzel', 'cinderella'];

function defaults() {
  return {
    stars: 0,
    shards: { belle: 0, elsa: 0, rapunzel: 0, cinderella: 0 },
    done: [],
    lang: 'EN',
    muted: false,
    started: false,
    ladder: {},   // per land: { tier, review } (see ladder.js)
    lastPlay: {}  // per land: local day of the last finished quest
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

  if (raw.lang === 'ES' || raw.lang === 'EN') out.lang = raw.lang;
  if (typeof raw.muted === 'boolean') out.muted = raw.muted;
  if (typeof raw.started === 'boolean') out.started = raw.started;

  out.ladder = {};
  out.lastPlay = {};
  for (const id of NPC_IDS) {
    if (raw.ladder && raw.ladder[id] && typeof raw.ladder[id] === 'object') out.ladder[id] = raw.ladder[id];
    if (raw.lastPlay && typeof raw.lastPlay[id] === 'string') out.lastPlay[id] = raw.lastPlay[id];
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
