// Anna's quests (K11): capital letters and end marks. Every round is checked thousands of times per tier against a table of true marks
// written HERE, independent of the game code (the game's own SIGN_SENTENCES is also compared to it).
import { readFileSync } from 'node:fs';
import { buildRounds, QUESTS, PRINCESSES, NPC_ORDER, NO_CLIP_IDS, SIGN_SENTENCES, revealLines, PARENT_CORNER_HTML } from '../js/quests.js';
import { BUILT_SLOTS, builtSlotIds, unseenKingdomSlots, shouldRunFinale, NEW_LAND_SLOTS, openLandIds, isHarborOpen } from '../js/worldmap.js';
import { findsTotal } from '../js/treasures.js';
import { merge } from '../js/save.js';

const bad = new Map();
const fail = (why, r) => bad.set(`${why} | ${r ? (r.prompt || '') + ' => ' + r.answer + ' [' + (r.choices || []).join(',') + '] ' + (r.visual ? r.visual.text : '') : ''}`, 1);
const ok = (c, why, r) => { if (!c) fail(why, r); };

// ---- Truth table: sentence written the right way -> its end mark (hand-written) ----
const TABLE = {
  // telling
  'The cat sat.': '.', 'The sun is hot.': '.', 'The dog is wet.': '.', 'The ship is big.': '.', 'A hen sat on a nest.': '.',
  'We sit in the van.': '.', 'Zoe has a red hat.': '.', 'Sam can hop.': '.', 'Max got a pen.': '.', 'Mia has a big cup.': '.',
  'Ben sat on the rug.': '.', 'I can see a ship.': '.', 'I like to run.': '.', 'I see a red boat.': '.', 'We met Sam on the dock.': '.',
  'My dog can dig.': '.', 'She has a pet fish.': '.', 'He has a tan cap.': '.', 'This is my bag.': '.', 'The boat is on the bay.': '.',
  'Mia and Ben sit.': '.', 'We can run and jump.': '.', 'Max has ten red pins.': '.', 'The pig is in the mud.': '.',
  // questions
  'Can you help me?': '?', 'Is the sun hot?': '?', 'Where is the cat?': '?', 'Who has the hat?': '?', 'What is in the box?': '?',
  'Do you like jam?': '?', 'Can we go?': '?', 'Is it a fish?': '?', 'Where is my cup?': '?', 'Can Zoe hop?': '?',
  'Is Max in the van?': '?', 'Where did Mia go?': '?', 'Can I have a hug?': '?', 'Who is on the ship?': '?', 'What can Ben see?': '?',
  'Do you see the dock?': '?', 'Is the pig in the mud?': '?',
  // excited
  'Look out!': '!', 'Watch out!': '!', 'Stop, stop!': '!', 'Help, help!': '!', 'Yay, we won!': '!', 'Wow, a big ship!': '!',
  'Oh no, a bug!': '!', 'Yay, we did it!': '!', 'Wow, look at that!': '!', 'Ouch, my toe!': '!', 'Oh no, I fell!': '!', 'Hooray, we can go!': '!',
};
const NAMES = ['zoe', 'sam', 'max', 'mia', 'ben'];
// Independent word list: short decodable words and common sight words (lowercase). Names are allowed on top.
const ALLOW = new Set(('a an and at am are as back bag bay bad bed big bin boat box bug but can cap cat cup dig do dock did dog fell fish go got ' +
  'had has hat have he help hen her hop hot hug i in is it jam jump like look met mud my nest no not oh on out ouch pen pet pig pins red rug run sat see ' +
  'she ship sit stop sun tan ten the this to toe van watch we wet what where who wow won yay yes you hooray me that').split(/\s+/));
const QWORDS = new Set(['can', 'is', 'do', 'where', 'who', 'what', 'when', 'why', 'how', 'did']);
const EXCITED = /^(look out|watch out|stop|help|yay|wow|oh no|ouch|hooray)\b/i;
const stripMark = (t) => t.replace(/[.?!]+$/, '');
const bareWord = (w) => w.replace(/[.,?!]/g, '');
const words = (t) => t.split(' ');

