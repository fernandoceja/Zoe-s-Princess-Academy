import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { PRINCESSES, QUESTS, tileSound } from '../engine-core.js';
import { Narrator, SoundFX } from '../engine-dom.js';
import { say as herSay } from '../flow/say.js';
import { ENGLISH_ROUND_NPCS, setEnglishRound } from '../i18n/lang.js';
import { dictationHint, sortBinRight, sortWrongHint, groupBinRight } from '../flow/questbook.js';
import { cardPicture, choiceSay, canHearChoices, questionPicture, RETRY_UNLOCK_MS, wordPicture } from '../flow/playfix.js';
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

// The last result of a pick. Only the advancing kinds lock the choices and show Next. A wrong pick ('retry') never
// locks: the card wiggles, the one-line hint is spoken, and the cards take taps again after RETRY_UNLOCK_MS.
export interface Feedback {
  kind: 'correct' | 'reveal' | 'retry' | 'spellwrong' | 'sortwrong';
  pickedId: string;
  correctId: string | null;
  message: string;
}

const ADVANCING = ['correct', 'reveal'];
// Sparkle burst pieces (visual polish): 14 stars and sparkles on a ring, fixed so every burst looks the same.
const BURST = Array.from({ length: 14 }, (_, i) => ({
  a: Math.round(i * (360 / 14) + (i % 2 ? 9 : -6)),
  d: 34 + (i % 3) * 7,
  s: 16 + (i % 4) * 5,
  w: (i % 5) * 35,
  c: i % 3 === 0 ? '⭐' : '✨',
}));

interface ChallengeModalProps {
  npcId: PrincessId;
  view: RoundViewModel;
  progress: { current: number; total: number };
  feedback: Feedback | null;
  // Every answer goes to the flow through onPick. onAdvance is the Next button (after a reveal, a
  // correct answer or a gentle retry).
  onPick: (pickedId: string, info?: any) => void;
  onAdvance: () => void;
  // Called once the wrong-pick wiggle is over (about 1 s), so the flow can narrow the choices without a new screen.
  onRetryReady?: () => void;
  // Pause anytime: the round stays as it is under the menu; on Resume the question (or the fresh hint) is read again.
  paused?: boolean;
}

