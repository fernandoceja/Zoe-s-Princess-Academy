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
import { PORTRAIT_BELLE } from './portrait-belle.js?v=20261026s1';
import { PORTRAIT_ELSA } from './portrait-elsa.js?v=20261026s1';
import { PORTRAIT_RAPUNZEL } from './portrait-rapunzel.js?v=20261026s1';
import { PORTRAIT_CINDERELLA } from './portrait-cinderella.js?v=20261026s1';
import { PORTRAIT_ZOE } from './portrait-zoe.js?v=20261026s1';

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
    color: '#38bdf8',
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
// `pic: '🌿'` (Rapunzel/Belle: a picture that must not match any choice),
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
        pic: '🌿',
      },
      {
        prompt: 'The seed is tucked into soft, brown dirt. What is that called?',
        choices: ['Soil', 'Soup', 'Sand'],
        answer: 'Soil',
        hint: 'Good try! It is the dirt plants sleep in. What is it called?',
        pic: '🪴',
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
<div style="font-size:13px;margin-top:2px;color:#374151;">Counting on from the bigger number (CA CCSS 1.OA.5 and 1.OA.6) and doubles 1+1 to 5+5 (1.OA.6).</div>
</div>
<div style="padding:12px;border:1px solid #e5e7eb;border-radius:12px;background:#f0fdf4;">
<div style="font-weight:700;font-size:15px;">&#127803; Rapunzel &mdash; The Sleepy Garden</div>
<div style="font-size:13px;margin-top:4px;"><b>Standard:</b> Science: plants &amp; living things &mdash; NGSS 1-LS1 (CA); Math: measuring &mdash; CA CCSS 1.MD.1&ndash;2</div>
<div style="font-size:13px;margin-top:2px;color:#374151;">What plants need to grow (water, sunlight, soil) and living vs. nonliving things. Also measuring: comparing flower heights and counting petal units for length.</div>
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
<p style="margin:12px 0 0;font-size:13px;color:#374151;"><b>Tip:</b> for a clearer voice on iPhone or iPad, open Settings &rarr; Accessibility &rarr; Spoken Content &rarr; Voices &rarr; English, and download an Enhanced voice (for example Samantha). The game uses it automatically.</p>
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

// Which letter the Belle hint points at: a letter the right word has that NO
// wrong choice shares in the same spot (first letter, then last letter, then
// any position). Returns the index, or -1 when the hint is about length/spelling.
function _hintPos(w, distractors) {
  const differs = (i, ch) => distractors.every((d) => d[i] !== ch);
  if (differs(0, w[0])) return 0;
  const last = w[w.length - 1];
  if (distractors.every((d) => d[d.length - 1] !== last)) return w.length - 1;
  for (let i = 1; i < w.length; i++) if (differs(i, w[i])) return i;
  return -1;
}

// Belle hint: point at a letter the right word has that NO wrong choice shares
// in the same spot (first letter, then last letter, then any position).
export function _belleHint(w, distractors) {
  const i = _hintPos(w, distractors);
  const last = w[w.length - 1];
  if (i === 0) return `Good try! Let's look again. '${w}' starts with the letter ${w[0]}.`;
  if (i === w.length - 1) return `Good try! Let's look again. '${w}' ends with the letter ${last}.`;
  const ord = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh'];
  if (i > 0) return `Good try! Let's look again. The ${ord[i] || 'next'} letter in '${w}' is ${w[i]}.`;
  const lens = distractors.every((d) => d.length !== w.length);
  if (lens) return `Good try! Let's look again. '${w}' has ${w.length} letters.`;
  return `Good try! Let's look again. Spell it with me: ${w.split('').join(' - ')}.`;
}

// Belle's recorded phonics clips (repo-root assets/audio/EN/curriculum/belle/).
// A wrong answer plays the clip for the letter the hint points at, so Zoe hears
// the letter's SOUND (text-to-speech would say its name). Short vowels only
// (the 'o' clip says the long sound); no x or q.
export const BELLE_CLIP_DIR = '../assets/audio/EN/curriculum/belle/';
const LETTER_CLIPS = {
  a: 'a_says_ah_apple', b: 'b_says_buh_ball', c: 'c_says_kuh_cat', d: 'd_says_duh_dog',
  e: 'e_says_eh_egg', f: 'f_says_fuh_fish', g: 'g_says_guh_goat', h: 'h_says_huh_hat',
  i: 'i_says_ih_igloo', j: 'j_says_juh_jar', k: 'k_says_kuh_kite', l: 'l_says_luh_lion',
  m: 'm_says_mmm_moon', n: 'n_says_nuh_nest', p: 'p_says_puh_pig', r: 'r_says_ruh_rainbow',
  s: 's_says_sss_sun', t: 't_says_tuh_turtle', u: 'u_says_uh_umbrella', v: 'v_says_vuh_van',
  w: 'w_says_wuh_wagon', y: 'y_says_yuh_yarn', z: 'z_says_zzz_zebra',
};
const DIGRAPH_CLIPS = {
  sh: 's_h_says_shh_ship', ch: 'c_h_says_chh_chair', th: 't_h_says_thh_three',
  wh: 'w_h_says_wuh_wheel', ck: 'c_k_says_kuh_clock', ng: 'n_g_says_ing_ring',
};
// Tap-to-blend: seconds at which a letter's clip is cut so Zoe hears "c says kuh"
// but not "cat" (the stop sits in the pause before the example word). e and s have
// no such pause, so they play whole. o (clip is the long sound) and x (no clip)
// speak a sound spelling with text-to-speech instead.
export const BLEND_STOP = {
  a: 0.59, b: 0.76, c: 0.85, d: 0.85, f: 0.79, g: 0.96, h: 0.8, i: 0.62, j: 0.96, k: 0.95,
  l: 0.92, m: 1.51, n: 0.95, p: 0.86, r: 0.96, t: 0.68, u: 0.83, v: 0.99, w: 1.04, y: 0.7, z: 1.3,
};
export const BLEND_WHOLE = ['e', 's'];
export const BLEND_TTS = { o: 'ah', x: 'ks' };
/** How to voice one tile letter: { url, stopAt } | { tts } | undefined. */
export function tileSound(l) {
  if (BLEND_TTS[l]) return { tts: BLEND_TTS[l] };
  if (!LETTER_CLIPS[l]) return undefined;
  return { url: BELLE_CLIP_DIR + LETTER_CLIPS[l] + '.mp3', stopAt: BLEND_STOP[l] };
}
export const BELLE_CLIPS = [...Object.values(LETTER_CLIPS), ...Object.values(DIGRAPH_CLIPS)].map((c) => c + '.mp3');

// Clip file for the letter the hint points at, or undefined when none fits
// (or when the clip's example word would give the answer away).
export function _belleSound(w, distractors) {
  const i = _hintPos(w, distractors);
  if (i < 0) return undefined;
  let clip;
  for (const at of [i - 1, i]) {
    const dg = at >= 0 && at + 1 < w.length ? DIGRAPH_CLIPS[w[at] + w[at + 1]] : undefined;
    if (dg) { clip = dg; break; }
  }
  if (!clip) clip = LETTER_CLIPS[w[i]];
  if (!clip) return undefined;
  const example = clip.split('_').pop();
  if (example === w || distractors.includes(example)) return undefined;
  return clip + '.mp3';
}

// ============================================================================
// FIRST-GRADE CONTENT (Step 4). Three tiers per land: T1 easy, T2 core,
// T3 stretch. The ladder (js/ladder.js) picks the tier for each play.
// Optional round extras: `say` (what is read aloud, when it must differ from
// the prompt, e.g. Belle sentences she reads herself), `visual` (Elsa),
// `clock` (Cinderella), `pic` (emoji picture shown above the choices).
// ============================================================================

// A parent can replace this with the class's own word list (e.g. Wonders
// high-frequency words). When empty, the Dolch first-grade list below is used.
export const SCHOOL_WORDS = [];

/** Clean a grown-up's typed list: split on commas/newlines, trim, lowercase,
 *  letters and apostrophes only, 1-12 chars, no repeats, at most 30 words. */
export function cleanWordList(input) {
  const parts = Array.isArray(input) ? input : String(input == null ? '' : input).split(/[,\n\r;]+/);
  const out = [];
  for (const p of parts) {
    const w = String(p).trim().toLowerCase();
    if (/^[a-z']{1,12}$/.test(w) && /[a-z]/.test(w) && !out.includes(w)) out.push(w);
    if (out.length >= 30) break;
  }
  return out;
}
/** Set (or with [] clear) the class word list. Belle's Core level uses it at 3+ words. */
export function setSchoolWords(list) {
  SCHOOL_WORDS.length = 0;
  SCHOOL_WORDS.push(...cleanWordList(list));
  return SCHOOL_WORDS.slice();
}
// ---- This week's school pack (S1). A grown-up edits it in Parent Corner. ----
export const WEEK_DEFAULT = {
  spelling: ['lend', 'send', 'fast', 'sink', 'past'],
  sight: ['of', 'he'],
  dictation: 'Can he run past the tent?',
  vowels: ['sat', 'hip', 'pen', 'log', 'nut']
};
/** Live pack; updated in place by setWeek. */
export const WEEK = {
  spelling: WEEK_DEFAULT.spelling.slice(),
  sight: WEEK_DEFAULT.sight.slice(),
  dictation: WEEK_DEFAULT.dictation,
  vowels: WEEK_DEFAULT.vowels.slice()
};
function _weekList(input) {
  const parts = Array.isArray(input) ? input : String(input == null ? '' : input).split(/[,\n\r;]+/);
  const out = [];
  for (const p of parts) {
    const w = String(p).trim().toLowerCase();
    if (/^[a-z]{1,12}$/.test(w) && !out.includes(w)) out.push(w);
    if (out.length >= 15) break;
  }
  return out;
}
function _weekSentence(input) {
  const t = String(input == null ? '' : input).trim().replace(/\s+/g, ' ');
  return t.length <= 60 && /^[A-Z][A-Za-z', ]*[.?!]$/.test(t) && /[a-z]/.test(t) ? t : '';
}
/** Clean a pack: bad or empty fields fall back to the default. Returns a fresh object. */
export function cleanWeek(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const list = (v, d) => { const l = _weekList(v); return l.length ? l : d.slice(); };
  return {
    spelling: list(r.spelling, WEEK_DEFAULT.spelling),
    sight: list(r.sight, WEEK_DEFAULT.sight),
    dictation: _weekSentence(r.dictation) || WEEK_DEFAULT.dictation,
    vowels: list(r.vowels, WEEK_DEFAULT.vowels)
  };
}
/** Set the live pack (null resets to defaults). Returns a copy. */
export function setWeek(raw) {
  const c = cleanWeek(raw);
  WEEK.spelling = c.spelling; WEEK.sight = c.sight; WEEK.dictation = c.dictation; WEEK.vowels = c.vowels;
  return cleanWeek(WEEK);
}
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
  ['The frog can hop.', '🐸', '🐟', '🐶', 'the frog'],
  ['A fish is in the dish.', '🐟', '🐸', '🐔', 'the fish'],
  ['The ship is big.', '🚢', '🚗', '🐛', 'the ship'],
  ['I can see the duck.', '🦆', '🐱', '🐷', 'the duck'],
  ['She has a red hat.', '🎩', '👟', '🍎', 'the red hat'],
  ['The cat is on the bed.', '🐱', '🐶', '🐸', 'the cat on the bed'],
  ['The crab is on the sand.', '🦀', '🐢', '🐌', 'the crab'],
  ['Then he will swim.', '🏊', '🚲', '🛌', 'the swimmer'],
];

function _wordRound(w, d) {
  const r = { prompt: `Which word says '${w}'?`, choices: [w, ...d], answer: w, hint: _belleHint(w, d) };
  const sound = _belleSound(w, d);
  if (sound) r.sound = sound;
  return r;
}
function _sightRound(w, pool, rng) {
  const others = pool.filter((x) => x !== w);
  const close = _shuffle(others.filter((x) => x[0] === w[0] || x.length === w.length), rng);
  const d = [...new Set([...close, ..._shuffle(others, rng)])].slice(0, 2);
  // Sight words are not decodable (know, give, here), so no letter-sound clip.
  const { sound, ...r } = _wordRound(w, d);
  return r;
}
function _cvcRound(set) {
  const w = set[0];
  const d = set.slice(1);
  // `say` skips the letters: text-to-speech would read them as names (see, ay, tee).
  const r = {
    prompt: `Sound it out: ${w.split('').join(' - ')}. Which word is it?`,
    say: 'Sound it out. Which word is it?',
    choices: set.slice(), answer: w,
    hint: _belleHint(w, d),
    tiles: w.split(''), // tap-to-blend letter tiles (ui.js)
  };
  const sound = _belleSound(w, d);
  if (sound) r.sound = sound;
  return r;
}
function _sentenceRound([text, ans, d1, d2, answerSay]) {
  return {
    answerSay,
    prompt: `${text} Which picture matches?`,
    say: 'Read the words. Which picture matches?',
    // 🔊 replay reads the sentence too (the opening voice does not).
    replay: `${text} Which picture matches?`,
    choices: [ans, d1, d2], answer: ans,
    hint: `Good try! Read it with me: ${text} Which picture shows that?`,
  };
}

// ---- Spelling and short-vowel rounds (S2). They read WEEK when a round is made, so Parent Corner edits apply. ----
const _VOWELS = ['a', 'e', 'i', 'o', 'u'];
const _ENDINGS = ['nd', 'nt', 'st', 'nk', 'sk', 'mp', 'ft', 'lt', 'ld', 'lp', 'ng'];
const _MORE_WORDS = ['lent', 'lest', 'left', 'lift', 'list', 'lens', 'lint', 'link', 'sent', 'sand', 'band', 'bend', 'best',
  'bent', 'bust', 'dust', 'fist', 'fest', 'test', 'tent', 'tend', 'mend', 'mask', 'mast', 'must', 'nest', 'next', 'pant',
  'pest', 'pink', 'pond', 'rank', 'rent', 'rest', 'rust', 'sank', 'sunk', 'silk', 'sick', 'task', 'talk', 'wink', 'wind',
  'went', 'west', 'jump', 'just', 'lamp', 'lump', 'limp', 'hump', 'help', 'held', 'hold', 'hand', 'land', 'last', 'lust',
  'loft', 'soft', 'felt', 'fend', 'find', 'fund', 'kind', 'mind', 'fond', 'cast', 'cost', 'fact', 'fans', 'sing', 'song',
  'long', 'lung', 'sink', 'send', 'lend', 'fast', 'past', 'pasta', 'sit', 'set', 'sat', 'sap', 'sip', 'sup'];
let _known = null;
// Real words we already know, so a wrong choice is not accidentally also a word.
function _isRealWord(w) {
  if (!_known) {
    _known = new Set([..._MORE_WORDS, ...SIGHT_1ST, ...DOLCH_PREPRIMER, ...DOLCH_PRIMER, ...DOLCH_1ST,
      ...DIGRAPH_SETS.flat(), ...BLEND_SETS.flat(), ...CVC_SETS.flat()]);
  }
  return _known.has(w);
}
function _vowelIndex(w) {
  const at = [];
  for (let i = 0; i < w.length; i++) if (_VOWELS.includes(w[i])) at.push(i);
  return at.length === 1 ? at[0] : -1; // one clear vowel only, so the blank has one answer
}
function _vowelRound(w, rng) {
  const i = _vowelIndex(w);
  const v = w[i];
  const others = _shuffle(_VOWELS.filter((x) => x !== v), rng).slice(0, 2);
  const where = i === 0 ? 'at the start' : i === w.length - 1 ? 'at the end' : 'in the middle';
  const r = {
    prompt: 'Listen. Which letter is missing?', // the word is spoken, not shown (showing it gives the answer away)
    say: `Listen: ${w}. Which letter is missing?`,
    show: w.split('').map((c, k) => (k === i ? '_' : c)).join(' '),
    choices: [v, ...others], answer: v,
    // Shown hint never spells the word; the spoken hint (hintSay) can say it.
    hint: `Good try! Listen again and say it slowly. What sound do you hear ${where}?`,
    hintSay: `Good try! Say it slowly: ${w}. What sound do you hear ${where}?`,
  };
  if (v !== 'o') r.sound = LETTER_CLIPS[v] + '.mp3'; // the 'o' clip says the long sound
  return r;
}
function _endingRound(w, rng) {
  const end = w.slice(-2);
  const start = w.slice(0, -2);
  let pool = _shuffle(_ENDINGS.filter((e) => e !== end), rng);
  const notWords = pool.filter((e) => !_isRealWord(start + e));
  pool = [...notWords, ...pool.filter((e) => !notWords.includes(e))];
  const d = pool.slice(0, 2);
  return {
    prompt: 'Listen. Which ending finishes the word?',
    say: `Listen: ${w}. Which ending finishes the word?`,
    show: `${start.split('').join(' ')} _ _`,
    choices: [end, ...d], answer: end,
    hint: 'Good try! Listen again and say it slowly. Which letters do you hear at the end?',
    hintSay: `Good try! Say it slowly: ${w}. Which letters do you hear at the end?`,
  };
}
const _LOOKALIKE = { b: 'd', d: 'b', p: 'q', m: 'n', n: 'm', e: 'a', a: 'e', i: 'e', o: 'u', u: 'o', s: 'c', t: 'd' };
function _misspellings(w, rng) {
  const main = new Set(), drops = new Set(), last = [w + w[w.length - 1], 'x' + w];
  for (let i = 0; i + 1 < w.length; i++) main.add(w.slice(0, i) + w[i + 1] + w[i] + w.slice(i + 2)); // swapped neighbors
  for (let i = 0; i < w.length; i++) if (_LOOKALIKE[w[i]]) main.add(w.slice(0, i) + _LOOKALIKE[w[i]] + w.slice(i + 1));
  if (w.length > 3) for (let i = 1; i < w.length; i++) drops.add(w.slice(0, i) + w.slice(i + 1)); // a letter missing
  const ok = (x) => x !== w;
  const tiers = [[...main], [...drops], last].map((a) => a.filter(ok));
  const out = [];
  // Made-up spellings first, then ones that happen to be real words, so no wrong choice is a different word if avoidable.
  for (const real of [false, true]) {
    for (const t of tiers) {
      for (const x of _shuffle(t.filter((y) => _isRealWord(y) === real), rng)) if (!out.includes(x)) out.push(x);
    }
  }
  return out.slice(0, 2);
}
const _ALPHA = 'abcdefghijklmnopqrstuvwxyz'.split('');
function _spellRound(w, rng) {
  const spare = _shuffle(_ALPHA.filter((l) => !w.includes(l)), rng).slice(0, 2);
  let tiles = _shuffle([...w.split(''), ...spare], rng);
  for (let k = 0; k < 6 && tiles.join('').startsWith(w); k++) tiles = _shuffle(tiles, rng);
  return {
    prompt: 'Listen and build the word.',
    say: `Listen: ${w}. Tap the letters to build the word.`,
    replay: `Listen: ${w}. Tap the letters to build the word.`,
    choices: [w, ..._misspellings(w, rng)], answer: w,
    hint: 'Good try! Listen again and say it slowly. What sound comes next?',
    hintSay: `Good try! Say it slowly: ${w}. What sound comes next?`,
    spell: { word: w, tiles },
  };
}
/** A spelling round for this tier from the live WEEK pack, or null when the pack has no fitting word. */
function _spellKind(tier, rng) {
  const list = tier === 1 ? WEEK.vowels.filter((w) => _vowelIndex(w) >= 0)
    : tier === 2 ? WEEK.spelling.filter((w) => w.length >= 3)
    : WEEK.spelling.filter((w) => w.length >= 2);
  if (!list.length) return null;
  const w = _pick(list, rng);
  return tier === 1 ? _vowelRound(w, rng) : tier === 2 ? _endingRound(w, rng) : _spellRound(w, rng);
}

// ---- Dictation sentence rounds (S3). They read WEEK.dictation when a round is made. ----
// Extra practice sentences (sight words "of" and "he", plus short-vowel words), each 8 words or fewer.
export const DICTATION_PRACTICE = [
  'He has a box of pens.',
  'He can sit on top of the log.',
  'Did he get a bag of nuts?',
];
const _SWAP_EXTRA = ['he', 'she', 'we', 'me', 'be', 'ten', 'tan', 'tin', 'ran', 'run', 'rug', 'rub', 'bun', 'pan', 'pen', 'pin', 'pig', 'peg',
  'pat', 'pit', 'pot', 'put', 'cat', 'cut', 'cot', 'can', 'cap', 'cup', 'big', 'bag', 'beg', 'bug', 'box', 'fox', 'fix', 'hen', 'hat', 'hit',
  'hut', 'hot', 'hop', 'hip', 'has', 'his', 'had', 'hid', 'sad', 'sit', 'set', 'sat', 'sap', 'sip', 'mat', 'met', 'map', 'mop', 'mud', 'net',
  'nut', 'not', 'nap', 'log', 'leg', 'lag', 'lip', 'lap', 'top', 'tip', 'tap', 'tub', 'tug', 'dog', 'dig', 'dug', 'den', 'did', 'dip', 'jet',
  'jam', 'job', 'win', 'wet', 'web', 'wig', 'yes', 'yet', 'zip', 'got', 'get', 'gum', 'gas', 'bat', 'bit', 'bet', 'bad', 'bed', 'bud', 'red',
  'rat', 'rot', 'run', 'rim', 'ram', 'van', 'vet', 'fan', 'fun', 'fat', 'fit', 'fig', 'fin', 'lot', 'lid', 'kid', 'kit', 'sun', 'sum', 'sob',
  'pest', 'tent', 'test', 'tend', 'past', 'pass', 'fast', 'last', 'mast', 'mist', 'must', 'mask', 'task', 'hand', 'band', 'land', 'sand'];
let _swapPool = null;
function _swapWords() {
  if (!_swapPool) {
    _swapPool = [...new Set([..._SWAP_EXTRA, ..._MORE_WORDS, ...CVC_SETS.flat(), ...BLEND_SETS.flat()])]
      .filter((w) => /^[a-z]{2,5}$/.test(w));
  }
  return _swapPool;
}
// True when a and b are one letter apart (swap, add or drop one letter).
function _oneEdit(a, b) {
  if (a === b || Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  if (a.length === b.length) return a.slice(i + 1) === b.slice(i + 1);
  const [lo, hi] = a.length < b.length ? [a, b] : [b, a];
  return lo.slice(i) === hi.slice(i + 1);
}
/** Split a sentence into { words (no commas), toks (comma kept), end }. */
function _parseSentence(text) {
  const t = String(text).trim().replace(/\s+/g, ' ');
  const end = t.slice(-1);
  const toks = t.slice(0, -1).trim().split(' ').filter(Boolean);
  const words = toks.map((x) => x.replace(/,/g, ''));
  return { toks, words, end };
}
function _capFirst(w) { return w.charAt(0).toUpperCase() + w.slice(1); }
/** Two other versions of the sentence, each with exactly one word swapped. Never equals the sentence. */
export function dictationVariants(text, rng) {
  const { toks, words, end } = _parseSentence(text);
  const lower = words.map((w) => w.toLowerCase());
  const pool = _swapWords();
  const cands = [];
  words.forEach((w, i) => {
    const lw = lower[i];
    for (const alt of pool) {
      if (alt !== lw && _oneEdit(lw, alt) && !lower.includes(alt)) cands.push({ i, alt, big: lw.length >= 3 });
    }
  });
  const pickFrom = (list, used) => {
    const fresh = list.filter((c) => !used.some((u) => u.i === c.i)); // different spot each time when possible
    const src = fresh.length ? fresh : list.filter((c) => !used.some((u) => u.i === c.i && u.alt === c.alt));
    return src.length ? _pick(src, rng) : null;
  };
  const out = [];
  for (const group of [cands.filter((c) => c.big), cands]) {
    while (out.length < 2) {
      const c = pickFrom(group, out);
      if (!c) break;
      out.push(c);
    }
  }
  // No near word fits (an unusual sentence): swap in any short word that is not in it.
  for (let k = 0; out.length < 2 && k < 60; k++) {
    const i = Math.floor(rng() * words.length);
    const alt = _pick(pool, rng);
    if (!lower.includes(alt) && !out.some((u) => u.i === i && u.alt === alt)) out.push({ i, alt });
  }
  const build = (c) => {
    const t2 = toks.slice();
    const comma = /,$/.test(toks[c.i]) ? ',' : '';
    t2[c.i] = (c.i === 0 ? _capFirst(c.alt) : c.alt) + comma;
    return t2.join(' ') + end;
  };
  return out.slice(0, 2).map(build);
}
const _END_SAY = { '?': 'question mark', '.': 'period', '!': 'exclamation mark' };
const _END_HINT = {
  '?': 'Is it asking something? Then it ends with a question mark.',
  '.': 'Is it telling something? Then it ends with a period.',
  '!': 'Is it a big, excited sentence? Then it ends with an exclamation mark.',
};
function _dictRound(tier, rng) {
  const useWeek = rng() < 0.5;
  const text = useWeek ? WEEK.dictation : _pick(DICTATION_PRACTICE, rng);
  const { words, end } = _parseSentence(text);
  const variants = dictationVariants(text, rng);
  const answer = String(text).trim().replace(/\s+/g, ' ');
  const spoken = answer;
  const r = { choices: [answer, ...variants], answer };
  if (tier === 1) {
    return {
      ...r,
      prompt: 'Which sentence did you hear?',
      say: `Listen. ${spoken} Which sentence did you hear?`,
      replay: spoken,
      hint: 'Good try! Listen again. Which words did you hear?',
      hintSay: `Good try! Listen again. ${spoken}`,
    };
  }
  const target = words.map((w, i) => (i === 0 ? w : /^I(['’].*)?$/.test(w) ? w : w.toLowerCase()));
  const spare = [];
  if (tier === 2) {
    const extra = ['of', ...WEEK.sight, 'he', 'at'].find((w) => !target.some((t) => t.toLowerCase() === w));
    if (extra) spare.push(extra);
  } else {
    if (target[0] !== target[0].toLowerCase()) spare.push(target[0].toLowerCase());
    else spare.push(_capFirst(target[0]));
    for (const m of ['.', '?', '!']) if (m !== end) spare.push(m);
  }
  const full = tier === 3 ? [...target, end] : target;
  let tiles = _shuffle([...full, ...spare], rng);
  for (let k = 0; k < 8 && (tiles.slice(0, full.length).join('|') === full.join('|')); k++) tiles = _shuffle(tiles, rng);
  const more = `Good try! Listen again. ${spoken}`;
  return {
    ...r,
    prompt: tier === 2 ? 'Listen and build the sentence.' : 'Listen. Build the sentence with a capital and an end mark.',
    say: `Listen. ${spoken} ${tier === 2 ? 'Tap the words to build the sentence.' : 'Tap the words to build it. Start with a capital letter and finish with the right end mark.'}`,
    replay: spoken,
    hint: 'Good try! Listen again. Which word comes next?',
    hintSay: more,
    build: tier === 2
      ? { tiles, target, end, sentence: true }
      : { tiles, target: full, sentence: true,
          hints: { first: 'Good try! A sentence starts with a capital letter.', last: `Good try! ${_END_HINT[end]}` } },
  };
}
export const END_MARK_SAY = _END_SAY;


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

// ---- Count on (CA 1.OA.5 / 1.OA.6) and doubles (1.OA.6): about half of Elsa's rounds ----
const _nz = (list, ans) => (list.includes('0') ? [...list.filter((x) => x !== '0'), String(ans + 3)] : list);
function _countOnHint(big, s) {
  const seq = [];
  for (let i = 1; i < s; i++) seq.push(big + i);
  const tail = s === 1 ? 'What number comes right after?' : `${seq.join(', ')}, then one more.`;
  return `Good try! Start with the bigger number, ${big}. Count on ${s}: ${tail}`;
}
function _countOnRound(tier, rng) {
  const sm = 1 + Math.floor(rng() * 3);
  const big = (sm + 1) + Math.floor(rng() * (20 - sm - sm));   // big in [sm+1, 20-sm]
  const sum = big + sm;
  const flip = tier >= 2 && rng() < 0.5;                        // tier 1 always bigger first
  const [x, y] = flip ? [sm, big] : [big, sm];
  if (tier === 3 && rng() < 0.5) {
    const other = _shuffle([big - 1, big + 1, sum].filter((n) => n !== sm && n !== big && n >= 1), rng)[0];
    return {
      prompt: `Which number do you start with for ${x} + ${y}?`,
      say: `Which number do you start with for ${x} plus ${y}?`,
      choices: _shuffle([String(big), String(sm), String(other)], rng), answer: String(big),
      hint: `Good try! Start with the bigger number. Which is bigger, ${sm} or ${big}?`,
    };
  }
  const r = {
    choices: _nz(_numChoices(sum, rng, 20, [sum + 1, sum - 1]), sum), answer: String(sum),
    hint: _countOnHint(big, sm),
  };
  if (tier === 1) {
    r.prompt = `Start at ${big} and count on ${sm}. What is ${big} + ${sm}?`;
    r.say = `Start at ${big} and count on ${sm}. What is ${big} plus ${sm}?`;
  } else {
    r.prompt = `What is ${x} + ${y}?`;
    r.say = `What is ${x} plus ${y}?`;
  }
  if (tier <= 2) r.visual = { kind: 'counton', start: big, hop: sm };
  return r;
}
function _doublesRound(tier, rng) {
  const n = 1 + Math.floor(rng() * 5), sum = 2 * n;
  if (tier === 3 && rng() < 0.5) {
    const others = _shuffle([1, 2, 3, 4, 5].filter((k) => k !== n), rng).slice(0, 2);
    return {
      prompt: `Which double makes ${sum}?`,
      choices: _shuffle([n, ...others].map((k) => `${k} + ${k}`), rng), answer: `${n} + ${n}`,
      hint: `Good try! A double is the same number twice. Which number, added to itself, makes ${sum}?`,
    };
  }
  const r = {
    prompt: `What is ${n} + ${n}?`, say: `What is ${n} plus ${n}?`,
    choices: _nz(_numChoices(sum, rng, 10, [sum + 1, sum - 1, n]), sum), answer: String(sum),
    hint: `Good try! A double is the same number twice. Count ${n} and ${n} more.`,
  };
  if (tier <= 2) r.visual = { kind: 'doubles', n, style: tier === 1 ? 'flakes' : 'frames' };
  return r;
}
function _elsaNew(tier, rng) {
  return rng() < 0.5 ? _countOnRound(tier, rng) : _doublesRound(tier, rng);
}
const MISSING = [[8, '+', 10], [6, '+', 9], [3, '+', 7, true], [10, '-', 6], [7, '+', 12], [9, '+', 15]];
function _missingRound([a, op, total, first], rng) {
  if (op === '-') {
    const ans = a - total;
    return {
      prompt: `${a} - ? = ${total}. What number is missing?`,
      say: `${a} take away what number makes ${total}?`,
      choices: _numChoices(ans, rng, 20, [a + total]), answer: String(ans),
      hint: `Good try! Start at ${a}. Count back to ${total}. How many did you count?`,
      visual: { a, b: 0, op: '-' },
    };
  }
  const ans = total - a;
  return {
    prompt: first ? `? + ${a} = ${total}. What number is missing?` : `${a} + ? = ${total}. What number is missing?`,
    say: first ? `What number plus ${a} makes ${total}?` : `${a} plus what number makes ${total}?`,
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
    say: `What is ${a} plus ${b} plus ${c}?`,
    choices: _numChoices(ans, rng, 20, [a + b, b + c]), answer: String(ans),
    hint: `Good try! Add two first: ${a} + ${b}. Then add ${c}.`,
    visual: { parts },
  };
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


const _sci = (prompt, choices, hint, pic) => (pic ? { prompt, choices, answer: choices[0], hint, pic } : { prompt, choices, answer: choices[0], hint });
const SCI_T1 = [
  _sci('Which part of the plant drinks water down in the soil?', ['🌱 Roots', '🌸 Petals', '🍃 Leaves'],
    'Good try! This part hides under the ground. What drinks the water?'),
  _sci('Little leaves reach up to catch the warm...', ['☀️ Sunlight', '❄️ Snow', '💨 Wind'],
    'Good try! It is warm and bright and comes from the sky.', '🌿'),
  // More kindergarten plant warm-ups, so a T1 quest has 5 different rounds.
  _sci('A sleepy seed wants to grow. What does it drink?', ['💧 Water', '🧃 Juice', '🥛 Milk'],
    'Good try! It falls from the clouds as rain.'),
  _sci('Which one is a living thing?', ['🌸 A flower', '🪨 A rock', '👟 A shoe'],
    'Good try! Living things grow. Which one grows?'),
  _sci('A seed grows into a...', ['🌱 Plant', '🚗 Car', '☁️ Cloud'],
    'Good try! Seeds go in the soil. What pops up?'),
  _sci('The seed is tucked into soft, brown dirt. What is that called?', ['🟫 Soil', '🍲 Soup', '🏖️ Sand'],
    'Good try! Plants grow in it, and worms live in it too.', '🪴'),
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
  _sci('Light helps us...', ['👀 See', '👃 Smell', '👅 Taste'], 'Good try! We use our eyes with light.', '💡'),
  _sci('In a room with no light at all, can you see?', ['🙈 No', '👀 Yes', '🔴 Only red'],
    'Good try! We need light to see. With no light, can we see?'),
  _sci('A baby duck grows up to look like...', ['🦆 A duck', '🐱 A cat', '🐸 A frog'],
    'Good try! Babies grow up to look like their parents.'),
  _sci('Which part helps a plant drink?', ['🌱 Roots', '🌸 Petals', '🌰 Seeds'], 'Good try! This part is under the ground.'),
];

// Measuring rounds (CA 1.MD.1-2): compare flower heights, count petal units.
// Each carries a plain-data `visual` so it survives the review queue.
const FLOWER_COLORS = {
  pink: { emoji: '🌸', name: 'pink' },
  yellow: { emoji: '🌼', name: 'yellow' },
  purple: { emoji: '💜', name: 'purple' },
  blue: { emoji: '💙', name: 'blue' },
};
function _flowerLabel(c) { return `${FLOWER_COLORS[c].emoji} The ${FLOWER_COLORS[c].name} one`; }
// n flowers of clearly different heights (at least 2 units apart), random colors.
function _flowerSet(n, rng) {
  const pool = n === 3 && rng() < 0.4 ? [3, 5, 7] : [2, 4, 6, 8];
  const heights = _shuffle(pool, rng).slice(0, n);
  const colors = _shuffle(Object.keys(FLOWER_COLORS), rng).slice(0, n);
  return { heights, colors };
}
function _measureRound(tier, rng) {
  if (tier === 3) {
    const len = 3 + Math.floor(rng() * 6);
    const other = len > 3 ? [len - 1, len + 1] : [len + 1, len + 2];
    const label = (n) => `🌸 ${n} petals`;
    return {
      prompt: 'How many petals long is the stem?',
      choices: [label(len), ...other.map(label)],
      answer: label(len),
      hint: 'Good try! Count the petals from the bottom to the top.',
      visual: { kind: 'units', length: len },
    };
  }
  if (tier === 1) {
    const { heights, colors } = _flowerSet(2, rng);
    const taller = rng() < 0.5;
    const win = heights[0] > heights[1] === taller ? 0 : 1;
    return {
      prompt: taller ? 'Which flower is taller?' : 'Which flower is shorter?',
      choices: [_flowerLabel(colors[win]), _flowerLabel(colors[1 - win])],
      answer: _flowerLabel(colors[win]),
      hint: taller ? 'Good try! Look at the tops. Which one reaches higher?' : 'Good try! Look at the tops. Which one stops lower?',
      visual: { kind: 'flowers', heights, colors },
    };
  }
  const { heights, colors } = _flowerSet(3, rng);
  const tallest = rng() < 0.5;
  const target = tallest ? Math.max(...heights) : Math.min(...heights);
  const w = heights.indexOf(target);
  return {
    prompt: tallest ? 'Which flower is the tallest?' : 'Which flower is the shortest?',
    choices: [w, ...[0, 1, 2].filter((i) => i !== w)].map((i) => _flowerLabel(colors[i])),
    answer: _flowerLabel(colors[w]),
    hint: tallest ? 'Good try! Look at the tops. Which one reaches the highest?' : 'Good try! Look at the tops. Which one stops the lowest?',
    visual: { kind: 'flowers', heights, colors },
  };
}

// Sorting bins: kid-obvious living / not living pictures (plain JSON; saved in the review queue).
const SORT_ITEMS = [
  ['🐶', 'dog', 1], ['🐱', 'cat', 1], ['🐦', 'bird', 1], ['🐟', 'fish', 1],
  ['🌳', 'tree', 1], ['🌻', 'flower', 1], ['🐸', 'frog', 1], ['🦋', 'butterfly', 1],
  ['🪨', 'rock', 0], ['👟', 'shoe', 0], ['⚽', 'ball', 0], ['🚗', 'car', 0],
  ['🥄', 'spoon', 0], ['🪑', 'chair', 0], ['📚', 'book', 0], ['🧸', 'teddy bear', 0],
].map(([pic, name, living]) => ({ pic, name, living: !!living }));
function _sortRound(tier, rng) {
  const n = tier + 2;
  const nLiving = 1 + Math.floor(rng() * (n - 1));
  const pick = (living, k) => _shuffle(SORT_ITEMS.filter((i) => i.living === living), rng).slice(0, k);
  const items = _shuffle([...pick(true, nLiving), ...pick(false, n - nLiving)], rng).map((i) => ({ ...i }));
  return {
    prompt: 'Is it living or not living?',
    choices: ['🌱 Living', '🪨 Not living'],
    answer: '🌱 Living',
    hint: 'Good try! Does it need water to grow?',
    sort: { items },
  };
}
const _sciOr = (tier, set) => (rng) => {
  const x = rng();
  return x < 0.25 ? _measureRound(tier, rng) : x < 0.45 ? _sortRound(tier, rng) : _pick(set, rng);
};

// One round generator per tier, per land.
const TIERS = {
  belle: {
    1: (rng) => {
      const easy = [...DOLCH_PREPRIMER, ...DOLCH_PRIMER];
      return rng() < 0.5 ? _cvcRound(_pick(CVC_SETS, rng)) : _sightRound(_pick(easy, rng), easy, rng);
    },
    2: (rng) => {
      if (rng() < 0.5) { const dg = _pick(DIGRAPH_SETS, rng); return _wordRound(dg[0], dg.slice(1)); }
      // The week's sight words are always in the pool, with the class list or built-in list.
      const sight = [...new Set([...WEEK.sight, ...(SCHOOL_WORDS.length >= 3 ? SCHOOL_WORDS : SIGHT_1ST)])];
      // Half of these rounds practice this week's sight words, so they come up often.
      const w = WEEK.sight.length && rng() < 0.5 ? _pick(WEEK.sight, rng) : _pick(sight, rng);
      return _sightRound(w, [...new Set([...sight, ...DOLCH_1ST])], rng);
    },
    3: (rng) => {
      if (rng() < 0.5) { const bl = _pick(BLEND_SETS, rng); return _wordRound(bl[0], bl.slice(1)); }
      return _sentenceRound(_pick(SENTENCES, rng));
    },
  },
  elsa: {
    1: (rng) => (rng() < 0.5 ? _elsaNew(1, rng) : _elsaWithin(rng, 10)),
    2: (rng) => (rng() < 0.5 ? _elsaNew(2, rng) : rng() < 0.5 ? _elsaWithin(rng, 20) : _missingRound(_pick(MISSING, rng), rng)),
    3: (rng) => {
      if (rng() < 0.5) return _elsaNew(3, rng);
      const k = Math.floor(rng() * 3);
      if (k === 0) return _tensRound(_pick(TENS, rng), rng);
      if (k === 1) return _moreRound(_pick(MORE, rng), rng);
      return _addendsRound(_pick(ADDENDS, rng), rng);
    },
  },
  cinderella: {
    1: (rng) => _cinderellaRound(1 + Math.floor(rng() * 12), 0, false),
    2: (rng) => _cinderellaRound(1 + Math.floor(rng() * 12), 0, true),
    3: (rng) => {
      const hours = [1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12]; // 6:30 held back: the hands overlap
      return _cinderellaRound(_pick(hours, rng), 30, rng() < 0.5);
    },
  },
  rapunzel: {
    1: _sciOr(1, SCI_T1),
    2: _sciOr(2, SCI_T2),
    3: _sciOr(3, SCI_T3),
  },
};

// About 1 round in 3 of Belle's library is a spelling kind (S2) and 1 in 5 a dictation sentence (S3); the rest are unchanged.
for (const t of [1, 2, 3]) {
  const base = TIERS.belle[t];
  TIERS.belle[t] = (rng) => {
    const x = rng();
    if (x < 1 / 3) { const sp = _spellKind(t, rng); if (sp) return sp; } // spelling (S2): about 1 in 3
    else if (x < 1 / 3 + 0.2) return _dictRound(t, rng); // dictation sentence (S3): about 1 in 5
    return base(rng);
  };
}

/** Stable id for a round, used by the review queue. */
// Measuring rounds share prompts, so their picture is part of the id.
export function roundKey(r) {
  const v = r.visual && r.visual.kind ? `|${JSON.stringify(r.visual)}` : '';
  const s = r.sort && r.sort.items ? `|sort:${r.sort.items.map((i) => i.name).join(',')}` : '';
  const w = r.show ? `|show:${r.show}` : ''; // spelling rounds share prompts; the partial word tells them apart
  return `${r.prompt}|${r.answer}${v}${s}${w}`;
}

function _tagged(npcId, tier, rng) {
  const r = { ...TIERS[npcId][tier](rng), tier };
  r.key = roundKey(r);
  return r;
}

/**
 * Build one quest for a land.
 * ladder: { tier: 1-3, review: [{ round, wins }] } (from js/ladder.js).
 * 5 rounds: round 1 is one tier below (a confidence win; T1 at T1), then
 * 3 at the current tier and 1 review item (a missed round from an earlier
 * play) in the middle. No review waiting -> 4 at the current tier.
 * Pass a custom rng for deterministic tests.
 */
export function buildRounds(npcId, rng = Math.random, ladder = null) {
  try {
    if (!TIERS[npcId]) throw new Error('no tiers');
    const tier = Math.min(3, Math.max(1, (ladder && ladder.tier) | 0 || 1));
    const below = Math.max(1, tier - 1);
    const out = [];
    const seen = new Set();
    const add = (r) => { if (r && !seen.has(r.key)) { seen.add(r.key); out.push(r); return true; } return false; };
    const fresh = (t) => { for (let k = 0; k < 40; k++) { if (add(_tagged(npcId, t, rng))) return; } add({ ..._tagged(npcId, t, rng), key: `x${out.length}` }); };
    fresh(below);
    const review = ((ladder && ladder.review) || []).filter((x) => x && x.round && x.round.prompt);
    const rv = review.length ? _pick(review, rng).round : null;
    fresh(tier);
    if (!(rv && add({ ...rv, key: roundKey(rv), review: true }))) fresh(tier);
    fresh(tier);
    fresh(tier);
    return out;
  } catch (e) {}
  return (QUESTS[npcId] && QUESTS[npcId].rounds) || [];
}

const _EMOJI = /[\p{Extended_Pictographic}\uFE0F\u200D\u20E3]/gu;
export function hasEmoji(t) { _EMOJI.lastIndex = 0; return _EMOJI.test(String(t)); }
// Words for the third-miss reveal: a spoken answer word, else the answer text
// with pictures stripped, else a gentle "It's this picture."
export function revealLines(round) {
  const shown = `That's okay! The answer is ${round.answer}. Let's keep going!`;
  let word = round.answerSay || String(round.answer).replace(_EMOJI, '').replace(/\s+/g, ' ').trim();
  const say = word ? `That's okay! The answer is ${word}. Let's keep going!`
                   : "That's okay! It's this picture. Let's keep going!";
  return { shown, say };
}
