/* Zoe's Starlight Quest — quest flow (R4 P3.1).
 * One plain object (the questbook) owns the state of one quest. Ported line-for-line from js/main.js:
 * startQuest setup (282-286), startRound choice narrowing and shuffle (306-314, 477-486),
 * the pick handler (514-560), noteResult (565-573) and nextRound (575-580).
 * Framework-free: no DOM, no React, no audio. Imports engine-core.js only (tests run in plain Node).
 */

/** Build the questbook for one quest. `rounds` is this play's round list (buildRounds output). */
export function createQuestbook(npcId, rounds) {
  return { npcId, rounds, roundIdx: 0, misses: 0, results: [], requeued: 0 };
}

/** Shuffle the choices into { id: 'c0'.., label } order (main.js shuffledChoices, rng injectable). */
export function shuffledChoices(choices, answer, rng = Math.random) {
  const arr = choices.map((label, i) => ({ id: 'c' + i, label }));
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  const correct = arr.find((c) => c.label === answer);
  return { arr, correctId: correct ? correct.id : arr[0].id };
}

/**
 * What to show for the current round (main.js startRound, lines 477-486).
 * After 2 misses the choices narrow to the answer plus one other (F7). Sort rounds have no
 * choice buttons (correctId '__sortdone'); tile rounds have none either (correctId '__spelldone').
 * Returns { round, choices, correctId, tileRound, bigWord, replayText }; `choices` is the shuffled [{ id, label }] list.
 * bigWord is the Belle spelling word with its blanks (round.show); replayText is the 🔊 sentence (round.replay) (F12).
 */
export function roundView(qb, rng = Math.random) {
  const round = qb.rounds[qb.roundIdx];
  const tileRound = !!(round.spell || round.build); // letter or word tiles instead of choice buttons
  let choices = round.sort || tileRound ? [] : round.choices;
  if (qb.misses >= 2 && !round.sort && !tileRound) {
    const other = round.choices.find((c) => c !== round.answer);
    choices = other ? [round.answer, other] : [round.answer];
  }
  const { arr, correctId } = round.sort ? { arr: [], correctId: '__sortdone' }
    : tileRound ? { arr: [], correctId: '__spelldone' }
    : shuffledChoices(choices, round.answer, rng);
  return { round, choices: arr, correctId, tileRound, bigWord: round.show || null, replayText: round.replay || null };
}

/** Ladder bookkeeping for a finished round (main.js noteResult). Re-asks don't count twice. */
export function noteResult(qb, round) {
  if (round.requeued || qb.results.length >= 5) return;
  qb.results.push({ round, firstTry: qb.misses === 0, hinted: qb.misses > 0 });
  // Missed it? Ask it again 2 rounds later in this quest (at most twice).
  if (qb.misses > 0 && qb.requeued < 2) {
    qb.requeued++;
    qb.rounds.splice(Math.min(qb.rounds.length, qb.roundIdx + 3), 0, { ...round, requeued: true });
  }
}

/** Move to the next round (main.js nextRound). Returns true when the quest is over. */
export function nextRound(qb) {
  qb.roundIdx++;
  qb.misses = 0;
  return qb.roundIdx >= qb.rounds.length;
}

/**
 * One pick from the current round (main.js pick handler, 514-560).
 * Returns 'spellwrong' | 'sortwrong' (a miss, no reveal) | 'correct' | 'reveal' (3rd miss) | 'retry' (gentle retry).
 * Mutates the questbook, and saveData.stars / shards ONLY on 'correct' (the caller saves).
 */
export function pick(qb, pickedId, correctId, saveData) {
  const round = qb.rounds[qb.roundIdx];
  if (pickedId === '__spellwrong') {
    qb.misses++;
    return 'spellwrong';
  }
  if (pickedId === '__sortwrong') {
    qb.misses++;
    return 'sortwrong';
  }
  if (pickedId === correctId) {
    noteResult(qb, round);
    saveData.stars += 1;
    if (!saveData.done.includes(qb.npcId)) saveData.shards[qb.npcId] += 1;
    return 'correct';
  }
  if (qb.misses >= 2) {
    // Third miss: show the answer gently and count the round as done (never a star).
    qb.misses++;
    noteResult(qb, round);
    return 'reveal';
  }
  // Gentle retry: never reveal the answer, never penalize.
  qb.misses++;
  return 'retry';
}

/* ---- Helpers the views need (ported from js/main.js and js/ui.js) ---- */

// Praise after a right answer (main.js PRAISES, 25-30).
export const PRAISES = [
  'Wonderful! You did it!',
  'Amazing work, superstar!',
  'Yes! You are so smart!',
  'Beautiful! Keep shining!',
];

/** A random praise line (main.js startRound correct branch). rng injectable. */
export function praiseLine(rng = Math.random) {
  return PRAISES[Math.floor(rng() * PRAISES.length)];
}

const _an = (n) => (/^[aeiou]/.test(n) ? 'an' : 'a');
const _itemLine = (i) => `${_an(i.name) === 'an' ? 'An' : 'A'} ${i.name}.`;

/** Sort round: the first picture's line, read after the question (ui.js _sortBins, firstItemLine). */
export function sortFirstLine(sort) {
  const items = sort.items || [];
  if (!items.length) return '';
  return sort.kind === 'words' ? items[0].name : _itemLine(items[0]);
}

/**
 * Is this bin right for this item? ui.js _sortBins: the first bin is "yes" (living, or naming for the
 * word sort); a word sort item is right when it is naming. yesBin is true for the first bin.
 */
export function sortBinRight(item, wordSort, yesBin) {
  return yesBin === !!(wordSort ? item.naming : item.living);
}

/** Hint for a wrong bin (ui.js _sortBins, the hint text shown and spoken). */
export function sortWrongHint(item, wordSort) {
  if (wordSort) return 'Good try! A naming word names a thing. An action word tells what it does.';
  return item.living
    ? `Good try! ${_an(item.name) === 'an' ? 'An' : 'A'} ${item.name} needs water to grow. Is it living?`
    : `Good try! Does ${_an(item.name)} ${item.name} need water to grow?`;
}

/** Hint for a wrong dictation tile by its slot (ui.js showChallenge build.onWrong, 1301-1303). */
export function dictationHint(build, index) {
  const last = index === build.target.length - 1;
  return (build.hints && (index === 0 ? build.hints.first : last ? build.hints.last : null)) || build.hint || '';
}
