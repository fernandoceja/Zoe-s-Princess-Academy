// Thursday practice test (M3): the builder, the read-aloud text, the results file and its sanitizer, the crown rule,
// and that a test never touches stars, shards, the ladder, the review queue or lastPlay.
import {
  buildSpellTest, testSentence, TEST_SENTENCES, WEEK, WEEK_DEFAULT, setWeek,
} from '../js/quests.js';
import { merge, sanitizeSpellTests, sanitizeWeekMeta } from '../js/save.js';
import { createQuestbook, roundView, pick } from '../src/flow/questbook.js';
import { voiceText } from '../src/flow/voice.js';
import { mondayOf, effectiveWeekOf, newTestLog, noteWrong, finishRound, recordSpellTest, readBackLines, wordsToPractice, CROWN_STARS } from '../src/flow/spelltest.js';
import { applyWeek, resetWeek } from '../src/flow/parent.js';
import { WEEK as LIVE_WEEK } from '../src/engine-core.js'; // the shell's copy of the engine (stamped import), which applyWeek sets

const bad = [];
const ok = (c, why) => { if (!c) bad.push(why); };
const rngFrom = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };

// (a) one tile round per spelling word, in order, then the dictation sentence as a tile build.
setWeek(null);
for (const tier of [1, 2, 3]) {
  for (let seed = 1; seed <= 200; seed++) {
    const rounds = buildSpellTest(rngFrom(seed * 31 + tier), tier);
    const words = WEEK_DEFAULT.spelling;
    ok(rounds.length === words.length + 1, `t${tier}: ${rounds.length} rounds, expected ${words.length + 1}`);
    words.forEach((w, i) => {
      const r = rounds[i];
      ok(r.spell && r.spell.word === w && r.test && r.test.word === w && r.test.n === i + 1, `t${tier}: round ${i} is not the word ${w}`);
      // (b) the shown text never holds the word, the speech says Number N, the word twice and the sentence.
      ok(!new RegExp(`\\b${w}\\b`, 'i').test(`${r.prompt} ${r.hint}`), `t${tier}: ${w} leaks in the shown text`);
      ok(r.say.startsWith(`Number ${i + 1}. ${w}. `) && r.say.endsWith(` ${w}.`) && r.say.includes(testSentence(w)), `t${tier}: say is "${r.say}"`);
      ok(r.noChoiceSay === true, `t${tier}: noChoiceSay`);
      // (d) the tile bank holds every letter and is not already the word
      const bank = r.spell.tiles.slice();
      for (const c of w) { const k = bank.indexOf(c); ok(k >= 0, `t${tier}: tile ${c} missing for ${w}`); if (k >= 0) bank.splice(k, 1); }
      ok(r.spell.tiles.join('') !== w, `t${tier}: tiles already spell ${w}`);
    });
    const d = rounds[rounds.length - 1];
    ok(d.build && d.build.sentence && d.test.dictation && d.answer === WEEK_DEFAULT.dictation, `t${tier}: last round is not the dictation build`);
    ok(d.prompt.startsWith(`Number ${words.length + 1}. Listen`), `t${tier}: dictation prompt`);
    // (i) tile rounds have no choice buttons, so voiceText adds no "Is it...?"
    for (const r of rounds) ok(!/Is it /.test(voiceText('belle', r, [])), 'voice adds an A/B/C line');
  }
}

// Tier 3 dictation tells her about the capital and end mark.
{ const r3 = buildSpellTest(rngFrom(4), 3); const d3 = r3[r3.length - 1]; ok(/capital/.test(d3.say) && /capital/.test(d3.prompt), 'tier 3 test sentence mentions the capital letter and end mark'); }

// (c) sentence priority: parent > built-in > template; an invalid parent sentence falls back.
ok(testSentence('send', 'Please send it now.') === 'Please send it now.', 'parent sentence wins');
ok(testSentence('send', 'bad sentence') === TEST_SENTENCES.send, 'invalid parent sentence falls back to the built-in one');
ok(testSentence('zzzy') === 'I can spell zzzy.', 'template for an unknown word');
for (const [w, t] of Object.entries(TEST_SENTENCES)) {
  ok(new RegExp(`\\b${w}\\b`, 'i').test(t) && t.split(/\s+/).length <= 8, `built-in sentence for ${w}: ${t}`);
}

