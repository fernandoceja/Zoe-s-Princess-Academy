import React, { useState, useEffect, useRef } from 'react';
import {
  createWorld,
  SoundFX,
  Narrator,
  setLang,
  Input,
  installAudioCare,
  isIOS,
  canBypassSilentSwitch,
  startPadNav,
} from './engine-dom.js';
import {
  PRINCESSES,
  NPC_ORDER,
  QUESTS,
  WEEK,
  revealLines,
  BELLE_CLIP_DIR,
  setSchoolWords,
  setWeek,
  Save,
  buildRounds,
} from './engine-core.js';
import {
  todayKey,
  collectTreasure,
  rolloverTreasures,
  treasuresGotToday,
  landTreasureCount,
  TREASURES_PER_LAND,
  findsTotal,
  findsToday,
  TREASURE_LAND_NAMES,
  awardRowStar,
  ALL_SECRETS,
  foundSecret,
  createSecretTracker,
  clockLine,
  doublesLine,
  rhymeLine,
  shapeLine,
  storyLine,
  sentenceLine,
  tallyLine,
  wordLine,
  plantLine,
  spellLine,
} from './engine-core.js';
import { builtSlotIds, openLandIds, today, shouldRunFinale, landState } from './engine-core.js';
import { startSpellTest, newTestLog, noteWrong, finishRound, recordSpellTest, readBackLines, CROWN_STARS } from './flow/spelltest.js';
import {
  createQuestbook,
  roundView,
  pick,
  nextRound,
  praiseLine,
  sortFirstLine,
} from './flow/questbook.js';
import { voiceText } from './flow/voice.js';
import { visualHtml } from './flow/visuals.js';
import {
  NPC_TO_LAND,
  questStart,
  roundsFor,
  restCard,
  questComplete,
  todayStarTarget,
  afterQuestCard,
  nextAfterQuest,
  kingdomsToAnnounce,
  markKingdomsSeen,
  kingdomCard,
} from './flow/outcomes.js';

import { HUD } from './components/HUD';
import { KingdomMap } from './components/KingdomMap';
import { followLine, followSay, arrivedLine } from './flow/kingdommap.js';
import { scootPlan, withBonus, expectedArrival, legLine, legSay, chipText, SCOOT_TEXT, LANTERN_TOTAL } from './flow/lanterns.js';
import { TitleModal } from './components/TitleModal';
import { spoken } from './flow/screens.js';
import { TutorialModal } from './components/TutorialModal';
import { DialogueModal } from './components/DialogueModal';
import { ChallengeModal, Feedback } from './components/ChallengeModal';
import { CelebrationModal } from './components/CelebrationModal';
import { PauseMenu } from './components/PauseMenu';
import { WardrobeModal } from './components/WardrobeModal';
import { TreasureBookModal } from './components/TreasureBookModal';
import { ParentCorner, type WeekForm } from './components/ParentCorner';
import { applyWeek, resetWeek, applyWords } from './flow/parent.js';
import { VirtualJoystick } from './components/VirtualJoystick';
import { PrincessId } from './types';

const NPC_IDS = NPC_ORDER as PrincessId[];

// Let the star burst and happy hop play out before a full-screen card covers the world (main.js CELEBRATE_VIEW_MS).
const CELEBRATE_VIEW_MS = 1800;

type Phase = 'title' | 'tutorial' | 'roam' | 'scoot' | 'dialogue' | 'challenge' | 'celebrate' | 'finale';

interface Dialogue {
  id: number;
  npcId: PrincessId;
  kind: 'greeting' | 'praise';
  lines: string[];
  actionLabel?: string;
  secondaryLabel?: string;
  onSecondary?: () => void;
  onDone: () => void;
}

interface Card {
  kind: 'celebrate' | 'finale' | 'milestone' | 'rest';
  title: string;
  sub: string;
  emoji?: string;
  say?: string;
  voice?: string;
  actionLabel?: string;
  onContinue: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
}

