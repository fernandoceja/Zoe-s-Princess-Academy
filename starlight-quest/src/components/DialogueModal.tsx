import React, { useState, useEffect } from 'react';
import { PRINCESSES } from '../engine-core.js';
import { Narrator } from '../engine-dom.js';
import { PrincessId } from '../types';

interface DialogueModalProps {
  npcId: PrincessId;
  lines: string[];
  kind?: 'greeting' | 'praise' | 'encourage';
  onDone: () => void;
  actionLabel?: string;
}

export const DialogueModal: React.FC<DialogueModalProps> = ({
  npcId,
  lines,
  kind = 'greeting',
  onDone,
  actionLabel = "Let's Go! ✨",
}) => {
  const [lineIdx, setLineIdx] = useState(0);
  const princess = PRINCESSES[npcId];
  const currentLine = lines[lineIdx] || '';

  useEffect(() => {
    if (currentLine) {
      Narrator.speakExact(npcId, currentLine);
    }
    return () => {
      Narrator.stop();
    };
  }, [lineIdx, currentLine, npcId]);

  const handleNext = () => {
    if (lineIdx < lines.length - 1) {
      setLineIdx(lineIdx + 1);
    } else {
      Narrator.stop();
      onDone();
    }
  };

  const handleReplay = () => {
    if (currentLine) {
      Narrator.speakExact(npcId, currentLine);
    }
  };

  return (
    <div className="zsq-sheet fixed inset-0 z-40 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-xs animate-fade-in pointer-events-auto">
      <div className="w-full max-w-xl bg-gradient-to-b from-white via-[#fdfcf7] to-[#f7f4e9] rounded-3xl border-4 border-[#ebd373] p-5 sm:p-7 shadow-2xl relative">
        {/* Princess Info Header */}
        <div className="flex items-center gap-4 mb-4">
          <div
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden border-4 shadow-md shrink-0 bg-white"
            style={{ borderColor: princess?.color || '#ebd373' }}
          >
            <img
              src={princess?.portrait}
              alt={princess?.name}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <h3
              className="text-xl sm:text-2xl font-black truncate"
              style={{ color: princess?.color || '#7c5e10' }}
            >
              {princess?.name}
            </h3>
            <p className="text-xs sm:text-sm font-bold text-slate-500 truncate">
              {princess?.landName}
            </p>
          </div>
          <button
            onClick={handleReplay}
            className="w-10 h-10 rounded-full bg-amber-100 hover:bg-amber-200 border border-amber-300 flex items-center justify-center text-lg shadow-sm active:scale-95"
            aria-label="Repeat speech"
            title="Read again"
          >
            🔊
          </button>
        </div>

        {/* Speech Bubble / Dialogue Text */}
        <div className="bg-white/90 border-2 border-amber-200/80 rounded-2xl p-4 sm:p-5 mb-5 shadow-inner min-h-[5rem] flex items-center">
          <p className="text-lg sm:text-xl font-bold text-slate-800 leading-snug">
            "{currentLine}"
          </p>
        </div>

        {/* Footer / Progression */}
        <div className="flex items-center justify-between">
          <div className="text-xs font-bold text-slate-400">
            {lines.length > 1 && `${lineIdx + 1} of ${lines.length}`}
          </div>
          <button
            onClick={handleNext}
            className="px-6 sm:px-8 py-3 rounded-full bg-gradient-to-r from-amber-400 to-yellow-400 text-amber-950 font-black text-base sm:text-lg shadow-md border-2 border-white hover:brightness-105 active:scale-95 transition-all"
          >
            {lineIdx < lines.length - 1 ? 'Next ➡️' : actionLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
