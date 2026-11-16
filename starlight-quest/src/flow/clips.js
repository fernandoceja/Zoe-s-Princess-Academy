/* Zoe's Starlight Quest — recorded princess voices (greeting / praise / encourage).
 * The MP3s live in the repo-root assets/audio/<LANG>/princess_<id>_<kind>_01.mp3 (precached in sw.js).
 * A clip plays only when its exact words are on screen: CLIP_LINES holds what each clip says
 * (transcribed from the files, Nov 2026). linePlan() splits a line into sentences and swaps in a
 * clip only for a run of sentences that matches one of hers word for word; every other sentence
 * is read by the speech voice. Imports nothing, so node tests can load it.
 */

export const CLIP_KINDS = ['greeting', 'praise', 'encourage'];

// What each recorded clip says, word for word. Missing kinds have no file in that language.
export const CLIP_LINES = {
  EN: {
    belle: {
      greeting: "Hello, I'm Belle. I love stories. Shall we read together?",
      praise: 'Yes, what a wonderful reader!',
      encourage: "Almost. Let's look one more time.",
    },
    elsa: {
      greeting: "Hello, I'm Elsa. Numbers sparkle when we try. Let's begin.",
      praise: 'Yes, your number magic sparkled!',
      encourage: 'Almost! Count with me one more time.',
    },
    rapunzel: {
      greeting: "Hi, I'm Rapunzel. Every question is a new lantern. Let's explore!",
      praise: 'Yes! You lit up that answer!',
      encourage: 'Look closer. What do you notice?',
    },
    cinderella: {
      // Her greeting talks about picking a grade (the old Academy screen), so the game never shows it.
      greeting: "Hello, I'm Cinderella. Choose any grade you like. I'll stay right here.",
      praise: 'Yes, kind and clever!',
      encourage: 'Almost! Kind learners try again!',
    },
    ariel: {
      greeting: "Oh, hello! I'm Ariel. I would love to learn with you.",
      praise: 'Oh, that was wonderful!',
      encourage: "Almost! Let's try once more.",
    },
    anna: {
      greeting: "Hi, I'm Anna. Okay, ready? Let's go on a reading adventure!",
      praise: 'Yes! What a reading adventure!',
      encourage: "Almost. Let's try that page again.",
    },
    tiana: {
      greeting: "Hey there. I'm Tiana. We work hard and we shine. Let's get started.",
      praise: 'Yes, hard work shines!',
      encourage: 'Almost. Work it one more time.',
    },
    aurora: {
      greeting: 'Hello, I am Aurora. Let us make today a little more magical.',
      praise: 'Yes, that was lovely work.',
      encourage: 'Almost. Softly, try again.',
    },
  },
  ES: {},
};

// Greetings that fit the game (Cinderella's talks about choosing a grade).
const GREETING_UNUSED = ['cinderella'];

/** Lowercase words only: no punctuation, emoji or extra spaces. "Hello, I'm Belle!" -> "hello im belle". */
export function norm(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

/** Sentences of a line, split after . ! ? (keeps the marks and any emoji with their sentence). */
export function sentences(text) {
  const s = String(text || '').replace(/\s+/g, ' ').trim();
  if (!s) return [];
  return s.split(/(?<=[.!?…])\s+(?=\S)/).map((p) => p.trim()).filter(Boolean);
}

/** The clip text for one princess and kind, or undefined (no file, or she has no clips: noClipIds). */
export function clipLine(lang, npcId, kind, noClipIds = []) {
  if (noClipIds.includes(npcId)) return undefined;
  const set = (CLIP_LINES[lang] || {})[npcId];
  return (set && set[kind]) || undefined;
}

/** Her greeting, if it has a clip and fits the game. */
export function greetingLine(lang, npcId, noClipIds = []) {
  if (GREETING_UNUSED.includes(npcId)) return undefined;
  return clipLine(lang, npcId, 'greeting', noClipIds);
}

/**
 * How to say one on-screen line: [{ type: 'clip', kind, text } | { type: 'tts', text }].
 * Clips only stand in for a run of whole sentences whose words match hers exactly.
 */
export function linePlan(lang, npcId, text, noClipIds = []) {
  const parts = sentences(text);
  const clips = CLIP_KINDS.map((kind) => ({ kind, text: clipLine(lang, npcId, kind, noClipIds) })).filter((c) => c.text);
  const out = [];
  const pushTts = (t) => {
    const last = out[out.length - 1];
    if (last && last.type === 'tts') last.text += ' ' + t;
    else out.push({ type: 'tts', text: t });
  };
  let i = 0;
  while (i < parts.length) {
    let hit = null;
    for (let j = parts.length; j > i && !hit; j--) {
      const run = parts.slice(i, j).join(' ');
      const c = clips.find((cl) => norm(cl.text) === norm(run));
      if (c) hit = { kind: c.kind, text: run, end: j };
    }
    if (hit) { out.push({ type: 'clip', kind: hit.kind, text: hit.text }); i = hit.end; }
    else { pushTts(parts[i]); i += 1; }
  }
  // A part with no words (only an emoji) is not worth a speech call.
  return out.filter((p) => p.type === 'clip' || norm(p.text));
}

/**
 * Say a line: her clip where the words match, the speech voice for the rest, in order, then onDone.
 * narrator: the engine Narrator (speak = clip with speech fallback, speakExact = speech only).
 */
export function sayLine(narrator, lang, npcId, text, onDone, noClipIds = []) {
  const plan = linePlan(lang, npcId, text, noClipIds);
  if (!plan.length) { narrator.speakExact(npcId, text, onDone); return plan; }
  const step = (k) => {
    const p = plan[k];
    const next = k + 1 < plan.length ? () => step(k + 1) : onDone;
    if (p.type === 'clip') narrator.speak(npcId, p.kind, p.text, next);
    else narrator.speakExact(npcId, p.text, next);
  };
  step(0);
  return plan;
}