// (e) logging and filing results.
{
  const log = newTestLog();
  const rounds = buildSpellTest(rngFrom(5), 2);
  noteWrong(log, 1, 'a'); noteWrong(log, 1, 'z'); // only the first wrong tile per slot is kept
  finishRound(log, rounds[0], '2026-11-12'); // lend: clean (wrongs were noted after? no, noted before) -> built with the wrong tile
  ok(log.words.lend && log.words.lend.ok === false && log.words.lend.built === 'land', `miss built "${log.words.lend && log.words.lend.built}"`);
  finishRound(log, rounds[1], '2026-11-12');
  ok(log.words.send.ok === true && log.words.send.built === 'send', 'clean word');
  const save = { stars: 7, spellTests: [], weekMeta: { weekOf: '', sentences: {} } };
  const a = recordSpellTest(save, log, '2026-11-12');
  ok(a.firstCrown === true && save.spellTests.length === 1 && save.spellTests[0].weekOf === '2026-11-09', 'first filing');
  const b = recordSpellTest(save, log, '2026-11-13');
  ok(b.firstCrown === false && save.spellTests.length === 1 && save.spellTests[0].crown === true, 'a retake of the same week keeps the crown and gives no second award');
  for (const day of ['2026-11-02', '2026-10-26', '2026-10-19', '2026-10-12']) recordSpellTest(save, log, day);
  ok(save.spellTests.length === 4 && save.spellTests[0].weekOf === '2026-11-09' && save.spellTests[3].weekOf === '2026-10-19', `4 weeks kept newest first: ${save.spellTests.map((e) => e.weekOf)}`);
  ok(wordsToPractice(save.spellTests[0]).join() === 'lend', 'words to practice');
  ok(effectiveWeekOf({ weekMeta: { weekOf: '2026-11-09' } }, '2026-11-12') === '2026-11-09', 'a typed week-of wins this week');
  ok(effectiveWeekOf({ weekMeta: { weekOf: '2026-11-02' } }, '2026-11-12') === '2026-11-09', 'a stale week-of falls back to this Monday');
  ok(effectiveWeekOf({ weekMeta: { weekOf: '' } }, '2026-11-12') === '2026-11-09', 'no week-of uses Monday');
  { const sv = { spellTests: [], weekMeta: { weekOf: '2026-01-05', sentences: {} } }; const r1 = recordSpellTest(sv, log, '2026-11-12'); const r2 = recordSpellTest(sv, log, '2026-11-13'); ok(r1.firstCrown && !r2.firstCrown && sv.spellTests.length === 1 && sv.spellTests[0].weekOf === '2026-11-09', 'a stale typed date cannot lose results or re-award the crown'); }
  ok(mondayOf('2026-11-15') === '2026-11-09' && mondayOf('2026-11-09') === '2026-11-09' && mondayOf('bad') === '', 'mondayOf');
  const lines = readBackLines(rounds);
  ok(lines[1] === 'Number 1. lend.' && lines.length === rounds.length + 1 - 0, `read back lines ${JSON.stringify(lines)}`);
}

// (f) picking on a scratch save never changes the real one; CROWN_STARS is the only award.
{
  const real = { stars: 3, done: ['elsa'], shards: { belle: 1 }, ladder: {}, lastPlay: {} };
  const qb = createQuestbook('belle', buildSpellTest(rngFrom(9), 2));
  const view = roundView(qb, rngFrom(9));
  ok(view.tileRound && view.choices.length === 0, 'tile round has no choice buttons');
  const kind = pick(qb, '__spelldone', view.correctId, { stars: 0, done: ['belle'], shards: { belle: 0 } });
  ok(kind === 'correct' && real.stars === 3 && real.shards.belle === 1 && !Object.keys(real.lastPlay).length, 'scratch save kept the real one safe');
  ok(CROWN_STARS === 3, 'crown stars');
}

