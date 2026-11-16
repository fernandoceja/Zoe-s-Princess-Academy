/* Zoe's Starlight Quest — gentle background sound per land: the rules (Nov 16).
 * Framework-free and Node-safe (no DOM, no WebAudio), so tests/ambience_check.mjs can test it.
 * The sound itself is made in code (src/fx/ambience.js, WebAudio): no audio files, nothing to license or download,
 * so it works offline with the app itself.
 *
 * Parent Corner: Off / Soft / Medium, kept on this device only (like picture quality). Soft is the default.
 */

export const AMBIENCE_KEY = 'zsq_ambience_v1';
export const AMBIENCE_CHOICES = ['off', 'soft', 'medium'];
export const AMBIENCE_LABELS = { off: 'Off', soft: 'Soft', medium: 'Medium' };
// Master loudness for each choice (the sound effects master is 0.22, so even Medium sits well under them).
export const AMBIENCE_LEVELS = { off: 0, soft: 0.05, medium: 0.09 };
// While a princess (or the pop-up voice) speaks, the background drops to this share of its level.
export const DUCK_SHARE = 0.2;
// While a question is on screen it plays a little quieter, so she can think.
export const QUESTION_SHARE = 0.6;

/** The saved choice, or 'soft' when nothing (or something unknown) is saved. storage may be missing or throw. */
export function readAmbience(storage) {
  try {
    const v = storage && storage.getItem(AMBIENCE_KEY);
    return AMBIENCE_CHOICES.includes(v) ? v : 'soft';
  } catch (e) { return 'soft'; }
}

/** Save the choice. Returns the choice actually in use (unknown values become 'soft'). */
export function writeAmbience(storage, choice) {
  const v = AMBIENCE_CHOICES.includes(choice) ? choice : 'soft';
  try { if (storage) storage.setItem(AMBIENCE_KEY, v); } catch (e) { /* private mode: this session only */ }
  return v;
}

// Each land's little tune: a soft chord (Hz, held), a pentatonic scale for the occasional plink, how often a plink comes
// (seconds between, on average) and a breath of filtered noise (water, wind or leaves) or none.
// All notes are from C major pentatonic or close neighbours, so lands blend without clashing when she walks between them.
export const LAND_SOUNDS = {
  hub:       { chord: [130.81, 196.0, 261.63], scale: [523.25, 587.33, 659.25, 783.99, 880.0], every: 5.5, noise: null },
  meadow:    { chord: [146.83, 220.0, 293.66], scale: [587.33, 659.25, 783.99, 880.0, 1046.5], every: 4.5, noise: { kind: 'leaves', cutoff: 1800, level: 0.25 } },
  frostfall: { chord: [164.81, 246.94, 329.63], scale: [987.77, 1174.66, 1318.51, 1567.98], every: 5, noise: { kind: 'wind', cutoff: 700, level: 0.35 } },
  library:   { chord: [110.0, 164.81, 220.0], scale: [440.0, 523.25, 587.33, 659.25], every: 7, noise: null },
  village:   { chord: [130.81, 164.81, 196.0], scale: [523.25, 659.25, 783.99, 1046.5], every: 5, noise: null },
  cove:      { chord: [110.0, 164.81, 246.94], scale: [659.25, 783.99, 880.0, 987.77], every: 6, noise: { kind: 'waves', cutoff: 500, level: 0.5 } },
  isle:      { chord: [146.83, 220.0, 277.18], scale: [587.33, 739.99, 880.0, 1108.73], every: 5, noise: { kind: 'waves', cutoff: 600, level: 0.4 } },
  garden:    { chord: [98.0, 146.83, 196.0], scale: [392.0, 440.0, 587.33, 659.25], every: 6.5, noise: { kind: 'wind', cutoff: 450, level: 0.2 } },
  harbor:    { chord: [130.81, 196.0, 246.94], scale: [523.25, 659.25, 783.99, 987.77], every: 5.5, noise: { kind: 'waves', cutoff: 550, level: 0.45 } },
  bayou:     { chord: [116.54, 174.61, 233.08], scale: [466.16, 523.25, 698.46, 783.99], every: 4, noise: { kind: 'leaves', cutoff: 2600, level: 0.18 } },
  glen:      { chord: [138.59, 207.65, 277.18], scale: [554.37, 622.25, 830.61, 932.33], every: 6, noise: { kind: 'leaves', cutoff: 1500, level: 0.2 } },
};

/**
 * What the background should do right now: { master, plinks, noise, lite }.
 * choice: Parent Corner choice. muted: the HUD sound button. speaking: a voice is talking. question: a question is up.
 * calm: Reduce Motion (no random plinks or swells, only the steady chord). lite: low power / Low picture quality
 * (fewer voices: chord only, no noise). hidden: the app is in the background (silent, and the caller suspends).
 */
export function ambiencePlan({ choice = 'soft', muted = false, speaking = false, question = false, calm = false, lite = false, hidden = false } = {}) {
  const base = AMBIENCE_LEVELS[choice] ?? AMBIENCE_LEVELS.soft;
  if (!base || muted || hidden) return { master: 0, plinks: false, noise: false, lite: !!lite };
  let master = base;
  if (question) master *= QUESTION_SHARE;
  if (speaking) master *= DUCK_SHARE;
  return { master, plinks: !calm && !lite, noise: !lite, lite: !!lite };
}

/** Per-land gains from mood weights (moodWeights in quality.js): only lands that are really near get a voice. */
export function landGains(weights, floor = 0.02) {
  const out = {};
  for (const [id, w] of Object.entries(weights || {})) if (LAND_SOUNDS[id] && w > floor) out[id] = w;
  return out;
}

/** Pick the next plink note and wait for a land (rng injectable). Returns { freq, wait } in Hz and seconds. */
export function nextPlink(landId, rng = Math.random) {
  const s = LAND_SOUNDS[landId] || LAND_SOUNDS.hub;
  const freq = s.scale[Math.floor(rng() * s.scale.length) % s.scale.length];
  const wait = s.every * (0.6 + rng() * 0.8);
  return { freq, wait };
}
