// Rapunzel sorting bins (living vs not living): item counts per tier, both kinds, no repeats, plain JSON, distinct keys.
import { buildRounds, roundKey } from '../js/quests.js';
const bad = []; let n = 0, sorts = 0;
for (let tier = 1; tier <= 3; tier++) {
  for (let seed = 1; seed <= 3000; seed++) {
    let s = seed * 2654435761 >>> 0;
    const rng = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
    for (const r of buildRounds('rapunzel', rng, { tier, review: [] })) {
      n++;
      if (!r.sort) continue;
      sorts++;
      const items = r.sort.items, t = r.tier;
      if (!Array.isArray(items) || items.length !== t + 2) bad.push(['count', t, items && items.length]);
      if (!items.some((i) => i.living) || !items.some((i) => !i.living)) bad.push(['kinds', items]);
      if (new Set(items.map((i) => i.name)).size !== items.length) bad.push(['repeat', items]);
      if (items.some((i) => !i.pic || !i.name || typeof i.living !== 'boolean')) bad.push(['fields', items]);
      if (JSON.stringify(JSON.parse(JSON.stringify(r.sort))) !== JSON.stringify(r.sort)) bad.push(['json', r.sort]);
      if (!r.choices.includes(r.answer) || !r.hint.startsWith('Good try!') || r.key !== roundKey(r)) bad.push(['round', r.prompt]);
    }
  }
}
const mk = (names) => ({ prompt: 'Is it living or not living?', answer: '🌱 Living', sort: { items: names.map((name) => ({ pic: 'x', name, living: true })) } });
if (roundKey(mk(['dog', 'rock'])) === roundKey(mk(['cat', 'shoe']))) bad.push(['key', 'sort sets share a roundKey']);
const pct = (100 * sorts) / n;
console.log(`checked ${n} rapunzel rounds, ${sorts} sorting (${pct.toFixed(1)}%), violations ${bad.length}`);
if (sorts === 0 || pct < 8 || pct > 30) bad.push(['share', pct]);
if (bad.length) { console.log(bad.slice(0, 10)); process.exit(1); }
