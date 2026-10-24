// ============================================================================
// Zoe's Starlight Quest — quest content (EN)
// ----------------------------------------------------------------------------
// DEPENDENCY-FREE ES module: no imports, so this file can be unit-tested in
// node directly (e.g. `node --check quests.mjs` / import in a test runner).
// All strings live in this one file so a future ES translation can swap the
// whole table at once.
// Content rules baked in: warm and encouraging tone, very short sentences,
// never a fail state — a wrong pick gets a gentle hint and a retry.
// ============================================================================

// ----------------------------------------------------------------------------
// PRINCESSES — NPC roster keyed by id.
// portrait paths are relative to the game root. voice holds speechSynthesis
// fallback values (pitch, rate) used when no prerecorded MP3 exists.
// ----------------------------------------------------------------------------
import { PORTRAIT_BELLE } from './portrait-belle.js?v=20261023s6';
import { PORTRAIT_ELSA } from './portrait-elsa.js?v=20261023s6';
import { PORTRAIT_RAPUNZEL } from './portrait-rapunzel.js?v=20261023s6';
import { PORTRAIT_CINDERELLA } from './portrait-cinderella.js?v=20261023s6';
import { PORTRAIT_ZOE } from './portrait-zoe.js?v=20261023s6';

export const PRINCESSES = {
  belle: {
    name: 'Belle',
    landId: 'whispering-library',
    landName: 'Whispering Library',
    portrait: PORTRAIT_BELLE,
    color: '#3b82f6',
    voice: { pitch: 1.1, rate: 0.95 },
  },
  elsa: {
    name: 'Elsa',
    landId: 'frostfall-peaks',
    landName: 'Frostfall Peaks',
    portrait: PORTRAIT_ELSA,
    color: '#f472b6',
    voice: { pitch: 1.15, rate: 0.9 },
  },
  rapunzel: {
    name: 'Rapunzel',
    landId: 'sunflower-meadows',
    landName: 'Sunflower Meadows',
    portrait: PORTRAIT_RAPUNZEL,
    color: '#34c779',
    voice: { pitch: 1.25, rate: 1.0 },
  },
  cinderella: {
    name: 'Cinderella',
    landId: 'glass-slipper-village',
    landName: 'Glass Slipper Village',
    portrait: PORTRAIT_CINDERELLA,
    color: '#f59e0b',
    voice: { pitch: 1.05, rate: 0.9 },
  },
  zoe: {
    name: 'Zoe',
    landId: 'starlight-hub',
    landName: 'Starlight Hub',
    portrait: PORTRAIT_ZOE,
    color: '#fbbf24',
    voice: { pitch: 1.3, rate: 1.0 },
  },
};

// ----------------------------------------------------------------------------
// DOLCH_1ST — Dolch first-grade sight words (~40).
// ----------------------------------------------------------------------------
export const DOLCH_1ST = [
  'after', 'again', 'an', 'any', 'as', 'ask', 'by', 'could', 'every', 'fly',
  'from', 'give', 'going', 'had', 'has', 'her', 'him', 'his', 'how', 'just',
  'know', 'let', 'live', 'may', 'of', 'old', 'once', 'open', 'over', 'put',
  'round', 'some', 'stop', 'take', 'thank', 'them', 'then', 'think', 'walk',
  'were', 'when',
];

