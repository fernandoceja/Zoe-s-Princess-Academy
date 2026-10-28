// Tiana's quests (K13): tally marks. Every round is checked thousands of times per tier. The truth is computed HERE, independent of the game:
// a tally of n has exactly n marks, grouped as floor(n/5) groups of four upright lines with one slash across them, plus n%5 single lines.
import { readFileSync } from 'node:fs';
import { buildRounds, QUESTS, PRINCESSES, NPC_ORDER, NO_CLIP_IDS, revealLines, PARENT_CORNER_HTML, TALLY_VEGGIES } from '../js/quests.js';
import { tallySVG, tallyCardHtml, tallyGroups } from '../js/tally.js';
import { BUILT_SLOTS, builtSlotIds, unseenKingdomSlots, shouldRunFinale, NEW_LAND_SLOTS, openLandIds, isBayouOpen, closedSlots } from '../js/worldmap.js';
import { findsTotal } from '../js/treasures.js';
import { merge } from '../js/save.js';

const bad = new Map();
const show = (r) => (r ? ` | ${r.prompt || ''} => ${r.answer} [${(r.choices || []).join(',')}] ${r.visual ? JSON.stringify(r.visual) : ''}` : '');
const ok = (c, why, r) => { if (!c) bad.set(why + show(r), 1); };

// ---- Independent reading of a tally picture: parse the SVG text ----
function readTally(svg) {
  const groups = [...svg.matchAll(/<g data-count="(\d+)">([\s\S]*?)<\/g>/g)].map((m) => {
    const lines = [...m[2].matchAll(/<line class="(tm|ts)" x1="([\d.-]+)" y1="([\d.-]+)" x2="([\d.-]+)" y2="([\d.-]+)"/g)].map((l) => ({ cls: l[1], x1: +l[2], y1: +l[3], x2: +l[4], y2: +l[5] }));
    return { declared: +m[1], uprights: lines.filter((l) => l.cls === 'tm'), slashes: lines.filter((l) => l.cls === 'ts') };
  });
  const vb = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  return { groups, W: vb ? +vb[1] : 0, H: vb ? +vb[2] : 0, total: svg.match(/data-tally="(\d+)"/) ? +svg.match(/data-tally="(\d+)"/)[1] : -1, allLines: (svg.match(/<line /g) || []).length };
}
// Truth: does this drawing show exactly n?
function checkTally(n, svg, r) {
  const t = readTally(svg);
  ok(t.allLines === n, `tally of ${n} has ${t.allLines} marks`, r);                       // one <line> per mark
  ok(t.total === n, `tally of ${n} is labelled ${t.total}`, r);
  const full = Math.floor(n / 5), rest = n % 5;
  ok(t.groups.length === full + (rest ? 1 : 0), `tally of ${n} has ${t.groups.length} groups`, r);
  let prevRight = -Infinity, sum = 0;
  t.groups.forEach((g, i) => {
    const isFull = i < full;
    if (isFull) {
      ok(g.uprights.length === 4 && g.slashes.length === 1 && g.declared === 5, `group ${i} of ${n} is four lines and a slash`, r);
      const s = g.slashes[0], xs = g.uprights.map((u) => u.x1).sort((a, b) => a - b);
      ok(s && s.x1 < xs[0] && s.x2 > xs[3], 'the slash starts left of the first line and ends right of the fourth', r);       // crosses all four
      ok(s && s.y1 > s.y2 && s.y1 - s.y2 >= 20, 'the slash clearly slants (rises at least 20 units)', r);                         // diagonal, not upright
      ok(s && g.uprights.every((u) => u.x1 === u.x2 && u.y1 !== u.y2), 'upright lines are vertical', r);
      ok(s && g.uprights.every((u) => s.y1 > u.y1 && s.y2 < u.y2) , 'the slash crosses the lines between their ends', r);
      ok(xs.every((x, k) => k === 0 || x - xs[k - 1] >= 11), 'lines are at least 11 units apart (clear at 390px)', r);
    } else {
      ok(g.uprights.length === rest && g.slashes.length === 0 && g.declared === rest, `last group of ${n} is ${rest} single lines, no slash`, r);
      ok(g.uprights.every((u) => u.x1 === u.x2), 'single lines are vertical', r);
    }
    sum += g.declared;
    const xsAll = [...g.uprights, ...g.slashes].flatMap((l) => [l.x1, l.x2]), left = Math.min(...xsAll), right = Math.max(...xsAll);
    ok(left > prevRight + 4, 'groups do not touch each other', r);                                                               // gap between groups
    ok(left >= 0 && right <= t.W, 'marks stay inside the picture', r);
    prevRight = right;
  });
  ok(sum === n, `groups add up to ${n}`, r);
  ok(t.W > 0 && t.H > 0 && t.W <= 270, 'picture width fits 390px phone (<= 270 units)', r);
}
const tallyOf = (v) => (v.kind === 'tally' ? v.n : null);
const tallyHtml = (v) => tallyCardHtml(v);

