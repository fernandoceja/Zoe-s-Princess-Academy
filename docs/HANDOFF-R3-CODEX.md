# Starlight Quest round 3: handoff to Codex

Written 2026-10-28 by Claude, for OpenAI Codex picking up round 3. Owner: Fernando (repo `fernandoceja/Zoe-s-Princess-Academy`).
Plan of record (with the PR log): Notion page "Starlight Quest round 3 plan" https://app.notion.com/p/4064b9b73ed3810b954cfcd400a5b555

## 1. Goal

Starlight Quest (`starlight-quest/`) is an offline 3D learning game for Zoe, age 6 (first grade), played on an iPhone
in Safari and as a Home Screen app. Round 3 adds: Zoe's current school week, an explorable world, six new princess
kingdoms that each teach a new first-grade skill, and a final polish pass.

## 2. Phase plan: done and remaining

| Phase | Tasks | State |
| --- | --- | --- |
| 1 School week | S1 week pack #85, S2 spelling/short vowels #86, S3 dictation #87, S4 count on + doubles #84, R1 cache #88 | Done |
| 2 Explore | E1 tap world #89, E2 daily treasures #90, E3 Treasure Book #91, E4 secrets/stickers #92, R2 cache #93 | Done |
| 3 Kingdoms | K1 #94, K2 #95, K3 #96, K4-K13 #97-#106 (Ariel, Moana, Jasmine, Anna, Tiana playable) | Done through K13 |
| 3 Kingdoms | **K14** Rosewood Glen land, **K15** Aurora quests, **K16** ten-land finale, **R3** cache bump | **Remaining** |
| 4 Polish | **P1** look audit (no PR), **P2-P6** fixes Fernando picks, **R4** cache bump | **Remaining** |

### K14 current state (parked)

Branch `claude/project-thread-j9nkat-k14`, commit `9f6c743` on top of main (`aaf5a73`, K13). **No PR opened.** CI would fail
because two files are missing. Already done in that commit:

- `js/treasures.js`: `GLEN_LAND='glen'`, `GLEN_KIND='rose'` (🌹 Roses), added to `ALL_TREASURE_*` and `LAND_OWN_KIND`;
  finds cap in `sanitizeTreasures` raised 45 -> 50; `glenOpen` option in `treasureBookModel`; `TREASURE_LAND_NAMES.glen`.
- Secret `wordgarden` (`GLEN_SECRETS`): three signs bird, run, rose. Tap the two naming words (bird, rose, any order) then the
  action word (run) within 15 s. `WORD_SIGNS`, `WORD_NAMES`, `WORD_ACTION`, `wordKind()`, `wordLine()`; tracker parts `word-bird`, `word-run`, `word-rose`.
- `js/worldmap.js`: `PREVIEW_LANDS.glen='ene'`, `GLEN` def, `isGlenOpen`, `glenGeometry`, glen in `openLandIds`.
- `js/main.js`: imports `wordLine`, plays it for `wordgarden`.
- `sw.js`: `./js/glen.js?v=20261027e2` in `PRECACHE_URLS` (file does not exist yet, so `precache_check` fails).
- Workflow: "Rosewood Glen check" step runs `tests/glen_check.mjs` (file does not exist yet).

Still to do for K14:

1. `starlight-quest/js/glen.js`: copy the pattern of `js/bayou.js` / `js/harbor.js` (build function, 6 tap surprises, treasure
   spots, the three word signs as tappables, `settle` if there is water). Rose arches, berry bushes, little woodland friends.
   Original art only. At most 8 draw calls (use `makeMerger` from `cove.js`, unlit glow material, no lights or shadows).
2. Wire glen into `world.js` / `main.js` the same way bayou is wired (search for `bayou` and `isBayouOpen` and mirror each hit).
3. `tests/glen_check.mjs`: mirror `tests/bayou_check.mjs`; must assert 45 finds closed, 50 with `?preview=all`, a 10-row Treasure
   Book, the word-garden secret order, and that `?preview=all` never makes `shouldRunFinale` true.
4. Update earlier kingdom tests only where totals or `preview=all` behavior change (keep their intent).
5. 390x844 screenshots for the PR. Gate stays closed in normal play; visible only with `?preview=glen` or `?preview=all`.

## 3. Repo structure and key files

Repo root also holds an older game (`index.html`, `src/`, `assets/`). Round 3 work is only inside `starlight-quest/`:

