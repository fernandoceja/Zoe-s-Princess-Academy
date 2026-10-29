import React from 'react';
import { PORTRAIT_ZOE } from '../engine-core.js';
import { PRINCESSES, NPC_ORDER } from '../engine-core.js';
import { PrincessId } from '../types';

interface HUDProps {
  stars: number;
  doneCount: number;
  totalLands: number;
  treasuresToday: number;
  treasuresTotal: number;
  activeNPC: PrincessId | null;
  questStep?: { current: number; total: number };
  interactPrompt: string | null;
  muted: boolean;
  onToggleMute: () => void;
  onPause: () => void;
  onInteract?: () => void;
  todayStarNPC?: PrincessId;
}

export const HUD: React.FC<HUDProps> = ({
  stars,
  doneCount,
  totalLands,
  treasuresToday,
  treasuresTotal,
  activeNPC,
  questStep,
  interactPrompt,
  muted,
  onToggleMute,
  onPause,
  onInteract,
  todayStarNPC,
}) => {
  return (
    <>
      {/* Top Bar HUD */}
      <header className="fixed top-0 left-0 right-0 z-20 flex items-center justify-between p-2 sm:p-3 pointer-events-none">
        {/* Left: Princess Zoe avatar & Stars */}
        <div className="flex items-center gap-2 pointer-events-auto bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full border-2 border-[#ebd373] shadow-md">
          <img
            src={PORTRAIT_ZOE}
            alt="Princess Zoe"
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover border-2 border-[#ebd373]"
          />
          <div className="flex items-center gap-1 font-black text-amber-600 text-base sm:text-lg">
            <span>⭐</span>
            <span>{stars}</span>
          </div>
        </div>

        {/* Center: Quest Pill & Daily Treasures */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Quest Progress Pill */}
          <div className="bg-white/90 backdrop-blur-md px-3.5 py-1.5 rounded-full border-2 border-[#ebd373] shadow-md flex items-center gap-1.5 text-xs sm:text-sm font-extrabold text-purple-900">
            {activeNPC && questStep ? (
              <span className="flex items-center gap-1">
                <span>✨</span>
                <span>{PRINCESSES[activeNPC]?.name}</span>
                <span className="text-amber-600">
                  · {questStep.current}/{questStep.total}
                </span>
              </span>
            ) : (
              <div className="flex items-center gap-1" title={`${doneCount} of ${totalLands} lands glowing`}>
                <span className="text-xs text-amber-700 font-bold mr-1 hidden sm:inline">Kingdoms:</span>
                {NPC_ORDER.map((id, i) => (
                  <span
                    key={id}
                    className={`text-xs transition-colors ${
                      i < doneCount ? 'text-amber-500 font-black' : 'text-slate-300'
                    }`}
                  >
                    {i < doneCount ? '◆' : '◇'}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Daily Treasures Badge */}
          <div
            className="hidden md:flex items-center gap-1 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full border-2 border-[#ebd373] shadow-md text-xs sm:text-sm font-bold text-teal-800"
            title="Daily treasures found across the kingdom"
          >
            <span>💎</span>
            <span>{treasuresToday}/{treasuresTotal}</span>
          </div>

          {todayStarNPC && !activeNPC && (
            <div
              className="hidden lg:flex items-center gap-1 bg-amber-100/90 backdrop-blur-md px-2.5 py-1.5 rounded-full border border-amber-300 text-xs font-bold text-amber-800 shadow-sm"
              title="Today's featured princess"
            >
              <span>👑</span>
              <span>Today: {PRINCESSES[todayStarNPC]?.name}</span>
            </div>
          )}
        </div>

        {/* Right: Sound & Pause Controls */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={onToggleMute}
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/95 border-2 border-[#ebd373] shadow-md flex items-center justify-center text-lg sm:text-xl hover:scale-105 active:scale-95 transition-transform"
            aria-label={muted ? 'Unmute Sound' : 'Mute Sound'}
          >
            {muted ? '🔇' : '🔊'}
          </button>
          <button
            onClick={onPause}
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-white/95 border-2 border-[#ebd373] shadow-md flex items-center justify-center text-lg sm:text-xl hover:scale-105 active:scale-95 transition-transform font-black text-purple-900"
            aria-label="Pause Menu"
          >
            ⏸️
          </button>
        </div>
      </header>

      {/* Proximity Interaction Banner (Bottom Center) */}
      {interactPrompt && (
        <div className="fixed bottom-20 sm:bottom-12 left-1/2 transform -translate-x-1/2 z-20 pointer-events-auto animate-bounce">
          <button
            onClick={onInteract}
            className="bg-gradient-to-r from-amber-400 to-yellow-300 text-amber-950 font-black px-5 py-3 rounded-full border-4 border-white shadow-xl text-base sm:text-lg flex items-center gap-2 active:scale-95 transition-transform"
          >
            <span>{interactPrompt}</span>
          </button>
        </div>
      )}
    </>
  );
};
