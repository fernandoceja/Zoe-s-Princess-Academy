// Ariel's quests (K5): rhyming and word families. Every round is checked 3000 times per tier.
import { buildRounds, QUESTS, PRINCESSES, NPC_ORDER, NO_CLIP_IDS, RHYME_FAMILIES, rimeOf, revealLines } from '../js/quests.js';

const bad = new Map();
const fail = (why, r) => bad.set(`${why} | ${r ? r.prompt + ' => ' + r.answer + ' [' + (r.choices || []).join(',') + ']' : ''}`, 1);
const ok = (c, why, r) => { if (!c) fail(why, r); };

// Allowlist: every word comes from the real, kid-safe CVC families (no other source of words).
const ALLOW = new Set(Object.values(RHYME_FAMILIES).flat());
ok(ALLOW.size >= 60, 'allowlist is big enough');
for (const w of ALLOW) ok(/^[bcdfghjklmnpqrstvwxyz][aeiou][bcdfghjklmnpqrstvwxyz]$/.test(w), 'allowlist word is CVC: ' + w);
const NOT_KID = ['gun', 'sin', 'fat', 'hit', 'nun', 'cop', 'rot', 'ban', 'din', 'bog', 'jig', 'vat', 'pit', 'lit', 'wit', 'git'];
for (const w of NOT_KID) ok(!ALLOW.has(w), 'word not for kids is in the allowlist: ' + w);
for (const [fam, ws] of Object.entries(RHYME_FAMILIES)) for (const w of ws) ok(rimeOf(w) === fam, `family ${fam} holds ${w}`);

// Same spoken-text rules as voice_check.
const E = /[\p{Extended_Pictographic}️‍⃣]/u;
const spoken = (where, t, r) => { t = String(t ?? '');
  ok(t.trim() && !E.test(t) && !/ \.|\s[.?!,]/.test(t) && !/\bis\s*[.?!]/.test(t), 'spoken text not clean: ' + where + ' "' + t + '"', r); };
const wordIn = (text, w) => new RegExp(`(^|[^a-z])${w}([^a-z]|$)`, 'i').test(text);

// Words from a pair label ("cat and hat").
const pairWords = (p) => p.split(' and ');

