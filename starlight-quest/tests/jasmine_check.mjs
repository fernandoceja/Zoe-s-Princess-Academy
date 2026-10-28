// Jasmine's quests (K9): story order. Every round is checked thousands of times per tier against a table of true sequences
// written HERE, independent of the game code (the game's own STORY_SEQUENCES is also compared to it).
import { readFileSync } from 'node:fs';
import { buildRounds, QUESTS, PRINCESSES, NPC_ORDER, NO_CLIP_IDS, STORY_SEQUENCES, revealLines, PARENT_CORNER_HTML } from '../js/quests.js';
import { BUILT_SLOTS, builtSlotIds, unseenKingdomSlots, shouldRunFinale, NEW_LAND_SLOTS } from '../js/worldmap.js';
import { merge } from '../js/save.js';

const bad = new Map();
const fail = (why, r) => bad.set(`${why} | ${r ? r.prompt + ' => ' + r.answer + ' [' + (r.choices || []).join(',') + ']' : ''}`, 1);
const ok = (c, why, r) => { if (!c) fail(why, r); };

// ---- Truth table: [picture, label] in the order things really happen (written by hand) ----
const TRUTH = [
  [['🌱', 'tiny sprout'], ['🌿', 'bigger plant'], ['🌻', 'tall flower']],
  [['🥚', 'egg'], ['🐥', 'baby chick'], ['🐔', 'big hen']],
  [['🥚', 'tiny egg'], ['🐛', 'caterpillar'], ['🦋', 'butterfly']],
  [['❄️', 'snow falls'], ['⚪', 'roll a snowball'], ['⛄', 'make a snowman']],
  [['☁️', 'clouds come'], ['🌧️', 'it rains'], ['🌈', 'a rainbow']],
  [['🌅', 'sun comes up'], ['☀️', 'sun is high'], ['🌙', 'moon comes out']],
  [['👶', 'baby'], ['🧒', 'kid'], ['🧑', 'grown-up']],
  [['🌰', 'acorn'], ['🌱', 'little sprout'], ['🌳', 'big tree']],
  [['⛏️', 'dig a hole'], ['🌱', 'plant the seed'], ['💧', 'water the seed']],
  [['⏰', 'wake up'], ['🥣', 'eat breakfast'], ['🚌', 'go to school']],
  [['🥣', 'mix the batter'], ['🔥', 'bake the cake'], ['🍰', 'eat the cake']],
  [['🍽️', 'dirty dish'], ['🧽', 'scrub the dish'], ['✨', 'clean dish']],
  [['🍞', 'get the bread'], ['🧀', 'add the cheese'], ['🥪', 'eat the sandwich']],
  [['🧦', 'put on socks'], ['👟', 'put on shoes'], ['🏃', 'run and play']],
  [['🎨', 'get the paints'], ['🖌️', 'paint a picture'], ['🖼️', 'hang it up']],
  [['✏️', 'write a note'], ['✉️', 'mail the note'], ['📬', 'friend gets it']],
  [['🌙', 'night comes'], ['🛏️', 'get in bed'], ['😴', 'fall asleep']],
  [['🧳', 'pack a bag'], ['🚗', 'ride in the car'], ['🏖️', 'play at the beach']],
  [['🛒', 'shop for food'], ['🍳', 'cook the food'], ['🍽️', 'eat dinner']],
  [['🏫', 'sit in class'], ['📚', 'learn and read'], ['🏠', 'go home']],
  [['🎁', 'a wrapped gift'], ['🎀', 'pull the ribbon'], ['🧸', 'play with the toy']],
].map((st) => st.map(([e, t]) => ({ e, t })));
// Which sequence a set of labels belongs to (labels are unique across the table, so one sequence only).
const LABEL_SEQ = new Map();
TRUTH.forEach((st, i) => st.forEach((s, k) => { ok(!LABEL_SEQ.has(s.t), 'label reused in the table: ' + s.t); LABEL_SEQ.set(s.t, [i, k]); }));
const labelsOf = (i) => TRUTH[i].map((s) => s.t);
// Short words used in the order choices (hand-written; the game's own `k` must match).
const KEYS = [['sprout', 'plant', 'flower'], ['egg', 'chick', 'hen'], ['egg', 'caterpillar', 'butterfly'], ['snow', 'snowball', 'snowman'], ['clouds', 'rain', 'rainbow'],
  ['sunrise', 'high sun', 'moon'], ['baby', 'kid', 'grown-up'], ['acorn', 'sprout', 'tree'], ['dig', 'plant', 'water'], ['wake up', 'breakfast', 'school'],
  ['mix', 'bake', 'eat'], ['dirty', 'scrub', 'clean'], ['bread', 'cheese', 'sandwich'], ['socks', 'shoes', 'play'], ['get paints', 'paint', 'hang up'],
  ['write', 'mail', 'read'], ['night', 'bed', 'sleep'], ['pack', 'car', 'beach'], ['shop', 'cook', 'eat'], ['class', 'read', 'home'], ['gift', 'ribbon', 'toy']];
