// Dictation sentence rounds in Belle's library (S3): the week's sentence plus short practice sentences.
import { buildRounds, WEEK, setWeek, roundKey, DICTATION_PRACTICE, dictationVariants } from '../js/quests.js';
const bad = [];
const fail = (m, x) => { if (bad.length < 8) bad.push([m, x]); };
const seeded = (seed) => { let s = seed * 2654435761 >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); };
const E = /[\p{Extended_Pictographic}️‍⃣]/u;
const parts = (t) => t.slice(0, -1).replace(/,/g, '').split(' ');
const isDict = (r) => r.prompt === 'Which sentence did you hear?' || r.build;

function sweep(label, sentences) {
  const stat = { 1: [0, 0], 2: [0, 0], 3: [0, 0] };
  const used = new Set();
  for (const tier of [1, 2, 3]) {
    for (let seed = 1; seed <= 600; seed++) {
      const rs = buildRounds('belle', seeded(seed * 11 + tier), { tier, review: [] });
      const keys = new Set();
      for (const r of rs) {
        stat[tier][1]++;
        if (keys.has(r.key)) fail(label + ': duplicate key in a quest', r.key);
        keys.add(r.key);
        if (r.key !== roundKey(r)) fail(label + ': key', r);
        if (!r.choices.includes(r.answer)) fail(label + ': answer not in choices', r);
        if (r.choices.length !== 3 || new Set(r.choices).size !== 3) fail(label + ': need 3 distinct choices', r);
        if (!isDict(r)) continue;
        stat[tier][0]++;
        const t = r.tier;
        const a = r.answer;
        if (!sentences.includes(a)) { fail(label + ': sentence not from week or practice', r); continue; }
        used.add(a);
        const w = parts(a);
        if (w.length > 8) fail(label + ': over 8 words', a);
        if (r.build && t === 1) fail(label + ': tier 1 has tiles', r);
        if (!r.build && t !== 1) fail(label + ': tier ' + t + ' needs tiles', r);
        for (const c of r.choices) {
          if (c === a) continue;
          const v = parts(c);
          if (c.slice(-1) !== a.slice(-1)) fail(label + ': variant end mark', c);
          const diff = v.filter((x, i) => x !== w[i]).length;
          if (v.length !== w.length || diff !== 1) fail(label + ': variant must differ by one word', [a, c]);
          if (E.test(c)) fail(label + ': emoji', c);
        }
        const shown = [r.prompt, r.show].filter(Boolean).join(' ');
        if (t === 1) {
          if (shown.includes(a)) fail(label + ': prompt shows the sentence', shown);
          if (!r.say.includes(a) || r.replay !== a) fail(label + ': sentence not spoken', r);
        } else {
          for (const x of [r.prompt, r.hint, r.show || '']) if (w.filter((y) => y.length > 3).some((y) => new RegExp(`\\b${y}\\b`, 'i').test(x))) fail(label + ': shown text gives sentence words', x);
          if (r.replay !== a) fail(label + ': replay', r);
          const b = r.build, end = a.slice(-1);
          const want = w.map((x, i) => (i === 0 || x === 'I' ? x : x.toLowerCase()));
          const target = t === 3 ? [...want, end] : want;
          if (b.target.join('|') !== target.join('|')) fail(label + ': target', [b.target, target]);
          if (b.target.some((x) => /[,.?!]/.test(x) && x.length > 1)) fail(label + ': punctuation in a word tile', b.target);
          const left = b.tiles.slice();
          for (const x of b.target) { const i = left.indexOf(x); if (i < 0) fail(label + ': missing tile ' + x, r); else left.splice(i, 1); }
          if (t === 2) {
            if (b.end !== end) fail(label + ': fixed end mark', b);
            if (left.length > 1 || b.tiles.some((x) => /^[.?!]$/.test(x))) fail(label + ': tier 2 extras', b);
          } else {
            const first = w[0];
            if (!b.tiles.includes(first) || !b.tiles.includes(first.toLowerCase() === first ? first[0].toUpperCase() + first.slice(1) : first.toLowerCase())) fail(label + ': tier 3 needs both first-word forms', b.tiles);
            if (!left.some((x) => /^[.?!]$/.test(x)) || left.some((x) => x === end)) fail(label + ': tier 3 end-mark distractors', b);
            if (!b.hints || !/capital/.test(b.hints.first) || !/end/.test(b.hints.last)) fail(label + ': tier 3 hints', b.hints);
            if (end === '?' && !/question mark/.test(b.hints.last)) fail(label + ': question hint', b.hints);
          }
          if (b.tiles.length > 14) fail(label + ': too many tiles', b.tiles);
        }
        for (const x of [r.say, r.hint, r.hintSay, r.replay]) if (x && (/ \.|\s[.?!,]/.test(x))) fail(label + ': spoken text', x);
      }
    }
  }
  for (const t of [1, 2, 3]) {
    const f = stat[t][0] / stat[t][1];
    if (f < 0.13 || f > 0.28) fail(`${label}: tier ${t} dictation share ${f.toFixed(2)} (want about 1/5)`, stat[t]);
  }
  for (const s of sentences) if (!used.has(s)) fail(label + ': sentence never used', s);
}

for (const p of DICTATION_PRACTICE) {
  if (p.split(' ').length > 8) fail('practice sentence too long', p);
  if (!/\bof\b|\bhe\b/i.test(p)) fail('practice sentence misses a sight word', p);
}
if (!DICTATION_PRACTICE.some((p) => /\bof\b/.test(p)) || !DICTATION_PRACTICE.some((p) => /\bHe\b|\bhe\b/.test(p))) fail('sight words of and he both needed', DICTATION_PRACTICE);
if (WEEK.dictation !== 'Can he run past the tent?') fail('default dictation changed', WEEK.dictation);
sweep('default', [WEEK.dictation, ...DICTATION_PRACTICE]);

// Variants never equal the sentence, even for odd sentences.
for (const s of ['Can he run past the tent?', "Don't sit on it!", 'Yes, he can sit.', 'I am up.', 'Zoe and Mom go.', 'Go.']) {
  for (let i = 1; i <= 200; i++) {
    const v = dictationVariants(s, seeded(i));
    if (v.length !== 2 || v[0] === v[1] || v.includes(s)) fail('variants for ' + s, v);
  }
}
const sample = dictationVariants('Can he run past the tent?', seeded(3));
if (sample.some((v) => v.includes(','))) fail('unexpected comma', sample);

// A grown-up's edit in Parent Corner changes the sentence.
setWeek({ dictation: 'We can sit on the mat.' });
if (WEEK.dictation !== 'We can sit on the mat.') fail('setWeek sentence', WEEK.dictation);
sweep('custom', ['We can sit on the mat.', ...DICTATION_PRACTICE]);
// Commas are dropped from tiles but kept in the sentence.
setWeek({ dictation: 'Yes, he can sit!' });
sweep('comma', ['Yes, he can sit!', ...DICTATION_PRACTICE]);
setWeek(null);

if (bad.length) { console.error('FAIL', JSON.stringify(bad, null, 1)); process.exit(1); }
console.log('dictation_check ok');
