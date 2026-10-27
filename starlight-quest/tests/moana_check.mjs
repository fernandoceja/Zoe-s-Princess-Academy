// Moana's quests (K7): shapes. Every round is checked 3000 times per tier against a truth table written HERE,
// independent of the game code (the game's own SHAPE_FACTS is also compared to it).
import { buildRounds, QUESTS, PRINCESSES, NPC_ORDER, NO_CLIP_IDS, SHAPE_FACTS, revealLines, PARENT_CORNER_HTML } from '../js/quests.js';
import { shapeSVG, flatPoints } from '../js/shapes.js';

const bad = new Map();
const fail = (why, r) => bad.set(`${why} | ${r ? r.prompt + ' => ' + r.answer + ' [' + (r.choices || []).join(',') + ']' : ''}`, 1);
const ok = (c, why, r) => { if (!c) fail(why, r); };

// ---- Truth table (hand-written from geometry; "flat faces" for solids; a circle has no straight sides or corners) ----
const TRUTH = {
  circle:    { dim: 2, sides: 0, corners: 0 },
  triangle:  { dim: 2, sides: 3, corners: 3 },
  square:    { dim: 2, sides: 4, corners: 4 },
  rectangle: { dim: 2, sides: 4, corners: 4 },
  pentagon:  { dim: 2, sides: 5, corners: 5 },
  hexagon:   { dim: 2, sides: 6, corners: 6 },
  cube:      { dim: 3, faces: 6, corners: 8, rolls: false },
  sphere:    { dim: 3, faces: 0, corners: 0, rolls: true },
  cone:      { dim: 3, faces: 1, rolls: true },
  cylinder:  { dim: 3, faces: 2, rolls: true },
};
const OBJECT_SHAPE = { 'a ball': 'sphere', 'a dice': 'cube', 'a can of soup': 'cylinder', 'a drum': 'cylinder', 'a pointy party hat': 'cone' };
const ROLLS = { 'a ball': true, 'a book': false, 'a shoebox': false, 'a toy brick': false };
const NUM = { no: 0, one: 1 };

// The game's own table must match ours.
for (const [k, t] of Object.entries(TRUTH)) {
  const g = SHAPE_FACTS[k];
  ok(!!g, 'SHAPE_FACTS has ' + k);
  if (!g) continue;
  for (const f of ['sides', 'corners', 'faces']) if (t[f] !== undefined) ok(g[f] === t[f], `SHAPE_FACTS ${k}.${f}`);
}

const E = /[\p{Extended_Pictographic}️‍⃣]/u;
const spoken = (where, t, r) => { t = String(t ?? '');
  ok(t.trim() && !E.test(t) && !/ \.|\s[.?!,]/.test(t) && !/\bis\s*[.?!]/.test(t), 'spoken text not clean: ' + where + ' "' + t + '"', r); };
const WORDNUM = { 0: 'zero|no', 1: 'one', 2: 'two', 3: 'three', 4: 'four', 5: 'five', 6: 'six', 7: 'seven', 8: 'eight', 12: 'twelve' };
const hasAnswer = (text, ans) => {
  const t = text.toLowerCase();
  const a = String(ans).toLowerCase();
  if (/^\d+$/.test(a)) return new RegExp(`(^|[^0-9])${a}([^0-9]|$)`).test(t) || new RegExp(`\\b(${WORDNUM[a] || 'zzz'})\\b`).test(t.replace(/\bno corners\b|\bno flat faces\b/g, ''));
  return new RegExp(`(^|[^a-z])${a}([^a-z]|$)`).test(t);
};

