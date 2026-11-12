// Kind retries (Q1): a wrong pick says "Try again" and speaks the hint; a quest is always 5 questions
// (never /6 or /7); the missed question goes to the review queue instead of being asked again in the same quest.
import { readFileSync } from 'node:fs';
import { createQuestbook, roundView, pick, nextRound } from '../src/flow/questbook.js';
import { questComplete } from '../src/flow/outcomes.js';
import { buildRounds, landState, roundKey, NPC_ORDER } from '../src/engine-core.js';

function rngFrom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const wrongId = (v) => (v.round.sort ? '__sortwrong' : v.tileRound ? '__spellwrong' : v.choices.find((c) => c.id !== v.correctId).id);

let quests = 0, missed = 0;
for (const npc of NPC_ORDER) {
  for (let seed = 1; seed <= 25; seed++) {
    const rng = rngFrom(seed * 7 + npc.length);
    const save = { stars: 0, shards: Object.fromEntries(NPC_ORDER.map((n) => [n, 0])), done: [], ladder: {}, lastPlay: {} };
    const qb = createQuestbook(npc, buildRounds(npc, rng, landState(null)));
    check(qb.rounds.length === 5, `${npc}: a quest starts with ${qb.rounds.length} rounds`);
    const missedKeys = [];
    for (let guard = 0; guard < 40; guard++) {
      check(qb.roundIdx + 1 <= 5 && qb.rounds.length === 5, `${npc}: counter would show ${qb.roundIdx + 1}/${qb.rounds.length}`);
      let view = roundView(qb, rng);
      // Miss the first three rounds once each (the retry shows the hint); the rest are clean.
      const wrongs = qb.roundIdx < 3 ? 1 : 0;
      for (let k = 0; k < wrongs; k++) {
        const out = pick(qb, wrongId(view), view.correctId, save);
        if (!view.tileRound && !view.round.sort) check(out === 'retry', `${npc}: wrong pick gave ${out}, expected retry`);
        if (!view.round.sort && !view.tileRound && k === 0) missedKeys.push(roundKey(view.round));
        view = roundView(qb, rng);
      }
      check(pick(qb, view.correctId, view.correctId, save) === 'correct', `${npc}: right pick should be correct`);
      if (nextRound(qb)) break;
    }
    check(qb.roundIdx === 5 && qb.rounds.length === 5, `${npc}: quest ended at ${qb.roundIdx}/${qb.rounds.length}, expected 5/5`);
    check(qb.results.length === 5, `${npc}: ${qb.results.length} results, expected 5`);
    questComplete(save, npc, qb.results, '2026-11-12');
    const queue = (save.ladder[npc] && save.ladder[npc].review) || [];
    const hinted = qb.results.filter((r) => r.hinted).map((r) => roundKey(r.round));
    for (const k of hinted) check(queue.some((x) => roundKey(x.round) === k), `${npc}: missed round is not in the review queue`);
    check(queue.length >= Math.min(hinted.length, 1), `${npc}: review queue should hold the missed questions`);
    missed += hinted.length; quests++;
  }
}
check(missed > 0, 'no missed question was ever recorded');

// The wiring in the shell: the locked button after a wrong pick says "Try again", and the hint is spoken then.
const modal = readFileSync(new URL('../src/components/ChallengeModal.tsx', import.meta.url), 'utf8');
check(/feedback\?\.kind === 'retry' \? 'Try again[^']*' : 'Next/.test(modal), 'ChallengeModal: the button after a wrong pick must say "Try again"');
const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
check(/kind === 'retry'\) \{[^}]*Narrator\.speakExact\(\s*npcId,\s*round\.hintSay \|\| round\.hint/s.test(app), 'App: a wrong pick must speak the hint');
const qbSrc = readFileSync(new URL('../src/flow/questbook.js', import.meta.url), 'utf8');
check(!/requeued: true|qb\.rounds\.splice/.test(qbSrc), 'questbook: a missed round must not be added back into the same quest');

console.log(`retry: ${quests} quests, ${missed} missed rounds, problems ${problems.length}`);
if (problems.length) { for (const p of problems.slice(0, 10)) console.log(p); process.exit(1); }
