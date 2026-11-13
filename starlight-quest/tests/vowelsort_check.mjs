// M4 group sorts: Belle's vowel jars and Ariel's shell sort. The truth is computed here from the words themselves
// (the vowel in the middle, the letters at the end), not from the generator's own fields.
import { buildRounds, roundKey, SHELL_ENDINGS } from '../js/quests.js';
import { groupBinRight, sortWrongHint, sortFirstLine, pick, createQuestbook } from '../src/flow/questbook.js';

const bad = new Map();
const ok = (c, why, r) => { if (!c) bad.set(why + (r ? ` | ${r.prompt} ${JSON.stringify(r.sort && r.sort.items)} [${r.choices}]` : ''), 1); };
const counts = { vowelsort: 0, shellsort: 0 };

for (const [npc, kind] of [['belle', 'vowelsort'], ['ariel', 'shellsort']]) {
  for (let tier = 1; tier <= 3; tier++) for (let seed = 1; seed <= 3000; seed++) {
    let s = seed * 2654435761 >>> 0;
    const rng = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
    for (const r of buildRounds(npc, rng, { tier, review: [] })) {
      if (r.kind !== kind) continue;
      counts[kind]++;
      const items = r.sort.items, bins = r.choices;
      ok(r.sort.kind === 'groups', 'sort kind', r);
      ok(bins.length >= 2 && bins.length <= 3 && new Set(bins).size === bins.length, 'bins', r);
      ok(r.answer === bins[0] && r.choices.includes(r.answer), 'answer is a bin', r);
      ok(new Set(items.map((i) => i.name)).size === items.length, 'repeated word', r);
      ok(items.length === bins.length * 2, 'two words per bin', r);
      ok(bins.every((_, b) => items.filter((i) => i.to === b).length === 2), 'every bin gets words', r);
      ok(items.every((i) => Number.isInteger(i.to) && i.to >= 0 && i.to < bins.length && typeof i.name === 'string' && i.name), 'item fields', r);
      // truth from the words
      for (const it of items) {
        const label = bins[it.to].replace(/^\S+\s/, '');   // "🫙 a" -> "a", "🐚 -nd" -> "-nd"
        if (kind === 'vowelsort') {
          ok(it.name.length === 3 && label === it.name[1], `${it.name} is in the ${label} jar`, r);
          bins.forEach((b, bi) => ok(groupBinRight(it, bi) === (b.replace(/^\S+\s/, '') === it.name[1]), 'groupBinRight disagrees with the vowel', r));
        } else {
          ok(it.name.endsWith(label.slice(1)), `${it.name} is in the ${label} shell`, r);
          const hits = bins.filter((b) => it.name.endsWith(b.replace(/^\S+\s-/, '')));
          ok(hits.length === 1, `${it.name} fits more than one shell`, r);
        }
      }
      ok(r.sort.hint.startsWith('Good try!') && r.hint === r.sort.hint, 'hint', r);
      ok(!bins.some((b) => new RegExp(`(^|[^a-z])${b.replace(/^\S+\s-?/, '')}([^a-z]|$)`).test(r.hint)), 'hint names a bin', r);
      ok(!/\d|[^\x00-\x7F]/.test(r.say), 'spoken text is plain words', r);
      ok(r.key === roundKey(r) && JSON.stringify(JSON.parse(JSON.stringify(r.sort))) === JSON.stringify(r.sort), 'key / plain JSON', r);
      ok(r.prompt.length <= 48, 'prompt short', r);
      ok(sortFirstLine(r.sort) === items[0].name, 'first line reads the first word', r);
      ok(sortWrongHint(items[0], false, r.sort) === r.sort.hint, 'wrong hint comes from the sort', r);
    }
  }
}
ok(counts.vowelsort > 500 && counts.shellsort > 500, `too few rounds ${JSON.stringify(counts)}`, null);
ok(Object.values(SHELL_ENDINGS).flat().every((w, _, all) => all.filter((x) => x === w).length === 1), 'a word is in two shell lists', null);
for (const [e, ws] of Object.entries(SHELL_ENDINGS)) ok(ws.every((w) => w.endsWith(e) && Object.keys(SHELL_ENDINGS).filter((o) => w.endsWith(o)).length === 1), 'bad ending list ' + e, null);
ok(groupBinRight({ name: 'x', to: 1 }, 1) && !groupBinRight({ name: 'x', to: 1 }, 0) && !groupBinRight({ name: 'x' }, 0) && !groupBinRight(null, 0), 'groupBinRight edge cases', null);
ok(sortWrongHint({ name: 'rock', living: false }, false).startsWith('Good try!'), 'old living sort hint unchanged', null);
ok(sortWrongHint({ name: 'x', naming: true }, true).includes('naming word'), 'old word sort hint unchanged', null);

// A whole vowel-jar round plays through the questbook: wrong bin is a miss, never a star.
let s2 = 7; const rng2 = () => ((s2 = (s2 * 1664525 + 1013904223) >>> 0) / 4294967296);
const sortRound = [...Array(400)].flatMap(() => buildRounds('belle', rng2, { tier: 2, review: [] })).find((r) => r.kind === 'vowelsort');
ok(!!sortRound, 'found a vowel sort round to play', null);
if (sortRound) {
  const qb = createQuestbook('belle', [sortRound]);
  const save = { stars: 0, shards: { belle: 0 }, done: [] };
  ok(pick(qb, '__sortwrong', '__sortdone', save) === 'sortwrong' && save.stars === 0, 'wrong bin is a miss with no star', null);
  ok(pick(qb, '__sortdone', '__sortdone', save) === 'correct' && save.stars === 1, 'finishing the sort is correct', null);
}

if (bad.size) { console.error('vowelsort_check FAILED:\n - ' + [...bad.keys()].slice(0, 15).join('\n - ')); process.exit(1); }
console.log(`vowelsort_check passed: ${counts.vowelsort} vowel jars, ${counts.shellsort} shell sorts`);
