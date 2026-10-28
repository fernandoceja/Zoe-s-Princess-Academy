# HANDOFF R4 — Port the Argon React UI Shell into Starlight Quest

**Repo:** `fernandoceja/Zoe-s-Princess-Academy` · **Game folder:** `starlight-quest/`
**Donor repo:** `fernandoceja/Zoe-s-Starlight-Quest-Argon` (parts donor only — see §1)
**Executor:** work in waves, one PR per phase (§6). Do not merge your own PRs. Fernando merges.
**Status of this document:** approved direction (Fernando, Oct 28, 2026). Defaults marked **[default]** are Fernando-changeable; everything in §3 is not.

---

## 1. Why this exists

A code-level audit (Oct 28, 2026) of the Google AI Studio "Gemini 4 Argon" build found that Argon did **not** rebuild the game from the spec — it imported this repo's engine, quests, audio, and docs wholesale and wrote a new **React 19 + TypeScript** UI shell around them (~2,700 lines: `App.tsx` + 11 components). The shell is genuinely good: small typed modals instead of the 1,776-line `ui.js` monolith, a nicer Parent Corner presentation, toasts and confetti.

This round ports that shell into the real game — keeping our engine, tests, offline support, and Zoe's saved progress — and fixes the defects the audit found in Argon's own wiring (§4). The Argon repo is never the base, never deployed for Zoe, and its defects are never copied knowingly.

## 2. Ground truth about the two codebases (verified by diff, Oct 28)

- Argon's `src/game/` = this repo's `starlight-quest/js/` — 26 files, identical total line counts (11,773), 11 byte-identical; remaining diffs are the `?v=20261028r3` import stamps plus one audio path change in `audio.js` (`../assets/audio/` → `/assets/audio/`).
- Argon shell files to port (donor paths in the Argon repo):
  - `src/App.tsx` (633 lines) — state machine replacing `main.js`
  - `src/main.tsx`, `src/types.ts`
  - `src/components/`: `HUD.tsx`, `TitleModal.tsx`, `TutorialModal.tsx`, `DialogueModal.tsx`, `ChallengeModal.tsx` (745 lines), `CelebrationModal.tsx`, `PauseMenu.tsx`, `WardrobeModal.tsx`, `TreasureBookModal.tsx`, `ParentCorner.tsx`, `VirtualJoystick.tsx`
  - Stack: react 19, three via npm `^0.186.1`, canvas-confetti, Vite. **Firebase is declared and unused — drop it. Tailwind comes via CDN in the donor — see D4.**
- The shell drives the engine through the engine's existing exports — `createWorld` (world.js), `PRINCESSES / NPC_ORDER / QUESTS / buildRounds` (quests.js), `SoundFX / Narrator / setLang` (audio.js), `Save / checkMilestones` (save.js), treasures API (treasures.js), `Input` (input.js), `builtSlotIds / shouldRunFinale / openLandIds` (worldmap.js), `landState / recordQuest / today / pickTodayStar` (ladder.js). **This is the contract. The engine does not change to suit the shell; the shell adapts to the engine.**

## 3. Non-negotiables

1. **Engine untouched.** `starlight-quest/js/*.js` changes are limited to import-specifier mechanics if the bundler genuinely requires it (e.g., dropping `?v=` stamps). Any other engine change = **hard stop**, report and wait.
2. **Save compatibility is sacred.** `KEY = 'zoe-starlight-quest-v1'` (save.js) and the save schema do not change. Zoe's existing progress on her devices must survive the cutover byte-for-byte. Proven by the fixture test in Phase 6, not by hope.
3. **Same URL, same origin.** The game stays at `https://fernandoceja.github.io/Zoe-s-Princess-Academy/starlight-quest/` — her Home Screen icon and localStorage origin depend on it.
4. **Offline keeps working.** The real game's service worker + manifest are the starting point (current `CACHE_VERSION` v19-20261028). Argon's `sw.js` is the *Academy hub's* worker and is never registered — do not copy anything PWA from the donor.
5. **No three.js upgrade.** The engine was written against the vendored three **r160** (`vendor/three.module.js`, `REVISION = '160'`). The donor used npm three 0.186 — do not follow it. See D2.
6. **The existing test suite stays green** — all 35 `starlight-quest/tests/*_check.mjs` files, unmodified, plus the new tests from §7. CI (`starlight-tests.yml`) is updated for new paths, never weakened.
7. **No new art, no Disney anything, no palette changes.** This is a UI-shell port only.
8. **Never publish or deploy the Argon repo.** It stays a read-only donor.
9. **One PR per phase** (§6), each with: what changed, test output, and a preview link or local verification steps. Fernando merges.
10. **If a phase's gate fails, stop.** Do not improvise around a red gate; report the failure with evidence.