// ----------------------------------------------------------------------------
// QUESTS — keyed by npcId. Each quest has 5 rounds.
// Round shape: { prompt, choices: [3 strings], answer, hint }
// answer ALWAYS exactly equals one of its choices.
// Optional extras: `visual: {a, b}` (Elsa: countable snowflakes),
// `clock: {hour, minute}` (Cinderella: analog clock reading).
// ----------------------------------------------------------------------------
export const QUESTS = {
  // ---- BELLE: "The Torn Storybook" — ELA / Reading Foundations ------------
  belle: {
    title: 'The Torn Storybook',
    questName: 'The Torn Storybook',
    intro: [
      'Oh no! My storybook blew apart.',
      'The pages are hiding in the library. Will you help me find them?',
      'Read a page with me, and we will put it back together.',
    ],
    rounds: [
      {
        prompt: "Which word says 'again'?",
        choices: ['again', 'open', 'fly'],
        answer: 'again',
        hint: "Good try! Let's look again. Which word starts with the letter a?",
      },
      {
        prompt: 'Sound it out: c - a - t. Which word is it?',
        choices: ['cat', 'cup', 'cap'],
        answer: 'cat',
        hint: 'Good try! Say it slow with me: c - a - t. Which one is it?',
      },
      {
        prompt: "Which word says 'some'?",
        choices: ['same', 'some', 'stop'],
        answer: 'some',
        hint: 'Good try! These look close. Which word has an o right after the s?',
      },
      {
        prompt: 'Sound it out: p - i - g. Which word is it?',
        choices: ['pen', 'pig', 'pin'],
        answer: 'pig',
        hint: 'Good try! Say it slow with me: p - i - g. Which one is it?',
      },
      {
        prompt: "Which word says 'every'?",
        choices: ['every', 'ever', 'even'],
        answer: 'every',
        hint: 'Good try! Look at the end. Which word ends with y?',
      },
    ],
    complete: [
      'You did it! My storybook is whole again.',
      'Every page is home, thanks to you.',
    ],
  },

  // ---- ELSA: "The Frozen Bridge" — Math / operations within 20 ------------
  elsa: {
    title: 'The Frozen Bridge',
    questName: 'The Frozen Bridge',
    intro: [
      'Brrr! My bridges froze solid.',
      'Each one needs just the right number of snowflakes to sparkle again.',
      'Count with me, and we will cross together!',
    ],
    rounds: [
      {
        prompt: 'The bridge needs 7 + 5 snowflakes. How many?',
        choices: ['12', '11', '13'],
        answer: '12',
        hint: 'Good try! Count with me: 7 snowflakes, then 5 more. How many?',
        visual: { a: 7, b: 5 },
      },
      {
        prompt: 'The bridge needs 9 - 4 snowflakes. How many?',
        choices: ['5', '4', '6'],
        answer: '5',
        hint: 'Good try! Start with 9 snowflakes, then melt 4 away. How many are left?',
        visual: { a: 9, b: 4 },
      },
      {
        prompt: 'The bridge needs 6 + 8 snowflakes. How many?',
        choices: ['14', '12', '15'],
        answer: '14',
        hint: 'Good try! Count with me: 6 snowflakes, then 8 more. How many?',
        visual: { a: 6, b: 8 },
      },
      {
        prompt: 'The bridge needs 15 - 6 snowflakes. How many?',
        choices: ['9', '8', '10'],
        answer: '9',
        hint: 'Good try! Start with 15 snowflakes, then melt 6 away. How many are left?',
        visual: { a: 15, b: 6 },
      },
      {
        prompt: 'The bridge needs 10 - 3 snowflakes. How many?',
        choices: ['7', '8', '6'],
        answer: '7',
        hint: 'Good try! Start with 10 snowflakes, then melt 3 away. How many are left?',
        visual: { a: 10, b: 3 },
      },
    ],
    complete: [
      'All five bridges sparkle! You are a counting star.',
      'Now we can visit everyone in Frostfall Peaks.',
    ],
  },

  // ---- RAPUNZEL: "The Sleepy Garden" — Science / plants -------------------
  rapunzel: {
    title: 'The Sleepy Garden',
    questName: 'The Sleepy Garden',
    intro: [
      'Oh no, my flowers fell asleep!',
      'They need the things every plant needs to wake up and grow.',
      'Help me wake them, and the meadow will bloom!',
    ],
    rounds: [
      {
        prompt: 'A sleepy seed wants to wake up and grow. What does it drink first?',
        choices: ['Water', 'Juice', 'Milk'],
        answer: 'Water',
        hint: 'Good try! Seeds are thirsty, just like you. What do you drink?',
      },
      {
        prompt: 'Which one is a living thing?',
        choices: ['A rock', 'A flower', 'A shoe'],
        answer: 'A flower',
        hint: 'Good try! A living thing grows. Which one of these grows?',
      },
      {
        prompt: 'Little leaves reach up to catch the warm...',
        choices: ['Sunlight', 'Snow', 'Wind'],
        answer: 'Sunlight',
        hint: 'Good try! It comes from the sun. What do we call its warm light?',
      },
      {
        prompt: 'The seed is tucked into soft, brown dirt. What is that called?',
        choices: ['Soil', 'Soup', 'Sand'],
        answer: 'Soil',
        hint: 'Good try! It is the dirt plants sleep in. What is it called?',
      },
      {
        prompt: 'Which part of the plant drinks water down in the soil?',
        choices: ['Roots', 'Petals', 'Leaves'],
        answer: 'Roots',
        hint: 'Good try! They hide under the ground. Which part drinks down there?',
      },
    ],
    complete: [
      'Yay! The whole garden is awake and blooming.',
      'The flowers are dancing just for you!',
    ],
  },

  // ---- CINDERELLA: "The Midnight Clock" — Math / telling time -------------
  cinderella: {
    title: 'The Midnight Clock',
    questName: 'The Midnight Clock',
    intro: [
      'Oh my! All the village clocks fell asleep.',
      'The clock tower stopped, and nobody knows the time!',
      'Read each clock with me, and we will wind them all back up.',
    ],
    rounds: [
      {
        prompt: 'What time is the clock showing?',
        choices: ["3 o'clock", "4 o'clock", 'half past 3'],
        answer: "3 o'clock",
        hint: 'Good try! Look at the short hand. Which number is it pointing at?',
        clock: { hour: 3, minute: 0 },
      },
      {
        prompt: 'What time is the clock showing?',
        choices: ['half past 5', "5 o'clock", 'half past 6'],
        answer: 'half past 5',
        hint: 'Good try! The long hand is on the 6. That means half past. Half past what?',
        clock: { hour: 5, minute: 30 },
      },
      {
        prompt: 'What time is the clock showing?',
        choices: ["8 o'clock", "9 o'clock", 'half past 9'],
        answer: "9 o'clock",
        hint: 'Good try! Look at the short hand. Which number is it pointing at?',
        clock: { hour: 9, minute: 0 },
      },
      {
        prompt: 'What time is the clock showing?',
        choices: ["7 o'clock", 'half past 7', 'half past 8'],
        answer: 'half past 7',
        hint: 'Good try! The long hand is on the 6. That means half past. Half past what?',
        clock: { hour: 7, minute: 30 },
      },
      {
        prompt: 'What time is the clock showing?',
        choices: ["12 o'clock", "11 o'clock", 'half past 12'],
        answer: "12 o'clock",
        hint: 'Good try! Both hands are pointing straight up. Which number is at the top?',
        clock: { hour: 12, minute: 0 },
      },
    ],
    complete: [
      'Tick tock! Every clock in the village is chiming.',
      'You saved the day before midnight!',
    ],
  },
};

