import React from 'react';

interface PauseMenuProps {
  onResume: () => void;
  onOpenWardrobe: () => void;
  onOpenTreasureBook: () => void;
  onOpenTutorial: () => void;
  onOpenParentCorner: () => void;
}

export const PauseMenu: React.FC<PauseMenuProps> = ({
  onResume,
  onOpenWardrobe,
  onOpenTreasureBook,
  onOpenTutorial,
  onOpenParentCorner,
}) => {
  return (
    <div className="zsq-pause-wrap fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in pointer-events-auto">
      <div className="w-full max-w-sm bg-gradient-to-b from-[#fefbf5] to-[#f4f7fd] rounded-[32px] border-4 border-[#ebd373] p-6 text-center shadow-2xl">
        {/* Title */}
        <div className="text-4xl mb-2">⏸️</div>
        <h2 className="text-2xl font-black text-amber-950 mb-1">Adventure Paused</h2>
        <p className="text-xs font-bold text-slate-500 mb-6">Take a break or explore your treasures!</p>

        {/* Buttons List */}
        <div className="flex flex-col gap-2.5">
          {/* Resume */}
          <button
            onClick={onResume}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-400 text-amber-950 font-black text-lg shadow-md border border-white active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <span>▶️</span>
            <span>Resume Adventure</span>
          </button>

          {/* Wardrobe */}
          <button
            onClick={onOpenWardrobe}
            className="w-full py-3 px-4 rounded-2xl bg-white hover:bg-slate-50 text-purple-900 font-extrabold text-base shadow-xs border-2 border-purple-200 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <span>👗</span>
            <span>Princess Wardrobe</span>
          </button>

          {/* Treasure Book */}
          <button
            onClick={onOpenTreasureBook}
            className="w-full py-3 px-4 rounded-2xl bg-white hover:bg-slate-50 text-teal-900 font-extrabold text-base shadow-xs border-2 border-teal-200 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <span>📖</span>
            <span>Treasure Book & Stickers</span>
          </button>

          {/* Replay Tutorial */}
          <button
            onClick={onOpenTutorial}
            className="w-full py-3 px-4 rounded-2xl bg-white hover:bg-slate-50 text-indigo-900 font-extrabold text-base shadow-xs border-2 border-indigo-200 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <span>❓</span>
            <span>How to Play</span>
          </button>

          {/* Parent Corner */}
          <button
            onClick={onOpenParentCorner}
            className="w-full py-2.5 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs active:scale-95 transition-all flex items-center justify-center gap-1.5 mt-1"
          >
            <span>📊</span>
            <span>Parent Corner</span>
          </button>
        </div>
      </div>
    </div>
  );
};
