/* Zoe's Starlight Quest — game flow wiring
 * Boots the world, UI, audio, quests and save systems and runs the
 * story loop: roam -> talk -> 5 challenge rounds -> shard -> celebrate.
 * No fail states: wrong picks get a gentle hint and a retry.
 * ES module. Three.js comes from the importmap in index.html.
 */

import { createWorld } from './world.js?v=20261027e2';
import { PRINCESSES, NPC_ORDER, QUESTS, WEEK, FINALE_LINES, buildRounds, setSchoolWords, setWeek, revealLines, BELLE_CLIP_DIR } from './quests.js?v=20261027e2';
import { SoundFX, Narrator, setLang, installAudioCare, canBypassSilentSwitch, isIOS } from './audio.js?v=20261027e2';
import { UI } from './ui.js?v=20261027e2';
import { Save, checkMilestones } from './save.js?v=20261027e2';
import { todayKey, collectTreasure, rolloverTreasures, treasuresGotToday, landTreasureCount, TREASURES_PER_LAND, TREASURE_LANDS, TREASURE_LAND_NAMES, awardRowStar, SECRETS, foundSecret, createSecretTracker, doublesLine, clockLine, spellLine, plantLine } from './treasures.js?v=20261027e2';
import { Input } from './input.js?v=20261027e2';
import { startPadNav } from './padnav.js?v=20261027e2';
import { landState, recordQuest, today, pickTodayStar } from './ladder.js?v=20261027e2';

