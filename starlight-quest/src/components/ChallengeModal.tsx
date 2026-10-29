import React, { useState, useEffect } from 'react';
import { PRINCESSES, QUESTS, tileSound } from '../engine-core.js';
import { Narrator, SoundFX } from '../engine-dom.js';
import { dictationHint } from '../flow/questbook.js';
import { PrincessId, Round } from '../types';

// What the flow hands the view for one round (roundView + voice text + visual HTML, see App.tsx).
export interface RoundViewModel {
  round: Round;
  choices: { id: string; label: string }[];
  correctId: string;
  tileRound: boolean;
  bigWord: string | null;
  replayText: string | null;
  voiceText: string;
  visualHtml: string;
  serial: number;
}

// The last result of a pick. Only the advancing kinds lock the choices and show Next.
export interface Feedback {
  kind: 'correct' | 'reveal' | 'retry' | 'spellwrong' | 'sortwrong';
  pickedId: string;
  correctId: string | null;
  message: string;
}

const ADVANCING = ['correct', 'reveal', 'retry'];

interface ChallengeModalProps {
  npcId: PrincessId;
  view: RoundViewModel;
  progress: { current: number; total: number };
  feedback: Feedback | null;
  // Every answer goes to the flow through onPick. onAdvance is the Next button (after a reveal, a
  // correct answer or a gentle retry).
  onPick: (pickedId: string, info?: any) => void;
  onAdvance: () => void;
}

