import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { FINALE_LINES } from '../engine-core.js';
import { Narrator, SoundFX } from '../engine-dom.js';

// One card, four kinds (main.js: showCelebration, showFinale, showMilestone, showRest).
// celebrate: land glowing (confetti + fanfare). finale: the Starlight Crown (confetti + fanfare).
// milestone: star or kingdom news (fanfare, no confetti). rest: the soft stop (no sound, optional second button).
interface CelebrationModalProps {
  title: string;
  sub: string;
  kind?: 'celebrate' | 'finale' | 'milestone' | 'rest';
  emoji?: string;
  // What she says, in this princess's voice (default: Zoe reads the title and sub; finale: the finale lines).
  say?: string;
  voice?: string;
  actionLabel?: string;
  onContinue: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
}

export const CelebrationModal: React.FC<CelebrationModalProps> = ({
  title,
  sub,
  kind = 'celebrate',
  emoji,
  say,
  voice,
  actionLabel,
  onContinue,
  secondaryLabel,
  onSecondary,
}) => {
  const isFinale = kind === 'finale';
  const confettiOn = kind === 'celebrate' || kind === 'finale';

  useEffect(() => {
    if (kind === 'celebrate' || kind === 'finale' || kind === 'milestone') SoundFX.fanfare();

    // Burst confetti
    let interval: any = null;
    if (confettiOn) {
      const end = Date.now() + (isFinale ? 3000 : 1800);
      interval = setInterval(() => {
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
    }

    if (say) {
      Narrator.speakExact(voice || 'zoe', say);
    } else if (isFinale) {
      Narrator.speakExact('belle', FINALE_LINES.join(' '));
    } else if (kind === 'celebrate') {
      Narrator.speakExact('zoe', `${title}! ${sub}`);
    }

    return () => {
      if (interval) clearInterval(interval);
      Narrator.stop();
    };
  }, [title, sub, kind, say]);

  const header = emoji || (isFinale ? '👑✨🌟' : kind === 'rest' ? '🌙✨' : '🌟💖✨');
  const primary = actionLabel || (isFinale ? 'Hooray! Long live Princess Zoe! 👑' : kind === 'milestone' ? 'Yay! ➜' : 'Continue Adventure ➡️');

  return (
    <div className={`zsq-celebrate${isFinale ? ' zsq-finale' : ''} fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/65 backdrop-blur-sm animate-fade-in pointer-events-auto`}>
      <div className="w-full max-w-lg bg-gradient-to-b from-[#fdfcfe] via-[#fdf7ea] to-[#eff6ff] rounded-[32px] border-4 border-[#ebd373] p-6 sm:p-8 text-center shadow-2xl relative overflow-hidden">
        {/* Shimmering stars background */}
        <div className="text-6xl mb-3 animate-bounce">
          {header}
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
          {primary}
        </button>

        {secondaryLabel && onSecondary && (
          <button
            onClick={onSecondary}
            className="mt-3 px-8 py-3 rounded-full bg-white text-amber-900 font-black text-base sm:text-lg shadow-md border-2 border-amber-300 hover:brightness-105 active:scale-95 transition-all"
          >
            {secondaryLabel}
          </button>
        )}
      </div>
    </div>
  );
};