// Sentences of a spoken story: each sentence says its own step's key words, in true order.
const SENT_KEY = [
  ['sprout', 'bigger plant', 'tall flower'], ['egg', 'baby chick', 'big hen'], ['tiny egg', 'caterpillar', 'butterfly'], ['snow fell', 'snowball', 'snowman'],
  ['clouds', 'rained', 'rainbow'], ['came up', 'was high', 'moon'], ['baby', 'kid', 'grown-up'], ['acorn', 'sprout', 'big tree'], ['dug a hole', 'planted', 'watered'],
  ['woke up', 'ate breakfast', 'went to school'], ['mixed', 'baked', 'ate the cake'], ['dirty', 'scrubbed', 'clean'], ['got the bread', 'added the cheese', 'ate the sandwich'],
  ['socks', 'shoes', 'ran and played'], ['got the paints', 'painted', 'hung it up'], ['wrote', 'mailed', 'got it'], ['night came', 'got in bed', 'fell asleep'],
  ['packed', 'rode in the car', 'played at the beach'], ['shopped', 'cooked', 'ate dinner'], ['sat in class', 'learned', 'went home'], ['wrapped gift', 'pulled the ribbon', 'played with the toy'],
];
// Worlds: "next" wrong choices must come from the other world, and never from a sequence that could fit.
const NATURE = new Set([0, 1, 2, 3, 4, 5, 6, 7, 8]);

// The game's own table must match ours.
ok(STORY_SEQUENCES.length === TRUTH.length && STORY_SEQUENCES.length >= 20, 'about twenty sequences (' + STORY_SEQUENCES.length + ')');
STORY_SEQUENCES.forEach((q, i) => {
  ok(JSON.stringify(q.steps.map(({ e, t }) => ({ e, t }))) === JSON.stringify(TRUTH[i]), 'game sequence ' + q.id + ' matches the truth table');
  ok(q.sent.length === 3, 'three sentences for ' + q.id);
  q.sent.forEach((x, k) => ok(x.toLowerCase().includes(SENT_KEY[i][k]), `sentence ${k + 1} of ${q.id} says "${SENT_KEY[i][k]}": ${x}`));
  ok((q.world === 'nature') === NATURE.has(i), 'world of ' + q.id);
  ok(new Set(q.steps.map((s) => s.e)).size === 3 && new Set(q.steps.map((s) => s.t)).size === 3, 'unique pictures and labels in ' + q.id);
  for (const s of q.steps) ok(s.t.split(/\s+/).length <= 4 && s.t.length <= 18, 'label short enough for a card: ' + s.t);
});

const E = /[\p{Extended_Pictographic}️‍⃣]/u;
const spoken = (where, t, r) => { t = String(t ?? '');
  ok(t.trim() && !E.test(t) && !/ \.|\s[.?!,]/.test(t) && !/\bis\s*[.?!]/.test(t), 'spoken text not clean: ' + where + ' "' + t + '"', r); };
const whole = (text, w) => new RegExp(`(^|[^a-z])${w.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z]|$)`).test(text.toLowerCase());

const orderOf = (txt) => { const m = txt.match(/^first (.+), then (.+), last (.+)$/); return m ? [m[1], m[2], m[3]] : null; };
STORY_SEQUENCES.forEach((q, i) => q.steps.forEach((s, k) => ok(s.k === KEYS[i][k], `short word of ${q.id} step ${k + 1}`)));

