// Belle tap-to-blend: every CVC round carries its letter tiles, and every tile letter can be voiced.
import { buildRounds, BLEND_STOP, BLEND_WHOLE, BLEND_TTS, tileSound } from '../js/quests.js';
const bad = []; let cvc = 0;
for (const e of BLEND_WHOLE) if (e in BLEND_STOP) bad.push(['stop for whole-clip letter', e]);
for (const [l, t] of Object.entries(BLEND_STOP)) if (!(t > 0.3 && t < 2.0)) bad.push(['stop range', l, t]);
for (let tier = 1; tier <= 3; tier++) {
  for (let seed = 1; seed <= 2000; seed++) {
    let s = seed * 2654435761 >>> 0;
    const rng = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
    for (const r of buildRounds('belle', rng, { tier, review: [] })) {
      if (!/^Sound it out: /.test(r.prompt)) { if (r.tiles) bad.push(['tiles on non-CVC', r.prompt]); continue; }
      cvc++;
      if (JSON.stringify(r.tiles) !== JSON.stringify(r.answer.split('')) || r.tiles.length !== 3) bad.push(['tiles', r.prompt, r.tiles]);
      for (const l of r.tiles || []) {
        const sd = tileSound(l);
        if (!sd) bad.push(['no sound', l]);
        else if (sd.tts ? !BLEND_TTS[l] : !(BLEND_WHOLE.includes(l) ? sd.stopAt === undefined : sd.stopAt > 0.3 && sd.stopAt < 2.0)) bad.push(['sound', l, sd]);
      }
      if (JSON.stringify(JSON.parse(JSON.stringify(r))) !== JSON.stringify(r)) bad.push(['not plain JSON', r.prompt]);
    }
  }
}
if (!cvc) bad.push(['no CVC rounds seen']);
if (bad.length) { console.log('FAIL', bad.slice(0, 10)); process.exit(1); }
console.log(`ok: ${cvc} CVC rounds have tiles`);