let n = 0; const kinds = {}; const T0 = (r) => r.tier;
for (let tier = 1; tier <= 3; tier++) {
  for (let seed = 1; seed <= 3000; seed++) {
    let s = seed * 2654435761 >>> 0;
    const rng = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
    for (const r of buildRounds('ariel', rng, { tier, review: [] })) {
      n++; kinds[`T${T0(r)}:${r.kind}`] = (kinds[`T${T0(r)}:${r.kind}`] || 0) + 1;
      // Shape
      ok(Array.isArray(r.choices) && r.choices.length === 3 && new Set(r.choices).size === 3, 'needs 3 unique choices', r);
      ok(r.choices.includes(r.answer), 'answer in choices', r);
      ok(typeof r.prompt === 'string' && r.prompt && typeof r.hint === 'string' && r.hint, 'prompt and hint', r);
      const T = r.tier; // round 1 of a quest comes from one tier below
      ok(T === tier || T === Math.max(1, tier - 1), 'tagged with this or the tier below', r);
      // Spoken text
      spoken('prompt/say', r.say || r.prompt, r); spoken('hint', r.hint, r); if (r.hintSay) spoken('hintSay', r.hintSay, r);
      spoken('reveal', revealLines(r).say, r); if (r.answerSay) spoken('answerSay', r.answerSay, r);
      if (r.replay) spoken('replay', r.replay, r);
      if (!r.noChoiceSay) for (const c of r.choices) spoken('choice', c, r);
      // Pictures: never a choice, always a real clear picture of an allowed word
      if (r.pic) ok(!r.choices.some((c) => c.includes(r.pic)), 'pic shown inside a choice', r);

      if (r.kind === 'rhyme') {
        ok(T <= 2, 'rhyme pick only in tiers 1-2', r);
        ok(ALLOW.has(r.target) && r.choices.every((c) => ALLOW.has(c)), 'word not in allowlist', r);
        ok(r.prompt === `Which word rhymes with ${r.target}?` && r.show === r.target, 'prompt names the target', r);
        ok(rimeOf(r.answer) === rimeOf(r.target) && r.answer !== r.target, 'answer must rhyme with the target', r);
        for (const c of r.choices) if (c !== r.answer) ok(rimeOf(c) !== rimeOf(r.target), 'distractor rhymes with the target', r);
        if (T === 1) for (const c of r.choices) if (c !== r.answer) ok(c[1] !== r.target[1], 'tier 1 distractors use another vowel', r);
        ok(!wordIn(r.hint, r.answer), 'hint contains the answer', r);
      } else if (r.kind === 'pair') {
        ok(T === 1, 'pairs are tier 1', r);
        for (const c of r.choices) ok(/^[a-z]{3} and [a-z]{3}$/.test(c) && pairWords(c).every((w) => ALLOW.has(w)), 'pair label / allowlist', r);
        const rh = (c) => rimeOf(pairWords(c)[0]) === rimeOf(pairWords(c)[1]) && pairWords(c)[0] !== pairWords(c)[1];
        ok(rh(r.answer), 'answer pair must rhyme', r);
        for (const c of r.choices) if (c !== r.answer) ok(!rh(c), 'a wrong pair rhymes', r);
        ok(r.choices.filter(rh).length === 1, 'exactly one rhyming pair', r);
        for (const w of pairWords(r.answer)) ok(!wordIn(r.hint, w), 'hint contains an answer word', r);
      } else if (r.kind === 'odd') {
        ok(T === 2, 'odd-one-out is tier 2', r);
        ok(r.prompt === `Which word does not rhyme with ${r.target}?` && ALLOW.has(r.target) && r.choices.every((c) => ALLOW.has(c)), 'odd prompt / allowlist', r);
        ok(rimeOf(r.answer) !== rimeOf(r.target), 'odd answer must not rhyme', r);
        for (const c of r.choices) if (c !== r.answer) ok(rimeOf(c) === rimeOf(r.target) && c !== r.target, 'other choices must rhyme with the target', r);
        ok(!wordIn(r.hint, r.answer), 'hint contains the answer', r);
      } else if (r.kind === 'family') {
        ok(T === 3, 'family builder is tier 3', r);
        const full = r.answer + r.family;
        ok(ALLOW.has(full) && RHYME_FAMILIES[r.family].includes(full) && full === r.word, 'answer must build a real word in the family', r);
        ok(r.choices.every((c) => /^[b-z]$/.test(c) && !'aeiou'.includes(c)), 'choices are single consonant letters', r);
        for (const c of r.choices) if (c !== r.answer) ok(!ALLOW.has(c + r.family), 'a wrong letter makes a real word', r);
        ok(r.show === `_ ${[...r.family].join(' ')}`, 'shows the family ending', r);
        for (const t of [r.prompt, r.say, r.hint]) ok(!wordIn(t, r.word), 'shown/asked text contains the answer word', r);
        ok(!r.say.includes('_') && r.say.includes(r.family), 'spoken prompt names the ending, no blank mark', r);
        ok(r.hintSay.includes(r.word), 'spoken hint may say the word', r);
      } else ok(false, 'unknown round kind ' + r.kind, r);
    }
  }
}
// Static fallback quest rounds follow the same shape.
for (const r of QUESTS.ariel.rounds) {
  ok(r.choices.length === 3 && new Set(r.choices).size === 3 && r.choices.includes(r.answer), 'fallback round shape', r);
  spoken('fallback prompt', r.prompt, r); spoken('fallback hint', r.hint, r);
  ok(!wordIn(r.hint, r.answer), 'fallback hint contains the answer', r);
}
ok(QUESTS.ariel.rounds.length === 5, 'five fallback rounds');

// Wiring and story lines
ok(NPC_ORDER.includes('ariel') && NPC_ORDER[NPC_ORDER.length - 1] === 'ariel', 'ariel is last in NPC_ORDER');
ok(NO_CLIP_IDS.includes('ariel'), 'ariel uses the speech voice (no clips)');
ok(PRINCESSES.ariel.landName === 'Seashell Cove', 'land name');
const lines = [...QUESTS.ariel.intro, ...QUESTS.ariel.complete, QUESTS.ariel.title, QUESTS.ariel.questName];
for (const l of lines) spoken('story line', l, null);
ok(QUESTS.ariel.intro.length >= 2 && QUESTS.ariel.complete.length >= 1, 'story lines exist');
// Original story: none of the film's words, songs or plot.
const MOVIE = /\b(mermaid|merman|triton|ursula|sebastian|flounder|eric|prince|king|trident|fork|dinglehopper|thingamajig|gadget|voice|legs|sea witch|witch|under the sea|part of your world|kiss the girl|poor unfortunate|human|world|shipwreck|crab|fish|flipper|scuttle|seagull|eel|flotsam|jetsam|ocean|dad|father|sisters)\b/i;
for (const l of lines) ok(!MOVIE.test(l), 'movie-related word in Ariel line: ' + l, null);
for (const l of lines) ok(l.split(/\s+/).length <= 18, 'line too long for a 6-year-old: ' + l, null);

console.log(`ariel_check: ${n} rounds`, JSON.stringify(kinds), 'problems', bad.size);
for (const k of [...bad.keys()].slice(0, 25)) console.log(' ', k);
if (bad.size) process.exit(1);