## 4. Mandatory fixes — the donor's defects (fix during the port, never replicate)

### F1 — The adaptive ladder is wired dead in the donor (Phase 3)
In donor `App.tsx`: `handleRoundCorrect` adds the star/shard and advances the round but **never appends to `results`**; only `handleRoundMiss` appends (`{ firstTry: false, hinted: true }`). `completeQuest()` then calls `recordQuest(landState(...), results)` with `firstTry` always 0 → **tiers can never rise, and review items can never earn the 2 wins needed to leave the queue.**
**Fix:** correct answers append `{ round, firstTry: true, hinted: false }` under the same guards the miss path uses (`!round.requeued`, cap 5).
**Trap:** React state updates are async — `completeQuest()` can run before the final round's `setResults` flushes. Do not rely on state timing: keep the results in a ref, or compute the final array and pass it into the completion path explicitly.
**Testability requirement:** implement the bookkeeping in a small framework-free helper (suggested `starlight-quest/ui/questbook.ts` or plain `.js`) that the component calls, so Node tests can drive it — see §7 T1/T2.

### F2 — Third-miss reveal must not award the star (Phase 3)
Donor `ChallengeModal.tsx` (~line 151–161): on the 3rd miss it reveals the answer gently, then calls `onCorrect()` — which awards the star/shard via `handleRoundCorrect`. The gentle reveal itself is **adopted** ("That's okay! The answer is…" and move on — good anti-frustration pattern for a 6-year-old); the free star is not.
**Fix:** a distinct reveal-complete path that advances the round with **no star, no shard**, and records the result as `{ firstTry: false, hinted: true }`.

### F3 — Parent Corner parity (Phase 4)
The donor's Parent Corner is prettier but shallower. Restore full parity with the real game:
- The complete editable **"This week"** pack via quests.js `setWeek` — spelling list, sight words, dictation sentence, short vowels (`WEEK_DEFAULT` shape). The donor exposes only a sight-words field (`setSchoolWords`) — insufficient.
- The grown-ups check must **not leak its answer**: donor `ParentCorner.tsx` line 117 prints `(Hint: 14)` after a wrong try. Remove; a wrong answer just invites another try.
- Keep from the donor: progress summary cards (stars / lands glowing) and per-land rows with live tier chips next to each standard — clearer than the current table. The standards content itself comes from the real game's data (STANDARDS.md / quests data), never hard-coded copies that can drift.

