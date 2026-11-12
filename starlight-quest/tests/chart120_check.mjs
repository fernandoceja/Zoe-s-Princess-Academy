// 120-chart star map (B1): the chart maths, every chart round (answer is right, picture agrees, no leaks), and the picture HTML.
import { cellRow, cellCol, cellAt, stepFrom, chartFind, chartMissing, chartClue, chartT1, chartT2, chartT3, chartHtml } from '../js/chart120.js';
import { buildRounds } from '../js/quests.js';

const bad = new Map();
const ok = (c, why, r) => { if (!c) bad.set(`${why} | ${r ? r.prompt + ' => ' + r.answer : ''}`, 1); };

// Chart maths, written independently: row r (1-12), column c (1-10) holds (r-1)*10+c.
for (let n = 1; n <= 120; n++) {
  ok(cellAt(cellRow(n), cellCol(n)) === n, `cellAt round trip ${n}`);
  ok(stepFrom(n, 'down') === (n + 10 <= 120 ? n + 10 : null), `down ${n}`);
  ok(stepFrom(n, 'up') === (n - 10 >= 1 ? n - 10 : null), `up ${n}`);
  ok(stepFrom(n, 'right') === (n % 10 !== 0 ? n + 1 : null), `right ${n} must not wrap`);
  ok(stepFrom(n, 'left') === (n % 10 !== 1 ? n - 1 : null), `left ${n} must not wrap`);
}

const RE = { find: /^Which picture is on \d+\?$/, clue: /^Start at \d+\. Go (down|up|right|left) [\w-]+\d*(, then (down|up|right|left) [\w-]+\d*)?\. What number are you on\?$/ };
const kinds = {};
for (let tier = 1; tier <= 3; tier++) {
  for (let seed = 1; seed <= 2000; seed++) {
    let s = (seed * 2654435761 + tier) >>> 0;
    const rng = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
    const r = [chartT1, chartT2, chartT3][tier - 1](rng);
    kinds[r.kind] = (kinds[r.kind] || 0) + 1;
    ok(r.choices.length === 3 && new Set(r.choices).size === 3 && r.choices.includes(r.answer), 'three unique choices incl. answer', r);
    ok(r.visual && r.visual.kind === 'chart', 'has a chart picture', r);
    ok(!/\d/.test(r.hint), 'hint has a digit', r);
    const html = chartHtml(r.visual);
    ok(/^<div/.test(html) && html.includes('🛶') === (r.visual.start != null), 'canoe only on a clue', r);
    ok(!new RegExp(`aria-label="[^"]*\\b${r.answer}\\b`).test(html) || r.kind === 'chartfind', 'aria-label leaks the answer', r);
    if (r.kind === 'chartfind') {
      ok(RE.find.test(r.prompt), 'find wording', r);
      const n = Number(r.prompt.match(/\d+/)[0]);
      const mk = r.visual.marks.find((m) => m.n === n);
      ok(mk && r.visual.marks.length >= 1, 'asked cell carries an animal', r);
    } else if (r.kind === 'chartrow' || r.kind === 'chartcol') {
      const b = r.visual.blank, a = Number(r.answer);
      ok(b != null && b === a, 'blank cell is the answer', r);
      if (r.kind === 'chartrow') ok(r.visual.hlRow === cellRow(a), 'bright row holds the answer', r);
      else ok(r.visual.hlCol === cellCol(a), 'bright column holds the answer', r);
    } else {
      ok(RE.clue.test(r.prompt), `clue wording "${r.prompt}"`, r);
      const st = r.visual.start, m = [...r.prompt.matchAll(/(down|up|right|left) (\d+|\w+)/g)];
      ok(st != null && m.length === (r.kind === 'chartclue2' ? 2 : 1), 'one or two moves', r);
      ok(!/Go [^,]*, then Go/.test(r.prompt), 'duplicate "Go" in two-step clue', r);
      const num = (x) => (/^\d+$/.test(x) ? Number(x) : { ten: 10, twenty: 20, thirty: 30, forty: 40 }[x]);
      let at = st;
      for (const [, d, k] of m) { const v = num(k); at = stepFrom(at, d, d === 'down' || d === 'up' ? v / 10 : v); }
      ok(at === Number(r.answer), `walking the clue lands on ${at}, not the answer`, r);
    }
    ok(Number(r.answer) >= 1 && Number(r.answer) <= 120 || r.kind === 'chartfind', 'answer on the chart', r);
    ok(r.noChoiceSay === true || r.kind === 'chartfind', 'number choices are not read as A/B/C', r);
  }
}
// Each tier actually offers chart rounds through buildRounds (about half the rounds).
for (let tier = 1; tier <= 3; tier++) {
  let c = 0, n = 0;
  for (let seed = 1; seed <= 300; seed++) {
    let s = seed * 97 >>> 0; const rng = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
    for (const r of buildRounds('moana', rng, { tier, review: [] })) { n++; if (r.visual && r.visual.kind === 'chart') c++; }
  }
  ok(c / n > 0.25 && c / n < 0.75, `tier ${tier}: chart share ${(c / n).toFixed(2)} should be about half`);
}
if (bad.size) { for (const k of [...bad.keys()].slice(0, 25)) console.log('  ' + k); console.log(`chart120_check: ${bad.size} problem(s)`); process.exit(1); }
console.log('chart120_check ok', JSON.stringify(kinds));
