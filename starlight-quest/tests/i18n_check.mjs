// Spanish mode (Nov 16): English / Español in Parent Corner (Save.data.lang), 1st-grade Spanish for the math lands,
// stories, praise and screens, the Spanish clips only where the Spanish words match them exactly, reading rounds kept
// in English, and answers that score the same in both languages. Plain Node.
import { readFileSync, existsSync } from 'node:fs';
import { toEs, esWord } from '../src/i18n/es.js';
import { CLIP_LINES, norm, linePlan } from '../src/flow/clips.js';
import { buildRounds, NPC_ORDER, QUESTS } from '../js/quests.js';

const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const problems = [];
let checks = 0;
const ok = (cond, msg) => { checks++; if (!cond) problems.push(msg); };
let seed = 7;
const rng = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

const ENGLISH = ['belle', 'ariel', 'anna', 'jasmine', 'aurora', 'rapunzel'];
const MATH = NPC_ORDER.filter((id) => !ENGLISH.includes(id));
const label = (c) => (typeof c === 'string' ? c : (c && (c.label || c.t || c.name)) || '');
const hasWords = (t) => /[A-Za-z]/.test(t);

// 1. Every math-land line with words has Spanish: the question, the spoken question, the hint and every card.
for (const npc of MATH) {
  let lines = 0, missing = [];
  for (const tier of [1, 2, 3]) for (let k = 0; k < 25; k++) for (const r of buildRounds(npc, rng, { tier, review: [] })) {
    for (const t of [r.prompt, r.say, r.hint, r.hintSay, ...(r.choices || []).map(label)].filter(Boolean)) {
      if (!hasWords(t)) continue;
      lines++;
      if (!toEs(t)) missing.push(t);
    }
  }
  ok(lines > 50 && missing.length === 0, `${npc}: ${missing.length} of ${lines} lines have no Spanish (${missing.slice(0, 3).join(' | ')})`);
}

// 2. Every land's story (intro and goodbye) has Spanish.
for (const npc of NPC_ORDER) for (const t of [...(QUESTS[npc].intro || []), ...(QUESTS[npc].complete || [])]) ok(!!toEs(t), `${npc} story: no Spanish for "${t}"`);

// 3. Fair answers: a card's Spanish keeps its number, a time keeps its clock, and different cards stay different.
for (const npc of MATH) for (let k = 0; k < 40; k++) for (const r of buildRounds(npc, rng, { tier: 1 + (k % 3), review: [] })) {
  const cards = (r.choices || []).map(label).filter(Boolean);
  const es = cards.map((c) => (hasWords(c) ? toEs(c) : c));
  ok(new Set(es).size === new Set(cards).size, `${npc}: two different cards read the same in Spanish (${cards.join(', ')})`);
  cards.forEach((c, i) => { const d = c.match(/\d+/g); if (d) ok(d.every((x) => es[i].includes(x)), `${npc}: "${c}" lost its number in Spanish ("${es[i]}")`); });
}
ok(esWord('seven') === 'siete' && esWord('7') === '7' && esWord("3 o'clock") === 'las 3 en punto' && esWord('half past 1') === 'la 1 y media', 'words: numbers and clock times');

// 4. Whole lines only: a line is all Spanish or left English (null), never half and half.
ok(toEs('Good try! Try again.') === '¡Buen intento! Intenta otra vez.', 'whole: two known sentences');
ok(toEs('Good try! Say ran, then say each word.') === null, 'whole: a known sentence and an unknown one stays English');
ok(toEs('Did he get a bag of nuts?') === null && toEs('fun and sun') === null, 'whole: reading lines stay English');
ok(toEs('🎉 3 + 4 = ?') === null, 'whole: nothing to translate gives null');

// 5. Clips: each Spanish clip's words are exactly the Spanish of the English clip line, so it plays in Spanish mode.
for (const [id, set] of Object.entries(CLIP_LINES.ES)) for (const [kind, text] of Object.entries(set)) {
  const en = CLIP_LINES.EN[id] && CLIP_LINES.EN[id][kind];
  ok(!!en && norm(toEs(en)) === norm(text), `clip: ${id} ${kind} Spanish does not match its clip`);
  ok(existsSync(new URL(`../../assets/audio/ES/princess_${id}_${kind}_01.mp3`, import.meta.url)), `clip: ES ${id} ${kind} file is missing`);
  ok(read('sw.js').includes(`'../assets/audio/ES/princess_${id}_${kind}_01.mp3'`), `clip: ES ${id} ${kind} is not precached`);
  const plan = linePlan('ES', id, toEs(en) + ' ' + toEs('Good try! Try again.'));
  ok(plan[0].type === 'clip' && plan[0].kind === kind && plan[1].type === 'tts', `clip: ${id} ${kind} plays the clip, then speech`);
}
ok(Object.keys(CLIP_LINES.ES).length >= 7, 'clip: Spanish clips for at least 7 princesses');

// 6. Wiring.
const lang = read('src/i18n/lang.js');
ok(/ENGLISH_ROUND_NPCS = \['belle', 'ariel', 'anna', 'jasmine', 'aurora', 'rapunzel'\]/.test(lang), 'lang: reading and plant rounds stay English');
ok(/Narrator\.speakExact = /.test(lang) && /Narrator\.speakText = /.test(lang), 'lang: every spoken line goes through the Spanish');
ok(/MutationObserver/.test(lang) && /stopScreen/.test(lang) && /\[data-zsq-en\]/.test(lang), 'lang: screen words swap, come back, and skip English areas');
ok(!/fetch\(|XMLHttpRequest|https?:\/\//.test(lang + read('src/i18n/es.js')), 'lang: no network');
const say = read('src/flow/say.js');
ok(/spanishNow\(\) \? toEs\(text\)/.test(say) && /sayLine\(voiceIn\('ES'\), 'ES'/.test(say), 'say.js: Spanish first, then her Spanish clip');
const ch = read('src/components/ChallengeModal.tsx');
ok(/data-zsq-en=\{englishRound \|\| undefined\}/.test(ch) && /setEnglishRound\(englishRound\)/.test(ch), 'ChallengeModal: reading rounds stay English');
const pc = read('src/components/ParentCorner.tsx');
ok(/Language \/ Idioma/.test(pc) && /Save\.data\.lang = l;/.test(pc) && /applyLang\(l\)/.test(pc) && /Español/.test(pc), 'Parent Corner: English / Español switch saves Save.data.lang');
ok((pc.match(/data-zsq-en className="zsq-parent-wrap/g) || []).length === 2, 'Parent Corner: stays English for grown-ups');
ok(/applyLang\(Save\.data\.lang === 'ES' \? 'ES' : 'EN'\)/.test(read('src/App.tsx')), 'App: boots in the saved language');
ok(/if \(raw\.lang === 'ES' \|\| raw\.lang === 'EN'\) out\.lang = raw\.lang;/.test(read('js/save.js')), 'save: lang kept');

console.log(`i18n: ${checks} checks, ${problems.length} problems`);
for (const m of problems.slice(0, 25)) console.log('  -', m);
if (problems.length) process.exit(1);