### F4 — Gamepad menu navigation (Phase 3)
In the donor, `padnav.js` is dead code — the pad can move Zoe (input.js works) but cannot drive the menus. The real game is fully controller-playable and must stay that way: all modals/menus in the new shell must be gamepad-navigable (focus management + pad events), with a smoke test on a real controller before cutover (hardware check is Fernando's; flag it in the Phase 3 PR).

### F5 — Deployment coherence (Phase 5)
The donor's deploy story is broken two ways and is **not** ported: its `firebase.json` serves the repo root (raw TSX), and its Vite `dist/` omits the audio folder (MP3s would 404; voices would silently fall back to TTS). Our build must include **everything** the game loads — bundle, `assets/` audio (EN+ES), icons, portraits — proven by the precache/offline gates in Phase 5/6, not assumed.

## 5. Architecture decisions

- **D1 — Layout.** New shell source lives at `starlight-quest/src/` (React + TS, from the donor, adapted). Engine stays at `starlight-quest/js/`. Vite root = `starlight-quest/`; `index.html` becomes the Vite entry. **[default]**
- **D2 — three.js.** Vite `resolve.alias`: `'three'` → `starlight-quest/vendor/three.module.js` (r160). The bundle builds against the exact three the engine was written for. Upgrading three is a separate future project.
- **D3 — Deploy.** GitHub Pages stays the host and the URL in §3.3 is preserved exactly. A GitHub Actions workflow on push to `main`: run tests → `vite build` → assemble the Pages artifact with the build output staged at `starlight-quest/` and the repo's other site content (Academy hub etc.) unchanged → deploy via `actions/deploy-pages`. **Owner step:** Fernando switches the repo's Pages source to "GitHub Actions" in Settings → Pages at Phase 5 (one-time). Until that switch, merges do not change the live site — sequence Phase 5 so the workflow lands first, the switch second, a no-op rebuild third to prove the pipeline.
- **D4 — Styling.** The shell's components carry the donor's styling approach; if Tailwind-via-CDN is what the components assume, replace it with a build-time setup or plain CSS during Phase 2 — **no runtime CDN dependency in the shipped game** (offline rule §3.4). Whichever route, visual parity with the donor shell is the bar.
- **D5 — Audio paths.** The real game's layout wins: recorded MP3s stay where they are (`assets/audio/{EN,ES}/…` relative to the game root), and the shell resolves them exactly as `audio.js` already does. The donor's `/assets/audio/` absolute path is adapted, not adopted.
- **D6 — Dead code.** Donor copies of `main.js`, `ui.js`, `padnav.js` inside the donor repo are ignored. In our repo: `main.js` and `ui.js` are retired only at Phase 6 cutover, after parity is proven — until then they remain the live game's code on `main`. `padnav.js` (engine-side) stays and is wired per F4.

## 6. Phases (one PR each; gates are blocking)

**Phase 0 — Baseline.** Branch `feat/r4-react-shell` from `main`. Tag `pre-r4` on `main`. Record: full test suite output (all green), current `CACHE_VERSION`, and a save fixture — export a representative `zoe-starlight-quest-v1` localStorage payload (stars, done lands, ladder states, wardrobe, week pack) into `tests/fixtures/save-v1.json` for Phase 6. *Gate: baseline numbers in the PR description.*

**Phase 1 — Scaffold & engine bridge.** Vite + React + TS scaffold per D1/D2; engine imported **unchanged**; app boots to the title screen and renders the 3D world with Zoe; joystick/keyboard movement works. No quest UI yet. *Gate: `vite build` succeeds; engine diff vs `main` = zero (or import-specifier-only, listed file by file); world renders with no console errors.*

**Phase 2 — Component port.** Port `App.tsx`, `main.tsx`, `types.ts`, and all 11 components from the donor; adapt audio paths (D5) and styling (D4). Full loop playable: title → tutorial → roam → dialogue → challenge → celebration → pause (wardrobe, Treasure Book, Parent Corner placeholder) → finale via `shouldRunFinale` + castle crown. *Gate: a complete Belle quest and a complete 10-land finale run locally; milestones/treasures/today's-star fire via the engine callbacks.*

**Phase 3 — Mandatory fixes F1, F2, F4.** Questbook helper + ladder wiring per F1 (incl. the async trap); reveal path per F2; gamepad menu navigation per F4. *Gate: new tests T1–T3 pass (§7); existing suite green.*

**Phase 4 — Parent Corner parity (F3) + donor polish.** Full week pack editor on `setWeek`; gate without the hint leak; progress cards + tier chips; toasts and confetti moments from the donor (`canvas-confetti` is fine — it's bundled, not CDN). *Gate: week-pack round-trip test T4 passes — edit the pack, start Belle/Elsa, the custom words appear; existing `week_check.mjs` still green.*

**Phase 5 — PWA & deploy (F5).** Service worker updated for the built output: precache the bundle, icons, and game assets per the real game's existing strategy (audio caching behavior unchanged); `CACHE_VERSION` bump to `v20-<yyyymmdd>`; manifest unchanged (name, icons, start URL). Actions workflow per D3. Fernando flips Pages source to GitHub Actions (owner step). *Gate: `precache_check.mjs` passes against the build output; artifact tree listing in the PR shows `starlight-quest/` containing the built game and no other path changed.*

**Phase 6 — Verification & cutover.** Full suite + new tests green in CI. Offline test: load once online, go offline, relaunch — game boots and plays. **Save-continuity test:** seed the Phase 0 fixture into localStorage, load the new build — stars, lands, ladder, wardrobe, week pack all intact. Real-controller smoke test (Fernando, hardware). Then: retire `main.js`/`ui.js` wiring, final `CACHE_VERSION` confirmation, PR to `main`. *Gate: every box in §8 checked with evidence in the PR.*

## 7. New tests (add to `starlight-quest/tests/`)

- **T1 `ladderwiring_check.mjs`** — drive the questbook helper: a quest with ≥4 of 5 first-try correct → tier rises; a quest of all misses → tier does not rise.
- **T2 `reviewqueue_check.mjs`** — a missed item re-queued; after 2 subsequent first-try wins on it, it leaves the review queue.
- **T3 `reveal_check.mjs`** — the third-miss reveal path: star count and shard count unchanged; round advances; result recorded as hinted.
- **T4 `weekpack_check.mjs`** — `setWeek` with a custom pack → Belle and Elsa round builders include the custom spelling/sight/dictation content.
- **T5 `savecontinuity_check.mjs`** — the Phase 0 fixture loads under the new shell's save path with all fields intact (may live as a shell-level test if the harness requires it; the assertion list is the fixture's fields).

## 8. Feature parity checklist (end state — every row "Full" in the NEW shell)

| Feature | Donor status | Required |
|---|---|---|
| 3D world, all 10 lands/quests, generators, finale | Full (engine) | Full |
| Adaptive ladder (up + down + review) | **Broken up** | Full (F1) |
| Miss handling | Reveal **+ free star** | Reveal, no star (F2) |
| Milestones 10/25/50/100, wardrobe | Full | Full |
| Daily treasures 50, secrets → stickers, Treasure Book | Full | Full |
| Today's star, tappable world | Full | Full |
| Parent Corner | Partial (F3) | Full + donor cards/chips |
| Tutorial (5 steps, spoken), pause menu | Full | Full |
| Controls: keyboard / touch joystick | Full | Full |
| Controls: gamepad incl. menus | **Partial** | Full (F4) |
| Voices: recorded MP3 + TTS | Full in preview | Full **in the build** (F5) |
| Saves | Same schema | Same key + fixture-proven |
| Offline / Home Screen | **Absent** | Full (Phase 5) |
| Tests + CI | **Absent / broken paths** | Full suite + T1–T5 |

## 9. Cutover & rollback

- Cutover = merging the Phase 6 PR + the D3 pipeline deploying. Zoe's devices pick it up on next online open via the bumped `CACHE_VERSION` — same as every prior round.
- **Rollback:** the `pre-r4` tag holds the complete vanilla game. A bad cutover is reverted by restoring `main` to the tag (and, if the Pages source was switched, pointing Pages back to branch deploy). No data migration exists in either direction — the save never changed — so rollback is safe for her progress.
- The Argon repo is untouched by every phase. A separate later decision (Fernando's) covers making it private or deleting it.

## 10. Out of scope

Spanish-version work; new kingdoms or quests; three.js upgrade; palette/visual redesign beyond the donor shell's look; the Academy hub app; anything in the Argon repo itself.

## 11. Definition of done

All six phase PRs merged in order, §8 fully green with evidence, T1–T5 in the suite, the game live at its existing URL on the new shell, Zoe's saved progress demonstrably intact, and `pre-r4` tagged as the rollback point.
