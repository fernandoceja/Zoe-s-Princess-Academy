// Reveal and miss rules (R4 T3): three wrong picks reveal without a star, narrowing after two misses,
// and the sort and tile events. Plain Node, no browser. Uses small hand-made rounds so each rule is isolated.
import { createQuestbook, roundView, pick, nextRound } from '../src/flow/questbook.js';

const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const freshSave = () => ({ stars: 4, shards: { belle: 0 }, done: [], ladder: {}, lastPlay: {} });
const choiceRound = (n) => ({ prompt: `Pick ${n}`, answer: 'bee', choices: ['ant', 'bee', 'cat', 'dog'], hint: 'Good try!' });
const rng = () => 0.5;

// 1. Three wrong picks: retry, retry, reveal. Stars and shards unchanged, result recorded as hinted.
{
  const save = freshSave();
  const qb = createQuestbook('belle', [choiceRound(1), choiceRound(2)]);
  const outcomes = [];
  for (let k = 0; k < 3; k++) {
    const view = roundView(qb, rng);
    const wrong = view.choices.find((c) => c.label !== 'bee');
    outcomes.push(pick(qb, wrong.id, view.correctId, save));
  }
  check(outcomes[0] === 'retry' && outcomes[1] === 'retry', `three misses: first two should be retry, got ${outcomes.join(',')}`);
  check(outcomes[2] === 'reveal', `three misses: third should be reveal, got ${outcomes[2]}`);
  check(save.stars === 4, `reveal: stars ${save.stars}, expected 4 (no star on reveal)`);
  check(save.shards.belle === 0, `reveal: shards ${save.shards.belle}, expected 0`);
  check(qb.results.length === 1, `reveal: results ${qb.results.length}, expected 1`);
  check(qb.results[0].firstTry === false && qb.results[0].hinted === true, 'reveal: result should be { firstTry: false, hinted: true }');
  check(nextRound(qb) === false, 'reveal: quest should not be over after round 1 of 2');
  check(qb.roundIdx === 1 && qb.misses === 0, 'reveal: nextRound should advance and reset misses');
}

// 2. After two misses the choices narrow to two: the answer and one other.
{
  const save = freshSave();
  const qb = createQuestbook('belle', [choiceRound(1)]);
  const first = roundView(qb, rng);
  pick(qb, first.choices.find((c) => c.label !== 'bee').id, first.correctId, save);
  const second = roundView(qb, rng);
  pick(qb, second.choices.find((c) => c.label !== 'bee').id, second.correctId, save);
  const narrowed = roundView(qb, rng);
  const labels = narrowed.choices.map((c) => c.label);
  check(labels.length === 2, `narrowing: expected 2 choices after two misses, got ${labels.length}`);
  check(labels.includes('bee'), 'narrowing: the answer must stay in the two choices');
  check(narrowed.choices.some((c) => c.id === narrowed.correctId && c.label === 'bee'), 'narrowing: correctId must point at the answer');
}

// 3. A correct pick adds one star and one shard (first time for this land), and records a first-try result.
{
  const save = freshSave();
  const qb = createQuestbook('belle', [choiceRound(1)]);
  const view = roundView(qb, rng);
  const out = pick(qb, view.correctId, view.correctId, save);
  check(out === 'correct', `correct: outcome ${out}`);
  check(save.stars === 5 && save.shards.belle === 1, `correct: stars ${save.stars}, shards ${save.shards.belle}`);
  check(qb.results.length === 1 && qb.results[0].firstTry && !qb.results[0].hinted, 'correct: expected one first-try result');
}

// 4. Sort rounds: a wrong bin counts a miss and never a star; the all-sorted event is the correct answer.
{
  const save = freshSave();
  const sortRound = { prompt: 'Sort them', answer: 'done', choices: ['done'], sort: { items: [] }, hint: 'Look again.' };
  const qb = createQuestbook('belle', [sortRound]);
  const view = roundView(qb, rng);
  check(view.choices.length === 0 && view.correctId === '__sortdone', 'sort: no choice buttons and correctId __sortdone');
  const wrong = pick(qb, '__sortwrong', view.correctId, save);
  check(wrong === 'sortwrong' && qb.misses === 1, `sort: wrong bin should count a miss, got ${wrong} misses ${qb.misses}`);
  check(save.stars === 4, 'sort: a wrong bin must not change stars');
  const done = pick(qb, '__sortdone', view.correctId, save);
  check(done === 'correct' && save.stars === 5, `sort: __sortdone should be correct, got ${done} stars ${save.stars}`);
}

// 5. Tile (spelling) rounds: a wrong tile counts a miss; the built word is the correct event.
{
  const save = freshSave();
  const spellRound = { prompt: 'Spell it', answer: 'cat', spell: { letters: 'cat' }, hint: 'Listen.' };
  const qb = createQuestbook('belle', [spellRound]);
  const view = roundView(qb, rng);
  check(view.tileRound && view.correctId === '__spelldone', 'tiles: correctId should be __spelldone');
  check(pick(qb, '__spellwrong', view.correctId, save) === 'spellwrong' && qb.misses === 1, 'tiles: wrong tile should count a miss');
  check(pick(qb, '__spelldone', view.correctId, save) === 'correct' && save.stars === 5, 'tiles: __spelldone should be correct');
}

for (const p of problems) console.log(p);
if (problems.length) {
  console.log(`reveal rules: ${problems.length} problem(s)`);
  process.exit(1);
}
console.log('reveal rules ok: three misses reveal with no star, two misses narrow to two choices, sort and tile events count as main.js');
