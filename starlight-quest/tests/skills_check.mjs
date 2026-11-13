// Parent skill view (M5): rounds are filed under the right school skill, the last 10 are kept, mastered needs 8 of 10 on 2+ days,
// and the save sanitizer drops anything unexpected.
import { buildRounds } from '../src/engine-core.js';
import { skillOf, recordSkillResults, skillStatus, skillRows, SKILLS } from '../src/flow/skills.js';
import { questComplete } from '../src/flow/outcomes.js';
import { merge, sanitizeSkills, SKILL_IDS } from '../js/save.js';

const bad = [];
const ok = (c, why) => { if (!c) bad.push(why); };
const rngFrom = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };

// 1. Real rounds land in the skill they practice (checked by what the round itself says, not by the classifier).
const seen = { doubles: 0, neardoubles: 0, chart120: 0, cvc: 0, blends: 0, sight: 0, dictation: 0 };
for (const npc of ['belle', 'elsa', 'moana']) {
  for (let tier = 1; tier <= 3; tier++) {
    for (let seed = 1; seed <= 400; seed++) {
      for (const r of buildRounds(npc, rngFrom(seed * 13 + tier), { tier, review: [] })) {
        const id = skillOf(npc, r);
        if (id) seen[id]++;
        if (id === 'doubles') { const m = /(\d+) \+ (\d+)\?$/.exec(r.prompt); ok(npc === 'elsa' && m && m[1] === m[2] && Number(r.answer) === 2 * Number(m[1]), `doubles round ${r.prompt}`); }
        if (id === 'neardoubles') { const m = /(\d+) \+ (\d+)\?$/.exec(r.prompt); ok(npc === 'elsa' && m && Math.abs(m[1] - m[2]) === 1 && Number(r.answer) === Number(m[1]) + Number(m[2]), `near double ${r.prompt}`); }
        if (id === 'chart120') ok(npc === 'moana' && r.visual && r.visual.kind === 'chart', 'chart rounds carry a chart picture');
        if (id === 'cvc') ok(npc === 'belle' && /^Sound it out/.test(r.prompt), 'cvc prompt');
        if (id === 'blends') ok(/^Which word says/.test(r.prompt) && ['frog', 'flag', 'crab', 'drum', 'step', 'swim', 'clap', 'plan', 'trip', 'snap', 'stop', 'grin'].includes(r.answer), `blend answer ${r.answer}`);
        if (id === 'sight') ok(/^Which word says/.test(r.prompt) && !['ship', 'chip', 'shop', 'chop', 'fish', 'dish', 'wish', 'shell', 'chin', 'much', 'lunch', 'rich', 'this', 'that', 'then', 'with', 'bath', 'math'].includes(r.answer), `sight answer ${r.answer}`);
        if (id === 'dictation') ok(npc === 'belle' && (r.build || /Which sentence/.test(r.prompt)), 'dictation shape');
        if (r.test) ok(skillOf(npc, r) === null, 'a test round is never filed');
      }
    }
  }
}
for (const [id, n] of Object.entries(seen)) ok(n > 0, `no ${id} round was ever classified`);
ok(skillOf('belle', null) === null && skillOf('belle', 'x') === null && skillOf('aurora', { kind: 'doubles' }) === null, 'junk and other lands give null');
ok(skillOf('belle', { test: { n: 1 }, prompt: 'Sound it out' }) === null, 'a test round is not filed');

// 2. Filing results, 10 kept per skill.
{
  const save = { skills: {} };
  const r = (kind, firstTry) => ({ round: kind === 'doubles' ? { prompt: 'What is 4 + 4?', answer: '8' } : { kind, prompt: 'x', answer: '1' }, firstTry });
  for (let i = 0; i < 14; i++) recordSkillResults(save, 'elsa', [r('doubles', i % 2 === 0)], `2026-11-${String(10 + (i % 3)).padStart(2, '0')}`);
  ok(save.skills.doubles.length === 10, `kept ${save.skills.doubles.length}`);
  ok(!save.skills.neardoubles, 'untouched skills stay empty');
  recordSkillResults(save, 'elsa', [{ round: null, firstTry: true }, r('mystery', true)], '2026-11-12');
  ok(Object.keys(save.skills).join() === 'doubles', 'unknown rounds are ignored');
}

