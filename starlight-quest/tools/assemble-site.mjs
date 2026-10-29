// Assemble the GitHub Pages site into <repo>/_site.
// Copy-only mode: copies every repo file byte-for-byte, preserving paths.
// Build mode (starlight-quest/package.json present) is not implemented until P1.6.
import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));          // starlight-quest/tools/
const repo = resolve(here, '..', '..');                         // repo root
const out = join(repo, '_site');
const dist = join(repo, 'starlight-quest', 'dist');

if (existsSync(join(repo, 'starlight-quest', 'package.json'))) {
  console.log('assemble: build mode not implemented yet (P1.6)');
  process.exit(1);
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
