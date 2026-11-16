/* Zoe's Starlight Quest — the one way a princess says an on-screen line (voices PR, Spanish Nov 16).
 * Her recorded clip plays only for the exact words of a clip (src/flow/clips.js); the rest is the speech voice.
 * In Spanish the line is translated first (src/i18n/es.js), then her Spanish clip plays where the Spanish words
 * match it exactly; a line with no Spanish is said in English, like it is shown.
 */
import { NO_CLIP_IDS } from '../engine-core.js';
import { sayLine, clipLine, greetingLine } from './clips.js';
import { toEs } from '../i18n/es.js';
import { spanishNow, voiceIn } from '../i18n/lang.js';

/** Say this line as shown: her clip where the words match, speech for the rest. */
export function say(npcId, text, onDone) {
  const es = spanishNow() ? toEs(text) : null;
  if (es) return sayLine(voiceIn('ES'), 'ES', npcId, es, onDone, NO_CLIP_IDS);
  return sayLine(voiceIn('EN'), 'EN', npcId, text, onDone, NO_CLIP_IDS);
}

// The game writes her lines in English; in Spanish they are shown and said as the Spanish clip's words.
/** Her recorded praise / encourage line (English words), or undefined. */
export function herLine(npcId, kind) {
  return clipLine('EN', npcId, kind, NO_CLIP_IDS);
}

/** Her recorded greeting, when it fits the game. */
export function herGreeting(npcId) {
  return greetingLine('EN', npcId, NO_CLIP_IDS);
}
