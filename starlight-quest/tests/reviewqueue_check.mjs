// Review queue (R4 T2): a round missed in one play comes back in later plays, leaves the queue after two
// first-try answers in a row, and a miss in between resets the count. Plain Node, no browser.
import { createQuestbook, roundView, pick, nextRound } from '../src/flow/questbook.js';
import { buildRounds, landState, recordQuest, roundKey } from '../src/engine-core.js';

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

// Play one Belle quest. missOn(round) says whether to make one wrong pick on that round (first asking only).
function playQuest(ladderRaw, rng, missOn) {
  const save = { stars: 0, shards: { belle: 0 }, done: [], ladder: {}, lastPlay: {} };
  const qb = createQuestbook('belle', buildRounds('belle', rng, landState(ladderRaw)));
  for (let guard = 0; guard < 60; guard++) {
    const view = roundView(qb, rng);
    if (!qb.rounds[qb.roundIdx].requeued && missOn(view.round)) {
      const wrong = view.choices.find((c) => c.id !== view.correctId);
      check(!!wrong, 'no wrong choice on a review round');
      pick(qb, wrong.id, view.correctId, save);
      const again = roundView(qb, rng);
      check(pick(qb, again.correctId, again.correctId, save) === 'correct', 'right answer after a miss should be correct');
    } else {
      check(pick(qb, view.correctId, view.correctId, save) === 'correct', 'first-try pick should be correct');
    }
    if (nextRound(qb)) return qb;
  }
  throw new Error('quest did not end');
}

// Scripted plays: 'miss' = the target round is missed on its first asking, 'ok' = answered first try.
// Play 1 has no review queue yet, so its target is the first round asked. Expected wins after each play: 0, 1, 0, 1, gone.
const plays = ['miss', 'ok', 'miss', 'ok', 'ok'];
const expectWins = [0, 1, 0, 1, null];
let ladder = null;
let targetKey = null;
plays.forEach((outcome, p) => {
  const rng = rngFrom(11 + p);
  const qb = playQuest(ladder, rng, (round) => {
    if (p === 0) { if (targetKey === null) { targetKey = roundKey(round); return true; } return false; }
    return outcome === 'miss' && roundKey(round) === targetKey;
  });
  const mine = qb.results.find((r) => roundKey(r.round) === targetKey);
  if (p > 0) {
    check(!!mine, `play ${p + 1}: the review round was not served`);
    check(mine && mine.firstTry === (outcome === 'ok'), `play ${p + 1}: review round outcome mismatch`);
  }
  ladder = recordQuest(ladder, qb.results);
  const item = ladder.review.find((x) => roundKey(x.round) === targetKey);
  const want = expectWins[p];
  if (want === null) check(!item, `play ${p + 1}: expected the round to leave the queue, wins ${item && item.wins}`);
  else check(!!item && item.wins === want, `play ${p + 1}: expected wins ${want}, got ${item ? item.wins : 'no item'}`);
});

// A miss in between resets the count: ok, miss, ok, ok -> leaves the queue only on the last play.
{
  let lad = null;
  const key = roundKey({ prompt: 'p', answer: 'a', choices: ['a', 'b'] });
  lad = recordQuest(lad, [{ round: { prompt: 'p', answer: 'a', choices: ['a', 'b'] }, firstTry: false, hinted: true }]);
  const step = (firstTry) => {
    lad = recordQuest(lad, [{ round: { prompt: 'p', answer: 'a', choices: ['a', 'b'] }, firstTry, hinted: !firstTry }]);
    return lad.review.find((x) => roundKey(x.round) === key);
  };
  check(step(true).wins === 1, 'reset: first ok should give wins 1');
  check(step(false).wins === 0, 'reset: a miss should reset wins to 0');
  check(step(true).wins === 1, 'reset: ok after a reset should give wins 1');
  check(step(true) === undefined, 'reset: second ok in a row should leave the queue');
}

for (const p of problems) console.log(p);
if (problems.length) {
  console.log(`review queue: ${problems.length} problem(s)`);
  process.exit(1);
}
console.log('review queue ok: a missed round is re-asked, leaves after two first-try answers, and a miss resets the count');