// ----------------------------------------------------------------------------
// FINALE_LINES — spoken when all four lands are complete.
// ----------------------------------------------------------------------------
export const FINALE_LINES = [
  'You did it! Every land is glowing again.',
  'The Starlight Crown is back on the castle!',
  'You are the brightest star of all, Zoe.',
  'Thank you for helping every princess. Shine on!',
];

// ----------------------------------------------------------------------------
// PARENT_CORNER_HTML — inline-styles-only overlay for parents.
// One row per quest mapping it to its 1st-grade standard, plus a finale row.
// ----------------------------------------------------------------------------
export const PARENT_CORNER_HTML = `<div style="font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;padding:20px;background:#fffdf7;border:2px solid #ebd373;border-radius:16px;color:#1f2937;">
<h2 style="margin:0 0 4px;font-size:20px;color:#7c5e10;">&#128253; Parent Corner</h2>
<p style="margin:0 0 16px;font-size:14px;color:#6b7280;">What Zoe is practicing in each quest, mapped to 1st-grade standards.</p>
<div style="display:flex;flex-direction:column;gap:10px;">
<div style="padding:12px;border:1px solid #e5e7eb;border-radius:12px;background:#f0f7ff;">
<div style="font-weight:700;font-size:15px;">&#128214; Belle &mdash; The Torn Storybook</div>
<div style="font-size:13px;margin-top:4px;"><b>Standard:</b> ELA Reading Foundations &mdash; CA CCSS RF.1.3 / RF.1.4</div>
<div style="font-size:13px;margin-top:2px;color:#374151;">Phonics and sight-word recognition: sounding out short-vowel words and recognizing common first-grade words.</div>
</div>
<div style="padding:12px;border:1px solid #e5e7eb;border-radius:12px;background:#fff0f7;">
<div style="font-weight:700;font-size:15px;">&#10052;&#65039; Elsa &mdash; The Frozen Bridge</div>
<div style="font-size:13px;margin-top:4px;"><b>Standard:</b> Math Operations within 20 &mdash; CA CCSS 1.OA</div>
<div style="font-size:13px;margin-top:2px;color:#374151;">Adding and subtracting within 20 using countable snowflakes as visual supports.</div>
</div>
<div style="padding:12px;border:1px solid #e5e7eb;border-radius:12px;background:#f0fdf4;">
<div style="font-weight:700;font-size:15px;">&#127803; Rapunzel &mdash; The Sleepy Garden</div>
<div style="font-size:13px;margin-top:4px;"><b>Standard:</b> Science: plants &amp; living things &mdash; NGSS 1-LS1 (CA)</div>
<div style="font-size:13px;margin-top:2px;color:#374151;">What plants need to grow (water, sunlight, soil) and living vs. nonliving things.</div>
</div>
<div style="padding:12px;border:1px solid #e5e7eb;border-radius:12px;background:#fffbeb;">
<div style="font-weight:700;font-size:15px;">&#9200; Cinderella &mdash; The Midnight Clock</div>
<div style="font-size:13px;margin-top:4px;"><b>Standard:</b> Math: telling time &mdash; CA CCSS 1.MD.3</div>
<div style="font-size:13px;margin-top:2px;color:#374151;">Reading an analog clock to the hour and half-hour.</div>
</div>
<div style="padding:12px;border:2px solid #ebd373;border-radius:12px;background:#fefce8;">
<div style="font-weight:700;font-size:15px;">&#128081; Starlight Finale</div>
<div style="font-size:13px;margin-top:2px;color:#374151;">Finishing all four quests restores the Starlight Crown and celebrates persistence &mdash; no fail states, ever.</div>
</div>
</div>
<p style="margin:16px 0 0;font-size:12px;color:#9ca3af;">No scores, no penalties &mdash; wrong answers get a gentle hint and a retry.</p>
</div>`;

