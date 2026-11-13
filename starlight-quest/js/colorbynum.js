// ============================================================================
// Zoe's Starlight Quest: paint the garden (Rapunzel, Sunflower Meadows)
// ----------------------------------------------------------------------------
// Pure functions, no DOM, no imports. A garden picture has 8 painted pieces; one piece is missing (grey, with a "?").
// She answers a number fact (doubles, make 10, facts to 20) and the missing piece is the one she paints.
//   round.visual = { kind: 'paint', pic: 'flower' | 'house' | 'butterfly', region: 0-7 }, drawn by paintHtml().
// CA CCSS 1.OA.C.6 (add and subtract within 20, doubles, make 10).
// ============================================================================

const _pick = (arr, rng) => arr[Math.floor(rng() * arr.length)];
function _shuffle(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
const _int = (lo, hi, rng) => lo + Math.floor(rng() * (hi - lo + 1));
const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen',
  'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'];

const ROSE = '#FF8FB8', GOLD = '#F6C945', LILAC = '#C9B3F2', MINT = '#8FD6C4', LEAF = '#4ADE80', SKY = '#BAE6FD', BROWN = '#B45309', RED = '#F87171';

function petal(a, fill) {
  const r = (a * Math.PI) / 180;
  return { svg: (f) => `<ellipse cx="60" cy="26" rx="11" ry="18" transform="rotate(${a} 60 50)" fill="${f}"`, fill, cx: 60 + 24 * Math.sin(r), cy: 50 - 24 * Math.cos(r) };
}
/** The three pictures: eight pieces each (an open SVG tag without the closing `/>`, its paint, and where its "?" sits). */
export const PICTURES = {
  flower: [
    { svg: (f) => `<rect x="57" y="76" width="6" height="38" rx="3" fill="${f}"`, fill: LEAF, cx: 60, cy: 106 },
    petal(0, ROSE), petal(60, GOLD), petal(120, LILAC), petal(180, ROSE), petal(240, GOLD), petal(300, LILAC),
    { svg: (f) => `<circle cx="60" cy="50" r="11" fill="${f}"`, fill: BROWN, cx: 60, cy: 50 },
  ],
  house: [
    { svg: (f) => `<rect x="24" y="56" width="72" height="50" fill="${f}"`, fill: GOLD, cx: 60, cy: 94 },
    { svg: (f) => `<polygon points="16,58 60,22 104,58" fill="${f}"`, fill: RED, cx: 60, cy: 48 },
    { svg: (f) => `<rect x="50" y="78" width="20" height="28" rx="3" fill="${f}"`, fill: BROWN, cx: 60, cy: 92 },
    { svg: (f) => `<rect x="30" y="66" width="14" height="14" fill="${f}"`, fill: SKY, cx: 37, cy: 73 },
    { svg: (f) => `<rect x="76" y="66" width="14" height="14" fill="${f}"`, fill: SKY, cx: 83, cy: 73 },
    { svg: (f) => `<rect x="78" y="22" width="10" height="22" fill="${f}"`, fill: LILAC, cx: 83, cy: 33 },
    { svg: (f) => `<circle cx="104" cy="16" r="10" fill="${f}"`, fill: GOLD, cx: 104, cy: 16 },
    { svg: (f) => `<rect x="6" y="106" width="108" height="10" rx="5" fill="${f}"`, fill: LEAF, cx: 60, cy: 111 },
  ],
  butterfly: [
    { svg: (f) => `<ellipse cx="38" cy="40" rx="22" ry="18" transform="rotate(-20 38 40)" fill="${f}"`, fill: ROSE, cx: 38, cy: 40 },
    { svg: (f) => `<ellipse cx="82" cy="40" rx="22" ry="18" transform="rotate(20 82 40)" fill="${f}"`, fill: ROSE, cx: 82, cy: 40 },
    { svg: (f) => `<ellipse cx="42" cy="78" rx="17" ry="15" transform="rotate(20 42 78)" fill="${f}"`, fill: LILAC, cx: 42, cy: 78 },
    { svg: (f) => `<ellipse cx="78" cy="78" rx="17" ry="15" transform="rotate(-20 78 78)" fill="${f}"`, fill: LILAC, cx: 78, cy: 78 },
    { svg: (f) => `<rect x="55" y="34" width="10" height="56" rx="5" fill="${f}"`, fill: BROWN, cx: 60, cy: 62 },
    { svg: (f) => `<circle cx="60" cy="26" r="9" fill="${f}"`, fill: BROWN, cx: 60, cy: 26 },
    { svg: (f) => `<circle cx="34" cy="38" r="6" fill="${f}"`, fill: GOLD, cx: 34, cy: 38 },
    { svg: (f) => `<circle cx="86" cy="38" r="6" fill="${f}"`, fill: GOLD, cx: 86, cy: 38 },
  ],
};
export const PIC_NAMES = Object.keys(PICTURES);
export const PIECES = 8;
const PIC_LABEL = { flower: 'flower', house: 'little house', butterfly: 'butterfly' };