// The game's own table must match ours, and each sentence is clear-cut.
ok(SIGN_SENTENCES.length === Object.keys(TABLE).length, 'same number of sentences (' + SIGN_SENTENCES.length + ')');
ok(SIGN_SENTENCES.length >= 40, 'enough sentences');
for (const [t, m] of SIGN_SENTENCES) {
  ok(TABLE[t] === m, 'game sentence matches the truth table: ' + t);
  const ws = words(t);
  ok(ws.length <= 6, 'at most 6 words: ' + t);
  ok(t.endsWith(m) && /^[A-Z]/.test(t), 'starts with a capital and ends with its mark: ' + t);
  for (const w of ws.map((x) => bareWord(x).toLowerCase())) ok(ALLOW.has(w) || NAMES.includes(w), `word "${w}" is on the allowlist (${t})`);
  const first = bareWord(ws[0]).toLowerCase();
  if (m === '?') ok(QWORDS.has(first), 'a question starts with a question word / can / is / do: ' + t);
  if (m === '.') ok(!EXCITED.test(t) && !/\b(wow|yay|oh|ouch|hooray)\b/i.test(t), 'a telling sentence has nothing excited in it: ' + t);
  if (m === '!') ok(EXCITED.test(t), 'an excited sentence is clearly excited: ' + t);
  if (m !== '?') ok(!QWORDS.has(first), 'statement/excited do not start with a question word: ' + t);
  // names are only ours
  for (const w of ws) if (/^[A-Z]/.test(bareWord(w)) && w !== ws[0]) ok(NAMES.includes(bareWord(w).toLowerCase()) || bareWord(w) === 'I', 'only names and I are capitalized inside: ' + t);
}

const E = /[\p{Extended_Pictographic}️‍⃣]/u;
const BARE = /(^|\s)[.?!]+(\s|$)/;   // a punctuation mark standing alone would be read oddly
const spoken = (where, t, r) => { t = String(t ?? '');
  ok(t.trim() && !E.test(t) && !/ \.|\s[.?!,]/.test(t) && !/\bis\s*[.?!]/.test(t) && !BARE.test(t), 'spoken text not clean: ' + where + ' "' + t + '"', r); };
const whole = (text, w) => new RegExp(`(^|[^a-z])${w.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z]|$)`).test(text.toLowerCase());

// ---- independent judges ----
const MARK_LABELS = { '.': '. period', '?': '? question mark', '!': '! exclamation mark' };
const markOf = (labelText) => Object.keys(MARK_LABELS).find((k) => MARK_LABELS[k] === labelText);
// Words that must be capitalized in a sentence: the first word, names, and the word I.
const mustCap = (w, i) => i === 0 || NAMES.includes(bareWord(w).toLowerCase()) || bareWord(w).toLowerCase() === 'i';
const capOf = (w) => /^[A-Z]/.test(w);
// Is a written sentence right? Capitals where needed, none elsewhere, the mark from the table.
function written(t) {
  const base = Object.keys(TABLE).find((k) => k.toLowerCase().replace(/[.?!]/g, '') === t.toLowerCase().replace(/[.?!]/g, ''));
  if (!base) return null;
  return t === base;   // the table holds exactly one right spelling per sentence
}
const baseOf = (t) => Object.keys(TABLE).find((k) => k.toLowerCase().replace(/[.?!]/g, '') === t.toLowerCase().replace(/[.?!]/g, ''));