// ============================================================================
// ROUND POOLS — fresh rounds every play. buildRounds(npcId) returns 5 rounds
// in the same shape as QUESTS[npcId].rounds (which stay as the fallback).
// Pass a custom rng for deterministic tests.
// ============================================================================
export const DOLCH_PREPRIMER = [
  'and', 'away', 'big', 'blue', 'can', 'come', 'down', 'find', 'for', 'funny',
  'go', 'help', 'here', 'jump', 'little', 'look', 'make', 'play', 'red', 'run',
  'said', 'see', 'the', 'three', 'two', 'up', 'we', 'where', 'yellow', 'you',
];
export const DOLCH_PRIMER = [
  'all', 'am', 'are', 'at', 'ate', 'be', 'black', 'brown', 'but', 'came', 'did',
  'do', 'eat', 'four', 'get', 'good', 'have', 'he', 'into', 'like', 'must', 'new',
  'no', 'now', 'on', 'our', 'out', 'please', 'pretty', 'ran', 'ride', 'saw', 'say',
  'she', 'so', 'soon', 'that', 'there', 'they', 'this', 'too', 'under', 'want',
  'was', 'well', 'went', 'what', 'white', 'who', 'will', 'with', 'yes',
];

// Short-vowel CVC words grouped so distractors differ by one sound.
const CVC_SETS = [
  ['cat', 'cap', 'cup'], ['pig', 'pin', 'pen'], ['dog', 'dig', 'dot'],
  ['sun', 'sit', 'sap'], ['hat', 'hot', 'hit'], ['bed', 'bad', 'bud'],
  ['map', 'mop', 'mat'], ['bug', 'bag', 'big'], ['fox', 'fix', 'fax'],
  ['red', 'rod', 'rid'], ['net', 'nut', 'not'], ['ten', 'tan', 'tin'],
];