- `index.html`: app shell; loads `js/main.js?v=<stamp>`.
- `sw.js`: service worker. `CACHE_VERSION` and `PRECACHE_URLS`.
- `js/main.js`: game loop, quest flow, cards (`storyCardsHtml`, `sentenceCardHtml`), secret lines, new-kingdom card.
- `js/quests.js`: `PRINCESSES`, `NPC_ORDER` (the single princess list), `QUESTS`, `TIERS.<id>`, `WEEK` / `WEEK_DEFAULT`, `RHYME_FAMILIES`, `STORY_SEQUENCES`, Anna's sentences.
- `js/ladder.js`: 3-tier ladder (`recordQuest`): up after 4 of 5 right first try, down after 3 hinted, misses come back for review.
- `js/worldmap.js`: `NEW_LAND_SLOTS` (outer ring 50, wall 60), `PLANNED_SLOTS`, `BUILT_SLOTS`, `PREVIEW_LANDS`, `openLandIds`, `shouldRunFinale`.
- `js/world.js`: three.js scene, the four inner lands, tappables, raycast.
- Kingdom lands: `js/cove.js` (Ariel), `js/isle.js` (Moana), `js/garden.js` (Jasmine), `js/harbor.js` (Anna), `js/bayou.js` (Tiana). `glen.js` (Aurora) is next.
- SVG helpers: `js/shapes.js` (Moana), `js/tally.js` (Tiana), `js/portraits-new.js` (six new princess portraits).
- `js/treasures.js`: daily treasures, secrets, stickers, Treasure Book model. `js/save.js`: save data. `js/ui.js`: cards, menus, Parent Corner.
- `tests/*.mjs`: one plain Node script per check. `STANDARDS.md`: skills list. `vendor/`: three.js core (the only library).

## 4. How the systems work

**Kingdoms (two PRs each).**
- Land PR: builds `js/<land>.js` and adds `<land>: '<slot>'` to `PREVIEW_LANDS`. The star gate stays closed; the land shows only
  with `?preview=<land>` or `?preview=all`.
- Quest PR: appends the princess id to `NPC_ORDER`, sets `BUILT_SLOTS[slot] = '<princess>'`, sets `NPC_TO_LAND.<princess> = '<land>'`
  in main.js, adds `QUESTS.<id>`, `TIERS.<id>` (3 tiers) and a Parent Corner row, plus `tests/<princess>_check.mjs`. That opens the land.
- A newly built slot shows a short "A new kingdom opened!" card once (`Save.data.seenKingdoms`, `unseenKingdomSlots`).
- Slots: anna ese, ariel sse, moana ssw, tiana wsw, aurora **ene** (last), jasmine nne.

**Finale.** `shouldRunFinale(done, NPC_ORDER, builtCount)` is true only when every `NPC_ORDER` id is done AND all 6 slots are built.
It is fed `builtSlotIds()`, never the preview set, so a preview flag can never trigger it. After K15 all six slots are built, so
finishing every land WILL trigger the (old) finale; K16 replaces it with the ten-land finale and a new castle crown and updates
Parent Corner and `STANDARDS.md`. Consider landing K15 and K16 close together.

**Treasures.** 5 date-seeded treasures per open land (`TREASURES_PER_LAND`), same spots all day. Inner lands use shell, gem,
feather, star, ribbon; kingdoms use their own kind: sea glass 💠, blossom 🌺, moonstone 🌙, anchor ⚓, lily 🪷, rose 🌹 (K14).
`findsTotal(openLands)`: 45 today, 50 once the glen opens. Finding all 5 in a land in one day gives a row star. Each land has one
secret that becomes a sticker. Treasure Book layouts: `zsq-tb-full`, `zsq-tb-ten`, `zsq-tb-vast`, `zsq-tb-ninest` classes.

**Preview flags.** `?preview=glen`, `?preview=all`, or a comma list. Only for review; normal play ignores them.

**Cache.** Live: `CACHE_VERSION = 'v18-20261027'`, stamp `?v=20261027e2` on every local import. Do NOT bump inside a task. One
cache PR at the end of each phase: **R3** after K16 (new `CACHE_VERSION`, e.g. `v19-<date>`, and one new `?v=` stamp everywhere,
in index.html, every js import and sw.js), then **R4** after Phase 4. Every new js file goes in `PRECACHE_URLS` with the current stamp.

