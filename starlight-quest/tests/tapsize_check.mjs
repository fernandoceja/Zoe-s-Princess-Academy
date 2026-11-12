// Big tap targets (Q4): every kid-facing button is at least 60 px tall (and 60 px wide when it is an icon), and the
// pop-up message moves off the HUD buttons (below them in portrait, to the bottom in short landscape screens). Plain Node.
import { readFileSync } from 'node:fs';
const read = (p) => readFileSync(new URL('../src/' + p, import.meta.url), 'utf8');
const problems = [];
const KID = ['HUD', 'ChallengeModal', 'DialogueModal', 'TutorialModal', 'CelebrationModal', 'TitleModal', 'PauseMenu', 'WardrobeModal', 'TreasureBookModal'];
const OK_H = /(?:^|[\s`"])(?:min-h-\[(\d+)px\]|h-\[(\d+)px\])/;
let buttons = 0;
for (const name of KID) {
  const src = read(`components/${name}.tsx`);
  const re = /<button\b[\s\S]*?className=(?:"([^"]*)"|\{`([^`]*)`\})/g;
  let m;
  while ((m = re.exec(src))) {
    const cls = m[1] ?? m[2] ?? '';
    buttons++;
    const h = cls.match(/min-h-\[(\d+)px\]/) || cls.match(/(?:^|[\s`])h-\[(\d+)px\]/);
    const line = src.slice(0, m.index).split('\n').length;
    // Grown-ups' Parent Corner opener and the treasure tiles/stickers (big cards) are the only allowed exceptions.
    if (name === 'PauseMenu' && /bg-slate-100/.test(cls)) continue;
    if (name === 'TreasureBookModal' && /p-3 rounded-2xl/.test(cls)) continue;
    if (!h || +h[1] < 60) problems.push(`${name}.tsx:${line} button is under 60px tall: ${cls.slice(0, 70)}`);
    if (/\bw-\[(\d+)px\]/.test(cls) && +cls.match(/\bw-\[(\d+)px\]/)[1] < 60) problems.push(`${name}.tsx:${line} icon button under 60px wide`);
    if (/\b(?:w|h)-(?:[1-9]|1[0-4])\b/.test(cls.replace(/sm:\S+/g, ''))) problems.push(`${name}.tsx:${line} still has a small w-/h- size: ${cls.slice(0, 70)}`);
  }
}
if (buttons < 25) problems.push(`only ${buttons} kid buttons scanned, expected 25 or more`);
// The sound/pop-up banner.
const css = read('styles.css'), app = read('App.tsx'), hud = read('components/HUD.tsx');
if (!/\.zsq-toast\{top:5\.25rem/.test(css)) problems.push('toast: portrait position below the 60px HUD buttons is missing');
if (!/max-width:639px\)\{\.zsq-toast\{top:7\.5rem/.test(css)) problems.push('toast: narrow portrait position below the two-row HUD is missing');
if (!/orientation:landscape\) and \(max-height:\d+px\)\{\.zsq-toast\{top:auto;bottom:\d/.test(css)) problems.push('toast: landscape rule that moves it off the HUD is missing');
if (!/className="zsq-toast fixed/.test(app) || /className="fixed top-16/.test(app)) problems.push('toast: App must use the zsq-toast class');
if (!/pointer-events-none/.test(app.slice(app.indexOf('zsq-toast') - 40, app.indexOf('zsq-toast') + 200))) problems.push('toast: must not block taps');
if (!/flex-wrap/.test(hud) || !/order-3 w-full sm:order-none/.test(hud)) problems.push('HUD: the quest pill must wrap under the buttons on narrow screens');
console.log(`tapsize: ${buttons} kid buttons scanned, problems ${problems.length}`);
if (problems.length) { for (const p of problems.slice(0, 15)) console.log(p); process.exit(1); }
