/* Zoe's Starlight Quest — tally-mark pictures for Tiana's quests (K13). Pure string functions, no DOM, no images.
 * tallySVG(n) draws n tally marks: every group of five is four upright lines with ONE red slash straight across them,
 * and any left over are single upright lines. Each mark is one <line>, so the number of <line> elements always equals n
 * (the tests count them). tallyChartHtml(visual) draws a small chart: a picture and name on the left, a tally on the right. */
import { tallyMarks } from './treasures.js?v=20261028r3';

export const TALLY_MAX = 20;
const STEP = 12, PAD = 12, GAP = 10, H = 56;   // spacing of the upright lines, padding in a group, space between groups, picture height
const INK = '#1e293b', SLASH = '#e11d48';

/** Tally groups for n (0-20): full groups of five, then the rest as single lines. Reuses treasures.js tallyMarks for the first ten. */
export function tallyGroups(n) {
  const k = Math.max(0, Math.min(TALLY_MAX, Math.floor(Number(n) || 0)));
  return k <= 10 ? tallyMarks(k) : [...tallyMarks(10), ...tallyGroups(k - 10)];
}

const groupWidth = (g) => (Math.max(g.lines, 1) - 1) * STEP + 2 * PAD;

/** One inline <svg> with n tally marks. `scale` is how many screen pixels a drawing unit gets (it shrinks to fit narrow screens). */
export function tallySVG(n, { scale = 1.25, fit, left = false, label } = {}) {
  const groups = tallyGroups(n);
  const total = groups.reduce((s, g) => s + g.count, 0);
  const W = groups.reduce((s, g) => s + groupWidth(g), 0) + Math.max(0, groups.length - 1) * GAP;
  if (fit) scale = Math.min(2.2, fit / Math.max(W, 1));   // `fit`: aim for this many pixels wide, but never blow a single group up past 2.2x
  let x0 = 0, body = '';
  for (const g of groups) {
    const w = groupWidth(g);
    body += `<g data-count="${g.count}">`;
    for (let i = 0; i < g.lines; i++) {
      const x = x0 + PAD + i * STEP;
      body += `<line class="tm" x1="${x}" y1="6" x2="${x}" y2="${H - 6}" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>`;
    }
    if (g.slash) body += `<line class="ts" x1="${x0 + 3}" y1="${H - 12}" x2="${x0 + w - 3}" y2="12" stroke="${SLASH}" stroke-width="5" stroke-linecap="round"/>`;
    body += '</g>';
    x0 += w + GAP;
  }
  return `<svg viewBox="0 0 ${Math.max(W, 1)} ${H}" data-tally="${total}" style="width:${Math.round(Math.max(W, 1) * scale)}px;max-width:100%;height:auto;display:block;margin:${left ? '0' : '0 auto'}" role="img" aria-label="${label || 'tally marks'}">${body}</svg>`;
}

const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/** Tally card for a round: { kind: 'tally', n } is one tally; { kind: 'tallychart', title, rows: [{ e, name, n }] } is a chart. */
export function tallyCardHtml(v) {
  const box = 'max-width:100%;margin:0 auto;background:#fff;border:3px solid #c4b5fd;border-radius:16px;padding:12px 10px;box-sizing:border-box;';
  if (v && v.kind === 'tally') return `<div style="${box}">${tallySVG(v.n, { fit: 300, label: 'a group of tally marks' })}</div>`;
  const rows = ((v && v.rows) || []).map((r) =>
    `<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-top:2px solid #ede9fe">` +
    `<div style="flex:0 0 112px;font-family:Nunito,system-ui,sans-serif;font-weight:800;font-size:17px;color:#4c1d95;white-space:nowrap;text-align:left">${esc(r.e)} ${esc(r.name)}</div>` +
    `<div style="flex:1;min-width:0">${tallySVG(r.n, { scale: 1.2, left: true, label: 'tally marks for ' + esc(r.name) })}</div></div>`).join('');
  return `<div role="group" aria-label="Tally chart" style="${box}"><div style="text-align:center;font-family:Nunito,system-ui,sans-serif;font-weight:800;font-size:15px;color:#6d28d9;padding-bottom:4px">${esc((v && v.title) || 'Tally chart')}</div>${rows}</div>`;
}
