// Elsa count-on (1.OA.5/6) and doubles (1.OA.6) rounds: rules, one right answer, ~half of Elsa's rounds.
import { buildRounds, roundKey } from '../js/quests.js';
const bad = []; let n = 0, co = 0, db = 0, nd = 0, bigDb = 0;
const isCO = (r) => (r.visual && r.visual.kind === 'counton') || /Start at \d+ and count on|Which number do you start with|^What is \d+ \+ \d+\?$/.test(r.prompt) && /Start with the bigger number/.test(r.hint);
for (let tier = 1; tier <= 3; tier++) {
  for (let seed = 1; seed <= 3000; seed++) {
    let s = seed * 2654435761 >>> 0;
    const rng = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
    for (const r of buildRounds('elsa', rng, { tier, review: [] })) {
      n++;
      const ok = new Set(r.choices).size === 3 && r.choices.length === 3 && r.choices.includes(r.answer) && !r.choices.includes('0');
      let m;
      if (/Start with the double:/.test(r.hint)) {
        nd++;   // doubles plus one: checked in detail by nearDoubles_check.mjs; here only that it is not mistaken for count-on or a double
        if (!ok) bad.push(['near choices', r.prompt, r.choices]);
      } else if (/Start with the bigger number/.test(r.hint)) {
        co++;
        if (!ok) bad.push(['choices', r.prompt, r.choices]);
        const nums = r.prompt.match(/\d+/g).map(Number);
        const pair = r.prompt.startsWith('Start at') ? nums.slice(0, 2) : r.prompt.startsWith('Which number') ? nums : nums;
        let big, sm;
        if (r.prompt.startsWith('Start at')) { big = nums[0]; sm = nums[1]; if (nums[2] !== big || nums[3] !== sm) bad.push(['t1 order', r.prompt]); }
        else { big = Math.max(...nums); sm = Math.min(...nums); }
        if (sm < 1 || sm > 3 || big <= sm || big + sm > 20) bad.push(['range', r.prompt]);
        if (!r.hint.includes(`bigger number${r.prompt.startsWith('Which') ? '' : ', ' + big}`)) bad.push(['hint', r.hint]);
        if (r.prompt.startsWith('Which number')) { if (r.tier !== 3 || r.answer !== String(big)) bad.push(['start q', r.prompt, r.answer]); }
        else if (r.answer !== String(big + sm)) bad.push(['sum', r.prompt, r.answer]);
        if (r.tier === 1 && !r.visual) bad.push(['t1 visual', r.prompt]);
        if (r.tier === 3 && r.visual) bad.push(['t3 visual', r.prompt]);
      } else if ((m = r.prompt.match(/^What is (\d+) \+ (\d+)\?$/)) && r.hint.includes('double')) {
        db++;
        if (!ok) bad.push(['choices', r.prompt, r.choices]);
        if (+m[1] >= 6) bigDb++;
        if (m[1] !== m[2] || +m[1] < 1 || +m[1] > (r.tier === 1 ? 5 : 10) || r.answer !== String(2 * m[1])) bad.push(['double', r.prompt, r.answer]);
        if (r.tier === 3 && r.visual) bad.push(['t3 double visual', r.prompt]);
      } else if ((m = r.prompt.match(/^Which double makes (\d+)\?$/))) {
        db++;
        const k = +m[1] / 2;
        if (k >= 6) bigDb++;
        if (!ok || r.tier !== 3 || r.answer !== `${k} + ${k}` || r.choices.some((c) => !/^([1-9]|10) \+ \1$/.test(c))) bad.push(['which double', r.prompt, r.choices]);
      } else if (r.visual && r.visual.kind) bad.push(['unknown visual', r.prompt]);
    }
  }
}
// Same fact, different picture must not share a review-queue id.
const a = { prompt: 'What is 3 + 3?', answer: '6', visual: { kind: 'doubles', n: 3, style: 'flakes' } };
if (roundKey(a) === roundKey({ ...a, visual: { kind: 'doubles', n: 3, style: 'frames' } })) bad.push(['key', 'pictures share a roundKey']);
const pct = (100 * (co + db + nd)) / n;
if (bigDb === 0) bad.push(['no big doubles', bigDb]);
console.log(`checked ${n} elsa rounds, ${co} count-on, ${db} doubles, ${nd} doubles-plus-one (${pct.toFixed(1)}% new, ${bigDb} above 5+5), violations ${bad.length}`);
if (pct < 40 || pct > 60) bad.push(['share', pct]);
if (co === 0 || db === 0 || nd === 0) bad.push(['missing kind', co, db, nd]);
if (bad.length) { console.log(bad.slice(0, 10)); process.exit(1); }
