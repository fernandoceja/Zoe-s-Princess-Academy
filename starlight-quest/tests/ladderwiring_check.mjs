// Ladder wiring (R4 T1): the shell's quest flow (src/flow/questbook.js) plays a quest the way js/main.js does,
// and the ladder (js/ladder.js) moves up or down from those results. Plain Node, no browser.
import { createQuestbook, roundView, pick, nextRound } from '../src/flow/questbook.js';
import { visualHtml } from '../src/flow/visuals.js';
import { voiceText } from '../src/flow/voice.js';
import { buildRounds, landState, recordQuest, NPC_ORDER } from '../src/engine-core.js';

// Seeded rng so every run plays the same quests.
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
const freshSave = () => ({ stars: 0, shards: { belle: 0, elsa: 0 }, done: [], ladder: {}, lastPlay: {} });

// A wrong answer for the current view: the sort or tile reject events, or a wrong choice button.
function wrongId(view) {
  if (view.round.sort) return '__sortwrong';
  if (view.tileRound) return '__spellwrong';
  const wrong = view.choices.find((c) => c.id !== view.correctId);
  if (!wrong) throw new Error('no wrong choice to pick');
  return wrong.id;
}

// Play one quest to the end. wrongsFor(qb) = how many wrong picks before the right one on this round.
function playQuest(npc, ladderRaw, rng, saveData, wrongsFor) {
  const qb = createQuestbook(npc, buildRounds(npc, rng, landState(ladderRaw)));
  let guard = 0;
  for (;;) {
    if (++guard > 60) throw new Error('quest did not end');
    let view = roundView(qb, rng);
    const wrongs = wrongsFor(qb);
    for (let k = 0; k < wrongs; k++) {
      pick(qb, wrongId(view), view.correctId, saveData);
      view = roundView(qb, rng); // main.js startRound reshuffles after a gentle retry
    }
    const outcome = pick(qb, view.correctId, view.correctId, saveData);
    check(outcome === 'correct', `expected correct, got ${outcome}`);
    if (nextRound(qb)) break;
  }
  return qb;
}

// 1. Five first-try rounds: one result per first-asked round, tier rises 1 -> 2.
{
  const save = freshSave();
  const qb = playQuest('belle', null, rngFrom(1), save, () => 0);
  check(qb.results.length === 5, `five first-try: results ${qb.results.length}, expected 5`);
  check(qb.results.every((r) => r.firstTry && !r.hinted), 'five first-try: every result should be firstTry');
  check(save.stars === 5, `five first-try: stars ${save.stars}, expected 5`);
  const next = recordQuest(landState(null), qb.results);
  check(next.tier === 2, `five first-try: tier ${next.tier}, expected 2`);
}

// 2. Three rounds with two wrong picks each (then right), two clean rounds: tier falls 2 -> 1.
{
  const save = freshSave();
  const qb = playQuest('belle', { tier: 2, review: [] }, rngFrom(2), save, (q) => (q.results.length < 3 ? 2 : 0));
  check(qb.results.length === 5, `hinted: results ${qb.results.length}, expected exactly 5 (one per first-asked round)`);
  check(qb.results.filter((r) => r.hinted).length === 3, 'hinted: expected 3 hinted results');
  check(qb.results.filter((r) => r.firstTry).length === 2, 'hinted: expected 2 first-try results');
  check(qb.results.every((r) => !r.round.requeued), 'hinted: a re-asked round was recorded as a result');
  const next = recordQuest(landState({ tier: 2, review: [] }), qb.results);
  check(next.tier === 1, `hinted: tier ${next.tier}, expected 1`);
  check(save.stars === qb.rounds.length, `hinted: stars ${save.stars}, expected ${qb.rounds.length} (one star per correct pick, re-asks included)`);
  check(qb.rounds.length > 5, `hinted: expected re-asked rounds in the queue, got ${qb.rounds.length}`);
}

// 3. Parity (P3.2): every land, tiers 1-3, seeds 1-20. Each round builds its picture and spoken text without
//    throwing, and (for choice rounds) the shown choices include the answer.
let parityRounds = 0;
for (const npc of NPC_ORDER) {
  for (let tier = 1; tier <= 3; tier++) {
    for (let seed = 1; seed <= 20; seed++) {
      const rng = rngFrom(seed * 97 + tier);
      let rounds;
      try { rounds = buildRounds(npc, rng, { tier, review: [] }); } catch (e) { check(false, `parity ${npc} t${tier} s${seed}: buildRounds threw ${e.message}`); continue; }
      rounds.forEach((round, i) => {
        parityRounds++;
        const where = `parity ${npc} t${tier} s${seed} round ${i}`;
        try {
          check(typeof visualHtml(npc, round) === 'string', `${where}: visualHtml did not return a string`);
          const view = roundView(createQuestbook(npc, [round]), rng);
          check(typeof voiceText(npc, round, view.choices) === 'string', `${where}: voiceText did not return a string`);
          check(typeof view.bigWord === 'string' || view.bigWord === null, `${where}: bigWord missing`);
          check(typeof view.replayText === 'string' || view.replayText === null, `${where}: replayText missing`);
          if (!view.tileRound && !round.sort) {
            check(view.choices.some((c) => c.label === round.answer), `${where}: choices do not include the answer`);
          }
        } catch (e) {
          check(false, `${where}: threw ${e.message}`);
        }
      });
    }
  }
}
check(parityRounds > 0, 'parity: no rounds were built');

if (problems.length) {
  for (const p of problems) console.log(p);
  console.log(`ladder wiring: ${problems.length} problem(s)`);
  process.exit(1);
}
console.log(`ladder wiring ok: five first-try rounds raise tier 1 -> 2; three hinted rounds lower tier 2 -> 1; one result per first-asked round; ${parityRounds} parity rounds build`);
