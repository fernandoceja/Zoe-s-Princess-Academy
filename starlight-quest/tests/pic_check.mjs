// Every Rapunzel/Belle/Ariel/Moana/Jasmine/Anna round: a pic must not match any choice, nor (Belle) the target word.
import { QUESTS, buildRounds } from '../js/quests.js';
const strip = (t) => String(t).replace(/[\p{Extended_Pictographic}️‍]/gu, '').trim();
const WORD = { '🐱': 'cat', '🐷': 'pig', '🐸': 'frog', '🐟': 'fish', '🚢': 'ship', '🦆': 'duck', '🦀': 'crab', '🎩': 'hat', '🌿': 'leaf', '🪴': 'plant', '💡': 'light', '🦇': 'bat', '🐀': 'rat', '🚐': 'van', '☀️': 'sun', '🐛': 'bug', '🐔': 'hen', '🖊️': 'pen', '✈️': 'jet', '🐶': 'dog', '🪵': 'log', '🗺️': 'map', '🧢': 'cap', '📌': 'pin', '🗑️': 'bin', '🔟': 'ten', '⚽': 'ball', '🎲': 'dice', '🥫': 'can', '🥁': 'drum' };
let n = 0, pics = 0; const bad = [];
function check(npc, r) {
  n++;
  // Jasmine's story cards (K9): every card is one real picture (no stray text) with a plain-word caption, and no picture is typed into a choice.
  if (r.visual && r.visual.kind === 'story') {
    const cards = r.visual.cards || [];
    if (cards.length !== (r.visual.more ? 2 : 3)) bad.push([npc, r.prompt, 'story card count', cards.length]);
    for (const c of cards) {
      if (!/^[\p{Extended_Pictographic}\uFE0F\u200D]+$/u.test(c.e || '') || !/\p{Extended_Pictographic}/u.test(c.e || '')) bad.push([npc, r.prompt, 'card is not a picture', c.e]);
      if (!c.t || strip(c.t) !== c.t) bad.push([npc, r.prompt, 'card caption has a picture or is empty', c.t]);
    }
    for (const ch of r.choices) if (strip(ch) !== ch) bad.push([npc, r.prompt, 'story choice has a picture', ch]);
  }
  // Anna's sign (K11): a sentence card has plain text only (no picture), and no choice carries a picture.
  if (r.visual && r.visual.kind === 'sentence') {
    if (!r.visual.text || strip(r.visual.text) !== r.visual.text) bad.push([npc, r.prompt, 'sentence has a picture or is empty', r.visual.text]);
    for (const ch of r.choices) if (strip(ch) !== ch) bad.push([npc, r.prompt, 'sentence choice has a picture', ch]);
  }
  if (!r.pic) return;
  pics++;
  for (const c of r.choices) {
    if (c.includes(r.pic) || (strip(c) && WORD[r.pic] && strip(c).toLowerCase().split(/\s+/).includes(WORD[r.pic]))) bad.push([npc, r.prompt, r.pic, c]);
  }
  if (npc === 'belle') {
    const w = WORD[r.pic];
    if (!w || r.prompt.toLowerCase().includes(w) || String(r.answer).toLowerCase() === w) bad.push([npc, r.prompt, r.pic, 'word']);
  }
}
for (const npc of ['rapunzel', 'belle', 'ariel', 'moana', 'jasmine', 'anna']) {
  for (const r of QUESTS[npc].rounds) check(npc, r);
  for (let tier = 1; tier <= 3; tier++) {
    for (let seed = 1; seed <= 3000; seed++) {
      let s = seed * 2654435761 >>> 0;
      const rng = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
      for (const r of buildRounds(npc, rng, { tier, review: [] })) check(npc, r);
    }
  }
}
console.log(`checked ${n} rounds (${pics} with a pic), violations ${bad.length}`);
if (bad.length) { console.log(bad.slice(0, 10)); process.exit(1); }
