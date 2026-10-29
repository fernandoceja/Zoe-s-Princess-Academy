/* Zoe's Starlight Quest — round visuals (R4 P3.2).
 * The picture, number line, clock and card builders from js/main.js (lines 316-470), moved out of
 * the closure unchanged: same markup, same strings, same aria labels. Pure string builders, no DOM.
 * The shell puts these strings in the page with dangerouslySetInnerHTML, as main.js does with innerHTML.
 */
import { shapeSVG, tallyCardHtml } from '../engine-core.js';

export function visualHtml(npcId, round) {
  // Ten-frames: 5x2 grid of cells, dots fill left-to-right, top row first; n (0-20) uses ceil(n/10) frames.
  // The last `gone` dots are faded and crossed out (taken away). `c` = cell size in px.
  const frame = (dots, goneFrom, c) => {
    let cells = '';
    for (let i = 0; i < 10; i++) {
      let inner = '';
      if (i < dots) {
        const away = i >= goneFrom;
        inner = `<span data-dot="${away ? 'gone' : 'kept'}" style="width:${Math.round(c * 0.64)}px;height:${Math.round(c * 0.64)}px;border-radius:50%;background:#38bdf8;border:2px solid #0284c7;box-sizing:border-box;${away ? 'opacity:.3;' : ''}"></span>` +
          (away ? `<span style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#e11d48;font-size:${c - 4}px;font-weight:700;line-height:1">✕</span>` : '');
      }
      cells += `<span style="position:relative;display:flex;align-items:center;justify-content:center;width:${c}px;height:${c}px;box-sizing:border-box;border:1px solid #bae6fd;background:#f8fdff">${inner}</span>`;
    }
    return `<span style="display:inline-grid;grid-template-columns:repeat(5,${c}px);border:2px solid #7dd3fc;border-radius:8px;overflow:hidden;background:#7dd3fc">${cells}</span>`;
  };
  const frames = (n, gone = 0, c = 22, label = '') => {
    n = Math.max(0, Math.min(n, 20));
    gone = Math.max(0, Math.min(gone, n));
    let out = '';
    for (let r = 0; r === 0 || r < n; r += 10) out += frame(Math.max(0, Math.min(10, n - r)), n - gone - r, c);
    const aria = label || `ten-frame showing ${n}${gone ? `, ${gone} crossed out` : ''}`;
    return `<span role="img" aria-label="${aria}" style="display:inline-flex;flex-wrap:wrap;justify-content:center;gap:8px;max-width:100%;margin:3px">${out}</span>`;
  };
  if (npcId === 'elsa' && round.visual && round.visual.kind === 'counton') {
    // Ice number line: start number highlighted, a hop arc per count-on, "?" where the last hop lands.
    const { start, hop } = round.visual;
    const lo = Math.max(0, Math.min(start - 1, 13)), W = 43, X = (n) => 22 + (n - lo) * W;
    let svg = `<svg viewBox="0 0 352 140" width="100%" style="max-width:352px;display:block;margin:0 auto" role="img" aria-label="number line: start at ${start}, count on ${hop}">` +
      `<rect x="4" y="88" width="344" height="12" rx="6" fill="#bae6fd" stroke="#38bdf8" stroke-width="2"/>`;
    for (let n = lo; n <= lo + 7; n++) {
      const x = X(n), isStart = n === start, isEnd = n === start + hop;
      svg += `<line x1="${x}" y1="86" x2="${x}" y2="102" stroke="#0284c7" stroke-width="2"/>`;
      if (isStart) svg += `<circle cx="${x}" cy="94" r="17" fill="#0284c7" stroke="#fff" stroke-width="2"/><text x="${x}" y="101" text-anchor="middle" font-size="20" font-weight="800" fill="#fff">${n}</text>`;
      else if (isEnd) svg += `<circle cx="${x}" cy="94" r="17" fill="#fde68a" stroke="#f59e0b" stroke-width="3"/><text x="${x}" y="102" text-anchor="middle" font-size="22" font-weight="800" fill="#92400e">?</text>`;
      else svg += `<text x="${x}" y="126" text-anchor="middle" font-size="19" font-weight="700" fill="#0c4a6e">${n}</text>`;
    }
    for (let i = 0; i < hop; i++) {
      const x1 = X(start + i) + (i === 0 ? 14 : 3), x2 = X(start + i + 1) - 3, mx = (x1 + x2) / 2;
      svg += `<path d="M${x1} 82 Q${mx} 28 ${x2} 80" fill="none" stroke="#e11d48" stroke-width="4" stroke-linecap="round"/>` +
        `<path d="M${x2 - 8} 66 L${x2} 80 L${x2 + 5} 65" fill="none" stroke="#e11d48" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>` +
        `<text x="${mx}" y="38" text-anchor="middle" font-size="17" font-weight="800" fill="#e11d48">+1</text>`;
    }
    return svg + '</svg>';
  }
  if (npcId === 'elsa' && round.visual && round.visual.kind === 'doubles') {
    const { n, style } = round.visual;
    if (style === 'frames') return `<div style="text-align:center;line-height:1.6">${frames(n, 0, 26)}<div style="font-size:30px">➕</div>${frames(n, 0, 26)}</div>`;
    const side = `<span style="display:inline-flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:2px;min-width:104px;max-width:128px;padding:8px;border:3px solid #7dd3fc;border-radius:16px;background:#f0f9ff;font-size:34px;line-height:1.1">${'<span>❄️</span>'.repeat(n)}</span>`;
    return `<div role="img" aria-label="${n} snowflakes on each side" style="display:flex;align-items:center;justify-content:center;gap:8px">${side}<span style="font-size:30px">➕</span>${side}</div>`;
  }
  if (npcId === 'elsa' && round.visual && round.visual.tens != null) {
    // Tens and ones: each ten is one full frame, ones in one partial frame; smaller cells, frames wrap.
    const { tens, ones } = round.visual;
    return `<div role="img" aria-label="ten-frames showing ${tens} tens and ${ones} ones" style="display:flex;flex-wrap:wrap;justify-content:center;gap:6px;max-width:100%">` +
      frame(10, 10, 17).repeat(tens) + (ones > 0 ? frame(ones, ones, 17) : '') + '</div>';
  }
  if (npcId === 'elsa' && round.visual && round.visual.parts) {
    return `<div style="text-align:center">` +
      round.visual.parts.map((n) => frames(n)).join('<div style="font-size:26px">➕</div>') + '</div>';
  }
  if (npcId === 'elsa' && round.visual) {
    const { a, b } = round.visual;
    const isMinus = round.visual.op ? round.visual.op === '-'
      : (/−|-/.test(round.prompt) && !/\+/.test(round.prompt));
    // Take-away: one group where the last b dots are visibly removed.
    if (isMinus && b > 0) return `<div style="text-align:center;line-height:1.6">${frames(a, b)}</div>`;
    return `<div style="text-align:center;line-height:1.6">${frames(a)}` +
      `<div style="font-size:30px">${isMinus ? '➖' : '➕'}</div>${b > 0 ? frames(b) : '<span style="font-size:34px">❓</span>'}</div>`;
  }
  if (npcId === 'cinderella' && round.clock) {
    return clockSVG(round.clock.hour, round.clock.minute);
  }
  if (npcId === 'moana' && round.visual && round.visual.kind === 'shape') return shapeSVG(round.visual);
  if (npcId === 'jasmine' && round.visual && round.visual.kind === 'story') return storyCardsHtml(round.visual);
  if (npcId === 'anna' && round.visual && round.visual.kind === 'sentence') return sentenceCardHtml(round.visual);
  if (npcId === 'tiana' && round.visual && (round.visual.kind === 'tally' || round.visual.kind === 'tallychart')) return tallyCardHtml(round.visual);
  if (npcId === 'rapunzel' && round.visual && round.visual.kind) return measureSVG(round.visual);
  if (round.pic && (npcId === 'rapunzel' || npcId === 'belle' || npcId === 'ariel' || npcId === 'moana')) return `<div style="font-size:42px;text-align:center">${round.pic}</div>`;
  return '';
}