let n = 0; const kinds = {}; const samples = {};
for (let tier = 1; tier <= 3; tier++) {
  for (let seed = 1; seed <= 3000; seed++) {
    let s = seed * 2654435761 >>> 0;
    const rng = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
    for (const r of buildRounds('jasmine', rng, { tier, review: [] })) {
      n++; kinds[`T${r.tier}:${r.kind}`] = (kinds[`T${r.tier}:${r.kind}`] || 0) + 1;
      (samples[`T${r.tier}`] ||= new Map()).set(r.kind, r);
      ok(Array.isArray(r.choices) && r.choices.length === 3 && new Set(r.choices).size === 3, 'needs 3 unique choices', r);
      ok(r.choices.includes(r.answer), 'answer in choices', r);
      ok(typeof r.prompt === 'string' && r.prompt && typeof r.hint === 'string' && r.hint, 'prompt and hint', r);
      ok(r.tier === tier || r.tier === Math.max(1, tier - 1), 'tagged with this or the tier below', r);
      spoken('prompt', r.say || r.prompt, r); spoken('hint', r.hint, r); spoken('reveal', revealLines(r).say, r);
      for (const c of r.choices) spoken('choice', c, r);
      ok(r.choices.every((c) => c.length <= 44), 'choice short enough for a 390px button: ' + r.choices.join('|'), r);

      // Find the story the round is about (from the truth table only).
      let seq = null, want = null, m;
      const stepLabels = (r.kind === 'order' || r.kind === 'next') ? null : r.choices;
      if (r.kind === 'next') {
        const hit = LABEL_SEQ.get(r.answer);
        ok(!!hit && hit[1] === 2, 'next: the answer is the last step of a known story', r);
        if (hit) seq = hit[0];
      } else if (stepLabels) {
        const hits = stepLabels.map((l) => LABEL_SEQ.get(l));
        ok(hits.every(Boolean) && new Set(hits.map((h) => h[0])).size === 1, 'choices belong to one story', r);
        if (hits.every(Boolean)) seq = hits[0][0];
      }
      if (r.kind === 'order') { const o = orderOf(r.answer); seq = o ? KEYS.findIndex((k) => [...k].sort().join() === [...o].sort().join()) : -1; }
      ok(seq !== null && seq >= 0, 'story found', r);
      if (seq === null || seq < 0) continue;
      const T = labelsOf(seq), K = KEYS[seq];

      if (r.visual) {
        ok(r.visual.kind === 'story' && Array.isArray(r.visual.cards), 'story visual', r);
        const cards = r.visual.cards;
        // every card is the true picture + label of a step of THIS story
        ok(cards.every((c) => TRUTH[seq].some((t) => t.e === c.e && t.t === c.t)), 'cards are real steps of the story', r);
        if (r.kind === 'next') {
          ok(r.visual.more === true && JSON.stringify(cards) === JSON.stringify(TRUTH[seq].slice(0, 2)), 'next: first two steps shown in true order', r);
        } else {
          ok(!r.visual.more && cards.length === 3 && new Set(cards.map((c) => c.t)).size === 3, 'shuffled round shows all three cards once', r);
          ok(JSON.stringify(cards.map((c) => c.t)) !== JSON.stringify(T), 'shuffled cards are not already in order', r);
        }
      }

      if (r.kind === 'first') { ok(r.prompt === 'What comes first?' && r.visual, 'first prompt', r); want = T[0]; ok(JSON.stringify([...r.choices].sort()) === JSON.stringify([...T].sort()), 'first: the three steps are the choices', r); }
      else if (r.kind === 'last') { ok(r.prompt === 'What happens last?' && r.visual, 'last prompt', r); want = T[2]; ok(JSON.stringify([...r.choices].sort()) === JSON.stringify([...T].sort()), 'last: the three steps are the choices', r); }
      else if (r.kind === 'middle') { ok(r.prompt === 'What comes in the middle?' && r.visual, 'middle prompt', r); want = T[1]; ok(JSON.stringify([...r.choices].sort()) === JSON.stringify([...T].sort()), 'middle: the three steps are the choices', r); }
      else if (r.kind === 'next') {
        ok(r.prompt === 'What happens next?', 'next prompt', r); want = T[2];
        const wrong = r.choices.filter((c) => c !== r.answer);
        for (const w of wrong) {
          const h = LABEL_SEQ.get(w);
          ok(!!h && h[0] !== seq, 'next: wrong choices are from other stories', r);
          if (h) ok(NATURE.has(h[0]) !== NATURE.has(seq), 'next: wrong choices come from the other world (could not also fit)', r);
          if (h) ok(h[0] !== 5 && h[0] !== 16, 'next: day/night steps are never wrong choices', r);
        }
      } else if (r.kind === 'order') {
        ok(r.prompt === 'Which is the right order?' && r.visual, 'order prompt', r);
        want = `first ${K[0]}, then ${K[1]}, last ${K[2]}`;
        // exactly one choice is the true order; the others are the same three steps in a wrong order
        const parsed = r.choices.map(orderOf);
        ok(parsed.every(Boolean), 'order choices parse', r);
        if (parsed.every(Boolean)) {
          const right = parsed.filter((p) => JSON.stringify(p) === JSON.stringify(K));
          ok(right.length === 1, 'exactly one correct order', r);
          ok(parsed.every((p) => JSON.stringify([...p].sort()) === JSON.stringify([...K].sort())), 'order choices use the three steps only', r);
        }
      } else if (r.kind === 'tellfirst' || r.kind === 'telllast') {
        const last = r.kind === 'telllast';
        ok(!r.visual, 'tell rounds show no cards (listening)', r);
        ok((m = r.prompt.match(/^(.+) What happened (first|last)\?$/)) && m[2] === (last ? 'last' : 'first'), 'tell prompt ends with the question', r);
        want = T[last ? 2 : 0];
        // the three sentences in the prompt mention the steps in true order (so the story itself is true)
        const body = m ? m[1].toLowerCase() : '';
        const pos = SENT_KEY[seq].map((k) => body.indexOf(k));
        ok(pos.every((p) => p >= 0) && pos[0] < pos[1] && pos[1] < pos[2], 'story sentences tell the steps in true order', r);
        ok(m && m[1].split(/(?<=\.)\s+/).length === 3, 'story has three sentences', r);
        ok(JSON.stringify([...r.choices].sort()) === JSON.stringify([...T].sort()), 'tell: the three steps are the choices', r);
      } else ok(false, 'unknown kind ' + r.kind, r);
      ok(want !== null && r.answer === want, `answer should be ${want}`, r);

      // Hints never reveal the answer: no step label of the story (nor the whole answer) appears in the hint.
      for (const l of [...T, ...K]) ok(!whole(r.hint, l), 'hint contains a step: ' + l, r);
      ok(!r.hint.toLowerCase().includes(String(r.answer).toLowerCase()), 'hint contains the answer', r);
      // Tier fit
      if (r.tier === 1) ok(r.kind === 'first', 'tier 1 only asks what comes first', r);
      if (r.tier === 2) ok(['first', 'last', 'middle', 'next'].includes(r.kind), 'tier 2 is first/last/middle/next', r);
      if (r.tier === 3) ok(['first', 'last', 'middle', 'next', 'order', 'tellfirst', 'telllast'].includes(r.kind), 'tier 3 kinds', r);
    }
  }
}
// Each tier hits its own kinds, and the sequences all get used.
for (const k of ['T1:first', 'T2:last', 'T2:middle', 'T2:next', 'T3:order', 'T3:tellfirst', 'T3:telllast']) ok(kinds[k] > 100, 'kind appears: ' + k);

