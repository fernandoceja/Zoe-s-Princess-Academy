import React, { useState, useEffect, useRef } from 'react';
import { createWorld } from './engine-dom.js';
import {
  PRINCESSES,
  NPC_ORDER,
  QUESTS,
  buildRounds,
  setSchoolWords,
  setWeek,
} from './engine-core.js';
import { SoundFX, Narrator, setLang } from './engine-dom.js';
import { Save, checkMilestones } from './engine-core.js';
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
import { Input } from './engine-dom.js';
import { builtSlotIds, shouldRunFinale, openLandIds } from './engine-core.js';
import { landState, recordQuest, today, pickTodayStar } from './engine-core.js';

import { HUD } from './components/HUD';
import { TitleModal } from './components/TitleModal';
import { TutorialModal } from './components/TutorialModal';
import { DialogueModal } from './components/DialogueModal';
import { ChallengeModal } from './components/ChallengeModal';
import { CelebrationModal } from './components/CelebrationModal';
import { PauseMenu } from './components/PauseMenu';
import { WardrobeModal } from './components/WardrobeModal';
import { TreasureBookModal } from './components/TreasureBookModal';
import { ParentCorner } from './components/ParentCorner';
import { VirtualJoystick } from './components/VirtualJoystick';
import { PrincessId, Round } from './types';

const NPC_IDS = NPC_ORDER as PrincessId[];
const NPC_TO_LAND: Record<string, string> = {
  belle: 'library',
  elsa: 'frostfall',
  rapunzel: 'meadow',
  cinderella: 'village',
  ariel: 'cove',
  moana: 'isle',
  jasmine: 'garden',
  anna: 'harbor',
  tiana: 'bayou',
  aurora: 'glen',
};

