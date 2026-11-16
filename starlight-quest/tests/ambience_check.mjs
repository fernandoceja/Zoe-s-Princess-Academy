// Gentle background sound per land (Nov 16): made in code, quiet, ducks under speech, Off/Soft/Medium in Parent Corner,
// silent when muted or hidden, lighter under Reduce Motion and Low quality, no files and no network. Plain Node.
import { readFileSync } from 'node:fs';
import * as A from '../src/flow/ambience.js';
import { LAND_MOODS, moodWeights, LAND_CENTERS } from '../src/flow/quality.js';

const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const problems = [];
let checks = 0;
const ok = (cond, msg) => { checks++; if (!cond) problems.push(msg); };

// 1. Settings: Soft by default, kept on this device, bad values fall back.
const mem = () => { const m = {}; return { getItem: (k) => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); } }; };
const s = mem();
ok(A.readAmbience(s) === 'soft', 'settings: Soft by default');
ok(A.writeAmbience(s, 'off') === 'off' && A.readAmbience(s) === 'off', 'settings: Off is kept');
ok(A.writeAmbience(s, 'loud!!') === 'soft', 'settings: unknown choice becomes Soft');
ok(A.readAmbience({ getItem: () => { throw new Error('private'); } }) === 'soft', 'settings: storage errors are fine');
ok(A.readAmbience(null) === 'soft', 'settings: no storage is fine');

// 2. Quiet: well under the sound effects (master 0.22), Medium louder than Soft, Off silent.
ok(A.AMBIENCE_LEVELS.off === 0 && A.AMBIENCE_LEVELS.soft > 0 && A.AMBIENCE_LEVELS.medium > A.AMBIENCE_LEVELS.soft, 'levels: off < soft < medium');
ok(A.AMBIENCE_LEVELS.medium <= 0.1, 'levels: even Medium stays soft (<= 0.1)');

// 3. The plan: ducks under speech, quieter in questions, silent when muted/off/hidden, lighter when calm or lite.
const base = A.ambiencePlan({ choice: 'soft' });
ok(base.master === A.AMBIENCE_LEVELS.soft && base.plinks && base.noise, 'plan: soft in the world, with plinks and noise');
const duck = A.ambiencePlan({ choice: 'soft', speaking: true });
ok(duck.master > 0 && duck.master <= base.master * 0.25, 'plan: ducks to a fifth under speech');
const quiz = A.ambiencePlan({ choice: 'soft', question: true });
ok(quiz.master < base.master && quiz.master > duck.master, 'plan: a little quieter during a question');
for (const k of ['muted', 'hidden']) ok(A.ambiencePlan({ choice: 'medium', [k]: true }).master === 0, `plan: silent when ${k}`);
ok(A.ambiencePlan({ choice: 'off' }).master === 0, 'plan: Off is silent');
const calm = A.ambiencePlan({ choice: 'soft', calm: true });
ok(calm.master > 0 && !calm.plinks && calm.noise, 'plan: Reduce Motion keeps the steady sound, no random plinks');
const lite = A.ambiencePlan({ choice: 'soft', lite: true });
ok(lite.master > 0 && !lite.plinks && !lite.noise && lite.lite, 'plan: Low quality plays the chord only');

// 4. Every land (the same lands as the sky colours) has its sound, with gentle notes in a safe range.
for (const id of Object.keys(LAND_MOODS)) {
  const L = A.LAND_SOUNDS[id];
  ok(!!L, `lands: ${id} has a sound`);
  if (!L) continue;
  ok(L.chord.length >= 2 && L.chord.every((f) => f >= 80 && f <= 400), `lands: ${id} chord is low and soft`);
  ok(L.scale.length >= 4 && L.scale.every((f) => f >= 300 && f <= 1800), `lands: ${id} plinks stay in a gentle range`);
  ok(L.every >= 3, `lands: ${id} plinks are rare (every ${L.every}s)`);
  ok(!L.noise || (L.noise.level <= 0.5 && L.noise.cutoff <= 3000), `lands: ${id} noise is soft`);
}
let rng = 1;
const r = () => { rng = (rng * 16807) % 2147483647; return rng / 2147483647; };
for (let i = 0; i < 500; i++) { const id = Object.keys(A.LAND_SOUNDS)[i % 11]; const p = A.nextPlink(id, r); ok(A.LAND_SOUNDS[id].scale.includes(p.freq) && p.wait >= A.LAND_SOUNDS[id].every * 0.6 - 1e-9, `plink: ${id} note and wait`); }

// 5. Walking: at each land's centre that land is loudest; at the hub, only the hub plays.
for (const [id, c] of Object.entries(LAND_CENTERS)) {
  const g = A.landGains(moodWeights(c.x, c.z));
  const top = Object.entries(g).sort((a, b) => b[1] - a[1])[0];
  ok(top && top[0] === id, `walk: ${id} is loudest at its centre`);
}
const hub = A.landGains(moodWeights(0, 0));
ok(Object.keys(hub).length === 1 && hub.hub > 0.9, 'walk: the hub alone at the centre');

// 6. Made in code: no audio files, no fetch, no network, nothing new to precache.
const fx = read('src/fx/ambience.js');
ok(!/fetch\(|XMLHttpRequest|\.mp3|\.ogg|\.wav|https?:\/\/|new Audio\(/.test(fx) && !/https?:\/\/|\.mp3/.test(read('src/flow/ambience.js')), 'files: generated with WebAudio only, no files or network');
ok(/createOscillator/.test(fx) && /createBiquadFilter/.test(fx), 'files: oscillators and filtered noise');
ok(/visibilitychange/.test(fx) && /ctx\.suspend\(\)/.test(fx), 'battery: suspends when the app is hidden');
ok(/Narrator\.speaking/.test(fx) && /Narrator\.muted/.test(fx), 'ducking: reads the narrator, follows the HUD sound button');
ok(/prefers-reduced-motion/.test(fx) && /getFxStatus\(\)\.level === 'low'/.test(fx), 'calm: Reduce Motion and Low quality respected');
ok(/get speaking\(\) \{ return _speaking; \}/.test(read('js/audio.js')), 'audio.js: Narrator.speaking getter');

// 7. Wiring: starts inside the Start tap; Parent Corner has Off / Soft / Medium.
const app = read('src/App.tsx');
ok(/const handleStartTitle = \(\) => \{\s*SoundFX\.ensure\(\);\s*startAmbience\(\);/.test(app), 'App: starts in the Start tap (iOS)');
ok(/installAmbience\(\{ getXZ:/.test(app) && /getPhase: \(\) => phaseRef\.current/.test(app), 'App: knows where Zoe is and what is on screen');
const pc = read('src/components/ParentCorner.tsx');
ok(/Background sound/.test(pc) && /AMBIENCE_CHOICES\.map/.test(pc) && /setAmb\(setAmbience\(c\)\)/.test(pc), 'Parent Corner: Off / Soft / Medium');

console.log(`ambience: ${checks} checks, ${problems.length} problems`);
for (const m of problems.slice(0, 25)) console.log('  -', m);
if (problems.length) process.exit(1);
