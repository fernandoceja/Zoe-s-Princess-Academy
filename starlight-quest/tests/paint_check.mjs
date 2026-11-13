// Paint the garden (B3): Rapunzel's number-fact rounds. The truth is recomputed from the prompt text, and the picture is checked piece by piece.
import { buildRounds } from '../src/engine-core.js';
import { paintHtml, PICTURES, PIC_NAMES, PIECES } from '../js/colorbynum.js';
import { visualHtml } from '../src/flow/visuals.js';

const bad = new Map();
const ok = (c, why, r) => { if (!c) bad.set(why + (r ? ` | ${r.prompt} => ${r.answer} [${r.choices}]` : ''), 1); };
const rngFrom = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
const NUM = 'zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty'.split(' ');

// 1. Pictures: eight pieces, exactly one missing, a single "?".
ok(PIC_NAMES.length === 3, 'three pictures');
for (const pic of PIC_NAMES) {
  ok(PICTURES[pic].length === PIECES, `${pic} has ${PIECES} pieces`);
  for (let region = 0; region < PIECES; region++) {
    const svg = paintHtml({ pic, region });
    ok((svg.match(/data-region="/g) || []).length === PIECES, `${pic}/${region}: all pieces drawn`);
    ok((svg.match(/data-missing="1"/g) || []).length === 1 && svg.includes(`data-region="${region}" data-missing="1"`), `${pic}/${region}: exactly the chosen piece is missing`);
    ok((svg.match(/>\?</g) || []).length === 1, `${pic}/${region}: one question mark`);
    ok(/role="img" aria-label="[^"]+"/.test(svg), 'picture has a label');
    const xs = [...svg.matchAll(/ cx="([\d.]+)"/g)].map((m) => +m[1]);
    ok(xs.every((x) => x >= 0 && x <= 120), 'inside the picture');
  }
}
ok(paintHtml({ pic: 'constructor', region: 1 }).includes('data-missing="1"'), 'built-in names are not pictures');
ok(paintHtml({ pic: 'nope', region: 99 }).includes('data-missing="1"'), 'junk input still draws a picture');
ok(!/<script|onerror|javascript:/i.test(paintHtml({ pic: '<script>', region: '<b>' })), 'no markup injected from the visual');

// 2. Rounds.
let n = 0;
const kinds = { add: 0, sub: 0, ten: 0 };
for (const tier of [1, 2, 3]) for (let seed = 1; seed <= 500; seed++) for (const r of buildRounds('rapunzel', rngFrom(seed * 7 + tier), { tier, review: [] })) {
  if (!r.visual || r.visual.kind !== 'paint') continue;
  n++;
  let m;
  let truth;
  if ((m = /^(\d+) \+ (\d+) = \?$/.exec(r.prompt))) { truth = +m[1] + +m[2]; kinds.add++; }
  else if ((m = /^(\d+) \+ \? = 10$/.exec(r.prompt))) { truth = 10 - +m[1]; kinds.ten++; }
  else if ((m = /^(\d+) - (\d+) = \?$/.exec(r.prompt))) { truth = +m[1] - +m[2]; kinds.sub++; }
  ok(truth !== undefined && String(truth) === r.answer, 'answer matches the prompt', r);
  ok(r.choices.length === 3 && new Set(r.choices).size === 3 && r.choices.includes(r.answer), 'three different choices with the answer', r);
  ok(r.choices.every((c) => +c >= 0 && +c <= 20), 'choices 0 to 20', r);
  ok(tier === 1 ? truth >= 1 && truth <= 10 : truth >= 1 && truth <= 20, `tier ${tier} answer range`, r);
  ok(tier !== 1 || (m && +m[1] + (m[2] ? +m[2] : 0) <= 10) || /\+ \? = 10/.test(r.prompt), 'tier 1 stays within 10', r);
  ok(r.prompt.length <= 48, 'short prompt', r);
  ok(typeof r.say === 'string' && !/[\p{Extended_Pictographic}\d]/u.test(r.say), 'say has no digits or emoji', r);
  ok(r.choiceSay && r.choices.every((c) => r.choiceSay[c] === NUM[+c]), 'choices are spoken as words', r);
  ok(r.answerSay === NUM[+r.answer], 'answer spoken as a word', r);
  ok(!new RegExp(`\\b${NUM[+r.answer]}\\b`, 'i').test(r.hint) && !new RegExp(`\\b${r.answer}\\b`).test(r.hint), 'hint never hands over the answer', r);
  ok(PIC_NAMES.includes(r.visual.pic) && Number.isInteger(r.visual.region) && r.visual.region >= 0 && r.visual.region < PIECES, 'visual fields', r);
  ok(r.key && r.key.includes('paint'), 'round key carries the picture', r);
  ok(visualHtml('rapunzel', r).includes('data-missing="1"'), 'visualHtml draws the paint picture', r);
  ok(visualHtml('belle', r) !== visualHtml('rapunzel', r), 'only Rapunzel draws it', r);
}
ok(n > 300, `paint rounds appear (${n})`);
ok(kinds.add > 0 && kinds.ten > 0 && kinds.sub > 0, `every fact kind appears ${JSON.stringify(kinds)}`);

// no paint fact repeats inside one quest
let rep = 0;
for (const tier of [1, 2, 3]) for (let seed = 1; seed <= 400; seed++) {
  const ps = buildRounds('rapunzel', rngFrom(seed * 11 + tier), { tier, review: [] }).filter((r) => r.visual && r.visual.kind === 'paint').map((r) => r.prompt);
  if (new Set(ps).size !== ps.length) rep++;
}
ok(rep === 0, `${rep} quests repeat a paint fact`);

// 3. Her plant science is still there.
let sci = 0;
for (let seed = 1; seed <= 100; seed++) for (const r of buildRounds('rapunzel', rngFrom(seed), { tier: 1, review: [] })) if (!r.visual || r.visual.kind !== 'paint') sci++;
ok(sci > 100, 'science rounds remain');

if (bad.size) { for (const b of [...bad.keys()].slice(0, 20)) console.log('  ' + b); console.log(`paint_check: ${bad.size} problem(s)`); process.exit(1); }
console.log(`paint_check ok: ${n} paint rounds`, JSON.stringify(kinds));
