// Assemble the GitHub Pages site into <repo>/_site.
// Copy-only mode (no starlight-quest/package.json): copies every repo file byte-for-byte, preserving paths.
// Build mode (starlight-quest/package.json present): also builds the React shell with Vite and copies
// dist/index.html and dist/app/ into _site/starlight-quest/. The vanilla game is always copied unchanged.
import { execSync } from 'node:child_process';
import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));          // starlight-quest/tools/
const repo = resolve(here, '..', '..');                         // repo root
const out = join(repo, '_site');
const dist = join(repo, 'starlight-quest', 'dist');

const shell = join(repo, 'starlight-quest');
const buildMode = existsSync(join(shell, 'package.json'));

if (buildMode) {
  execSync('npm ci', { cwd: shell, stdio: 'inherit' });
  execSync('npm run build', { cwd: shell, stdio: 'inherit' });
}

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

let copied = 0;

function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const abs = join(dir, entry.name);
    const rel = relative(repo, abs).split(sep).join('/');
    if (entry.name.startsWith('.')) continue;          // .git, .github, .gitignore, .DS_Store, .firebaserc
    if (entry.name === 'node_modules') continue;
    if (abs === out || rel === '_site') continue;
    if (abs === dist || rel === 'starlight-quest/dist') continue;
    if (entry.isSymbolicLink()) continue;              // never follow symlinks
    if (entry.isDirectory()) {
      walk(abs);
    } else if (entry.isFile()) {
      const target = join(out, rel);
      mkdirSync(dirname(target), { recursive: true });
      copyFileSync(abs, target);
      copied++;
    }
  }
}

walk(repo);
console.log(`assemble: copied ${copied} files to _site`);

if (buildMode) {
  const target = join(out, 'starlight-quest');
  copyFileSync(join(dist, 'index.html'), join(target, 'index.html'));
  cpSync(join(dist, 'app'), join(target, 'app'), { recursive: true });
  console.log('assemble: copied built shell (index.html, app/) into _site/starlight-quest');

  // Fill the BUILD_URLS hook in the built sw.js so the offline cache holds every shell file.
  const LINE = 'const BUILD_URLS = []; // filled by tools/assemble-site.mjs';
  const swPath = join(target, 'sw.js');
  const sw = readFileSync(swPath, 'utf8');
  const hits = sw.split(LINE).length - 1;
  if (hits !== 1) {
    console.error(`assemble: expected exactly one BUILD_URLS line in ${swPath}, found ${hits}. Fix tools/assemble-site.mjs or sw.js.`);
    process.exit(1);
  }
  const appFiles = readdirSync(join(target, 'app'))
    .filter((f) => statSync(join(target, 'app', f)).isFile());
  const urls = [...appFiles.map((f) => './app/' + f), './index.html'].sort();
  writeFileSync(swPath, sw.replace(LINE, `const BUILD_URLS = ${JSON.stringify(urls)}; // filled by tools/assemble-site.mjs`));
  console.log(`assemble: wrote ${urls.length} BUILD_URLS into _site/starlight-quest/sw.js`);
}
