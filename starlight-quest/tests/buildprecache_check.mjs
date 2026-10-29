// Built-shell precache check (R4 T8). Runs on _site/ after tools/assemble-site.mjs:
// every built app file and next.html is precached, every source PRECACHE entry survives the build,
// and the manifest is byte-identical to the source.
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');   // starlight-quest/
const repo = resolve(root, '..');
const site = join(repo, '_site', 'starlight-quest');
const bad = [];

if (!existsSync(join(site, 'sw.js'))) {
  console.log(`buildprecache: ${join(site, 'sw.js')} is missing. Run "node starlight-quest/tools/assemble-site.mjs" from the repo root first.`);
  process.exit(1);
}

// Pull a named array literal out of a sw.js text; entries may be single- or double-quoted.
const list = (text, name) => {
  const m = text.match(new RegExp(`const ${name} = \\[([\\s\\S]*?)\\];`));
  if (!m) return null;
  return [...m[1].replace(/\/\/.*$/gm, '').matchAll(/['"]([^'"]+)['"]/g)].map((x) => x[1]);
};

const sourceSw = readFileSync(join(root, 'sw.js'), 'utf8');
const builtSw = readFileSync(join(site, 'sw.js'), 'utf8');
const sourcePrecache = list(sourceSw, 'PRECACHE_URLS');
const builtPrecache = list(builtSw, 'PRECACHE_URLS');
const builtBuild = list(builtSw, 'BUILD_URLS');
if (!sourcePrecache) bad.push('PRECACHE_URLS not found in source sw.js');
if (!builtPrecache) bad.push('PRECACHE_URLS not found in built sw.js');
if (!builtBuild) bad.push('BUILD_URLS not found in built sw.js');
const builtAll = new Set([...(builtPrecache || []), ...(builtBuild || [])]);

// Every built shell file is in the precache list, and exists on disk.
const appDir = join(site, 'app');
const appFiles = existsSync(appDir)
  ? readdirSync(appDir).filter((f) => statSync(join(appDir, f)).isFile())
  : [];
if (!appFiles.length) bad.push('no files in _site/starlight-quest/app/ (did the shell build run?)');
const shellUrls = [...appFiles.map((f) => './app/' + f), './next.html'];
for (const u of shellUrls) {
  if (!builtAll.has(u)) bad.push(`not precached in built sw.js: ${u}`);
  if (!existsSync(join(site, u))) bad.push(`precached file missing on disk: ${u}`);
}
for (const u of builtBuild || []) {
  if (!existsSync(join(site, u))) bad.push(`BUILD_URLS entry missing on disk: ${u}`);
}

// Every original source precache entry is still in the built list.
for (const e of sourcePrecache || []) {
  if (!builtPrecache || !builtPrecache.includes(e)) bad.push(`source PRECACHE entry dropped from built sw.js: ${e}`);
}

// The manifest is never edited by the build.
const srcManifest = readFileSync(join(root, 'manifest.webmanifest'));
const builtManifest = readFileSync(join(site, 'manifest.webmanifest'));
if (!srcManifest.equals(builtManifest)) bad.push('_site/starlight-quest/manifest.webmanifest differs from source');

console.log(`buildprecache: ${shellUrls.length} shell files precached, ${(sourcePrecache || []).length} source entries kept, manifest ${srcManifest.equals(builtManifest) ? 'identical' : 'DIFFERS'}, problems ${bad.length}`);
if (bad.length) { console.log(bad.slice(0, 10).join('\n')); process.exit(1); }
