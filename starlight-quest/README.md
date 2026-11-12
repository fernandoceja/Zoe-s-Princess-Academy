# 👑 Zoe's Starlight Quest

A cozy 3D story-adventure learning game for Zoe (1st grade). She plays **Princess Zoe**,
walks around a pastel low-poly kingdom (Sneaky Sasquatch-style: top-down follow camera,
WASD/arrows + touch joystick, E / tap to talk), meets the princesses, and completes
story quests. **Every quest gate is a California 1st-grade skill — and there are no fail
states, ever.** Wrong picks get gentle encouragement and a retry; progress is never lost.

## The ten lands

| Princess | Land | Quest | Skill (CA 1st grade) |
|---|---|---|---|
| Belle (book-loving) | Whispering Library | The Torn Storybook — find 5 story pages | ELA reading foundations: sight words (Dolch 1st) + CVC phonics |
| Elsa (ice) | Frostfall Peaks | The Frozen Bridge — unfreeze 5 bridges | Math: addition/subtraction within 20, with countable ❄️ visuals |
| Rapunzel (garden) | Sunflower Meadows | The Sleepy Garden — wake 5 flowers | Science: what plants need; living vs nonliving |
| Cinderella (village) | Glass Slipper Village | The Midnight Clock — wind 5 clocks | Math: telling time to the hour & half-hour (analog clock faces drawn in-game) |
| Ariel (cove) | Seashell Cove (first new kingdom, south-east of the hub) | The Seashell Songs — match 5 rhymes | ELA: rhyming and word families (RF.1.2 / RF.1.3): rhyme pairs, odd one out, change the first letter |
| Moana (isle) | Wayfinder Isle (second new kingdom, south-west of the hub) | The Shape Stones — name 5 shapes | Math: geometry (1.G.A.1 / 1.G.A.2 / K.G): name flat and solid shapes, count sides, corners and flat faces; shapes are drawn in-game and turned or recolored |
| Jasmine (garden) | Moonlit Palace Garden (third new kingdom, north-north-east of the hub) | The Story Lanterns — put 5 stories in order | ELA: story order and retelling (RL.1.2 / RL.K.2 / RL.1.3): first, next, last on tiny 3-picture stories (a seed growing, an egg hatching, getting ready for school) |
| Anna (harbor) | Sunny Fjord Harbor (fourth new kingdom, east-south-east of the hub) | The Harbor Signs — fix 5 sentences | ELA: capital letters and end marks (L.1.2.a / L.1.2.b / L.K.2.a): pick the mark that ends a telling, asking or excited sentence, find the word that needs a capital (first word, a name, I), pick the sentence written the right way |
| Tiana (bayou) | Firefly Bayou (fifth new kingdom, west-south-west of the hub) | The Tally Stand — count 5 tallies | Math: data and counting by 5s (1.MD.C.4 / K.CC / 1.NBT): count tally marks, count groups of five (four lines and a slash), read a tiny tally chart (which has the most, how many, how many more); tallies are drawn in-game |
| Aurora (glen) | Rosewood Glen (sixth new kingdom, east-north-east of the hub) | The Word Garden | ELA: naming words and action words (L.1.1): identify each kind and sort short words into the two groups |

Finish the first four and Seashell Cove opens, then Wayfinder Isle, the Moonlit Palace Garden, Sunny Fjord Harbor, Firefly Bayou and Rosewood Glen (a short card tells Zoe when a new kingdom opens). Each land gets its own glowing celebration; the big Starlight Crown finale plays only once every kingdom is open and restored (until then, finishing a land never replays it). Quests come in three levels (Easy, Core, Stretch) that move up after 4 of 5 first-try answers and down after 3 hinted ones. See `STANDARDS.md`
for the full quest-to-standard mapping (also shown in-game in the 📊 Parent Corner).

## Build and preview locally

The screens are a small React + Vite app in `src/`; the game engine (quests, ladder, save, 3D world) is plain
JavaScript in `js/`. From this folder:

```bash
npm ci
npm run dev            # http://localhost:5173
npm run build          # production build into dist/
node tools/assemble-site.mjs   # what CI and Pages run to copy the build into the site
```

**Nothing loads from the internet.** three.js (`vendor/three.module.js`, r160, MIT) and the Nunito font
(`vendor/fonts/`, OFL) are served from this folder, so the game works offline after one visit.

Tests are plain Node scripts: `for t in tests/*_check.mjs; do node $t; done` (build and assemble first for the bundle and precache checks).

## Voices

Everything is read aloud with the device's own speech voice (`speechSynthesis`, via `Narrator` in `js/audio.js`),
so spoken words always match what is on screen. On iPhone, install an Enhanced or Premium voice in
Settings > Accessibility > Spoken Content for a warmer sound (the game prefers it). The Academy's recorded
princess MP3s in `../assets/audio/` are not played by the current screens. Sound effects are gentle WebAudio chimes.
There are no buzzers, no timers, no lives.

## Deploy

This game lives in the `starlight-quest/` folder of the `Zoe-s-Princess-Academy` repo. Pull requests get a Firebase
preview link, and merging to `main` deploys the site (`.github/workflows/`). Nothing to set up on a device: open the
site once in Safari and use Share > Add to Home Screen.

## Spanish (ES) roadmap

Architecture is ready, content is not translated yet:
- `LANG` / `setLang()` in `js/audio.js`, `Save.data.lang`, MP3 paths already read
  `assets/audio/{EN,ES}/…`.
- To ship ES: translate the strings in `js/quests.js` (single source — `QUESTS`,
  `FINALE_LINES`, `PARENT_CORNER_HTML`), add an ES toggle button next to the mute
  button in `js/ui.js`, and drop the Academy's `assets/audio/ES/` MP3s in place.

## File layout

```
index.html            Vite entry (loading screen, manifest, no external scripts)
src/                  React screens and flow (HUD, modals, questbook, outcomes, voice)
js/quests.js          all educational content (dependency-free, unit-testable)
js/ladder.js, save.js engine: levels and review queue, localStorage progress (heals corrupt saves)
js/world*.js, *.js    the 3D kingdom and each land (three.js)
js/audio.js           speechSynthesis narrator and gentle chimes
tests/*_check.mjs     plain-Node checks (hash-locked engine files in tests/fixtures)
tools/                site assembly and browser smoke test
STANDARDS.md          quest -> CA 1st-grade standard mapping
```

## For grown-ups

- Progress saves automatically on this device (`localStorage`, key `zoe-starlight-quest-v1`).
- Pause anytime with ⏸️; mute with 🔊; parent corner with 📊.
- The princesses are original characters in familiar archetypes — not Disney copies.
- Zoe's portrait is the exact avatar Fernando provided (`portraits/princess-zoe.jpg`).

## Offline / Home Screen (PWA)

- `manifest.webmanifest` + `sw.js` make the game installable and playable offline after one visit.
- three.js and the Nunito font are served from `vendor/`, so nothing loads from a CDN.
- When you change any game file, bump `CACHE_VERSION` in `sw.js` so devices pick up the update.