export const ChallengeModal: React.FC<ChallengeModalProps> = ({
  npcId,
  view,
  progress,
  feedback,
  onPick,
  onAdvance,
  onRetryReady,
  paused = false,
}) => {
  const princess = PRINCESSES[npcId];
  // Spanish mode: reading (and plant) rounds teach English words, so this sheet and her voice stay English.
  const englishRound = ENGLISH_ROUND_NPCS.includes(npcId);
  // (Not while paused: the pause menu and tutorial over it speak Spanish.)
  useLayoutEffect(() => {
    setEnglishRound(englishRound && !paused);
    return () => setEnglishRound(false);
  }, [englishRound, paused]);
  const quest = QUESTS[npcId];
  const round = view.round;
  const locked = !!feedback && ADVANCING.includes(feedback.kind);

  // Blend tiles state (for Belle CVC)
  const [activeBlendLetter, setActiveBlendLetter] = useState<number | null>(null);

  // Tile builder state (for Belle spelling / dictation)
  const [placedTiles, setPlacedTiles] = useState<string[]>([]);
  // Wrong taps in a row on the same slot; after two, the right tile glows (ui.js tileBuilder, streak).
  const [wrongStreak, setWrongStreak] = useState(0);

  // Sorting state (for Aurora or Rapunzel sorting)
  const [sortedItems, setSortedItems] = useState<{ name: string; naming?: boolean; living?: boolean; bin?: string }[]>([]);
  // The word that just went to the wrong jar or bin hops back to its place (play-test fix 4).
  const [bounced, setBounced] = useState<{ i: number; n: number } | null>(null);

  // After a wrong pick: a short wait (the card wiggles, the hint is read), then the cards work again by themselves.
  const [cooling, setCooling] = useState(false);
  useEffect(() => {
    if (!feedback || feedback.kind !== 'retry' || !feedback.pickedId) return;
    setCooling(true);
    const t = window.setTimeout(() => { setCooling(false); onRetryReady && onRetryReady(); }, RETRY_UNLOCK_MS);
    return () => window.clearTimeout(t);
  }, [feedback]);

  // The hint line is always scrolled into view (on a small phone it could sit below the cards).
  const hintRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (feedback && feedback.message && hintRef.current && hintRef.current.scrollIntoView) {
      try { hintRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); } catch (e) { /* old Safari */ }
    }
  }, [feedback]);

  // Each new view (a new round, or a gentle retry) is read aloud once, as main.js showChallenge does.
  useEffect(() => {
    setPlacedTiles([]);
    setWrongStreak(0);
    setActiveBlendLetter(null);
    if (round.sort?.items) {
      setSortedItems(round.sort.items.map((it: any) => ({ ...it, bin: undefined })));
    }
    herSay(npcId, view.voiceText);
    return () => {
      Narrator.stop();
    };
  }, [view.serial]);

  const replay = () => {
    // The Thursday test word is never on screen, so 🔊 always repeats "Number N. word. sentence. word." (even after a hint).
    // The hint only while it is fresh (locked after an answer, or the ~1 s wiggle); once the cards work again, 🔊 repeats the question.
    const text = feedback && feedback.message && !round.test && (locked || cooling)
      ? feedback.message
      : view.replayText || view.voiceText || round.prompt;
    herSay(npcId, text);
  };

  const wasPaused = useRef(paused);
  useEffect(() => {
    if (wasPaused.current && !paused) replay();
    wasPaused.current = paused;
  }, [paused]);

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
              className={`w-[60px] min-h-[64px] h-16 sm:w-16 sm:h-20 rounded-2xl border-4 font-read font-bold text-tile flex items-center justify-center shadow-md active:scale-95 transition-all ${
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
          className="mt-1 min-h-[60px] px-5 py-2 rounded-full bg-gradient-to-r from-blue-400 to-indigo-500 text-white font-extrabold text-base shadow-md active:scale-95 flex items-center gap-1.5"
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
        setWrongStreak(0);
        const next = [...placedTiles, tile];
        setPlacedTiles(next);
        // The letter's sound when it lands in its slot (ui.js showChallenge tile builder speak).
        if (round.spell) {
          const s = tileSound(tile);
          if (s?.tts) Narrator.speakExact(npcId, s.tts);
          else if (s?.url) Narrator.playClip(s.url, undefined, s.stopAt);
        } else {
          // Dictation: the word (or end mark) is read aloud as it lands (ui.js:1300).
          const say: Record<string, string> = { '?': 'question mark', '.': 'period', '!': 'exclamation mark' };
          Narrator.speakExact(npcId, say[tile] || tile);
        }
        if (next.length === target.length) onPick('__spelldone');
      } else {
        setWrongStreak(wrongStreak + 1);
        onPick('__spellwrong', { index, tile, say: round.build ? dictationHint({ ...round.build, hint: round.hint }, index) : undefined });
      }
    };
    const handleUndo = () => {
      if (placedTiles.length > 0) {
        setPlacedTiles(placedTiles.slice(0, -1));
        setWrongStreak(0);
      }
    };
    const handleClear = () => {
      setPlacedTiles([]);
      setWrongStreak(0);
    };
    // After two wrong taps in a row, the next tile in the bank glows (the first enabled copy of it).
    const wantTile = placedTiles.length < target.length ? target[placedTiles.length] : undefined;
    const usedAt = (i: number, t: string) => {
      const timesPlaced = placedTiles.filter((p) => p === t).length;
      const timesInTiles = tiles.slice(0, i + 1).filter((x: string) => x === t).length;
      return timesInTiles <= timesPlaced;
    };
    const glowIndex = wrongStreak >= 2 && !locked && wantTile !== undefined
      ? tiles.findIndex((t: string, i: number) => t === wantTile && !usedAt(i, t))
      : -1;
    return (
      <div className="my-3 flex flex-col items-center gap-3">
        {/* Target Slots */}
        <div className="flex flex-wrap items-center justify-center gap-2 p-2 bg-amber-50/80 rounded-2xl border-2 border-amber-200 min-h-[4rem] max-w-full">
          {target.map((_: any, i: number) => (
            <div
              key={i}
              className={`min-w-[44px] h-14 px-2 rounded-xl border-2 flex items-center justify-center font-read font-bold text-tile ${
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
          {round.build?.end && <div className="font-read text-tile font-bold text-amber-950">{round.build.end}</div>}
        </div>
        {/* Tile Bank */}
        <div className="flex flex-wrap justify-center gap-2">
          {tiles.map((t: string, i: number) => {
            const isUsed = usedAt(i, t);
            const isGlow = i === glowIndex;
            return (
              <button
                key={i}
                disabled={isUsed || locked}
                onClick={() => handleTileTap(t)}
                className={`min-h-[60px] min-w-[60px] px-3 py-1.5 rounded-xl border-2 font-read font-bold text-tile shadow-sm transition-all active:scale-95 ${
                  isUsed
                    ? 'opacity-30 bg-slate-200 border-slate-300 text-slate-400 cursor-not-allowed'
                    : isGlow
                    ? 'bg-amber-200 border-amber-400 text-amber-950 shadow-md animate-pulse'
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
            className="min-h-[60px] px-5 py-1.5 rounded-full bg-slate-200 hover:bg-slate-300 disabled:opacity-40 text-sm font-black text-slate-700 active:scale-95"
          >
            ↶ Undo
          </button>
          <button
            onClick={handleClear}
            disabled={placedTiles.length === 0 || locked}
            className="min-h-[60px] px-5 py-1.5 rounded-full bg-slate-200 hover:bg-slate-300 disabled:opacity-40 text-sm font-black text-slate-700 active:scale-95"
          >
            ✖ Clear
          </button>
        </div>
      </div>
    );
  };

  // Sorting bins (Rapunzel living / not living, Aurora naming / action). The rule is the engine's
  // (ui.js _sortBins via sortBinRight): the first bin is "yes". Wrong bin -> '__sortwrong' with the
  // engine's hint; the last item in a right bin -> '__sortdone'.
  const renderWordSort = () => {
    if (!round.sort) return null;
    const groupSort = round.sort.kind === 'groups';
    const wordSort = round.sort.kind === 'words';
    const bins: string[] = round.choices || (wordSort ? ['Naming', 'Action'] : ['🌱 Living', '🪨 Not living']);
    const handleSortItem = (itemIdx: number, binIdx: number) => {
      if (locked) return;
      const item = sortedItems[itemIdx];
      SoundFX.pop();
      if (groupSort ? groupBinRight(item, binIdx) : sortBinRight(item, wordSort, binIdx === 0)) {
        const updated = sortedItems.map((it, i) => (i === itemIdx ? { ...it, bin: bins[binIdx] } : it));
        setSortedItems(updated);
        if (updated.every((it) => it.bin != null)) onPick('__sortdone');
      } else {
        setBounced({ i: itemIdx, n: Date.now() });
        window.setTimeout(() => setBounced((b) => (b && b.i === itemIdx ? null : b)), 900);
        onPick('__sortwrong', sortWrongHint(item, wordSort, round.sort));
      }
    };
    return (
      <div className="my-3 flex flex-col items-center gap-3">
        <div className="flex flex-wrap justify-center gap-2">
          {sortedItems.map((item, i) => {
            const isBounced = !!bounced && bounced.i === i;
            const pic = wordPicture(item.name);   // a picture where one fits (it never names the jar or bin)
            return (
            <div
              key={isBounced ? `${i}-${bounced!.n}` : i}
              className={`px-3 py-2 rounded-xl border-2 font-read font-bold text-read flex flex-wrap items-center justify-center gap-2 ${
                item.bin
                  ? 'bg-emerald-100 border-emerald-300 text-emerald-900'
                  : isBounced
                  ? 'bg-rose-50 border-rose-300 text-purple-950 shadow-sm zsq-bounce-back'
                  : 'bg-white border-purple-200 text-purple-950 shadow-sm'
              }`}
            >
              {pic && <span className="text-3xl" aria-hidden="true">{pic}</span>}
              <span>{item.name}</span>
              {!item.bin && (
                <button
                  onClick={() => Narrator.speakExact(npcId, item.name)}
                  className="w-[60px] min-h-[60px] rounded-full bg-amber-50 border border-amber-300 text-2xl active:scale-95"
                  aria-label={`Hear ${item.name}`}
                >
                  🔊
                </button>
              )}
              {!item.bin && (
                <div className="flex flex-wrap justify-center gap-1.5">
                  {bins.map((b, bi) => (
                    <button
                      key={b}
                      onClick={() => handleSortItem(i, bi)}
                      className="min-h-[72px] min-w-[72px] px-3 py-1 rounded-xl bg-purple-100 hover:bg-purple-200 border-2 border-purple-200 text-2xl font-read font-bold text-purple-900 active:scale-95"
                    >
                      {b}
                    </button>
                  ))}
                </div>
              )}
            </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div data-zsq-en={englishRound || undefined} className="zsq-modal-wrap fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs animate-fade-in pointer-events-auto overflow-y-auto">
      {/* Sparkle burst on a correct answer: drawn BEHIND the card, so it only shows around its edges
          and never covers the answers. Off under Reduce Motion (styles.css). */}
      {feedback && feedback.kind === 'correct' && (
        <div className="zsq-burst" aria-hidden="true" key={`burst-${progress.current}`}>
          {BURST.map((b, i) => (
            <span key={i} style={{ '--a': `${b.a}deg`, '--d': `${b.d}vmax`, '--s': `${b.s}px`, animationDelay: `${b.w}ms` } as React.CSSProperties}>{b.c}</span>
          ))}
        </div>
      )}
      <div className="w-full max-w-xl bg-gradient-to-b from-white via-[#fefbf2] to-[#f8f5ea] rounded-[28px] border-4 border-[#ebd373] p-4 sm:p-6 shadow-2xl relative z-10 my-auto">
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
          {/* A picture for every question (non-readers): the round's own, an ear for listening, or the land's. */}
          <span className="text-4xl shrink-0 select-none" aria-hidden="true">{questionPicture(npcId, round)}</span>
          <p className="flex-1 min-w-0 font-read text-read font-bold text-ink">
            {round.prompt}
          </p>
          <button
            onClick={replay}
            className="w-[60px] h-[60px] rounded-full bg-amber-100 hover:bg-amber-200 border border-amber-300 flex items-center justify-center text-2xl shrink-0 active:scale-95 shadow-xs"
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
          <div className="my-2 text-center font-read text-tile font-bold tracking-widest text-ink">{view.bigWord}</div>
        )}
        {renderBlendLetters()}
        {renderTileBuilder()}
        {renderWordSort()}
        {/* Standard choice cards (not tile builder / sort) */}
        {!round.spell && !round.build && !round.sort && view.choices.length > 0 && (() => {
          // Every card has a picture, and a speaker that reads it, unless hearing it gives the answer away (playfix.js).
          const hear = canHearChoices(npcId, round, view.choices.map((c) => c.label));
          return (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 mt-4">
            {view.choices.map((choice, ci) => {
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
              const card = cardPicture(npcId, choice.label, ci);
              const say = choiceSay(round, choice.label);
              return (
                <div key={choice.id} className="flex items-stretch gap-1.5" style={dim ? { opacity: 0.55 } : undefined}>
                  <button
                    disabled={locked}
                    onClick={() => { if (!cooling) onPick(choice.id); }}
                    aria-label={say || undefined}
                    className={`flex-1 min-w-0 min-h-[64px] sm:min-h-[80px] p-3 rounded-2xl border-3 font-read font-bold text-read flex items-center justify-center gap-2 text-center shadow-sm active:scale-95 transition-all select-none ${btnStyle}`}
                  >
                    {card.pic && <span className={`${card.text ? 'text-3xl' : 'text-5xl'} shrink-0`} aria-hidden="true">{card.pic}</span>}
                    {card.dots > 0 && (
                      <span className="flex flex-wrap gap-0.5 max-w-[4.5rem] shrink-0" aria-hidden="true">
                        {Array.from({ length: card.dots }, (_, d) => (
                          <span key={d} className={`w-2.5 h-2.5 rounded-full ${d < 10 ? 'bg-amber-400' : 'bg-sky-400'}`} />
                        ))}
                      </span>
                    )}
                    {card.text && <span className="leading-tight break-words min-w-0">{card.text}</span>}
                  </button>
                  {hear && say && (
                    <button
                      onClick={() => Narrator.speakExact(npcId, say)}
                      className="w-[60px] min-h-[60px] shrink-0 rounded-2xl bg-amber-50 hover:bg-amber-100 border-2 border-amber-200 flex items-center justify-center text-2xl active:scale-95"
                      aria-label={`Hear ${say}`}
                      title="Listen"
                    >
                      🔊
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          );
        })()}
        {/* Encouraging Feedback Banner (the picture hint for tile and sort misses too) */}
        {feedback && feedback.message && (
          <div
            ref={hintRef}
            className={`mt-4 p-3 rounded-2xl border-2 text-center font-read font-bold text-read animate-fade-in ${
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
            className="mt-4 w-full min-h-[60px] px-6 py-3 rounded-full bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 text-amber-950 font-black text-lg shadow-lg border-2 border-white active:scale-95"
          >
            Next ➜
          </button>
        )}
      </div>
    </div>
  );
};
