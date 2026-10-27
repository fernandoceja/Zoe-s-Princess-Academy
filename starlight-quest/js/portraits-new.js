// ============================================================================
// Zoe's Starlight Quest — portraits for the six new-kingdom princesses.
// Small hand-written SVGs (original art, no images from any film): a round
// friendly face, simple eyes, a smile, a hair shape, one little accessory and
// a background circle in the colors of her own land. Each is under 4 KB.
// DEPENDENCY-FREE ES module so tests can import it in node.
// ============================================================================

const svgUri = (inner) =>
  'data:image/svg+xml,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">' + inner + '</svg>'
  );

// Shared soft face: neck, head, eyes with glints, blush and smile.
const face = (skin) =>
  `<rect x="53" y="76" width="14" height="14" rx="5" fill="${skin}"/>` +
  `<circle cx="60" cy="58" r="24" fill="${skin}"/>` +
  '<ellipse cx="50" cy="58" rx="2.7" ry="3.5" fill="#2a1f3d"/><ellipse cx="70" cy="58" rx="2.7" ry="3.5" fill="#2a1f3d"/>' +
  '<circle cx="51" cy="56.6" r="1" fill="#fff"/><circle cx="71" cy="56.6" r="1" fill="#fff"/>' +
  '<circle cx="42" cy="66" r="4" fill="#ff9eb0" opacity=".5"/><circle cx="78" cy="66" r="4" fill="#ff9eb0" opacity=".5"/>' +
  '<path d="M52 68Q60 75 68 68" fill="none" stroke="#b04a6a" stroke-width="2" stroke-linecap="round"/>';

// Background circle (land colors) and shoulders (dress + trim).
const bg = (a, b) => `<circle cx="60" cy="60" r="58" fill="${a}"/><circle cx="60" cy="52" r="40" fill="${b}" opacity=".55"/>`;
const body = (dress, trim) =>
  `<path d="M22 120Q24 88 60 86Q96 88 98 120Z" fill="${dress}"/>` +
  `<path d="M46 88Q60 98 74 88" fill="none" stroke="${trim}" stroke-width="4" stroke-linecap="round"/>`;
const fringe = (c, top = 30) => `<path d="M35 56Q36 ${top} 60 ${top}Q84 ${top} 85 56Q74 40 60 40Q46 40 35 56Z" fill="${c}"/>`;
const clip = '<clipPath id="c"><circle cx="60" cy="60" r="58"/></clipPath>';
const frame = (inner) => svgUri(clip + '<g clip-path="url(#c)">' + inner + '</g>');

// ARIEL — Seashell Cove: seafoam teal sea, sandy-gold long hair, coral dress, pearl crown.
const ariel = frame(
  bg('#2fb7b0', '#8fe3dc') +
  '<path d="M30 20Q26 70 24 112L96 112Q94 70 90 20Q60 8 30 20Z" fill="#e8b96a"/>' +
  body('#ff8a65', '#fff1d6') + face('#f1c49c') + fringe('#e8b96a', 28) +
  '<path d="M44 33Q60 24 76 33" fill="none" stroke="#e9eef5" stroke-width="2.5" stroke-linecap="round"/>' +
  '<circle cx="46" cy="32" r="3.4" fill="#fff"/><circle cx="60" cy="27" r="4" fill="#fff"/><circle cx="74" cy="32" r="3.4" fill="#fff"/>' +
  '<circle cx="26" cy="20" r="3" fill="#fff" opacity=".7"/><circle cx="96" cy="30" r="4" fill="#fff" opacity=".6"/><circle cx="20" cy="40" r="2" fill="#fff" opacity=".6"/>'
);

// MOANA — Wayfinder Isle: sea-blue sky with a sand shore, big dark curls, sand top with a sea-blue sash, shell clip.
const curl = [[34, 44, 13], [30, 60, 12], [38, 28, 13], [52, 22, 14], [68, 22, 14], [82, 28, 13], [90, 44, 13], [90, 60, 12], [27, 76, 11], [93, 76, 11]]
  .map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#3b2417"/>`).join('');
const moana = frame(
  bg('#4fb3d9', '#bfe8f5') + '<path d="M0 96Q60 80 120 96L120 120L0 120Z" fill="#f0d9a0"/>' +
  curl + body('#f2d49b', '#2b8fb3') +
  '<path d="M26 118L50 96" stroke="#2b8fb3" stroke-width="7" stroke-linecap="round"/>' +
  face('#b97a4f') + '<path d="M35 52Q38 34 60 34Q82 34 85 52Q72 42 60 42Q48 42 35 52Z" fill="#3b2417"/>' +
  '<path d="M88 34Q100 34 98 46Q92 50 88 44Q84 40 88 34Z" fill="#fffaf0" stroke="#e7b9a8" stroke-width="1.5"/>' +
  '<path d="M91 37L94 45M94 36L96 44" stroke="#e7b9a8" stroke-width="1"/>'
);