// Jasmine's story cards (K9): a row of three small picture cards, each with a one-line caption. With `more`, two cards in order
// joined by arrows and a "?" card for the missing step. Escaped, no images, fits 390px wide next to the three choice buttons.
export function storyCardsHtml(v) {
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const card = (e, t, dashed) => `<div style="flex:1 1 0;min-width:0;max-width:112px;background:#fff;border:2px ${dashed ? 'dashed #a5b4fc' : 'solid #c7d2fe'};border-radius:14px;padding:6px 3px;text-align:center;box-sizing:border-box">` +
    `<div style="font-size:34px;line-height:1.1">${e}</div><div style="font-size:12px;line-height:1.2;font-weight:700;color:#3730a3;margin-top:2px;overflow-wrap:anywhere">${t}</div></div>`;
  const arrow = '<div style="flex:0 0 auto;font-size:16px;color:#6366f1;font-weight:800">&rarr;</div>';
  const cards = (v.cards || []).slice(0, 3);
  const parts = cards.map((c) => card(c.e, esc(c.t), false));
  const row = v.more ? [...parts, card('❓', '?', true)].join(arrow) : parts.join('');
  return `<div role="img" aria-label="${v.more ? 'The first two steps of a story' : 'Three story pictures'}" style="display:flex;align-items:stretch;justify-content:center;gap:5px;max-width:100%;margin:0 auto">${row}</div>`;
}

// Anna's sign (K11): the sentence written big on a harbor sign, exactly as given (a lowercase letter must stay lowercase). Escaped text, no images.
export function sentenceCardHtml(v) {
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  return `<div role="img" aria-label="${esc('Sign: ' + v.text)}" style="max-width:100%;margin:0 auto;background:#fff;border:3px solid #fca5a5;border-radius:16px;padding:12px 14px;text-align:center;box-sizing:border-box;` +
    `font-family:Nunito,system-ui,sans-serif;font-weight:800;font-size:30px;line-height:1.25;color:#7f1d1d;overflow-wrap:anywhere;text-transform:none">${esc(v.text)}</div>`;
}

