/* Zoe's Starlight Quest — game flow wiring
 * Boots the world, UI, audio, quests and save systems and runs the
 * story loop: roam -> talk -> 5 challenge rounds -> shard -> celebrate.
 * No fail states: wrong picks get a gentle hint and a retry.
 * ES module. Three.js comes from the importmap in index.html.
 */

import { createWorld } from './world.js?v=20261026w1';
import { PRINCESSES, QUESTS, FINALE_LINES, buildRounds, revealLines, BELLE_CLIP_DIR } from './quests.js?v=20261026w1';
import { SoundFX, Narrator, setLang, installAudioCare, canBypassSilentSwitch, isIOS } from './audio.js?v=20261026w1';
import { UI } from './ui.js?v=20261026w1';
import { Save } from './save.js?v=20261026w1';
import { Input } from './input.js?v=20261026w1';
import { startPadNav } from './padnav.js?v=20261026w1';
import { landState, recordQuest, today } from './ladder.js?v=20261026w1';

const NPC_IDS = ['belle', 'elsa', 'rapunzel', 'cinderella'];
const NPC_TO_LAND = { belle: 'library', elsa: 'frostfall', rapunzel: 'meadow', cinderella: 'village' };

// Let the star burst and happy hop play out before a full-screen card covers the world.
const CELEBRATE_VIEW_MS = 1800;

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
  let results = [];  // ladder results for this quest's first 5 rounds
  let requeued = 0;  // missed rounds asked again later in this quest

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
      if (npcId) {
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

  // Stop drawing the 3D world while a full-screen card covers it (saves battery, keeps the phone cool).
  // The pause menu is left out on purpose: it is translucent and the world loop delivers its resume key.
  const COVER_SELECTOR = '.zsq-title, .zsq-tutorial, .zsq-modal-wrap, .zsq-celebrate, .zsq-finale, .zsq-parent-wrap';
  function syncWorldCover() {
    const covered = Array.from(document.querySelectorAll(COVER_SELECTOR))
      .some((n) => !n.classList.contains('zsq-hidden') && !n.classList.contains('zsq-leaving'));
    if (covered) world.pause(); else world.resume();
  }
  new MutationObserver(syncWorldCover).observe(document.getElementById('zsq-ui') || document.body, {
    subtree: true, attributes: true, attributeFilter: ['class'],
  });
  syncWorldCover();

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
      UI.setQuestPill(`✨ ${PRINCESSES[activeNPC].name} · ${Math.min(roundIdx + 1, rounds.length)}/${rounds.length}`);
    } else {
      const shards = NPC_IDS.map((id, i) => `<span class="zsq-shard${i < done ? '' : ' zsq-off'}">${i < done ? '◆' : '◇'}</span>`).join('');
      UI.setQuestPill(`<span class="zsq-shards" role="img" aria-label="${done} of ${NPC_IDS.length} lands restored">${shards}</span>`);
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

  function startQuest(npcId, opts = {}) {
    // One quest per land per day, then a soft stop (no timers anywhere).
    if (!opts.again && Save.data.lastPlay[npcId] === today()) {
      activeNPC = npcId;
      state = 'dialogue';
      world.setInputEnabled(false);
      world.focus(npcId);
      UI.setRoamUI(false);
      UI.promptInteract(null);
      showRest(npcId);
      return;
    }
    activeNPC = npcId;
    roundIdx = 0;
    misses = 0;
    results = [];
    requeued = 0;
    rounds = buildRounds(npcId, Math.random, landState(Save.data.ladder[npcId]));
    state = 'dialogue';
    world.setInputEnabled(false);
    world.focus(npcId);
    UI.setRoamUI(false);
    UI.promptInteract(null);
    const P = PRINCESSES[npcId];
    const quest = QUESTS[npcId];
    refreshPill();

    if (Save.data.done.includes(npcId)) {
      // Her land already glows: a practice quest at her current tier.
      dlg(npcId, P.name, P.color, P.portrait,
        [opts.again ? 'Yay, one more! Here we go! ✨' : `Welcome back, Zoe! My land is glowing because of you! 💖 Want to play again?`],
        'praise', () => startRound());
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
    // Snowflakes as ten-frame rows: fives with a gap between, ten per line, so they are easy to count.
    // The last `gone` flakes are faded and crossed out (taken away).
    const flakes = (n, gone = 0, w = 22) => {
      n = Math.max(0, Math.min(n, 20));
      let rows = '';
      for (let r = 0; r < n; r += 10) {
        let cells = '';
        for (let i = r; i < Math.min(r + 10, n); i++) {
          const away = i >= n - gone;
          cells += `<span data-flake="${away ? 'gone' : 'kept'}" style="position:relative;display:inline-block;width:${w}px;text-align:center;font-size:${w - 2}px;line-height:1.3;${i % 10 === 5 ? 'margin-left:8px;' : ''}${away ? 'opacity:.3;' : ''}">❄️` +
            (away ? `<span style="position:absolute;left:0;right:0;top:0;color:#e11d48;font-size:${w - 2}px;font-weight:700;opacity:1">✕</span>` : '') + '</span>';
        }
        rows += `<div style="white-space:nowrap">${cells}</div>`;
      }
      return `<div style="display:inline-block;margin:${w < 22 ? 0 : 2}px">${rows}</div>`;
    };
    if (npcId === 'elsa' && round.visual && round.visual.tens != null) {
      // Tens and ones: each bundle of 10 snowflakes sits in its own box.
      const { tens, ones } = round.visual;
      const bundle = `<span style="display:inline-block;border:3px solid #7dd3fc;border-radius:12px;padding:2px 6px;margin:3px">${flakes(10, 0, 19)}</span>`;
      return `<div style="text-align:center;line-height:1.5">${bundle.repeat(tens)}` +
        `<div>${flakes(ones)}</div></div>`;
    }
    if (npcId === 'elsa' && round.visual && round.visual.parts) {
      return `<div style="text-align:center">` +
        round.visual.parts.map((n) => flakes(n)).join('<div style="font-size:26px">➕</div>') + '</div>';
    }
    if (npcId === 'elsa' && round.visual) {
      const { a, b } = round.visual;
      const isMinus = round.visual.op ? round.visual.op === '-'
        : (/−|-/.test(round.prompt) && !/\+/.test(round.prompt));
      // Take-away: one group where the last b flakes are visibly removed.
      if (isMinus && b > 0) return `<div style="text-align:center;line-height:1.6">${flakes(a, b)}</div>`;
      return `<div style="text-align:center;line-height:1.6">${flakes(a)}` +
        `<div style="font-size:30px">${isMinus ? '➖' : '➕'}</div>${b > 0 ? flakes(b) : '<span style="font-size:34px">❓</span>'}</div>`;
    }
    if (npcId === 'cinderella' && round.clock) {
      return clockSVG(round.clock.hour, round.clock.minute);
    }
    if (npcId === 'rapunzel' && round.visual && round.visual.kind) return measureSVG(round.visual);
    if (round.pic && (npcId === 'rapunzel' || npcId === 'belle')) return `<div style="font-size:42px;text-align:center">${round.pic}</div>`;
    return '';
  }

  // Measuring picture: flowers stand on one ground line (compare heights), or a stem beside a column of petal units.
  function measureSVG(v) {
    const FILL = { pink: '#f9a8d4', yellow: '#fde68a', purple: '#c4b5fd', blue: '#93c5fd' };
    const U = 12, G = 124; // px per unit, ground y
    if (v.kind === 'flowers') {
      const n = v.heights.length, W = n * 60;
      let body = '';
      v.heights.forEach((h, i) => {
        const cx = 30 + i * 60, top = G - h * U;
        body += `<rect x="${cx - 3}" y="${top}" width="6" height="${h * U}" rx="3" fill="#86d19b"/>` +
          `<circle cx="${cx}" cy="${top - 4}" r="14" fill="${FILL[v.colors[i]] || '#f9a8d4'}" stroke="#ffffff" stroke-width="3"/>` +
          `<circle cx="${cx}" cy="${top - 4}" r="4" fill="#f59e0b"/>`;
      });
      return `<svg viewBox="0 0 ${W} 138" style="width:min(70vw,260px);height:auto;display:block;margin:0 auto" role="img" aria-label="${n} flowers of different heights standing on the ground">` +
        `<line x1="0" y1="${G}" x2="${W}" y2="${G}" stroke="#a7d9b0" stroke-width="4" stroke-linecap="round"/>${body}</svg>`;
    }
    const n = Math.max(1, Math.min(v.length | 0, 8));
    let petals = '';
    for (let i = 0; i < n; i++) {
      petals += `<ellipse cx="70" cy="${G - i * U - U / 2}" rx="13" ry="${U / 2 - 0.5}" fill="${i % 2 ? '#f9a8d4' : '#fbcfe8'}" stroke="#ec7fb4" stroke-width="1"/>`;
    }
    return `<svg viewBox="0 0 120 138" style="width:min(70vw,260px);height:auto;display:block;margin:0 auto" role="img" aria-label="A flower stem next to a column of ${n} petals, one petal for each unit of length">` +
      `<line x1="0" y1="${G}" x2="120" y2="${G}" stroke="#a7d9b0" stroke-width="4" stroke-linecap="round"/>` +
      `<rect x="27" y="${G - n * U}" width="6" height="${n * U}" rx="3" fill="#86d19b"/>${petals}</svg>`;
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
    const hx = 50 + 15 * Math.sin(hr), hy = 50 - 15 * Math.cos(hr);
    const mx = 50 + 24 * Math.sin(mr), my = 50 - 24 * Math.cos(mr); // stops short of the numerals so 12 and 6 stay readable
    // Numerals 1-12 sit just inside the ticks. The hands stop short of them, so no number is ever covered.
    let numerals = '';
    for (let i = 1; i <= 12; i++) {
      const a = (i * 30 * Math.PI) / 180;
      const nx = 50 + 30.5 * Math.sin(a), ny = 50 - 30.5 * Math.cos(a);
      numerals += `<text x="${nx.toFixed(1)}" y="${ny.toFixed(1)}" text-anchor="middle" dominant-baseline="central" font-family="Nunito, system-ui, sans-serif" font-weight="900" font-size="11" fill="#3b1f04">${i}</text>`;
    }
    const hh = h % 12 || 12, mm = String(m).padStart(2, '0');
    return `<svg viewBox="0 0 100 100" style="width:min(52vw,210px,38vh);height:auto;display:block;margin:0 auto" role="img" aria-label="Clock showing ${hh}:${mm}">` +
      `<circle cx="50" cy="50" r="46" fill="#fffbe8" stroke="#ebd373" stroke-width="5"/>${ticks}${numerals}` +
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
    let voiceText = round.say || round.prompt;
    if (npcId === 'cinderella' || npcId === 'rapunzel') {
      // Read the words only, not the picture emoji in front of them.
      const labels = arr.map((c) => c.label.replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, '').trim());
      voiceText += ' Is it ' + labels.slice(0, -1).join(', ') + ', or ' + labels[labels.length - 1] + '?';
    }
    refreshPill();

    UI.showChallenge(
      {
        kicker: quest.title,
        // A quest is five questions; a missed one may come back, so cap the dots at five.
        progress: { current: Math.min(roundIdx + 1, 5), total: 5 },
        portrait: { src: P.portrait },
        prompt: round.prompt,
        choices: arr,
        visualHtml: visualHtml(npcId, round),
        princessId: npcId,
        voiceText,
        replayText: round.replay || null, // Belle sentences: 🔊 reads the sentence
        exactVoice: true, // read the actual question aloud, not a generic MP3
      },
      (pickedId) => {
        if (pickedId === correctId) {
          noteResult(round);
          Save.data.stars += 1;
          if (!Save.data.done.includes(npcId)) Save.data.shards[npcId] += 1;
          Save.save();
          UI.updateStars(Save.data.stars);
          SoundFX.chime();
          const praise = PRAISES[Math.floor(Math.random() * PRAISES.length)];
          // Speak the exact praise shown on screen (not a mismatched clip).
          Narrator.speakExact(npcId, praise);
          UI.revealAnswer(
            { correctId, pickedId, message: `⭐ +1 star! ${praise}` },
            () => nextRound(npcId)
          );
        } else if (misses >= 2) {
          // Third miss: show the answer gently, read it, and count it as done.
          SoundFX.pop();
          misses++;
          noteResult(round);
          const { shown: msg, say } = revealLines(round);
          Narrator.speakExact(npcId, say);
          UI.revealAnswer({ correctId, pickedId, message: msg }, () => nextRound(npcId));
        } else {
          // Gentle retry: never reveal the answer, never penalize.
          SoundFX.pop();
          misses++;
          // Speak exactly the on-screen text ('Good try!' + hint) in her voice,
          // so the words heard always match the words shown.
          // Belle phonics: then play the letter's sound clip (not its name).
          Narrator.speakExact(npcId, round.hint, round.sound
            ? () => Narrator.playClip(BELLE_CLIP_DIR + round.sound)
            : undefined);
          UI.revealAnswer({ correctId: null, pickedId, message: round.hint }, () => startRound());
        }
      }
    );
  }

  // Ladder bookkeeping for a finished round (re-asks don't count twice).
  function noteResult(round) {
    if (round.requeued || results.length >= 5) return;
    results.push({ round, firstTry: misses === 0, hinted: misses > 0 });
    // Missed it? Ask it again 2 rounds later in this quest (at most twice).
    if (misses > 0 && requeued < 2) {
      requeued++;
      rounds.splice(Math.min(rounds.length, roundIdx + 3), 0, { ...round, requeued: true });
    }
  }

  function nextRound(npcId) {
    roundIdx++;
    misses = 0;
    if (roundIdx >= rounds.length) completeQuest(npcId);
    else startRound();
  }

  // Soft stop after one quest: rest, or one more right away.
  function showRest(npcId) {
    state = 'dialogue';
    UI.setRoamUI(false);
    refreshPill();
    const text = 'The kingdom is resting. Come back tomorrow!';
    Narrator.speakExact(npcId, text);
    UI.showRest({ title: '🌙 The kingdom is resting.', sub: 'Come back tomorrow! 💤' },
      () => { Narrator.stop(); endToRoam(); },
      () => { Narrator.stop(); startQuest(npcId, { again: true }); });
  }

  function completeQuest(npcId) {
    Save.data.ladder[npcId] = recordQuest(landState(Save.data.ladder[npcId]), results);
    Save.data.lastPlay[npcId] = today();
    if (Save.data.done.includes(npcId)) {
      // Practice replay: no new shard, straight to the soft stop.
      Save.save();
      SoundFX.chime();
      showRest(npcId);
      return;
    }
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
    setTimeout(() => UI.showCelebration(
      `${P.name}'s land is glowing!`,
      `You earned the ${P.landName} star shard!  ⭐ +3 stars`,
      () => {
        dlg(npcId, P.name, P.color, P.portrait, quest.complete, 'praise', () => {
          if (Save.data.done.length >= NPC_IDS.length) runFinale();
          else showRest(npcId);
        });
      }
    ), CELEBRATE_VIEW_MS);
  }

  function runFinale() {
    state = 'finale';
    UI.setRoamUI(false);
    NPC_IDS.forEach((id, i) => setTimeout(() => world.celebrate(NPC_TO_LAND[id]), i * 650));
    SoundFX.fanfare();
    setTimeout(() => UI.showFinale(
      FINALE_LINES.map((t) => ({ princessId: 'belle', kind: 'praise', text: t })),
      () => endToRoam()
    ), CELEBRATE_VIEW_MS);
  }

  function endToRoam() {
    activeNPC = null;
    state = 'roam';
    world.setInputEnabled(true);
    world.unfocus();
    UI.setRoamUI(true);
    refreshPill();
  }
}
