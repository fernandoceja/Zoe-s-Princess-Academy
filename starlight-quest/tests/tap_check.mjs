// Tap the world (E1): scenery taps must never beat princess taps, must respect input lock and calm motion,
// and must stay out of quest/movement code. Source inspection, since world.js needs a browser (three importmap).
import { readFileSync } from 'node:fs';
const world = readFileSync(new URL('../js/world.js', import.meta.url), 'utf8');
const main = readFileSync(new URL('../js/main.js', import.meta.url), 'utf8');
const bad = [];
const ok = (name, cond) => { if (!cond) bad.push(name); };

// Pointer handler body
const start = world.indexOf('const onPointerDown = (e) => {');
const end = world.indexOf("addEventListener('pointerdown', onPointerDown)", start);
ok('onPointerDown found', start > 0 && end > start);
const h = world.slice(start, end);
const npcAt = h.indexOf('intersectObjects(npcHitMeshes');
const tapAt = h.indexOf('intersectObjects(tappables');
ok('NPC raycast present', npcAt > 0);
ok('tappables raycast present', tapAt > 0);
ok('NPC raycast happens before tappables raycast', npcAt > 0 && tapAt > npcAt);
const returnAt = h.indexOf('return;', h.indexOf('onInteractRequest('));
ok('princess hit returns before tappables', returnAt > 0 && returnAt < tapAt);
ok('input lock checked first', h.indexOf('if (!inputEnabled) return;') > 0 && h.indexOf('if (!inputEnabled) return;') < npcAt);
ok('tap never calls quest/move code', !/startQuest|playerVel|playerPos|setNPCState/.test(h));

// Reaction: calm motion branch must not hop or wiggle
const rs = world.indexOf('function tapReact(');
const re = world.indexOf('function startTapReaction(', rs);
ok('tapReact found', rs > 0 && re > rs);
const r = world.slice(rs, re);
const calmAt = r.indexOf('if (calmMotion) {');
const elseAt = r.indexOf('} else {', calmAt);
ok('tapReact honors calmMotion', calmAt > 0 && elseAt > calmAt);
const calmBranch = r.slice(calmAt, elseAt);
ok('calm branch has no position/rotation motion', !/position\.|rotation\./.test(calmBranch));
ok('calm branch pulses scale and glow', /scale\.setScalar/.test(calmBranch) && /opacity/.test(calmBranch));
const motionBranch = r.slice(elseAt);
ok('normal branch hops and wiggles', /position\.y/.test(motionBranch) && /rotation\.z/.test(motionBranch));

// Debounce, loop hookup, cleanup, sound hook
ok('re-tap debounced', /if \(it\.t >= 0\) return false/.test(world));
ok('loop runs reactions', /tapItems\[i\]\.t >= 0\) tapReact\(/.test(world));
ok('dispose clears tappables', /tappables\.length = 0/.test(world));
const count = (world.match(/addTappable\('/g) || []).length;
ok(`enough tappables (${count})`, count >= 16);
ok('main plays chime on world tap', /onWorldTap\(\)[\s\S]{0,120}SoundFX\.chime\(\)/.test(main));
ok('main ignores world taps outside roam/pause', /onWorldTap\(\)\s*\{\s*if \(state !== 'roam' \|\| paused\) return;/.test(main));

if (bad.length) { console.log('FAIL', bad); process.exit(1); }
console.log(`tap_check ok (${count} tappables)`);