export const App: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<any>(null);

  // Core Game State
  const [gameState, setGameState] = useState<
    | 'title'
    | 'tutorial'
    | 'roam'
    | 'dialogue'
    | 'challenge'
    | 'celebrate'
    | 'finale'
  >('title');

  const [paused, setPaused] = useState(false);
  const [pauseTab, setPauseTab] = useState<
    'menu' | 'wardrobe' | 'treasurebook' | 'tutorial' | 'parent'
  >('menu');

  const [activeNPC, setActiveNPC] = useState<PrincessId | null>(null);
  const [interactPrompt, setInteractPrompt] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [todayStar, setTodayStar] = useState<PrincessId | undefined>(undefined);

  // Quest State
  const [rounds, setRounds] = useState<Round[]>([]);
  const [roundIdx, setRoundIdx] = useState(0);
  const [results, setResults] = useState<any[]>([]);
  const [requeued, setRequeued] = useState(0);
  const [celebrationData, setCelebrationData] = useState<{
    title: string;
    sub: string;
    isFinale?: boolean;
    afterAction: () => void;
  } | null>(null);

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

  // 1. Initialize Game & 3D World
  useEffect(() => {
    Save.load();
    const day = todayKey();
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
      const star = pickTodayStar(Save.data, today());
      setTodayStar(star as PrincessId);
    } catch (e) {}

    // Init Input and 3D Canvas
    Input.init();

    if (containerRef.current) {
      const world = createWorld(containerRef.current, {
        onNearNPC(npcId: string) {
          if (npcId && PRINCESSES[npcId]) {
            setInteractPrompt(`💬 Tap ${PRINCESSES[npcId].name} to talk ✨`);
          } else {
            setInteractPrompt(null);
          }
        },
        onInteractRequest(npcId: string) {
          if (!npcId || !QUESTS[npcId]) return;
          handleStartQuest(npcId as PrincessId);
        },
        onPauseRequest() {
          handleTogglePause();
        },
        onWorldTap() {
          SoundFX.chime();
        },
        onGateTap() {
          SoundFX.chime();
          showToast('A new kingdom will open here soon! ✨');
        },
        onSecretTap(part: string) {
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
          showToast(
            `You found a ${kind}! ${landTreasureCount(Save.data, landId, dayKey)} of ${TREASURES_PER_LAND} in this land today ✨`
          );

          if (awardRowStar(Save.data, landId, dayKey)) {
            Save.data.stars += 1;
            Save.save();
            setStars(Save.data.stars);
            showToast(`All ${TREASURES_PER_LAND} treasures in ${TREASURE_LAND_NAMES[landId]}! +1 ⭐`);
          }

          const openL = openLandIds();
          setTreasuresToday(findsToday(Save.data, dayKey, openL));
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
    }

    return () => {
      if (worldRef.current) {
        worldRef.current.dispose();
      }
    };
  }, []);

  // Reveal secrets & sticker rewards
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
      const sp = spellLine(Save.data.week?.spelling);
      line = sp.say;
    } else line = plantLine().say;

    SoundFX.chime();
    Narrator.speakExact(def.npc, line);
    showToast(`${def.emoji} ${line}`);

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
    if (gameState !== 'roam') return;
    const nextPaused = !paused;
    setPaused(nextPaused);
    setPauseTab('menu');
    if (worldRef.current) {
      worldRef.current.setInputEnabled(!nextPaused);
      if (nextPaused) worldRef.current.pause();
      else worldRef.current.resume();
    }
    if (nextPaused) {
      Narrator.stop();
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
      setGameState('tutorial');
    }
  };

  const enterWorld = () => {
    setGameState('roam');
    if (worldRef.current) {
      worldRef.current.setInputEnabled(true);
      worldRef.current.resume();
    }
    showToast('Walk to a princess and say hello! 👑');
    Narrator.speakText(
      'Welcome to Starlight Quest! Walk to a princess and tap her or press E to say hello.',
      { pitch: 1.15, rate: 0.95 }
    );
  };

  // Start Quest with NPC
  const handleStartQuest = (npcId: PrincessId) => {
    setActiveNPC(npcId);
    setRoundIdx(0);
    setResults([]);
    setRequeued(0);

    const built = buildRounds(npcId, Math.random, landState(Save.data.ladder[npcId]));
    setRounds(built);

    if (worldRef.current) {
      worldRef.current.setInputEnabled(false);
      worldRef.current.focus(npcId);
    }
    setGameState('dialogue');
  };

  // Progress from Dialogue to Challenge rounds
  const handleDialogueDone = () => {
    setGameState('challenge');
  };

  // Correct Answer in Challenge
    // R4-FIX F1: correct-round path (fixed in P3)
  const handleRoundCorrect = () => {
    // Add star
    Save.data.stars += 1;
    if (activeNPC && !Save.data.done.includes(activeNPC)) {
      Save.data.shards[activeNPC] = (Save.data.shards[activeNPC] || 0) + 1;
    }
    Save.save();
    setStars(Save.data.stars);

    // Bookkeeping
    const nextRoundIdx = roundIdx + 1;
    if (nextRoundIdx >= rounds.length) {
      // Completed all 5 rounds!
      completeQuest();
    } else {
      setRoundIdx(nextRoundIdx);
    }
  };

  // Missed round handling
    // R4-FIX F1: miss-round path (fixed in P3)
  const handleRoundMiss = (missCount: number) => {
    const curRound = rounds[roundIdx];
    if (curRound && !curRound.requeued && results.length < 5) {
      setResults((prev) => [...prev, { round: curRound, firstTry: false, hinted: true }]);
      if (missCount === 1 && requeued < 2) {
        setRequeued((r) => r + 1);
        const copy = [...rounds];
        copy.splice(Math.min(copy.length, roundIdx + 3), 0, { ...curRound, requeued: true });
        setRounds(copy);
      }
    }
  };

  // Complete Quest for active NPC
    // R4-FIX F1: quest completion (fixed in P3)
  const completeQuest = () => {
    if (!activeNPC) return;
    const npcId = activeNPC;
    const P = PRINCESSES[npcId];
    const quest = QUESTS[npcId];

    // Ladder bookkeeping
    Save.data.ladder[npcId] = recordQuest(landState(Save.data.ladder[npcId]), results);
    Save.data.lastPlay[npcId] = today();
    setLadderState({ ...Save.data.ladder });

    const isFirstTime = !Save.data.done.includes(npcId);
    if (isFirstTime) {
      Save.data.done.push(npcId);
      Save.data.stars += 3; // +3 bonus stars for land shard
      setDoneLands([...Save.data.done]);
    }
    Save.save();
    setStars(Save.data.stars);

    if (worldRef.current) {
      worldRef.current.setNPCState(npcId, 'done');
      worldRef.current.celebrate(NPC_TO_LAND[npcId]);
    }

    // Check star milestones
    const freshMilestones = checkMilestones(Save.data);
    if (freshMilestones.length > 0) {
      Save.save();
      setUnlockedMilestones([...Save.data.milestones]);
    }

    // Trigger Land Celebration
    setCelebrationData({
      title: `${P.name}'s land is glowing!`,
      sub: `You earned the ${P.landName} star shard! ⭐ +3 stars`,
      afterAction: () => {
        // Check if all 10 lands complete -> Starlight Crown Finale
        const allDone = shouldRunFinale(Save.data.done, NPC_IDS, builtSlotIds().length);
        if (allDone) {
          triggerFinale();
        } else {
          returnToRoam();
        }
      },
    });
    setGameState('celebrate');
  };

  // Trigger Grand Finale
  const triggerFinale = () => {
    if (worldRef.current) {
      worldRef.current.setCastleCrown(true);
      NPC_IDS.forEach((id, i) =>
        setTimeout(() => worldRef.current?.celebrate(NPC_TO_LAND[id]), i * 150)
      );
    }

    setCelebrationData({
      title: 'The Starlight Crown is Restored! 👑',
      sub: 'All ten lands are glowing together across the kingdom! You did it, Princess Zoe!',
      isFinale: true,
      afterAction: () => {
        returnToRoam();
      },
    });
    setGameState('finale');
  };

  const returnToRoam = () => {
    setActiveNPC(null);
    setGameState('roam');
    setCelebrationData(null);
    if (worldRef.current) {
      worldRef.current.setInputEnabled(true);
      worldRef.current.unfocus();
      worldRef.current.resume();
    }
  };

  // Wardrobe Outfit Changed
  const handleSelectOutfit = (newOutfit: any) => {
    Save.data.outfit = newOutfit;
    Save.save();
    setCurrentOutfit(newOutfit);
    if (worldRef.current) {
      worldRef.current.setOutfit(newOutfit);
    }
  };

  // Save Custom Words (Parent Corner)
  const handleSaveCustomWords = (words: string[]) => {
    Save.data.schoolWords = words;
    Save.save();
    setSchoolWords(words);
    setSchoolWordsState(words);
  };

  const currentRound = rounds[roundIdx];

  return (
    <div className="relative w-screen h-screen overflow-hidden select-none bg-[#1a1033] font-['Nunito',sans-serif]">
      {/* 3D Three.js Canvas Container */}
      <div ref={containerRef} className="absolute inset-0 z-0" />

      {/* Floating HUD */}
      {gameState === 'roam' && !paused && (
        <>
          <HUD
            stars={stars}
            doneCount={doneLands.length}
            totalLands={NPC_ORDER.length}
            treasuresToday={treasuresToday}
            treasuresTotal={treasuresTotal}
            activeNPC={activeNPC}
            questStep={
              activeNPC ? { current: roundIdx + 1, total: rounds.length } : undefined
            }
            interactPrompt={interactPrompt}
            muted={muted}
            onToggleMute={handleToggleMute}
            onPause={handleTogglePause}
            onInteract={() => {
              if (interactPrompt && activeNPC) handleStartQuest(activeNPC);
            }}
            todayStarNPC={todayStar}
          />
          <VirtualJoystick />
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
          onOpenTutorial={() => setGameState('tutorial')}
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
      {gameState === 'dialogue' && activeNPC && (
        <DialogueModal
          npcId={activeNPC}
          lines={
            doneLands.includes(activeNPC)
              ? [
                  `Welcome back, Princess Zoe! My land is glowing because of you! 💖 Let's play another round of fun questions!`,
                ]
              : QUESTS[activeNPC]?.intro || ['Hello Princess Zoe! Will you help me?']
          }
          onDone={handleDialogueDone}
          actionLabel="Start Quest! ⭐"
        />
      )}

      {/* Challenge Modal */}
      {gameState === 'challenge' && activeNPC && currentRound && (
        <ChallengeModal
          npcId={activeNPC}
          round={currentRound}
          roundIdx={roundIdx}
          totalRounds={rounds.length}
          onCorrect={handleRoundCorrect}
          onMiss={handleRoundMiss}
        />
      )}

      {/* Celebration & Finale Modal */}
      {(gameState === 'celebrate' || gameState === 'finale') && celebrationData && (
        <CelebrationModal
          title={celebrationData.title}
          sub={celebrationData.sub}
          isFinale={celebrationData.isFinale}
          onContinue={celebrationData.afterAction}
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
              onBack={() => setPauseTab('menu')}
            />
          )}
        </>
      )}
    </div>
  );
};

export default App;
