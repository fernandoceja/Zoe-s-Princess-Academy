// Recorded princess voices (Nov 16): a clip plays only for the exact words on screen; everything else is the speech voice.
// Plain Node.
import { readFileSync, existsSync } from 'node:fs';
import * as C from '../src/flow/clips.js';
import { NO_CLIP_IDS, PRINCESSES } from '../src/engine-core.js';

const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const problems = [];
let checks = 0;
const ok = (cond, msg) => { checks++; if (!cond) problems.push(msg); };

// 1. Every clip line names a real file, and the files players can hear are precached for offline play.
const sw = read('sw.js');
for (const lang of Object.keys(C.CLIP_LINES)) {
  for (const [id, set] of Object.entries(C.CLIP_LINES[lang])) {
    ok(!!PRINCESSES[id], `clips: ${id} is a game princess`);
    for (const kind of Object.keys(set)) {
      ok(C.CLIP_KINDS.includes(kind), `clips: ${id} ${kind} is a known kind`);
      const rel = `assets/audio/${lang}/princess_${id}_${kind}_01.mp3`;
      ok(existsSync(new URL('../../' + rel, import.meta.url)), `clips: missing file ${rel}`);
      if (!NO_CLIP_IDS.includes(id)) ok(sw.includes(`'../${rel}'`), `sw.js: ${rel} must be precached (she can play it)`);
    }
  }
}

// 2. Exact words only.
const belle = C.CLIP_LINES.EN.belle;
ok(C.norm("Hello, I'm Belle!") === 'hello im belle', 'norm: words only');
let p = C.linePlan('EN', 'belle', belle.praise);
ok(p.length === 1 && p[0].type === 'clip' && p[0].kind === 'praise', 'plan: her praise alone is her clip');
p = C.linePlan('EN', 'belle', 'yes WHAT a wonderful reader');
ok(p.length === 1 && p[0].type === 'clip', 'plan: case and punctuation do not matter');
p = C.linePlan('EN', 'belle', 'Yes, what a wonderful reader, Zoe!');
ok(p.length === 1 && p[0].type === 'tts', 'plan: one extra word means no clip');
p = C.linePlan('EN', 'belle', 'Yes, what a wonderful');
ok(p.length === 1 && p[0].type === 'tts', 'plan: part of a clip is not the clip');
p = C.linePlan('EN', 'elsa', belle.praise);
ok(p.every((x) => x.type === 'tts'), "plan: Belle's words are not Elsa's clip");
p = C.linePlan('ES', 'belle', belle.praise);
ok(p.every((x) => x.type === 'tts'), 'plan: no English clip in Spanish');

// 3. A clip inside a longer line: clip for her sentences, speech for the rest, in order.
p = C.linePlan('EN', 'belle', `⭐ +1 star! ${belle.praise}`);
ok(p.length === 2 && p[0].type === 'tts' && /1 star/.test(p[0].text) && p[1].type === 'clip', 'plan: star line, then her praise clip');
p = C.linePlan('EN', 'belle', `${belle.encourage} Which word starts with the letter a?`);
ok(p.length === 2 && p[0].type === 'clip' && p[0].kind === 'encourage' && p[1].type === 'tts' && p[1].text === 'Which word starts with the letter a?', 'plan: her "almost" clip, then the hint by speech');
p = C.linePlan('EN', 'belle', `${belle.greeting} Welcome back, Zoe! My land is glowing because of you! 💖`);
ok(p.length === 2 && p[0].kind === 'greeting' && p[1].type === 'tts' && /Welcome back/.test(p[1].text), 'plan: a three-sentence greeting matches as one clip');
p = C.linePlan('EN', 'belle', '💖');
ok(p.length === 0, 'plan: an emoji alone says nothing');

