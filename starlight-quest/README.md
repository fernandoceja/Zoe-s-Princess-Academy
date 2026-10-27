# 👑 Zoe's Starlight Quest

A cozy 3D story-adventure learning game for Zoe (1st grade). She plays **Princess Zoe**,
walks around a pastel low-poly kingdom (Sneaky Sasquatch-style: top-down follow camera,
WASD/arrows + touch joystick, E / tap to talk), meets four princesses, and completes
story quests. **Every quest gate is a California 1st-grade skill — and there are no fail
states, ever.** Wrong picks get gentle encouragement and a retry; progress is never lost.

## The four quests

| Princess | Land | Quest | Skill (CA 1st grade) |
|---|---|---|---|
| Belle (book-loving) | Whispering Library | The Torn Storybook — find 5 story pages | ELA reading foundations: sight words (Dolch 1st) + CVC phonics |
| Elsa (ice) | Frostfall Peaks | The Frozen Bridge — unfreeze 5 bridges | Math: addition/subtraction within 20, with countable ❄️ visuals |
| Rapunzel (garden) | Sunflower Meadows | The Sleepy Garden — wake 5 flowers | Science: what plants need; living vs nonliving |
| Cinderella (village) | Glass Slipper Village | The Midnight Clock — wind 5 clocks | Math: telling time to the hour & half-hour (analog clock faces drawn in-game) |
| Ariel (cove) | Seashell Cove (first new kingdom, south-east of the hub) | The Seashell Songs — match 5 rhymes | ELA: rhyming and word families (RF.1.2 / RF.1.3): rhyme pairs, odd one out, change the first letter |
| Moana (isle) | Wayfinder Isle (second new kingdom, south-west of the hub) | The Shape Stones — name 5 shapes | Math: geometry (1.G.A.1 / 1.G.A.2 / K.G): name flat and solid shapes, count sides, corners and flat faces; shapes are drawn in-game and turned or recolored |
| Jasmine (garden) | Moonlit Palace Garden (third new kingdom, north-north-east of the hub) | The Story Lanterns — put 5 stories in order | ELA: story order and retelling (RL.1.2 / RL.K.2 / RL.1.3): first, next, last on tiny 3-picture stories (a seed growing, an egg hatching, getting ready for school) |

Finish the first four and Seashell Cove opens, then Wayfinder Isle and the Moonlit Palace Garden (a short card tells Zoe when a new kingdom opens). Each land gets its own glowing celebration; the big Starlight Crown finale plays only once every kingdom is open and restored (until then, finishing a land never replays it). See `STANDARDS.md`
for the full quest-to-standard mapping (also shown in-game in the 📊 Parent Corner).

## Preview locally

No build step. Because the game uses ES modules, it needs `http://` (browsers block
module imports on `file://`). From this folder:

```bash
python3 -m http.server 8080
# then open http://localhost:8080
```

Needs internet **once** per load for the Three.js CDN (`three@0.160.0` via importmap)
and the Nunito Google Font. Everything else is local.

## Princess voices (ElevenLabs MP3s)

The game reuses the Academy's voice files. When deployed as `starlight-quest/`
inside the Academy repo, it reads them from the repo-root `assets/audio/` folder
(shared — no copy needed):

```
Zoe-s-Princess-Academy/
  assets/audio/EN/princess_belle_greeting_01.mp3
  assets/audio/ES/princess_belle_greeting_01.mp3
  ... (elsa, rapunzel, cinderella; greeting/praise/encourage)
  starlight-quest/          <- this game
```

`Narrator.speak(princessId, kind, text)` tries
`../assets/audio/{EN,ES}/princess_{id}_{greeting,praise,encourage}_01.mp3` first.
**If the files are absent, it gracefully falls back to `speechSynthesis`** with each
princess's pitch/rate — the game plays identically, just with system voices.

Audio policy (so words never lie to a learning reader):
- Quest-specific text (story lines, questions, hints) is **always read via TTS**
  (`Narrator.speakExact`) with the princess's voice shaping — spoken words match the screen.
- Generic moments (praise after a correct answer, encouragement after a wrong pick) use
  the MP3 hook, since a "wonderful!"/"good try!" recording fits any such moment.
- Sound effects are gentle WebAudio chimes. There are no buzzers, no timers, no lives.

## Deploy to GitHub Pages

```bash
cd ~/workspace/zoe-starlight-quest
git init && git add . && git commit -m "Zoe's Starlight Quest"
# create repo on GitHub, then:
git remote add origin git@github.com:fernandoceja/zoe-starlight-quest.git
git push -u origin main
# Repo Settings → Pages → Deploy from branch → main → /(root)
```

Or drop these files into the existing `Zoe-s-Princess-Academy` repo as a `quest/` subfolder —
`portraits/` and `assets/audio` paths are relative, so it works from a subpath too.

## Spanish (ES) roadmap

Architecture is ready, content is not translated yet:
- `LANG` / `setLang()` in `js/audio.js`, `Save.data.lang`, MP3 paths already read
  `assets/audio/{EN,ES}/…`.
- To ship ES: translate the strings in `js/quests.js` (single source — `QUESTS`,
  `FINALE_LINES`, `PARENT_CORNER_HTML`), add an ES toggle button next to the mute
  button in `js/ui.js`, and drop the Academy's `assets/audio/ES/` MP3s in place.

## File layout

```
index.html            game shell (importmap: three@0.160.0, Nunito, loading screen)
js/main.js            game-flow wiring: title → roam → dialogue → challenges → celebrate → finale
js/world.js           Three.js kingdom: hub castle, 4 lands, Zoe + NPCs, camera, input
js/quests.js          all educational content (dependency-free, unit-testable)
js/ui.js              dialogue, challenge cards, quest pill, parent corner, joystick
js/audio.js           MP3 hook + speechSynthesis fallback, gentle chimes
js/save.js            localStorage progress (heals corrupt saves)
portraits/            princess-zoe.jpg (Zoe's avatar, used as-is) + 4 generated princesses
STANDARDS.md          quest → CA 1st-grade standard mapping
```

## For grown-ups

- Progress saves automatically on this device (`localStorage`, key `zoe-starlight-quest-v1`).
- Pause anytime with ⏸️; mute with 🔊; parent corner with 📊.
- The princesses are original characters in familiar archetypes — not Disney copies.
- Zoe's portrait is the exact avatar Fernando provided (`portraits/princess-zoe.jpg`).

## Offline / Home Screen (PWA)

- `manifest.webmanifest` + `sw.js` make the game installable and playable offline after one visit.
- `vendor/three.module.js` is three.js r160 (MIT) and `vendor/fonts/` is Nunito (OFL), served locally so nothing loads from a CDN.
- When you change any game file, bump `CACHE_VERSION` in `sw.js` (and the `?v=` stamps) so devices pick up the update.