const NPC_IDS = NPC_ORDER;
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
  rolloverTreasures(Save.data, todayKey());
  setSchoolWords(Save.data.schoolWords);
  setWeek(Save.data.week);
  setLang(Save.data.lang === 'ES' ? 'ES' : 'EN');
  Narrator.setMuted(!!Save.data.muted);

  const secretTracker = createSecretTracker();
  // A secret was found: the princess says her learning echo; the first time also earns a sticker.
  function revealSecret(id) {
    const def = SECRETS.find((x) => x.id === id);
    if (!def) return;
    let line;
    if (id === 'clock') { const c = clockLine(); world.setClockTime(c.h, c.m); line = c.say; }
    else if (id === 'icetwins') line = doublesLine().say;
    else if (id === 'bookstack') { const sp = spellLine(WEEK.spelling); line = sp.say; UI.toast(`📚 ${sp.show}`); }
    else line = plantLine().say;
    SoundFX.chime();
    Narrator.speakExact(def.npc, line);
    if (id !== 'bookstack') UI.toast(`${def.emoji} ${line}`);
    if (foundSecret(Save.data, id)) {
      Save.save();
      setTimeout(() => UI.toast(`New sticker: ${def.label}! ${def.emoji}`), 1400);
    }
  }

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
    onWorldTap() {
      if (state !== 'roam' || paused) return;
      SoundFX.chime();
    },
    onSecretTap(part) {
      if (state !== 'roam' || paused) return;
      const id = secretTracker.tap(part, Date.now());
      if (id) revealSecret(id);
    },
    treasuresGot() { return treasuresGotToday(Save.data, todayKey()); },
    onTreasure(kind, landId, id) {
      const day = todayKey();
      if (!collectTreasure(Save.data, id, kind, day)) return;
      Save.save();
      SoundFX.chime();
      UI.toast(`You found a ${kind}! ${landTreasureCount(Save.data, landId, day)} of ${TREASURES_PER_LAND} here today ✨`);
      if (awardRowStar(Save.data, landId, day)) {
        // Same award path as a won round: +1 star, save, counter. (Milestones are checked after the next quest.)
        Save.data.stars += 1;
        Save.save();
        UI.updateStars(Save.data.stars);
        setTimeout(() => UI.toast(`All ${TREASURES_PER_LAND} treasures in ${TREASURE_LAND_NAMES[landId]}! +1 ⭐`), 1600);
      }
      UI.updateFinds(Save.data.treasures.got.length, TREASURE_LANDS.length * TREASURES_PER_LAND);
    },
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
    subtree: true, childList: true, attributes: true, attributeFilter: ['class'],
  });
  syncWorldCover();

  // Touch joystick -> unified input (screen-up = -z, matching keyboard)
  UI.joystick((x, z) => Input.setJoystick(x, z));

  // Restore saved progress
  for (const id of Save.data.done) {
    if (NPC_IDS.includes(id)) world.setNPCState(id, 'done');
  }
  UI.updateStars(Save.data.stars);
  UI.updateFinds(Save.data.treasures.got.length, TREASURE_LANDS.length * TREASURES_PER_LAND);
  world.setOutfit(Save.data.outfit);
  refreshPill();
  refreshTodayStar();

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
      onOutfit: (o) => world.setOutfit(o),
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
    // Ten-frames: 5x2 grid of cells, dots fill left-to-right, top row first; n (0-20) uses ceil(n/10) frames.
    // The last `gone` dots are faded and crossed out (taken away). `c` = cell size in px.
    const frame = (dots, goneFrom, c) => {
      let cells = '';
      for (let i = 0; i < 10; i++) {
        let inner = '';
        if (i < dots) {
          const away = i >= goneFrom;
          inner = `<span data-dot="${away ? 'gone' : 'kept'}" style="width:${Math.round(c * 0.64)}px;height:${Math.round(c * 0.64)}px;border-radius:50%;background:#38bdf8;border:2px solid #0284c7;box-sizing:border-box;${away ? 'opacity:.3;' : ''}"></span>` +
            (away ? `<span style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#e11d48;font-size:${c - 4}px;font-weight:700;line-height:1">✕</span>` : '');
        }
        cells += `<span style="position:relative;display:flex;align-items:center;justify-content:center;width:${c}px;height:${c}px;box-sizing:border-box;border:1px solid #bae6fd;background:#f8fdff">${inner}</span>`;
      }
      return `<span style="display:inline-grid;grid-template-columns:repeat(5,${c}px);border:2px solid #7dd3fc;border-radius:8px;overflow:hidden;background:#7dd3fc">${cells}</span>`;
    };
    const frames = (n, gone = 0, c = 22, label = '') => {
      n = Math.max(0, Math.min(n, 20));
      gone = Math.max(0, Math.min(gone, n));
      let out = '';
      for (let r = 0; r === 0 || r < n; r += 10) out += frame(Math.max(0, Math.min(10, n - r)), n - gone - r, c);
      const aria = label || `ten-frame showing ${n}${gone ? `, ${gone} crossed out` : ''}`;
      return `<span role="img" aria-label="${aria}" style="display:inline-flex;flex-wrap:wrap;justify-content:center;gap:8px;max-width:100%;margin:3px">${out}</span>`;
    };
    if (npcId === 'elsa' && round.visual && round.visual.kind === 'counton') {
      // Ice number line: start number highlighted, a hop arc per count-on, "?" where the last hop lands.
      const { start, hop } = round.visual;
      const lo = Math.max(0, Math.min(start - 1, 13)), W = 43, X = (n) => 22 + (n - lo) * W;
      let svg = `<svg viewBox="0 0 352 140" width="100%" style="max-width:352px;display:block;margin:0 auto" role="img" aria-label="number line: start at ${start}, count on ${hop}">` +
        `<rect x="4" y="88" width="344" height="12" rx="6" fill="#bae6fd" stroke="#38bdf8" stroke-width="2"/>`;
      for (let n = lo; n <= lo + 7; n++) {
        const x = X(n), isStart = n === start, isEnd = n === start + hop;
        svg += `<line x1="${x}" y1="86" x2="${x}" y2="102" stroke="#0284c7" stroke-width="2"/>`;
        if (isStart) svg += `<circle cx="${x}" cy="94" r="17" fill="#0284c7" stroke="#fff" stroke-width="2"/><text x="${x}" y="101" text-anchor="middle" font-size="20" font-weight="800" fill="#fff">${n}</text>`;
        else if (isEnd) svg += `<circle cx="${x}" cy="94" r="17" fill="#fde68a" stroke="#f59e0b" stroke-width="3"/><text x="${x}" y="102" text-anchor="middle" font-size="22" font-weight="800" fill="#92400e">?</text>`;
        else svg += `<text x="${x}" y="126" text-anchor="middle" font-size="19" font-weight="700" fill="#0c4a6e">${n}</text>`;
      }
      for (let i = 0; i < hop; i++) {
        const x1 = X(start + i) + (i === 0 ? 14 : 3), x2 = X(start + i + 1) - 3, mx = (x1 + x2) / 2;
        svg += `<path d="M${x1} 82 Q${mx} 28 ${x2} 80" fill="none" stroke="#e11d48" stroke-width="4" stroke-linecap="round"/>` +
          `<path d="M${x2 - 8} 66 L${x2} 80 L${x2 + 5} 65" fill="none" stroke="#e11d48" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>` +
          `<text x="${mx}" y="38" text-anchor="middle" font-size="17" font-weight="800" fill="#e11d48">+1</text>`;
      }
      return svg + '</svg>';
    }
    if (npcId === 'elsa' && round.visual && round.visual.kind === 'doubles') {
      const { n, style } = round.visual;
      if (style === 'frames') return `<div style="text-align:center;line-height:1.6">${frames(n, 0, 26)}<div style="font-size:30px">➕</div>${frames(n, 0, 26)}</div>`;
      const side = `<span style="display:inline-flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:2px;min-width:104px;max-width:128px;padding:8px;border:3px solid #7dd3fc;border-radius:16px;background:#f0f9ff;font-size:34px;line-height:1.1">${'<span>❄️</span>'.repeat(n)}</span>`;
      return `<div role="img" aria-label="${n} snowflakes on each side" style="display:flex;align-items:center;justify-content:center;gap:8px">${side}<span style="font-size:30px">➕</span>${side}</div>`;
    }
    if (npcId === 'elsa' && round.visual && round.visual.tens != null) {
      // Tens and ones: each ten is one full frame, ones in one partial frame; smaller cells, frames wrap.
      const { tens, ones } = round.visual;
      return `<div role="img" aria-label="ten-frames showing ${tens} tens and ${ones} ones" style="display:flex;flex-wrap:wrap;justify-content:center;gap:6px;max-width:100%">` +
        frame(10, 10, 17).repeat(tens) + (ones > 0 ? frame(ones, ones, 17) : '') + '</div>';
    }
    if (npcId === 'elsa' && round.visual && round.visual.parts) {
      return `<div style="text-align:center">` +
        round.visual.parts.map((n) => frames(n)).join('<div style="font-size:26px">➕</div>') + '</div>';
    }
    if (npcId === 'elsa' && round.visual) {
      const { a, b } = round.visual;
      const isMinus = round.visual.op ? round.visual.op === '-'
        : (/−|-/.test(round.prompt) && !/\+/.test(round.prompt));
      // Take-away: one group where the last b dots are visibly removed.
      if (isMinus && b > 0) return `<div style="text-align:center;line-height:1.6">${frames(a, b)}</div>`;
      return `<div style="text-align:center;line-height:1.6">${frames(a)}` +
        `<div style="font-size:30px">${isMinus ? '➖' : '➕'}</div>${b > 0 ? frames(b) : '<span style="font-size:34px">❓</span>'}</div>`;
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
    const tileRound = round.spell || round.build; // letter or word tiles instead of choice buttons
    let choices = round.sort || tileRound ? [] : round.choices;
    if (misses >= 2 && !round.sort && !tileRound) {
      const other = round.choices.find((c) => c !== round.answer);
      choices = other ? [round.answer, other] : [round.answer];
    }
    // Sort rounds have no choice buttons; they finish via the bins ('__sortdone').
    const { arr, correctId } = round.sort ? { arr: [], correctId: '__sortdone' } : tileRound ? { arr: [], correctId: '__spelldone' } : shuffledChoices(choices, round.answer);
    // Read the choices aloud for clock + plant quests (not Belle: reading is the skill).
    let voiceText = round.say || round.prompt;
    if ((npcId === 'cinderella' || npcId === 'rapunzel') && !round.sort) {
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
        tiles: round.tiles,
        bigWord: round.show || null, // Belle spelling: the word with its blanks
        spell: round.spell ? { ...round.spell, hint: round.hint } : null, // Belle spelling: letter-tile builder instead of choice buttons
        build: round.build ? { ...round.build, hint: round.hint } : null, // Belle dictation: word-tile builder
        sort: round.sort,
        princessId: npcId,
        voiceText,
        replayText: round.replay || null, // Belle sentences: 🔊 reads the sentence
        exactVoice: true, // read the actual question aloud, not a generic MP3
      },
      (pickedId, sortHint) => {
        if (pickedId === '__spellwrong') {
          // Wrong letter: it wiggles and is not placed; count it like a wrong pick, never reveal.
          misses++;
          SoundFX.pop();
          Narrator.speakExact(npcId, (sortHint && sortHint.say) || round.hintSay || round.hint); // dictation tier 3 names the capital / end-mark rule
        } else if (pickedId === '__sortwrong') {
          // Wrong bin: the item stays; count it for the ladder but never reveal.
          misses++;
          Narrator.speakExact(npcId, sortHint || round.hint);
        } else if (pickedId === correctId) {
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
          // Spelling rounds speak the word (hintSay) but never show it.
          Narrator.speakExact(npcId, round.hintSay || round.hint, round.sound
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

  // After the quest's own end card: celebrate any newly reached star milestones
  // (one combined card), then carry on. Unlocks are saved before the card shows,
  // so a milestone is never celebrated twice.
  function afterQuest(npcId, next) {
    const fresh = checkMilestones(Save.data);
    if (!fresh.length) { next(); return; }
    Save.save();
    const names = fresh.map((m) => m.label);
    const list = names.length > 1 ? names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1] : names[0];
    const stars = fresh[fresh.length - 1].stars;
    const sub = `You unlocked ${list}!`;
    state = 'dialogue';
    UI.setRoamUI(false);
    Narrator.speakExact(npcId, `You earned ${stars} stars! ${sub}`);
    UI.showMilestone({ title: `You earned ${stars} stars!`, sub, emoji: fresh.map((m) => m.emoji).join(' ') },
      () => { Narrator.stop(); next(); });
  }

  function refreshTodayStar() {
    try { world.setTodayStar(pickTodayStar(Save.data, today())); } catch (e) { /* decoration only */ }
  }

  function completeQuest(npcId) {
    Save.data.ladder[npcId] = recordQuest(landState(Save.data.ladder[npcId]), results);
    Save.data.lastPlay[npcId] = today();
    refreshTodayStar();
    if (Save.data.done.includes(npcId)) {
      // Practice replay: no new shard, straight to the soft stop.
      Save.save();
      SoundFX.chime();
      afterQuest(npcId, () => showRest(npcId));
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
          afterQuest(npcId, () => {
            if (NPC_IDS.every((id) => Save.data.done.includes(id))) runFinale();
            else showRest(npcId);
          });
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
