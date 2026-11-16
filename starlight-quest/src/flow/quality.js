/* Zoe's Starlight Quest — picture quality rules (visual polish).
 * Framework-free and Node-safe (no DOM, no three.js), so tests/visualfx_check.mjs can test it.
 *
 * Parent Corner offers Auto / High / Low. Auto starts on High and drops to Low for the rest of the
 * session if the frame rate stays under 50 for about 3 seconds. The choice is kept on this device only.
 */
import { INNER_LAND_ANGLES, LAND_DIST, coveGeometry, isleGeometry, gardenGeometry, harborGeometry, bayouGeometry, glenGeometry } from '../engine-core.js';

export const QUALITY_KEY = 'zsq_quality_v1';
export const QUALITY_CHOICES = ['auto', 'high', 'low'];
export const QUALITY_LABELS = { auto: 'Auto', high: 'High', low: 'Low' };

// What each level turns on. Low keeps the new light and per-land colours (they cost nothing) and a small
// hard-edged shadow map; it drops bloom and soft shadow filtering.
export const PRESETS = {
  high: { shadows: true, shadowSize: 1024, softShadows: true, bloom: true, bloomStrength: 0.45, rim: 0.32, water: 1 },
  low:  { shadows: true, shadowSize: 512, softShadows: false, bloom: false, bloomStrength: 0, rim: 0.22, water: 1 },
};

/** The saved choice, or 'auto' when nothing (or something unknown) is saved. storage may be missing or throw. */
export function readQuality(storage) {
  try {
    const v = storage && storage.getItem(QUALITY_KEY);
    return QUALITY_CHOICES.includes(v) ? v : 'auto';
  } catch (e) { return 'auto'; }
}

/** Save the choice. Returns the choice actually in use (unknown values become 'auto'). */
export function writeQuality(storage, choice) {
  const v = QUALITY_CHOICES.includes(choice) ? choice : 'auto';
  try { if (storage) storage.setItem(QUALITY_KEY, v); } catch (e) { /* private mode: use it this session only */ }
  return v;
}

/** The level the renderer uses: 'high' or 'low'. */
export function effectiveLevel(choice, autoDropped) {
  if (choice === 'low') return 'low';
  if (choice === 'high') return 'high';
  return autoDropped ? 'low' : 'high';
}

/** One line for Parent Corner under the three buttons. */
export function qualityNote(choice, level) {
  if (choice === 'auto') {
    return level === 'low'
      ? 'Auto switched to Low on this device to keep the game smooth.'
      : 'Auto uses High and switches to Low if the game gets slow.';
  }
  if (choice === 'high') return 'High: soft shadows and glow. Auto is kinder to older phones.';
  return 'Low: lighter effects, longest battery.';
}

/**
 * Frame-rate guard for Auto. Feed it the time of every drawn frame (ms, performance.now()).
 * frame() returns true once, the first time the rate has stayed under minFps for holdMs.
 * Pauses (a gap over stallMs, a hidden tab, a covered world) restart the count, so a card on screen
 * or a shader warm-up never counts as slow play.
 */
export function makeFpsGuard({ minFps = 50, holdMs = 3000, warmupMs = 2500, stallMs = 1000, bucketMs = 500 } = {}) {
  let last = 0, warmUntil = -1, bucketStart = 0, bucketFrames = 0, slowSince = -1, tripped = false, lastFps = 0;
  const reset = () => { last = 0; warmUntil = -1; bucketStart = 0; bucketFrames = 0; slowSince = -1; };
  return {
    reset,
    get fps() { return lastFps; },
    get tripped() { return tripped; },
    frame(now, hidden = false) {
      if (tripped) return false;
      if (hidden) { reset(); return false; }
      if (warmUntil < 0) warmUntil = now + warmupMs;
      const gap = last ? now - last : 0;
      last = now;
      if (gap > stallMs) { bucketStart = now; bucketFrames = 0; slowSince = -1; warmUntil = Math.max(warmUntil, now + 500); return false; }
      if (now < warmUntil) { bucketStart = now; bucketFrames = 0; return false; }
      if (!bucketStart) bucketStart = now;
      bucketFrames++;
      const span = now - bucketStart;
      if (span >= bucketMs) {
        lastFps = (bucketFrames * 1000) / span;
        if (lastFps < minFps) { if (slowSince < 0) slowSince = bucketStart; }
        else slowSince = -1;
        bucketStart = now; bucketFrames = 0;
        if (slowSince >= 0 && now - slowSince >= holdMs) { tripped = true; return true; }
      }
      return false;
    },
  };
}

