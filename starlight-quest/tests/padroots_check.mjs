// Pad roots (R4 T10): every modal component's root class is one that js/padnav.js looks for (its ROOTS list,
// parsed from the source), and App.tsx starts the pad nav exactly once. Plain Node, reads source only.
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');   // starlight-quest/
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

const padSrc = readFileSync(join(root, 'js', 'padnav.js'), 'utf8');
const m = /const ROOTS = \[([\s\S]*?)\];/.exec(padSrc);
const ROOTS = m ? [...m[1].matchAll(/'(\.[^']+)'/g)].map((x) => x[1]) : [];
check(ROOTS.length > 0, 'padnav: could not parse the ROOTS list from js/padnav.js');

const compDir = join(root, 'src', 'components');
const NOT_MODAL = ['HUD.tsx', 'VirtualJoystick.tsx'];
const modals = readdirSync(compDir).filter((f) => f.endsWith('.tsx') && !NOT_MODAL.includes(f));
check(modals.length >= 8, `components: expected the modal components, found ${modals.length}`);
for (const f of modals) {
  const src = readFileSync(join(compDir, f), 'utf8');
  const classes = [...src.matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\})/g)].map((x) => x[1] ?? x[2] ?? '').join(' ');
  const hit = ROOTS.some((r) => classes.includes(r.slice(1)));
  check(hit, `${f}: no root class that padnav.js looks for (${ROOTS.join(' ')})`);
}

const app = readFileSync(join(root, 'src', 'App.tsx'), 'utf8');
const calls = (app.match(/\bstartPadNav\(\)/g) || []).length;
check(calls === 1, `App.tsx: startPadNav() called ${calls} times, expected exactly 1`);

for (const p of problems) console.log(p);
if (problems.length) {
  console.log(`pad roots: ${problems.length} problem(s)`);
  process.exit(1);
}
console.log(`pad roots ok: ${modals.length} modal components use a padnav root class; startPadNav() is called once`);
