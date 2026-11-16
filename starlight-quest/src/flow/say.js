/* Zoe's Starlight Quest — the one way a princess says an on-screen line (voices PR).
 * Her recorded clip plays only for the exact words of a clip (src/flow/clips.js); the rest is the speech voice.
 */
import { Narrator, LANG } from '../engine-dom.js';
import { NO_CLIP_IDS } from '../engine-core.js';
import { sayLine, clipLine, greetingLine } from './clips.js';

/** Say this line as shown: her clip where the words match, speech for the rest. */
export function say(npcId, text, onDone) {
  return sayLine(Narrator, LANG, npcId, text, onDone, NO_CLIP_IDS);
}

/** Her recorded praise / encourage line in the current language, or undefined. */
export function herLine(npcId, kind) {
  return clipLine(LANG, npcId, kind, NO_CLIP_IDS);
}

/** Her recorded greeting, when it fits the game. */
export function herGreeting(npcId) {
  return greetingLine(LANG, npcId, NO_CLIP_IDS);
}
