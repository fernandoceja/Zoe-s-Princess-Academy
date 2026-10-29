import React, { useState, useEffect } from 'react';
import { Narrator } from '../engine-dom.js';

interface TutorialModalProps {
  onComplete: () => void;
}

interface Step {
  title: string;
  emoji: string;
  text: string;
  speech: string;
}

const STEPS: Step[] = [
  {
    title: 'How to Move',
    emoji: '🧭',
    text: 'Use WASD, arrow keys, or drag with your finger on the screen to walk Princess Zoe around the kingdom.',
    speech: 'Welcome to Starlight Quest! Walk Princess Zoe around the kingdom using arrow keys, WASD, or drag the circle on your screen.',
  },
  {
    title: 'Talk to Friends',
    emoji: '👑',
    text: 'Walk up to any princess and press E, Space, or tap her to say hello and start her quest!',
    speech: 'Walk up to any princess and tap her or press E to say hello and start her quest!',
  },
  {
    title: 'Answer Questions',
    emoji: '⭐',
    text: 'Pick an answer from the big cards. Wrong answers get gentle hints and second chances—no losing ever!',
    speech: 'Answer five fun questions. Tap the cards to answer! If you miss, a gentle hint helps you try again.',
  },
  {
    title: 'Collect Stars',
    emoji: '✨',
    text: 'Earn stars with every quest! Completing all ten lands brings the golden Starlight Crown back to the castle.',
    speech: 'Earn stars and star shards! Restoring all ten lands brings the magical Starlight Crown back to the castle.',
  },
  {
    title: 'Pause & Dress Up',
    emoji: '👗',
    text: 'Tap the pause button anytime to change your dress, check your stickers, or visit the Parent Corner.',
    speech: 'Tap the pause button anytime to dress up Zoe with unlocked rewards, or view the Parent Corner.',
  },
];

export const TutorialModal: React.FC<TutorialModalProps> = ({ onComplete }) => {
  const [stepIdx, setStepIdx] = useState(0);

  const step = STEPS[stepIdx];

  useEffect(() => {
    Narrator.speakText(step.speech, { pitch: 1.15, rate: 0.95 });
    return () => {
      Narrator.stop();
    };
  }, [stepIdx]);

  const handleNext = () => {
    if (stepIdx < STEPS.length - 1) {
      setStepIdx(stepIdx + 1);
    } else {
      Narrator.stop();
      onComplete();
    }
  };

  const handleSkip = () => {
    Narrator.stop();
    onComplete();
  };

  return (
    <div className="zsq-tutorial fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/65 backdrop-blur-sm">
      <div className="relative w-full max-w-lg bg-gradient-to-b from-[#fdfcfe] via-[#fbf7eb] to-[#eef6ff] rounded-[32px] border-4 border-[#ebd373] p-6 sm:p-8 text-center shadow-2xl">
        {/* Step dots */}
        <div className="flex justify-center gap-2 mb-4">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`w-3 h-3 rounded-full transition-all ${
                i === stepIdx
                  ? 'bg-amber-500 scale-125'
                  : i < stepIdx
                  ? 'bg-amber-300'
                  : 'bg-slate-300'
              }`}
            />
          ))}
        </div>

        {/* Emoji Icon */}
        <div className="text-5xl mb-3 animate-bounce">{step.emoji}</div>

        {/* Title */}
        <h2 className="text-2xl font-black text-amber-900 mb-2">
          {step.title}
        </h2>

        {/* Description */}
        <p className="text-base sm:text-lg font-medium text-slate-700 mb-8 min-h-[4rem] px-2 flex items-center justify-center">
          {step.text}
        </p>

        {/* Audio Replay Button */}
        <button
          onClick={() => Narrator.speakText(step.speech, { pitch: 1.15, rate: 0.95 })}
          className="mb-6 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white/90 border border-amber-300 text-xs font-bold text-amber-800 shadow-sm active:scale-95"
          aria-label="Read again"
        >
          <span>🔊</span>
          <span>Listen again</span>
        </button>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={handleSkip}
            className="px-5 py-3 rounded-full text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors"
          >
            Skip
          </button>

          <button
            onClick={handleNext}
            className="px-8 py-3.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-400 text-amber-950 font-black text-base shadow-lg border-2 border-white hover:brightness-105 active:scale-95 transition-all"
          >
            {stepIdx === STEPS.length - 1 ? "Let's Play! 👑" : 'Next ➡️'}
          </button>
        </div>
      </div>
    </div>
  );
};
