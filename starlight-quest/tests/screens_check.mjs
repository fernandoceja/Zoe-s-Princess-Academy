// Read everything aloud (Q2): every kid-facing screen speaks the words it shows, touch screens never hear about keys,
// the mute switch silences all of it, and the grown-ups' Parent Corner stays silent. Plain Node (reads the sources).
import { readFileSync } from 'node:fs';
import * as S from '../src/flow/screens.js';
const read = (p) => readFileSync(new URL('../src/' + p, import.meta.url), 'utf8');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const PIC = /[\p{Extended_Pictographic}️‍⃣]/u;
const clean = (label, t) => {
  check(typeof t === 'string' && t.length > 3, `${label}: nothing to say`);
  check(!PIC.test(t) && !/[&+]/.test(t) && !/\s[.!?,]/.test(t), `${label}: speech has a picture, "&", "+" or a stray space: ${t}`);
};

// spoken(): pictures out, "&" says "and".
check(S.spoken('Treasure Book & Stickers 📖') === 'Treasure Book and Stickers', 'spoken: & and emoji');
check(S.spoken('Needs 10 ⭐', 'now.') === 'Needs 10 now.', 'spoken: joins parts');

// Title: she reads the heading, the line under it and the footer, as shown.
clean('title', S.titleSay());
for (const k of ['heading', 'sub', 'footer']) check(S.titleSay().includes(S.spoken(S.TITLE[k])), `title: speech is missing "${k}"`);
// Pause menu.
clean('pause', S.pauseSay());
for (const k of ['resume', 'wardrobe', 'treasure', 'howTo']) clean(`pause button ${k}`, S.spoken(S.PAUSE[k]));
check(S.spoken(S.PAUSE.treasure) === 'Treasure Book and Stickers', 'pause: treasure button name');
check(S.SPEAK_TAP_MS >= 1500 && S.SPEAK_TAP_MS <= 4000, 'pause: the short pause should be 1.5-4 seconds');
// Wardrobe.
clean('wardrobe', S.wardrobeSay(7));
check(S.wardrobeSay(7).includes('7 stars') && S.wardrobeSay(1).includes('1 star.'), 'wardrobe: star count spoken');
for (const c of S.WARDROBE_CATS) {
  clean(`wardrobe ${c.id} locked`, S.wardrobeCatSay(c, false)); clean(`wardrobe ${c.id} open`, S.wardrobeCatSay(c, true));
  check(S.wardrobeCatSay(c, false).includes(c.locked.replace(/[⭐]/gu, '').trim().slice(0, 20)), `wardrobe ${c.id}: the locked hint is spoken`);
  check(S.wardrobeStatus(c, false).includes(String(c.stars)), `wardrobe ${c.id}: status shows the star count`);
}
// Treasure Book.
clean('treasure', S.treasureSay(2, 5)); clean('secret sticker', S.TREASURE.secretSay); clean('sticker', S.stickerSay('Clock Tower', 'Cinderella'));
check(S.treasureSay(2, 5).includes('2 of 5'), 'treasure: counts spoken');
// Tutorial: the voice reads exactly the title and text on screen; touch has no keys, desktop does.
const KEYS = /\b(WASD|arrow keys?|keys?|press|click|mouse|Space)\b|\bE\b|\bP\b/;
for (const touch of [true, false]) {
  const steps = S.tutorialSteps(touch);
  check(steps.length === 5, `tutorial(${touch}): 5 steps`);
  for (const st of steps) {
    clean(`tutorial ${st.title}`, S.tutorialSay(st));
    check(S.tutorialSay(st) === S.spoken(st.title + '.', st.text), `tutorial ${st.title}: speech must equal the shown title and text`);
    if (touch) check(!KEYS.test(st.text), `tutorial (touch) mentions keys or a mouse: ${st.text}`);
  }
  if (!touch) check(steps.some((st) => /WASD/.test(st.text)) && steps.some((st) => /press E/.test(st.text)), 'tutorial (desktop) should still teach the keys');
}

