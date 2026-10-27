const q = await import(process.argv[2] || new URL('../js/quests.js', import.meta.url).href);
const E = /[\p{Extended_Pictographic}\uFE0F\u200D\u20E3]/u;
const strip = (t) => t.replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, '').trim();
const bad = new Map(); let n = 0;
const chk = (where, t) => { n++; t = String(t ?? '');
  const why = !t.trim() ? 'empty' : E.test(t) ? 'emoji' : / \.|\s[.?!,]/.test(t) ? "' .'" : /\bis\s*[.?!]/.test(t) ? 'dangling' : null;
  if (why) bad.set(why + ' | ' + where + ' | ' + t, 1); };
for (const npc of q.NPC_ORDER) for (const T of [1,2,3]) for (let i = 0; i < 3000; i++)
  for (const r of q.buildRounds(npc, Math.random, { tier: T, review: [] })) {
    let v = r.say || r.prompt;
    if (npc === 'cinderella' || npc === 'rapunzel' || ((npc === 'ariel' || npc === 'moana' || npc === 'jasmine') && !r.noChoiceSay)) { const L = r.choices.map((c) => strip(String(c)));
      L.forEach((l) => { if (!l) chk(`${npc} T${T} choice`, l); });
      v += ' Is it ' + L.slice(0, -1).join(', ') + ', or ' + L[L.length - 1] + '?'; }
    chk(`${npc} T${T} open`, v); if (r.replay) chk(`${npc} T${T} replay`, r.replay);
    chk(`${npc} T${T} hint`, r.hint); if (r.hintSay) chk(`${npc} T${T} hintSay`, r.hintSay); chk(`${npc} T${T} reveal`, q.revealLines(r).say);
  }
console.log('spoken lines checked', n, 'problems', bad.size); for (const k of [...bad.keys()].slice(0, 25)) console.log(' ', k);
if (bad.size) process.exit(1);
