import React, { useState } from 'react';
import { PRINCESSES, NPC_ORDER } from '../engine-core.js';
import { gateQuestion } from '../flow/parent.js';

interface ParentCornerProps {
  stars: number;
  doneLands: string[];
  ladderState: Record<string, any>;
  schoolWords: string[];
  onSaveWords: (words: string[]) => void;
  onBack: () => void;
}

const STANDARDS_MAP: Record<string, { standard: string; desc: string }> = {
  belle: {
    standard: 'CCSS ELA RF.1.3 & RF.1.4',
    desc: 'Sight words (Dolch 1st Grade) & decoding short-vowel CVC phonics.',
  },
  elsa: {
    standard: 'CCSS Math 1.OA, 1.OA.5/6',
    desc: 'Addition & subtraction within 20, counting on from larger addends, doubles.',
  },
  rapunzel: {
    standard: 'NGSS 1-LS1 & CCSS Math 1.MD.1-2',
    desc: 'Plant needs, living vs nonliving, flower height measuring and sorting.',
  },
  cinderella: {
    standard: 'CCSS Math 1.MD.3',
    desc: 'Telling time to the hour and half-hour using analog clock faces.',
  },
  ariel: {
    standard: 'CCSS ELA RF.1.2 & RF.1.3',
    desc: 'Rhyming patterns, word families, and short-vowel auditory discrimination.',
  },
  moana: {
    standard: 'CCSS Math 1.G.A.1 & 1.G.A.2',
    desc: '2D & 3D geometry, shape recognition, counting sides and corners.',
  },
  jasmine: {
    standard: 'CCSS ELA RL.1.2 & RL.1.3',
    desc: 'Story sequencing with first / next / last (beginning, middle, end).',
  },
  anna: {
    standard: 'CCSS ELA L.1.2.a & L.1.2.b',
    desc: 'Capitalization of names / sentences and sentence end punctuation (. ? !).',
  },
  tiana: {
    standard: 'CCSS Math 1.MD.C.4',
    desc: 'Tally marks, counting by 5s, interpreting vegetable stand picture data.',
  },
  aurora: {
    standard: 'CCSS ELA L.1.1',
    desc: 'Grammar fundamentals: identifying and sorting naming words and action words.',
  },
};