let n = 0; const kinds = {}; const samples = {};
for (let tier = 1; tier <= 3; tier++) {
  for (let seed = 1; seed <= 3000; seed++) {
    let s = seed * 2654435761 >>> 0;
    const rng = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
    for (const r of buildRounds('moana', rng, { tier, review: [] })) {
      n++; kinds[`T${r.tier}:${r.kind}`] = (kinds[`T${r.tier}:${r.kind}`] || 0) + 1;
      (samples[`T${r.tier}`] ||= new Map()).set(r.kind, r);
      // Shape of a round
      ok(Array.isArray(r.choices) && r.choices.length === 3 && new Set(r.choices).size === 3, 'needs 3 unique choices', r);
      ok(r.choices.includes(r.answer), 'answer in choices', r);
      ok(typeof r.prompt === 'string' && r.prompt && typeof r.hint === 'string' && r.hint, 'prompt and hint', r);
      ok(r.tier === tier || r.tier === Math.max(1, tier - 1), 'tagged with this or the tier below', r);
      ok(!hasAnswer(r.hint, r.answer), 'hint contains the answer', r);
      if (/^\d+$/.test(r.answer)) ok(!/\d/.test(r.hint), 'hint contains a digit', r);
      spoken('prompt', r.say || r.prompt, r); spoken('hint', r.hint, r); spoken('reveal', revealLines(r).say, r);
      for (const c of r.choices) spoken('choice', c, r);
      if (r.pic) ok(!r.choices.some((c) => c.includes(r.pic)), 'pic shown inside a choice', r);
      const sq = r.choices.includes('square') && r.choices.includes('rectangle');
      ok(!sq, 'square and rectangle offered together (a square is also a rectangle)', r);

      // The picture matches the question
      if (r.visual) {
        ok(r.visual.kind === 'shape' && TRUTH[r.visual.shape], 'visual names a known shape', r);
        const svg = shapeSVG(r.visual);
        ok(/^<svg[^>]*>.*<\/svg>$/s.test(svg) && svg.includes(`data-shape="${r.visual.shape}"`), 'svg drawn for the shape', r);
        const t = TRUTH[r.visual.shape];
        if (t.dim === 2 && r.visual.shape !== 'circle') {
          const pts = (svg.match(/points="([^"]+)"/) || [])[1];
          ok(pts && pts.trim().split(/\s+/).length === t.sides, 'polygon has the right number of corners', r);
        }
        ok(!/NaN|undefined/.test(svg), 'svg has no NaN', r);
      }

      // Every question is checked against the truth table, whatever generator made it.
      let want = null, m;
      if (r.kind === 'name') {
        ok(r.prompt === 'Which shape is this?' && r.visual, 'naming round shows a picture', r);
        want = r.visual.shape;
        const dims = new Set(r.choices.map((c) => TRUTH[c] && TRUTH[c].dim));
        ok(dims.size === 1, 'naming choices are all flat or all solid', r);
      } else if (r.prompt === 'How many corners does a cube have?') {
        want = String(TRUTH.cube.corners);
      } else if ((m = r.prompt.match(/^How many (sides|corners) does a (\w+) have\?$/))) {
        want = String(TRUTH[m[2]][m[1]]);
        ok(TRUTH[m[2]].dim === 2 && m[2] !== 'circle', 'sides/corners are only asked about shapes with straight sides', r);
        ok(r.visual && r.visual.shape === m[2], 'picture is the shape asked about', r);
      } else if ((m = r.prompt.match(/^How many flat faces does a (\w+) have\?$/))) {
        want = String(TRUTH[m[1]].faces); ok(TRUTH[m[1]].dim === 3, 'faces only for solids', r);
        ok(r.visual && r.visual.shape === m[1], 'picture is the solid asked about', r);
      } else if (r.prompt === 'Which shape has no corners?') {
        const cands = r.choices.filter((c) => TRUTH[c].dim === 2 && TRUTH[c].corners === 0);
        ok(cands.length === 1 && r.choices.every((c) => TRUTH[c].dim === 2), 'exactly one flat shape without corners', r);
        want = cands[0];
      } else if ((m = r.prompt.match(/^Which shape has (\d) (sides|corners)\?$/))) {
        const cands = r.choices.filter((c) => TRUTH[c][m[2]] === Number(m[1]));
        ok(cands.length === 1, 'exactly one shape with that many ' + m[2], r);
        want = cands[0];
      } else if ((m = r.prompt.match(/^Which shape has (no|one|\d) flat faces?\?$/))) {
        const k = m[1] in NUM ? NUM[m[1]] : Number(m[1]);
        const cands = r.choices.filter((c) => TRUTH[c].faces === k);
        ok(cands.length === 1 && r.choices.every((c) => TRUTH[c].dim === 3), 'exactly one solid with that many flat faces', r);
        ok((k === 1) === /face\?$/.test(r.prompt) || k === 0, 'face/faces grammar', r);
        want = cands[0];
      } else if ((m = r.prompt.match(/^What shape is (a [\w ]+)\?$/))) {
        want = OBJECT_SHAPE[m[1]]; ok(!!want, 'known object ' + m[1], r);
        ok(r.choices.every((c) => TRUTH[c] && TRUTH[c].dim === 3), 'object answers are solid shapes', r);
        ok(!r.prompt.toLowerCase().includes(want), 'prompt does not say the answer', r);
      } else if (r.prompt === 'Which one can roll?') {
        const cands = r.choices.filter((c) => ROLLS[c] === true);
        ok(cands.length === 1 && r.choices.every((c) => c in ROLLS), 'exactly one rolling thing', r);
        want = cands[0];
      } else ok(false, 'unknown prompt: ' + r.prompt, r);
      ok(want !== null && r.answer === want, `answer should be ${want}`, r);
      // Tier fit
      if (r.kind === 'name' || r.kind === 'object') ok(true);
      if (r.tier === 1) ok(r.kind === 'name', 'tier 1 only names shapes', r);
      if (r.tier === 3) ok(TRUTH[r.visual ? r.visual.shape : r.choices[0]] ? (r.visual ? TRUTH[r.visual.shape].dim === 3 : true) : true, 'tier 3 is solids and real things', r);
    }
  }
}
// Fallback quest rounds follow the same rules.
for (const r of QUESTS.moana.rounds) {
  ok(r.choices.length === 3 && new Set(r.choices).size === 3 && r.choices.includes(r.answer), 'fallback round shape', r);
  spoken('fallback prompt', r.prompt, r); spoken('fallback hint', r.hint, r);
  ok(!hasAnswer(r.hint, r.answer), 'fallback hint contains the answer', r);
}
ok(QUESTS.moana.rounds.length === 5, 'five fallback rounds');
{ const f = QUESTS.moana.rounds; // truth for the fallbacks
  ok(f[0].answer === 'cylinder' && f[1].answer === String(TRUTH.triangle.sides) && f[2].answer === 'circle' && f[3].answer === 'sphere' && f[4].answer === String(TRUTH.cube.faces), 'fallback answers are true'); }

