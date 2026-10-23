/* Zoe's Starlight Quest — game flow wiring
 * Boots the world, UI, audio, quests and save systems and runs the
 * story loop: roam -> talk -> 5 challenge rounds -> shard -> celebrate.
 * No fail states: wrong picks get a gentle hint and a retry.
 * ES module. Three.js comes from the importmap in index.html.
 */

import { createWorld } from './world.js?v=20261023p2';
import { PRINCESSES, QUESTS, FINALE_LINES, buildRounds } from './quests.js?v=20261023p2';
import { SoundFX, Narrator, setLang, installAudioCare, canBypassSilentSwitch, isIOS } from './audio.js?v=20261023p2';
import { UI } from './ui.js?v=20261023p2';
import { Save } from './save.js?v=20261023p2';
import { Input } from './input.js?v=20261023p2';
import { startPadNav } from './padnav.js?v=20261023p2';

const NPC_IDS = ['belle', 'elsa', 'rapunzel', 'cinderella'];
const NPC_TO_LAND = { belle: 'library', elsa: 'frostfall', rapunzel: 'meadow', cinderella: 'village' };

const PRAISES = [
  'Wonderful! You did it!',
  'Amazing work, superstar!',
  'Yes! You are so smart!',
  'Beautiful! Keep shining!',
];

