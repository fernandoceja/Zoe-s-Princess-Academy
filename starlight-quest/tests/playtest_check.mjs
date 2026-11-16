// Play-test fixes (Nov 15): drag anywhere to walk, wrong picks never lock, a picture and a speaker on every card,
// vowel-jar bounce-back, the Thursday test off Zoe's screens, one-card intros, a fresh quest pill. Plain Node.
import { readFileSync } from 'node:fs';
import * as F from '../src/flow/playfix.js';
import { tutorialSteps } from '../src/flow/screens.js';
import { buildRounds, landState, NPC_ORDER, QUESTS } from '../src/engine-core.js';

const read = (p) => readFileSync(new URL('../src/' + p, import.meta.url), 'utf8');
const problems = [];
let checks = 0;
const ok = (cond, msg) => { checks++; if (!cond) problems.push(msg); };
function rngFrom(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// 1. Drag anywhere: a small wiggle is a tap, a long drag is full speed, the direction is kept (screen-up is -z).
const z = F.dragVector(5, 5); ok(z.x === 0 && z.z === 0, 'drag: a tap-sized move must not walk');
const up = F.dragVector(0, -200); ok(Math.abs(up.x) < 1e-9 && Math.abs(up.z + 1) < 1e-9, 'drag: dragging up walks up at full speed');
const half = F.dragVector(35, 0); ok(Math.abs(half.x - 0.5) < 1e-9 && half.z === 0, 'drag: half the radius is half speed');
for (const [dx, dy] of [[300, 300], [-90, 20], [13, 0], [0, 1000]]) { const v = F.dragVector(dx, dy); ok(Math.hypot(v.x, v.z) <= 1 + 1e-9, `drag: speed over 1 for ${dx},${dy}`); }
ok(F.dragVector(NaN, 3).x === 0, 'drag: bad numbers stand still');
const touchMove = tutorialSteps(true)[0].text;
ok(/anywhere/i.test(touchMove) && /joystick/i.test(touchMove), 'tutorial (touch): says drag anywhere, and the joystick works too');
const app = read('App.tsx');
ok(/<DragWalk targetRef=\{containerRef\} enabled=\{\(gameState === 'roam' \|\| gameState === 'scoot'\) && !paused && !mapOpen\}/.test(app), 'App: drag-anywhere layer only while walking');
ok(/\{\(gameState === 'roam' \|\| gameState === 'scoot'\) && <VirtualJoystick \/>\}/.test(app), 'App: the joystick stays');
const drag = read('components/DragWalk.tsx');
ok(/DRAG_START_PX/.test(drag) && /Input\.setJoystick\(0, 0\)/.test(drag) && /pointercancel/.test(drag), 'DragWalk: taps stay taps, and Zoe stops when the finger lifts');

// 2 + 4. Wrong picks: one short hint line; the wiggle and hop are real CSS; sorts bounce back.
let rounds = 0, longest = 0;
const labelsSeen = [];
for (const npc of NPC_ORDER) {
  for (let seed = 1; seed <= 30; seed++) {
    for (const tier of [1, 2, 3]) {
      const st = landState(null); st.tier = tier;
      let rs; try { rs = buildRounds(npc, rngFrom(seed * 31 + tier), st); } catch (e) { continue; }
      for (const r of rs) {
        rounds++;
        for (const h of [r.hint, r.hintSay, r.sort && r.sort.hint].filter(Boolean)) {
          const s = F.shortHint(h);
          longest = Math.max(longest, s.length);
          ok(s.startsWith('Good try! ') && s.length > 'Good try! '.length + 3, `${npc}: short hint is empty: ${h}`);
          ok(s.length <= 'Good try! '.length + F.HINT_MAX || !/[.!?].+[.!?]/.test(s.slice(10, -1)), `${npc}: short hint is more than one line: ${s}`);
        }
        if (r.choices && !r.sort && !r.spell && !r.build) labelsSeen.push({ npc, round: r });
      }
    }
  }
}
ok(rounds > 500, `only ${rounds} rounds built`);
ok(F.shortHint('Good try! Look at the tops. Which one reaches higher?') === 'Good try! Look at the tops. Which one reaches higher?', 'short hint keeps two short sentences');
ok(F.shortHint('A naming word names a person, animal, place, or thing.') === 'Good try! A naming word names a person, animal, place, or thing.', 'short hint without "Good try"');
ok(F.shortHint("Good try! Let's look again. 'again' starts with the letter a.") === "Good try! 'again' starts with the letter a.", 'short hint keeps the clue after a generic opener');
ok(F.shortHint('Good try! Listen again. Which words did you hear?') === 'Good try! Which words did you hear?', 'short hint skips "Listen again."');
ok(/!round\.test && \(locked \|\| cooling\)/.test(read('components/ChallengeModal.tsx')), 'question 🔊 repeats the question once the cards work again');
ok(F.RETRY_UNLOCK_MS >= 700 && F.RETRY_UNLOCK_MS <= 1500, 'cards unlock in about a second');
const css = read('styles.css');
ok(/\.shake-card\{animation:zsq-wiggle/.test(css) && /@keyframes zsq-wiggle/.test(css), 'styles: the wrong-card wiggle exists');
ok(/\.zsq-bounce-back\{animation:zsq-hop-back/.test(css), 'styles: the sort bounce-back exists');
ok(/prefers-reduced-motion:reduce\)\{\.shake-card,\.zsq-bounce-back\{animation:none/.test(css), 'styles: Reduce Motion turns them off');
const modal = read('components/ChallengeModal.tsx');
ok(/setBounced\(\{ i: itemIdx/.test(modal) && /zsq-bounce-back/.test(modal), 'sort: a wrong jar bounces the word back');
ok(/onPick\('__sortwrong', sortWrongHint/.test(modal), 'sort: a wrong jar still sends the spoken hint');
ok(F.wordPicture('I clap') === '👏' && F.wordPicture('teddy bear') === '🧸' && F.wordPicture('the') === '', 'sort words get a picture where one fits');
ok(/wordPicture\(item\.name\)/.test(modal) && /aria-label=\{`Hear \$\{item\.name\}`\}/.test(modal), 'sort words have a picture and a speaker');
ok(/scrollIntoView/.test(modal), 'the hint line is scrolled into view');
ok(/kind === 'sortwrong'\) \{[\s\S]{0,200}Narrator\.speakExact\(npcId, say\)/.test(app), 'App: the sort hint is spoken');

// 3. Every card has a picture (or counting dots); a speaker, unless hearing it gives the answer away.
let speakers = 0;
for (const { npc, round } of labelsSeen) {
  round.choices.forEach((label, i) => {
    const c = F.cardPicture(npc, label, i);
    ok(!!c.pic || c.dots > 0, `${npc}: card "${label}" has no picture`);
    if (c.dots) ok(String(c.dots) === String(label).trim(), `${npc}: dots ${c.dots} for "${label}"`);
  });
  const hear = F.canHearChoices(npc, round, round.choices);
  if (npc === 'belle') ok(!hear, `belle: reading cards must not read themselves aloud: ${round.prompt}`);
  if (hear) { speakers++; for (const l of round.choices) ok(F.choiceSay(round, l).length > 0 && !/[\p{Extended_Pictographic}]/u.test(F.choiceSay(round, l)), `${npc}: card speech for "${l}"`); }
  ok(typeof F.questionPicture(npc, round) === 'string' && F.questionPicture(npc, round).length > 0, `${npc}: question has no picture`);
  // A picture never names the answer in the shape and reading lands (badges only, unless the label brought its own).
  if (npc === 'moana' || npc === 'belle' || npc === 'anna') {
    round.choices.forEach((label, i) => { const c = F.cardPicture(npc, label, i); if (c.pic && !/^\p{Extended_Pictographic}/u.test(label)) ok(F.CARD_BADGES.includes(c.pic), `${npc}: word picture on "${label}" could give it away`); });
  }
}
ok(speakers > 100, `only ${speakers} rounds have speaking cards`);
ok(!F.canHearChoices('anna', { choices: ['where is the cat?', 'Where is the cat.', 'Where is the cat?'] }, ['where is the cat?', 'Where is the cat.', 'Where is the cat?']), 'cards that all sound the same do not speak');
ok(F.cardPicture('rapunzel', '💧 Water').pic === '💧' && F.cardPicture('rapunzel', '💧 Water').text === 'Water', 'picture label splits');
ok(F.cardPicture('belle', '🐟').text === '' && F.cardPicture('belle', '🐟').pic === '🐟', 'picture-only label');
ok(F.cardPicture('ariel', 'pig').pic === '🐷' && F.cardPicture('belle', 'pig').pic !== '🐷', 'word pictures only where they do not answer');
ok(/canHearChoices\(npcId, round/.test(modal) && /questionPicture\(npcId, round\)/.test(modal) && /cardPicture\(npcId, choice\.label/.test(modal), 'ChallengeModal: cards use the picture and speaker rules');
ok(/aria-label=\{`Hear \$\{say\}`\}/.test(modal), 'ChallengeModal: the card speaker');

// 5. The Thursday test is off Zoe's screens and reachable in Parent Corner (behind the grown-up gate).
ok(!/Thursday test 📝/.test(app), "App: Belle's dialogue must not offer the Thursday test");
ok(/onStartTest=\{(?:gameState === 'roam' \|\| gameState === 'scoot' \? )?startTestFromParent(?: : undefined)?\}/.test(app) && /const startTestFromParent = \(\) => \{[\s\S]{0,700}beginSpellTest\(\)/.test(app), 'App: Parent Corner starts the test');
const pc = read('components/ParentCorner.tsx');
ok(/onClick=\{onStartTest\}/.test(pc) && !/Narrator/.test(pc), 'Parent Corner: start button, still silent');

// 9 (S items). One-card intros, a fresh quest pill, a faded pause button while it cannot pause.
for (const id of Object.keys(QUESTS)) {
  const intro = QUESTS[id].intro || [];
  if (intro.length > 1) ok(F.mergedLines(intro).length === 1, `${id}: intro is still ${F.mergedLines(intro).length} cards`);
  if (QUESTS[id].complete && QUESTS[id].complete.length > 1) ok(F.mergedLines(QUESTS[id].complete).length <= QUESTS[id].complete.length, `${id}: praise merged`);
}
ok(F.mergedLines(['a'.repeat(200), 'b'.repeat(200)]).length === 2, 'long talks still page');
ok(F.mergedLines([]).length === 0 && F.mergedLines(['hi']).length === 1, 'merge edge cases');
ok(/lines=\{mergedLines\(dialogue\.lines\)\}/.test(app), 'App: dialogues are merged');
ok(!/`\$\{lineIdx \+ 1\} of \$\{lines\.length\}`\}\s*<\/div>/.test(read('components/DialogueModal.tsx')), 'Dialogue: no "1 of 3" text');
ok(/questStep=\{activeNPC && \(gameState === 'challenge' \|\| gameState === 'scoot'\) \? questStep : undefined\}/.test(app), 'HUD: the quest pill only shows during a quest');
ok(/canPause \? '' : 'opacity-40/.test(read('components/HUD.tsx')), 'HUD: pause looks faded when it cannot pause');

console.log(`playtest: ${checks} checks over ${rounds} rounds (${speakers} with speaking cards, longest hint ${longest} chars), problems ${problems.length}`);
if (problems.length) { for (const p of problems.slice(0, 15)) console.log(p); process.exit(1); }
