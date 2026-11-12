import React, { useState, useEffect } from 'react';
import { Narrator, Input } from '../engine-dom.js';
import { tutorialSteps, tutorialSay, TUTORIAL_BUTTONS } from '../flow/screens.js';

interface TutorialModalProps {
  onComplete: () => void;
}

export const TutorialModal: React.FC<TutorialModalProps> = ({ onComplete }) => {
  const [stepIdx, setStepIdx] = useState(0);
  // Touch screens get touch words (no keys); the voice reads exactly what is shown.
  const touch = !!Input.describeControls().touch;
  const STEPS = tutorialSteps(touch);
  const step = STEPS[stepIdx];

  useEffect(() => {
    Narrator.speakText(tutorialSay(step), { pitch: 1.15, rate: 0.95 });
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
          onClick={() => Narrator.speakText(tutorialSay(step), { pitch: 1.15, rate: 0.95 })}
          className="mb-6 inline-flex items-center justify-center gap-1.5 min-h-[60px] px-6 py-1.5 rounded-full bg-white/90 border border-amber-300 text-sm font-bold text-amber-800 shadow-sm active:scale-95"
          aria-label="Read again"
        >
          <span>{TUTORIAL_BUTTONS.listen}</span>
        </button>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between gap-3">
          <button
            onClick={handleSkip}
            className="min-h-[60px] px-6 py-3 rounded-full text-base font-bold text-slate-500 hover:text-slate-800 transition-colors"
          >
            {TUTORIAL_BUTTONS.skip}
          </button>

          <button
            onClick={handleNext}
            className="min-h-[60px] px-8 py-3.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-400 text-amber-950 font-black text-lg shadow-lg border-2 border-white hover:brightness-105 active:scale-95 transition-all"
          >
            {stepIdx === STEPS.length - 1 ? TUTORIAL_BUTTONS.last : TUTORIAL_BUTTONS.next}
          </button>
        </div>
      </div>
    </div>
  );
};