export const ChallengeModal: React.FC<ChallengeModalProps> = ({
  npcId,
  view,
  progress,
  feedback,
  onPick,
  onAdvance,
}) => {
  const princess = PRINCESSES[npcId];
  const quest = QUESTS[npcId];
  const round = view.round;
  const locked = !!feedback && ADVANCING.includes(feedback.kind);

  // Blend tiles state (for Belle CVC)
  const [activeBlendLetter, setActiveBlendLetter] = useState<number | null>(null);

  // Tile builder state (for Belle spelling / dictation)
  const [placedTiles, setPlacedTiles] = useState<string[]>([]);

  // Sorting state (for Aurora or Rapunzel sorting)
  const [sortedItems, setSortedItems] = useState<{ name: string; naming?: boolean; living?: boolean; bin?: string }[]>([]);

  // Each new view (a new round, or a gentle retry) is read aloud once, as main.js showChallenge does.
  useEffect(() => {
    setPlacedTiles([]);
    setActiveBlendLetter(null);
    if (round.sort?.items) {
      setSortedItems(round.sort.items.map((it: any) => ({ ...it, bin: undefined })));
    }
    Narrator.speakExact(npcId, view.voiceText);
    return () => {
      Narrator.stop();
    };
  }, [view]);

  const replay = () => {
    const text = feedback && feedback.message
      ? feedback.message
      : view.replayText || view.voiceText || round.prompt;
    Narrator.speakExact(npcId, text);
  };

  // Tap-to-blend letters (for Belle CVC phonics)
  const renderBlendLetters = () => {
    if (!round.tiles || round.tiles.length === 0) return null;
    const letters = round.tiles;
    const playSound = (l: string, idx: number) => {
      setActiveBlendLetter(idx);
      const s = tileSound(l);
      if (s) {
        if (s.tts) {
          Narrator.speakExact(npcId, s.tts, () => setActiveBlendLetter(null));
        } else {
          Narrator.playClip(s.url, () => setActiveBlendLetter(null), s.stopAt);
        }
      } else {
        Narrator.speakExact(npcId, l, () => setActiveBlendLetter(null));
      }
    };
    const blendAll = () => {
      let i = 0;
      const step = () => {
        if (i >= letters.length) {
          setActiveBlendLetter(null);
          Narrator.speakExact(npcId, letters.join(''));
          return;
        }
        playSound(letters[i], i);
        i++;
        setTimeout(step, 450);
      };
      step();
    };
    return (
      <div className="my-3 flex flex-col items-center gap-2">
        <div className="flex items-center gap-2">
          {letters.map((l, i) => (
            <button
              key={i}
              onClick={() => playSound(l, i)}
              className={`w-14 h-16 sm:w-16 sm:h-20 rounded-2xl border-4 font-black text-2xl sm:text-3xl flex items-center justify-center shadow-md active:scale-95 transition-all ${
                activeBlendLetter === i
                  ? 'bg-amber-400 text-amber-950 border-white scale-110 shadow-lg'
                  : 'bg-white text-purple-950 border-purple-200 hover:border-purple-300'
              }`}
            >
              {l}
            </button>
          ))}
        </div>
        <button
          onClick={blendAll}
          className="mt-1 px-4 py-2 rounded-full bg-gradient-to-r from-blue-400 to-indigo-500 text-white font-extrabold text-sm shadow-md active:scale-95 flex items-center gap-1.5"
        >
          <span>🔊</span>
          <span>Blend it!</span>
        </button>
      </div>
    );
  };

  // Interactive Tile Builder (Belle spelling / dictation). Done and wrong tiles go to the flow.
  const renderTileBuilder = () => {
    const builder = round.spell || round.build;
    if (!builder) return null;
    const target: string[] = round.spell ? round.spell.word.split('') : round.build.target || [];
    const tiles: string[] = builder.tiles || [];
    const handleTileTap = (tile: string) => {
      if (locked) return;
      const index = placedTiles.length;
      SoundFX.pop();
      if (tile === target[index]) {
        const next = [...placedTiles, tile];
        setPlacedTiles(next);
        if (next.length === target.length) onPick('__spelldone');
      } else {
        onPick('__spellwrong', { index, say: round.build ? dictationHint({ ...round.build, hint: round.hint }, index) : undefined });
      }
    };
    const handleUndo = () => {
      if (placedTiles.length > 0) {
        setPlacedTiles(placedTiles.slice(0, -1));
      }
    };
    const handleClear = () => {
      setPlacedTiles([]);
    };
    return (
      <div className="my-3 flex flex-col items-center gap-3">
        {/* Target Slots */}
        <div className="flex flex-wrap items-center justify-center gap-2 p-2 bg-amber-50/80 rounded-2xl border-2 border-amber-200 min-h-[4rem] max-w-full">
          {target.map((_: any, i: number) => (
            <div
              key={i}
              className={`min-w-[42px] h-12 px-3 rounded-xl border-2 flex items-center justify-center font-black text-lg ${
                placedTiles[i]
                  ? 'bg-white border-amber-400 text-amber-950 shadow-xs'
                  : i === placedTiles.length
                  ? 'bg-amber-100 border-dashed border-amber-400 animate-pulse'
                  : 'bg-slate-100 border-dashed border-slate-300'
              }`}
            >
              {placedTiles[i] || ''}
            </div>
          ))}
          {round.build?.end && <div className="text-2xl font-black text-amber-950">{round.build.end}</div>}
        </div>
        {/* Tile Bank */}
        <div className="flex flex-wrap justify-center gap-2">
          {tiles.map((t: string, i: number) => {
            const timesPlaced = placedTiles.filter((p) => p === t).length;
            const timesInTiles = tiles.slice(0, i + 1).filter((x: string) => x === t).length;
            const isUsed = timesInTiles <= timesPlaced;
            return (
              <button
                key={i}
                disabled={isUsed || locked}
                onClick={() => handleTileTap(t)}
                className={`px-4 py-2.5 rounded-xl border-2 font-black text-base sm:text-lg shadow-sm transition-all active:scale-95 ${
                  isUsed
                    ? 'opacity-30 bg-slate-200 border-slate-300 text-slate-400 cursor-not-allowed'
                    : 'bg-white border-purple-300 text-purple-950 hover:border-purple-500 shadow-md'
                }`}
              >
                {t}
              </button>
            );
          })}
        </div>
        {/* Undo / Clear controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleUndo}
            disabled={placedTiles.length === 0 || locked}
            className="px-3.5 py-1.5 rounded-full bg-slate-200 hover:bg-slate-300 disabled:opacity-40 text-xs font-black text-slate-700 active:scale-95"
          >
            ↶ Undo
          </button>
          <button
            onClick={handleClear}
            disabled={placedTiles.length === 0 || locked}
            className="px-3.5 py-1.5 rounded-full bg-slate-200 hover:bg-slate-300 disabled:opacity-40 text-xs font-black text-slate-700 active:scale-95"
          >
            ✖ Clear
          </button>
        </div>
      </div>
    );
  };

  // Word Sort (Aurora / Rapunzel)
  const renderWordSort = () => {
    if (!round.sort) return null;
    const bins = round.choices || ['Naming', 'Action'];
    // R4-FIX F6: bin check uses the wrong field, and '__sortdone' is scored as a miss (fixed in P3)
    const handleSortItem = (itemIdx: number, bin: string) => {
      if (locked) return;
      const item = sortedItems[itemIdx];
      const isCorrectBin =
        (bin.toLowerCase().includes('name') && item.naming) ||
        (bin.toLowerCase().includes('action') && !item.naming);
      if (isCorrectBin) {
        SoundFX.pop();
        const updated = [...sortedItems];
        updated[itemIdx].bin = bin;
        setSortedItems(updated);
        // Check if all sorted
        if (updated.every((it) => it.bin != null)) {
          onPick('__sortdone');
        }
      } else {
        SoundFX.pop();
        onPick('__sortwrong', round.hint || 'Good try! Think about what the word does.');
      }
    };
    return (
      <div className="my-3 flex flex-col items-center gap-3">
        <div className="flex flex-wrap justify-center gap-2">
          {sortedItems.map((item, i) => (
            <div
              key={i}
              className={`px-3 py-2 rounded-xl border-2 font-black text-sm flex items-center gap-2 ${
                item.bin
                  ? 'bg-emerald-100 border-emerald-300 text-emerald-900'
                  : 'bg-white border-purple-200 text-purple-950 shadow-sm'
              }`}
            >
              <span>{item.name}</span>
              {!item.bin && (
                <div className="flex gap-1">
                  {bins.map((b) => (
                    <button
                      key={b}
                      onClick={() => handleSortItem(i, b)}
                      className="px-2 py-0.5 rounded-md bg-purple-100 hover:bg-purple-200 text-xs font-bold text-purple-900 active:scale-95"
                    >
                      {b}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="zsq-modal-wrap fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in pointer-events-auto overflow-y-auto">
      <div className="w-full max-w-xl bg-gradient-to-b from-white via-[#fefbf2] to-[#f8f5ea] rounded-[28px] border-4 border-[#ebd373] p-4 sm:p-6 shadow-2xl relative my-auto">
        {/* Top Header: Progress Dots & Princess Kicker */}
        <div className="flex items-center justify-between gap-2 mb-3">
          {/* Princess Portrait + Land Kicker */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-11 h-11 sm:w-12 sm:h-12 rounded-full overflow-hidden border-2 shadow-sm shrink-0 bg-white"
              style={{ borderColor: princess?.color || '#ebd373' }}
            >
              <img
                src={princess?.portrait}
                alt={princess?.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-black uppercase tracking-wider text-amber-700 block truncate">
                {quest?.title}
              </span>
              <span className="text-xs font-bold text-slate-500 truncate block">
                {princess?.landName}
              </span>
            </div>
          </div>
          {/* 5 Progress Dots */}
          <div className="flex items-center gap-1.5 shrink-0">
            {Array.from({ length: progress.total }, (_, i) => (
              <span
                key={i}
                className={`w-3.5 h-3.5 rounded-full transition-all ${
                  i < progress.current - 1
                    ? 'bg-amber-400 scale-100'
                    : i === progress.current - 1
                    ? 'bg-amber-500 ring-2 ring-amber-300 scale-125'
                    : 'bg-slate-200'
                }`}
              />
            ))}
          </div>
        </div>
        {/* Question Prompt */}
        <div className="bg-white/95 border-2 border-amber-200/90 rounded-2xl p-3 sm:p-4 mb-2 shadow-xs flex items-center justify-between gap-3">
          <p className="text-lg sm:text-xl font-black text-slate-800 leading-snug">
            {round.prompt}
          </p>
          <button
            onClick={replay}
            className="w-9 h-9 rounded-full bg-amber-100 hover:bg-amber-200 border border-amber-300 flex items-center justify-center text-base shrink-0 active:scale-95 shadow-xs"
            aria-label="Hear that again"
            title="Listen again"
          >
            🔊
          </button>
        </div>
        {/* Picture from the engine (main.js visualHtml) */}
        {view.visualHtml && (
          <div className="my-2 flex justify-center" dangerouslySetInnerHTML={{ __html: view.visualHtml }} />
        )}
        {view.bigWord && (
          <div className="my-2 text-center text-3xl sm:text-4xl font-black tracking-widest text-slate-800">{view.bigWord}</div>
        )}
        {renderBlendLetters()}
        {renderTileBuilder()}
        {renderWordSort()}
        {/* Standard choice cards (not tile builder / sort) */}
        {!round.spell && !round.build && !round.sort && view.choices.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 mt-4">
            {view.choices.map((choice) => {
              const isPicked = !!feedback && feedback.pickedId === choice.id;
              let btnStyle =
                'bg-white text-slate-800 border-amber-200 hover:border-amber-400 hover:shadow-md';
              if (feedback && feedback.kind === 'correct' && isPicked) {
                btnStyle = 'bg-emerald-400 text-white border-white scale-105 shadow-lg';
              } else if (feedback && feedback.kind === 'reveal' && feedback.correctId === choice.id) {
                btnStyle = 'bg-emerald-400 text-white border-white scale-105 shadow-lg animate-pulse';
              } else if (feedback && feedback.kind === 'retry' && isPicked) {
                btnStyle = 'bg-rose-100 text-rose-900 border-rose-300 shake-card';
              }
              const dim = locked && !!feedback?.correctId && feedback.correctId !== choice.id;
              return (
                <button
                  key={choice.id}
                  disabled={locked}
                  onClick={() => onPick(choice.id)}
                  style={dim ? { opacity: 0.55 } : undefined}
                  className={`min-h-[64px] sm:min-h-[80px] p-3 rounded-2xl border-3 font-black text-lg sm:text-xl flex items-center justify-center text-center shadow-sm active:scale-95 transition-all select-none ${btnStyle}`}
                >
                  <span className="leading-snug break-words">{choice.label}</span>
                </button>
              );
            })}
          </div>
        )}
        {/* Encouraging Feedback Banner (the picture hint for tile and sort misses too) */}
        {feedback && feedback.message && (
          <div
            className={`mt-4 p-3 rounded-2xl border-2 text-center font-black text-sm sm:text-base animate-fade-in ${
              feedback.kind === 'correct'
                ? 'bg-emerald-100 border-emerald-300 text-emerald-900'
                : feedback.kind === 'reveal'
                ? 'bg-amber-100 border-amber-300 text-amber-900'
                : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}
            aria-live="polite"
          >
            {feedback.message}
          </div>
        )}
        {locked && (
          <button
            onClick={onAdvance}
            className="mt-4 w-full px-6 py-3 rounded-full bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 text-amber-950 font-black text-lg shadow-lg border-2 border-white active:scale-95"
          >
            Next ➜
          </button>
        )}
      </div>
    </div>
  );
};