## 5. Tests and CI

- Run everything locally from the repo root:
  `for f in starlight-quest/js/*.js starlight-quest/sw.js; do node --experimental-default-type=module --check "$f"; done`
  `for t in starlight-quest/tests/*.mjs; do node "$t" || echo "FAIL $t"; done`
- Play locally: `python3 -m http.server 8000` at repo root, open `http://localhost:8000/starlight-quest/?preview=all`.
- CI: `.github/workflows/starlight-tests.yml` (Node 20), one step per test. A new test file needs its own step there.
- Headless walking to far lands is slow; for screenshots use a scratch copy with a patched start position. Never commit it.

## 6. Firebase preview

- `.github/workflows/firebase-hosting-pull-request.yml` deploys every same-repo PR to Firebase project `openclaw-agent-489306`,
  channel `pr<N>`, URL like `https://openclaw-agent-489306--pr<N>-<branch-hash>.web.app/starlight-quest/`. The bot comments the link.
- **Quota caveat:** a 429 "channel quota reached" means too many old preview channels. Fernando deletes channels for merged or
  closed PRs in the Firebase console (never `live`), then the failed job is re-run. Merge to main deploys live via `firebase-hosting-merge.yml`.

## 7. PR rules

- Codex opens the PRs: one small PR per task, own branch from latest main, at most 3 open at once.
- All CI checks green (tests + Firebase preview) before asking for merge. Fernando decides merges unless he says otherwise.
  Normal merge only; never push to main, never force-push or rewrite main.
- A PR touches only its task's files. Body: what changed, Firebase preview link, iPhone steps (Safari and Home Screen app), 390x844 screenshots.
- Leave old drafts **#15** and **#16** alone.
- Cache bump only in R3 (end of Phase 3) and R4 (end of Phase 4).
- Log each PR on the Notion plan page's PR log.
- Plain JS ES modules only: no React, Vite, npm packages or build step. No paid services, no secrets in code. Must work offline.
- Disney princess names are approved for the six kingdoms, but **all art is original**: no Disney images, logos, songs, movie
  lines, plots or lookalike portraits.
- 3D budget: at most 8 new draw calls per land, InstancedMesh for repeats, no shadow maps, no extra lights; every animation has a calm version under Reduce Motion (`calmMotion`).

## 8. Zoe's school content

- This week's pack (`WEEK_DEFAULT` in quests.js; Parent Corner "This week" form lets Fernando change it):
  spelling lend, send, fast, sink, past; sight words of, he; dictation "Can he run past the tent?"; short vowels sat, hip, pen, log, nut.
- Math: lessons 3.2 count on and 3.3 doubles (1+1 to 5+5), in Elsa's land.
- Kingdom skills: Ariel rhyming/word families, Moana shapes (1.G.1-2), Jasmine story order (RL.1), Anna capitals and end marks
  (L.1.2), Tiana tallies and data (1.MD.4), **Aurora naming words and action words (L.1.1)**: tier 1 "which one is a thing?",
  tier 2 "which one is an action?", tier 3 "sort 4 words into naming and action". Use short, decodable first-grade words.

## 9. Open questions for Fernando

- 🪷 lily (Firefly Bayou treasure) is Unicode 14 and needs iOS 15.4 or later; on an older iPhone it shows as a blank box. Keep it or swap for 🌸 / 🍃?
- Night colors: Fernando to confirm what he wants changed (ask before touching the palette; likely part of P2).
- Do new kingdoms open as each one is built (current behavior), or one per day?

## 10. Gotchas

- `NPC_ORDER` is the one princess list; ladder, save, Parent Corner and tests all read it. Never hard-code "4 lands" or "9 lands".
- When a kingdom opens, earlier kingdom tests that assert totals or `?preview=all` behavior need their numbers updated, not deleted.
- `precache_check` fails if a precached file is missing or any import uses a different `?v=` stamp.
- `treasureSpots` takes an `avoid(x, z)` test so treasures stay out of water (harbor, bayou use it); land files can `settle` finds onto dry land.
- Picture rule (`pic_check`) and voice rule (`voice_check`): every round must have its answer inside its choices and pass the speech rules; marks like "." and "?" are spoken by name.
- The Codex review bot sometimes never finishes on a PR; it is not a required check.
- Zoe's save is on her device; new save fields must have defaults and sanitizers so old saves keep working.
