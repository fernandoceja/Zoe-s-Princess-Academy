/* Zoe's Starlight Quest: the words on the kid-facing screens, and what she hears for them (Q2).
 * One source for both, so the voice can never drift from the screen. Pure: no DOM, no audio.
 * The components render these strings and speak spoken(...) of them.
 */

/** Turn shown text into text to read aloud: no pictures, "&" says "and", tidy spacing. */
export function spoken(...parts) {
  return parts.flat().filter(Boolean).join(' ')
    .replace(/[\p{Extended_Pictographic}️‍⃣]/gu, '')
    .replace(/&/g, 'and')
    .replace(/\s+/g, ' ')
    .replace(/\s+([.!?,])/g, '$1')
    .replace(/\(\s*\)/g, '')
    .trim();
}

export const TITLE = {
  heading: "Zoe's Starlight Quest",
  sub: 'A gentle 3D learning adventure for Princess Zoe ✨',
  start: 'Start Adventure 🌟',
  howTo: '📖 How to Play',
  listen: '🔊 Listen',
  footer: 'No timers, no penalties, and always gentle hints. Have fun! 💖',
};
export const titleSay = () => spoken(TITLE.heading + '.', TITLE.sub, TITLE.footer);

export const PAUSE = {
  heading: 'Adventure Paused',
  sub: 'Take a break or explore your treasures!',
  resume: 'Resume Adventure',
  wardrobe: 'Princess Wardrobe',
  treasure: 'Treasure Book & Stickers',
  howTo: 'How to Play',
  parent: 'Parent Corner',   // grown-ups only: it opens straight away and says nothing
};
export const pauseSay = () => spoken(PAUSE.heading + '.', PAUSE.sub);
/** Short pause (ms) after a button says its name, then it goes, unless she taps again first. */
export const SPEAK_TAP_MS = 2200;

export const WARDROBE = {
  heading: "Zoe's Wardrobe",
  sub: 'Earn stars in quests to unlock royal outfits!',
  done: 'Done ✨',
};
export const WARDROBE_CATS = [
  { id: 'trail', emoji: '✨', title: 'Sparkle Trail', milestone: 'trail-10', stars: 10, locked: 'Earn 10 stars to unlock sparkle trail colors!' },
  { id: 'gem', emoji: '💎', title: 'Tiara Gem', milestone: 'tiara-25', stars: 25, locked: "Earn 25 stars to unlock gem colors for Zoe's tiara!" },
  { id: 'skirt', emoji: '👗', title: 'Skirt Color', milestone: 'skirt-50', stars: 50, locked: 'Earn 50 stars to unlock beautiful new royal skirt colors!' },
  { id: 'buddy', emoji: '🦋', title: 'Butterfly Friend', milestone: 'butterfly-100', stars: 100, locked: 'Reach 100 stars to make a magical butterfly companion!' },
];
export const wardrobeStatus = (cat, unlocked) => (unlocked ? 'Unlocked 🔓' : `Needs ${cat.stars} ⭐`);
export const wardrobeSay = (stars) => spoken(WARDROBE.heading + '.', WARDROBE.sub, `You have ${stars} ${stars === 1 ? 'star' : 'stars'}.`);
/** Tapping a category: its name, whether it is open, and the hint if it is still locked. */
export const wardrobeCatSay = (cat, unlocked) =>
  spoken(cat.title + '.', unlocked ? 'Unlocked. Pick one!' : `Needs ${cat.stars} stars. ${cat.locked}`);

export const TREASURE = {
  heading: 'Treasure Book',
  sub: 'Find hidden sparkles & secret scenery across the lands!',
  daily: '✨ Daily sparkling treasures found today:',
  secret: 'Secret Sticker',
  secretSay: 'A secret sticker. Keep exploring to find it!',
  back: 'Back to Quest 🌟',
};
export const treasureSay = (today, total) => spoken(TREASURE.heading + '.', TREASURE.sub, `You found ${today} of ${total} sparkling treasures today.`);
export const stickerSay = (label, princessName) => spoken(label + '.', princessName ? `From ${princessName}'s land.` : '');

/** The how-to-play steps. Touch screens never hear about keys. */
export function tutorialSteps(touch) {
  return [
    { title: 'How to Move', emoji: '🧭',
      text: touch
        ? 'Drag your finger on the screen to walk Princess Zoe around the kingdom.'
        : 'Use WASD, arrow keys, or drag with your mouse on the screen to walk Princess Zoe around the kingdom.' },
    { title: 'Talk to Friends', emoji: '👑',
      text: touch
        ? 'Walk up to any princess and tap her to say hello and start her quest!'
        : 'Walk up to any princess and press E, Space, or click her to say hello and start her quest!' },
    { title: 'Answer Questions', emoji: '⭐',
      text: 'Pick an answer from the big cards. Wrong answers get gentle hints and second chances. No losing ever!' },
    { title: 'Collect Stars', emoji: '✨',
      text: 'Earn stars with every quest! Finishing all ten lands brings the golden Starlight Crown back to the castle.' },
    { title: 'Pause & Dress Up', emoji: '👗',
      text: touch
        ? 'Tap the pause button anytime to change your dress or check your stickers.'
        : 'Press P or click the pause button anytime to change your dress or check your stickers.' },
  ];
}
/** What she says for one step: its title, then its text, exactly as shown. */
export const tutorialSay = (step) => spoken(step.title + '.', step.text);
export const TUTORIAL_BUTTONS = { listen: '🔊 Listen again', skip: 'Skip', next: 'Next ➡️', last: "Let's Play! 👑" };