export const ParentCorner: React.FC<ParentCornerProps> = ({
  stars,
  doneLands,
  ladderState,
  schoolWords,
  onSaveWords,
  onBack,
}) => {
  // Grown-up gate (ui.js showParentGate): a random sum, three answer buttons, a new question after a miss.
  const [locked, setLocked] = useState(true);
  const [gate, setGate] = useState(() => gateQuestion());
  const [lockError, setLockError] = useState(false);
  const [customWordsInput, setCustomWordsInput] = useState(schoolWords.join(', '));
  const [savedSuccess, setSavedSuccess] = useState(false);

  const checkAnswer = (n: number) => {
    if (n === gate.sum) {
      setLocked(false);
      setLockError(false);
    } else {
      setLockError(true);
      setGate(gateQuestion());
    }
  };

  const handleSaveWords = () => {
    const parsed = customWordsInput
      .split(',')
      .map((w) => w.trim().toLowerCase())
      .filter((w) => w.length > 0);
    onSaveWords(parsed);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  if (locked) {
    return (
      <div className="zsq-parent-wrap fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in pointer-events-auto">
        <div className="w-full max-w-sm bg-white rounded-3xl border-4 border-amber-300 p-6 text-center shadow-2xl">
          <div className="text-4xl mb-2">🔒</div>
          <h2 className="text-xl font-black text-slate-800 mb-1">Grown-ups Corner</h2>
          <p className="text-xs text-slate-500 mb-4">
            Please answer this quick question to enter:
          </p>

          <p className="text-base font-bold text-slate-700">
            Tap the answer to <span className="text-amber-600 font-black">{gate.a} + {gate.b}</span>
          </p>
          <div className="flex flex-col gap-2">
            {gate.options.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => checkAnswer(n)}
                className="py-2.5 rounded-xl border-2 border-slate-300 bg-white hover:border-amber-400 text-lg font-black text-slate-800"
              >
                {n}
              </button>
            ))}
          </div>
          {lockError && (
            <span className="text-xs font-bold text-red-500">Oops, try again!</span>
          )}
          <button
            type="button"
            onClick={onBack}
            className="w-full py-2.5 rounded-full bg-slate-100 text-slate-600 font-bold text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="zsq-parent-wrap fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in pointer-events-auto overflow-y-auto">
      <div className="w-full max-w-2xl bg-gradient-to-b from-[#fefdf9] to-[#f5f8fd] rounded-[32px] border-4 border-[#ebd373] p-5 sm:p-7 shadow-2xl my-auto max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-3xl">📊</span>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-amber-950">
                Parent & Educator Corner
              </h2>
              <p className="text-xs font-bold text-slate-500">
                Zoe's California Grade 1 learning progress & curriculum mapping
              </p>
            </div>
          </div>
          <button
            onClick={onBack}
            className="w-9 h-9 rounded-full bg-slate-200 hover:bg-slate-300 font-black text-slate-700 flex items-center justify-center text-lg active:scale-95"
            aria-label="Back"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-4">
          {/* Progress Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            <div className="p-3 bg-white rounded-2xl border border-amber-200 shadow-xs text-center">
              <div className="text-2xl font-black text-amber-600">⭐ {stars}</div>
              <div className="text-xs font-bold text-slate-600">Total Stars</div>
            </div>
            <div className="p-3 bg-white rounded-2xl border border-amber-200 shadow-xs text-center">
              <div className="text-2xl font-black text-purple-700">
                {doneLands.length} / {NPC_ORDER.length}
              </div>
              <div className="text-xs font-bold text-slate-600">Lands Glowing</div>
            </div>
            <div className="col-span-2 sm:col-span-1 p-3 bg-white rounded-2xl border border-amber-200 shadow-xs text-center">
              <div className="text-2xl font-black text-emerald-600">No Fails</div>
              <div className="text-xs font-bold text-slate-600">Adaptive Learning</div>
            </div>
          </div>

          {/* Teacher's Weekly Sight Words Input */}
          <div className="p-4 bg-white rounded-2xl border-2 border-indigo-200 shadow-xs">
            <h3 className="text-sm font-black text-indigo-950 mb-1 flex items-center gap-1.5">
              <span>✏️</span>
              <span>Classroom / Weekly Sight Words</span>
            </h3>
            <p className="text-xs text-slate-600 mb-2">
              Enter custom words (separated by commas) to inject into Belle's reading practice:
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={customWordsInput}
                onChange={(e) => setCustomWordsInput(e.target.value)}
                placeholder="e.g. said, there, what, about"
                className="flex-1 px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-400"
              />
              <button
                onClick={handleSaveWords}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-xs active:scale-95"
              >
                Save
              </button>
            </div>
            {savedSuccess && (
              <p className="text-xs font-bold text-emerald-600 mt-1">Saved successfully!</p>
            )}
          </div>

          {/* Curriculum Standards Table */}
          <div className="bg-white rounded-2xl border-2 border-amber-200 p-3 sm:p-4 shadow-xs">
            <h3 className="text-sm font-black text-amber-950 mb-2">
              California Grade 1 Standards Alignment
            </h3>
            <div className="flex flex-col gap-2">
              {NPC_ORDER.map((id) => {
                const p = PRINCESSES[id];
                const info = STANDARDS_MAP[id];
                const isComplete = doneLands.includes(id);
                const tier = ladderState[id]?.tier || 1;
                return (
                  <div
                    key={id}
                    className="p-2.5 rounded-xl border border-slate-200 bg-slate-50/60 flex items-start gap-2.5 text-xs"
                  >
                    <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-amber-300 bg-white">
                      <img src={p?.portrait} alt={p?.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="font-black text-slate-900 truncate">
                          {p?.name} · {p?.landName}
                        </span>
                        <span className="font-extrabold text-[10px] px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 shrink-0">
                          Tier {tier} {isComplete ? '✨ Glowing' : ''}
                        </span>
                      </div>
                      <div className="font-bold text-indigo-700">{info?.standard}</div>
                      <div className="text-slate-600 mt-0.5">{info?.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Back Button */}
        <button
          onClick={onBack}
          className="mt-4 w-full py-3 rounded-full bg-gradient-to-r from-amber-400 to-yellow-400 text-amber-950 font-black text-base shadow-md active:scale-95 shrink-0"
        >
          Return to Game
        </button>
      </div>
    </div>
  );
};
