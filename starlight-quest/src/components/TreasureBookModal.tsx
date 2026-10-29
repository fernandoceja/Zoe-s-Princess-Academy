import React from 'react';
import { ALL_SECRETS } from '../engine-core.js';
import { PRINCESSES } from '../engine-core.js';

interface TreasureBookModalProps {
  foundSecrets: string[];
  treasuresToday: number;
  treasuresTotal: number;
  onBack: () => void;
}

export const TreasureBookModal: React.FC<TreasureBookModalProps> = ({
  foundSecrets,
  treasuresToday,
  treasuresTotal,
  onBack,
}) => {
  return (
    <div className="zsq-sheet fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in pointer-events-auto overflow-y-auto">
      <div className="w-full max-w-lg bg-gradient-to-b from-[#fefbf6] to-[#f4f7fd] rounded-[32px] border-4 border-[#ebd373] p-5 sm:p-7 shadow-2xl my-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-3xl">📖</span>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-amber-950">
                Treasure Book
              </h2>
              <p className="text-xs font-bold text-slate-500">
                Find hidden sparkles & secret scenery across the lands!
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

        {/* Daily Finds Counter */}
        <div className="mb-4 p-3 bg-teal-50 border-2 border-teal-200 rounded-2xl flex items-center justify-between text-xs sm:text-sm font-bold text-teal-900">
          <span>✨ Daily sparkling treasures found today:</span>
          <span className="font-black text-base text-teal-700">
            {treasuresToday} / {treasuresTotal}
          </span>
        </div>

        {/* Sticker Album Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-[50vh] overflow-y-auto p-1">
          {ALL_SECRETS.map((sec: any) => {
            const isFound = foundSecrets.includes(sec.id);
            const p = PRINCESSES[sec.npc];
            return (
              <div
                key={sec.id}
                className={`p-3 rounded-2xl border-2 flex flex-col items-center text-center shadow-xs transition-all ${
                  isFound
                    ? 'bg-white border-amber-300'
                    : 'bg-slate-100/80 border-dashed border-slate-300 opacity-60'
                }`}
              >
                <div className="text-4xl mb-1">{isFound ? sec.emoji : '❓'}</div>
                <div className="font-black text-xs text-slate-800 line-clamp-1">
                  {isFound ? sec.label : 'Secret Sticker'}
                </div>
                <div className="text-[10px] font-bold text-slate-400 mt-0.5">
                  {p?.name || 'Kingdom'}
                </div>
              </div>
            );
          })}
        </div>

        {/* Back Button */}
        <button
          onClick={onBack}
          className="mt-5 w-full py-3 rounded-full bg-gradient-to-r from-amber-400 to-yellow-400 text-amber-950 font-black text-base shadow-md active:scale-95"
        >
          Back to Quest 🌟
        </button>
      </div>
    </div>
  );
};