// Measuring picture: flowers stand on one ground line (compare heights), or a stem beside a column of petal units.
export function measureSVG(v) {
  const FILL = { pink: '#f9a8d4', yellow: '#fde68a', purple: '#c4b5fd', blue: '#93c5fd' };
  const U = 12, G = 124; // px per unit, ground y
  if (v.kind === 'flowers') {
    const n = v.heights.length, W = n * 60;
    let body = '';
    v.heights.forEach((h, i) => {
      const cx = 30 + i * 60, top = G - h * U;
      body += `<rect x="${cx - 3}" y="${top}" width="6" height="${h * U}" rx="3" fill="#86d19b"/>` +
        `<circle cx="${cx}" cy="${top - 4}" r="14" fill="${FILL[v.colors[i]] || '#f9a8d4'}" stroke="#ffffff" stroke-width="3"/>` +
        `<circle cx="${cx}" cy="${top - 4}" r="4" fill="#f59e0b"/>`;
    });
    return `<svg viewBox="0 0 ${W} 138" style="width:min(70vw,260px);height:auto;display:block;margin:0 auto" role="img" aria-label="${n} flowers of different heights standing on the ground">` +
      `<line x1="0" y1="${G}" x2="${W}" y2="${G}" stroke="#a7d9b0" stroke-width="4" stroke-linecap="round"/>${body}</svg>`;
  }
  const n = Math.max(1, Math.min(v.length | 0, 8));
  let petals = '';
  for (let i = 0; i < n; i++) {
    petals += `<ellipse cx="70" cy="${G - i * U - U / 2}" rx="13" ry="${U / 2 - 0.5}" fill="${i % 2 ? '#f9a8d4' : '#fbcfe8'}" stroke="#ec7fb4" stroke-width="1"/>`;
  }
  return `<svg viewBox="0 0 120 138" style="width:min(70vw,260px);height:auto;display:block;margin:0 auto" role="img" aria-label="A flower stem next to a column of ${n} petals, one petal for each unit of length">` +
    `<line x1="0" y1="${G}" x2="120" y2="${G}" stroke="#a7d9b0" stroke-width="4" stroke-linecap="round"/>` +
    `<rect x="27" y="${G - n * U}" width="6" height="${n * U}" rx="3" fill="#86d19b"/>${petals}</svg>`;
}

export function clockSVG(h, m) {
  const ha = ((h % 12) + m / 60) * 30;
  const ma = m * 6;
  let ticks = '';
  for (let i = 0; i < 12; i++) {
    const a = (i * 30 * Math.PI) / 180;
    const x1 = 50 + 36 * Math.sin(a), y1 = 50 - 36 * Math.cos(a);
    const x2 = 50 + 43 * Math.sin(a), y2 = 50 - 43 * Math.cos(a);
    ticks += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#8a6d3b" stroke-width="${i % 3 === 0 ? 4 : 2}"/>`;
  }
  const hr = (ha * Math.PI) / 180, mr = (ma * Math.PI) / 180;
  const hx = 50 + 15 * Math.sin(hr), hy = 50 - 15 * Math.cos(hr);
  const mx = 50 + 24 * Math.sin(mr), my = 50 - 24 * Math.cos(mr); // stops short of the numerals so 12 and 6 stay readable
  // Numerals 1-12 sit just inside the ticks. The hands stop short of them, so no number is ever covered.
  let numerals = '';
  for (let i = 1; i <= 12; i++) {
    const a = (i * 30 * Math.PI) / 180;
    const nx = 50 + 30.5 * Math.sin(a), ny = 50 - 30.5 * Math.cos(a);
    numerals += `<text x="${nx.toFixed(1)}" y="${ny.toFixed(1)}" text-anchor="middle" dominant-baseline="central" font-family="Nunito, system-ui, sans-serif" font-weight="900" font-size="11" fill="#3b1f04">${i}</text>`;
  }
  const hh = h % 12 || 12, mm = String(m).padStart(2, '0');
  return `<svg viewBox="0 0 100 100" style="width:min(52vw,210px,38vh);height:auto;display:block;margin:0 auto" role="img" aria-label="Clock showing ${hh}:${mm}">` +
    `<circle cx="50" cy="50" r="46" fill="#fffbe8" stroke="#ebd373" stroke-width="5"/>${ticks}${numerals}` +
    `<line x1="50" y1="50" x2="${hx.toFixed(1)}" y2="${hy.toFixed(1)}" stroke="#5b4a8a" stroke-width="6" stroke-linecap="round"/>` +
    `<line x1="50" y1="50" x2="${mx.toFixed(1)}" y2="${my.toFixed(1)}" stroke="#e2703a" stroke-width="4" stroke-linecap="round"/>` +
    `<circle cx="50" cy="50" r="5" fill="#ebd373"/></svg>`;
}
