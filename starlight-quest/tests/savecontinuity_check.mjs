// Save continuity (R4 T5, Node half): a representative Zoe save loads, merges, and saves back unchanged, and the save key is unchanged.
import { readFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');   // starlight-quest/
const KEY = 'zoe-starlight-quest-v1';
const fixture = JSON.parse(readFileSync(join(root, 'tests', 'fixtures', 'save-v1.json'), 'utf8'));

// Map-backed localStorage stand-in, installed before the engine module is loaded.
const store = new Map();
globalThis.window = {
  localStorage: {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => { store.set(k, String(v)); },
    removeItem: (k) => { store.delete(k); }
  }
};

const { Save, merge } = await import('../js/save.js?v=20261028r3');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

// 1. Load: the stored fixture comes back exactly as merge() shapes it.
store.set(KEY, JSON.stringify(fixture));
Save.load();
check(JSON.stringify(Save.data) === JSON.stringify(merge(fixture)), 'load: Save.data differs from merge(fixture)');

// 2. Canonical: merge() keeps every field of the fixture unchanged.
check(isDeepStrictEqual(merge(fixture), fixture), 'canonical: merge(fixture) does not deep-equal the fixture');

// 3. Save: writing back produces the fixture again.
Save.save();
const stored = store.get(KEY);
let parsed = null;
try { parsed = JSON.parse(stored); } catch (e) { parsed = null; }
check(parsed !== null && isDeepStrictEqual(parsed, fixture), 'save: stored string does not parse back to the fixture');

// 4. The save key is unchanged in the engine source.
const saveSrc = readFileSync(join(root, 'js', 'save.js'), 'utf8');
check(saveSrc.includes("'zoe-starlight-quest-v1'"), "key: js/save.js does not contain 'zoe-starlight-quest-v1'");

for (const p of problems) console.log(p);
console.log(`save continuity: ${problems.length} problems`);
process.exit(problems.length > 0 ? 1 : 0);
