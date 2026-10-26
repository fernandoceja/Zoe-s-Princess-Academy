// Teacher word list (N7): cleaning, and Belle tier-2 using it only with 3+ valid words.
import { buildRounds, cleanWordList, setSchoolWords, SCHOOL_WORDS } from '../js/quests.js';
const bad = [];
const eq = (a, b, m) => { if (JSON.stringify(a) !== JSON.stringify(b)) bad.push([m, a, b]); };

eq(cleanWordList('Jump, look,\nplay ,  LOOK'), ['jump', 'look', 'play'], 'split/trim/lower/dedupe');
eq(cleanWordList("don't, it's, 'a', ''"), ["don't", "it's", "'a'"], 'apostrophes ok');
eq(cleanWordList('hi5, a-b, ok, , x y, thisiswaytoolong'), ['ok'], 'invalid dropped');
eq(cleanWordList('<b>, ab😀, café'), [], 'non-letters dropped');
eq(cleanWordList('abcdefghijkl, abcdefghijklm'), ['abcdefghijkl'], '12 ok, 13 not');
const many = Array.from({ length: 40 }, (_, i) => 'w' + String.fromCharCode(97 + (i % 26)) + String.fromCharCode(97 + ((i / 26) | 0)));
eq(cleanWordList(many.join(',')).length, 30, 'max 30');
eq(cleanWordList(null), [], 'null');

function roundsFor(tier) {
  const words = []; const sounds = [];
  for (let seed = 1; seed <= 400; seed++) {
    let s = seed * 2654435761 >>> 0;
    const rng = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
    for (const r of buildRounds('belle', rng, { tier, review: [] })) { words.push(r); }
  }
  return words;
}
const teacher = ['zork', 'blip', 'quux'];
setSchoolWords(teacher);
eq(SCHOOL_WORDS, teacher, 'set');
const sightAnswers = (rs) => rs.filter((r) => /^Which word says/.test(r.prompt) && !r.sound).map((r) => r.answer);
let rs = roundsFor(2);
const used = new Set(sightAnswers(rs));
if (!teacher.every((w) => used.has(w))) bad.push(['teacher words unused', [...used]]);
if (rs.some((r) => teacher.includes(r.answer) && r.sound)) bad.push(['sight word got a sound clip']);

setSchoolWords(['zork', 'blip']);   // only 2 -> built-in
rs = roundsFor(2);
if (sightAnswers(rs).some((w) => w === 'zork' || w === 'blip')) bad.push(['2 words should not be used']);
setSchoolWords([]);
eq(SCHOOL_WORDS, [], 'clear');
if (!sightAnswers(roundsFor(2)).includes('after')) bad.push(['built-in list not used after clear']);

if (bad.length) { console.error('FAIL', JSON.stringify(bad, null, 1)); process.exit(1); }
console.log('words_check ok');
