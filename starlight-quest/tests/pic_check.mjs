// Every Rapunzel/Belle round: a pic must not match any choice, nor (Belle) the target word.
import { QUESTS, buildRounds } from '../js/quests.js';
const strip = (t) => String(t).replace(/[\p{Extended_Pictographic}️‍]/gu, '').trim();
const WORD = { '🐱': 'cat', '🐷': 'pig', '🐸': 'frog', '🐟': 'fish', '🚢': 'ship', '🦆': 'duck', '🦀': 'crab', '🎩': 'hat', '🌿': 'leaf', '🪴': 'plant', '💡': 'light' };
let n = 0, pics = 0; const bad = [];
function check(npc, r) {
  n++;
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
for (const npc of ['rapunzel', 'belle']) {
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
