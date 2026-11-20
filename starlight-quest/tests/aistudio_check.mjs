// Best of the AI Studio version (Nov 20): each princess's own sparkle-trail colors, clearer kingdom diamonds with a
// count, and a calm "Next: Belle at Whispering Library" chip while she walks. Offline only, in English and Spanish.
// Plain Node (reads the source; the trail needs WebGL to draw).
import { readFileSync } from 'node:fs';
import { toEs } from '../src/i18n/es.js';
import { NPC_ORDER, PRINCESSES } from '../js/quests.js';

const read = (p) => readFileSync(new URL('../src/' + p, import.meta.url), 'utf8');
const bad = [];
const ok = (c, why) => { if (!c) bad.push(why); };

// 1. Trail colors: one core and one glow for every princess, used by the trail, falling back to gold and pink.
const nav = read('fx/navfx.js');
const block = (nav.match(/export const TRAIL_COLORS = \{([\s\S]*?)\n\};/) || [])[1] || '';
for (const id of NPC_ORDER) ok(new RegExp(`\\b${id}:\\s*\\{ core: 0x[0-9a-f]{6}, glow: 0x[0-9a-f]{6} \\}`).test(block), `trail: ${id} has no colors`);
ok(/TRAIL_DEFAULT = \{ core: 0xffd36b, glow: 0xff9fd0 \}/.test(nav), 'trail: no princess keeps the old gold and pink');
ok(/setTrailColors\(g, nav\.today\);/.test(nav), 'trail: colors do not follow today\'s princess');
ok(/if \(g\.colorFor === npcId\) return;/.test(nav), 'trail: colors are set every frame instead of once per princess');

// 2. HUD: clear diamonds with a count, labels screen readers can say.
const hud = read('components/HUD.tsx');
ok(/points="10,1\.5 18\.5,10 10,18\.5 1\.5,10"/.test(hud) && /stroke=\{filled \? '#92400e' : '#64748b'\}/.test(hud), 'HUD: kingdom diamonds are not outlined');
ok(/\{doneCount\}\/\{totalLands\}/.test(hud), 'HUD: no kingdom count next to the diamonds');
ok(/aria-label=\{`\$\{stars\} stars`\}/.test(hud) && /gems today`\}/.test(hud), 'HUD: stars or gems have no spoken label');
ok(!/Today: \{PRINCESSES/.test(hud), 'HUD: the old large-screen-only Today pill is still there');

// 3. The Next chip: only while walking, never a tap target, out of the way of the talk button and the joystick.
ok(/showNext && !activeNPC && !interactPrompt && \(nextPrincess \|\| allGlowing\)/.test(hud), 'Next chip: shows at the wrong times');
const chip = (hud.match(/className="zsq-next-chip ([^"]*)"/) || [])[1] || '';
ok(/pointer-events-none/.test(chip) && /hidden sm:flex/.test(chip) && /bottom-12/.test(chip) && /max-w-\[calc\(100vw-20rem\)\]/.test(chip), 'Next chip: could steal taps or sit on the joystick');
const app = read('App.tsx');
ok(/nextNPC=\{todayStar\}/.test(app) && /showNext=\{gameState === 'roam' && !mapOpen\}/.test(app), 'App: the Next chip is not fed today\'s princess while roaming');

// 4. Every Next line, the all-glowing line and the Gems label have Spanish.
for (const id of NPC_ORDER) { const P = PRINCESSES[id]; const t = `Next: ${P.name} at ${P.landName}`; const es = toEs(t); ok(!!es && es.includes(P.name) && /^Siguiente: /.test(es), `Spanish: no line for "${t}"`); }
ok(toEs(`All ${NPC_ORDER.length} kingdoms are glowing!`) === '¡Los 10 reinos brillan!' && toEs('Gems') === 'Gemas', 'Spanish: all-glowing line or Gems label missing');

// 5. Still offline: nothing from the AI Studio copy's online pieces came along.
for (const f of ['fx/navfx.js', 'components/HUD.tsx', 'App.tsx']) ok(!/@google\/genai|firebase|GEMINI|https?:\/\//i.test(read(f).replace(/\/\/.*$/gm, '')), `${f}: an online piece slipped in`);

if (bad.length) { console.error('aistudio_check FAILED (' + bad.length + '):\n - ' + bad.join('\n - ')); process.exit(1); }
console.log(`aistudio_check passed: ${NPC_ORDER.length} trail themes, HUD and Spanish`);
