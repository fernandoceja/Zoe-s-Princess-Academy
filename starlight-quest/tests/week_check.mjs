// This week's school pack (S1): defaults, cleaning, reset, and Belle tier 2 using the week's sight words.
import { buildRounds, WEEK, WEEK_DEFAULT, cleanWeek, setWeek, setSchoolWords } from '../js/quests.js';
const bad = [];
const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) bad.push([m, a, b]); };

eq(WEEK, WEEK_DEFAULT, 'starts as default');
eq(WEEK.spelling, ['lend', 'send', 'fast', 'sink', 'past'], 'spelling default');
eq(WEEK.sight, ['of', 'he'], 'sight default');
eq(WEEK.dictation, 'Can he run past the tent?', 'dictation default');
eq(WEEK.vowels, ['sat', 'hip', 'pen', 'log', 'nut'], 'vowels default');

// Junk is rejected, defaults fill in.
let c = cleanWeek({ spelling: 'Jump, JUMP, hi5, a-b, <b>, thisiswaytoolong', sight: '', dictation: 'no capital here.', vowels: 42 });
eq(c.spelling, ['jump'], 'spelling cleaned');
eq(c.sight, WEEK_DEFAULT.sight, 'empty sight -> default');
eq(c.dictation, WEEK_DEFAULT.dictation, 'bad dictation -> default');
eq(c.vowels, WEEK_DEFAULT.vowels, 'junk vowels -> default');
eq(cleanWeek(null), WEEK_DEFAULT, 'null -> default');
eq(cleanWeek('x'), WEEK_DEFAULT, 'string -> default');
eq(cleanWeek({ dictation: 'Hello there' }).dictation, WEEK_DEFAULT.dictation, 'needs final punctuation');
eq(cleanWeek({ dictation: 'Is it Tom\'s hat?' }).dictation, "Is it Tom's hat?", 'apostrophe ok');
eq(cleanWeek({ dictation: 'Two. Sentences.' }).dictation, WEEK_DEFAULT.dictation, 'one sentence only');
eq(cleanWeek({ dictation: 'A' + ' b'.repeat(40) + '.' }).dictation, WEEK_DEFAULT.dictation, 'too long');
const many = Array.from({ length: 40 }, (_, i) => 'w' + String.fromCharCode(97 + (i % 26)) + String.fromCharCode(97 + ((i / 26) | 0)));
eq(cleanWeek({ spelling: many }).spelling.length, 15, 'max 15');

// Set and reset.
const r = setWeek({ spelling: 'one, two', sight: 'zed, yak', dictation: 'We sit.', vowels: 'big' });
eq(r.sight, ['zed', 'yak'], 'setWeek returns copy');
eq(WEEK.dictation, 'We sit.', 'setWeek live');
r.sight.push('mutated');
eq(WEEK.sight, ['zed', 'yak'], 'copy is detached');
setWeek(null);
eq(WEEK, WEEK_DEFAULT, 'reset');

// Belle tier 2 always includes the week's sight words, with 2 distractors.
function rounds() {
  const out = [];
  for (let seed = 1; seed <= 400; seed++) {
    let s = seed * 2654435761 >>> 0;
    const rng = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
    out.push(...buildRounds('belle', rng, { tier: 2, review: [] }));
  }
  return out;
}
const check = (rs, label) => {
  const ans = new Set(rs.map((x) => x.answer));
  for (const w of WEEK.sight) if (!ans.has(w)) bad.push([label + ': missing week word', w]);
  for (const x of rs) {
    if (!x.choices.includes(x.answer)) bad.push([label + ': answer not in choices', x]);
    if (new Set(x.choices).size !== x.choices.length) bad.push([label + ': repeated choice', x]);
    if (WEEK.sight.includes(x.answer) && x.choices.length !== 3) bad.push([label + ': need 3 choices', x]);
  }
};
check(rounds(), 'default');
setSchoolWords(['zork', 'blip', 'quux']);
check(rounds(), 'with class list');
setSchoolWords([]);
setWeek({ sight: 'zed, yak, qua' });
check(rounds(), 'custom week');
setWeek(null);

if (bad.length) { console.error('FAIL', JSON.stringify(bad.slice(0, 5), null, 1)); process.exit(1); }
console.log('week_check ok');
