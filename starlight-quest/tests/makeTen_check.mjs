// Firefly jars (M2): Tiana's make 8, 9 and 10 rounds. The truth is computed here from the picture itself (count the glowing and empty circles),
// not from the generator's own fields.
import { buildRounds, revealLines } from '../src/engine-core.js';
import { jarHtml } from '../js/tally.js';
import { visualHtml } from '../src/flow/visuals.js';
import { skillOf, recordSkillResults, skillRows } from '../src/flow/skills.js';

const bad = new Map();
const ok = (c, why, r) => { if (!c) bad.set(why + (r ? ` | ${r.prompt} => ${r.answer} [${r.choices}] ${JSON.stringify(r.visual)}` : ''), 1); };
const NUM = 'zero one two three four five six seven eight nine ten'.split(' ');

// 1. The picture: one circle per slot, `lit` glowing, the rest empty (or hidden).
for (let total = 8; total <= 10; total++) for (let lit = 0; lit <= total; lit++) for (const hide of [false, true]) {
  const svg = jarHtml({ total, lit, hideEmpty: hide });
  const l = (svg.match(/data-fly="lit"/g) || []).length, e = (svg.match(/data-fly="empty"/g) || []).length;
  ok(l === lit, `jar ${total}/${lit}: ${l} glowing`, null);
  ok(e === (hide ? 0 : total - lit), `jar ${total}/${lit} hide=${hide}: ${e} empty`, null);
  ok(svg.includes(`data-jar="${total}"`), 'jar total label', null);
  ok(hide ? svg.includes(`jar holds ${total}`) : !svg.includes('jar holds'), 'number label only when empty spots are hidden', null);
  const xs = [...svg.matchAll(/<circle data-fly="[a-z]+" cx="([\d.]+)"/g)].map((m) => +m[1]);
  ok(xs.every((x) => x - 12 > 12 && x + 12 < 208), 'flies stay inside the jar walls', null);
  // the number label sits below the jar, clear of every fly
  const ys = [...svg.matchAll(/<circle data-fly="[a-z]+" cx="[\d.]+" cy="([\d.]+)"/g)].map((m) => +m[1]);
  const ty = svg.match(/<text [^>]*y="([\d.]+)"/);
  if (ty) ok(ys.every((y) => y + 12 < +ty[1] - 15), 'label overlaps a fly', null);
  ok(ys.every((y) => y + 12 < 130), 'flies stay above the jar bottom', null);
  // no two circles overlap
  const pts = [...svg.matchAll(/<circle data-fly="[a-z]+" cx="([\d.]+)" cy="([\d.]+)"/g)].map((m) => [+m[1], +m[2]]);
  for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) ok(Math.hypot(pts[i][0] - pts[j][0], pts[i][1] - pts[j][1]) >= 26, 'circles overlap', null);
}
ok(!/<script|onerror|javascript:/i.test(jarHtml({ total: '"><img onerror=x>', lit: '<b>', hideEmpty: 1 })), 'jar picture ignores hostile input', null);
ok((jarHtml({ total: NaN, lit: NaN }).match(/data-fly=/g) || []).length === 10, 'bad numbers healed to a 10 jar', null);
ok(jarHtml({ total: 99, lit: 99 }).includes('data-jar="10"'), 'total capped at 10', null);

// 2. Rounds.
let n = 0; const kinds = {}; const E = /[\p{Extended_Pictographic}]/u;
for (let tier = 1; tier <= 3; tier++) for (let seed = 1; seed <= 3000; seed++) {
  let s = seed * 2654435761 >>> 0;
  const rng = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (const r of buildRounds('tiana', rng, { tier, review: [] })) {
    if (r.kind !== 'maketen') continue;
    n++; kinds[`T${r.tier}${r.visual.hideEmpty ? 'h' : ''}${/\+/.test(r.prompt) ? 's' : ''}`] = 1;
    const { total, lit, hideEmpty } = r.visual;
    ok(r.visual.kind === 'jar' && [8, 9, 10].includes(total) && lit >= 1 && lit < total, 'jar numbers', r);
    // truth from the picture itself
    const svg = visualHtml('tiana', r);
    const gl = (svg.match(/data-fly="lit"/g) || []).length;
    ok(gl >= 1 && String(total - gl) === r.answer, 'answer is not the number of missing fireflies', r);
    ok(r.choices.length === 3 && new Set(r.choices).size === 3 && r.choices.includes(r.answer), 'choices', r);
    ok(r.choices.every((c) => /^\d+$/.test(c) && +c >= 1 && +c <= 10), 'choices are small positive numbers', r);
    ok(r.skill === 'maketen' && skillOf('tiana', r) === 'maketen', 'filed under make 10', r);
    ok(r.prompt.length <= 48, 'prompt short enough', r);
    ok(!/\d/.test(r.say) && !E.test(r.say) && !/[=+]/.test(r.say), 'spoken text has no digits or symbols', r);
    ok(!/\d|\b(zero|one|two|three|four|five|six|seven|eight|nine|ten)\b/i.test(r.hint), 'hint has no number', r);
    ok(r.answerSay === NUM[+r.answer], 'answerSay', r);
    ok(!/\d/.test(revealLines(r).say), 'reveal has no digits', r);
    ok(r.prompt.includes(String(total)), 'prompt names the jar size', r);
    if (!/\+/.test(r.prompt)) ok(!new RegExp(`\\b${r.answer}\\b`).test(r.prompt.replace(String(total), '')), 'prompt does not give the answer away', r);
    if (r.tier === 1) ok(total === 10 && lit >= 5 && !hideEmpty, 'tier 1: make 10 with the empty spots drawn', r);
    if (r.tier === 3) ok(hideEmpty, 'tier 3: empty spots hidden', r);
    if (/\+/.test(r.prompt)) ok(r.prompt === `${lit} + ? = ${total}`, 'sentence form', r);
  }
}
ok(n > 3000, 'too few jar rounds: ' + n, null);
for (const k of ['T1', 'T2', 'T3h', 'T3hs']) ok(kinds[k], 'never saw ' + k, null);

// 3. The parent skill row fills.
const save = { skills: {} };
recordSkillResults(save, 'tiana', [{ round: { kind: 'maketen', skill: 'maketen', prompt: 'x' }, firstTry: true }, { round: { kind: 'count', prompt: 'y' }, firstTry: true }], '2026-11-13');
ok((save.skills.maketen || []).length === 1, 'one make-10 result recorded, tally round not counted', null);
const row = skillRows(save).find((x) => x.id === 'maketen');
ok(row.status === 'practicing' && !/game yet/.test(row.detail), 'row shows practicing', null);

if (bad.size) { console.error('makeTen_check FAILED:\n - ' + [...bad.keys()].slice(0, 15).join('\n - ')); process.exit(1); }
console.log(`makeTen_check passed: ${n} jar rounds`);
