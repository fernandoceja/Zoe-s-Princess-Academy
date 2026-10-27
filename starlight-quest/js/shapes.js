/* Zoe's Starlight Quest — tiny shape pictures for Moana's quests (K7). Pure string functions, no DOM, no images.
 * shapeSVG({ shape, rot, color, variant, scale }) returns one inline <svg>. Flat shapes are real polygons, so the
 * number of points always equals the number of sides (tests count them). 3D shapes are shaded drawings. */

export const SHAPE_COLORS = ['#f472b6', '#38bdf8', '#fbbf24', '#34d399', '#a78bfa', '#fb923c'];
export const FLAT_SHAPES = ['circle', 'triangle', 'square', 'rectangle', 'pentagon', 'hexagon'];
export const SOLID_SHAPES = ['cube', 'sphere', 'cone', 'cylinder'];

const C = 60;             // centre of the 120 x 120 picture
const R = 48;             // radius of a regular shape (leaves room to spin it without clipping)
const f1 = (n) => Math.round(n * 10) / 10;

/** Corner points of a flat shape, before it is spun. Variants make triangles/rectangles look different on purpose. */
export function flatPoints(shape, variant = 0) {
  const regular = (n) => {
    const a0 = -90 + (n % 2 === 0 ? 180 / n : 0);           // flat bottom: a square sits on a side, a triangle points up
    return Array.from({ length: n }, (_, i) => {
      const a = ((a0 + (360 / n) * i) * Math.PI) / 180;
      return [R * Math.cos(a), R * Math.sin(a)];
    });
  };
  if (shape === 'triangle') {
    if (variant === 1) return [[-40, 32], [-40, -32], [40, 32]];      // right-angle triangle
    if (variant === 2) return [[0, -46], [-24, 32], [24, 32]];        // tall and thin
    return regular(3);
  }
  if (shape === 'square') return regular(4);
  if (shape === 'pentagon') return regular(5);
  if (shape === 'hexagon') return regular(6);
  if (shape === 'rectangle') {
    const [w, h] = variant === 1 ? [30, 44] : [46, 26];               // wide or tall, never equal sides
    return [[-w, -h], [w, -h], [w, h], [-w, h]];
  }
  return [];
}

function spin(points, deg) {
  const a = (deg * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a);
  return points.map(([x, y]) => [x * c - y * s, x * s + y * c]);
}

let _uid = 0;
/** One shape picture. `shape` is a flat or solid shape name; unknown names draw nothing but an empty frame. */
export function shapeSVG({ shape, rot = 0, color = SHAPE_COLORS[0], variant = 0, scale = 1 } = {}) {
  const k = Math.max(0.5, Math.min(1, scale));
  const stroke = 'stroke="#ffffff" stroke-width="4" stroke-linejoin="round"';
  const wrap = (inner, label) =>
    `<svg viewBox="0 0 120 120" data-shape="${shape}" style="width:min(46vw,180px,28vh);height:auto;display:block;margin:0 auto" role="img" aria-label="${label}">` +
    `<g transform="translate(${C} ${C}) scale(${k}) translate(${-C} ${-C})">${inner}</g></svg>`;
  if (shape === 'circle') return wrap(`<circle cx="${C}" cy="${C}" r="${R}" fill="${color}" ${stroke}/>`, 'a flat shape');
  if (FLAT_SHAPES.includes(shape)) {
    const pts = spin(flatPoints(shape, variant), rot).map(([x, y]) => `${f1(C + x)},${f1(C + y)}`).join(' ');
    return wrap(`<polygon points="${pts}" fill="${color}" ${stroke}/>`, 'a flat shape');
  }
  const id = `zsq-sh${++_uid}`;
  if (shape === 'sphere') {
    return wrap(`<defs><radialGradient id="${id}" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="#ffffff"/><stop offset="0.35" stop-color="${color}"/>` +
      `<stop offset="1" stop-color="#1e293b" stop-opacity="0.55"/></radialGradient></defs>` +
      `<circle cx="${C}" cy="${C}" r="${R}" fill="url(#${id})" stroke="#64748b" stroke-width="2.5"/>`, 'a solid shape');
  }
  if (shape === 'cube') {
    const face = (pts, over) => `<polygon points="${pts}" fill="${color}" ${stroke}/>` + (over ? `<polygon points="${pts}" fill="${over}"/>` : '');
    return wrap(face('60,12 102,36 60,60 18,36', 'rgba(255,255,255,0.45)') + face('18,36 60,60 60,108 18,84', '') + face('60,60 102,36 102,84 60,108', 'rgba(0,0,0,0.22)'), 'a solid shape');
  }
  if (shape === 'cone') {
    return wrap(`<path d="M22 92 L60 10 L98 92 A38 14 0 0 1 22 92 Z" fill="${color}" ${stroke}/>` +
      `<path d="M60 10 L98 92 A38 14 0 0 1 60 106 Z" fill="rgba(0,0,0,0.2)"/>`, 'a solid shape');
  }
  if (shape === 'cylinder') {
    return wrap(`<path d="M22 32 L22 88 A38 14 0 0 0 98 88 L98 32 Z" fill="${color}" ${stroke}/>` +
      `<path d="M60 46 L98 32 L98 88 A38 14 0 0 1 60 102 Z" fill="rgba(0,0,0,0.18)"/>` +
      `<ellipse cx="${C}" cy="32" rx="38" ry="14" fill="${color}" ${stroke}/><ellipse cx="${C}" cy="32" rx="38" ry="14" fill="rgba(255,255,255,0.45)"/>`, 'a solid shape');
  }
  return wrap('', 'a shape');
}
