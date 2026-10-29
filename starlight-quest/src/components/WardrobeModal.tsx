import React from 'react';
import { OUTFIT, MILESTONES } from '../engine-core.js';
import { SoundFX } from '../engine-dom.js';

interface WardrobeModalProps {
  stars: number;
  unlockedMilestones: string[];
  currentOutfit: {
    trail?: string;
    gem?: string;
    skirt?: string;
    buddy?: boolean;
  };
  onSelectOutfit: (newOutfit: any) => void;
  onBack: () => void;
}

export const WardrobeModal: React.FC<WardrobeModalProps> = ({
  stars,
  unlockedMilestones,
  currentOutfit,
  onSelectOutfit,
  onBack,
}) => {
  const has = (id: string) => unlockedMilestones.includes(id);

  const handleChoose = (category: string, value: any) => {
    SoundFX.pop();
    const updated = { ...currentOutfit, [category]: value };
    onSelectOutfit(updated);
  };

  return (
    <div className="zsq-sheet fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in pointer-events-auto overflow-y-auto">
      <div className="w-full max-w-lg bg-gradient-to-b from-[#fefbf6] to-[#f4f7fd] rounded-[32px] border-4 border-[#ebd373] p-5 sm:p-7 shadow-2xl my-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-3xl">👗</span>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-amber-950">
                Zoe's Wardrobe
              </h2>
              <p className="text-xs font-bold text-slate-500">
                Earn stars in quests to unlock royal outfits! (⭐ {stars} stars)
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

        {/* Categories */}
        <div className="flex flex-col gap-4 max-h-[60vh] overflow-y-auto pr-1">
          {/* Sparkle Trail (10 Stars) */}
          <div className="p-3.5 bg-white rounded-2xl border-2 border-amber-200 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="font-black text-sm text-purple-900">✨ Sparkle Trail</span>
              <span className="text-xs font-bold text-amber-700">
                {has('trail-10') ? 'Unlocked 🔓' : 'Needs 10 ⭐'}
              </span>
            </div>
            {has('trail-10') ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {OUTFIT.trail.choices.map((c: any) => (
                  <button
                    key={c.id}
                    onClick={() => handleChoose('trail', c.id)}
                    className={`p-2 rounded-xl border-2 text-xs font-bold transition-all ${
                      (currentOutfit.trail || 'pinkgold') === c.id
                        ? 'border-purple-600 bg-purple-50 font-black text-purple-900 shadow-sm'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">Earn 10 stars to unlock sparkle trail colors!</p>
            )}
          </div>

          {/* Tiara Gem Color (25 Stars) */}
          <div className="p-3.5 bg-white rounded-2xl border-2 border-amber-200 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="font-black text-sm text-purple-900">💎 Tiara Gem</span>
              <span className="text-xs font-bold text-amber-700">
                {has('tiara-25') ? 'Unlocked 🔓' : 'Needs 25 ⭐'}
              </span>
            </div>
            {has('tiara-25') ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {OUTFIT.gem.choices.map((c: any) => (
                  <button
                    key={c.id}
                    onClick={() => handleChoose('gem', c.id)}
                    className={`p-2 rounded-xl border-2 text-xs font-bold transition-all ${
                      (currentOutfit.gem || 'pink') === c.id
                        ? 'border-purple-600 bg-purple-50 font-black text-purple-900 shadow-sm'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">Earn 25 stars to unlock gem colors for Zoe's tiara!</p>
            )}
          </div>

          {/* Skirt Color (50 Stars) */}
          <div className="p-3.5 bg-white rounded-2xl border-2 border-amber-200 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="font-black text-sm text-purple-900">👗 Skirt Color</span>
              <span className="text-xs font-bold text-amber-700">
                {has('skirt-50') ? 'Unlocked 🔓' : 'Needs 50 ⭐'}
              </span>
            </div>
            {has('skirt-50') ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {OUTFIT.skirt.choices.map((c: any) => (
                  <button
                    key={c.id}
                    onClick={() => handleChoose('skirt', c.id)}
                    className={`p-2 rounded-xl border-2 text-xs font-bold transition-all ${
                      (currentOutfit.skirt || 'rose') === c.id
                        ? 'border-purple-600 bg-purple-50 font-black text-purple-900 shadow-sm'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">Earn 50 stars to unlock beautiful new royal skirt colors!</p>
            )}
          </div>

          {/* Butterfly Companion (100 Stars) */}
          <div className="p-3.5 bg-white rounded-2xl border-2 border-amber-200 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="font-black text-sm text-purple-900">🦋 Butterfly Friend</span>
              <span className="text-xs font-bold text-amber-700">
                {has('butterfly-100') ? 'Unlocked 🔓' : 'Needs 100 ⭐'}
              </span>
            </div>
            {has('butterfly-100') ? (
              <button
                onClick={() => handleChoose('buddy', !currentOutfit.buddy)}
                className={`w-full py-2.5 rounded-xl border-2 text-xs font-black transition-all ${
                  currentOutfit.buddy
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-900 shadow-sm'
                    : 'border-slate-200 bg-slate-50 text-slate-700'
                }`}
              >
                {currentOutfit.buddy ? '✨ Fluttering with Zoe (Active)' : 'Fly with Butterfly Friend'}
              </button>
            ) : (
              <p className="text-xs text-slate-400 italic">Reach 100 stars to make a magical butterfly companion!</p>
            )}
          </div>
        </div>

        {/* Back Button */}
        <button
          onClick={onBack}
          className="mt-5 w-full py-3 rounded-full bg-gradient-to-r from-amber-400 to-yellow-400 text-amber-950 font-black text-base shadow-md active:scale-95"
        >
          Done ✨
        </button>
      </div>
    </div>
  );
};