function _pick(arr, rng) { return arr[Math.floor(rng() * arr.length)]; }
function _shuffle(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function _sample(arr, n, rng) { return _shuffle(arr, rng).slice(0, n); }

// Belle hint: point at a letter the right word has that NO wrong choice shares
// in the same spot (first letter, then last letter, then any position).
export function _belleHint(w, distractors) {
  const differs = (i, ch) => distractors.every((d) => d[i] !== ch);
  if (differs(0, w[0])) return `Good try! Let's look again. '${w}' starts with the letter ${w[0]}.`;
  const last = w[w.length - 1];
  if (distractors.every((d) => d[d.length - 1] !== last)) return `Good try! Let's look again. '${w}' ends with the letter ${last}.`;
  const ord = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh'];
  for (let i = 1; i < w.length; i++) {
    if (differs(i, w[i])) return `Good try! Let's look again. The ${ord[i] || 'next'} letter in '${w}' is ${w[i]}.`;
  }
  const lens = distractors.every((d) => d.length !== w.length);
  if (lens) return `Good try! Let's look again. '${w}' has ${w.length} letters.`;
  return `Good try! Let's look again. Spell it with me: ${w.split('').join(' - ')}.`;
}

// ============================================================================
// FIRST-GRADE CONTENT (Step 4). Each 5-round quest goes easiest first:
// round 1 from T1 (easy), rounds 2-3 from T2 (core), rounds 4-5 from T3
// (stretch). The adaptive ladder (Step 5) can later choose tiers per land.
// Optional round extras: `say` (what is read aloud, when it must differ from
// the prompt, e.g. Belle sentences she reads herself), `visual` (Elsa),
// `clock` (Cinderella), `pic` (emoji picture shown above the choices).
// ============================================================================

// A parent can replace this with the class's own word list (e.g. Wonders
// high-frequency words). When empty, the Dolch first-grade list below is used.
export const SCHOOL_WORDS = [];
const SIGHT_1ST = [
  'after', 'again', 'could', 'every', 'from', 'give', 'has', 'her', 'him', 'how',
  'just', 'know', 'live', 'once', 'open', 'some', 'them', 'then', 'think', 'were', 'when',
];

// Digraph sets: right word first; the others differ by one sound.
const DIGRAPH_SETS = [
  ['ship', 'chip', 'sip'], ['shop', 'chop', 'hop'], ['fish', 'fin', 'fit'],
  ['dish', 'dip', 'fish'], ['wish', 'with', 'wig'], ['shell', 'sell', 'bell'],
  ['chip', 'ship', 'hip'], ['chin', 'shin', 'tin'], ['chop', 'shop', 'cop'],
  ['much', 'mush', 'mud'], ['lunch', 'bunch', 'lump'], ['rich', 'rip', 'rib'],
  ['this', 'thin', 'his'], ['that', 'hat', 'than'], ['then', 'hen', 'ten'],
  ['with', 'wish', 'wit'], ['bath', 'bat', 'back'], ['math', 'mat', 'mash'],
  ['when', 'hen', 'wet'], ['whip', 'hip', 'ship'], ['duck', 'dock', 'luck'],
  ['sock', 'sack', 'sick'], ['ring', 'rang', 'rug'], ['king', 'kin', 'sing'],
];
const BLEND_SETS = [
  ['frog', 'fog', 'from'], ['flag', 'flap', 'bag'], ['crab', 'cab', 'crib'],
  ['drum', 'drip', 'gum'], ['step', 'stem', 'pet'], ['swim', 'slim', 'him'],
  ['clap', 'cap', 'clip'], ['plan', 'pan', 'plum'], ['trip', 'tip', 'trap'],
  ['snap', 'sap', 'snip'], ['stop', 'top', 'step'], ['grin', 'grab', 'pin'],
];
const SENTENCES = [
  ['The frog can hop.', '🐸', '🐟', '🐶'],
  ['A fish is in the dish.', '🐟', '🐸', '🐔'],
  ['The ship is big.', '🚢', '🚗', '🐛'],
  ['I can see the duck.', '🦆', '🐱', '🐷'],
  ['She has a red hat.', '🎩', '👟', '🍎'],
  ['The cat is on the bed.', '🐱', '🐶', '🐸'],
  ['The crab is on the sand.', '🦀', '🐢', '🐌'],
  ['Then he will swim.', '🏊', '🚲', '🛌'],
];

function _wordRound(w, d) {
  return { prompt: `Which word says '${w}'?`, choices: [w, ...d], answer: w, hint: _belleHint(w, d) };
}
function _sightRound(w, pool, rng) {
  const others = pool.filter((x) => x !== w);
  const close = _shuffle(others.filter((x) => x[0] === w[0] || x.length === w.length), rng);
  const d = [...new Set([...close, ..._shuffle(others, rng)])].slice(0, 2);
  return _wordRound(w, d);
}
function _cvcRound(set) {
  const w = set[0];
  const sounds = w.split('').join(' - ');
  return {
    prompt: `Sound it out: ${sounds}. Which word is it?`,
    choices: set.slice(), answer: w,
    hint: `Good try! Say it slow with me: ${sounds}. Which one is it?`,
  };
}
function _sentenceRound([text, ans, d1, d2]) {
  return {
    prompt: `${text} Which picture matches?`,
    say: 'Read the words. Which picture matches?',
    choices: [ans, d1, d2], answer: ans,
    hint: `Good try! Read it with me: ${text} Which picture shows that?`,
  };
}

function _belleRounds(rng) {
  const easy = [...DOLCH_PREPRIMER, ...DOLCH_PRIMER];
  const sight = SCHOOL_WORDS.length >= 3 ? SCHOOL_WORDS.slice() : SIGHT_1ST;
  const t1 = rng() < 0.5 ? _cvcRound(_pick(CVC_SETS, rng)) : _sightRound(_pick(easy, rng), easy, rng);
  const dg = _pick(DIGRAPH_SETS, rng);
  const t2 = [_wordRound(dg[0], dg.slice(1)), _sightRound(_pick(sight, rng), [...sight, ...DOLCH_1ST], rng)];
  const bl = _pick(BLEND_SETS, rng);
  const t3 = _shuffle([_wordRound(bl[0], bl.slice(1)), _sentenceRound(_pick(SENTENCES, rng))], rng);
  return [t1, ..._shuffle(t2, rng), ...t3];
}

// Number choices: the answer plus specific mistakes first, then near misses.
function _numChoices(ans, rng, max = 20, mistakes = []) {
  const opts = new Set([ans]);
  for (const n of _shuffle(mistakes, rng)) { if (opts.size >= 2) break; if (n >= 0 && n !== ans) opts.add(n); }
  const near = _shuffle([ans - 1, ans + 1, ans - 2, ans + 2], rng);
  for (const n of near) { if (opts.size >= 3) break; if (n >= 0 && n <= Math.max(max, ans + 2)) opts.add(n); }
  return [...opts].map(String);
}

const _flakes = (n) => `${n} snowflake${n === 1 ? '' : 's'}`;
function _elsaWithin(rng, max) {
  const add = rng() < 0.5;
  if (add) {
    const a = 1 + Math.floor(rng() * (max - 1));
    const b = 1 + Math.floor(rng() * (max - a));
    return {
      prompt: `You have ${_flakes(a)}. ${b} more ${b === 1 ? 'falls' : 'fall'}. How many now?`,
      choices: _numChoices(a + b, rng, max, [Math.abs(a - b)]), answer: String(a + b),
      hint: `Good try! Count with me: ${_flakes(a)}, then ${b} more. How many?`,
      visual: { a, b, op: '+' },
    };
  }
  const a = 2 + Math.floor(rng() * (max - 1));
  const b = 1 + Math.floor(rng() * (a - 1));
  return {
    prompt: `You have ${_flakes(a)}. ${b} ${b === 1 ? 'melts' : 'melt'}. How many are left?`,
    choices: _numChoices(a - b, rng, max, a + b <= 20 ? [a + b] : []), answer: String(a - b),
    hint: `Good try! Start with ${_flakes(a)}. Cover ${b}. Count the rest.`,
    visual: { a, b, op: '-' },
  };
}
const MISSING = [[8, '+', 10], [6, '+', 9], [3, '+', 7, true], [10, '-', 6], [7, '+', 12], [9, '+', 15]];
function _missingRound([a, op, total, first], rng) {
  if (op === '-') {
    const ans = a - total;
    return {
      prompt: `${a} - ? = ${total}. What number is missing?`,
      choices: _numChoices(ans, rng, 20, [a + total]), answer: String(ans),
      hint: `Good try! Start at ${a}. Count back to ${total}. How many did you count?`,
      visual: { a, b: 0, op: '-' },
    };
  }
  const ans = total - a;
  return {
    prompt: first ? `? + ${a} = ${total}. What number is missing?` : `${a} + ? = ${total}. What number is missing?`,
    choices: _numChoices(ans, rng, 20, [a + total]), answer: String(ans),
    hint: `Good try! Start at ${a}. Count up to ${total}. How many did you count?`,
    visual: { a, b: 0, op: '+' },
  };
}
const TENS = [[1, 4], [1, 7], [2, 3], [3, 0], [4, 5]];
function _tensRound([t, o], rng) {
  const ans = t * 10 + o;
  const swapped = o * 10 + t;
  return {
    prompt: `${t} ten${t === 1 ? '' : 's'} and ${o} one${o === 1 ? '' : 's'}. What number is that?`,
    choices: _numChoices(ans, rng, 50, [swapped, t + o]), answer: String(ans),
    hint: o === 0
      ? 'Good try! Each bundle is 10. Count the bundles by tens. There are no loose ones.'
      : `Good try! Each bundle is 10. Count the bundles by tens, then add the ${o} loose one${o === 1 ? '' : 's'}.`,
    visual: { tens: t, ones: o },
  };
}
const MORE = [[23, 32], [41, 14], [19, 21]];
function _moreRound(pair, rng) {
  const [x, y] = _shuffle(pair, rng);
  const ans = Math.max(x, y);
  return {
    prompt: `Which is more: ${x} or ${y}?`,
    choices: [String(x), String(y)], answer: String(ans),
    hint: 'Good try! Look at the tens first. More tens means more.',
  };
}
const ADDENDS = [[2, 3, 5], [4, 4, 2], [6, 1, 3], [5, 5, 7]];
function _addendsRound(parts, rng) {
  const ans = parts.reduce((s, n) => s + n, 0);
  const [a, b, c] = parts;
  return {
    prompt: `${a} + ${b} + ${c} = ?`,
    choices: _numChoices(ans, rng, 20, [a + b, b + c]), answer: String(ans),
    hint: `Good try! Add two first: ${a} + ${b}. Then add ${c}.`,
    visual: { parts },
  };
}
function _elsaRounds(rng) {
  const t1 = _elsaWithin(rng, 10);
  const t2 = _shuffle([_elsaWithin(rng, 20), _missingRound(_pick(MISSING, rng), rng)], rng);
  const t3pool = [() => _tensRound(_pick(TENS, rng), rng), () => _moreRound(_pick(MORE, rng), rng),
    () => _addendsRound(_pick(ADDENDS, rng), rng)];
  const t3 = _sample(t3pool, 2, rng).map((f) => f());
  return [t1, ...t2, ...t3];
}

function _timeLabel(h, m) { return m === 0 ? `${h} o'clock` : `half past ${h}`; }
function _digital(h, m) { return `${h}:${m === 0 ? '00' : '30'}`; }
const _next = (h) => (h % 12) + 1;
const _prev = (h) => ((h + 10) % 12) + 1;
function _cinderellaRound(h, m, digital) {
  const lab = digital ? _digital : _timeLabel;
  const ans = lab(h, m);
  const opts = m === 0 ? [ans, lab(_next(h), 0), lab(_prev(h), 0)] : [ans, lab(h, 0), lab(_next(h), 30)];
  return {
    prompt: 'What time is the clock showing?',
    choices: opts, answer: ans,
    hint: m === 0
      ? "Good try! The long hand is on the 12. That means o'clock. Where is the short hand?"
      : 'Good try! The long hand is on the 6. That means half past. The short hand just passed which number?',
    clock: { hour: h, minute: m },
  };
}
function _cinderellaRounds(rng) {
  const hours = _shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], rng);
  const halfHours = hours.filter((h) => h !== 6); // 6:30: hands overlap, held back for now
  const half = hours.slice(3).filter((h) => h !== 6); // 6:30 held back: the hands overlap
  return [
    _cinderellaRound(hours[0], 0, false),
    ..._shuffle([_cinderellaRound(hours[1], 0, true), _cinderellaRound(hours[2], 0, false)], rng),
    ..._shuffle([_cinderellaRound(half[0], 30, false), _cinderellaRound(half[1], 30, true)], rng),
  ];
}