// Fallback quest rounds follow the same rules.
for (const r of QUESTS.jasmine.rounds) {
  ok(r.choices.length === 3 && new Set(r.choices).size === 3 && r.choices.includes(r.answer), 'fallback round shape', r);
  spoken('fallback prompt', r.prompt, r); spoken('fallback hint', r.hint, r);
  for (const c of r.choices) spoken('fallback choice', c, r);
}
ok(QUESTS.jasmine.rounds.length === 5, 'five fallback rounds');
{ const f = QUESTS.jasmine.rounds; // the fallbacks' truths
  ok(f[0].answer === 'wake up' && f[1].answer === 'big hen' && f[2].answer === 'put on shoes' && f[4].answer === 'roll a snowball', 'fallback answers are true');
  ok(orderOf(f[3].answer).join() === KEYS[4].join() && f[3].choices.filter((c) => orderOf(c).join() === KEYS[4].join()).length === 1, 'fallback order is true and unique');
  ok(f.every((r) => !(r.hint.toLowerCase().includes(r.answer.toLowerCase()))), 'fallback hints do not give the answer'); }

// Wiring and story lines
ok(NPC_ORDER.includes('jasmine') && NPC_ORDER[NPC_ORDER.length - 1] === 'jasmine' && NPC_ORDER.indexOf('jasmine') === NPC_ORDER.indexOf('moana') + 1, 'jasmine follows moana in NPC_ORDER');
ok(NO_CLIP_IDS.includes('jasmine'), 'jasmine uses the speech voice (no clips)');
ok(PRINCESSES.jasmine.landName === 'Moonlit Palace Garden' && QUESTS.jasmine.title === 'The Story Lanterns', 'land name and title');
ok(/Jasmine/.test(PARENT_CORNER_HTML) && /RL\.1\.2/.test(PARENT_CORNER_HTML), 'Parent Corner row with the standard');
ok(BUILT_SLOTS.nne === 'jasmine' && builtSlotIds().includes('nne'), 'nne is built for Jasmine');
const lines = [...QUESTS.jasmine.intro, ...QUESTS.jasmine.complete, QUESTS.jasmine.title, QUESTS.jasmine.questName];
for (const l of lines) spoken('story line', l, null);
ok(QUESTS.jasmine.intro.length >= 2 && QUESTS.jasmine.complete.length >= 1, 'story lines exist');
for (const l of lines) ok(l.split(/\s+/).length <= 18, 'line too long for a 6-year-old: ' + l, null);

