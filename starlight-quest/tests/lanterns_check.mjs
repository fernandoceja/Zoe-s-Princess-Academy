// Lantern scoot (B4): the plan, the walk order, the extra rounds, and that the ladder still sees exactly five results.
import { readFileSync } from 'node:fs';
import { scootPlan, walkOrder, withBonus, expectedArrival, clampTier, LANTERN_COUNT, LANTERN_TOTAL, ARRIVE_R, legLine, legSay, chipText } from '../src/flow/lanterns.js';
import { QUEST_LANTERNS, gardenWet, GARDEN_R } from '../js/garden.js';
import { buildRounds } from '../src/engine-core.js';
import { createQuestbook, noteResult } from '../src/flow/questbook.js';
import { recordQuest, landState } from '../js/ladder.js';

const bad = [];
const ok = (c, why) => { if (!c) bad.push(why); };
const rngFrom = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };

// 1. The eight lanterns are on dry ground inside the hedge and far enough from each other to tell apart.
ok(QUEST_LANTERNS.length === LANTERN_TOTAL && LANTERN_TOTAL === 8, 'eight lanterns');
QUEST_LANTERNS.forEach((l, i) => {
  ok(!gardenWet(l.x, l.z), `lantern ${i} is not in the pool`);
  ok(Math.hypot(l.x, l.z) < GARDEN_R + 0.5, `lantern ${i} is inside the garden`);
  for (let j = i + 1; j < QUEST_LANTERNS.length; j++) ok(Math.hypot(l.x - QUEST_LANTERNS[j].x, l.z - QUEST_LANTERNS[j].z) > ARRIVE_R * 1.4, `lanterns ${i} and ${j} are too close`);
});

// 2. Counts and tiers.
ok(LANTERN_COUNT[1] === 4 && LANTERN_COUNT[2] === 6 && LANTERN_COUNT[3] === 8, 'lantern counts 4/6/8');
ok(clampTier(undefined) === 1 && clampTier(0) === 1 && clampTier(2) === 2 && clampTier(9) === 3 && clampTier(NaN) === 1, 'tier is clamped');
const spots = QUEST_LANTERNS.map((l) => ({ x: l.x + 100, z: l.z + 50 }));
const start = { x: 100, z: 60 };
for (const tier of [1, 2, 3]) {
  const p = scootPlan(tier, spots, start);
  ok(p.n === LANTERN_COUNT[tier], `tier ${tier}: ${p.n} lanterns`);
  ok(p.total === Math.max(5, p.n) && p.steps.length === p.total, `tier ${tier}: total rounds ${p.total}`);
  const lan = p.steps.filter((s) => s.lantern != null);
  ok(lan.length === p.n && new Set(lan.map((s) => s.lantern)).size === p.n, `tier ${tier}: distinct lanterns`);
  ok(lan.every((s, i) => s.num === i + 1), `tier ${tier}: numbers run 1..n`);
  ok(tier === 1 ? p.steps[4].lantern === null && p.steps[4].num === null && p.steps.slice(0, 4).every((s) => s.lantern != null) : p.steps.every((s) => s.lantern != null), `tier ${tier}: only tier 1 ends with the walk back to Jasmine`);
  p.steps.forEach((s) => ok(expectedArrival(s) === (s.lantern != null ? `lantern-${s.lantern}` : 'jasmine'), 'arrival id'));
  p.steps.forEach((s) => { ok(/^Follow the fireflies/.test(legLine(s)), 'leg line'); ok(!/[\p{Extended_Pictographic}\d]/u.test(legSay(s)), 'leg speech has no digits or emoji'); ok(chipText(s, p.n).length > 0, 'chip'); });
}
ok(scootPlan(7, spots, start).n === 8, 'a big tier counts as tier 3');

// 3. Walk order: nearest first, every lantern once.
{
  const line = [0, 1, 2, 3].map((i) => ({ x: i * 10, z: 0 }));
  ok(walkOrder({ x: -1, z: 0 }, line).join() === '0,1,2,3', 'walks along a line');
  ok(walkOrder({ x: 31, z: 0 }, line).join() === '3,2,1,0', 'walks from the other end');
  const o = walkOrder(start, spots);
  ok(o.length === 8 && new Set(o).size === 8, 'visits each once');
}

// 4. Extra rounds: padded to the total, no repeats, graded five untouched.
for (const tier of [1, 2, 3]) for (let seed = 1; seed <= 60; seed++) {
  const base = buildRounds('jasmine', rngFrom(seed), { tier, review: [] });
  const total = scootPlan(tier, spots, start).total;
  const rng = rngFrom(seed + 999);
  const all = withBonus(base, () => buildRounds('jasmine', rng, { tier, review: [] }), total);
  ok(all.length === total, `tier ${tier} seed ${seed}: ${all.length} of ${total} rounds`);
  ok(new Set(all.map((r) => r.key)).size === all.length, 'no repeated rounds');
  ok(all.slice(0, base.length).every((r, i) => r === base[i]), 'the graded rounds are untouched');
  ok(all.slice(base.length).every((r) => r.extra === true), 'extras are marked');
}

// 5. The ladder sees five results whatever the number of lanterns, and the same promotion as the plain quest.
for (const total of [5, 6, 8]) {
  const qb = createQuestbook('jasmine', buildRounds('jasmine', rngFrom(3), { tier: 2, review: [] }));
  const results5 = [];
  for (let i = 0; i < total; i++) { qb.misses = i === 1 ? 1 : 0; noteResult(qb, qb.rounds[i % qb.rounds.length]); }
  ok(qb.results.length === 5, `${total} rounds give ${qb.results.length} results`);
  const a = recordQuest(landState({ tier: 2 }), qb.results), b = recordQuest(landState({ tier: 2 }), qb.results.slice(0, 5));
  ok(JSON.stringify(a) === JSON.stringify(b), 'same ladder outcome');
}

// 6. Wiring by source: the world reports the arrival id the plan expects; the glow is per lantern; the modal path is unchanged.
const src = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
ok(/showTrailTo\(id, pt\)/.test(src('js/world.js')) && /gardenLanternXZ/.test(src('js/world.js')) && /setQuestLantern/.test(src('js/garden.js')), 'world and garden expose the scoot calls');
ok(/trailArrived\(playerPos\.x, playerPos\.z, pad, flyPoint \? 1\.8/.test(src('js/world.js')) && ARRIVE_R === 1.8, 'arrival radius matches');
ok(/'scoot'/.test(src('src/App.tsx')) && /expectedArrival/.test(src('src/App.tsx')), 'App has the scoot phase');

if (bad.length) { for (const b of [...new Set(bad)].slice(0, 20)) console.log('  ' + b); console.log(`lanterns_check: ${new Set(bad).size} problem(s)`); process.exit(1); }
console.log('lanterns_check ok');
