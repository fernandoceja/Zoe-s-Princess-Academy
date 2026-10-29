// Bundle check (R4 T7): run after `npm run build` in starlight-quest/.
// One copy of each engine module in the built shell, three r160 only, no CDN/Firebase strings, no npm three.
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');   // starlight-quest/
const distApp = join(root, 'dist', 'app');
const problems = [];

if (!existsSync(distApp)) {
  console.log('bundle: dist/app missing. Run `npm run build` in starlight-quest/ first.');
  process.exit(1);
}

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}
const files = walk(join(root, 'dist'));
const jsFiles = files.filter((f) => f.endsWith('.js') && f.startsWith(distApp));
const js = jsFiles.map((f) => readFileSync(f, 'utf8')).join('\n');
const all = files.filter((f) => /\.(js|css|html)$/.test(f)).map((f) => readFileSync(f, 'utf8')).join('\n');

if (jsFiles.length === 0) problems.push('no JS bundle in dist/app');

// Each engine module must appear once: a unique string from each module.
const once = [
  ['Can he run past the tent?', 'quests.js WEEK_DEFAULT dictation (module loaded once)'],
  ['zoe-starlight-quest-v1', 'save key (save.js loaded once)'],
];
for (const [needle, what] of once) {
  const n = js.split(needle).length - 1;
  if (n !== 1) problems.push(`expected 1 copy of ${what}, found ${n}`);
}

// three r160: every REVISION assignment with a string value must be 160, and at least one must exist.
const rev = [...js.matchAll(/REVISION\W{1,12}(?:\(\)\s*=>\s*)?["'`](\d+)["'`]/g)].map((m) => m[1]);
if (rev.length === 0) problems.push('no three REVISION string in bundle');
for (const r of rev) if (r !== '160') problems.push(`three REVISION is "${r}", expected "160"`);
const threeSrc = readFileSync(join(root, 'vendor', 'three.module.js'), 'utf8');
if (!/REVISION\s*=\s*["'`]160["'`]/.test(threeSrc)) problems.push('vendor/three.module.js is not r160');

// No CDN, Google Fonts or Firebase references in the shell.
for (const bad of ['cdn.tailwindcss.com', 'fonts.googleapis.com', 'firebase']) {
  const hit = bad === 'firebase' ? js : all;
  if (hit.includes(bad)) problems.push(`bundle contains "${bad}"`);
}

// npm three must not be installed.
if (existsSync(join(root, 'node_modules', 'three'))) problems.push('node_modules/three exists (three must not be an npm dependency)');

if (problems.length) {
  console.log('bundle: ' + problems.length + ' problem(s)');
  for (const p of problems) console.log('  - ' + p);
  process.exit(1);
}
console.log(`bundle: ok (${jsFiles.length} JS file(s), three REVISION 160 x${rev.length}, 0 CDN/firebase strings)`);