// JASMINE — Moonlit Palace Garden: night blue sky with stars, high bun with a silver moon clip, deep teal dress.
const star = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#ffe9a8"/>`;
const jasmine = frame(
  bg('#1f2a5c', '#3d5aa8') + star(20, 24, 2.5) + star(98, 18, 3) + star(104, 52, 2) + star(14, 58, 2) + star(86, 8, 2) +
  '<path d="M30 56Q28 30 60 28Q92 30 90 56Q92 70 86 82Q80 66 60 66Q40 66 34 82Q28 70 30 56Z" fill="#2b1b2e"/>' +
  '<circle cx="60" cy="19" r="12" fill="#2b1b2e"/>' +
  body('#2a8f94', '#dfe8f5') + face('#c98f63') + fringe('#2b1b2e', 30) +
  '<path d="M73 14A9 9 0 1 0 73 30A7 7 0 1 1 73 14Z" fill="#e9eef5"/>' +
  '<path d="M20 120L20 100Q24 92 28 100L28 120M92 120L92 100Q96 92 100 100L100 120" fill="#12204a" opacity=".5"/>'
);

// ANNA — Sunny Fjord Harbor: sunny yellow with a string of red bunting, wavy golden-brown hair, red dress, small gold crown.
const anna = frame(
  bg('#ffd84a', '#fff0a0') +
  '<path d="M0 12Q60 30 120 12" fill="none" stroke="#7a4b2a" stroke-width="1.5"/>' +
  '<path d="M10 14L20 14L15 26ZM34 19L44 20L38 31ZM58 22L68 22L63 34ZM82 20L92 19L88 31ZM104 16L114 14L110 26Z" fill="#e0463c"/>' +
  '<path d="M32 50Q28 80 24 98Q40 92 38 70ZM88 50Q92 80 96 98Q80 92 82 70Z" fill="#a8743f"/>' +
  body('#e0463c', '#fff6c8') + face('#f6d3b5') +
  '<path d="M34 58Q34 30 60 30Q86 30 86 58Q76 42 62 40Q44 42 34 58Z" fill="#a8743f"/>' +
  '<path d="M48 34L50 24L55 30L60 22L65 30L70 24L72 34Z" fill="#f5c542" stroke="#d99a18" stroke-width="1"/>'
);

// TIANA — Firefly Bayou: warm lantern gold, glowing fireflies, dark curls, plum dress, little gold crown.
const fly = (x, y) => `<circle cx="${x}" cy="${y}" r="5" fill="#fff3a0" opacity=".35"/><circle cx="${x}" cy="${y}" r="2" fill="#fff7c4"/>`;
const tcurl = [[34, 46, 12], [32, 62, 11], [40, 30, 12], [54, 24, 13], [68, 24, 13], [80, 30, 12], [88, 46, 12], [88, 62, 11]]
  .map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#2a1a14"/>`).join('');
const tiana = frame(
  bg('#e8a33d', '#ffd98a') + fly(18, 30) + fly(100, 24) + fly(104, 66) + fly(14, 76) + fly(30, 10) +
  tcurl + body('#8e44ad', '#f5b942') + face('#8a5a3c') +
  '<path d="M36 54Q38 34 60 34Q82 34 84 54Q72 44 60 44Q48 44 36 54Z" fill="#2a1a14"/>' +
  '<path d="M46 36L48 27L54 33L60 25L66 33L72 27L74 36Z" fill="#f5b942" stroke="#c98a12" stroke-width="1"/>'
);

// AURORA — Rosewood Glen: rose-pink glen with berry tones, dark berry-brown braid, berry dress, rose-blossom wreath.
const rose = (x, y, c) => `<circle cx="${x}" cy="${y}" r="5" fill="${c}"/><circle cx="${x}" cy="${y}" r="1.8" fill="#ffe08a"/>`;
const aurora = frame(
  bg('#f4a6b8', '#ffd3dc') + '<circle cx="20" cy="96" r="14" fill="#c9506f" opacity=".5"/><circle cx="102" cy="90" r="16" fill="#c9506f" opacity=".5"/>' +
  '<path d="M34 54Q30 90 40 108Q50 112 50 100Q44 80 44 62Z" fill="#5a2d3a"/>' +
  '<circle cx="42" cy="98" r="6" fill="#5a2d3a"/><circle cx="43" cy="108" r="5" fill="#5a2d3a"/>' +
  body('#a3315b', '#f6e3c8') + face('#dba57a') + fringe('#5a2d3a', 29) +
  '<path d="M38 36Q60 24 82 36" fill="none" stroke="#6aa86a" stroke-width="2"/>' +
  rose(44, 35, '#e8456f') + rose(60, 29, '#f78fa8') + rose(76, 35, '#e8456f')
);

export const PORTRAIT_ARIEL = ariel;
export const PORTRAIT_MOANA = moana;
export const PORTRAIT_JASMINE = jasmine;
export const PORTRAIT_ANNA = anna;
export const PORTRAIT_TIANA = tiana;
export const PORTRAIT_AURORA = aurora;