export const App: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<any>(null);

  // The quest state lives in one plain object (src/flow/questbook.js). React state only re-renders.
  const qb = useRef<any>(null);
  const serialRef = useRef(0);
  const dialogueSerial = useRef(0);
  // Refs for the world hooks, which are created once at boot and must see the current phase.
  const phaseRef = useRef<Phase>('title');
  const pausedRef = useRef(false);
  // The princess Zoe is near, as the world reports it (the HUD talk button uses it, as E and tapping do).
  const nearNPCRef = useRef<PrincessId | null>(null);

  // Core Game State
  const [gameState, setGameStateRaw] = useState<Phase>('title');
  const setPhase = (p: Phase) => {
    phaseRef.current = p;
    setGameStateRaw(p);
  };

  const [paused, setPaused] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const scootRef = useRef<any>(null);   // B4 lantern scoot: { plan, i } while she walks Jasmine's lanterns
  const [scootChip, setScootChip] = useState<string | null>(null);
  const [mapPlayer, setMapPlayer] = useState({ x: 0, z: 4 });
  const [pauseTab, setPauseTab] = useState<
    'menu' | 'wardrobe' | 'treasurebook' | 'tutorial' | 'parent'
  >('menu');

  const [activeNPC, setActiveNPC] = useState<PrincessId | null>(null);
  const [interactPrompt, setInteractPrompt] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [todayStar, setTodayStar] = useState<PrincessId | undefined>(undefined);

  // Quest view state (the flow decides; these only draw it)
  const [view, setView] = useState<any>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [questStep, setQuestStep] = useState<{ current: number; total: number } | undefined>(undefined);
  const [dialogue, setDialogue] = useState<Dialogue | null>(null);
  const [card, setCard] = useState<Card | null>(null);

  // Progress State
  const [stars, setStars] = useState(0);
  const [doneLands, setDoneLands] = useState<string[]>([]);
  const [treasuresToday, setTreasuresToday] = useState(0);
  const [treasuresTotal, setTreasuresTotal] = useState(50);
  const [unlockedMilestones, setUnlockedMilestones] = useState<string[]>([]);
  const [currentOutfit, setCurrentOutfit] = useState<any>({});
  const [foundSecrets, setFoundSecrets] = useState<string[]>([]);
  const [muted, setMuted] = useState(false);
  const [ladderState, setLadderState] = useState<Record<string, any>>({});
  const [schoolWords, setSchoolWordsState] = useState<string[]>([]);

  // Secret tracker ref
  const secretTrackerRef = useRef(createSecretTracker());

  // A pop-up message is read aloud too (Q2). `say`: custom spoken words, or false when something else is already speaking.
  const showToast = (msg: string, duration = 3000, say?: string | false) => {
    if (say !== false) Narrator.speakText(say || spoken(msg), { pitch: 1.15, rate: 0.95 });
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? null : prev));
    }, duration);
  };

  // Reveal secrets & sticker rewards (main.js revealSecret)
  const revealSecret = (id: string) => {
    const def = ALL_SECRETS.find((x: any) => x.id === id);
    if (!def) return;
    let line: string;
    if (id === 'clock') {
      const c = clockLine();
      if (worldRef.current) worldRef.current.setClockTime(c.h, c.m);
      line = c.say;
    } else if (id === 'icetwins') line = doublesLine().say;
    else if (id === 'shellrhyme') line = rhymeLine().say;
    else if (id === 'shapestones') line = shapeLine().say;
    else if (id === 'storylanterns') line = storyLine().say;
    else if (id === 'sentenceflags') line = sentenceLine().say;
    else if (id === 'tallymarks') line = tallyLine().say;
    else if (id === 'wordgarden') line = wordLine().say;
    else if (id === 'bookstack') {
      const sp = spellLine(WEEK.spelling);
      line = sp.say;
      showToast(`📚 ${sp.show}`, 3000, false);
    } else line = plantLine().say;

    SoundFX.chime();
    Narrator.speakExact(def.npc, line);
    if (id !== 'bookstack') showToast(`${def.emoji} ${line}`, 3000, false);

    if (foundSecret(Save.data, id)) {
      Save.save();
      setFoundSecrets([...Save.data.secrets]);
      setTimeout(() => {
        showToast(`New sticker: ${def.label}! ${def.emoji}`);
      }, 2600);
    }
  };

  // Toggle Mute
  const handleToggleMute = () => {
    SoundFX.pop();
    const newMuted = !muted;
    Narrator.setMuted(newMuted);
    Save.data.muted = newMuted;
    Save.save();
    setMuted(newMuted);
  };

  // Toggle Pause
  const handleTogglePause = () => {
    if (phaseRef.current !== 'roam' && phaseRef.current !== 'scoot') {
      // main.js togglePause: no pause during a quest or a talk (toast lasts 2200 ms there).
      showToast('Finish talking first, then you can pause! ⏸️', 2200, false);   // she is mid-sentence: do not cut her off
      return;
    }
    const nextPaused = !pausedRef.current;
    pausedRef.current = nextPaused;
    setPaused(nextPaused);
    setPauseTab('menu');
    // The world keeps running under the pause menu (it delivers the gamepad resume key); see the cover rule at boot.
    if (worldRef.current) worldRef.current.setInputEnabled(!nextPaused);
    if (nextPaused) {
      Narrator.stop();
    }
  };

  // ---------- quest flow ----------

  // Show the flow's next round (main.js startRound): the view carries the choices, narrowing and voice.
  const showRound = (npcId: PrincessId) => {
    const q = qb.current;
    if (!q) return;
    const v = roundView(q);
    const voice = voiceText(npcId, v.round, v.choices) + (v.round.sort ? ' ' + sortFirstLine(v.round.sort) : '');
    serialRef.current += 1;
    setView({ ...v, voiceText: voice, visualHtml: visualHtml(npcId, v.round), serial: serialRef.current });
    setFeedback(null);
    setQuestStep({ current: Math.min(q.roundIdx + 1, q.rounds.length), total: q.rounds.length });
    setPhase('challenge');
  };

  const openDialogue = (d: Omit<Dialogue, 'id'>) => {
    dialogueSerial.current += 1;
    const id = dialogueSerial.current;
    const done = d.onDone;
    const second = d.onSecondary;
    setDialogue({ ...d, id, onDone: () => { setDialogue(null); done(); }, onSecondary: second ? () => { setDialogue(null); second(); } : undefined });
  };

  // Soft stop after one quest: rest, or one more right away (main.js showRest).
  const showRest = (npcId: PrincessId) => {
    const r = restCard(npcId);
    setPhase('dialogue');
    setInteractPrompt(null);
    setCard({
      kind: 'rest',
      title: r.title,
      sub: r.sub,
      say: r.speak,
      voice: npcId,
      actionLabel: 'Rest 💤',
      onContinue: () => { setCard(null); endToRoam(); },
      secondaryLabel: 'One more? ✨',
      onSecondary: () => { setCard(null); startQuest(npcId, { again: true }); },
    });
  };

  // B2: the Kingdom Map. Opens only while roaming; the world pauses behind it (cover observer).
  const openMap = () => {
    if (phaseRef.current !== 'roam' || pausedRef.current || !worldRef.current) return;
    try { const p = worldRef.current.getPlayerXZ(); if (p) setMapPlayer({ x: p.x, z: p.z }); } catch (e) { /* keep the last spot */ }
    worldRef.current.setInputEnabled(false);
    setMapOpen(true);
  };
  const closeMap = () => {
    setMapOpen(false);
    worldRef.current?.setInputEnabled(true);
  };
  const pickKingdom = (npcId: string) => {
    closeMap();
    if (!PRINCESSES[npcId]) return;
    let lit = false;
    try { lit = !!worldRef.current?.showTrail(npcId); } catch (e) { /* decoration only */ }
    const name = PRINCESSES[npcId].landName;
    if (lit) showToast(followLine(name), 3500, followSay(name));
    else showToast(`${name} is right here!`, 3000, spoken(`${name} is right here!`));
  };

  // Talk to a princess: the same guard as js/main.js onInteractRequest. Used by E, tapping her and the HUD button.
  const requestInteract = (npcId: string | null) => {
    if (phaseRef.current !== 'roam' || pausedRef.current) return;
    if (!npcId || !QUESTS[npcId]) return;
    startQuest(npcId as PrincessId);
  };

  // ---- B4 lantern scoot (Jasmine): walk to each lantern, answer one round, the lantern lights. The graded quest stays five rounds. ----
  const resetLanterns = () => { for (let i = 0; i < LANTERN_TOTAL; i++) worldRef.current?.gardenLantern?.(i, 'reset'); };
  const beginLeg = (i: number) => {
    const w = worldRef.current, sc = scootRef.current;
    if (!w || !sc) return;
    const step = sc.plan.steps[i];
    sc.i = i;
    setPhase('scoot');
    setView(null);
    setFeedback(null);
    setDialogue(null);
    w.unfocus();
    w.setInputEnabled(true);
    if (step.lantern != null) w.gardenLantern(step.lantern, 'next');
    try { if (step.lantern != null) w.showTrailTo(expectedArrival(step), sc.spots[step.lantern]); else w.showTrail('jasmine'); } catch (e) { /* decoration only */ }
    setScootChip(chipText(step, sc.plan.n));
    showToast(legLine(step), 3500, legSay(step));
  };
  const beginScoot = (): boolean => {
    const w = worldRef.current, q = qb.current;
    if (!w || !q || q.test || !w.gardenLanternXZ) return false;
    const spots = [];
    for (let i = 0; i < LANTERN_TOTAL; i++) { const s = w.gardenLanternXZ(i); if (!s) return false; spots.push(s); }
    const tier = landState(Save.data.ladder.jasmine).tier;
    const plan = scootPlan(tier, spots, w.getPlayerXZ());
    q.rounds = withBonus(q.rounds, () => buildRounds('jasmine', Math.random, { tier, review: [] }), plan.total);
    if (q.rounds.length < plan.total) return false;   // could not make enough rounds: play the ordinary quest
    scootRef.current = { plan, spots, i: 0 };
    for (let i = 0; i < LANTERN_TOTAL; i++) w.gardenLantern(i, 'off');
    beginLeg(0);
    return true;
  };
  const arriveLeg = () => {
    if (!scootRef.current || phaseRef.current !== 'scoot') return;
    worldRef.current?.clearTrail();
    worldRef.current?.setInputEnabled(false);
    setScootChip(null);
    setToastMsg(null);
    showRound('jasmine');
  };
  const endScoot = () => {
    scootRef.current = null;
    setScootChip(null);
    resetLanterns();
    worldRef.current?.clearTrail();
  };
  const stopScoot = () => { endScoot(); Narrator.stop(); endToRoam(); };

  // Start Quest with NPC (main.js startQuest)
  const startQuest = (npcId: PrincessId, opts: { again?: boolean } = {}) => {
    const d = questStart(Save.data, npcId, opts, today());
    setActiveNPC(npcId);
    setPhase('dialogue');
    if (worldRef.current) {
      worldRef.current.clearTrail?.();
      worldRef.current.setInputEnabled(false);
      worldRef.current.focus(npcId);
    }
    setInteractPrompt(null);
    if (d.kind === 'rest') {
      if (npcId === 'belle') {
        // M3: the Thursday test works any day, so Belle offers it even when she has rested today.
        openDialogue({
          npcId,
          kind: 'greeting',
          lines: ['Want to try your Thursday practice test?'],
          actionLabel: 'Thursday test 📝',
          secondaryLabel: 'Rest 💤',
          onSecondary: () => showRest(npcId),
          onDone: () => beginSpellTest(),
        });
        return;
      }
      showRest(npcId);
      return;
    }
    qb.current = createQuestbook(npcId, roundsFor(Save.data, npcId));
    openDialogue({
      npcId,
      kind: d.dialogue.kind,
      lines: d.dialogue.lines,
      actionLabel: d.practice ? undefined : 'Start Quest! ⭐',
      secondaryLabel: npcId === 'belle' ? 'Thursday test 📝' : undefined,
      onSecondary: npcId === 'belle' ? () => beginSpellTest() : undefined,
      onDone: () => { if (npcId === 'jasmine' && beginScoot()) return; showRound(npcId); },
    });
  };

  // ---- Thursday practice test (M3): the questbook runs it with qb.test set; no ladder, review queue or rest rule is touched. ----
  const beginSpellTest = () => {
    const tier = landState(Save.data.ladder.belle).tier;
    const q = createQuestbook('belle', startSpellTest(Save.data, tier));
    q.test = { log: newTestLog() };
    qb.current = q;
    setActiveNPC('belle');
    showRound('belle');
  };

  // The test is over: file the results, Belle reads the words back, then the test crown (+3 stars the first time for that week).
  const finishSpellTest = () => {
    const q = qb.current;
    if (!q || !q.test) return;
    const { firstCrown } = recordSpellTest(Save.data, q.test.log, today());
    if (firstCrown) Save.data.stars += CROWN_STARS;
    Save.save();
    setStars(Save.data.stars);
    setView(null);
    setFeedback(null);
    const rounds = q.rounds;
    openDialogue({
      npcId: 'belle',
      kind: 'praise',
      lines: readBackLines(rounds),
      onDone: () => {
        SoundFX.chime();
        setPhase('dialogue');
        setCard({
          kind: 'milestone',
          title: 'Test crown! 👑',
          sub: firstCrown ? `You finished your test! ⭐ +${CROWN_STARS} stars` : 'You finished your test again! Great practice!',
          emoji: '👑',
          say: firstCrown ? `You earned a test crown! Plus ${CROWN_STARS} stars!` : 'You finished your test again! Great practice!',
          voice: 'belle',
          onContinue: () => {
            setCard(null);
            const m = afterQuestCard(Save.data, 'belle');
            if (!m) { endToRoam(); return; }
            Save.save();
            setUnlockedMilestones([...Save.data.milestones]);
            setCard({ kind: 'milestone', title: m.title, sub: m.sub, emoji: m.emoji, say: m.say, voice: 'belle', onContinue: () => { setCard(null); endToRoam(); } });
          },
        });
      },
    });
  };

  // A pick from the challenge view goes to the flow, which decides what the view shows next.
  const handlePick = (pickedId: string, info?: any) => {
    const q = qb.current;
    if (!q || !view) return;
    const npcId = q.npcId as PrincessId;
    const round = view.round;
    // A test never gives per-word stars or shards: pick() works on a scratch save.
    const kind = pick(q, pickedId, view.correctId, q.test ? { stars: 0, done: ['belle'], shards: { belle: 0 } } : Save.data);

    if (q.test && kind === 'spellwrong') noteWrong(q.test.log, info && info.index, info && info.tile);
    if (q.test && kind === 'correct') finishRound(q.test.log, round, today());

    if (kind === 'correct') {
      if (!q.test) {
        Save.save();
        setStars(Save.data.stars);
      }
      SoundFX.chime();
      const praise = praiseLine();
      Narrator.speakExact(npcId, praise);
      setFeedback({ kind, pickedId, correctId: view.correctId, message: q.test ? `Lovely! ${praise}` : `⭐ +1 star! ${praise}` });
    } else if (kind === 'reveal') {
      // Third miss: show the answer gently and count it as done (no star).
      SoundFX.pop();
      const { shown, say } = revealLines(round);
      Narrator.speakExact(npcId, say);
      setFeedback({ kind, pickedId, correctId: view.correctId, message: shown });
    } else if (kind === 'retry') {
      // Gentle retry: never reveal the answer, never penalize.
      SoundFX.pop();
      Narrator.speakExact(
        npcId,
        round.hintSay || round.hint,
        round.sound ? () => Narrator.playClip(BELLE_CLIP_DIR + round.sound) : undefined
      );
      setFeedback({ kind, pickedId, correctId: null, message: round.hint });
    } else if (kind === 'spellwrong') {
      SoundFX.pop();
      const say = (info && info.say) || round.hintSay || round.hint;
      Narrator.speakExact(npcId, say);
      setFeedback({ kind, pickedId, correctId: null, message: (info && info.say) || round.hint });
    } else if (kind === 'sortwrong') {
      const say = info || round.hint;
      Narrator.speakExact(npcId, say);
      setFeedback({ kind, pickedId, correctId: null, message: say });
    }
  };

  // Next after a locked round (main.js: revealAnswer's onNext = startRound or nextRound).
  const handleAdvance = () => {
    const q = qb.current;
    if (!q || !feedback) return;
    const f = feedback;
    setFeedback(null);
    SoundFX.pop();
    Narrator.stop();
    if (f.kind === 'retry') {
      showRound(q.npcId);
      return;
    }
    const sc = scootRef.current;
    if (sc) {
      const step = sc.plan.steps[sc.i];
      if (step && step.lantern != null) worldRef.current?.gardenLantern(step.lantern, 'lit');
      SoundFX.chime();
      if (nextRound(q)) { endScoot(); completeQuest(); } else beginLeg(sc.i + 1);
      return;
    }
    if (nextRound(q)) { if (q.test) finishSpellTest(); else completeQuest(); }
    else showRound(q.npcId);
  };

  // The quest is over (main.js completeQuest). Saves here, as main.js does on each path.
  const completeQuest = () => {
    const q = qb.current;
    if (!q) return;
    const npcId = q.npcId as PrincessId;
    const out = questComplete(Save.data, npcId, q.results, today());
    Save.save();
    setStars(Save.data.stars);
    setDoneLands([...Save.data.done]);
    setLadderState({ ...Save.data.ladder });
    if (out.todayStar !== undefined) {
      try { worldRef.current?.setTodayStar(out.todayStar); } catch (e) { /* decoration only */ }
    }

    if (out.kind === 'practice') {
      // Practice replay: no new shard, straight to the soft stop.
      SoundFX.chime();
      afterQuest(npcId, () => afterQuestNext(npcId, true));
      return;
    }

    setPhase('celebrate');
    worldRef.current?.setNPCState(npcId, 'done');
    worldRef.current?.celebrate(NPC_TO_LAND[npcId]);
    const P = PRINCESSES[npcId];
    setTimeout(() => setCard({
      kind: 'celebrate',
      title: `${P.name}'s land is glowing!`,
      sub: `You earned the ${P.landName} star shard! ⭐ +3 stars`,
      onContinue: () => {
        setCard(null);
        openDialogue({
          npcId,
          kind: 'praise',
          lines: QUESTS[npcId].complete,
          onDone: () => afterQuest(npcId, () => afterQuestNext(npcId, false)),
        });
      },
    }), CELEBRATE_VIEW_MS);
  };

  // Milestone card after a quest, saved before it shows (main.js afterQuest).
  const afterQuest = (npcId: PrincessId, next: () => void) => {
    const m = afterQuestCard(Save.data, npcId);
    if (!m) { next(); return; }
    Save.save();
    setUnlockedMilestones([...Save.data.milestones]);
    setPhase('dialogue');
    setCard({
      kind: 'milestone',
      title: m.title,
      sub: m.sub,
      emoji: m.emoji,
      say: m.say,
      voice: npcId,
      onContinue: () => { setCard(null); next(); },
    });
  };

  // After the quest's own end: the finale when every kingdom is restored, else the rest card.
  const afterQuestNext = (npcId: PrincessId, practice: boolean) => {
    const nx = nextAfterQuest(Save.data, npcId, { practice, npcIds: NPC_IDS, builtCount: builtSlotIds().length });
    if (nx.kind === 'finale') runFinale();
    else if (!showKingdomCard(() => showRest(npcId))) showRest(npcId);
  };

  // Grand finale (main.js runFinale).
  const runFinale = () => {
    setPhase('finale');
    worldRef.current?.setCastleCrown(true);
    NPC_IDS.forEach((id, i) => setTimeout(() => worldRef.current?.celebrate(NPC_TO_LAND[id]), i * 120));
    setTimeout(() => setCard({
      kind: 'finale',
      title: 'The Starlight Crown is Restored! 👑',
      sub: 'All ten lands are glowing together across the kingdom! You did it, Princess Zoe!',
      onContinue: () => { setCard(null); endToRoam(); },
    }), CELEBRATE_VIEW_MS);
  };

  const endToRoam = () => {
    qb.current = null;
    setActiveNPC(null);
    setView(null);
    setFeedback(null);
    setDialogue(null);
    setPhase('roam');
    if (worldRef.current) {
      worldRef.current.setInputEnabled(true);
      worldRef.current.unfocus();
    }
  };

  // The New kingdoms card (Q6). Returns true when a card was shown; `then` runs when it is dismissed.
  const showKingdomCard = (then: (() => void) | null): boolean => {
    const k = kingdomsToAnnounce(Save.data);
    if (!k) return false;
    const c = kingdomCard(k.first, k.names);
    setCard({
      kind: 'milestone',
      title: c.title,
      sub: c.sub,
      emoji: c.emoji,
      onContinue: () => {
        markKingdomsSeen(Save.data);
        Save.save();
        setCard(null);
        if (then) then();
      },
    });
    return true;
  };

  // Title -> world (main.js enterWorld).
  const enterWorld = () => {
    setPhase('roam');
    if (worldRef.current) worldRef.current.setInputEnabled(true);
    showToast('Walk to a princess and say hello! 👑', 3000, false);   // the welcome line below says it
    // New kingdoms: the big card the first time (only once she has finished a quest, Q6), a short card when a kingdom opens later.
    const k = showKingdomCard(null);
    if (isIOS() && !canBypassSilentSwitch()) {
      setTimeout(() => showToast('🔔 No sound? Flip the silent switch off and turn the volume up.', 3000, false), 2500);
    }
    const c = Input.describeControls();
    const how = c.gamepad ? 'press ✕' : c.touch ? 'tap her' : 'click her or press E';
    // After this tap's screen change, so the Title / How to Play cleanup cannot cut it off. A New kingdoms card speaks instead.
    if (!k) {
      setTimeout(() => {
        Narrator.speakText(
          `Welcome to Starlight Quest! Walk to a princess and ${how} to say hello.`,
          { pitch: 1.15, rate: 0.95 }
        );
      }, 0);
    }
  };

  // Start Adventure from Title
  const handleStartTitle = () => {
    SoundFX.ensure();
    SoundFX.chime();
    Save.data.started = true;
    Save.save();

    let seen = false;
    try {
      seen = !!window.localStorage.getItem('zsq_tutorial_seen_v1');
    } catch (e) {}

    if (seen) {
      enterWorld();
    } else {
      setPhase('tutorial');
    }
  };

  // 1. Initialize Game & 3D World (boot once; no StrictMode in main.tsx)
  useEffect(() => {
    Save.load();
    const day = todayKey();
    let coverObserver: MutationObserver | null = null;
    rolloverTreasures(Save.data, day);
    setSchoolWords(Save.data.schoolWords);
    setWeek(Save.data.week);
    setLang(Save.data.lang === 'ES' ? 'ES' : 'EN');
    Narrator.setMuted(!!Save.data.muted);

    // Sync state from Save
    setStars(Save.data.stars || 0);
    setDoneLands(Save.data.done || []);
    setUnlockedMilestones(Save.data.milestones || []);
    setCurrentOutfit(Save.data.outfit || {});
    setFoundSecrets(Save.data.secrets || []);
    setMuted(!!Save.data.muted);
    setLadderState(Save.data.ladder || {});
    setSchoolWordsState(Save.data.schoolWords || []);

    const openLands = openLandIds();
    setTreasuresToday(findsToday(Save.data, day, openLands));
    setTreasuresTotal(findsTotal(openLands));

    try {
      const t = todayStarTarget(Save.data, today());
      if (t !== undefined) setTodayStar(t as PrincessId | undefined);
    } catch (e) {}

    // Init Input, audio care and the 3D Canvas
    Input.init();
    startPadNav();
    installAudioCare();
    Input.onGamepadChange = (connected: boolean) => {
      showToast(connected
        ? '🎮 Controller connected! Left stick walks, ✕ talks.'
        : '🎮 Controller disconnected.', 3000, false);
    };

    if (containerRef.current) {
      const world = createWorld(containerRef.current, {
        onTrailArrived(npcId: string) {
          const sc = scootRef.current;
          if (sc && phaseRef.current === 'scoot') { if (npcId === expectedArrival(sc.plan.steps[sc.i])) arriveLeg(); return; }
          if (phaseRef.current !== 'roam' || !PRINCESSES[npcId]) return;
          const nm = PRINCESSES[npcId].landName;
          showToast(arrivedLine(nm), 3000, spoken(arrivedLine(nm)));
        },
        onNearNPC(npcId: string) {
          nearNPCRef.current = npcId && PRINCESSES[npcId] ? (npcId as PrincessId) : null;
          if (phaseRef.current !== 'roam' || pausedRef.current || !npcId || !PRINCESSES[npcId]) {
            setInteractPrompt(null);
            return;
          }
          const c = Input.describeControls();
          const name = PRINCESSES[npcId].name;
          setInteractPrompt(c.gamepad
            ? `💬 Press ✕ to talk to ${name} ✨`
            : c.touch
              ? `💬 Tap ${name} to talk ✨`
              : `💬 Click ${name} (or press E) ✨`);
        },
        onInteractRequest(npcId: string) {
          requestInteract(npcId);
        },
        onPauseRequest() {
          handleTogglePause();
        },
        onWorldTap() {
          if (phaseRef.current !== 'roam' || pausedRef.current) return;
          SoundFX.chime();
        },
        onGateTap() {
          if (phaseRef.current !== 'roam' || pausedRef.current) return;
          SoundFX.chime();
          showToast('A new kingdom will open here soon! ✨');
        },
        onSecretTap(part: string) {
          if (phaseRef.current !== 'roam' || pausedRef.current) return;
          const id = secretTrackerRef.current.tap(part, Date.now());
          if (id) revealSecret(id);
        },
        treasuresGot() {
          return treasuresGotToday(Save.data, todayKey());
        },
        onTreasure(kind: string, landId: string, id: string) {
          const dayKey = todayKey();
          if (!collectTreasure(Save.data, id, kind, dayKey)) return;
          Save.save();
          SoundFX.chime();
          const found = `You found ${kind === 'seaglass' ? 'a piece of sea glass' : kind === 'anchor' ? 'an anchor' : `a ${kind}`}! ${landTreasureCount(Save.data, landId, dayKey)} of ${TREASURES_PER_LAND} here today ✨`;
          const rowDone = awardRowStar(Save.data, landId, dayKey);
          const rowMsg = `All ${TREASURES_PER_LAND} treasures in ${TREASURE_LAND_NAMES[landId]}! +1 ⭐`;
          // One voice line for both messages, so the second does not cut the first.
          showToast(found, 3000, rowDone ? spoken(found, `All ${TREASURES_PER_LAND} treasures in ${TREASURE_LAND_NAMES[landId]}! Plus one star.`) : undefined);
          if (rowDone) {
            // Same award path as a won round: +1 star, save, counter.
            Save.data.stars += 1;
            Save.save();
            setStars(Save.data.stars);
            setTimeout(() => showToast(rowMsg, 3000, false), 1600);
          }
          setTreasuresToday(findsToday(Save.data, dayKey, openLandIds()));
        },
      });

      worldRef.current = world;
      world.setInputEnabled(false);

      // Restore world saved state
      for (const id of Save.data.done || []) {
        if (NPC_IDS.includes(id as PrincessId)) {
          world.setNPCState(id, 'done');
        }
      }
      world.setCastleCrown(
        shouldRunFinale(Save.data.done, NPC_IDS, builtSlotIds().length)
      );
      world.setOutfit(Save.data.outfit);
      // The guiding star over today's land, as main.js boot does (refreshTodayStar, main.js:180).
      try { world.setTodayStar(todayStarTarget(Save.data, today())); } catch (e) { /* decoration only */ }

      // Stop drawing the 3D world while a full-screen card covers it (saves battery, keeps the phone cool).
      // The pause menu is left out on purpose: it is translucent and the world loop delivers its resume key.
      // Same selector and rule as js/main.js (155-168).
      const COVER_SELECTOR = '.zsq-title, .zsq-tutorial, .zsq-modal-wrap, .zsq-celebrate, .zsq-finale, .zsq-parent-wrap';
      const syncWorldCover = () => {
        if (!worldRef.current) return;
        const covered = Array.from(document.querySelectorAll(COVER_SELECTOR))
          .some((n) => !n.classList.contains('zsq-hidden') && !n.classList.contains('zsq-leaving'));
        if (covered) worldRef.current.pause(); else worldRef.current.resume();
      };
      coverObserver = new MutationObserver(syncWorldCover);
      coverObserver.observe(document.getElementById('root') || document.body, {
        subtree: true, childList: true, attributes: true, attributeFilter: ['class'],
      });
      syncWorldCover();
    }

    return () => {
      if (coverObserver) coverObserver.disconnect();
      if (worldRef.current) {
        worldRef.current.dispose();
      }
    };
  }, []);

  // Parent Corner editors: the flow saves, the App keeps its copy of the class words in state.
  const handleSaveCustomWords = (input: string) => {
    const words = applyWords(Save.data, input);
    setSchoolWordsState(words);
    return words;
  };
  const handleSaveWeek = (form: WeekForm) => applyWeek(Save.data, form);
  const handleResetWeek = () => resetWeek(Save.data);

  // Wardrobe Outfit Changed
  const handleSelectOutfit = (newOutfit: any) => {
    Save.data.outfit = newOutfit;
    Save.save();
    setCurrentOutfit(newOutfit);
    if (worldRef.current) {
      worldRef.current.setOutfit(newOutfit);
    }
  };

  // Challenge dots: 5 per quest (a missed round may come back), as main.js startRound.
  // A quest is always 5 rounds; the Thursday test has one per spelling word plus the sentence (M3).
  const progressTotal = qb.current && qb.current.test ? qb.current.rounds.length : 5;
  const progress = { current: Math.min((qb.current ? qb.current.roundIdx : 0) + 1, progressTotal), total: progressTotal };

  return (
    <div className="relative w-screen h-screen overflow-hidden select-none bg-[#1a1033] font-['Nunito',sans-serif]">
      {/* 3D Three.js Canvas Container */}
      <div ref={containerRef} className="absolute inset-0 z-0" />

      {/* Floating HUD: the top bar stays up through dialogue and challenges (main.js keeps it; only the joystick is roam-only) */}
      {gameState !== 'title' && gameState !== 'tutorial' && !paused && (
        <>
          <HUD
            stars={stars}
            doneCount={doneLands.length}
            totalLands={NPC_ORDER.length}
            treasuresToday={treasuresToday}
            treasuresTotal={treasuresTotal}
            activeNPC={activeNPC}
            questStep={activeNPC ? questStep : undefined}
            interactPrompt={interactPrompt}
            muted={muted}
            onToggleMute={handleToggleMute}
            onPause={handleTogglePause}
            onInteract={() => requestInteract(nearNPCRef.current)}
            todayStarNPC={todayStar}
            onOpenMap={gameState === 'roam' ? openMap : undefined}
          />
          {(gameState === 'roam' || gameState === 'scoot') && <VirtualJoystick />}
          {gameState === 'scoot' && scootChip && (
            <div className="fixed left-1/2 -translate-x-1/2 bottom-44 z-30 flex items-center gap-2 pointer-events-auto flex-wrap justify-center px-2">
              <span className="min-h-[60px] px-4 flex items-center whitespace-nowrap rounded-full bg-gold text-ink font-read font-bold text-xl border-2 border-white shadow-md">🏮 {scootChip}</span>
              <button onClick={arriveLeg} className="min-h-[60px] px-4 rounded-full bg-cream text-ink font-read font-bold text-xl border-2 border-gold shadow-md active:scale-95">{SCOOT_TEXT.ask} ✨</button>
              <button onClick={stopScoot} className="min-h-[60px] px-4 rounded-full bg-night text-cream font-read font-bold text-xl border-2 border-white shadow-md active:scale-95">{SCOOT_TEXT.stop} 🌙</button>
            </div>
          )}
        </>
      )}

      {mapOpen && (
        <KingdomMap doneIds={doneLands} todayStar={todayStar} player={mapPlayer} onPick={pickKingdom} onClose={closeMap} />
      )}

      {/* Toast Notification */}
      {toastMsg && (
        <div className="zsq-toast fixed left-1/2 transform -translate-x-1/2 z-50 pointer-events-none animate-bounce">
          <div className="bg-amber-400 text-amber-950 font-black text-sm sm:text-base px-5 py-2.5 rounded-full border-2 border-white shadow-lg">
            {toastMsg}
          </div>
        </div>
      )}

      {/* Title Modal */}
      {gameState === 'title' && (
        <TitleModal
          onStart={handleStartTitle}
          hasSeenTutorial={true}
          onOpenTutorial={() => setPhase('tutorial')}
        />
      )}

      {/* Tutorial Modal */}
      {gameState === 'tutorial' && (
        <TutorialModal
          onComplete={() => {
            try {
              window.localStorage.setItem('zsq_tutorial_seen_v1', '1');
            } catch (e) {}
            enterWorld();
          }}
        />
      )}

      {/* Dialogue Modal */}
      {dialogue && (
        <DialogueModal
          key={dialogue.id}
          npcId={dialogue.npcId}
          lines={dialogue.lines}
          kind={dialogue.kind}
          onDone={dialogue.onDone}
          actionLabel={dialogue.actionLabel}
          secondaryLabel={dialogue.secondaryLabel}
          onSecondary={dialogue.onSecondary}
        />
      )}

      {/* Challenge Modal */}
      {gameState === 'challenge' && activeNPC && view && (
        <ChallengeModal
          key={view.serial}
          npcId={activeNPC}
          view={view}
          progress={progress}
          feedback={feedback}
          onPick={handlePick}
          onAdvance={handleAdvance}
        />
      )}

      {/* Cards: land glowing, milestone, new kingdom, rest, finale */}
      {card && (
        <CelebrationModal
          kind={card.kind}
          title={card.title}
          sub={card.sub}
          emoji={card.emoji}
          say={card.say}
          voice={card.voice}
          actionLabel={card.actionLabel}
          onContinue={card.onContinue}
          secondaryLabel={card.secondaryLabel}
          onSecondary={card.onSecondary}
        />
      )}

      {/* Pause Menu & Secondary Modals */}
      {paused && (
        <>
          {pauseTab === 'menu' && (
            <PauseMenu
              onResume={handleTogglePause}
              onOpenWardrobe={() => setPauseTab('wardrobe')}
              onOpenTreasureBook={() => setPauseTab('treasurebook')}
              onOpenTutorial={() => setPauseTab('tutorial')}
              onOpenParentCorner={() => setPauseTab('parent')}
            />
          )}

          {pauseTab === 'wardrobe' && (
            <WardrobeModal
              stars={stars}
              unlockedMilestones={unlockedMilestones}
              currentOutfit={currentOutfit}
              onSelectOutfit={handleSelectOutfit}
              onBack={() => setPauseTab('menu')}
            />
          )}

          {pauseTab === 'treasurebook' && (
            <TreasureBookModal
              foundSecrets={foundSecrets}
              treasuresToday={treasuresToday}
              treasuresTotal={treasuresTotal}
              onBack={() => setPauseTab('menu')}
            />
          )}

          {pauseTab === 'tutorial' && (
            <TutorialModal onComplete={() => setPauseTab('menu')} />
          )}

          {pauseTab === 'parent' && (
            <ParentCorner
              stars={stars}
              doneLands={doneLands}
              ladderState={ladderState}
              schoolWords={schoolWords}
              onSaveWords={handleSaveCustomWords}
              onSaveWeek={handleSaveWeek}
              onResetWeek={handleResetWeek}
              onBack={() => setPauseTab('menu')}
            />
          )}
        </>
      )}
    </div>
  );
};

export default App;
