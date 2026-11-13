/* Zoe's Starlight Quest: Thursday practice test (M3). Pure helpers, no DOM, no React.
 * A test is not a quest: it never calls questComplete or recordQuest, so the ladder, review queue and lastPlay are untouched.
 * The questbook carries qb.test = { log } while a test runs; handlePick records each round with noteWrong / finishRound,
 * and the end of the test is saved with recordSpellTest (last 4 weeks, newest first). */
import { buildSpellTest, WEEK, sanitizeSpellTests } from '../engine-core.js';

export const CROWN_STARS = 3;

/** Monday (YYYY-MM-DD) of the week that holds `day` (YYYY-MM-DD). Weeks start on Monday. */
export function mondayOf(day) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day || '');
  if (!m) return '';
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  const back = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - back);
  return d.toISOString().slice(0, 10);
}

/** The "week of" date results are filed under: the grown-up's date, else this week's Monday. */
export function effectiveWeekOf(saveData, day) {
  const w = saveData && saveData.weekMeta && saveData.weekMeta.weekOf;
  return w || mondayOf(day);
}

/** The rounds for one test, from the live WEEK pack and the grown-up's own sentences. */
export function startSpellTest(saveData, tier, rng = Math.random) {
  const sentences = (saveData && saveData.weekMeta && saveData.weekMeta.sentences) || {};
  return buildSpellTest(rng, tier, sentences, WEEK);
}

/** A fresh log for one test run. */
export function newTestLog() {
  return { words: {}, dictation: null, wrong: {} };
}

/** A wrong tile in slot `index` of the current round: remember the first wrong tile she tried in that slot. */
export function noteWrong(log, index, tile) {
  if (typeof index !== 'number' || typeof tile !== 'string') return;
  if (!(index in log.wrong)) log.wrong[index] = tile;
}

/** The round is finished (all tiles placed): file what she built and whether it was clean, then clear the per-round wrongs. */
export function finishRound(log, round, day) {
  const wrong = log.wrong; log.wrong = {};
  const miss = Object.keys(wrong).length > 0;
  if (round.test && round.test.word) {
    const w = round.test.word;
    const built = w.split('').map((c, i) => (i in wrong ? wrong[i] : c)).join('').slice(0, 12);
    log.words[w] = { built: /^[a-z]*$/.test(built) ? built : w, ok: !miss, date: day };
  } else if (round.test && round.test.dictation) {
    const target = round.build ? round.build.target : [];
    const built = target.map((t, i) => (i in wrong ? wrong[i] : t)).join(' ').replace(/ ([.?!])/g, '$1');
    log.dictation = { built: built.replace(/[^A-Za-z' ,.?!]/g, '').slice(0, 80), ok: !miss, date: day };
  }
}

/** File a finished test under its week (a retake of the same week replaces the words and keeps the crown).
 * Returns { entry, firstCrown } where firstCrown is true only the first time that week's test was finished. The caller saves. */
export function recordSpellTest(saveData, log, day) {
  const weekOf = effectiveWeekOf(saveData, day);
  const list = Array.isArray(saveData.spellTests) ? saveData.spellTests : [];
  const old = list.find((e) => e.weekOf === weekOf);
  const entry = { weekOf, words: { ...log.words }, crown: true };
  if (log.dictation) entry.dictation = log.dictation;
  const rest = list.filter((e) => e.weekOf !== weekOf);
  saveData.spellTests = sanitizeSpellTests([entry, ...rest].sort((a, b) => (a.weekOf < b.weekOf ? 1 : a.weekOf > b.weekOf ? -1 : 0)));
  return { entry, firstCrown: !(old && old.crown) };
}

/** What Belle reads back at the end: "Number 1. send." for each word, then the dictation sentence. */
export function readBackLines(rounds) {
  const lines = ["You finished your test! Let's read your words."];
  for (const r of rounds) {
    if (r.test && r.test.word) lines.push(`Number ${r.test.n}. ${r.test.word}.`);
  }
  const d = rounds.find((r) => r.test && r.test.dictation);
  if (d) lines.push(`Number ${d.test.n}. ${d.answer}`);
  return lines;
}

/** Words she needed help with, newest test first (Parent Corner "Words to practice"). */
export function wordsToPractice(entry) {
  return Object.keys(entry.words || {}).filter((w) => !entry.words[w].ok);
}
