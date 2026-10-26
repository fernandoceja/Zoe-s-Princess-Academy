// Rapunzel measuring rounds (CA 1.MD.1-2): one right answer, distinct choices, sane visuals, ~1 in 4 rounds.
import { buildRounds, roundKey } from '../js/quests.js';
let n = 0, meas = 0; const bad = [];
for (let tier = 1; tier <= 3; tier++) {
  for (let seed = 1; seed <= 3000; seed++) {
    let s = seed * 2654435761 >>> 0;
    const rng = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
    for (const r of buildRounds('rapunzel', rng, { tier, review: [] })) {
      n++;
      const v = r.visual; if (!v) continue;
      meas++;
      if (new Set(r.choices).size !== r.choices.length || !r.choices.includes(r.answer)) bad.push(['choices', r.prompt, r.choices]);
      if (r.choices.some((c) => !c.replace(/[\p{Extended_Pictographic}️‍]/gu, '').trim())) bad.push(['empty', r.choices]);
      if (v.kind === 'units') {
        if (!(v.length >= 3 && v.length <= 8) || r.answer !== `🌸 ${v.length} petals`) bad.push(['units', r.prompt, v, r.answer]);
        if (r.choices.some((c) => /\b0\b/.test(c))) bad.push(['zero', r.choices]);
      } else if (v.kind === 'flowers') {
        const h = v.heights;
        const tall = /taller|tallest/.test(r.prompt);
        const target = tall ? Math.max(...h) : Math.min(...h);
        const hits = h.filter((x) => x === target).length;
        const names = v.colors.map((c) => c);
        const ok = hits === 1 && new Set(h).size === h.length && h.every((x) => x >= 1 && x <= 8) &&
          r.answer.includes(names[h.indexOf(target)]) && r.choices.length === h.length;
        if (!ok) bad.push(['flowers', r.prompt, v, r.answer]);
      } else bad.push(['kind', v]);
    }
  }
}
// Same question, different picture: must not share a review-queue id.
const a = { prompt: 'Which flower is taller?', answer: '🌸 The pink one', visual: { kind: 'flowers', heights: [4, 2], colors: ['pink', 'blue'] } };
const b = { ...a, visual: { kind: 'flowers', heights: [4, 8], colors: ['yellow', 'pink'] } };
if (roundKey(a) === roundKey(b)) bad.push(['key', 'flower pictures share a roundKey']);
const pct = (100 * meas) / n;
console.log(`checked ${n} rapunzel rounds, ${meas} measuring (${pct.toFixed(1)}%), violations ${bad.length}`);
if (pct < 15 || pct > 35) bad.push(['share', pct]);
if (bad.length) { console.log(bad.slice(0, 10)); process.exit(1); }
