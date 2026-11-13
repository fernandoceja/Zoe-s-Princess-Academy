// M6: Andika for everything Zoe reads, a type scale (reading text 24px, letter tiles 36px) and the palette tokens.
// Nothing is fetched from the network: the font files are vendored and precached.
import { readFileSync, existsSync, statSync } from 'node:fs';
const rd = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const bad = [];
const ok = (c, why) => { if (!c) bad.push(why); };

// 1. Vendored font files, license, @font-face.
for (const f of ['andika-latin-400.woff2', 'andika-latin-700.woff2']) {
  const p = new URL('../vendor/fonts/' + f, import.meta.url);
  ok(existsSync(p) && statSync(p).size > 5000 && statSync(p).size < 80000, `${f} missing or odd size`);
  if (existsSync(p)) ok(readFileSync(p).subarray(0, 4).toString() === 'wOF2', `${f} is not a woff2 file`);
}
ok(/SIL Open Font License/.test(rd('vendor/fonts/ANDIKA-OFL.txt')), 'Andika license text missing');
const css = rd('vendor/fonts/andika.css');
ok((css.match(/@font-face/g) || []).length === 2 && /font-weight: 400/.test(css) && /font-weight: 700/.test(css), 'andika.css needs a regular and a bold face');
ok(/font-display: swap/.test(css) && !/https?:/.test(css), 'andika.css: swap, and no network urls');
for (const m of css.matchAll(/url\('\.\/([^']+)'\)/g)) ok(existsSync(new URL('../vendor/fonts/' + m[1], import.meta.url)), `andika.css points at a missing file ${m[1]}`);

// 2. Loaded by the page and precached for offline play.
ok(/vendor\/fonts\/andika\.css/.test(rd('index.html')), 'index.html does not load andika.css');
const sw = rd('sw.js');
for (const f of ['andika.css', 'andika-latin-400.woff2', 'andika-latin-700.woff2']) ok(sw.includes('./vendor/fonts/' + f), `sw.js does not precache ${f}`);
ok(!/fonts\.(googleapis|gstatic)/.test(rd('index.html') + css + rd('src/styles.css')), 'no Google Fonts');

// 3. Tokens: tailwind names, CSS variables, scale.
const tw = rd('tailwind.config.js'), st = rd('src/styles.css');
const PALETTE = { night: '#2B1E5C', gold: '#F6C945', rose: '#FF8FB8', lilac: '#C9B3F2', mint: '#8FD6C4', cream: '#FFF8EC', ink: '#2A2140' };
for (const [k, v] of Object.entries(PALETTE)) {
  ok(tw.includes(`${k}: '${v}'`), `tailwind color ${k} ${v}`);
  ok(new RegExp(`--${k}:${v}`, 'i').test(st), `css variable --${k}`);
}
ok(/read: \['Andika'/.test(tw) && /title: \['Nunito'/.test(tw), 'font families read (Andika) and title (Nunito)');
ok(/read: \['1\.5rem'/.test(tw) && /tile: \['2\.25rem'/.test(tw), 'type scale: read 24px, tile 36px');
ok(/--fs-read:1\.5rem/.test(st) && /--fs-tile:2\.25rem/.test(st), 'css type variables');

// 4. The words she reads use them.
const ch = rd('src/components/ChallengeModal.tsx'), dl = rd('src/components/DialogueModal.tsx');
const has = (src, needle, why) => ok(src.includes(needle), why);
has(ch, 'font-read text-read font-bold text-ink">', 'question prompt: Andika, 24px, ink');
has(ch, 'border-3 font-read font-bold text-read flex', 'choice buttons: Andika, 24px');
has(ch, 'font-read text-tile font-bold tracking-widest text-ink">{view.bigWord}', 'big word: Andika, 36px');
has(ch, 'text-center font-read font-bold text-read animate-fade-in', 'hint banner: Andika, 24px');
has(ch, 'justify-center font-read font-bold text-tile ${', 'tile slots: Andika, 36px');
has(ch, 'border-2 font-read font-bold text-tile shadow-sm', 'tile bank: Andika, 36px');
has(ch, 'border-4 font-read font-bold text-tile flex', 'blend letters: Andika, 36px');
has(ch, 'border-2 font-read font-bold text-read flex flex-wrap', 'sort words: Andika, 24px, wrap');
has(dl, 'font-read text-read font-bold text-ink">', 'dialogue lines: Andika, 24px');
// No reading text is left below 24px in the words she reads (titles and parent text may be smaller).
ok(!/text-(xs|sm|base|lg|xl)[^"]*>\s*\{round\.prompt\}/.test(ch), 'prompt text too small');

if (bad.length) { console.error('fonts_check FAILED:\n - ' + bad.join('\n - ')); process.exit(1); }
console.log('fonts_check passed');