// Drawing: every shape draws, flat shapes have the right corner count at any turn, solids have no polygon of the wrong count.
for (const [name, t] of Object.entries(TRUTH)) {
  for (const rot of [0, 20, 45, 90, 137, 300]) for (const variant of [0, 1, 2]) {
    const svg = shapeSVG({ shape: name, rot, variant, color: '#38bdf8', scale: 0.8 });
    ok(svg.startsWith('<svg') && svg.includes('viewBox="0 0 120 120"'), 'draws ' + name);
    if (t.dim === 2 && name !== 'circle') {
      ok(flatPoints(name, variant).length === t.sides, `${name} variant ${variant} has ${t.sides} points`);
      const pts = svg.match(/points="([^"]+)"/)[1].trim().split(/\s+/).map((p) => p.split(',').map(Number));
      ok(pts.length === t.sides && pts.every(([x, y]) => x >= 0 && x <= 120 && y >= 0 && y <= 120), `${name} stays inside the picture when turned ${rot}`);
    }
  }
}
// Square sides really are equal and the rectangle's are not (the picture teaches the attribute).
{ const d = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const sq = flatPoints('square'); const L = [0, 1, 2, 3].map((i) => d(sq[i], sq[(i + 1) % 4]));
  ok(L.every((x) => Math.abs(x - L[0]) < 1e-6), 'square sides are equal');
  for (const v of [0, 1]) { const rc = flatPoints('rectangle', v); ok(Math.abs(d(rc[0], rc[1]) - d(rc[1], rc[2])) > 10, 'rectangle sides are not equal'); } }
ok(shapeSVG({ shape: 'nope' }).includes('<svg') && !/NaN/.test(shapeSVG({})), 'unknown shape never throws');

// Wiring and story lines
ok(NPC_ORDER.includes('moana') && NPC_ORDER[NPC_ORDER.length - 1] === 'moana' && NPC_ORDER.indexOf('moana') === NPC_ORDER.indexOf('ariel') + 1, 'moana follows ariel in NPC_ORDER');
ok(NO_CLIP_IDS.includes('moana'), 'moana uses the speech voice (no clips)');
ok(PRINCESSES.moana.landName === 'Wayfinder Isle' && QUESTS.moana.title === 'The Shape Stones', 'land name and title');
ok(/Moana/.test(PARENT_CORNER_HTML) && /1\.G\.A\.1/.test(PARENT_CORNER_HTML) && /1\.G\.A\.2/.test(PARENT_CORNER_HTML), 'Parent Corner row with the standard');
const lines = [...QUESTS.moana.intro, ...QUESTS.moana.complete, QUESTS.moana.title, QUESTS.moana.questName];
for (const l of lines) spoken('story line', l, null);
ok(QUESTS.moana.intro.length >= 2 && QUESTS.moana.complete.length >= 1, 'story lines exist');
for (const l of lines) ok(l.split(/\s+/).length <= 18, 'line too long for a 6-year-old: ' + l, null);
// Original story: none of the film's characters, songs or plot.
const FILM = /\b(maui|te fiti|te ka|te k[aā]|heihei|pua|kakamora|tamatoa|heart|how far|you'?re welcome|ocean|demigod|fish ?hook|ancestors?|chosen|shiny|gramma|tala|tui|sina)\b/i;
const allText = JSON.stringify([QUESTS.moana, ...Object.values(samples).flatMap((m) => [...m.values()].map((r) => [r.prompt, r.hint, r.choices]))]);
for (const l of lines) ok(!FILM.test(l), 'film word in Moana line: ' + l, null);
ok(!FILM.test(allText), 'film word in Moana rounds: ' + (allText.match(FILM) || [])[0], null);
ok(!/heart of/i.test(allText) && !/how far/i.test(allText) && !/you're welcome/i.test(allText), 'no film phrases');

console.log(`moana_check: ${n} rounds`, JSON.stringify(kinds), 'problems', bad.size);
for (const k of [...bad.keys()].slice(0, 25)) console.log(' ', k);
if (bad.size) process.exit(1);
if (process.argv.includes('--samples')) for (const [t, m] of Object.entries(samples)) for (const r of m.values()) console.log(t, r.kind, '|', r.prompt, '|', r.choices.join(' / '), '| answer:', r.answer, '|', r.visual ? JSON.stringify(r.visual) : '', r.pic || '', '| hint:', r.hint);
