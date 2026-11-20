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
  onOpenMap?: () => void;
  todayStarNPC?: PrincessId;
  // False while a princess is talking or a quest card is open: the pause button looks faded (it shows a short note).
  canPause?: boolean;
  // Pause anytime: during a talk, a question or a card the sheet covers the bar, so the Pause button floats above it.
  pauseOnTop?: boolean;
  // A card (land glowing, milestone, rest, finale) is a z-50 overlay: Pause floats above it too (not while paused).
  pauseAboveCard?: boolean;
  // Where the sparkle trail leads (today's princess) while she walks around; shown as a gentle chip at the bottom.
  nextNPC?: PrincessId | null;
  showNext?: boolean;
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
  onOpenMap,
  canPause = true,
  pauseOnTop = false,
  pauseAboveCard = false,
  nextNPC,
  showNext = false,
}) => {
  const nextPrincess = nextNPC ? PRINCESSES[nextNPC] : null;
  const allGlowing = totalLands > 0 && doneCount >= totalLands;
  const pauseButton = (
    <button
      onClick={onPause}
      className={`w-[60px] h-[60px] rounded-full bg-white/95 border-2 border-[#ebd373] shadow-md flex items-center justify-center text-2xl hover:scale-105 active:scale-95 transition-all font-black text-purple-900 ${canPause ? '' : 'opacity-40 grayscale'}`}
      aria-label="Pause Menu"
      aria-disabled={!canPause}
    >
      ⏸️
    </button>
  );
  return (
    <>
      {/* Top Bar HUD */}
      <header className="fixed top-0 left-0 right-0 z-20 flex flex-wrap items-center justify-between gap-y-1 p-2 sm:p-3 pointer-events-none">
        {/* Left: Princess Zoe avatar & Stars */}
        <div className="flex items-center gap-2 pointer-events-auto bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full border-2 border-[#ebd373] shadow-md">
          <img
            src={PORTRAIT_ZOE}
            alt="Princess Zoe"
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover border-2 border-[#ebd373]"
          />
          <div className="flex items-center gap-1 font-black text-amber-800 text-base sm:text-lg tabular-nums" aria-label={`${stars} stars`}>
            <span aria-hidden="true">⭐</span>
            <span>{stars}</span>
          </div>
        </div>

        {/* Center: Quest Pill & Daily Treasures */}
        <div className="flex items-center justify-center gap-2 pointer-events-none order-3 w-full sm:order-none sm:w-auto">   {/* no taps stolen from the world */}
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
              <div className="flex items-center gap-1.5" title={`${doneCount} of ${totalLands} lands glowing`}>
                <span className="text-xs sm:text-sm text-purple-950 font-black mr-0.5 hidden lg:inline">Kingdoms:</span>
                {/* Clear diamonds (from the AI Studio version): filled gold with a dark edge, empty ones still outlined. */}
                <span className="flex items-center gap-0.5" aria-hidden="true">
                  {NPC_ORDER.map((id, i) => {
                    const filled = i < doneCount;
                    return (
                      <svg key={id} viewBox="0 0 20 20" className="zsq-kingdom-diamond w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0">
                        <polygon points="10,1.5 18.5,10 10,18.5 1.5,10" fill={filled ? '#f59e0b' : '#f1f5f9'} stroke={filled ? '#92400e' : '#64748b'} strokeWidth="2" />
                      </svg>
                    );
                  })}
                </span>
                <span className="text-xs sm:text-sm font-black text-amber-900 tabular-nums">{doneCount}/{totalLands}</span>
              </div>
            )}
          </div>

          {/* Daily Treasures Badge */}
          <div
            className="hidden md:flex items-center gap-1 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full border-2 border-[#ebd373] shadow-md text-xs sm:text-sm font-extrabold text-teal-900 tabular-nums"
            title="Daily treasures found across the kingdom"
            aria-label={`${treasuresToday} of ${treasuresTotal} gems today`}
          >
            <span aria-hidden="true">💎</span>
            <span className="hidden lg:inline">Gems</span>
            <span>{treasuresToday}/{treasuresTotal}</span>
          </div>

        </div>

        {/* Right: Sound & Pause Controls */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {onOpenMap && (
            <button
              onClick={onOpenMap}
              className="w-[60px] h-[60px] rounded-full bg-white/95 border-2 border-[#ebd373] shadow-md flex items-center justify-center text-2xl hover:scale-105 active:scale-95 transition-transform"
              aria-label="Kingdom Map"
            >
              🗺️
            </button>
          )}
          <button
            onClick={onToggleMute}
            className="w-[60px] h-[60px] rounded-full bg-white/95 border-2 border-[#ebd373] shadow-md flex items-center justify-center text-2xl hover:scale-105 active:scale-95 transition-transform"
            aria-label={muted ? 'Unmute Sound' : 'Mute Sound'}
          >
            {muted ? '🔇' : '🔊'}
          </button>
          {pauseOnTop || pauseAboveCard ? <span className="w-[60px] h-[60px]" aria-hidden="true" /> : pauseButton}
        </div>
      </header>
      {pauseOnTop && <div className="zsq-pause-float fixed top-2 right-2 sm:top-3 sm:right-3 z-[45] pointer-events-auto">{pauseButton}</div>}
      {pauseAboveCard && <div className="zsq-pause-float fixed top-2 right-2 sm:top-3 sm:right-3 z-[55] pointer-events-auto">{pauseButton}</div>}

      {/* Where to go next (from the AI Studio version): a calm chip at the bottom while she walks, never a button.
          Hidden near a princess (the talk button takes this spot) and on narrow phones (the trail shows the way). */}
      {showNext && !activeNPC && !interactPrompt && (nextPrincess || allGlowing) && (
        <div className="zsq-next-chip hidden sm:flex fixed bottom-12 left-1/2 -translate-x-1/2 z-20 pointer-events-none max-w-[calc(100vw-20rem)] items-center gap-2 bg-white/95 backdrop-blur-md px-4 py-2 rounded-full border-2 border-amber-300 shadow-md font-extrabold text-purple-950 text-sm sm:text-base">
          <span aria-hidden="true">{nextPrincess ? '🧭' : '👑'}</span>
          <span className="truncate">{nextPrincess ? `Next: ${nextPrincess.name} at ${nextPrincess.landName}` : `All ${totalLands} kingdoms are glowing!`}</span>
        </div>
      )}

      {/* Proximity Interaction Banner (Bottom Center) */}
      {interactPrompt && (
        <div className="fixed bottom-20 sm:bottom-12 left-1/2 transform -translate-x-1/2 z-20 pointer-events-auto animate-bounce">
          <button
            onClick={onInteract}
            className="min-h-[60px] bg-gradient-to-r from-amber-400 to-yellow-300 text-amber-950 font-black px-6 py-3 rounded-full border-4 border-white shadow-xl text-base sm:text-lg flex items-center gap-2 active:scale-95 transition-transform"
          >
            <span>{interactPrompt}</span>
          </button>
        </div>
      )}
    </>
  );
};
