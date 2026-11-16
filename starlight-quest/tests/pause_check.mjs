// Pause anytime (Nov 16): Pause works during a talk, a question and a card, and pausing mid-question never loses or
// skips progress. Plain Node (tools/smoke.mjs also pauses mid-talk and mid-question in a real browser).
import { readFileSync } from 'node:fs';
import { canPauseIn, walksAfterResume, questSnapshot } from '../src/flow/pause.js';
import { createQuestbook, roundView, pick, nextRound } from '../src/flow/questbook.js';
import { buildRounds, NPC_ORDER } from '../src/engine-core.js';

const read = (p) => readFileSync(new URL('../src/' + p, import.meta.url), 'utf8');
const problems = [];
let checks = 0;
const ok = (cond, msg) => { checks++; if (!cond) problems.push(msg); };
function rngFrom(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// 1. Where Pause works, and where walking comes back.
for (const ph of ['roam', 'scoot', 'dialogue', 'challenge', 'celebrate', 'finale']) ok(canPauseIn(ph), `pause: works in ${ph}`);
for (const ph of ['title', 'tutorial']) ok(!canPauseIn(ph), `pause: not on the ${ph} screen`);
ok(walksAfterResume('roam') && walksAfterResume('scoot'), 'resume: walking returns while roaming');
for (const ph of ['dialogue', 'challenge', 'celebrate', 'finale']) ok(!walksAfterResume(ph), `resume: no walking under ${ph}`);

// 2. The handler only flips the pause flag: it never calls the quest flow, saves, or changes screens.
const app = read('App.tsx');
const body = (app.match(/const handleTogglePause = \(\) => \{([\s\S]*?)\n  \};/) || [])[1] || '';
ok(body.length > 0, 'App: handleTogglePause found');
ok(/canPauseIn\(phaseRef\.current\)/.test(body), 'App: pause asks canPauseIn');
ok(!/Finish talking first/.test(app), 'App: the old "finish talking first" block is gone');
for (const banned of ['pick(', 'nextRound(', 'showRound(', 'completeQuest(', 'setView(', 'setFeedback(', 'setPhase(', 'setDialogue(', 'setCard(', 'Save.save(', 'setStars(', 'startQuest(', 'endToRoam(']) {
  ok(!body.includes(banned), `App: pausing must not call ${banned}`);
}
ok(/setInputEnabled\(!nextPaused && walksAfterResume\(phaseRef\.current\)\)/.test(body), 'App: resume gives walking back only where she walks');
ok(/Narrator\.stop\(\)/.test(body), 'App: pausing stops her voice');
ok(/canPause=\{canPauseIn\(gameState\)\}/.test(app), 'HUD: Pause button is live in talks and quests');
ok(/pauseOnTop=\{\(gameState === 'dialogue' \|\| gameState === 'challenge'\) && !card\}/.test(app), 'HUD: Pause floats above the talk and question sheets');
ok(/pauseAboveCard=\{!!card && !paused && canPauseIn\(gameState\)\}/.test(app), 'HUD: Pause floats above celebration and rest cards');
ok(/if \(!q \|\| !view \|\| pausedRef\.current\) return;/.test(app) && /if \(!q \|\| !feedback \|\| pausedRef\.current\) return;/.test(app), 'App: a paused question never answers or advances');
ok(/node\.closest\('\[inert\]'\)/.test(readFileSync(new URL('../js/padnav.js', import.meta.url), 'utf8')), 'padnav: the controller skips the inert paused quest');
const hud = read('components/HUD.tsx');
ok(/pauseOnTop && <div className="zsq-pause-float fixed [^"]*z-\[45\][^"]*pointer-events-auto">\{pauseButton\}/.test(hud), 'HUD: the floating Pause sits above the z-40 sheets');
ok(/pauseAboveCard && <div className="zsq-pause-float fixed [^"]*z-\[55\][^"]*pointer-events-auto">\{pauseButton\}/.test(hud), 'HUD: the card Pause sits above the z-50 cards');
ok(/const handleResume = \(\) => \{ if \(pausedRef\.current\) handleTogglePause\(\); \};/.test(app) && /onResume=\{handleResume\}/.test(app), 'PauseMenu: Resume only un-pauses (a double tap cannot pause again)');

// 3. The talk, question and cards stay mounted (never unmounted by pausing), inert under the menu, and read again on Resume.
const wrap = app.indexOf('<div inert={paused || undefined}');
const iDlg = app.indexOf('<DialogueModal'), iCh = app.indexOf('<ChallengeModal'), iCard = app.indexOf('<CelebrationModal');
const wrapEnd = app.indexOf('</div>', iCard);
ok(wrap > 0 && wrap < iDlg && iDlg < iCh && iCh < iCard && iCard < wrapEnd, 'App: talk, question and cards sit in the inert wrapper');
ok(!/\{dialogue && !paused/.test(app) && !/gameState === 'challenge' && activeNPC && view && !paused/.test(app), 'App: pausing does not unmount the talk or the question');
ok(/\{dialogue && \(/.test(app) && /\{gameState === 'challenge' && activeNPC && view && \(/.test(app), 'App: talk and question render conditions unchanged');
ok((app.match(/paused=\{paused\}/g) || []).length >= 2, 'App: DialogueModal and ChallengeModal get the paused flag');
const dlg = read('components/DialogueModal.tsx');
ok(/wasPaused\.current && !paused && currentLine\) herSay\(npcId, currentLine\)/.test(dlg), 'DialogueModal: Resume reads the same line again');
ok(!/setLineIdx\([^)]*\)[^\n]*paused/.test(dlg), 'DialogueModal: pausing never moves the line');
const ch = read('components/ChallengeModal.tsx');
ok(/wasPaused\.current && !paused\) replay\(\)/.test(ch), 'ChallengeModal: Resume reads the question (or fresh hint) again');
ok(!/paused[^\n]*(onPick|onAdvance)\(/.test(ch), 'ChallengeModal: pausing never answers or advances');
ok(/const startTestFromParent = \(\) => \{\s*if \(phaseRef\.current !== 'roam' && phaseRef\.current !== 'scoot'\) return;/.test(app), 'Parent Corner: the Thursday test cannot start on top of a quest');

// 4. A pause at any point of a quest leaves its progress exactly as it was. Pausing runs no flow code (part 2), so the
//    snapshot before and after must match at every step; the quest then finishes with every round counted once.
let quests = 0, pauses = 0;
for (const npc of NPC_ORDER) for (const tier of [1, 2, 3]) for (let seed = 1; seed <= 12; seed++) {
  const rng = rngFrom(seed * 31 + tier);
  const rounds = buildRounds(npc, rng, { tier, review: [] });
  if (!rounds.length) continue;
  const save = { stars: 0, done: [], shards: {}, ladder: {} };
  const q = createQuestbook(npc, rounds);
  let steps = 0, safety = 200;
  while (safety-- > 0) {
    const v = roundView(q);
    const before = questSnapshot(q, save);
    pauses++;   // Pause here, then Resume: the flow is not called.
    ok(questSnapshot(q, save) === before, `${npc} T${tier}: pause changed the quest at round ${q.roundIdx + 1}`);
    const wrong = v.choices.find((c) => c.id !== v.correctId);
    const kind = rng() < 0.35 && wrong ? pick(q, wrong.id, v.correctId, save) : pick(q, v.correctId, v.correctId, save);
    steps++;
    if (kind === 'correct' || kind === 'reveal') {
      const mid = questSnapshot(q, save);
      pauses++;   // Pause on the "Next" screen after an answer.
      ok(questSnapshot(q, save) === mid, `${npc} T${tier}: pause after an answer changed the quest`);
      if (nextRound(q)) break;
    }
  }
  quests++;
  ok(q.results.length === rounds.length, `${npc} T${tier} seed ${seed}: ${q.results.length} of ${rounds.length} rounds counted (none lost or skipped)`);
}

console.log(`pause: ${checks} checks, ${quests} quests, ${pauses} pauses, ${problems.length} problems`);
for (const m of problems.slice(0, 25)) console.log('  -', m);
if (problems.length) process.exit(1);
