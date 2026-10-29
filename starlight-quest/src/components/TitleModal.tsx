import React from 'react';
import { PORTRAIT_ZOE } from '../engine-core.js';

interface TitleModalProps {
  onStart: () => void;
  hasSeenTutorial: boolean;
  onOpenTutorial: () => void;
}

export const TitleModal: React.FC<TitleModalProps> = ({
  onStart,
  hasSeenTutorial,
  onOpenTutorial,
}) => {
  return (
    <div className="zsq-title fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-gradient-to-b from-[#fdfcfe] via-[#fdf8e6] to-[#eef6ff] rounded-[32px] border-4 border-[#ebd373] p-6 sm:p-8 text-center shadow-2xl overflow-hidden">
        {/* Soft magical sparkle corners */}
        <div className="absolute -top-10 -right-10 w-28 h-28 bg-yellow-200/40 rounded-full blur-xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-28 h-28 bg-purple-200/40 rounded-full blur-xl pointer-events-none" />

        {/* Crown Icon & Zoe Portrait */}
        <div className="relative inline-block mb-3">
          <div className="w-24 h-24 sm:w-28 sm:h-28 mx-auto rounded-full overflow-hidden border-4 border-[#ebd373] shadow-lg bg-yellow-100">
            <img
              src={PORTRAIT_ZOE}
              alt="Princess Zoe"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 text-3xl">
            👑
          </div>
        </div>

        {/* Title */}
        <h1 className="text-2xl sm:text-3xl font-black text-amber-900 mb-1 tracking-tight">
          Zoe's Starlight Quest
        </h1>
        <p className="text-sm sm:text-base font-semibold text-purple-900/80 mb-6">
          A gentle 3D learning adventure for Princess Zoe ✨
        </p>

        {/* Start Button */}
        <div className="flex flex-col gap-3">
          <button
            onClick={onStart}
            className="w-full py-4 px-6 rounded-full bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 text-amber-950 font-black text-xl shadow-lg border-2 border-white hover:brightness-105 active:scale-95 transition-all"
          >
            Start Adventure 🌟
          </button>

          {hasSeenTutorial && (
            <button
              onClick={onOpenTutorial}
              className="w-full py-2.5 px-4 rounded-full bg-white/80 text-purple-900 font-bold text-sm border border-purple-200 hover:bg-white active:scale-95 transition-all"
            >
              📖 How to Play
            </button>
          )}
        </div>

        {/* Reassuring footer for kids */}
        <p className="mt-5 text-xs font-semibold text-slate-500">
          No timers, no penalties, and always gentle hints. Have fun! 💖
        </p>
      </div>
    </div>
  );
};
