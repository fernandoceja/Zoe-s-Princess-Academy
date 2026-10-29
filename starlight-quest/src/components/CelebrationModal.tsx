import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { FINALE_LINES } from '../engine-core.js';
import { Narrator, SoundFX } from '../engine-dom.js';

interface CelebrationModalProps {
  title: string;
  sub: string;
  isFinale?: boolean;
  onContinue: () => void;
}

export const CelebrationModal: React.FC<CelebrationModalProps> = ({
  title,
  sub,
  isFinale = false,
  onContinue,
}) => {
  useEffect(() => {
    SoundFX.fanfare();

    // Burst confetti
    const end = Date.now() + (isFinale ? 3000 : 1800);
    const interval: any = setInterval(() => {
      if (Date.now() > end) {
        clearInterval(interval);
        return;
      }
      confetti({
        startVelocity: 30,
        spread: 360,
        ticks: 60,
        origin: { x: Math.random(), y: Math.random() - 0.2 },
        colors: ['#ebd373', '#f472b6', '#60a5fa', '#34c779', '#a78bfa'],
      });
    }, 250);

    if (isFinale) {
      Narrator.speakExact('belle', FINALE_LINES.join(' '));
    } else {
      Narrator.speakExact('zoe', `${title}! ${sub}`);
    }

    return () => {
      clearInterval(interval);
      Narrator.stop();
    };
  }, [title, sub, isFinale]);

  return (
    <div className={`zsq-celebrate${isFinale ? ' zsq-finale' : ''} fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/65 backdrop-blur-sm animate-fade-in pointer-events-auto`}>
      <div className="w-full max-w-lg bg-gradient-to-b from-[#fdfcfe] via-[#fdf7ea] to-[#eff6ff] rounded-[32px] border-4 border-[#ebd373] p-6 sm:p-8 text-center shadow-2xl relative overflow-hidden">
        {/* Shimmering stars background */}
        <div className="text-6xl mb-3 animate-bounce">
          {isFinale ? '👑✨🌟' : '🌟💖✨'}
        </div>

        {/* Big Title */}
        <h2 className="text-2xl sm:text-3xl font-black text-amber-900 mb-3 tracking-tight">
          {title}
        </h2>

        {/* Subtitle */}
        <p className="text-base sm:text-lg font-bold text-purple-900 mb-6 leading-relaxed">
          {sub}
        </p>

        {isFinale && (
          <div className="bg-amber-100/80 border-2 border-amber-300 rounded-2xl p-4 mb-6 text-sm font-bold text-amber-950">
            {FINALE_LINES[0]}
          </div>
        )}

        {/* Continue Button */}
        <button
          onClick={onContinue}
          className="px-8 py-3.5 rounded-full bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 text-amber-950 font-black text-lg sm:text-xl shadow-lg border-2 border-white hover:brightness-105 active:scale-95 transition-all"
        >
          {isFinale ? 'Hooray! Long live Princess Zoe! 👑' : 'Continue Adventure ➡️'}
        </button>
      </div>
    </div>
  );
};
