import React, { useEffect, useRef, useState } from 'react';
import { Narrator } from '../engine-dom.js';
import { PAUSE, pauseSay, spoken, SPEAK_TAP_MS } from '../flow/screens.js';

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
  // Each button says its name when tapped. A second tap goes at once; if she waits a moment, it goes by itself.
  // Tapping a different button meanwhile switches to that one. With sound off it just goes.
  const [armed, setArmed] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => {
    Narrator.speakText(pauseSay(), { pitch: 1.15, rate: 0.95 });
    return () => { window.clearTimeout(timer.current); Narrator.stop(); };
  }, []);
  const tap = (id: string, label: string, act: () => void) => {
    window.clearTimeout(timer.current);
    if (armed === id || Narrator.muted) { setArmed(null); act(); return; }
    setArmed(id);
    Narrator.speakText(spoken(label), { pitch: 1.15, rate: 0.95 });
    timer.current = window.setTimeout(() => { setArmed(null); act(); }, SPEAK_TAP_MS);
  };
  const ring = (id: string) => (armed === id ? ' ring-4 ring-amber-400' : '');

  return (
    <div className="zsq-pause-wrap fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in pointer-events-auto overflow-y-auto">
      <div className="w-full max-w-sm my-auto bg-gradient-to-b from-[#fefbf5] to-[#f4f7fd] rounded-[32px] border-4 border-[#ebd373] p-6 text-center shadow-2xl">
        {/* Title */}
        <div className="text-4xl mb-2">⏸️</div>
        <h2 className="text-2xl font-black text-amber-950 mb-1">{PAUSE.heading}</h2>
        <p className="text-xs font-bold text-slate-500 mb-6">{PAUSE.sub}</p>

        {/* Buttons List */}
        <div className="flex flex-col gap-2.5">
          {/* Resume */}
          <button
            onClick={() => tap('resume', PAUSE.resume, onResume)}
            className={`w-full min-h-[60px] py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-400 text-amber-950 font-black text-lg shadow-md border border-white active:scale-95 transition-all flex items-center justify-center gap-2${ring('resume')}`}
          >
            <span>▶️</span>
            <span>{PAUSE.resume}</span>
          </button>

          {/* Wardrobe */}
          <button
            onClick={() => tap('wardrobe', PAUSE.wardrobe, onOpenWardrobe)}
            className={`w-full min-h-[60px] py-3 px-4 rounded-2xl bg-white hover:bg-slate-50 text-purple-900 font-extrabold text-base shadow-xs border-2 border-purple-200 active:scale-95 transition-all flex items-center justify-center gap-2${ring('wardrobe')}`}
          >
            <span>👗</span>
            <span>{PAUSE.wardrobe}</span>
          </button>

          {/* Treasure Book */}
          <button
            onClick={() => tap('treasure', PAUSE.treasure, onOpenTreasureBook)}
            className={`w-full min-h-[60px] py-3 px-4 rounded-2xl bg-white hover:bg-slate-50 text-teal-900 font-extrabold text-base shadow-xs border-2 border-teal-200 active:scale-95 transition-all flex items-center justify-center gap-2${ring('treasure')}`}
          >
            <span>📖</span>
            <span>{PAUSE.treasure}</span>
          </button>

          {/* Replay Tutorial */}
          <button
            onClick={() => tap('howTo', PAUSE.howTo, onOpenTutorial)}
            className={`w-full min-h-[60px] py-3 px-4 rounded-2xl bg-white hover:bg-slate-50 text-indigo-900 font-extrabold text-base shadow-xs border-2 border-indigo-200 active:scale-95 transition-all flex items-center justify-center gap-2${ring('howTo')}`}
          >
            <span>❓</span>
            <span>{PAUSE.howTo}</span>
          </button>

          {/* Parent Corner */}
          <button
            onClick={onOpenParentCorner}
            className="w-full py-2.5 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs active:scale-95 transition-all flex items-center justify-center gap-1.5 mt-1"
          >
            <span>📊</span>
            <span>{PAUSE.parent}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
