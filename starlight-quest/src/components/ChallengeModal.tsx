import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { PRINCESSES, QUESTS, tileSound, BELLE_CLIP_DIR } from '../engine-core.js';
import { shapeSVG } from '../engine-core.js';
import { tallyCardHtml } from '../engine-core.js';
import { Narrator, SoundFX } from '../engine-dom.js';
import { PrincessId, Round } from '../types';

interface ChallengeModalProps {
  npcId: PrincessId;
  round: Round;
  roundIdx: number;
  totalRounds: number;
  onCorrect: () => void;
  onMiss: (missCount: number) => void;
}

export const ChallengeModal: React.FC<ChallengeModalProps> = ({
  npcId,
  round,
  roundIdx,
  totalRounds,
  onCorrect,
  onMiss,
}) => {
  const princess = PRINCESSES[npcId];
  const quest = QUESTS[npcId];

  const [misses, setMisses] = useState(0);
  const [feedback, setFeedback] = useState<{
    type: 'correct' | 'wrong' | 'reveal' | null;
    message: string;
  }>({ type: null, message: '' });
  const [shuffledChoices, setShuffledChoices] = useState<string[]>([]);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [disabled, setDisabled] = useState(false);

  // Blend tiles state (for Belle CVC)
  const [activeBlendLetter, setActiveBlendLetter] = useState<number | null>(null);

  // Tile builder state (for Belle spelling / dictation)
  const [placedTiles, setPlacedTiles] = useState<string[]>([]);
  const [tileWrongs, setTileWrongs] = useState(0);

  // Sorting state (for Aurora or Rapunzel sorting)
  const [sortedItems, setSortedItems] = useState<{ name: string; naming?: boolean; living?: boolean; bin?: string }[]>([]);

  // Setup choices on new round
  useEffect(() => {
    setMisses(0);
    setFeedback({ type: null, message: '' });
    setSelectedChoice(null);
    setDisabled(false);
    setPlacedTiles([]);
    setTileWrongs(0);

    if (round.sort?.items) {
      setSortedItems(round.sort.items.map((it: any) => ({ ...it, bin: undefined })));
    }

    if (round.choices && round.choices.length > 0) {
      // Shuffle choices
      const copy = [...round.choices];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      setShuffledChoices(copy);
    } else {
      setShuffledChoices([]);
    }

    // Speak question aloud
    speakQuestion();

    return () => {
      Narrator.stop();
    };
  }, [round, npcId]);

  const speakQuestion = () => {
    let text = round.say || round.prompt;
    if (
      (npcId === 'cinderella' ||
        npcId === 'rapunzel' ||
        ((npcId === 'ariel' ||
          npcId === 'moana' ||
          npcId === 'jasmine' ||
          npcId === 'anna' ||
          npcId === 'tiana' ||
          npcId === 'aurora') &&
          !round.noChoiceSay)) &&
      !round.sort &&
      round.choices &&
      round.choices.length > 0
    ) {
      const labels = round.choices.map((c) =>
        round.choiceSay && round.choiceSay[c]
          ? round.choiceSay[c]
          : c.replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, '').trim()
      );
      text += ' Is it ' + labels.slice(0, -1).join(', ') + ', or ' + labels[labels.length - 1] + '?';
    }

    Narrator.speakExact(npcId, text);
  };

  // Trigger celebration confetti
  const fireConfetti = () => {
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#ebd373', '#f472b6', '#60a5fa', '#34c779', '#a78bfa'],
      });
    } catch (e) {}
  };

  // Choice button pick
  const handleChoice = (choice: string) => {
    if (disabled) return;
    setSelectedChoice(choice);

    if (choice === round.answer) {
      // Correct!
      setDisabled(true);
      SoundFX.chime();
      fireConfetti();
      const praises = [
        'Wonderful! You did it!',
        'Amazing work, superstar!',
        'Yes! You are so smart!',
        'Beautiful! Keep shining!',
      ];
      const praise = praises[Math.floor(Math.random() * praises.length)];
      setFeedback({ type: 'correct', message: `⭐ +1 star! ${praise}` });
      Narrator.speakExact(npcId, praise);

      setTimeout(() => {
        onCorrect();
      }, 1600);
    } else {
      // Missed pick
      const nextMisses = misses + 1;
      setMisses(nextMisses);
      onMiss(nextMisses);
      SoundFX.pop();

      if (nextMisses >= 3) {
        // 3rd miss: reveal gently
        setDisabled(true);
        const revealMsg = `That's okay! The answer is ${round.answer}. Let's keep going!`;
        const sayMsg = round.answerSay
          ? `That's okay! The answer is ${round.answerSay}. Let's keep going!`
          : revealMsg;
        setFeedback({ type: 'reveal', message: revealMsg });
        Narrator.speakExact(npcId, sayMsg);

        // R4-FIX F2: reveal-then-onCorrect counts the missed round as a star (fixed in P3)
        setTimeout(() => {
          onCorrect();
        }, 2200);
      } else {
        // Gentle retry
        const hintText = round.hint || "Good try! Let's think and try again!";
        setFeedback({ type: 'wrong', message: hintText });
        Narrator.speakExact(
          npcId,
          round.hintSay || hintText,
          round.sound ? () => Narrator.playClip(BELLE_CLIP_DIR + round.sound) : undefined
        );
      }
    }
  };

  // Render Visual Helpers
  const renderVisual = () => {
    // Clock SVG (Cinderella)
    if (npcId === 'cinderella' && round.clock) {
      const { hour, minute } = round.clock;
      const ha = ((hour % 12) + minute / 60) * 30;
      const ma = minute * 6;
      const hr = (ha * Math.PI) / 180;
      const mr = (ma * Math.PI) / 180;
      const hx = 50 + 15 * Math.sin(hr);
      const hy = 50 - 15 * Math.cos(hr);
      const mx = 50 + 24 * Math.sin(mr);
      const my = 50 - 24 * Math.cos(mr);

      return (
        <div className="my-2 flex justify-center">
          <svg viewBox="0 0 100 100" className="w-36 h-36 drop-shadow-md">
            <circle cx="50" cy="50" r="46" fill="#fffbe8" stroke="#ebd373" strokeWidth="5" />
            {Array.from({ length: 12 }, (_, i) => {
              const a = (i * 30 * Math.PI) / 180;
              return (
                <line
                  key={i}
                  x1={50 + 36 * Math.sin(a)}
                  y1={50 - 36 * Math.cos(a)}
                  x2={50 + 43 * Math.sin(a)}
                  y2={50 - 43 * Math.cos(a)}
                  stroke="#8a6d3b"
                  strokeWidth={i % 3 === 0 ? 3 : 1.5}
                />
              );
            })}
            {Array.from({ length: 12 }, (_, i) => {
              const num = i + 1;
              const a = (num * 30 * Math.PI) / 180;
              return (
                <text
                  key={num}
                  x={50 + 30.5 * Math.sin(a)}
                  y={50 - 30.5 * Math.cos(a)}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontWeight="900"
                  fontSize="11"
                  fill="#3b1f04"
                >
                  {num}
                </text>
              );
            })}
            <line x1="50" y1="50" x2={hx} y2={hy} stroke="#5b4a8a" strokeWidth="5" strokeLinecap="round" />
            <line x1="50" y1="50" x2={mx} y2={my} stroke="#e2703a" strokeWidth="3" strokeLinecap="round" />
            <circle cx="50" cy="50" r="5" fill="#ebd373" />
          </svg>
        </div>
      );
    }

    // Shapes SVG (Moana)
    if (npcId === 'moana' && round.visual && round.visual.kind === 'shape') {
      const svgStr = shapeSVG(round.visual);
      return (
        <div
          className="my-2 flex justify-center"
          dangerouslySetInnerHTML={{ __html: svgStr }}
        />
      );
    }

    // Tally Cards (Tiana)
    if (
      npcId === 'tiana' &&
      round.visual &&
      (round.visual.kind === 'tally' || round.visual.kind === 'tallychart')
    ) {
      const htmlStr = tallyCardHtml(round.visual);
      return (
        <div
          className="my-2 flex justify-center max-w-full overflow-x-auto"
          dangerouslySetInnerHTML={{ __html: htmlStr }}
        />
      );
    }

    // Jasmine Story Cards
    if (npcId === 'jasmine' && round.visual && round.visual.kind === 'story') {
      const cards = round.visual.cards || [];
      return (
        <div className="my-3 flex items-center justify-center gap-2 max-w-full overflow-x-auto p-1">
          {cards.map((c: any, i: number) => (
            <React.Fragment key={i}>
              <div className="flex-1 min-w-[70px] max-w-[110px] bg-white border-2 border-indigo-200 rounded-2xl p-2 text-center shadow-xs">
                <div className="text-3xl leading-none mb-1">{c.e}</div>
                <div className="text-xs font-black text-indigo-900 leading-tight">{c.t}</div>
              </div>
              {i < cards.length - 1 && <span className="text-indigo-500 font-black text-lg">➔</span>}
            </React.Fragment>
          ))}
          {round.visual.more && (
            <>
              <span className="text-indigo-500 font-black text-lg">➔</span>
              <div className="flex-1 min-w-[70px] max-w-[110px] bg-indigo-50 border-2 border-dashed border-indigo-300 rounded-2xl p-2 text-center">
                <div className="text-3xl">❓</div>
                <div className="text-xs font-black text-indigo-700">?</div>
              </div>
            </>
          )}
        </div>
      );
    }

    // Anna Harbor Sign
    if (npcId === 'anna' && round.visual && round.visual.kind === 'sentence') {
      return (
        <div className="my-3 mx-auto max-w-md bg-white border-4 border-red-200 rounded-2xl p-3 sm:p-4 text-center shadow-md">
          <p className="text-2xl sm:text-3xl font-black text-red-900 leading-tight tracking-normal">
            {round.visual.text}
          </p>
        </div>
      );
    }

    // Elsa Count-on Number Line & Snowflakes
    if (npcId === 'elsa' && round.visual) {
      if (round.visual.kind === 'counton') {
        const { start, hop } = round.visual;
        return (
          <div className="my-2 p-2 bg-sky-50 rounded-2xl border-2 border-sky-200 flex flex-col items-center">
            <div className="text-sm font-bold text-sky-800 mb-1">
              Start at <span className="text-lg font-black text-sky-600">{start}</span>, count on{' '}
              <span className="text-lg font-black text-red-600">+{hop}</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-3 py-2">
              {Array.from({ length: hop + 2 }, (_, i) => {
                const val = start + i;
                const isStart = i === 0;
                const isEnd = i === hop;
                return (
                  <div key={i} className="flex flex-col items-center">
                    {i > 0 && i <= hop && (
                      <span className="text-xs font-black text-red-500 mb-0.5">+1 ↷</span>
                    )}
                    <div
                      className={`w-9 h-9 sm:w-11 sm:h-11 rounded-full flex items-center justify-center font-black text-base sm:text-lg border-2 ${
                        isStart
                          ? 'bg-sky-600 text-white border-white shadow-sm'
                          : isEnd
                          ? 'bg-amber-300 text-amber-950 border-amber-500 shadow-md animate-pulse'
                          : 'bg-white text-sky-900 border-sky-200'
                      }`}
                    >
                      {isEnd ? '?' : val}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      }

      if (round.visual.kind === 'doubles') {
        const n = round.visual.n;
        return (
          <div className="my-2 flex items-center justify-center gap-3">
            <div className="bg-sky-50 border-2 border-sky-300 rounded-2xl p-2 sm:p-3 flex flex-wrap gap-1 max-w-[120px] justify-center text-2xl">
              {'❄️'.repeat(n)}
            </div>
            <span className="text-3xl font-black text-sky-700">➕</span>
            <div className="bg-sky-50 border-2 border-sky-300 rounded-2xl p-2 sm:p-3 flex flex-wrap gap-1 max-w-[120px] justify-center text-2xl">
              {'❄️'.repeat(n)}
            </div>
          </div>
        );
      }

      if (round.visual.a != null) {
        const { a, b } = round.visual;
        return (
          <div className="my-2 flex items-center justify-center gap-3">
            <div className="bg-sky-50 border-2 border-sky-300 rounded-2xl p-2 sm:p-3 flex flex-wrap gap-1 max-w-[140px] justify-center text-2xl">
              {Array.from({ length: a }, (_, i) => (
                <span key={i}>❄️</span>
              ))}
            </div>
            {b > 0 && (
              <>
                <span className="text-3xl font-black text-sky-700">
                  {round.visual.op === '-' ? '➖' : '➕'}
                </span>
                <div className="bg-sky-50 border-2 border-sky-300 rounded-2xl p-2 sm:p-3 flex flex-wrap gap-1 max-w-[140px] justify-center text-2xl">
                  {Array.from({ length: b }, (_, i) => (
                    <span key={i}>❄️</span>
                  ))}
                </div>
              </>
            )}
          </div>
        );
      }
    }

    // Rapunzel Flower Measuring
    if (npcId === 'rapunzel' && round.visual?.kind === 'flowers') {
      const heights = round.visual.heights || [3, 5, 2];
      const colors = ['#f472b6', '#fbbf24', '#a78bfa'];
      return (
        <div className="my-2 flex items-end justify-center gap-5 sm:gap-8 h-32 border-b-4 border-green-300 pb-1">
          {heights.map((h: number, i: number) => (
            <div key={i} className="flex flex-col items-center">
              <div
                className="w-8 h-8 rounded-full border-2 border-white shadow-sm flex items-center justify-center text-xs font-black text-white"
                style={{ backgroundColor: colors[i % colors.length] }}
              >
                🌻
              </div>
              <div
                className="w-2.5 bg-green-500 rounded-t-xs"
                style={{ height: `${h * 16}px` }}
              />
            </div>
          ))}
        </div>
      );
    }

    // Simple emoji picture
    if (round.pic) {
      return <div className="text-5xl text-center my-2">{round.pic}</div>;
    }

    return null;
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

  // Interactive Tile Builder (Belle spelling / dictation)
  const renderTileBuilder = () => {
    const builder = round.spell || round.build;
    if (!builder) return null;
    const target = builder.target || [];
    const tiles = builder.tiles || [];

    const handleTileTap = (tile: string, idx: number) => {
      if (disabled) return;
      const nextExpected = target[placedTiles.length];
      if (tile === nextExpected) {
        SoundFX.pop();
        const next = [...placedTiles, tile];
        setPlacedTiles(next);
        if (next.length === target.length) {
          // Completed build
          handleChoice(next.join(builder.sentence ? ' ' : ''));
        }
      } else {
        SoundFX.pop();
        setTileWrongs(tileWrongs + 1);
        Narrator.speakExact(npcId, builder.hint || 'Good try! Which one comes next?');
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
                disabled={isUsed || disabled}
                onClick={() => handleTileTap(t, i)}
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
            disabled={placedTiles.length === 0 || disabled}
            className="px-3.5 py-1.5 rounded-full bg-slate-200 hover:bg-slate-300 disabled:opacity-40 text-xs font-black text-slate-700 active:scale-95"
          >
            ↶ Undo
          </button>
          <button
            onClick={handleClear}
            disabled={placedTiles.length === 0 || disabled}
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
      if (disabled) return;
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
          handleChoice('__sortdone');
        }
      } else {
        SoundFX.pop();
        Narrator.speakExact(npcId, round.hint || 'Good try! Think about what the word does.');
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
            {Array.from({ length: totalRounds }, (_, i) => (
              <span
                key={i}
                className={`w-3.5 h-3.5 rounded-full transition-all ${
                  i < roundIdx
                    ? 'bg-amber-400 scale-100'
                    : i === roundIdx
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
            onClick={speakQuestion}
            className="w-9 h-9 rounded-full bg-amber-100 hover:bg-amber-200 border border-amber-300 flex items-center justify-center text-base shrink-0 active:scale-95 shadow-xs"
            aria-label="Read question again"
            title="Listen again"
          >
            🔊
          </button>
        </div>

        {/* Specialized Visual Aids */}
        {renderVisual()}
        {renderBlendLetters()}
        {renderTileBuilder()}
        {renderWordSort()}

        {/* Standard 3 Choice Cards (if not tile builder / sort) */}
        {!round.spell && !round.build && !round.sort && shuffledChoices.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 mt-4">
            {shuffledChoices.map((choice, i) => {
              const isSelected = selectedChoice === choice;
              const isCorrect = choice === round.answer;
              let btnStyle =
                'bg-white text-slate-800 border-amber-200 hover:border-amber-400 hover:shadow-md';

              if (feedback.type === 'correct' && isSelected) {
                btnStyle = 'bg-emerald-400 text-white border-white scale-105 shadow-lg';
              } else if (feedback.type === 'reveal' && isCorrect) {
                btnStyle = 'bg-emerald-400 text-white border-white scale-105 shadow-lg animate-pulse';
              } else if (feedback.type === 'wrong' && isSelected) {
                btnStyle = 'bg-rose-100 text-rose-900 border-rose-300 shake-card';
              }

              return (
                <button
                  key={i}
                  disabled={disabled}
                  onClick={() => handleChoice(choice)}
                  className={`min-h-[64px] sm:min-h-[80px] p-3 rounded-2xl border-3 font-black text-lg sm:text-xl flex items-center justify-center text-center shadow-sm active:scale-95 transition-all select-none ${btnStyle}`}
                >
                  <span className="leading-snug break-words">{choice}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Encouraging Feedback Banner */}
        {feedback.message && (
          <div
            className={`mt-4 p-3 rounded-2xl border-2 text-center font-black text-sm sm:text-base animate-fade-in ${
              feedback.type === 'correct'
                ? 'bg-emerald-100 border-emerald-300 text-emerald-900'
                : feedback.type === 'reveal'
                ? 'bg-amber-100 border-amber-300 text-amber-900'
                : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}
          >
            {feedback.message}
          </div>
        )}
      </div>
    </div>
  );
};
