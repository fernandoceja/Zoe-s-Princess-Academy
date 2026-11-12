// Elsa doubles plus one (1.OA.6): the right answer, 3 distinct non-zero choices, tier rules, spoken "plus", picture fits, review keys.
import { buildRounds, roundKey } from '../js/quests.js';
import { visualHtml } from '../src/flow/visuals.js';
const bad = []; let n = 0, nd = 0; const seen = { 1: new Set(), 2: new Set(), 3: new Set() }; let flipped = 0;
for (let tier = 1; tier <= 3; tier++) {
  for (let seed = 1; seed <= 4000; seed++) {
    let s = seed * 2654435761 >>> 0;
    const rng = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
    for (const r of buildRounds('elsa', rng, { tier, review: [] })) {
      n++;
      if (!/Start with the double:/.test(r.hint)) continue;
      nd++;
      const nums = r.prompt.match(/\d+/g).map(Number);
      const [a, b] = r.tier === 1 ? nums.slice(3, 5) : nums;          // Easy prompt: "6 + 6 is 12. What is 6 + 7?"
      const lo = Math.min(a, b), hi = Math.max(a, b);
      if (hi !== lo + 1) bad.push(['not near double', r.prompt]);
      if (r.answer !== String(a + b)) bad.push(['answer', r.prompt, r.answer]);
      if (new Set(r.choices).size !== 3 || !r.choices.includes(r.answer) || r.choices.some((c) => !(+c > 0))) bad.push(['choices', r.prompt, r.choices]);
      if (a + b > 20) bad.push(['over 20', r.prompt]);
      if (!r.say || /\+/.test(r.say) || !/plus/.test(r.say)) bad.push(['say', r.prompt, r.say]);
      if (r.hint.includes(`${r.answer}.`) && !r.hint.includes(`is ${2 * lo}`)) bad.push(['hint gives answer', r.hint]);
      if (!r.hint.includes(`${lo} + ${lo} is ${2 * lo}`)) bad.push(['hint double', r.hint]);
      seen[r.tier].add(lo);
      if (r.tier === 1) {
        if (lo > 5) bad.push(['easy past 5+6', r.prompt]);
        if (nums[0] !== lo || nums[1] !== lo || nums[2] !== 2 * lo || nums[3] !== lo) bad.push(['easy double line', r.prompt]);
        if (!r.visual || r.visual.style !== 'bridge') bad.push(['easy visual', r.prompt]);
      } else if (r.tier === 2) {
        if (a !== lo || !r.visual || r.visual.style !== 'frames') bad.push(['core', r.prompt]);
      } else {
        if (r.visual) bad.push(['stretch visual', r.prompt]);
        if (a > b) flipped++;
      }
      if (r.visual) {
        const html = visualHtml('elsa', r);
        if (!html || (html.match(/data-dot="kept"/g) || []).length < lo) bad.push(['picture', r.prompt]);
        // fits 390 px wide (phone): widest row is two frames + plus sign; each 5-column frame is 5*cell + 4 border/gap
        const cells = [...html.matchAll(/repeat\(5,(\d+)px\)/g)].map((m) => +m[1]);
        if (r.tier === 1 && cells.length !== 2) bad.push(['easy frames', cells.length]);
        if (r.tier === 2 && cells.length > 2 * Math.ceil((lo + 1) / 10)) bad.push(['core frames', cells.length]);
        if (cells.some((c) => c > 26) || 2 * (5 * Math.max(...cells, 0)) + 60 > 330) bad.push(['too wide for 390px', r.prompt]);
      }
      if (roundKey(r) !== r.key) bad.push(['key', r.prompt]);
    }
  }
}
// Same prompt in Core vs Easy must not share a review-queue key.
const e = { prompt: 'What is 3 + 4?', answer: '7', visual: { kind: 'neardoubles', n: 3, style: 'frames' } };
if (roundKey(e) === roundKey({ ...e, visual: { kind: 'neardoubles', n: 3, style: 'bridge' } })) bad.push(['key pictures']);
if (nd === 0) bad.push(['none generated']);
for (const [t, want] of [[1, [1, 2, 3, 4, 5]], [2, [2, 3, 4, 5, 6, 7, 8, 9]], [3, [2, 3, 4, 5, 6, 7, 8, 9]]]) for (const k of want) if (!seen[t].has(k)) bad.push(['never saw', t, k]);
if (!flipped) bad.push(['stretch never flips order']);
console.log(`checked ${n} elsa rounds, ${nd} doubles-plus-one, ${flipped} flipped, violations ${bad.length}`);
if (bad.length) { console.log(bad.slice(0, 10)); process.exit(1); }