// Direct: every n from 1 to 20 through the renderer and through the card
for (let n = 1; n <= 20; n++) { checkTally(n, tallySVG(n), null); const h = tallyHtml({ kind: 'tally', n }); ok((h.match(/<line /g) || []).length === n, `card for ${n} has ${n} marks`, null); }
ok(tallySVG(0).includes('<svg') && !/<line /.test(tallySVG(0)), 'zero draws an empty picture, no marks', null);
ok(!/<line /.test(tallySVG(NaN)) && (tallySVG(99).match(/<line /g) || []).length === 20, 'bad counts are healed (NaN -> 0, 99 -> 20)', null);
ok(JSON.stringify(tallyGroups(13).map((g) => g.count)) === '[5,5,3]' && JSON.stringify(tallyGroups(20).map((g) => g.count)) === '[5,5,5,5]', 'groups for 13 and 20', null);

const E = /[\p{Extended_Pictographic}️‍⃣]/u;
const BARE = /(^|\s)[.?!]+(\s|$)/;
const spoken = (where, t, r) => { t = String(t ?? '');
  ok(t.trim() && !E.test(t) && !/ \.|\s[.?!,]/.test(t) && !/\bis\s*[.?!]/.test(t) && !BARE.test(t) && !/[|\/\\*#<>=]/.test(t) && !/[卌𝍸]/.test(t) && !/\d/.test(t), 'spoken text not clean: ' + where + ' "' + t + '"', r); };
const NUM = 'zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty'.split(' ');
const NUMRE = new RegExp(`(^|[^a-z])(${NUM.join('|')}|\\d+)([^a-z]|$)`, 'i');
const WORDS = (n) => (n <= 20 ? NUM[n] : n < 30 ? 'twenty-' + NUM[n - 20] : String(n));
const strip = (t) => String(t).replace(/[\p{Extended_Pictographic}️‍]/gu, '').trim();

// ---- Rounds ----
let count = 0; const kinds = {}; const samples = {};
const seenAns = { 1: new Set(), 2: new Set() }; const seenChart = { most: new Set(), diff: new Set(), howmany: new Set(), veg: new Set(), rows2: 0, rows3: 0, tie: 0 };
for (let tier = 1; tier <= 3; tier++) {
  for (let seed = 1; seed <= 4000; seed++) {
    let s = seed * 2654435761 >>> 0;
    const rng = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
    for (const r of buildRounds('tiana', rng, { tier, review: [] })) {
      count++; kinds[`T${r.tier}:${r.kind}`] = (kinds[`T${r.tier}:${r.kind}`] || 0) + 1;
      (samples[`T${r.tier}`] ||= new Map()).set(r.kind, r);
      ok(Array.isArray(r.choices) && r.choices.length === 3 && new Set(r.choices).size === 3, 'needs 3 unique choices', r);
      ok(r.choices.includes(r.answer), 'answer in choices', r);
      ok(typeof r.prompt === 'string' && r.prompt && typeof r.hint === 'string' && r.hint, 'prompt and hint', r);
      ok(r.tier === tier || r.tier === Math.max(1, tier - 1), 'tagged with this or the tier below', r);
      ok(r.choices.every((c) => c.length <= 20), 'choice short enough for a 390px button', r);
      ok(r.prompt.length <= 48, 'prompt short enough', r);
      spoken('prompt', r.say || r.prompt, r); spoken('hint', r.hint, r); spoken('reveal', revealLines(r).say, r);
      ok(!r.pic, 'no stray pictures', r);
      // The hint never gives the answer: no number or number word at all, and never the answer's own words.
      ok(!NUMRE.test(r.hint), 'hint contains a number', r);
      ok(!new RegExp(`(^|[^a-z])${strip(r.answer).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z]|$)`, 'i').test(r.hint), 'hint contains the answer', r);
      ok(!/[卌]/.test(JSON.stringify([r.prompt, r.say, r.hint, r.choices])), 'no tally glyphs in the text', r);
      ok(!r.visual || (r.visual.kind === 'tally' || r.visual.kind === 'tallychart'), 'visual kind', r);
      // Numbers are spoken as words
      if (/^\d+$/.test(r.answer)) {
        ok(r.answerSay === WORDS(+r.answer), 'spoken answer is the number word', r);
        ok(r.choiceSay && r.choices.every((c) => r.choiceSay[c] === WORDS(+c)), 'every number choice has its word', r);
        for (const c of r.choices) spoken('choice said', r.choiceSay[c], r);
        spoken('answerSay', r.answerSay, r);
        ok(r.choices.every((c) => /^\d+$/.test(c) && +c > 0 && +c <= 25), 'number choices are 1 to 25', r);
      }

      if (r.kind === 'count' || r.kind === 'fives' || r.kind === 'group') {
        const v = r.visual, n = tallyOf(v);
        ok(v && v.kind === 'tally' && Number.isInteger(n), 'a tally picture with a count', r);
        checkTally(n, tallySVG(n), r);
        ok(r.answer === String(n), `answer ${r.answer} equals the number of marks drawn (${n})`, r);
        ok(r.choices.map(Number).every((c) => c !== n ? Math.abs(c - n) <= 5 : true), 'wrong choices are close to the answer (within 5)', r);
        if (r.kind === 'count') { ok(r.tier === 1 && n >= 1 && n <= 10, 'tier 1 shows 1 to 10', r); seenAns[1].add(n); ok(r.prompt === 'How many tally marks?', 'tier 1 prompt', r); }
        if (r.kind === 'fives') { ok(r.tier === 2 && n % 5 === 0 && n >= 5 && n <= 20, 'count by fives uses only full groups, 5 to 20', r); seenAns[2].add(n); ok(/fives/.test(r.prompt), 'prompt says fives', r); ok(r.choices.map(Number).every((c) => c === n || Math.abs(c - n) === 1 || Math.abs(c - n) === 5), 'fives choices are off by 1 or 5', r); }
        if (r.kind === 'group') { ok(r.tier === 2 && n >= 6 && n <= 20, 'tier 2 shows 6 to 20', r); seenAns[2].add(n); ok(r.choices.map(Number).every((c) => c === n || Math.abs(c - n) === 1 || Math.abs(c - n) === 5), 'group choices are off by 1 or 5', r); }
        ok(r.say.includes('Count'), 'spoken prompt asks to count', r);
      } else if (r.kind === 'most' || r.kind === 'howmany' || r.kind === 'diff') {
        ok(r.tier === 3, 'charts are tier 3', r);
        const v = r.visual;
        ok(v && v.kind === 'tallychart' && v.rows.length >= 2 && v.rows.length <= 3, '2 or 3 rows', r);
        const rows = v.rows; rows.length === 2 ? seenChart.rows2++ : seenChart.rows3++;
        rows.forEach((row) => seenChart.veg.add(row.e + row.name));
        ok(rows.every((row) => TALLY_VEGGIES.some(([e, nm]) => e === row.e && nm === row.name)), 'rows use the vegetable list', r);
        ok(new Set(rows.map((x) => x.name)).size === rows.length && new Set(rows.map((x) => x.e)).size === rows.length, 'rows are different vegetables', r);
        ok(rows.every((x) => x.n >= 1 && x.n <= 10), 'each row 1 to 10', r);
        // every row's picture is exactly its count (render the whole card and count marks)
        const html = tallyHtml(v), perRow = html.split('<svg').slice(1).map((x) => (x.match(/<line /g) || []).length);
        ok(JSON.stringify(perRow) === JSON.stringify(rows.map((x) => x.n)), `chart pictures show ${rows.map((x) => x.n)} but draw ${perRow}`, r);
        rows.forEach((row) => checkTally(row.n, tallySVG(row.n), r));
        ok(rows.every((row) => html.includes(row.e) && html.includes(row.name)), 'chart labels show the picture and the name', r);
        const counts = rows.map((x) => x.n);
        if (r.kind === 'most') {
          const max = Math.max(...counts), winners = rows.filter((x) => x.n === max);
          ok(winners.length === 1, 'exactly one row has the most (no ties)', r);
          ok(r.choices.length === rows.length && r.choices.every((c) => rows.some((x) => `${x.e} ${x.name}` === c)), 'choices are the chart labels', r);
          ok(rows.length === 3, 'most uses 3 rows', r);
          ok(r.answer === `${winners[0].e} ${winners[0].name}`, 'answer is the row with the most', r);
          ok(r.prompt === 'Which has the most?' && !r.choiceSay && !r.answerSay, 'most prompt; names read from the choices', r);
          ok(rows.every((x) => !new RegExp(x.name).test(r.hint)), 'hint names no vegetable', r);
          seenChart.most.add(winners[0].name);
        }
        if (r.kind === 'howmany') {
          const m = r.prompt.match(/^How many ([a-z]+)\?$/), row = m && rows.find((x) => x.name === m[1]);
          ok(!!row, 'asks about a row of the chart', r);
          ok(row && r.answer === String(row.n), 'answer is that row\'s count', r);
          seenChart.howmany.add(row && row.n);
          ok(r.say.includes(row ? row.name : '?'), 'spoken prompt names the row', r);
          ok(r.choices.map(Number).every((c) => c === (row && row.n) || (Math.abs(c - row.n) <= 5 && c > 0)), 'howmany choices are close and positive', r);
        }
        if (r.kind === 'diff') {
          const m = r.prompt.match(/^How many more ([a-z]+) than ([a-z]+)\?$/);
          const a = m && rows.find((x) => x.name === m[1]), b = m && rows.find((x) => x.name === m[2]);
          ok(a && b && a !== b, 'compares two rows', r);
          ok(a && b && a.n > b.n, 'the first row is longer (a real "how many more")', r);
          ok(a && b && r.answer === String(a.n - b.n) && a.n - b.n >= 1 && a.n - b.n <= 9, 'answer is the difference, 1 to 9', r);
          if (a && b) { const max = Math.max(...counts), min = Math.min(...counts); ok(a.n === max && b.n === min, 'compares the longest and shortest rows', r); }
          ok(a && b && r.say.includes(`more ${a.name} than ${b.name}`), 'spoken prompt matches', r);
          seenChart.diff.add(a && b && a.n - b.n);
        }
      } else ok(false, 'unknown kind ' + r.kind, r);

      if (r.tier === 1) ok(r.kind === 'count', 'tier 1 only counts marks', r);
      if (r.tier === 2) ok(r.kind === 'fives' || r.kind === 'group', 'tier 2 only counts groups', r);
      if (r.tier === 3) ok(['most', 'howmany', 'diff'].includes(r.kind), 'tier 3 only reads charts', r);
    }
  }
}
for (const k of ['T1:count', 'T2:fives', 'T2:group', 'T3:most', 'T3:howmany', 'T3:diff']) ok((kinds[k] || 0) > 1000, 'kind appears: ' + k);
ok(seenAns[1].size === 10 && [...seenAns[1]].sort((a, b) => a - b).join() === '1,2,3,4,5,6,7,8,9,10', 'tier 1 shows every count 1 to 10');
ok([5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20].every((n) => seenAns[2].has(n)), 'tier 2 shows every count 5 to 20');
ok(seenChart.veg.size === 5 && seenChart.most.size === 5 && seenChart.rows2 > 100 && seenChart.rows3 > 100, 'every vegetable, both chart sizes appear');
ok(seenChart.diff.size === 9 && seenChart.howmany.size === 10, 'differences 1 to 9 and counts 1 to 10 appear');

// Fallback quest rounds follow the same rules.
{ const f = QUESTS.tiana.rounds;
  ok(f.length === 5, 'five fallback rounds');
  for (const r of f) {
    ok(r.choices.length === 3 && new Set(r.choices).size === 3 && r.choices.includes(r.answer), 'fallback round shape', r);
    spoken('fallback prompt', r.say || r.prompt, r); spoken('fallback hint', r.hint, r); spoken('fallback reveal', revealLines(r).say, r);
    ok(!NUMRE.test(r.hint), 'fallback hint has no number', r);
    if (r.choiceSay) for (const c of r.choices) spoken('fallback choice said', r.choiceSay[c], r);
    if (r.visual && r.visual.kind === 'tally') { checkTally(r.visual.n, tallySVG(r.visual.n), r); ok(r.answer === String(r.visual.n), 'fallback tally answer is true', r); }
  }
  const ch = f[3].visual.rows, top = ch.reduce((a, b) => (b.n > a.n ? b : a));
  ok(f[3].answer === `${top.e} ${top.name}`, 'fallback "most" is true', f[3]);
  const [m2, m1] = [f[4].visual.rows.find((x) => x.name === 'corn'), f[4].visual.rows.find((x) => x.name === 'tomatoes')];
  ok(f[4].answer === String(m2.n - m1.n), 'fallback difference is true', f[4]); }

// Wiring and story lines
ok(NPC_ORDER[NPC_ORDER.length - 1] === 'tiana' && NPC_ORDER.indexOf('tiana') === NPC_ORDER.indexOf('anna') + 1, 'tiana follows anna in NPC_ORDER');
ok(NO_CLIP_IDS.includes('tiana'), 'tiana uses the speech voice (no clips)');
ok(PRINCESSES.tiana.landName === 'Firefly Bayou' && QUESTS.tiana.title === 'The Tally Stand' && QUESTS.tiana.questName === 'The Tally Stand', 'land name and title');
ok(/Tiana/.test(PARENT_CORNER_HTML) && /1\.MD\.C\.4/.test(PARENT_CORNER_HTML) && /Tally Stand/.test(PARENT_CORNER_HTML), 'Parent Corner row with the standard');
ok(BUILT_SLOTS.wsw === 'tiana' && builtSlotIds().includes('wsw') && isBayouOpen() && isBayouOpen('?preview=bayou') && isBayouOpen('?preview=all'), 'wsw is built for Tiana; ?preview=bayou is harmless');
ok(JSON.stringify(openLandIds()) === JSON.stringify(['cove', 'isle', 'garden', 'harbor', 'bayou']) && findsTotal(openLandIds()) === 45, 'nine lands (4 inner + 5 new), 45 treasures');
ok(closedSlots().length === 1 && closedSlots()[0].slot === 'ene', 'only the Aurora gate (ene) is still closed');
const lines = [...QUESTS.tiana.intro, ...QUESTS.tiana.complete, QUESTS.tiana.title, QUESTS.tiana.questName];
for (const l of lines) spoken('story line', l, null);
ok(QUESTS.tiana.intro.length >= 2 && QUESTS.tiana.complete.length >= 1, 'story lines exist');
for (const l of lines) ok(l.split(/\s+/).length <= 18, 'line too long for a 6-year-old: ' + l, null);

// Original content: none of the film's characters, places, songs or plot.
const FILM = /\b(naveen|louis|ray|facilier|shadow man|mama odie|odie|charlotte|eudora|james|lawrence|frog|frogs|prince|princess and the|kiss|kissing|voodoo|almost there|dig a little deeper|palace|restaurant|wish|wishing|evening star|new orleans|gumbo|beignet|beignets|jazz|dream|dreams|firefly ray|evangeline|louisiana)\b/i;
const allRounds = Object.values(samples).flatMap((m) => [...m.values()]);
const i = PARENT_CORNER_HTML.indexOf('Tiana'), tianaText = JSON.stringify([QUESTS.tiana, PARENT_CORNER_HTML.slice(i - 200, PARENT_CORNER_HTML.indexOf('Starlight Finale')), allRounds.map((r) => [r.prompt, r.say, r.hint, r.choices]), TALLY_VEGGIES]);
for (const l of lines) ok(!FILM.test(l), 'film word in Tiana line: ' + l, null);
ok(!FILM.test(tianaText), 'film word in Tiana text: ' + (tianaText.match(FILM) || [])[0], null);

// Opening the bayou: new-kingdom card, saves, finale.
ok(JSON.stringify(unseenKingdomSlots(builtSlotIds(), ['sse', 'ssw', 'nne', 'ese'])) === '["wsw"]', 'a save that saw sse, ssw, nne and ese gets a card for the bayou only');
ok(unseenKingdomSlots(builtSlotIds(), ['sse', 'ssw', 'nne', 'ese', 'wsw']).length === 0, 'once seen, no card again');
{ const m = merge({ done: ['belle', 'elsa', 'rapunzel', 'cinderella', 'ariel', 'moana', 'jasmine', 'anna'], seenNewKingdoms: true, seenKingdoms: ['sse', 'ssw', 'nne', 'ese'], shards: { anna: 5 }, treasures: { got: [] } });
  ok(m.shards.tiana === 0 && !m.done.includes('tiana') && m.done.length === 8 && m.shards.anna === 5 && m.seenKingdoms.length === 4, 'existing saves keep progress; Tiana starts fresh'); }
ok(!shouldRunFinale(NPC_ORDER, NPC_ORDER, builtSlotIds().length) && shouldRunFinale(NPC_ORDER, NPC_ORDER, NEW_LAND_SLOTS.length), 'finishing Tiana never runs the crown finale (the Aurora slot is still closed)');
ok(!shouldRunFinale(NPC_ORDER.slice(0, -1), NPC_ORDER, NEW_LAND_SLOTS.length), 'with every slot built the finale still needs Tiana done too');
{ const src = (f) => readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
  const main = src('js/main.js'), ui = src('js/ui.js'), sw = src('sw.js'), ci = readFileSync(new URL('../../.github/workflows/starlight-tests.yml', import.meta.url), 'utf8');
  ok(/tiana: 'bayou'/.test(main) && /tallyCardHtml\(round\.visual\)/.test(main) && /npcId === 'tiana'\) && !round\.noChoiceSay/.test(main), 'main wires the land, the tally card and read-aloud choices');
  ok(/Bayou/.test(ui) && /🪷/.test(ui), 'the new-kingdom card has a bayou emoji');
  ok(/\.\/js\/tally\.js\?v=\w+/.test(sw), 'tally.js is precached');
  ok(/tiana_check\.mjs/.test(ci), 'the check runs in CI'); }

console.log(`tiana_check: ${count} rounds`, JSON.stringify(kinds), 'problems', bad.size);
for (const k of [...bad.keys()].slice(0, 25)) console.log(' ', k);
if (bad.size) process.exit(1);
if (process.argv.includes('--samples')) for (const [t, m] of Object.entries(samples)) for (const r of m.values()) console.log(t, r.kind, '|', r.prompt, '|', r.visual ? JSON.stringify(r.visual) : '', '|', r.choices.join(' / '), '| answer:', r.answer, '| hint:', r.hint);
