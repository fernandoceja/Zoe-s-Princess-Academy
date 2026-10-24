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
import { PORTRAIT_BELLE } from './portrait-belle.js?v=20261023s4';
import { PORTRAIT_ELSA } from './portrait-elsa.js?v=20261023s4';
import { PORTRAIT_RAPUNZEL } from './portrait-rapunzel.js?v=20261023s4';
import { PORTRAIT_CINDERELLA } from './portrait-cinderella.js?v=20261023s4';
import { PORTRAIT_ZOE } from './portrait-zoe.js?v=20261023s4';

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

const PLANT_POOL = [
  ...QUESTS.rapunzel.rounds,
  {
    prompt: 'What does a flower need from the sky to grow?',
    choices: ['Sunlight', 'Shoes', 'Toys'],
    answer: 'Sunlight',
    hint: 'Good try! It is warm and bright and comes from the sun.',
  },
  {
    prompt: 'Which one is NOT a living thing?',
    choices: ['A tree', 'A bird', 'A spoon'],
    answer: 'A spoon',
    hint: 'Good try! Living things grow and eat. Which one never grows?',
  },
  {
    prompt: 'What grows on a stem and can be pretty colors?',
    choices: ['A flower', 'A rock', 'A cup'],
    answer: 'A flower',
    hint: 'Good try! Bees love to visit it. What is it?',
  },
  {
    prompt: 'A seed grows into a...',
    choices: ['Plant', 'Car', 'Cloud'],
    answer: 'Plant',
    hint: 'Good try! Seeds go in the soil. What pops up?',
  },
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

function _belleRounds(rng) {
  const all = [...DOLCH_PREPRIMER, ...DOLCH_PRIMER, ...DOLCH_1ST];
  const rounds = [];
  const words = _sample(all, 3, rng);
  for (const w of words) {
    // distractors: prefer words sharing first letter or length, else random
    const others = all.filter((x) => x !== w);
    const close = _shuffle(others.filter((x) => x[0] === w[0] || x.length === w.length), rng);
    const pool = [...close, ..._shuffle(others, rng)];
    const d = [...new Set(pool)].slice(0, 2);
    rounds.push({
      prompt: `Which word says '${w}'?`,
      choices: [w, ...d],
      answer: w,
      hint: _belleHint(w, d),
    });
  }
  for (const set of _sample(CVC_SETS, 2, rng)) {
    const w = set[0];
    const sounds = w.split('').join(' - ');
    rounds.push({
      prompt: `Sound it out: ${sounds}. Which word is it?`,
      choices: set.slice(),
      answer: w,
      hint: `Good try! Say it slow with me: ${sounds}. Which one is it?`,
    });
  }
  return _shuffle(rounds, rng);
}

function _numChoices(ans, rng, max = 20) {
  const opts = new Set([ans]);
  const near = _shuffle([ans - 1, ans + 1, ans - 2, ans + 2], rng);
  for (const n of near) { if (opts.size >= 3) break; if (n >= 0 && n <= max) opts.add(n); }
  return [...opts].map(String);
}

function _elsaRounds(rng) {
  const rounds = [];
  for (let i = 0; i < 5; i++) {
    const big = rng() < 0.2; // mostly within 10, sometimes up to 20 (1.OA.C.6)
    const max = big ? 20 : 10;
    const add = rng() < 0.5;
    let a, b, ans;
    if (add) {
      a = 1 + Math.floor(rng() * (max - 1));
      b = 1 + Math.floor(rng() * (max - a));
      ans = a + b;
      rounds.push({
        prompt: `You have ${a} snowflakes. ${b} more fall. How many now?`,
        choices: _numChoices(ans, rng, max),
        answer: String(ans),
        hint: `Good try! Count with me: ${a} snowflakes, then ${b} more. How many?`,
        visual: { a, b, op: '+' },
      });
    } else {
      a = 2 + Math.floor(rng() * (max - 1));
      b = 1 + Math.floor(rng() * (a - 1));
      ans = a - b;
      rounds.push({
        prompt: `You have ${a} snowflakes. ${b} melt. How many are left?`,
        choices: _numChoices(ans, rng, max),
        answer: String(ans),
        hint: `Good try! Start with ${a} snowflakes. Cover ${b}. Count the rest.`,
        visual: { a, b, op: '-' },
      });
    }
  }
  return rounds;
}

function _timeLabel(h, m) { return m === 0 ? `${h} o'clock` : `half past ${h}`; }

function _cinderellaRounds(rng) {
  const all = [];
  for (let h = 1; h <= 12; h++) { all.push([h, 0]); all.push([h, 30]); }
  return _sample(all, 5, rng).map(([h, m]) => {
    const ans = _timeLabel(h, m);
    const other = m === 0 ? _timeLabel(h, 30) : _timeLabel(h, 0);
    const h2 = (h % 12) + 1;
    const opts = [ans, other, _timeLabel(h2, m)];
    return {
      prompt: 'What time is the clock showing?',
      choices: opts,
      answer: ans,
      hint: m === 0
        ? "Good try! The long hand is on the 12. That means o'clock. Where is the short hand?"
        : 'Good try! The long hand is on the 6. That means half past. Half past what?',
      clock: { hour: h, minute: m },
    };
  });
}

export function buildRounds(npcId, rng = Math.random) {
  try {
    if (npcId === 'belle') return _belleRounds(rng);
    if (npcId === 'elsa') return _elsaRounds(rng);
    if (npcId === 'cinderella') return _cinderellaRounds(rng);
    if (npcId === 'rapunzel') return _sample(PLANT_POOL, 5, rng);
  } catch (e) {}
  return (QUESTS[npcId] && QUESTS[npcId].rounds) || [];
}