// 3. Status rules.
{
  const mk = (oks, days) => oks.map((o, i) => ({ ok: o, day: days[i % days.length] }));
  const t = Array(10).fill(true), f = Array(2).fill(false);
  ok(skillStatus(undefined) === 'notstarted' && skillStatus([]) === 'notstarted', 'not started');
  ok(skillStatus(mk([true, true], ['2026-11-10'])) === 'practicing', 'a few answers is practicing');
  ok(skillStatus(mk([...Array(8).fill(true), ...f], ['2026-11-10', '2026-11-11'])) === 'mastered', '8 of 10 on 2 days is mastered');
  ok(skillStatus(mk([...Array(7).fill(true), ...Array(3).fill(false)], ['2026-11-10', '2026-11-11'])) === 'practicing', '7 of 10 is not mastered');
  ok(skillStatus(mk(t, ['2026-11-10'])) === 'practicing', '10 of 10 on one day is not mastered yet');
  ok(skillStatus(mk([...Array(8).fill(true)], ['2026-11-10', '2026-11-11'])) === 'practicing', 'fewer than 10 answers is not mastered');
  ok(skillStatus(mk([false, false, false, false, ...Array(10).fill(true)], ['2026-11-10', '2026-11-11'])) === 'mastered', 'only the last 10 count');
  const rows = skillRows({ skills: { cvc: mk([...Array(9).fill(true), false], ['2026-11-10', '2026-11-12']) } });
  ok(rows.length === SKILLS.length && rows.find((x) => x.id === 'cvc').status === 'mastered' && rows.find((x) => x.id === 'blends').status === 'notstarted', 'rows');
  ok(rows.find((x) => x.id === 'cvc').detail === '9 of her last 10 first-try answers right', 'row detail');
  ok(skillRows(null).every((x) => x.status === 'notstarted'), 'rows on a missing save');
}

// 4. A finished quest files its results (questComplete), and a Thursday test never does.
{
  const save = { stars: 0, shards: {}, done: [], ladder: {}, lastPlay: {}, skills: {} };
  const rounds = buildRounds('elsa', rngFrom(3), { tier: 2, review: [] });
  const results = rounds.map((round) => ({ round, firstTry: true, hinted: false }));
  questComplete(save, 'elsa', results, '2026-11-12');
  const filed = Object.values(save.skills).reduce((n, l) => n + l.length, 0);
  const expect = rounds.filter((r) => skillOf('elsa', r)).length;
  ok(filed === expect, `filed ${filed}, expected ${expect}`);
}

// 5. Sanitizer and merge.
{
  const junk = [null, 4, 'x', [], { cvc: 5 }, { cvc: [null, 1, { ok: 'y', day: '2026-11-10' }, { ok: true, day: 'nope' }] }, { bogus: [{ ok: true, day: '2026-11-10' }] }];
  for (const j of junk) { try { const s = sanitizeSkills(j); ok(Object.keys(s).length === 0, `junk kept: ${JSON.stringify(j)}`); } catch (e) { ok(false, 'sanitizeSkills threw'); } }
  const long = { cvc: Array.from({ length: 25 }, (_, i) => ({ ok: i % 2 === 0, day: '2026-11-10', extra: 'x' })) };
  const s = sanitizeSkills(long);
  ok(s.cvc.length === 10 && Object.keys(s.cvc[0]).join() === 'ok,day', 'at most 10 entries with only ok and day');
  ok(SKILL_IDS.length === 8 && SKILLS.every((x) => SKILL_IDS.includes(x.id)), 'skill ids match');
  ok(Object.keys(merge({}).skills).length === 0, 'older saves load with no skills');
  const back = merge(JSON.parse(JSON.stringify({ skills: s })));
  ok(back.skills.cvc.length === 10, 'round trip through merge');
}

if (bad.length) { for (const b of [...new Set(bad)].slice(0, 20)) console.log('  ' + b); console.log(`skills_check: ${new Set(bad).size} problem(s)`); process.exit(1); }
console.log('skills_check ok:', JSON.stringify(seen));