// Original content: none of the film's characters, props, songs or plot.
const FILM = /\b(aladdin|genie|genies|lamp|lamps|wish|wishes|carpet|carpets|agrabah|jafar|abu|rajah|iago|sultan|whole new world|magic carpet|street ?rat|diamond in the rough|cave of wonders|scarab|palace escape|escape)\b/i;
const allRounds = [...samples ? Object.values(samples).flatMap((m) => [...m.values()]) : []];
const jasText = JSON.stringify([QUESTS.jasmine, STORY_SEQUENCES, PARENT_CORNER_HTML.slice(PARENT_CORNER_HTML.indexOf('Jasmine') - 200, PARENT_CORNER_HTML.indexOf('Starlight Finale')), allRounds.map((r) => [r.prompt, r.hint, r.choices])]);
for (const l of lines) ok(!FILM.test(l), 'film word in Jasmine line: ' + l, null);
ok(!FILM.test(jasText), 'film word in Jasmine text: ' + (jasText.match(FILM) || [])[0], null);
ok(!/whole new world/i.test(jasText) && !/\blamp\b/i.test(jasText), 'no film phrases');

// Opening the garden: new-kingdom card, saves, finale.
ok(JSON.stringify(unseenKingdomSlots(builtSlotIds(), ['sse', 'ssw'])) === '["nne"]', 'a save that saw cove and isle gets a card for the garden only');
ok(unseenKingdomSlots(builtSlotIds(), ['sse', 'ssw', 'nne']).length === 0, 'once seen, no card again');
{ const m = merge({ done: ['belle', 'elsa', 'rapunzel', 'cinderella', 'ariel', 'moana'], seenNewKingdoms: true, seenKingdoms: ['sse', 'ssw'], shards: { moana: 5 } });
  ok(m.shards.jasmine === 0 && !m.done.includes('jasmine') && m.done.length === 6 && m.shards.moana === 5, 'existing saves keep progress; Jasmine starts fresh'); }
ok(!shouldRunFinale(NPC_ORDER, NPC_ORDER, builtSlotIds().length) && shouldRunFinale(NPC_ORDER, NPC_ORDER, NEW_LAND_SLOTS.length), 'finishing Jasmine alone never runs the crown finale (three kingdoms still closed)');
{ const main = readFileSync(new URL('../js/main.js', import.meta.url), 'utf8');
  ok(/jasmine: 'garden'/.test(main) && /storyCardsHtml\(round\.visual\)/.test(main) && /npcId === 'jasmine'\) && !round\.noChoiceSay/.test(main), 'main wires the land, the story cards and read-aloud choices'); }

console.log(`jasmine_check: ${n} rounds`, JSON.stringify(kinds), 'problems', bad.size);
for (const k of [...bad.keys()].slice(0, 25)) console.log(' ', k);
if (bad.size) process.exit(1);
if (process.argv.includes('--samples')) for (const [t, m] of Object.entries(samples)) for (const r of m.values()) console.log(t, r.kind, '|', r.prompt, '|', r.choices.join(' / '), '| answer:', r.answer, '|', r.visual ? JSON.stringify(r.visual) : '', '| hint:', r.hint);
