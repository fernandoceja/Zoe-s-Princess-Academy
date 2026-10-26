// Cache-stamp and precache consistency: one ?v= stamp everywhere, every versioned local file precached with it, every precache entry on disk.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, dirname, join, posix } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');   // starlight-quest/
const repo = resolve(root, '..');
const read = (p) => readFileSync(join(root, p), 'utf8');
const bad = [];
const stamps = new Set();
const jsFiles = readdirSync(join(root, 'js')).filter((f) => f.endsWith('.js')).map((f) => 'js/' + f);

// Versioned local refs: index.html, js imports, and the precache list in sw.js.
const html = read('index.html');
const sw = read('sw.js');
const versioned = new Map(); // path -> stamp, from index.html and js/*.js
const scan = (file, text) => {
  // Paths are relative to the referencing file: index.html at root, js/*.js inside js/.
  const dir = posix.dirname(file);
  for (const m of text.matchAll(/['"]\.\/([^'"?]+)\?v=([\w.-]+)['"]/g)) {
    const path = posix.normalize(posix.join(dir, m[1]));
    stamps.add(m[2]); versioned.set(path, m[2]);
    if (!existsSync(join(root, path))) bad.push(`${file}: missing ${path}`);
  }
};
scan('index.html', html);
for (const f of jsFiles) scan(f, read(f));

// PRECACHE_URLS array in sw.js.
const arr = sw.match(/const PRECACHE_URLS = \[([\s\S]*?)\];/);
if (!arr) { console.log('PRECACHE_URLS not found in sw.js'); process.exit(1); }
const entries = [...arr[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
const precache = new Map();
for (const e of entries) {
  const [url, q] = e.split('?v=');
  if (q !== undefined) stamps.add(q);
  // Resolve on disk: './' is index.html, '../assets/' is the repo-root assets folder.
  let disk;
  if (url === './') disk = join(root, 'index.html');
  else if (url.startsWith('../')) disk = resolve(root, url);
  else disk = join(root, url);
  if (!existsSync(disk)) bad.push(`precache entry missing on disk: ${e}`);
  if (q !== undefined) precache.set(url.replace(/^\.\//, ''), q);
}

// Every versioned local file must be precached with the same stamp.
for (const [path, stamp] of versioned) {
  if (!precache.has(path)) bad.push(`not precached: ${path}`);
  else if (precache.get(path) !== stamp) bad.push(`stamp mismatch in precache: ${path} has ${precache.get(path)}, expected ${stamp}`);
}

// One stamp across the whole site.
if (stamps.size !== 1) bad.push(`expected one stamp, found ${stamps.size}: ${[...stamps].join(', ')}`);

console.log(`precache: ${entries.length} entries, ${versioned.size} versioned refs, stamps ${[...stamps].join(',')}, problems ${bad.length}`);
if (bad.length) { console.log(bad.slice(0, 10).join('\n')); process.exit(1); }
