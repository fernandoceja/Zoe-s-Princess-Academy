/* Zoe's Starlight Quest — play-test fixes (Nov 15 play-test). Pure helpers, no DOM, no audio.
 * 1. drag anywhere to walk (dragVector), 2. short spoken hints and the auto-unlock wait after a wrong pick,
 * 3. a picture and a speaker for every question and answer card (non-readers), 9. one dialogue card instead of three.
 * Rule for 3: a picture or a spoken card must never give the answer away (see canHearChoices).
 */

/* ---------- 1. Drag anywhere ---------- */

/** A finger has to move this far (px) before a drag on the world walks Zoe, so a tap on a princess stays a tap. */
export const DRAG_START_PX = 12;
/** How far (px) from where the finger went down is full speed. */
export const DRAG_RADIUS_PX = 70;

/**
 * The walk vector for a drag that started at (0,0) and is now at (dx, dy) screen px.
 * Returns { x, z } with length <= 1; screen-up is -z (same as the joystick). Inside DRAG_START_PX it is { 0, 0 }.
 */
export function dragVector(dx, dy, radius = DRAG_RADIUS_PX, start = DRAG_START_PX) {
  const d = Math.hypot(dx, dy);
  if (!Number.isFinite(d) || d < start) return { x: 0, z: 0 };
  const m = Math.min(1, d / radius);
  return { x: (dx / d) * m, z: (dy / d) * m };
}

/* ---------- 2. Wrong answers: never lock ---------- */

/** After a wrong pick the cards wait this long (ms), then take taps again by themselves. */
export const RETRY_UNLOCK_MS = 1000;
/** A second sentence is only added while the hint stays this short (letters after "Good try!"): one idea, not a paragraph. */
export const HINT_MAX = 64;

/**
 * One short line from a long hint: "Good try!" plus the first sentence (and the next one too while it still fits).
 * The same function makes the spoken line from round.hintSay, so she hears what is meant by the shown line.
 */