// --- Per-land mood: sky horizon, sky top and fog colour --------------------------------------------
// Soft pastels, each land its own feeling. The hub keeps the original sky (0xdff3ff / 0xbcd0f7).
export const LAND_MOODS = {
  hub:       { horizon: 0xdff3ff, zenith: 0xbcd0f7, fog: 0xdff3ff },
  meadow:    { horizon: 0xfff0c9, zenith: 0xc6dcf6, fog: 0xfbefd2 }, // warm sunflower gold
  frostfall: { horizon: 0xe4f5ff, zenith: 0xa7c6f0, fog: 0xe3f2fb }, // icy blue
  library:   { horizon: 0xebe0f8, zenith: 0xb3b5ec, fog: 0xe7ddf6 }, // lavender dusk
  village:   { horizon: 0xffe4dc, zenith: 0xc8cdf2, fog: 0xfbe5de }, // peach and rose
  cove:      { horizon: 0xd5f6f3, zenith: 0xa5d8ef, fog: 0xd8f3f0 }, // sea aqua
  isle:      { horizon: 0xdbf7ea, zenith: 0xa2d9e8, fog: 0xddf5ea }, // warm turquoise
  garden:    { horizon: 0xe1dcf6, zenith: 0xa8afe3, fog: 0xdfdaf3 }, // moonlit violet
  harbor:    { horizon: 0xdcecff, zenith: 0xa8c3ec, fog: 0xdde9f8 }, // fresh fjord blue
  bayou:     { horizon: 0xebe6d3, zenith: 0xb8c3da, fog: 0xe5e7d3 }, // misty green-gold
  glen:      { horizon: 0xffe5ef, zenith: 0xd0c8f0, fog: 0xfbe3ec }, // rose pink
};

const CENTERS = (() => {
  const c = {};
  for (const [id, a] of Object.entries(INNER_LAND_ANGLES)) c[id] = { x: Math.cos(a) * LAND_DIST, z: Math.sin(a) * LAND_DIST };
  const outer = { cove: coveGeometry, isle: isleGeometry, garden: gardenGeometry, harbor: harborGeometry, bayou: bayouGeometry, glen: glenGeometry };
  for (const [id, geo] of Object.entries(outer)) { try { c[id] = geo().center; } catch (e) { /* slot missing: hub colours there */ } }
  return c;
})();
export const LAND_CENTERS = CENTERS;

const smooth = (e0, e1, x) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };

/** Blend weights for a point on the map: each land fades in between 18 and 8 units from its centre, the hub has the rest. */
export function moodWeights(x, z, inner = 8, outer = 18) {
  const w = {};
  let sum = 0;
  for (const [id, c] of Object.entries(CENTERS)) {
    const k = 1 - smooth(inner, outer, Math.hypot(x - c.x, z - c.z));
    if (k > 0) { w[id] = k; sum += k; }
  }
  if (sum > 1) { for (const id in w) w[id] /= sum; sum = 1; }
  w.hub = 1 - sum;
  return w;
}

const ch = (hex, s) => (hex >> s) & 255;
/** The blended mood at a point, as 0xRRGGBB numbers (sRGB, the same space the world's hex colours use). */
export function moodAt(x, z) {
  const w = moodWeights(x, z);
  const out = {};
  for (const key of ['horizon', 'zenith', 'fog']) {
    let r = 0, g = 0, b = 0;
    for (const [id, k] of Object.entries(w)) {
      const hex = LAND_MOODS[id][key];
      r += ch(hex, 16) * k; g += ch(hex, 8) * k; b += ch(hex, 0) * k;
    }
    out[key] = (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);
  }
  return out;
}