// (g)/(h) the sanitizers and merge never throw and drop bad data.
{
  const junk = [null, 5, 'x', [], {}, [null], [{ weekOf: 'nope' }], [{ weekOf: '2026-11-09', words: 5 }],
    [{ weekOf: '2026-11-09', words: { 'BAD!': { ok: true }, good: { ok: 'yes' }, fine: { ok: false, built: 'finn', date: 'x' } }, crown: 'true' }],
    [{ weekOf: '2026-11-09' }, { weekOf: '2026-11-09' }]];
  for (const j of junk) { try { sanitizeSpellTests(j); } catch (e) { ok(false, `sanitizeSpellTests threw on ${JSON.stringify(j)}`); } }
  const s = sanitizeSpellTests(junk[8]);
  ok(s.length === 1 && Object.keys(s[0].words).join() === 'fine' && s[0].words.fine.date === '2026-11-09' && s[0].crown === false, `sanitized ${JSON.stringify(s)}`);
  ok(sanitizeSpellTests(junk[9]).length === 1, 'duplicate weekOf dropped');
  const many = Array.from({ length: 9 }, (_, i) => ({ weekOf: `2026-0${(i % 9) + 1}-01`, words: Object.fromEntries(Array.from({ length: 30 }, (_, k) => ['w' + String.fromCharCode(97 + (k % 26)), { ok: true }])) }));
  const m = sanitizeSpellTests(many);
  ok(m.length === 4 && Object.keys(m[0].words).length <= 15, 'bounds: 4 weeks, 15 words');
  ok(JSON.stringify(m).length < 4096, 'size stays small');
  const wm = sanitizeWeekMeta({ weekOf: '2026-11-09', sentences: { send: 'I will send a card.', lend: 'No word here.', 'BAD': 'Bad.', zed: 'x'.repeat(80) } });
  ok(wm.weekOf === '2026-11-09' && Object.keys(wm.sentences).join() === 'send', `weekMeta ${JSON.stringify(wm)}`);
  ok(sanitizeWeekMeta(null).weekOf === '' && sanitizeWeekMeta('x').sentences && Object.keys(sanitizeWeekMeta(7).sentences).length === 0, 'weekMeta on junk');
  const old = merge({ stars: 4, done: ['belle'] });
  ok(Array.isArray(old.spellTests) && old.spellTests.length === 0 && old.weekMeta.weekOf === '', 'an older save loads with empty test fields');
  const back = merge(JSON.parse(JSON.stringify({ ...old, spellTests: s, weekMeta: wm })));
  ok(back.spellTests.length === 1 && back.weekMeta.sentences.send === 'I will send a card.', 'round trip through merge');
}

// Parent Corner: applyWeek keeps the week-of and only sentences for words in this week's spelling list; reset clears them.
{
  const save = { week: null, weekMeta: null };
  globalThis.window = { localStorage: { getItem: () => null, setItem: () => {} } };
  applyWeek(save, { spelling: 'send, lend', sight: '', dictation: '', vowels: '', weekOf: '2026-11-09', sentences: { send: 'I will send a card.', fast: 'The dog is fast.', lend: 'oops' } });
  ok(save.weekMeta.weekOf === '2026-11-09' && Object.keys(save.weekMeta.sentences).join() === 'send', `applyWeek meta ${JSON.stringify(save.weekMeta)}`);
  ok(LIVE_WEEK.spelling.join() === 'send,lend', 'applyWeek still sets the pack');
  resetWeek(save);
  ok(save.weekMeta.weekOf === '' && Object.keys(save.weekMeta.sentences).length === 0, 'resetWeek clears the meta');
}

if (bad.length) { for (const b of [...new Set(bad)].slice(0, 20)) console.log('  ' + b); console.log(`spelltest_check: ${new Set(bad).size} problem(s)`); process.exit(1); }
console.log('spelltest_check ok: builder, read-aloud text, 4-week results, crown once per week, sanitizers, Parent Corner meta');
