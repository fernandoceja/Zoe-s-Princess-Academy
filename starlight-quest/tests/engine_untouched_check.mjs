// Engine lock (R4 T6): SHA-256 of every js/*.js, every file under vendor/, and the 35 existing tests/*_check.mjs must match tests/fixtures/engine-sha256.json.
// Usage: node starlight-quest/tests/engine_untouched_check.mjs           (compare; exit 1 on any change)
//        node starlight-quest/tests/engine_untouched_check.mjs --write   (regenerate the fixture)
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { resolve, dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');   // starlight-quest/
const fixturePath = join(root, 'tests', 'fixtures', 'engine-sha256.json');
const SELF_EXCLUDED = new Set(['engine_untouched_check.mjs', 'savecontinuity_check.mjs']);
const toPosix = (p) => p.split(sep).join('/');
const sha256 = (file) => createHash('sha256').update(readFileSync(file)).digest('hex');

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir).sort()) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

// Engine files that the fixture must cover (relative to starlight-quest/).
function engineFiles() {
  const js = readdirSync(join(root, 'js')).filter((f) => f.endsWith('.js')).sort().map((f) => 'js/' + f);
  const vendor = walk(join(root, 'vendor')).map((f) => toPosix(relative(root, f)));
  return [...js, ...vendor];
}

// The 35 existing test files, excluding this check and the savecontinuity check.
function testFiles() {
  return readdirSync(join(root, 'tests'))
    .filter((f) => f.endsWith('_check.mjs') && !SELF_EXCLUDED.has(f))
    .sort()
    .map((f) => 'tests/' + f);
}

if (process.argv.includes('--write')) {
  const files = {};
  for (const rel of [...engineFiles(), ...testFiles()]) files[rel] = sha256(join(root, rel));
  const sorted = Object.fromEntries(Object.keys(files).sort().map((k) => [k, files[k]]));
  writeFileSync(fixturePath, JSON.stringify({ files: sorted }, null, 2) + '\n');
  console.log(`wrote ${Object.keys(sorted).length} hashes to ${toPosix(relative(root, fixturePath))}`);
  process.exit(0);
}

const fixture = JSON.parse(readFileSync(fixturePath, 'utf8')).files;
const problems = [];
const expected = new Set(Object.keys(fixture));

for (const rel of Object.keys(fixture).sort()) {
  const full = join(root, rel);
  if (!existsSync(full)) { problems.push(`missing: ${rel}`); continue; }
  if (sha256(full) !== fixture[rel]) problems.push(`changed: ${rel}`);
}
for (const rel of engineFiles()) {
  if (!expected.has(rel)) problems.push(`extra (not in fixture): ${rel}`);
}

for (const p of problems) console.log(p);
const n = problems.length;
console.log(n > 0 ? `engine: ${n} changed` : 'engine: 0 changed');
process.exit(n > 0 ? 1 : 0);