// The wiring: each component renders the shared text and speaks through Narrator (so Mute silences it).
const has = (src, re, msg) => check(re.test(src), msg);
const title = read('components/TitleModal.tsx');
has(title, /\{TITLE\.heading\}.*\{TITLE\.sub\}|\{TITLE\.heading\}[\s\S]*\{TITLE\.sub\}[\s\S]*\{TITLE\.footer\}/, 'TitleModal shows the shared text');
has(title, /Narrator\.speakText\(titleSay\(\)/, 'TitleModal speaks the card');
const pause = read('components/PauseMenu.tsx');
for (const k of ['resume', 'wardrobe', 'treasure', 'howTo']) has(pause, new RegExp(`tap\\('${k}', PAUSE\\.${k}`), `PauseMenu: ${k} button says its name on the first tap`);
has(pause, /armed === id \|\| Narrator\.muted/, 'PauseMenu: a second tap (or sound off) acts at once');
has(pause, /setTimeout\(\(\) => \{ setArmed\(null\); act\(\); \}, SPEAK_TAP_MS\)/, 'PauseMenu: it acts after the short pause');
has(pause, /onClick=\{onOpenParentCorner\}/, 'PauseMenu: Parent Corner opens straight away, silently');
const ward = read('components/WardrobeModal.tsx');
has(ward, /say\(wardrobeSay\(stars\)\)/, 'Wardrobe speaks on open'); has(ward, /wardrobeCatSay/, 'Wardrobe categories speak when tapped');
const tre = read('components/TreasureBookModal.tsx');
has(tre, /say\(treasureSay\(/, 'Treasure Book speaks on open'); has(tre, /stickerSay|secretSay/, 'Treasure Book stickers speak when tapped');
const tut = read('components/TutorialModal.tsx');
has(tut, /tutorialSay\(step\)/, 'Tutorial speaks the shown text'); has(tut, /describeControls\(\)\.touch/, 'Tutorial picks touch words on touch screens');
check(!/speech:/.test(tut), 'Tutorial must not carry separate speech text');
const cel = read('components/CelebrationModal.tsx');
has(cel, /kind === 'celebrate' \|\| kind === 'milestone'\) \{[\s\S]*?speakExact\('zoe', spoken\(/, 'the milestone / New kingdoms card is read aloud');
const app = read('App.tsx');
has(app, /Narrator\.speakText\(say \|\| spoken\(msg\)/, 'every pop-up message is read aloud');
// Speech conflicts found in review: the welcome line must not be cut by a screen's cleanup; a mid-sentence pause toast stays quiet.
has(title, /^(?![\s\S]*Narrator\.stop\(\))/, 'TitleModal must not stop speech on unmount (it would cut the welcome line)');
has(app, /setTimeout\(\(\) => \{\s*Narrator\.speakText\(\s*`Welcome to Starlight Quest!/, 'the welcome line is spoken after the screen change');
has(app, /Finish talking first[^\n]*2200, false\)/, 'the pause toast must not cut a princess off');
has(read('components/WardrobeModal.tsx'), /^(?![\s\S]*role="button")/, 'Wardrobe rows are real buttons (gamepad and keyboard reach them)');
// Grown-ups and mute: nothing speaks in Parent Corner; nothing bypasses Narrator.
for (const f of ['components/ParentCorner.tsx']) check(!/Narrator|speechSynthesis/.test(read(f)), `${f} must stay silent`);
for (const f of ['TitleModal', 'PauseMenu', 'WardrobeModal', 'TreasureBookModal', 'TutorialModal', 'CelebrationModal']) check(!/speechSynthesis/.test(read(`components/${f}.tsx`)), `${f} must speak through Narrator (so Mute works)`);

console.log(`screens: problems ${problems.length}`);
if (problems.length) { for (const p of problems.slice(0, 15)) console.log(p); process.exit(1); }