/** The picture: every piece painted except `region`, which is grey with a "?". */
export function paintHtml(v) {
  const pic = PICTURES[v && v.pic] ? v.pic : 'flower';
  const miss = Number.isInteger(v && v.region) && v.region >= 0 && v.region < PIECES ? v.region : 0;
  let out = '';
  PICTURES[pic].forEach((p, i) => {
    out += i === miss
      ? `${p.svg('#E5E7EB')} stroke="#6B5B95" stroke-width="2.5" stroke-dasharray="5 4" data-region="${i}" data-missing="1"/>`
      : `${p.svg(p.fill)} stroke="#2B1E5C" stroke-width="2" data-region="${i}"/>`;
  });
  const m = PICTURES[pic][miss];
  out += `<text x="${m.cx.toFixed(1)}" y="${(m.cy + 7).toFixed(1)}" text-anchor="middle" font-size="22" font-weight="800" fill="#2B1E5C">?</text>`;
  return `<svg viewBox="0 0 120 120" width="100%" style="max-width:190px;display:block;margin:0 auto" role="img" aria-label="A ${PIC_LABEL[pic]} with one piece left to paint">${out}</svg>`;
}

// ---- Rounds ----
const HINT = {
  add: 'Good try! Hold up your fingers. Start with the first number and count on.',
  double: 'Good try! A double is the same number twice. Show the same number of fingers on both hands, then count them all.',
  ten: 'Good try! Think of a ten-frame. Count the empty spots to fill it up to the top.',
  sub: 'Good try! Start at the big number and count back, or think of what adds up to it.',
};
function _round(prompt, say, answer, hint, rng) {
  const wrong = [-2, -1, 1, 2, 3].map((o) => answer + o).filter((x) => x >= 0 && x <= 20 && x !== answer);
  const picks = _shuffle(wrong, rng).slice(0, 2);
  const all = [answer, ...picks];
  const pic = _pick(PIC_NAMES, rng), region = _int(0, PIECES - 1, rng);
  return { kind: 'paint', skill: 'paint', prompt, say: `Paint the missing piece! ${say}`, visual: { kind: 'paint', pic, region },
    choices: _shuffle(all.map(String), rng), choiceSay: Object.fromEntries(all.map((x) => [String(x), WORDS[x]])), answer: String(answer), answerSay: WORDS[answer], hint };
}
const _add = (a, b, rng) => _round(`${a} + ${b} = ?`, `What is ${WORDS[a]} plus ${WORDS[b]}?`, a + b, a === b ? HINT.double : HINT.add, rng);
const _ten = (a, rng) => _round(`${a} + ? = 10`, `${WORDS[a]} plus what number makes ten?`, 10 - a, HINT.ten, rng);

/** Tier 1: answers 1 to 10, small doubles and sums. */
export function paintT1(rng) { if (rng() < 0.4) { const a = _int(1, 5, rng); return _add(a, a, rng); } const a = _int(1, 6, rng), b = _int(1, 10 - a, rng); return _add(a, b, rng); }
/** Tier 2: doubles to 10 + 10 and make 10. */
export function paintT2(rng) { if (rng() < 0.5) { const a = _int(3, 10, rng); return _add(a, a, rng); } return _ten(_int(1, 9, rng), rng); }
/** Tier 3: mixed facts to 20. */
export function paintT3(rng) {
  const x = rng();
  if (x < 0.4) { const a = _int(5, 12, rng), b = _int(2, 20 - a, rng); return _add(a, b, rng); }
  if (x < 0.7) { const a = _int(6, 10, rng); return _add(a, a, rng); }
  const a = _int(11, 18, rng), b = _int(2, Math.min(9, a - 1), rng);
  return _round(`${a} - ${b} = ?`, `What is ${WORDS[a]} minus ${WORDS[b]}?`, a - b, HINT.sub, rng);
}
