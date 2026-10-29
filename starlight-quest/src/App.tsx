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
import { builtSlotIds, openLandIds, today, shouldRunFinale } from './engine-core.js';
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
import { TitleModal } from './components/TitleModal';
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

type Phase = 'title' | 'tutorial' | 'roam' | 'dialogue' | 'challenge' | 'celebrate' | 'finale';

interface Dialogue {
  id: number;
  npcId: PrincessId;
  kind: 'greeting' | 'praise';
  lines: string[];
  actionLabel?: string;
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

  const showToast = (msg: string, duration = 3000) => {
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
      showToast(`📚 ${sp.show}`);
    } else line = plantLine().say;

    SoundFX.chime();
    Narrator.speakExact(def.npc, line);
    if (id !== 'bookstack') showToast(`${def.emoji} ${line}`);

    if (foundSecret(Save.data, id)) {
      Save.save();
      setFoundSecrets([...Save.data.secrets]);
      setTimeout(() => {
        showToast(`New sticker: ${def.label}! ${def.emoji}`);
      }, 1400);
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
    if (phaseRef.current !== 'roam') {
      // main.js togglePause: no pause during a quest or a talk (toast lasts 2200 ms there).
      showToast('Finish talking first, then you can pause! ⏸️', 2200);
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
    setDialogue({ ...d, id, onDone: () => { setDialogue(null); done(); } });
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

  // Talk to a princess: the same guard as js/main.js onInteractRequest. Used by E, tapping her and the HUD button.
  const requestInteract = (npcId: string | null) => {
    if (phaseRef.current !== 'roam' || pausedRef.current) return;
    if (!npcId || !QUESTS[npcId]) return;
    startQuest(npcId as PrincessId);
  };

  // Start Quest with NPC (main.js startQuest)
  const startQuest = (npcId: PrincessId, opts: { again?: boolean } = {}) => {
    const d = questStart(Save.data, npcId, opts, today());
    setActiveNPC(npcId);
    setPhase('dialogue');
    if (worldRef.current) {
      worldRef.current.setInputEnabled(false);
      worldRef.current.focus(npcId);
    }
    setInteractPrompt(null);
    if (d.kind === 'rest') {
      showRest(npcId);
      return;
    }
    qb.current = createQuestbook(npcId, roundsFor(Save.data, npcId));
    openDialogue({
      npcId,
      kind: d.dialogue.kind,
      lines: d.dialogue.lines,
      actionLabel: d.practice ? undefined : 'Start Quest! ⭐',
      onDone: () => showRound(npcId),
    });
  };

  // A pick from the challenge view goes to the flow, which decides what the view shows next.
  const handlePick = (pickedId: string, info?: any) => {
    const q = qb.current;
    if (!q || !view) return;
    const npcId = q.npcId as PrincessId;
    const round = view.round;
    const kind = pick(q, pickedId, view.correctId, Save.data);

    if (kind === 'correct') {
      Save.save();
      setStars(Save.data.stars);
      SoundFX.chime();
      const praise = praiseLine();
      Narrator.speakExact(npcId, praise);
      setFeedback({ kind, pickedId, correctId: view.correctId, message: `⭐ +1 star! ${praise}` });
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
    if (nextRound(q)) completeQuest();
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
    else showRest(npcId);
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

  // Title -> world (main.js enterWorld).
  const enterWorld = () => {
    setPhase('roam');
    if (worldRef.current) worldRef.current.setInputEnabled(true);
    showToast('Walk to a princess and say hello! 👑');
    // New kingdoms: the big card the first time, a short card when a kingdom opens later.
    const k = kingdomsToAnnounce(Save.data);
    if (k) {
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
        },
      });
    }
    if (isIOS() && !canBypassSilentSwitch()) {
      setTimeout(() => showToast('🔔 No sound? Flip the silent switch off and turn the volume up.'), 2500);
    }
    const c = Input.describeControls();
    const how = c.gamepad ? 'press ✕' : c.touch ? 'tap her' : 'click her or press E';
    Narrator.speakText(
      `Welcome to Starlight Quest! Walk to a princess and ${how} to say hello.`,
      { pitch: 1.15, rate: 0.95 }
    );
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
        : '🎮 Controller disconnected.');
    };

    if (containerRef.current) {
      const world = createWorld(containerRef.current, {
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
          showToast(`You found ${kind === 'seaglass' ? 'a piece of sea glass' : kind === 'anchor' ? 'an anchor' : `a ${kind}`}! ${landTreasureCount(Save.data, landId, dayKey)} of ${TREASURES_PER_LAND} here today ✨`);
          if (awardRowStar(Save.data, landId, dayKey)) {
            // Same award path as a won round: +1 star, save, counter.
            Save.data.stars += 1;
            Save.save();
            setStars(Save.data.stars);
            setTimeout(() => showToast(`All ${TREASURES_PER_LAND} treasures in ${TREASURE_LAND_NAMES[landId]}! +1 ⭐`), 1600);
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
  const progress = { current: Math.min((qb.current ? qb.current.roundIdx : 0) + 1, 5), total: 5 };

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
          />
          {gameState === 'roam' && <VirtualJoystick />}
        </>
      )}

      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-16 left-1/2 transform -translate-x-1/2 z-50 pointer-events-none animate-bounce">
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