let n = 0; const kinds = {}; const samples = {};
for (let tier = 1; tier <= 3; tier++) {
  for (let seed = 1; seed <= 4000; seed++) {
    let s = seed * 2654435761 >>> 0;
    const rng = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
    for (const r of buildRounds('anna', rng, { tier, review: [] })) {
      n++; kinds[`T${r.tier}:${r.kind}`] = (kinds[`T${r.tier}:${r.kind}`] || 0) + 1;
      (samples[`T${r.tier}`] ||= new Map()).set(r.kind, r);
      ok(Array.isArray(r.choices) && r.choices.length === 3 && new Set(r.choices).size === 3, 'needs 3 unique choices', r);
      ok(r.choices.includes(r.answer), 'answer in choices', r);
      ok(typeof r.prompt === 'string' && r.prompt && typeof r.hint === 'string' && r.hint, 'prompt and hint', r);
      ok(r.tier === tier || r.tier === Math.max(1, tier - 1), 'tagged with this or the tier below', r);
      ok(r.choices.every((c) => c.length <= 30), 'choice short enough for a 390px button', r);
      spoken('prompt', r.say || r.prompt, r); spoken('hint', r.hint, r); spoken('reveal', revealLines(r).say, r);
      ok(!r.pic, 'no stray pictures', r);
      // Hint never names the marks or gives the answer
      ok(!/period|question mark|exclamation/i.test(r.hint), 'hint names a mark', r);
      if (r.kind !== 'mark') ok(!whole(r.hint, String(r.answer)), 'hint contains the answer', r);

      if (r.kind === 'mark') {
        ok(r.tier === 1, 'marks are tier 1', r);
        ok(r.prompt === 'Which mark ends this sentence?' && r.visual && r.visual.kind === 'sentence', 'mark prompt and sentence card', r);
        const t = r.visual && r.visual.text;
        ok(TABLE[t] !== undefined, 'the sentence is in the truth table', r);
        ok(markOf(r.answer) === TABLE[t], `answer matches the table mark ${TABLE[t]} for "${t}"`, r);
        ok(JSON.stringify([...r.choices].sort()) === JSON.stringify(Object.values(MARK_LABELS).sort()), 'the three choices are period / question mark / exclamation mark', r);
        ok(r.say.includes(t), 'the spoken prompt reads the sentence', r);
        ok(r.choiceSay && r.choices.every((c) => r.choiceSay[c] && /^[a-z ]+$/.test(r.choiceSay[c])), 'every mark choice has plain spoken words', r);
        ok(r.answerSay === r.choiceSay[r.answer], 'spoken answer is the mark name', r);
        spoken('answerSay', r.answerSay, r);
        for (const c of r.choices) spoken('choice said', r.choiceSay[c], r);
      } else if (r.kind === 'word') {
        ok(r.tier === 2, 'words are tier 2', r);
        ok(r.prompt === 'Which word needs a capital letter?' && r.visual && r.visual.kind === 'sentence', 'word prompt and sentence card', r);
        const t = r.visual.text, ws = words(t);
        ok(baseOf(t) !== undefined, 'the sentence is a table sentence (only its capitals changed)', r);
        // exactly one word still needs a capital
        const need = ws.map((w, i) => i).filter((i) => mustCap(ws[i], i) && !capOf(ws[i]));
        ok(need.length === 1, 'exactly one word needs a capital letter (' + need.length + ')', r);
        ok(need.length === 1 && bareWord(ws[need[0]]) === r.answer, 'the answer is that word', r);
        // everything else is already right (no other lowercase-that-should-be-capital, no stray capitals)
        ws.forEach((w, i) => { if (!mustCap(w, i)) ok(!capOf(w), 'no stray capital: ' + w, r); });
        ok(ws.slice(0, 1).every((w) => !capOf(w)) || need[0] !== 0, 'when the first word is shown with a capital, it is not the answer', r);
        // choices are real words of the sentence, and the wrong ones do not need a capital
        const bare = ws.map(bareWord);
        ok(r.choices.every((c) => bare.includes(c)), 'every choice is a word of the sentence', r);
        r.choices.filter((c) => c !== r.answer).forEach((c) => { const i = bare.indexOf(c); ok(i >= 0 && !mustCap(ws[i], i) && !capOf(ws[i]) && c.length > 1, 'wrong choice needs no capital: ' + c, r); });
        ok(!whole(r.hint, r.answer), 'hint does not contain the answer word', r);
        ok(r.say.includes(t), 'the spoken prompt reads the sentence', r);
        // sentences end the right way already
        ok(t.endsWith(TABLE[baseOf(t)]), 'the end mark is already right', r);
      } else if (r.kind === 'sentence') {
        ok(r.tier === 3, 'sentences are tier 3', r);
        ok(r.prompt === 'Which sentence is written the right way?' && !r.visual, 'sentence prompt', r);
        ok(r.noChoiceSay === true, 'sentence choices are read, not spoken as punctuation', r);
        const bases = new Set(r.choices.map(baseOf));
        ok(!bases.has(undefined) && bases.size === 1, 'the three versions are one sentence', r);
        const right = r.choices.filter((c) => written(c) === true);
        ok(right.length === 1 && right[0] === r.answer, 'exactly one version is written the right way and it is the answer', r);
        const base = [...bases][0], mark = TABLE[base];
        // each wrong version has a clear fault: a missing capital (all marks right) or a wrong / missing mark (all capitals right)
        for (const c of r.choices.filter((x) => x !== r.answer)) {
          const lastCh = c.slice(-1), hasMark = /[.?!]/.test(lastCh);
          const capFault = c.slice(0, hasMark ? -1 : undefined) !== base.slice(0, -1);
          const markFault = (hasMark ? lastCh : '') !== mark;
          ok(capFault !== markFault, 'a wrong version has exactly one kind of fault', r);
          if (markFault) {
            ok(!hasMark || (lastCh !== '!' && mark !== '!') || (mark === '!' && lastCh !== '!'), 'wrong mark is never an arguable one (no ! on a telling sentence or a question)', r);
            if (hasMark && mark === '!') ok(lastCh === '?', 'excited sentences are shown with a clearly wrong mark', r);
          }
        }
        ok(r.answerSay && !/[.?!]/.test(r.answerSay) && /capital letter/.test(r.answerSay), 'spoken answer names the capital and the mark', r);
        spoken('answerSay', r.answerSay, r);
        ok(r.choices.every((c) => c.split(' ').length <= 6 && c.length <= 24), 'versions fit a button at 390px', r);
      } else ok(false, 'unknown kind ' + r.kind, r);

      if (r.tier === 1) ok(r.kind === 'mark', 'tier 1 only asks for the mark', r);
      if (r.tier === 2) ok(r.kind === 'word', 'tier 2 only asks for the word', r);
      if (r.tier === 3) ok(r.kind === 'sentence', 'tier 3 only asks for the sentence', r);
    }
  }
}
for (const k of ['T1:mark', 'T2:word', 'T3:sentence']) ok(kinds[k] > 1000, 'kind appears: ' + k);