const GENERIC_OPENER = /^(let'?s|let us)?\s*(look|listen|try|read it)( again| with me)?[.!]$|^(look|listen) again[.!]$/i;
export function shortHint(text, max = HINT_MAX) {
  const s = String(text || '').replace(/\s+/g, ' ').trim();
  if (!s) return 'Good try! Try again.';
  const body = s.replace(/^(good try|nice try|almost|oops)[!.,]?\s*/i, '');
  // Split after . ! ? that end a sentence (not the dots in "d - o - g." which end it anyway).
  let parts = (body.match(/[^.!?]+[.!?]+(?:['"’”)]+)?|[^.!?]+$/g) || [body]).map((p) => p.trim()).filter(Boolean);
  // "Let's look again." alone says nothing: skip such openers so the real clue ("'again' starts with the letter a.") stays.
  while (parts.length > 1 && GENERIC_OPENER.test(parts[0])) parts = parts.slice(1);
  let out = parts[0];
  for (let i = 1; i < parts.length; i++) {
    const next = (out + ' ' + parts[i].trim()).trim();
    if (next.length > max) break;
    out = next;
  }
  return ('Good try! ' + out).trim();
}

/* ---------- 3. Pictures and speakers for non-readers ---------- */

const PIC_HEAD = /^((?:\p{Extended_Pictographic}|\p{Regional_Indicator})(?:[️‍⃣]|\p{Extended_Pictographic}|\p{Emoji_Modifier})*)\s*/u;
const PIC_ANY = /[\p{Extended_Pictographic}️‍⃣]/gu;

/** Color badges for word-only cards, so each card has its own picture to point at ("the blue one"). */
export const CARD_BADGES = ['🟣', '🟡', '🔵', '🟢'];

/** Small picture words, only for lands where a picture helps and does not answer the question (see PICTURE_LANDS). */
export const WORD_PICS = {
  cat: '🐱', hat: '🎩', bat: '🦇', rat: '🐀', mat: '🧺', dog: '🐶', log: '🪵', frog: '🐸', fog: '🌫️', hog: '🐗',
  pig: '🐷', wig: '💇', big: '🐘', dig: '⛏️', fig: '🍇', sun: '☀️', bun: '🍞', run: '🏃', fun: '🎉',
  bug: '🐛', mug: '☕', rug: '🧶', hug: '🤗', jug: '🏺', pot: '🍲', dot: '⚫', hot: '🔥', cot: '🛏️',
  pen: '🖊️', hen: '🐔', ten: '🔟', den: '🐻', net: '🥅', jet: '✈️', pet: '🐕', wet: '💦', vet: '🩺',
  pin: '📌', fin: '🦈', bin: '🗑️', tin: '🥫', sit: '🪑', hit: '⚾', kit: '🧰', mop: '🧹', top: '🔝', hop: '🐇',
  pan: '🍳', fan: '🪭', can: '🥫', van: '🚐', man: '👨', map: '🗺️', cap: '🧢', nap: '😴', tap: '🚰',
  spider: '🕷️', bird: '🐦', fish: '🐟', ship: '🚢', ball: '⚽', tree: '🌳', flower: '🌸', apple: '🍎',
  sing: '🎤', wave: '👋', jump: '🦘', swim: '🏊', read: '📖', eat: '🍽️', sleep: '😴', dance: '💃',
  clap: '👏', kick: '🦵', walk: '🚶', fly: '🦋', draw: '🖍️', cook: '🍳', ride: '🚲', cry: '😢', smile: '😊',
  nut: '🥜', bud: '🌱', red: '🔴', cup: '🥤', bag: '👜', bed: '🛏️', fox: '🦊', butterfly: '🦋', teddy: '🧸',
  book: '📕', rock: '🪨', car: '🚗', chair: '🪑', shoe: '👟', spoon: '🥄', band: '🎺', nest: '🪺', skunk: '🦨',
  trunk: '🧳', tank: '🛢️', pink: '🩷', bank: '🏦', pond: '🦆', sink: '🚰', drink: '🧃', sand: '🏖️', hand: '✋',
  vest: '🦺', wink: '😉', fist: '✊', carrot: '🥕', baby: '👶', jog: '🏃', grin: '😁', rabbit: '🐰', tiger: '🐯',
  puppy: '🐶', turtle: '🐢', pencil: '✏️', nod: '🙂', banana: '🍌', monkey: '🐒', kitten: '🐱', skip: '🎀',
};

/** The picture for a word or short phrase ("I clap" -> 👏), or '' when there is none. */
export function wordPicture(text) {
  for (const w of String(text || '').toLowerCase().match(/[a-z]+/g) || []) if (WORD_PICS[w]) return WORD_PICS[w];
  return '';
}
/** Lands where a word picture is a help, not the answer: rhymes (sound), naming and action words, tally rows, plants. */
const PICTURE_LANDS = new Set(['ariel', 'aurora', 'tiana', 'rapunzel', 'jasmine']);

/** The princess's own picture, for a question with no picture of its own. */
export const LAND_PICS = {
  belle: '📖', elsa: '❄️', rapunzel: '🌻', cinderella: '🕰️', ariel: '🐚',
  moana: '🏝️', jasmine: '🏮', anna: '⛵', tiana: '🧺', aurora: '🌹',
};

/** The picture beside a question: the round's own picture, an ear for "listen" questions, else the land's picture. */
export function questionPicture(npcId, round) {
  if (round && typeof round.pic === 'string' && round.pic) return round.pic;
  const p = String((round && round.prompt) || '');
  if (/^listen\b/i.test(p) || /did you hear/i.test(p) || (round && round.replay)) return '👂';
  return LAND_PICS[npcId] || '⭐';
}

/**
 * What a card shows: { pic, text, dots } for one choice label.
 * - a label that starts with a picture keeps it ("💧 Water" -> 💧 + Water; "🐟" -> 🐟 and no text)
 * - a number up to 20 gets that many dots (dots: n), so she can count it
 * - a word in WORD_PICS gets its picture, only in PICTURE_LANDS
 * - anything else gets a color badge by its place
 */
export function cardPicture(npcId, label, index = 0) {
  const s = String(label == null ? '' : label);
  const head = s.match(PIC_HEAD);
  if (head) return { pic: head[1], text: s.slice(head[0].length).trim(), dots: 0 };
  const badge = CARD_BADGES[index % CARD_BADGES.length];
  if (/^\d+$/.test(s.trim())) {
    const n = +s.trim();
    return { pic: n >= 1 && n <= 20 ? '' : badge, text: s, dots: n >= 1 && n <= 20 ? n : 0 };
  }
  if (PICTURE_LANDS.has(npcId)) {
    const pic = wordPicture(s);
    if (pic) return { pic, text: s, dots: 0 };
  }
  return { pic: badge, text: s, dots: 0 };
}

/** What the speaker on a card says: the round's own reading of it, else the label without pictures. */
export function choiceSay(round, label) {
  const own = round && round.choiceSay && round.choiceSay[label];
  if (own) return own;
  return String(label || '').replace(PIC_ANY, '').replace(/\s+/g, ' ').trim();
}

/**
 * Can the cards read themselves aloud? Not when hearing them gives the answer away, or tells her nothing:
 * - Belle's reading rounds (which word / letter / ending / sentence): reading the cards IS the skill
 *   (her sorting jars still speak);
 * - cards that all sound the same (sentences that differ only by a capital or an end mark).
 */
export function canHearChoices(npcId, round, labels) {
  if (!round) return false;
  if (npcId === 'belle' && !round.sort) return false;
  const said = (labels || []).map((l) => choiceSay(round, l).toLowerCase().replace(/[^a-z0-9 ]/g, '').trim());
  if (said.length > 1 && said.every((x) => x === said[0])) return false;
  return said.some((x) => x.length > 0);
}

/* ---------- 9. Fewer taps: one dialogue card ---------- */

/** Short talks are shown and read as one card (one tap instead of three). Long ones still page. */
export const MERGE_MAX_CHARS = 240;
export function mergedLines(lines, max = MERGE_MAX_CHARS) {
  const ls = (lines || []).filter((l) => typeof l === 'string' && l.trim());
  if (ls.length <= 1) return ls;
  const all = ls.join(' ');
  return all.length <= max ? [all] : ls;
}