// 4. Every spoken word is either in a clip or in a speech part, nothing lost, nothing added.
for (const id of Object.keys(C.CLIP_LINES.EN)) for (const kind of C.CLIP_KINDS) {
  const t = C.CLIP_LINES.EN[id][kind];
  const line = `Good try. ${t} One more look!`;
  const plan = C.linePlan('EN', id, line, NO_CLIP_IDS);
  ok(C.norm(plan.map((x) => x.text).join(' ')) === C.norm(line), `plan: ${id} ${kind} keeps every word`);
  const clips = plan.filter((x) => x.type === 'clip');
  if (NO_CLIP_IDS.includes(id)) ok(clips.length === 0, `plan: ${id} has no clips yet (NO_CLIP_IDS)`);
  else ok(clips.length === 1 && C.norm(clips[0].text) === C.norm(t) && clips[0].kind === kind, `plan: ${id} ${kind} clip found inside a line`);
}

// 5. sayLine runs the parts in order and calls onDone once, after the last part.
const calls = [];
const fake = {
  speak: (id, kind, text, done) => { calls.push(['clip', id, kind, text]); done && done(); },
  speakExact: (id, text, done) => { calls.push(['tts', id, text]); done && done(); },
};
let doneN = 0;
C.sayLine(fake, 'EN', 'belle', `${belle.encourage} Look at the end.`, () => { doneN++; });
ok(calls.length === 2 && calls[0][0] === 'clip' && calls[0][2] === 'encourage' && calls[1][0] === 'tts' && calls[1][2] === 'Look at the end.', 'sayLine: clip then speech');
ok(doneN === 1, 'sayLine: onDone once, at the end');
calls.length = 0;
C.sayLine(fake, 'EN', 'belle', '', () => { doneN++; });
ok(calls.length === 1 && calls[0][0] === 'tts' && doneN === 2, 'sayLine: an empty line still finishes');
calls.length = 0;
C.sayLine(fake, 'EN', 'ariel', 'Oh, that was wonderful!', undefined, ['ariel']);
ok(calls.length === 1 && calls[0][0] === 'tts', 'sayLine: NO_CLIP_IDS princess uses speech');

// 6. Greetings: Cinderella's talks about choosing a grade, so it never shows.
ok(C.greetingLine('EN', 'cinderella') === undefined, 'greeting: Cinderella has none in the game');
ok(C.greetingLine('EN', 'belle') === belle.greeting, 'greeting: Belle has hers');

// 7. Wiring: the screens speak through say.js, and the engine's stop() cancels a line's follow-up.
const app = read('src/App.tsx');
ok(/from '\.\/flow\/say\.js'/.test(app), 'App: uses say.js');
ok(/herLine\(npcId, 'praise'\)/.test(app) && /herSay\(npcId, praise\)/.test(app), 'App: praise can be her recorded line');
ok(/herLine\(npcId, 'encourage'\)/.test(app) && /q\.misses === 1/.test(app), 'App: first miss gets her recorded "almost" line');
ok(/herGreeting\(npcId\)/.test(app), 'App: back in a glowing land she greets Zoe');
for (const f of ['src/components/DialogueModal.tsx', 'src/components/ChallengeModal.tsx']) {
  const s = read(f);
  ok(/from '\.\.\/flow\/say\.js'/.test(s) && /herSay\(npcId, /.test(s), `${f}: speaks through say.js`);
}
ok(/stop\(\) \{\s*_seq\+\+;/.test(read('js/audio.js')), 'audio.js: stop() cancels the follow-up of a stopped line');
ok(/const mySeq = _seq;/.test(read('js/audio.js')) && /if \(!live\(\)\) return;/.test(read('js/audio.js')) && /oncanplaythrough = \(\) => \{\n\s*if \(!live\(\)\)/.test(read('js/audio.js')), 'audio.js: a stopped clip never plays late and its fallback never speaks');

console.log(`clipvoice: ${checks} checks, ${problems.length} problems`);
for (const m of problems) console.log('  -', m);
if (problems.length) process.exit(1);