// Variety: every mark, name, and kind of T2/T3 form really shows up.
{ const seen = { m: new Set(), name: new Set(), i: 0, firstOnly: 0, shownCap: 0, t3cap: 0, t3mark: 0, t3miss: 0 };
  for (let seed = 1; seed <= 3000; seed++) { let s = seed * 40503 >>> 0; const rng = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
    for (const tier of [1, 2, 3]) for (const r of buildRounds('anna', rng, { tier, review: [] })) {
      if (r.kind === 'mark') seen.m.add(markOf(r.answer));
      if (r.kind === 'word') { if (NAMES.includes(r.answer)) seen.name.add(r.answer); else if (r.answer === 'i') seen.i++; else seen.firstOnly++; if (/^[A-Z]/.test(r.visual.text)) seen.shownCap++; }
      if (r.kind === 'sentence') for (const c of r.choices) if (c !== r.answer) { if (/[.?!]$/.test(c) && c.slice(-1) !== TABLE[baseOf(c)]) seen.t3mark++; else if (!/[.?!]$/.test(c)) seen.t3miss++; else seen.t3cap++; }
    } }
  ok(seen.m.size === 3, 'all three marks are asked'); ok(seen.name.size === 5, 'all five names are asked: ' + [...seen.name]); ok(seen.i > 20, 'the word I is asked');
  ok(seen.firstOnly > 100 && seen.shownCap > 20, 'first-word rounds and shown-capital rounds appear'); ok(seen.t3cap > 100 && seen.t3mark > 100 && seen.t3miss > 100, 'tier 3 shows capital faults, wrong marks and missing marks'); }

// Fallback quest rounds follow the same rules.
{ const f = QUESTS.anna.rounds;
  ok(f.length === 5, 'five fallback rounds');
  for (const r of f) {
    ok(r.choices.length === 3 && new Set(r.choices).size === 3 && r.choices.includes(r.answer), 'fallback round shape', r);
    spoken('fallback prompt', r.say || r.prompt, r); spoken('fallback hint', r.hint, r); spoken('fallback reveal', revealLines(r).say, r);
    ok(!whole(r.hint, r.answer), 'fallback hint does not give the answer', r);
    if (r.visual) ok(TABLE[r.visual.text] !== undefined || baseOf(r.visual.text) !== undefined, 'fallback sentence is a table sentence', r);
    if (r.choiceSay) for (const c of r.choices) spoken('fallback choice said', r.choiceSay[c], r);
  }
  ok(markOf(f[0].answer) === TABLE[f[0].visual.text] && markOf(f[1].answer) === TABLE[f[1].visual.text], 'fallback marks are true');
  ok(f.slice(2, 4).every((r) => { const ws = words(r.visual.text); const i = ws.findIndex((w, k) => mustCap(w, k) && !capOf(w)); return bareWord(ws[i]) === r.answer; }), 'fallback capital answers are true');
  ok(f[4].choices.filter((c) => written(c) === true).length === 1 && written(f[4].answer) === true, 'fallback sentence round has one right version'); }

