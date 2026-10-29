// Assemble the GitHub Pages site into <repo>/_site.
// Copy-only mode (no starlight-quest/package.json): copies every repo file byte-for-byte, preserving paths.
// Build mode (starlight-quest/package.json present): also builds the React shell with Vite and copies
// dist/next.html and dist/app/ into _site/starlight-quest/. The vanilla game is always copied unchanged.
import { execSync } from 'node:child_process';
import { copyFileSync, cpSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
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
  copyFileSync(join(dist, 'next.html'), join(target, 'next.html'));
  cpSync(join(dist, 'app'), join(target, 'app'), { recursive: true });
  console.log('assemble: copied built shell (next.html, app/) into _site/starlight-quest');
}
