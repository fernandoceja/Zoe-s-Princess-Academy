// Belle phonics sound clips: every `sound` must exist on disk, be precached
// by sw.js, and never give the answer away (example word not among choices).
import fs from 'node:fs';
const q = await import(process.argv[2] || new URL('../js/quests.js', import.meta.url).href);
const root = new URL('../', import.meta.url);
const dir = new URL('../../assets/audio/EN/curriculum/belle/', import.meta.url);
const sw = fs.readFileSync(new URL('sw.js', root), 'utf8');
const bad = new Set(); let withSound = 0, total = 0;
const used = new Set();
const check = (r, where) => {
  if (!r.sound) return;
  withSound++; used.add(r.sound);
  if (!fs.existsSync(new URL(r.sound, dir))) bad.add(`missing file ${r.sound}`);
  if (!sw.includes(`'${q.BELLE_CLIP_DIR}${r.sound}'`)) bad.add(`not in sw.js ${r.sound}`);
  const ex = r.sound.replace(/\.mp3$/, '').split('_').pop();
  if (r.choices.includes(ex) || r.answer === ex) bad.add(`gives answer away ${r.sound} in ${r.choices}`);
  if (/_o_|^o_|^x_|^q_/.test(r.sound)) bad.add(`skipped letter used ${r.sound}`);
};
for (const T of [1, 2, 3]) for (let i = 0; i < 4000; i++)
  for (const r of q.buildRounds('belle', Math.random, { tier: T, review: [] })) { total++; check(r); }
for (const f of q.BELLE_CLIPS) {
  if (!fs.existsSync(new URL(f, dir))) bad.add(`missing file ${f}`);
  if (!sw.includes(`'${q.BELLE_CLIP_DIR}${f}'`)) bad.add(`not in sw.js ${f}`);
}
// Spot checks of the rules.
const eq = (a, b, m) => { if (a !== b) bad.add(`${m}: got ${a}, want ${b}`); };
eq(q._belleSound('ship', ['chip', 'sip']), undefined, 'ship (example is the answer)');
eq(q._belleSound('chin', ['shin', 'tin']), 'c_h_says_chh_chair.mp3', 'chin ch');
eq(q._belleSound('bath', ['bat', 'back']), 't_h_says_thh_three.mp3', 'bath th (last letter)');
eq(q._belleSound('lick', ['lip', 'lit']), 'c_k_says_kuh_clock.mp3', 'lick ck');
eq(q._belleSound('hot', ['hat', 'hit']), undefined, 'hot (o has no clip)');
console.log('belle rounds', total, 'with sound', withSound, 'distinct clips', used.size, 'problems', bad.size);
for (const k of [...bad].slice(0, 25)) console.log(' ', k);
if (bad.size || !withSound) process.exit(1);
