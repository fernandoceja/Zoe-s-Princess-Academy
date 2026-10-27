// Spelling and short-vowel rounds in Belle's library (S2): words come from the live WEEK pack.
import { buildRounds, WEEK, setWeek, roundKey } from '../js/quests.js';
const bad = [];
const fail = (m, x) => { if (bad.length < 8) bad.push([m, x]); };
const seeded = (seed) => { let s = seed * 2654435761 >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); };
const kindOf = (r) => (r.spell ? 'spell' : r.show && r.show.endsWith('_ _') ? 'ending' : r.show ? 'vowel' : null);

function sweep(label, spelling, vowels) {
  const stat = { 1: [0, 0], 2: [0, 0], 3: [0, 0] };
  const used = { vowel: new Set(), ending: new Set(), spell: new Set() };
  for (const tier of [1, 2, 3]) {
    for (let seed = 1; seed <= 600; seed++) {
      const rs = buildRounds('belle', seeded(seed * 7 + tier), { tier, review: [] });
      for (const r of rs) {
        stat[tier][1]++;
        if (!r.choices.includes(r.answer)) fail(label + ': answer not in choices', r);
        if (new Set(r.choices).size !== 3) fail(label + ': need 3 distinct choices', r);
        if (r.key !== roundKey(r)) fail(label + ': key', r);
        const k = kindOf(r);
        if (!k) continue;
        stat[tier][0]++;
        if (r.tier !== tier && r.tier !== undefined && r.tier !== Math.max(1, tier - 1)) fail(label + ': tier tag', r);
        const t = r.tier;
        if (t === 1 && k !== 'vowel') fail(label + ': tier 1 kind', r);
        if (t === 2 && k !== 'ending') fail(label + ': tier 2 kind', r);
        if (t === 3 && k !== 'spell') fail(label + ': tier 3 kind', r);
        if (k === 'vowel') {
          const w = vowels.find((x) => r.say === `Listen: ${x}. Which letter is missing?`);
          if (!w) { fail(label + ': vowel word not in pack', r); continue; }
          used.vowel.add(w);
          if (!/^[aeiou]$/.test(r.answer) || !w.includes(r.answer)) fail(label + ': vowel answer', r);
          if (!r.choices.every((c) => /^[aeiou]$/.test(c))) fail(label + ': vowel choices', r);
          if (w.split('').map((c, i) => (c === r.answer && r.show.split(' ')[i] === '_' ? r.answer : c)).join('') !== w) fail(label + ': show', r);
        } else if (k === 'ending') {
          const w = spelling.find((x) => r.say === `Listen: ${x}. Which ending finishes the word?`);
          if (!w) { fail(label + ': ending word not in pack', r); continue; }
          used.ending.add(w);
          if (r.answer !== w.slice(-2)) fail(label + ': ending answer', r);
          if (r.show.replace(/ /g, '') !== w.slice(0, -2) + '__') fail(label + ': ending show', r);
          if (r.choices.some((c) => c !== r.answer && w.slice(0, -2) + c === w)) fail(label + ': distractor = word', r);
        } else {
          const w = r.spell.word;
          if (!spelling.includes(w)) { fail(label + ': spell word not in pack', r); continue; }
          used.spell.add(w);
          if (r.answer !== w) fail(label + ': spell answer', r);
          const left = r.spell.tiles.slice();
          for (const l of w) { const i = left.indexOf(l); if (i < 0) fail(label + ': missing tile ' + l, r); else left.splice(i, 1); }
          if (r.spell.tiles.length !== w.length + 2 || left.length !== 2) fail(label + ': tiles need word + 2 extras', r);
          if (r.spell.tiles.join('') === w) fail(label + ': tiles not shuffled', r);
          if (r.choices.filter((c) => c !== w).some((c) => c === w)) fail(label + ': misspelling = word', r);
        }
        // The shown hint must not spell out the word (the spoken hintSay may say it).
        if (r.hintSay && [...WEEK.spelling, ...WEEK.vowels].some((x) => new RegExp(`\\b${x}\\b`, 'i').test(r.hint))) fail(label + ': shown hint gives the word away', r.hint);
        for (const t of [r.say, r.hint, r.hintSay, r.replay]) if (t && (/\b[a-z]( [a-z]){2,}\b/.test(t) || /\b[a-z]-[a-z]-[a-z]/.test(t))) fail(label + ': letter-by-letter speech', t);
      }
    }
  }
  for (const t of [1, 2, 3]) {
    const f = stat[t][0] / stat[t][1];
    if (f < 0.2 || f > 0.5) fail(`${label}: tier ${t} spelling share ${f.toFixed(2)} (want about 1/3)`, stat[t]);
  }
  return used;
}

const def = sweep('default', WEEK.spelling.slice(), WEEK.vowels.slice());
for (const w of WEEK.vowels) if (!def.vowel.has(w)) fail('default vowel word never used', w);
for (const w of WEEK.spelling) { if (!def.ending.has(w)) fail('default ending word never used', w); if (!def.spell.has(w)) fail('default spell word never used', w); }

// A grown-up's edit in Parent Corner changes the words.
setWeek({ spelling: 'jump, help', vowels: 'big, den' });
const custom = sweep('custom', ['jump', 'help'], ['big', 'den']);
if (custom.spell.size !== 2 || custom.ending.size !== 2 || custom.vowel.size !== 2) fail('custom words not all used', [custom]);
setWeek(null);

if (bad.length) { console.error('FAIL', JSON.stringify(bad, null, 1)); process.exit(1); }
console.log('spell_check ok');