// Wiring and story lines
ok(NPC_ORDER.indexOf('anna') === NPC_ORDER.indexOf('jasmine') + 1, 'anna follows jasmine in NPC_ORDER');
ok(NO_CLIP_IDS.includes('anna'), 'anna uses the speech voice (no clips)');
ok(PRINCESSES.anna.landName === 'Sunny Fjord Harbor' && QUESTS.anna.title === 'The Harbor Signs' && QUESTS.anna.questName === 'The Harbor Signs', 'land name and title');
ok(/Anna/.test(PARENT_CORNER_HTML) && /L\.1\.2/.test(PARENT_CORNER_HTML) && /Harbor Signs/.test(PARENT_CORNER_HTML), 'Parent Corner row with the standard');
ok(BUILT_SLOTS.ese === 'anna' && builtSlotIds().includes('ese') && isHarborOpen() && isHarborOpen('?preview=harbor'), 'ese is built for Anna; ?preview=harbor is harmless');
ok(openLandIds().includes('harbor') && openLandIds().length === 5, 'the harbor is open (since K11; the bayou joined in K13)');
const lines = [...QUESTS.anna.intro, ...QUESTS.anna.complete, QUESTS.anna.title, QUESTS.anna.questName];
for (const l of lines) spoken('story line', l, null);
ok(QUESTS.anna.intro.length >= 2 && QUESTS.anna.complete.length >= 1, 'story lines exist');
for (const l of lines) ok(l.split(/\s+/).length <= 18, 'line too long for a 6-year-old: ' + l, null);

// Original content: none of the film's characters, places, songs or plot (and no sister-plot lines; Elsa is her own princess).
const FILM = /\b(arendelle|olaf|kristoff|sven|hans|snowman|let it go|build a snowman|open (the )?door|first time in forever|sister|sisters|locked|frozen|frozen heart|ice palace|reindeer|troll|trolls|do you want)\b/i;
const allRounds = Object.values(samples).flatMap((m) => [...m.values()]);
const annaText = JSON.stringify([QUESTS.anna, SIGN_SENTENCES, PARENT_CORNER_HTML.slice(PARENT_CORNER_HTML.indexOf('Anna') - 200, PARENT_CORNER_HTML.indexOf('Starlight Finale')), allRounds.map((r) => [r.prompt, r.say, r.hint, r.choices])]);
for (const l of lines) ok(!FILM.test(l), 'film word in Anna line: ' + l, null);
ok(!FILM.test(annaText), 'film word in Anna text: ' + (annaText.match(FILM) || [])[0], null);

// Opening the harbor: new-kingdom card, saves, finale.
ok(JSON.stringify(unseenKingdomSlots(builtSlotIds(), ['sse', 'ssw', 'nne']).sort()) === '["ese","wsw"]', 'a save that saw cove, isle and garden gets a card for the harbor (and the bayou, K13)');
ok(unseenKingdomSlots(builtSlotIds(), ['sse', 'ssw', 'nne', 'ese', 'wsw']).length === 0, 'once seen, no card again');
{ const m = merge({ done: ['belle', 'elsa', 'rapunzel', 'cinderella', 'ariel', 'moana', 'jasmine'], seenNewKingdoms: true, seenKingdoms: ['sse', 'ssw', 'nne'], shards: { jasmine: 5 } });
  ok(m.shards.anna === 0 && !m.done.includes('anna') && m.done.length === 7 && m.shards.jasmine === 5 && m.seenKingdoms.length === 3, 'existing saves keep progress; Anna starts fresh'); }
ok(!shouldRunFinale(NPC_ORDER, NPC_ORDER, builtSlotIds().length) && shouldRunFinale(NPC_ORDER, NPC_ORDER, NEW_LAND_SLOTS.length), 'finishing Anna never runs the crown finale (one kingdom still closed)');
{ const main = readFileSync(new URL('../js/main.js', import.meta.url), 'utf8'), ui = readFileSync(new URL('../js/ui.js', import.meta.url), 'utf8');
  ok(/anna: 'harbor'/.test(main) && /sentenceCardHtml\(round\.visual\)/.test(main) && /npcId === 'anna'( \|\| npcId === 'tiana')?\) && !round\.noChoiceSay/.test(main) && /round\.choiceSay/.test(main), 'main wires the land, the sign card and read-aloud mark names');
  ok(/Harbor/.test(ui) && /⚓/.test(ui), 'the new-kingdom card has a harbor emoji'); }

console.log(`anna_check: ${n} rounds`, JSON.stringify(kinds), 'problems', bad.size);
for (const k of [...bad.keys()].slice(0, 25)) console.log(' ', k);
if (bad.size) process.exit(1);
if (process.argv.includes('--samples')) for (const [t, m] of Object.entries(samples)) for (const r of m.values()) console.log(t, r.kind, '|', r.prompt, '|', r.visual ? r.visual.text : '', '|', r.choices.join(' / '), '| answer:', r.answer, '| hint:', r.hint);