const _sci = (prompt, choices, hint) => ({ prompt, choices, answer: choices[0], hint });
const SCI_T1 = [
  _sci('Which part of the plant drinks water down in the soil?', ['🌱 Roots', '🌸 Petals', '🍃 Leaves'],
    'Good try! This part hides under the ground. What drinks the water?'),
  _sci('Little leaves reach up to catch the warm...', ['☀️ Sunlight', '❄️ Snow', '💨 Wind'],
    'Good try! It is warm and bright and comes from the sky.'),
];
const SCI_T2 = [
  _sci('When can we see the sun?', ['☀️ Day', '🌙 Night', '🚫 Never'], 'Good try! The sun is up when it is bright outside.'),
  _sci('When do we usually see stars?', ['🌙 Night', '🥪 Lunch', '🌅 Morning'], 'Good try! Stars twinkle when it is time for bed.'),
  _sci('The sun comes up in the...', ['🌅 Morning', '🌙 Night', '🛏️ Bedtime'], 'Good try! The sun comes up when we wake up.'),
  _sci('Does the moon always look the same?', ['🌗 No, it changes', '🌕 Yes, always round', '⬛ It is square'],
    'Good try! Some nights it is round, some nights it is thin. Does it change?'),
  _sci('Which days are longer?', ['🌞 Summer', '⛄ Winter', '🟰 Same'], 'Good try! The sun stays up late when it is warm outside.'),
];
const SCI_T3 = [
  _sci('What makes sound?', ['🥁 Something shaking', '😴 Something sleeping', '🧊 Something cold'],
    'Good try! Tap a drum. It wiggles and shakes. That makes sound!'),
  _sci('Light helps us...', ['👀 See', '👃 Smell', '👅 Taste'], 'Good try! We use our eyes with light.'),
  _sci('In a room with no light at all, can you see?', ['🙈 No', '👀 Yes', '🔴 Only red'],
    'Good try! We need light to see. With no light, can we see?'),
  _sci('A baby duck grows up to look like...', ['🦆 A duck', '🐱 A cat', '🐸 A frog'],
    'Good try! Babies grow up to look like their parents.'),
  _sci('Which part helps a plant drink?', ['🌱 Roots', '🌸 Petals', '🌰 Seeds'], 'Good try! This part is under the ground.'),
];
function _rapunzelRounds(rng) {
  const t1 = _pick(SCI_T1, rng);
  const t3pool = t1 === SCI_T1[0] ? SCI_T3.slice(0, 4) : SCI_T3;
  return [t1, ..._sample(SCI_T2, 2, rng), ..._sample(t3pool, 2, rng)];
}

export function buildRounds(npcId, rng = Math.random) {
  try {
    if (npcId === 'belle') return _belleRounds(rng);
    if (npcId === 'elsa') return _elsaRounds(rng);
    if (npcId === 'cinderella') return _cinderellaRounds(rng);
    if (npcId === 'rapunzel') return _rapunzelRounds(rng);
  } catch (e) {}
  return (QUESTS[npcId] && QUESTS[npcId].rounds) || [];
}
