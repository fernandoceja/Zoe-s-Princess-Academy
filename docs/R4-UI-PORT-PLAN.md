# R4 — React UI Port Plan (execution plan for Haiku 5.5)

**Repo:** `fernandoceja/Zoe-s-Princess-Academy` · **Game folder:** `starlight-quest/`
**Donor (read-only):** `fernandoceja/Zoe-s-Starlight-Quest-Argon` @ `de7be5d` (never modified, published or deployed)
**Starting draft:** `docs/HANDOFF-R4-REACT-UI-PORT.md` (PR #113, branch `docs/handoff-r4-react-ui-port`). This plan keeps its direction and its §3 non-negotiables and corrects it where the code disagrees. Every deviation is listed in §2 with a reason.
**Audited:** `main` @ `17186bf` (Oct 28, 2026, after #112). 35/35 tests green. `CACHE_VERSION = 'v19-20261028'`, import stamp `?v=20261028r3`.
**Status:** PLAN ONLY. Nothing here is built until Fernando approves this PR. Planner: Opus. Executor: Haiku 5.5, one task at a time.

---

## 0. How Haiku uses this document

1. Do the phases in order, P0 → P6. Do the tasks inside a phase in order.
2. One branch and one PR per phase (exceptions in §2, D-9). Each task is one commit on that branch, with the task ID in the commit title (e.g. `R4 P1.3: add Vite config`).
3. Each task lists: **Objective**, **Files** (the only files you may touch), **Steps**, **Accept** (commands that must pass, paste their output in the PR), **Stop if** (stop, do not improvise, report to Fernando).
4. If a task needs a choice that is not written here, it is a stop condition. Do not decide it. Report it.
5. Every engine/donor line reference in this plan is against `main@17186bf` and Argon `de7be5d`. If `git diff 17186bf origin/main -- starlight-quest/js` is not empty when you start a phase, stop and report (the line numbers may have moved).

---

## 1. What Argon is (re-verified)

| Audit claim | Re-verified result | Holds? |
|---|---|---|
| Argon's `src/game/` is this repo's engine copied wholesale | 25 files (not 26), 11,773 lines in both, 11 byte-identical (cove, input, shapes, treasures, worldmap, 5 portraits, portraits-new). The other 14 differ only by dropped `?v=20261028r3` import stamps, plus **two** audio path edits: `audio.js` and `quests.js` `BELLE_CLIP_DIR` (`../assets/audio/` → `/assets/audio/`). | Yes, with the count and the second path corrected |
| `docs/HANDOFF-R3-CODEX.md` copied too | Present in Argon. Argon's root `sw.js` is byte-identical to **this repo's root `sw.js`** (the Academy hub's worker, `zoe-academy-pwa-v5`), not the game's. | Yes |
| Argon authored a React 19 + TS shell, `App.tsx` + 11 components, ~2,700 lines | `App.tsx` 633, `main.tsx` 9, `types.ts` 103, 11 components; 2,722 lines total. Stack: react/react-dom 19.3.1, canvas-confetti 1.9.4, three ^0.186.1, firebase (unused), Vite 8.3.5, TS 7.0.2, Tailwind **v3 Play CDN** + Google Fonts CDN. | Yes |
| D1. First-try results never recorded | `handleRoundCorrect` (App.tsx ~347) never appends to `results`; `completeQuest` (~389) passes `results` to `recordQuest` → `firstTry` always 0. **Also:** `handleRoundMiss` (~368) appends one entry **per wrong pick**, so one round can add 2–3 "hinted" entries (the real game adds exactly one entry per round, `main.js:565-573`). Tiers can only fall. | Yes, and worse than stated |
| D2. Third-miss reveal awards the star | `ChallengeModal.tsx:151-161` calls `onCorrect()` after the reveal → +1 star and +1 shard. | Yes |
| D3. Parent Corner shallower; gate prints answer | Only `setSchoolWords` is exposed (no `setWeek` editor). Gate answer is the constant `'14'` (`ParentCorner.tsx:73`) and the wrong-answer text prints `(Hint: 14)` (line 117). Real game: random `a+b`, a and b in 6–9 (`ui.js:1596-1597`). Standards are a hard-coded `STANDARDS_MAP` copy (line 13), not the real `PARENT_CORNER_HTML` data. | Yes, plus fixed answer and hard-coded standards |
| D4. Gamepad menu navigation dead | `padnav.js` never imported. `input.js` still moves Zoe. | Yes |
| D5. No offline/PWA, incoherent deploy | `sw.js` is the Academy's; no registration; `firebase.json` serves the repo root (raw TSX); no Vite `publicDir`/copy for audio; Tailwind and fonts load from CDNs. | Yes |

### 1a. Defects the audit missed (all must be fixed, never copied)

Found by comparing donor `App.tsx` / `ChallengeModal.tsx` with `main.js` line by line:

| ID | Donor defect | Real game behavior (source) |
|---|---|---|
| F6 | **Sorting rounds soft-lock.** Bin check is `bin.includes('name')` / `item.naming` — Rapunzel's living sort uses `item.living` and bins `🌱 Living` / `🪨 Not living`, so no bin is ever right. When all items are sorted it calls `handleChoice('__sortdone')`, which is compared to `round.answer` and counted as a **miss**. Wrong bins never count a miss. | `ui.js:150-225` `_sortBins`; `main.js:486`, `__sortwrong` counts a miss (`main.js:524`), `__sortdone` = correct |
| F7 | No choice narrowing after 2 misses. | `main.js:477-481`: after 2 misses show the answer + one other |
| F8 | No "one quest per land per day" soft stop and no "rest / one more" card. Practice replays of a done land show the full "land is glowing" celebration again. | `main.js:269-305` (`startQuest`), `583-595` (`showRest`), `616-624` (practice replay → rest) |
| F9 | Milestone unlocks are saved but never celebrated (no milestone card). | `main.js:597-610` `afterQuest` |
| F10 | No new-kingdom announcement card (`unseenKingdomSlots`, `seenKingdoms`). | `main.js:200-212` |
| F11 | No `installAudioCare()` and no iOS silent-switch toast. | `main.js:94`, `213-215` |
| F12 | Belle spelling "big word with blanks" (`round.show`) and the 🔊 sentence replay (`round.replay`) are missing. | `main.js:506`, `512` |
| F13 | Treasure toast ignores the per-kind wording and `+1 ⭐` row bonus timing; bookstack secret toast missing. | `main.js:57`, `138-152` |
| F14 | World keeps rendering under full-screen cards (battery/heat on iPhone); pause **stops** the world loop, which is the loop that delivers the gamepad resume key. | `main.js:155-168` cover rule; pause menu deliberately not covered |
| F15 | `React.StrictMode` (main.tsx) double-runs the boot effect in dev: two `Input.init()` and two worlds. | Boot exactly once |
| F16 | Interaction prompt always says "Tap …" (no gamepad / keyboard wording). | `main.js:101-112` `describeControls()` |

---

## 2. Deviations from HANDOFF-R4 (flagged, with reasons)

| # | HANDOFF-R4 says | This plan does | Why (evidence) |
|---|---|---|---|
| D-1 | §2: 26 engine files | 25 files | `ls starlight-quest/js \| wc -l` = 25 on both sides |
| D-2 | §2: only `audio.js` path changed | `audio.js` **and** `quests.js` `BELLE_CLIP_DIR` | `diff` output, §1 |
| D-3 | §3.1: dropping `?v=` stamps is an allowed engine change | **Zero bytes change in `starlight-quest/js/` and `vendor/`.** A 10-line Vite `resolveId` plugin strips `?v=` at build time instead. | (a) 9 unmodified tests hard-code `?v=20261028r3` and `precache_check` requires one stamp everywhere, so dropping stamps would break the "35 tests unmodified" rule. (b) **Proven trap:** Vite treats `./quests.js` and `./quests.js?v=20261028r3` as two modules. A scratch build of the real engine without the plugin bundled `quests.js` twice (the week-pack default appears 2×), so `setWeek()` from the shell would never reach the copy `world.js`/`ladder.js` use. With the plugin: 1×. |
| D-4 | §5 D6: retire `main.js` / `ui.js` at cutover | **Keep both files on disk, unchanged, but no longer loaded.** | 16 of the 35 tests read `js/main.js` or `js/ui.js` source (e.g. `finale_check`, `tap_check`, `cove_check`, `secret_check`). Deleting or editing them breaks the unmodified-test rule. They also stay as the rollback code. See Decision 2. |
| D-5 | §6 P5: bump `CACHE_VERSION` (implies a new `?v=` stamp too) | Bump `CACHE_VERSION` to `v20-<date>` only. The `?v=20261028r3` stamp **never changes** in R4. | Tests hard-code the stamp; built bundle files get content-hashed names, so they don't need `?v=`. |
| D-6 | §5 D1: `starlight-quest/index.html` becomes the Vite entry from P1 | The new shell's entry is **`starlight-quest/next.html`** during P1–P5. `index.html` stays the vanilla game until P6, when the entry switches. | Lets Fernando compare old vs new side by side on one preview (`/starlight-quest/` vs `/starlight-quest/next.html`), keeps `precache_check` stable, and makes the cutover PR tiny. |
| D-7 | §5 D3 / §6 P5: Pages workflow lands with the build, Fernando flips Pages source "at Phase 5" | Split P5: **P5-A** = a no-build Pages workflow PR to `main` that deploys today's files byte-for-byte; Fernando merges it, flips Pages to "GitHub Actions", and we prove the live site is unchanged. **P5-B** (integration branch) adds the build. | Flipping the Pages source before a working workflow exists on `main` risks the live URL. Proving the pipeline with zero content change first makes cutover and rollback boring. |
| D-8 | Not covered | Both Firebase workflows (PR previews + merge deploy) get the same build/assemble step, and `firebase.json` `public` becomes `_site`. | Firebase previews are how Fernando QAs on iPhone. Without a build step every R4 preview would serve raw TSX (the same defect as Argon's deploy). |
| D-9 | §3.9: one PR per phase, all to main | Phases P0–P5-B open PRs into the integration branch **`feat/r4-react-shell`**. Only P5-A and P6 (cutover) target `main`, and **Fernando merges those two himself**. | The live site deploys from `main`; nothing half-built may reach it. |
| D-10 | §6 P2: port donor components and wire them | P2 ports donor files nearly verbatim (marked `// R4-FIX` where a known defect sits). P3 replaces the donor's quest wiring with **framework-free `src/flow/` modules ported line-for-line from `main.js`**. Components become views. | Fixes F1/F2/F6–F16 by reusing the real game's proven logic instead of re-inventing it, avoids the async-state trap by design (state in one plain object held in a `useRef`), and makes it testable in Node without React. |
| D-11 | §4 F3: standards "from STANDARDS.md / quests data" | Standards come from `PARENT_CORNER_HTML` (quests.js), rendered as-is; donor `STANDARDS_MAP` is deleted. | That is what the live Parent Corner renders today (`ui.js:240`). |
| D-12 | §5 D4: Tailwind CDN → build-time or plain CSS | **Tailwind 3.4.19 at build time** (PostCSS), donor `className`s kept verbatim. Fonts from the vendored `vendor/fonts/nunito.css`. | Donor uses the v3 Play CDN; v3 at build time gives pixel parity with no class rewrites (v4 renames utilities). No runtime CDN. |
| D-13 | §7: T1–T5 | T1–T5 plus T6–T10 (engine-untouched hash, single-instance bundle, build precache, gate-no-leak, pad roots) | Each enforces a non-negotiable mechanically instead of by review. |
| D-14 | §9: "restore `main` to the tag" | Rollback = a **revert PR** (normal merge) whose `starlight-quest/` tree equals `pre-r4`. | Fernando's rule: never force-push. The P5-A pipeline deploys whatever `main` holds, built or not. |

---

## 3. Non-negotiables and how each is enforced

| Rule | Enforced by |
|---|---|
| Engine files under `starlight-quest/js/` functionally untouched (here: byte-untouched) | **T6** compares SHA-256 of every `js/*.js` and `vendor/**` file with `tests/fixtures/engine-sha256.json` recorded in P0. Any diff = red CI = stop. |
| Save key `zoe-starlight-quest-v1` and schema unchanged; fixture test before cutover | **T5** + the P6 browser seed test. The shell never calls `localStorage` for game data; only `Save.*`. The tutorial flag key `zsq_tutorial_seen_v1` is also unchanged. |
| Same live URL and origin | P5-A proves the pipeline serves identical files at `https://fernandoceja.github.io/Zoe-s-Princess-Academy/starlight-quest/`. Vite `base: './'` keeps every URL relative. `manifest.webmanifest` is not edited. |
| Offline / Home Screen from the real SW strategy; nothing PWA from Argon | `starlight-quest/sw.js` keeps its `cacheFirst`, range, and activate code untouched; only `CACHE_VERSION` and a `BUILD_URLS` list are added. **T8** checks every built file is precached. Argon's `sw.js`/`manifest`/`metadata.json` are never copied. |
| No three.js upgrade | No `three` npm package. Vite alias `three` → `starlight-quest/vendor/three.module.js` (r160). **T7** fails if the bundle's three REVISION isn't `160` or if `node_modules/three` exists. |
| All 35 tests green and unmodified; CI extended, never weakened | Existing `test` job in `starlight-tests.yml` is left byte-identical; a new `shell` job is added. **T6** also hashes `tests/*_check.mjs` from the 35-test list. |
| No new art, palette changes, or Disney material | Components copy donor markup only; no new image files; portraits come from the engine (`PRINCESSES[id].portrait`, `PORTRAIT_ZOE`). PR file lists are checked against each task's **Files**. |

---

## 4. Target architecture

```
starlight-quest/
  index.html            vanilla game until P6; P6: becomes the shell entry
  next.html             P1–P5 shell entry (removed in P6)
  sw.js                 real SW + CACHE_VERSION bump + BUILD_URLS (P5-B)
  js/                   ENGINE — byte-untouched (main.js, ui.js stay, dormant after P6)
  vendor/               three r160 + Nunito — byte-untouched
  package.json          NEW (shell only; the repo-root package.json is the Academy's, untouched)
  package-lock.json     NEW
  vite.config.js        NEW (strip-stamp plugin, three alias, base './', outDir dist/, assetsDir app/)
  postcss.config.js     NEW
  tailwind.config.js    NEW (content: ./next.html, ./index.html, ./src/**/*.{js,ts,tsx})
  tsconfig.json         NEW (donor's, include src)
  src/
    main.tsx            boot (no StrictMode)
    App.tsx             view state + calls into flow/
    types.ts
    styles.css          @tailwind base/components/utilities + body rules from donor index.html
    engine-core.js      re-exports Node-safe engine modules with stamped specifiers
    engine-dom.js       re-exports world/audio/input/padnav with stamped specifiers
    components/         11 donor components (views)
    flow/               framework-free, Node-testable, ported from main.js
      questbook.js      rounds, misses, results, requeue, narrowing, pick outcomes, finish
      visuals.js        visualHtml + story/sentence/measure/clock helpers (verbatim)
      voice.js          voiceText rules (which princess reads the choices aloud)
      boot.js           bootSave(): Save.load + rollover + setSchoolWords + setWeek + setLang + mute
      parent.js         gate question, applyWeek(), applyWords()
      outcomes.js       questComplete(): ladder, lastPlay, done, stars, rest vs celebrate vs finale
  tools/
    assemble-site.mjs   NEW: builds _site/ (whole repo + built shell + BUILD_URLS injection)
  tests/                existing 35 untouched + T1–T10 + fixtures/
```

Rules every shell file follows:
- Shell code imports the engine **only** through `src/engine-core.js` or `src/engine-dom.js`. Those two files import engine modules with the exact stamped specifier the engine uses (`'../js/quests.js?v=20261028r3'`), so Node tests and the bundle each see one instance. The Vite plugin dedupes anything else.
- `src/flow/*.js` import only `engine-core.js` (never world/audio/DOM), so `node tests/<x>_check.mjs` runs them with no browser.
- All quest state lives in one plain object created by `createQuestbook()` and held in `useRef`. React state is only for re-rendering. No game decision reads React state (this is the fix for the async trap).
- Modal root elements carry the class names `padnav.js` and the cover rule look for: `.zsq-title`, `.zsq-tutorial`, `.zsq-modal-wrap`, `.zsq-celebrate`, `.zsq-finale`, `.zsq-parent-wrap`, `.zsq-pause-wrap`, `.zsq-sheet`. Interactive elements are `<button>`. Hidden = unmounted. The `zsq-padfocus` ring style is injected by `startPadNav()` itself (`padnav.js:164-167`), so the shell adds no CSS for it.

Pinned dependencies (exact versions, no `^`): `react 19.3.1`, `react-dom 19.3.1`, `canvas-confetti 1.9.4`; dev: `vite 8.3.5`, `@vitejs/plugin-react 6.1.2`, `tailwindcss 3.4.19`, `postcss 8.5.32`, `autoprefixer 10.6.2`. **Not** included: `three`, `firebase`, `@types/three`, `typescript` (Vite transpiles TSX; no type-check gate in R4, see Decision 5).

The strip-stamp plugin (verified in a scratch build against the real engine):

```js
const stripStamp = {
  name: 'strip-v-stamp', enforce: 'pre',
  resolveId(source, importer) {
    if (!importer || !source.startsWith('.') || !/\?v=[\w.-]+$/.test(source)) return null;
    return resolve(dirname(importer.split('?')[0]), source.replace(/\?v=[\w.-]+$/, ''));
  },
};
```

---

## 5. Phases and tasks

Phase PRs P0–P5-B: base `feat/r4-react-shell`, branch `claude/r4-p<N>`. P5-A and P6: base `main`.
Every PR body: what changed, full test output, `git diff --stat`, the Firebase preview link and the iPhone checks for that phase.

### P0 — Baseline (PR into `feat/r4-react-shell`)

**P0.1 Tag and integration branch**
- Objective: create the rollback point and the integration branch.
- Files: none (git refs only).
- Steps: `git fetch origin main`; confirm `origin/main` is `17186bf` or later with an empty `git diff 17186bf origin/main -- starlight-quest/` (else stop); `git tag pre-r4 origin/main && git push origin pre-r4`; `git push origin origin/main:refs/heads/feat/r4-react-shell`.
- Accept: `git ls-remote origin pre-r4 feat/r4-react-shell` shows both at the same SHA as `main`.
- Stop if: the tag already exists, or `main` has game changes since `17186bf`.

**P0.2 Baseline record**
- Objective: capture the numbers later phases are compared to.
- Files: `starlight-quest/tests/fixtures/baseline.md` (new).
- Steps: run all 35 tests (`for t in starlight-quest/tests/*_check.mjs; do node $t; done`); write the pass count, `main` SHA, `CACHE_VERSION`, stamp, and `curl -s https://fernandoceja.github.io/Zoe-s-Princess-Academy/starlight-quest/sw.js | sed -n 3p` into the file.
- Accept: file shows 35/35 and `v19-20261028`.
- Stop if: any test fails on `main`.

**P0.3 Engine hash fixture + T6**
- Objective: lock the engine and the 35 tests byte-for-byte.
- Files: `starlight-quest/tests/fixtures/engine-sha256.json` (new), `starlight-quest/tests/engine_untouched_check.mjs` (new).
- Steps: write a small Node script inside the test (`node:crypto` sha256) that hashes `js/*.js`, everything under `vendor/`, and the 35 `tests/*_check.mjs` that exist at `pre-r4` (list them explicitly in the fixture). Generate the fixture once with `--write`, then the test compares and exits 1 on any mismatch, listing files.
- Accept: `node starlight-quest/tests/engine_untouched_check.mjs` → `engine: 0 changed`. Temporarily edit one byte of a copy in /tmp to prove it fails (describe in PR, do not commit).
- Stop if: none.

**P0.4 Save fixture + T5 (Node half)**
- Objective: a representative Zoe save and proof the engine keeps it intact.
- Files: `starlight-quest/tests/fixtures/save-v1.json` (new), `starlight-quest/tests/savecontinuity_check.mjs` (new).
- Steps: build the fixture by hand with every field `save.js` `merge()` keeps: `stars` 137, `shards` for all 10 NPCs, `done` = 7 lands, `milestones` (stars-10/25/50/100 ids from `MILESTONES`), an `outfit` legal for those milestones, `treasures` for one fixed day `2026-10-27`, `secrets` (3 ids from `ALL_SECRETS`), `seenNewKingdoms: true`, `seenKingdoms` (5 slot ids), `lang: 'EN'`, `muted: false`, `started: true`, `ladder` for 4 lands incl. tier 3 and a non-empty `review` with valid rounds, `lastPlay` for 4 lands, `schoolWords` (3 words), `week` (custom spelling/sight/vowels/dictation). Then in the test: mock `globalThis.window = { localStorage }` with a Map-backed store; set `KEY` to the fixture JSON; `Save.load()`; assert `JSON.stringify(Save.data) === JSON.stringify(merge(fixture))` and that `merge(fixture)` deep-equals the fixture (the fixture must be canonical; if `merge` changes it, fix the **fixture**, never `save.js`); `Save.save()` and assert the stored string parses back equal. Also read `js/save.js` source and assert it contains `'zoe-starlight-quest-v1'`.
- Accept: test prints `save continuity: 0 problems`.
- Stop if: no canonical fixture can include a field (report which).

**P0.5 CI wiring**
- Objective: run the new checks in CI without touching the existing job.
- Files: `.github/workflows/starlight-tests.yml`.
- Steps: append a second job `shell` (needs nothing, `ubuntu-latest`, Node 20) that runs `engine_untouched_check.mjs` and `savecontinuity_check.mjs`. Do not edit any line of job `test`.
- Accept: `git diff` shows only added lines at the end of the file; both jobs green on the PR.
- Stop if: none.

**P0.6 Notion page**
- Objective: the plan-of-record page for PR logging.
- Steps: create Notion page "Starlight Quest round 4 (React UI port)" under the Code Studio page (sibling of the round 3 page), with a "PR log" section at the top and a link to this file.
- Stop if: Notion connector unavailable → note it in the PR and continue; Fernando gets the log in chat instead.

Gate P0: CI green; PR lists 35/35 + T5 + T6.

### P1 — Scaffold and engine bridge (PR into `feat/r4-react-shell`)

**P1.1 Package and ignore**
- Files: `starlight-quest/package.json`, `starlight-quest/package-lock.json`, `.gitignore`.
- Steps: `package.json` with `"private": true, "type": "module"`, the pinned deps in §4, scripts `"build": "vite build"`, `"dev": "vite --port 5173"`. `npm install` inside `starlight-quest/` to create the lock. Add `starlight-quest/dist/` and `_site/` to `.gitignore`.
- Accept: `cd starlight-quest && npm ci` succeeds; `ls node_modules/three` fails (must not exist).
- Stop if: npm resolves a different version than pinned.

**P1.2 Vite, PostCSS, Tailwind configs**
- Files: `starlight-quest/vite.config.js`, `postcss.config.js`, `tailwind.config.js`, `tsconfig.json`.
- Steps: `vite.config.js` = `root` the config's folder, `base: './'`, plugins `[stripStamp, react()]`, `resolve.alias.three` → `vendor/three.module.js`, `build.outDir 'dist'`, `assetsDir 'app'`, `rollupOptions.input` = `{ next: 'next.html' }`, `publicDir: false`. Tailwind content globs per §4; theme empty (donor uses defaults + arbitrary values). `tsconfig.json` = donor's, unchanged.
- Accept: `npx vite build` runs (may fail only because `next.html` doesn't exist yet).

**P1.3 Entry page and boot**
- Files: `starlight-quest/next.html`, `starlight-quest/src/main.tsx`, `src/styles.css`, `src/engine-core.js`, `src/engine-dom.js`, `src/App.tsx` (stub).
- Steps: `next.html` = copy of `index.html`'s `<head>` (same meta, manifest, icons, `./vendor/fonts/nunito.css?v=20261028r3`), **no importmap, no inline loader, no SW registration yet**, `<div id="root"></div>` and `<script type="module" src="./src/main.tsx">`. `main.tsx` renders `<App/>` **without StrictMode** (F15). `engine-core.js` re-exports everything the shell needs from `quests, ladder, save, treasures, worldmap, shapes, tally, portrait-zoe` using stamped specifiers; `engine-dom.js` the same for `world, audio, input, padnav`. Stub `App.tsx`: one `useEffect` that runs `bootSave()` logic inline for now, `Input.init()`, `createWorld(ref, {})`, `setInputEnabled(true)`, returns `world.dispose`.
- Accept: `npm run build` succeeds; `npx vite preview` and open `/next.html` in Playwright Chromium: canvas present, Zoe visible, 0 console errors, arrow keys move her (screenshot before/after in PR).
- Stop if: the build needs any change in `js/` or `vendor/`.

**P1.4 Joystick**
- Files: `src/components/VirtualJoystick.tsx` (donor verbatim, imports switched to `../engine-dom.js`), `src/App.tsx`.
- Accept: touch emulation in Playwright moves Zoe; iPhone check listed in PR.

**P1.5 T7 bundle check**
- Files: `starlight-quest/tests/bundle_check.mjs`.
- Steps: after build, read `dist/app/*.js`; assert `Can he run past the tent?` (quests.js `WEEK_DEFAULT` dictation) appears exactly once, `zoe-starlight-quest-v1` exactly once, three `REVISION` string `"160"` present, no `cdn.tailwindcss.com`, no `fonts.googleapis.com`, no `firebase`; assert `node_modules/three` absent.
- Accept: passes; also prove it fails by building once with the plugin removed (describe in PR, do not commit).

**P1.6 Site assembly + Firebase previews**
- Files: `starlight-quest/tools/assemble-site.mjs`, `firebase.json`, `.github/workflows/firebase-hosting-pull-request.yml`, `.github/workflows/starlight-tests.yml` (append to job `shell` only).
- Steps: `assemble-site.mjs`: copy the repo into `_site/` (skip `.git`, `node_modules`, `_site`, `starlight-quest/dist`); if `starlight-quest/package.json` exists, run `npm ci && npm run build` in `starlight-quest/` and copy `dist/next.html` (later `dist/index.html`) and `dist/app/` into `_site/starlight-quest/`. `firebase.json`: `"public": "_site"`, everything else unchanged. PR-preview workflow: add `actions/setup-node@v4` (Node 20) and `run: node starlight-quest/tools/assemble-site.mjs` before the deploy step. CI job `shell`: add `npm ci`, build, `bundle_check`.
- Accept: preview link serves `/starlight-quest/` (vanilla, unchanged) **and** `/starlight-quest/next.html` (new shell world). Root Academy page still loads.
- Stop if: the Firebase action rejects the new `public` folder.

Gate P1: build green; T6 shows 0 engine changes; world renders with no console errors on preview; vanilla game at `/starlight-quest/` unchanged.

### P2 — Component port (PR into `feat/r4-react-shell`)

Mechanical copy. Each component is its own commit. For every donor file: copy from Argon `de7be5d`, change imports `../game/<x>.js` → `../engine-core.js` or `../engine-dom.js`, change nothing else except the listed edits. Where a known defect sits, add a one-line `// R4-FIX F<n>` comment and leave it for P3/P4.

| Task | File (from donor `src/`) | Required edits in P2 |
|---|---|---|
| P2.1 | `types.ts` | none |
| P2.2 | `components/HUD.tsx` | none |
| P2.3 | `components/TitleModal.tsx` | root element class gets `zsq-title` added |
| P2.4 | `components/TutorialModal.tsx` | root class `zsq-tutorial` |
| P2.5 | `components/DialogueModal.tsx` | root class `zsq-modal-wrap` |
| P2.6 | `components/ChallengeModal.tsx` | root class `zsq-modal-wrap`; mark lines ~151-161 `R4-FIX F2`, sort handler `R4-FIX F6` |
| P2.7 | `components/CelebrationModal.tsx` | root class `zsq-celebrate` (finale variant `zsq-finale`) |
| P2.8 | `components/PauseMenu.tsx` | root class `zsq-pause-wrap` |
| P2.9 | `components/WardrobeModal.tsx` | root class `zsq-sheet` |
| P2.10 | `components/TreasureBookModal.tsx` | root class `zsq-sheet` |
| P2.11 | `components/ParentCorner.tsx` | root class `zsq-parent-wrap`; mark gate + hint `R4-FIX F3` |
| P2.12 | `App.tsx` | replace the P1 stub; mark `handleRoundCorrect`/`handleRoundMiss`/`completeQuest` `R4-FIX F1`; delete the `NPC_TO_LAND` duplicate only if `engine-core` exports one (it does not today → keep, it is identical to `main.js:23`) |
| P2.13 | `src/styles.css` | Tailwind directives; body rules from donor `<body class>` moved to CSS |

Audio paths (D5): no edits needed — the engine's own `../assets/audio/` paths resolve from `/starlight-quest/next.html` to the repo-root `assets/audio/`, exactly as today. Donor's `/assets/audio/` is never used.

- Accept (whole phase): `npm run build`; T6, T7 green; on preview `/next.html`: title → tutorial → walk → talk to Belle → 5 rounds → celebration → pause menu → wardrobe / Treasure Book / Parent Corner open and close. Screenshots in PR. `grep -c "R4-FIX" src -r` count reported.
- Stop if: a donor component imports something the engine doesn't export (report the name), or a component needs a new image.

### P3 — Wiring fixes: F1, F2, F4, F6–F16 (PR into `feat/r4-react-shell`)

All logic is ported **verbatim** from `main.js@17186bf`; the line ranges are the source. Replace closure variables with fields of the questbook object `qb`.

**P3.1 `flow/questbook.js`** — Objective: one plain object owns quest state.
- Port: `startQuest` setup lines 282-286 → `createQuestbook(npcId, rounds)` returning `{ npcId, rounds, roundIdx: 0, misses: 0, results: [], requeued: 0 }`; `noteResult` 565-573 → `noteResult(qb, round)`; `nextRound` 575-580 → `nextRound(qb)` returns `true` when the quest is over; choice narrowing + shuffle 306-314 and 477-486 → `roundView(qb, rng)` returning `{ round, choices, correctId, tileRound }`; pick handling 514-560 → `pick(qb, pickedId, correctId, saveData)` returning one of `'correct' | 'reveal' | 'retry' | 'spellwrong' | 'sortwrong'` and mutating `saveData.stars/shards` **only** on `'correct'`.
- Accept: T1, T2, T3 (§7) pass.

**P3.2 `flow/visuals.js` and `flow/voice.js`** — port 316-469 (`visualHtml`, `storyCardsHtml`, `sentenceCardHtml`, `measureSVG`, `clockSVG`) and the `voiceText` block 487-495 verbatim as exported pure functions. Add `bigWord` (`round.show`) and `replayText` (`round.replay`) to `roundView` (F12).
- Accept: new T-parity loop inside T1's file: for every NPC in `NPC_ORDER`, tiers 1-3, seeds 1-20, `buildRounds` → every round gets a non-throwing `visualHtml` and `roundView` whose `choices` include the answer (non-tile, non-sort rounds).

**P3.3 `flow/outcomes.js`** — port `completeQuest` 616-654, `afterQuest` 597-610, `showRest` decision 583-595, the once-a-day check 270-280, `refreshTodayStar` 612-614 as pure functions that return **what to show next** (`{ kind: 'rest' | 'celebrate' | 'milestone' | 'finale', ... }`) and mutate `Save.data` exactly as `main.js` does.
- Accept: T1/T2 also call `questComplete()` and check `Save.data.ladder`, `lastPlay`, `done`, `stars` (+3 only the first time).

**P3.4 Wire App.tsx to flow** — `const qb = useRef(null)`; `handleStartQuest` → `createQuestbook`; ChallengeModal receives `roundView` and calls back `onPick(pickedId)` only; App calls `pick()` and renders feedback from the returned kind. Remove all `R4-FIX F1` lines (the `results` React state disappears). F7 narrowing, F8 rest card + "one more", F9 milestone card (reuse CelebrationModal with milestone text from `afterQuest`), F10 new-kingdom card (port 200-212 into `flow/outcomes.js` `kingdomsToAnnounce()`), F11 `installAudioCare()` at boot + silent-switch toast, F13 treasure/secret toasts ported from 45-66 and 138-152, F16 prompt wording via `Input.describeControls()`.
- Stop if: a donor component can't show something the flow returns without a new design (report it; e.g. a missing visual layout).

**P3.5 ChallengeModal reveal and sort (F2, F6)** — reveal: when `pick()` returns `'reveal'`, show the donor's gentle reveal text **using `revealLines(round)` from the engine** (`main.js:544`), then call `onAdvance()`, which calls `nextRound(qb)` — never the correct path. Sort: replace the donor bin heuristic with the engine's rule from `ui.js:150-225` (`living` for Rapunzel, `naming` for Aurora): wrong bin → `onPick('__sortwrong')`, all sorted → `onPick('__sortdone')`, and `'__sortdone'` is the correct id. Spell/build tiles: wrong tile → `onPick('__spellwrong', info)`, done → `'__spelldone'`.
- Accept: T3 passes; on preview, Rapunzel sort and Aurora word sort complete; 3 wrong picks on any round reveal with no star change (HUD star count screenshot before/after).

**P3.6 Gamepad menus + world cover (F4, F14)** — call `startPadNav()` once at boot (from `engine-dom`). Port the cover rule `main.js:155-168` (MutationObserver on the React root, same `COVER_SELECTOR`) so full-screen cards pause the world and the pause menu does not. Remove the donor's `world.pause()` on pause.
- Accept: **T10** passes; Playwright: with a dialog open, `ArrowDown` + `Enter` moves the `zsq-padfocus` ring and presses a button (padnav also handles arrow keys).
- Stop if: padnav can't see a modal's buttons (report the modal).

Gate P3: T1–T3, T10, T6, T7 green; `grep -r "R4-FIX F1\|R4-FIX F2\|R4-FIX F6" src` returns nothing; one complete Belle quest and one Rapunzel quest on preview. Real-controller check is Fernando's (listed in PR).

### P4 — Parent Corner parity (F3) and donor polish (PR into `feat/r4-react-shell`)

**P4.1 Gate (F3)** — `flow/parent.js` `gateQuestion(rng)` ported from `ui.js:1596-1610` (a, b in 6–9, shuffled options as there). ParentCorner uses it; wrong answer shows only "Oops, try again!" and a new question. Delete the `'14'` constant and the hint line.
- Accept: **T9** passes.

**P4.2 Week pack editor** — `flow/parent.js` `applyWeek(saveData, form)` = `cleanWeek(form)` → `saveData.week = cleaned` → `setWeek(cleaned)` → `Save.save()`; `applyWords` same for `schoolWords` with `cleanWordList`/`setSchoolWords`. ParentCorner gets four fields (spelling, sight, dictation, short vowels) prefilled from `WEEK`, plus Reset → `WEEK_DEFAULT`. Field labels/help text copied from `ui.js` Parent Corner (search `WEEK_DEFAULT` in `ui.js`).
- Accept: **T4** passes; existing `week_check.mjs` green.

**P4.3 Standards + progress cards** — keep donor summary cards (stars, lands glowing) and per-land rows with tier chips from `landState(Save.data.ladder[id]).tier`; replace `STANDARDS_MAP` with `PARENT_CORNER_HTML` rendered via `dangerouslySetInnerHTML` (engine-authored constant).
- Accept: preview screenshot; `grep STANDARDS_MAP src -r` empty.

**P4.4 Toasts and confetti** — keep donor toasts and `canvas-confetti` (bundled). No new moments beyond the donor's.

Gate P4: T4, T9 green; no `R4-FIX` left anywhere (`grep -rc "R4-FIX" src` = 0).

### P5 — PWA and deploy

**P5-A Pages pipeline, no build (PR into `main`, Fernando merges)**
- Files: `.github/workflows/pages.yml` (new), `starlight-quest/tools/assemble-site.mjs` (same file as P1.6; on `main` it finds no `starlight-quest/package.json` and only copies).
- Steps: workflow on `push` to `main` + `workflow_dispatch`: checkout → setup-node 20 → `node starlight-quest/tools/assemble-site.mjs` → `actions/upload-pages-artifact@v3` (`path: _site`) → `actions/deploy-pages@v4`; permissions `pages: write`, `id-token: write`, `contents: read`.
- Owner steps (Fernando): merge; Settings → Pages → Source: **GitHub Actions**; run the workflow once.
- Accept: after deploy, `curl` the live `starlight-quest/index.html`, `sw.js`, `js/main.js?v=20261028r3`, one MP3 and root `index.html`; SHA-256 equals the repo files; `CACHE_VERSION` still `v19-20261028`. Zoe's iPhone keeps working (no SW change at all).
- Stop if: any hash differs → Fernando switches Pages back to "Deploy from a branch: main / root"; report.

**P5-B Service worker for the built shell (PR into `feat/r4-react-shell`)**
- Files: `starlight-quest/sw.js`, `starlight-quest/next.html`, `tools/assemble-site.mjs`, `tests/buildprecache_check.mjs`, `starlight-tests.yml` (job `shell`), `.github/workflows/firebase-hosting-merge.yml`.
- Steps: in `sw.js` change only: `CACHE_VERSION = 'v20-<yyyymmdd>'`; add `const BUILD_URLS = []; // filled by tools/assemble-site.mjs` after `PRECACHE_URLS`; install loops over `[...PRECACHE_URLS, ...BUILD_URLS]`. Every existing entry stays. `assemble-site.mjs` replaces that exact line in `_site/starlight-quest/sw.js` with the list of `./app/*` files and `./next.html`. `next.html` gets the SW registration + `navigator.storage.persist()` script copied verbatim from `index.html`. Firebase merge workflow gets the same setup-node + assemble step as the PR workflow.
- Accept: `precache_check.mjs` green (source); **T8** green (built `_site`); on preview: load `/next.html` online, then Playwright `context.setOffline(true)` and reload → game boots; manifest diff empty.
- Stop if: any existing PRECACHE entry would have to change.

### P6 — Verification and cutover (PR `feat/r4-react-shell` → `main`, Fernando merges)

**P6.1 Switch the entry** — `index.html` becomes the shell entry (contents of `next.html`), `next.html` deleted, Vite input → `index.html`, `assemble-site.mjs` copies `dist/index.html`, `sw.js` `BUILD_URLS` comment unchanged, `CACHE_VERSION` re-bumped to `v20-<cutover date>` if the date changed. `js/main.js` and `js/ui.js` stay on disk (D-4).
- Accept: `precache_check` (scans the new `index.html`: only the font stamp) and all 35 green.

**P6.2 Browser save continuity (T5 browser half)** — `tools/smoke.mjs` (Playwright, Chromium preinstalled): serve `_site` locally under `/Zoe-s-Princess-Academy/`, set `localStorage['zoe-starlight-quest-v1']` = fixture, load `/starlight-quest/`, read back `Save`-visible numbers from the HUD (stars 137, 7 lands glowing) and the raw localStorage string; assert parsed equals `merge(fixture)` after one `Save.save()`.

**P6.3 Offline** — same harness: online load, wait for SW `activated`, go offline, reload, start a quest.

**P6.4 Parity checklist** — fill §6 with evidence links (screenshot or test name) for every row.

**P6.5 Fernando hardware checks** — real controller (menus + walking), iPhone Home Screen icon opens the new shell, voices are recorded MP3s (not TTS), offline relaunch.

Gate P6: every §6 row checked with evidence; all CI jobs green; Fernando merges. Then Haiku confirms the live `sw.js` shows the new `CACHE_VERSION` and logs it.

---

## 6. Feature-parity checklist (end state: every row "Full" in the new shell)

| Feature | Donor status (re-verified) | Required end state | Proof |
|---|---|---|---|
| 3D world, 10 lands, generators, finale | Full (engine) | Full | P2 walkthrough, finale on preview with fixture `done` = 9 + one quest |
| Adaptive ladder up / down / review | **Broken** (F1, per-miss entries) | Full, `main.js` semantics | T1, T2 |
| Miss handling | Reveal **+ free star**; no narrowing | Retry hint → narrow after 2 → reveal, no star | T3, P3.5 |
| Sorting rounds (Rapunzel, Aurora) | **Soft-lock** (F6) | Full | P3.5, T1 parity loop |
| Spelling big word / dictation replay | Missing (F12) | Full | P3.2 |
| One quest per land per day, rest / one more | Missing (F8) | Full | T1 (`questComplete` → `rest`) |
| Milestones 10/25/50/100 + card, wardrobe | Saved, no card (F9) | Full | P3.4 |
| New-kingdom announcement | Missing (F10) | Full | P3.4 |
| Daily treasures, secrets → stickers, Treasure Book | Mostly (F13 wording) | Full | P3.4 |
| Today's star, tappable world, gate tap | Full | Full | P2 |
| Parent Corner | Partial (F3, fixed gate answer, hard-coded standards) | Full week pack + random gate + engine standards + donor cards/chips | T4, T9 |
| Tutorial (5 steps, spoken), pause menu | Full | Full | P2 |
| Controls: keyboard / touch joystick | Full | Full | P1.4 |
| Controls: gamepad incl. menus | Partial (F4) | Full | T10 + Fernando hardware |
| Prompt wording per input | "Tap" only (F16) | Full | P3.4 |
| Voices: recorded MP3 + TTS, iOS audio care | MP3 path changed; no audio care (F11) | Full **in the build** | P6.5, T8 (audio precached) |
| Battery: world paused under cards | Missing (F14) | Full | P3.6 |
| Saves | Same schema | Same key, fixture-proven | T5 + P6.2 |
| Offline / Home Screen | Absent | Full, real SW | T8 + P6.3 + P6.5 |
| Tests + CI | Absent | 35 unchanged + T1–T10 | CI |

---

## 7. New tests (all in `starlight-quest/tests/`, run by CI job `shell`)

| ID | File | What it proves | Phase |
|---|---|---|---|
| T1 | `ladderwiring_check.mjs` | With `flow/questbook.js`: 5 rounds all `'correct'` on first pick → `questComplete` raises tier 1→2; 3 rounds with 2 wrong picks each → tier falls (2→1); results array length is exactly one per first-asked round (never per pick); re-asked rounds excluded. Also the parity loop of P3.2. | P3 |
| T2 | `reviewqueue_check.mjs` | A round missed in play 1 enters `review`; plays 2 and 3 answer it first-try → it leaves the queue; a miss in between resets `wins` to 0. | P3 |
| T3 | `reveal_check.mjs` | 3 wrong picks → `pick()` returns `'reveal'`; `stars` and `shards` unchanged; result recorded `{ firstTry: false, hinted: true }`; `nextRound` advances. After 2 misses `roundView` shows 2 choices incl. the answer. `'__sortwrong'` counts a miss, `'__sortdone'` counts correct. | P3 |
| T4 | `weekpack_check.mjs` | `applyWeek()` with a custom pack → `Save.data.week` cleaned and stored, `WEEK` updated, Belle and Elsa `buildRounds` include the custom spelling/sight/dictation/vowel content; reset restores `WEEK_DEFAULT`. | P4 |
| T5 | `savecontinuity_check.mjs` | Fixture loads and saves back identical (Node); browser half in `tools/smoke.mjs`. | P0, P6 |
| T6 | `engine_untouched_check.mjs` | SHA-256 of `js/`, `vendor/`, and the 35 tests equals the P0 fixture. | P0 |
| T7 | `bundle_check.mjs` | One copy of each engine module in the bundle, three r160, no CDN/firebase strings, no npm three. | P1 |
| T8 | `buildprecache_check.mjs` | Every file in `_site/starlight-quest/app/` and the entry HTML is in the built `sw.js` precache; all original entries still present; `manifest.webmanifest` byte-equal to source. | P5-B |
| T9 | `gate_check.mjs` | `gateQuestion()` operands in 6–9 over 1,000 seeds; `ParentCorner.tsx` source contains no `Hint:` and no literal answer constant. | P4 |
| T10 | `padroots_check.mjs` | Every modal component's root `className` contains one of `padnav.js`'s `ROOTS` classes (parsed from `js/padnav.js` source), and `App.tsx` calls `startPadNav()` exactly once. | P3 |

Fixtures: `tests/fixtures/save-v1.json`, `tests/fixtures/engine-sha256.json`, `tests/fixtures/baseline.md`.

---

## 8. Cutover and rollback

**Before cutover:** `pre-r4` tag exists (P0.1); P5-A pipeline has deployed `main` unchanged at least once; every §6 row has evidence; Fernando's hardware checks are done.

**Cutover:** Fernando merges the P6 PR (`feat/r4-react-shell` → `main`, normal merge). `pages.yml` builds and deploys. Zoe's devices pick up the shell on next online open because `CACHE_VERSION` changed (the SW's `activate` deletes old `starlight-quest-*` caches, as in every prior round). Haiku verifies the live `sw.js` line 3 and logs it.

**Rollback (any time after cutover):**
1. Open a revert PR: `git revert -m 1 <cutover merge SHA>` on a branch from `main`. Check `git diff pre-r4 HEAD -- starlight-quest/` is empty except `sw.js`, then bump `CACHE_VERSION` in `sw.js` to `v21-<date>` so devices drop the shell cache (the only line that differs from `pre-r4`).
2. Fernando merges it; `pages.yml` deploys the vanilla game (assemble finds no `starlight-quest/package.json`, copies files as-is).
3. Emergency path if Actions itself is broken: Fernando sets Pages source back to "Deploy from a branch: main / (root)".
4. Zoe's progress is safe either way: the save key and schema never changed, no migration exists in either direction, and the vanilla `main.js` reads the same `zoe-starlight-quest-v1` object.

The Argon repo is untouched by every phase. What to do with it later (keep, private, delete) is Fernando's separate call.

---

## 9. Execution rules for the Haiku phase

Fernando's standing rule from round 3, restated for R4:
- A PR may be merged **only** when tests and CI are fully green, it is not a draft, it has no conflicts, and it touches only the files its plan tasks list. Normal merges only. Never force-push.
- This self-merge permission covers phase PRs into `feat/r4-react-shell` (P0–P4, P5-B) **only if Fernando approves this plan with that permission** (Decision 1). P5-A and P6 target `main` and are always merged by Fernando.
- After each merge: log it in the PR log on the R4 Notion page (P0.6), and send Fernando a short note: what changed, the PR link, and the current `CACHE_VERSION` (unchanged until P5-B).
- Leave old draft PRs #15 and #16 alone. Do not rebase, close, or comment on them. Leave PR #113 to Fernando.
- Anything risky stops and comes back to Fernando: any engine byte change, any test edit, any new dependency or version change, any change to `manifest.webmanifest` or the save key, a red gate, a stop condition in a task, or a choice this plan doesn't spell out.
- Max one phase PR open at a time (phases depend on each other). One task = one commit.
- Never push to `main`. Never deploy or modify the Argon repo. No secrets in code. No paid services.
- Every PR body starts with the project attribution block, is assigned to `fernandoceja`, and lists the iPhone checks for its preview.

---

## 10. Decisions for Fernando

1. **React + Vite + npm vs. your round-3 rule.** `docs/HANDOFF-R3-CODEX.md` line 114 says "Plain JS ES modules only: no React, Vite, npm packages or build step," and `starlight-quest/README.md` says "No build step." This port needs all four. Approving this plan replaces that rule for `starlight-quest/` (engine stays plain JS). If you'd rather keep the rule, the alternative is to port only the donor's *look* into `ui.js` by hand, which is a different, larger plan. Also: may Haiku self-merge green phase PRs into the integration branch under the round-3 rule (P5-A and cutover stay yours)?
2. **Dormant `main.js` / `ui.js`.** To keep the 35 tests unmodified, the old controller files stay in the repo after cutover, unused, and 16 tests keep checking their source. OK to leave them, with a later separate round to migrate those checks to the shell (which would edit tests, so it needs your yes)?
3. **Pages switch timing.** P5-A asks you to merge the pipeline and flip Settings → Pages → Source to "GitHub Actions". It can happen any time after P0; earlier means more soak time. Do it at P5 as planned, or right after P0?
4. **Firebase live site.** The Firebase merge deploy (`openclaw-agent-489306`) gets the same build at cutover so it doesn't serve raw source. Keep Firebase deploying on merge, or previews only?
5. **Type checking.** The plan ships without a TypeScript type-check gate (Vite only transpiles; donor uses `strict: false` and TS 7). Fine for R4, or add a `tsc --noEmit` gate later?

---

## Appendix A — Engine contract the shell uses (no engine change)

| Module | Exports used |
|---|---|
| `world.js` | `createWorld(container, hooks)` → `setInputEnabled, setCastleCrown, focus, unfocus, celebrate, setNPCState, setOutfit, setTodayStar, setClockTime, pause, resume, isPaused, getPixelRatio, dispose`; hooks `onNearNPC, onInteractRequest, onPauseRequest, onWorldTap, onGateTap, onSecretTap, treasuresGot, onTreasure` |
| `quests.js` | `PRINCESSES, NPC_ORDER, QUESTS, WEEK, WEEK_DEFAULT, FINALE_LINES, PARENT_CORNER_HTML, SCHOOL_WORDS, buildRounds, setSchoolWords, setWeek, cleanWeek, cleanWordList, revealLines, tileSound, BELLE_CLIP_DIR` |
| `ladder.js` | `landState, recordQuest, today, pickTodayStar` |
| `save.js` | `Save, merge, checkMilestones, MILESTONES, OUTFIT, BUDDY_NEED, sanitizeOutfit` |
| `treasures.js` | `todayKey, collectTreasure, rolloverTreasures, treasuresGotToday, landTreasureCount, TREASURES_PER_LAND, findsTotal, findsToday, TREASURE_LAND_NAMES, awardRowStar, ALL_SECRETS, foundSecret, createSecretTracker, treasureBookModel`, the `*Line` helpers |
| `audio.js` | `SoundFX, Narrator, setLang, installAudioCare, canBypassSilentSwitch, isIOS` |
| `input.js` | `Input` (`init, setJoystick, describeControls, onGamepadChange`) |
| `worldmap.js` | `builtSlotIds, unseenKingdomSlots, shouldRunFinale, openLandIds, BUILT_SLOTS` |
| `padnav.js` | `startPadNav` |
| `shapes.js`, `tally.js`, `portrait-zoe.js` | `shapeSVG`, `tallyCardHtml`, `PORTRAIT_ZOE` |

## Appendix B — The first task

**P0.1** — tag `pre-r4` on `main` and create `feat/r4-react-shell` from it (§5, P0). It touches no files, is fully reversible, and every later phase depends on it.

## 11. Fernando's decisions (Oct 29, 2026)

1. Approved: React + Vite + npm as a scoped exception to the round-3 "plain JS, no build step" rule, for the `starlight-quest/` UI shell only. The engine stays plain JS and byte-untouched (T6). Haiku may self-merge green phase PRs into `feat/r4-react-shell` under the round-3 rule. P5-A and P6 target `main` and stay Fernando's merges.
2. Approved: `main.js` and `ui.js` stay in the repo, dormant, after cutover. Migrating the 16 tests that read them is a later round with its own approval, not part of R4.
3. Changed: P5-A runs right after P0 (pipeline first, for soak time). The P5-A PR creates `starlight-quest/tools/assemble-site.mjs` in copy-only mode; P1.6 extends it with the build step. Fernando merges P5-A and switches Settings → Pages → Source to "GitHub Actions".
4. Approved: the Firebase merge deploy stays, with the build step added as planned. Previews are unchanged.
5. Approved: no TypeScript type-check gate in R4.