export async function main(container) {
  Save.load();
  setLang(Save.data.lang === 'ES' ? 'ES' : 'EN');
  Narrator.setMuted(!!Save.data.muted);

  // state: title | roam | dialogue | challenge | celebrate | finale
  let state = 'title';
  let paused = false;
  let activeNPC = null;
  let roundIdx = 0;
  let rounds = [];   // this play's rounds, built fresh from pools
  let misses = 0;    // wrong picks on the current round

  UI.init({
    onMuteToggle() {
      SoundFX.pop();
      Narrator.setMuted(!Narrator.muted);
      Save.data.muted = Narrator.muted;
      Save.save();
      UI.setMuteUI(Narrator.muted, null);
    },
    onPause() { togglePause(); },
  });
  UI.setMuteUI(Narrator.muted, null);

  // Unified input: keyboard + touch joystick + Bluetooth controllers.
  Input.init();
  startPadNav();
  installAudioCare();
  Input.onGamepadChange = (connected) => {
    UI.toast(connected
      ? '🎮 Controller connected! Left stick walks, ✕ talks.'
      : '🎮 Controller disconnected.');
  };

  const world = createWorld(container, {
    onNearNPC(npcId) {
      if (state !== 'roam' || paused) { UI.promptInteract(null); return; }
      if (npcId && !Save.data.done.includes(npcId)) {
        const c = Input.describeControls();
        const label = c.gamepad
          ? `💬 Press ✕ to talk to ${PRINCESSES[npcId].name} ✨`
          : c.touch
            ? `💬 Tap ${PRINCESSES[npcId].name} to talk ✨`
            : `💬 Click ${PRINCESSES[npcId].name} (or press E) ✨`;
        UI.promptInteract(label);
      } else {
        UI.promptInteract(null);
      }
    },
    onInteractRequest(npcId) {
      if (state !== 'roam' || paused) return;
      if (!npcId || !QUESTS[npcId]) return;
      startQuest(npcId);
    },
    onPauseRequest() { togglePause(); },
  });
  // Title screen is up: no roaming input until the adventure starts.
  world.setInputEnabled(false);

  // Touch joystick -> unified input (screen-up = -z, matching keyboard)
  UI.joystick((x, z) => Input.setJoystick(x, z));

  // Restore saved progress
  for (const id of Save.data.done) {
    if (NPC_IDS.includes(id)) world.setNPCState(id, 'done');
  }
  UI.updateStars(Save.data.stars);
  refreshPill();

  UI.showTitle(() => {
    Save.data.started = true;
    Save.save();
    const enterWorld = () => {
      state = 'roam';
      world.setInputEnabled(true);
      UI.setRoamUI(true);
      UI.toast('Walk to a princess and say hello! 👑');
      if (isIOS() && !canBypassSilentSwitch()) {
        setTimeout(() => UI.toast('🔔 No sound? Flip the silent switch off and turn the volume up.'), 2500);
      }
      const c = Input.describeControls();
      const how = c.gamepad ? 'press ✕' : c.touch ? 'tap her' : 'click her or press E';
      Narrator.speakText(
        `Welcome to Starlight Quest! Walk to a princess and ${how} to say hello.`,
        { pitch: 1.15, rate: 0.95 }
      );
    };
    let seen = false;
    try { seen = !!window.localStorage.getItem('zsq_tutorial_seen_v1'); } catch (e) { /* private mode */ }
    if (seen) { enterWorld(); return; }
    // First launch: 5-step how-to-play before entering the world.
    UI.showTutorial({
      onDone: () => {
        try { window.localStorage.setItem('zsq_tutorial_seen_v1', '1'); } catch (e) { /* private mode */ }
        enterWorld();
      },
    });
  });

  // ---------- helpers ----------

  function refreshPill() {
    const done = Save.data.done.length;
    if (activeNPC && (state === 'dialogue' || state === 'challenge')) {
      const q = QUESTS[activeNPC];
      UI.setQuestPill(`✨ ${PRINCESSES[activeNPC].name} · ${q.title} · ${Math.min(roundIdx + 1, 5)}/5`);
    } else {
      UI.setQuestPill(`🌟 ${done}/4 lands · ⭐ ${Save.data.stars} stars`);
    }
  }

  function showPauseMenu() {
    UI.showPauseMenu({
      onResume: () => togglePause(),
      onHowTo: () => UI.showTutorial({ onDone: () => showPauseMenu() }),
    });
  }

  function togglePause() {
    if (state !== 'roam') {
      UI.toast('Finish talking first, then you can pause! ⏸️');
      return;
    }
    paused = !paused;
    world.setInputEnabled(!paused);
    UI.setRoamUI(!paused);
    if (paused) {
      Narrator.stop();
      showPauseMenu();
    } else {
      UI.hidePauseMenu();
      UI.toast('▶️ Let\'s keep going!');
    }
  }

  function dlg(npcId, name, color, portrait, lines, kind, onDone) {
    UI.showDialogue(
      { portrait: { src: portrait, princessId: npcId }, name, color },
      // exact:true → spoken words always match the on-screen story text.
      lines.map((t) => ({ princessId: npcId, kind: kind || 'greeting', text: t, exact: true })),
      onDone
    );
  }

  function startQuest(npcId) {
    activeNPC = npcId;
    roundIdx = 0;
    misses = 0;
    rounds = buildRounds(npcId);
    state = 'dialogue';
    world.setInputEnabled(false);
    UI.setRoamUI(false);
    UI.promptInteract(null);
    const P = PRINCESSES[npcId];
    const quest = QUESTS[npcId];
    refreshPill();

    if (Save.data.done.includes(npcId)) {
      dlg(npcId, P.name, P.color, P.portrait,
        [`You already helped me, Zoe! My land is glowing because of you! 💖`],
        'praise', endToRoam);
      return;
    }
    dlg(npcId, P.name, P.color, P.portrait, quest.intro, 'greeting', () => startRound());
  }

  function shuffledChoices(choices, answer) {
    const arr = choices.map((label, i) => ({ id: 'c' + i, label }));
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    const correct = arr.find((c) => c.label === answer);
    return { arr, correctId: correct ? correct.id : arr[0].id };
  }

  function visualHtml(npcId, round) {
    if (npcId === 'elsa' && round.visual) {
      const { a, b } = round.visual;
      const isMinus = round.visual.op ? round.visual.op === '-'
        : (/−|-/.test(round.prompt) && !/\+/.test(round.prompt));
      const fl = (n) => '❄️'.repeat(Math.max(0, Math.min(n, 20)));
      return `<div style="font-size:24px;line-height:1.6;text-align:center">${fl(a)}` +
        `<div style="font-size:30px">${isMinus ? '➖' : '➕'}</div>${fl(b)}</div>`;
    }
    if (npcId === 'cinderella' && round.clock) {
      return clockSVG(round.clock.hour, round.clock.minute);
    }
    if (npcId === 'rapunzel') return `<div style="font-size:42px;text-align:center">🌱💧☀️</div>`;
    if (npcId === 'belle') return `<div style="font-size:42px;text-align:center">📖✨</div>`;
    return '';
  }

  function clockSVG(h, m) {
    const ha = ((h % 12) + m / 60) * 30;
    const ma = m * 6;
    let ticks = '';
    for (let i = 0; i < 12; i++) {
      const a = (i * 30 * Math.PI) / 180;
      const x1 = 50 + 36 * Math.sin(a), y1 = 50 - 36 * Math.cos(a);
      const x2 = 50 + 43 * Math.sin(a), y2 = 50 - 43 * Math.cos(a);
      ticks += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#8a6d3b" stroke-width="${i % 3 === 0 ? 4 : 2}"/>`;
    }
    const hr = (ha * Math.PI) / 180, mr = (ma * Math.PI) / 180;
    const hx = 50 + 22 * Math.sin(hr), hy = 50 - 22 * Math.cos(hr);
    const mx = 50 + 32 * Math.sin(mr), my = 50 - 32 * Math.cos(mr);
    return `<svg viewBox="0 0 100 100" width="132" height="132" style="display:block;margin:0 auto" role="img" aria-label="Clock">` +
      `<circle cx="50" cy="50" r="46" fill="#fffbe8" stroke="#ebd373" stroke-width="5"/>${ticks}` +
      `<line x1="50" y1="50" x2="${hx.toFixed(1)}" y2="${hy.toFixed(1)}" stroke="#5b4a8a" stroke-width="6" stroke-linecap="round"/>` +
      `<line x1="50" y1="50" x2="${mx.toFixed(1)}" y2="${my.toFixed(1)}" stroke="#e2703a" stroke-width="4" stroke-linecap="round"/>` +
      `<circle cx="50" cy="50" r="5" fill="#ebd373"/></svg>`;
  }

  function startRound() {
    state = 'challenge';
    const npcId = activeNPC;
    const quest = QUESTS[npcId];
    const P = PRINCESSES[npcId];
    const round = rounds[roundIdx];
    // After 2 misses, narrow to the answer plus one other choice.
    let choices = round.choices;
    if (misses >= 2) {
      const other = round.choices.find((c) => c !== round.answer);
      choices = other ? [round.answer, other] : [round.answer];
    }
    const { arr, correctId } = shuffledChoices(choices, round.answer);
    // Read the choices aloud for clock + plant quests (not Belle: reading is the skill).
    let voiceText = round.prompt;
    if (npcId === 'cinderella' || npcId === 'rapunzel') {
      const labels = arr.map((c) => c.label);
      voiceText += ' Is it ' + labels.slice(0, -1).join(', ') + ', or ' + labels[labels.length - 1] + '?';
    }
    refreshPill();

    UI.showChallenge(
      {
        kicker: `✨ ${quest.title} · ${roundIdx + 1} of 5`,
        prompt: round.prompt,
        choices: arr,
        visualHtml: visualHtml(npcId, round),
        princessId: npcId,
        voiceText,
        exactVoice: true, // read the actual question aloud, not a generic MP3
      },
      (pickedId) => {
        if (pickedId === correctId) {
          Save.data.stars += 1;
          Save.data.shards[npcId] += 1;
          Save.save();
          UI.updateStars(Save.data.stars);
          SoundFX.chime();
          const praise = PRAISES[Math.floor(Math.random() * PRAISES.length)];
          // Speak the exact praise shown on screen (not a mismatched clip).
          Narrator.speakExact(npcId, praise);
          UI.revealAnswer(
            { correctId, pickedId, message: `⭐ +1 star! ${praise}` },
            () => {
              roundIdx++;
              misses = 0;
              if (roundIdx >= rounds.length) completeQuest(npcId);
              else startRound();
            }
          );
        } else {
          // Gentle retry: never reveal the answer, never penalize.
          SoundFX.pop();
          misses++;
          // Encourage clip first, then the actual hint text.
          const hintSpoken = round.hint.replace(/^Good try!\s*/, '');
          Narrator.speak(npcId, 'encourage', 'Good try!', () => Narrator.speakExact(npcId, hintSpoken));
          UI.revealAnswer({ correctId: null, pickedId, message: round.hint }, () => startRound());
        }
      }
    );
  }

  function completeQuest(npcId) {
    state = 'celebrate';
    UI.setRoamUI(false);
    const P = PRINCESSES[npcId];
    const quest = QUESTS[npcId];
    if (!Save.data.done.includes(npcId)) Save.data.done.push(npcId);
    Save.data.stars += 3;
    Save.save();
    UI.updateStars(Save.data.stars);
    world.setNPCState(npcId, 'done');
    world.celebrate(NPC_TO_LAND[npcId]);
    SoundFX.fanfare();
    refreshPill();
    UI.showCelebration(
      `${P.name}'s land is glowing!`,
      `You earned the ${P.landName} star shard!  ⭐ +3 stars`,
      () => {
        dlg(npcId, P.name, P.color, P.portrait, quest.complete, 'praise', () => {
          if (Save.data.done.length >= NPC_IDS.length) runFinale();
          else endToRoam();
        });
      }
    );
  }

  function runFinale() {
    state = 'finale';
    UI.setRoamUI(false);
    NPC_IDS.forEach((id, i) => setTimeout(() => world.celebrate(NPC_TO_LAND[id]), i * 650));
    SoundFX.fanfare();
    UI.showFinale(
      FINALE_LINES.map((t) => ({ princessId: 'belle', kind: 'praise', text: t })),
      () => endToRoam()
    );
  }

  function endToRoam() {
    activeNPC = null;
    state = 'roam';
    world.setInputEnabled(true);
    UI.setRoamUI(true);
    refreshPill();
  }
}
