// ============================================================================
// Zoe's Starlight Quest: the 120-chart star map (Wayfinder Isle, Moana)
// ----------------------------------------------------------------------------
// Pure functions, no DOM, no imports. The chart is 12 rows of 10 (1-120): the number in row r, column c is (r - 1) * 10 + c.
// Rounds are ordinary rounds (3 answer buttons) with a picture: round.visual = { kind: 'chart', ... } drawn by chartHtml().
//   visual: { kind:'chart', rowLo, rows, hlRow?, hlCol?, marks?:[{n,e}], blank?, start? }
//   rowLo = first shown row (1-12), rows = how many rows are shown, hlRow / hlCol = a bright row / column (1-based),
//   marks = cells that show a sea animal instead of their number, blank = a cell that shows "?", start = the canoe cell.
// CA CCSS 1.NBT.A.1 (count to 120, read and write numerals) and 1.NBT.C.5 (ten more).
// ============================================================================

const _pick = (arr, rng) => arr[Math.floor(rng() * arr.length)];
function _shuffle(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
const _int = (lo, hi, rng) => lo + Math.floor(rng() * (hi - lo + 1));   // lo..hi inclusive

export const CHART_ROWS = 12;
export const cellRow = (n) => Math.ceil(n / 10);
export const cellCol = (n) => ((n - 1) % 10) + 1;
export const cellAt = (row, col) => (row - 1) * 10 + col;
export const cellPos = (n) => ({ row: cellRow(n), col: cellCol(n) });

/** Move across the chart: dir 'down' | 'up' (one row = 10) or 'right' | 'left' (one cell). Returns null if it leaves the chart or wraps a row end. */
export function stepFrom(n, dir, k = 1) {
  if (dir === 'down' || dir === 'up') {
    const r = cellRow(n) + (dir === 'down' ? k : -k);
    return r >= 1 && r <= CHART_ROWS ? cellAt(r, cellCol(n)) : null;
  }
  const c = cellCol(n) + (dir === 'right' ? k : -k);
  return c >= 1 && c <= 10 ? cellAt(cellRow(n), c) : null;
}

export const SEA = [
  { name: 'turtle', e: '🐢' }, { name: 'crab', e: '🦀' }, { name: 'shell', e: '🐚' }, { name: 'fish', e: '🐟' }, { name: 'flower', e: '🌺' },
];

// A window of `rows` rows (default 6) that contains every row used by `nums`, slid by chance, kept inside 1-12.
function _window(nums, rows, rng) {
  const lo = Math.min(...nums.map(cellRow)), hi = Math.max(...nums.map(cellRow));
  const slack = rows - (hi - lo + 1);
  let start = lo - _int(0, Math.max(0, slack), rng);
  start = Math.max(1, Math.min(start, CHART_ROWS - rows + 1));
  if (start > lo) start = lo;
  return start;
}

// Two wrong choices from a list of named mistakes (all valid, distinct, not the answer), padded with near misses.
function _wrongTwo(answer, mistakes, rng, lo, hi) {
  const ok = (x) => Number.isInteger(x) && x >= lo && x <= hi && x !== answer;
  const out = [];
  for (const m of _shuffle(mistakes, rng)) if (ok(m) && !out.includes(m)) out.push(m);
  for (const m of _shuffle([answer + 1, answer - 1, answer + 10, answer - 10, answer + 2, answer - 2], rng)) if (out.length < 2 && ok(m) && !out.includes(m)) out.push(m);
  return out.slice(0, 2);
}
const _numChoices = (answer, wrong, rng) => _shuffle([answer, ...wrong], rng).map(String);

// ---- Find an animal on a number ("Which animal is on 27?") ----
export function chartFind(tier, rng) {
  const easy = tier === 1;
  const n = easy ? _int(3, 38, rng) : _int(12, 110, rng);
  const sideStep = cellCol(n) < 10 && (cellCol(n) === 1 || rng() < 0.5) ? 1 : -1;
  const near = [n + sideStep];                                            // a neighbour in the same row
  if (easy) { const c2 = [n - 2, n + 2, n - sideStep * 2].filter((x) => x >= 1 && x <= 40 && cellRow(x) === cellRow(n) && x !== n && x !== near[0]); near.push(_pick(c2.length ? c2 : [n - sideStep], rng)); }
  else near.push(stepFrom(n, rng() < 0.5 && cellRow(n) > 1 ? 'up' : 'down') ?? stepFrom(n, 'up'));   // a cell in the row above or below
  const cells = [n, ...near];
  const animals = _shuffle(SEA, rng).slice(0, 3);
  const marks = cells.map((c, i) => ({ n: c, e: animals[i].e }));
  const rowLo = easy ? 1 : _window(cells, 6, rng);
  return {
    kind: 'chartfind', prompt: `Which animal is on ${n}?`,
    visual: { kind: 'chart', rowLo, rows: easy ? 4 : 6, ...(easy ? { hlRow: cellRow(n) } : {}), marks },
    choices: _shuffle(animals.map((a) => a.name), rng), answer: animals[0].name,
    hint: easy ? 'Good try! Find the bright row. Then count across, one number at a time.'
      : 'Good try! Look at the numbers next to it. Count one number at a time.',
  };
}

// ---- Missing number in a row or a column ("What number is missing?") ----
export function chartMissing(tier, rng, axis) {
  const easy = tier === 1;
  axis = axis || (easy ? 'row' : rng() < 0.5 ? 'row' : 'col');
  let n;
  if (easy) n = axis === 'row' ? cellAt(_int(1, 4, rng), _int(2, 9, rng)) : cellAt(_int(2, 3, rng), _int(1, 10, rng));
  else if (tier === 2) n = cellAt(_int(axis === 'row' ? 1 : 2, axis === 'row' ? 12 : 11, rng), _int(2, 9, rng));
  else n = rng() < 0.5 ? cellAt(_int(2, 12, rng), 1) : cellAt(_int(1, 11, rng), 10);     // Stretch: at the start or the end of a row
  const rowLo = easy ? 1 : _window([n, ...(stepFrom(n, 'down') ? [stepFrom(n, 'down')] : []), ...(stepFrom(n, 'up') ? [stepFrom(n, 'up')] : [])], 6, rng);
  const hi = easy ? 40 : 120;
  const wrong = axis === 'row' || tier === 3
    ? _wrongTwo(n, [n - 10, n + 10, n + 2, n - 2], rng, 1, hi)        // a row down / up, or skipped one
    : _wrongTwo(n, [n - 1, n + 1, n + 2, n - 2], rng, 1, hi);         // a column pattern: the step of one instead of ten
  return {
    kind: axis === 'row' ? 'chartrow' : 'chartcol', prompt: axis === 'row' ? 'What number is missing from the bright row?' : 'What number is missing from the bright column?',
    visual: { kind: 'chart', rowLo, rows: easy ? 4 : 6, ...(axis === 'row' ? { hlRow: cellRow(n) } : { hlCol: cellCol(n) }), blank: n },
    choices: _numChoices(n, wrong, rng), answer: String(n), noChoiceSay: true,
    hint: axis === 'row' ? 'Good try! Look at the number before it and the number after it. Count one number at a time.'
      : 'Good try! Look at the number above it and the number below it. Going down one row is ten more.',
  };
}

// ---- Follow a clue ("Start at 57. Go down 10.") ----
const _say10 = (k) => (k === 10 ? 'ten' : String(k));
export function chartClue(tier, rng) {
  const two = tier === 3;
  for (let tries = 0; tries < 100; tries++) {
    const s = _int(1, 120, rng);
    const vdir = rng() < 0.6 ? 'down' : 'up', hdir = rng() < 0.5 ? 'right' : 'left', hk = _int(1, 3, rng);
    let moves;
    if (!two) moves = rng() < 0.5 ? [{ dir: vdir, k: 1 }] : [{ dir: hdir, k: hk }];
    else moves = [{ dir: vdir, k: 1 }, { dir: hdir, k: hk }];
    let at = s; const path = [s];
    for (const m of moves) { at = at === null ? null : stepFrom(at, m.dir, m.k); path.push(at); }
    if (at === null) continue;
    const ans = at;
    // Named mistakes: wrong way, forgot a step, off by one.
    const mist = [];
    if (!two) {
      const m = moves[0], opp = { down: 'up', up: 'down', right: 'left', left: 'right' }[m.dir];
      mist.push(stepFrom(s, opp, m.k), m.k === 1 ? stepFrom(s, m.dir === 'down' || m.dir === 'up' ? 'right' : 'down') : null, ans + 1, ans - 1);
    } else {
      const [v, h] = moves, opp = { down: 'up', up: 'down', right: 'left', left: 'right' };
      mist.push(path[1], stepFrom(s, h.dir, h.k), stepFrom(stepFrom(s, opp[v.dir], 1) ?? -1, h.dir, h.k), stepFrom(path[1], opp[h.dir], h.k));
    }
    const wrong = _wrongTwo(ans, mist.map((x) => (x === null ? NaN : x)), rng, 1, 120);
    if (wrong.length < 2) continue;
    const words = (list, say) => list.map((m, i) => `${i === 0 ? 'Go ' : ''}${m.dir} ${say ? _say10(m.k * (m.dir === 'down' || m.dir === 'up' ? 10 : 1)) : m.k * (m.dir === 'down' || m.dir === 'up' ? 10 : 1)}`).join(', then ');
    const rowsUsed = path.filter((x) => x !== null);
    return {
      kind: two ? 'chartclue2' : 'chartclue1',
      prompt: `Start at ${s}. ${words(moves, false)}. What number are you on?`,
      say: `Start at ${s}. ${words(moves, true)}. What number are you on?`,
      visual: { kind: 'chart', rowLo: _window(rowsUsed, 6, rng), rows: 6, start: s },
      choices: _numChoices(ans, wrong, rng), answer: String(ans), noChoiceSay: true,
      hint: two ? 'Good try! Do the first move. Then do the second move from where you land. Down is the next row, right is the next number.'
        : 'Good try! Down is the next row, and up is the row above. Right is the next number, and left is the number just before.',
    };
  }
  throw new Error('chartClue: no valid clue found');
}

// How Moana's three tiers mix the chart in: roughly half of her rounds (the rest stay shapes).
export function chartT1(rng) { return rng() < 0.5 ? chartFind(1, rng) : chartMissing(1, rng, 'row'); }
export function chartT2(rng) { const x = rng(); return x < 0.35 ? chartFind(2, rng) : x < 0.65 ? chartMissing(2, rng, 'col') : chartClue(2, rng); }
export function chartT3(rng) { return rng() < 0.6 ? chartClue(3, rng) : chartMissing(3, rng, 'row'); }

// ---- The picture ----
const CELL = 30;
export function chartHtml(v) {
  const marks = new Map((v.marks || []).map((m) => [m.n, m.e]));
  const rows = [];
  const hi = v.rowLo + v.rows - 1;
  let cells = '';
  for (let r = v.rowLo; r <= hi; r++) {
    for (let c = 1; c <= 10; c++) {
      const n = cellAt(r, c);
      const bright = v.hlRow === r || v.hlCol === c;
      let inner = String(n), bg = bright ? '#fde68a' : '#e0f2fe', col = '#0c4a6e', border = bright ? '2px solid #f59e0b' : '1px solid #bae6fd', fs = n >= 100 ? 11 : 13;
      if (marks.has(n)) { inner = `<span style="font-size:20px;line-height:1">${marks.get(n)}</span>`; }
      else if (v.blank === n) { inner = '?'; bg = '#fffbeb'; col = '#b45309'; border = '2px dashed #f59e0b'; fs = 16; }
      else if (v.start === n) { inner = `<span style="font-size:15px;line-height:1">🛶</span><span style="font-size:9px;line-height:1;font-weight:800">${n}</span>`; bg = '#fecdd3'; border = '2px solid #e11d48'; }
      cells += `<span aria-hidden="true" style="box-sizing:border-box;width:${CELL}px;height:${CELL}px;display:flex;flex-direction:column;align-items:center;justify-content:center;border-radius:6px;background:${bg};border:${border};color:${col};font-size:${fs}px;font-weight:800">${inner}</span>`;
    }
  }
  const firstN = cellAt(v.rowLo, 1), lastN = cellAt(hi, 10);
  // The label never names the hidden number: with a blank, the bright row / column and the range are described without their numbers.
  const hide = v.blank != null || v.start != null;
  const label = (hide ? 'Number chart' : `Number chart from ${firstN} to ${lastN}`) +
    (v.hlRow ? (hide ? ', one row is bright' : `, the row from ${cellAt(v.hlRow, 1)} to ${cellAt(v.hlRow, 10)} is bright`) : '') +
    (v.hlCol ? (hide ? ', one column is bright' : `, the column ending in ${v.hlCol === 10 ? 0 : v.hlCol} is bright`) : '') +
    (marks.size ? `, ${marks.size} sea animals are hiding numbers` : '') + (v.blank ? ', one number is missing' : '') + (v.start ? ', a canoe is on the start number' : '');
  return `<div role="img" aria-label="${label}" style="display:grid;grid-template-columns:repeat(10,${CELL}px);gap:1px;justify-content:center;margin:4px auto;padding:4px;border-radius:12px;background:#7dd3fc;max-width:100%">${cells}</div>`;
}
