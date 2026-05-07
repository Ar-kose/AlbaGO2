# Game Runtime Architecture

AlbaGo Sprint 4 ships a shared native runtime that can present multiple game types from the same `MotionEvent` stream.

## Shared runtime contract

`MotionEvent -> GameRuntime -> Template Engine -> Scene State -> HUD / Result -> GameSessionResult`

## User flow

`Catalog -> Detail / Prep -> Active Session -> Result`

The detail/prep step exists so the user can read the rules, see supported motions and place the camera before gameplay starts.

## Public templates

- `FRUIT_SLASH`
- `DODGE_RUN`
- `FIT_CHALLENGE`

## Internal compatibility templates

- `TARGET_HIT`
- `ENDLESS_RUNNER`

These are preserved for regression coverage but are not shown in the public demo catalog.

## Runtime responsibilities

- session start, tick, pause, resume and finish
- score and combo tracking
- accuracy calculation
- category metadata for catalog filtering (`SPORT`, `FUN`, `EDUCATION`)
- playlist/program-step metadata for guided sport flows
- template-specific scene updates
- template-specific visible object state for the camera overlay
- structured result creation for backend sync

## Template behaviors

- `FRUIT_SLASH`: timed target spawning, motion-based slicing, combo reset on `BAD_FORM`
- `DODGE_RUN`: obstacle prompts, lives, distance and pause-on-out-of-frame behavior
- `FIT_CHALLENGE`: sequential task progression, quality score and task completion flow

## Admin-driven game creation boundary

AlbaGo supports adding and updating games from the admin panel without an app update when the new game uses a template already shipped in the Android app.

For Sprint 4 that means the admin can publish new or edited variants of:

- `FRUIT_SLASH`: title, description, duration, target score, scoring rules, spawn rate, penalty behavior and local/remote asset references
- `DODGE_RUN`: title, description, duration, scoring rules, lives, obstacle spawn timing, miss damage and asset references
- `FIT_CHALLENGE`: title, description, duration, task sequence, target counts, points per rep, quality options and asset references

The mobile app does not download arbitrary native code or execute remote scripts. A completely new mechanic still requires adding a new native template to the app, unless a future generic scene/action interpreter is implemented.

## Sprint 4 fetch behavior

`published remote definitions -> cached published definitions -> debug-only local fallback`

Invalid or unsupported content is handled before runtime:

- unknown enum values are skipped during remote/cache parsing
- unsupported templates are excluded from the public catalog
- definitions without a playable level or motion rule are not shown as startable cards
- runtime has a safe fallback level as a last-resort guard, but catalog validation should prevent invalid games from reaching active play

## Result payload

Every finished game now produces a shared structured result containing:

- `gameId`
- `gameVersion`
- `score`
- `durationSec`
- `motionCounts`
- `comboMax`
- `accuracy`
- `startedAt`
- `endedAt`
- `clientSessionKey`

## QA support

Debug builds can inject mock `REP_COUNTED`, `BAD_FORM` and `USER_OUT_OF_FRAME` events. This keeps game tuning fast when physical movement testing is too slow.

## 2026-05-04 play-surface update

Active sessions now use a full-screen camera play surface instead of embedding camera preview in a fixed-height card. The runtime state is rendered through an overlay HUD:

- top HUD: game title, prompt, score, remaining time and combo
- center camera: CameraX preview, optional pose overlay and visible game objects generated from scene state
- bottom HUD: template-specific scene summary, active motion, accuracy and finish/home controls

Debug-only launch extras allow QA to bypass blocked ADB touch injection:

- `albago.startDestination=GAMES`
- `albago.autostartGameId=fruit_slash_demo|dodge_run_demo|fit_challenge_demo`
- `albago.mockRep=SQUAT|JUMPING_JACK|JUMP_ROPE`

## 2026-05-04 visible object layer

The active play surface now renders scene objects, not only score state:

- `FruitSlashSceneState.targets` becomes visible fruit, bonus and penalty targets.
- `DodgeRunSceneState.obstacles` becomes visible obstacle cards moving across the play area.
- `FitChallengeSceneState.tasks` becomes a visible active task card with progress.

This keeps the runtime data-driven: remote/admin definitions choose the template and tune rules/config, while Android's shipped template engine turns that definition into safe native UI.

## 2026-05-04 camera contact interaction

Fruit Slash now has two interaction paths:

- full-body motion cycle events from `SQUAT` and `JUMPING_JACK` detectors
- direct pose contact events when wrist/index/thumb keypoints overlap visible fruit targets

Direct contact events carry `targetId` metadata and are resolved by the runtime against the current `FruitSlashSceneState.targets` list. This makes the game feel like an actual camera game while keeping the remote system safe: admin still changes config/rules/assets, and Android's shipped template engine owns the collision behavior.

## 2026-05-05 admin-driven game system v1

Game definitions now use the v2 no-code template model:

- top-level `orientation` chooses portrait or landscape per game
- top-level `cameraRequirement` describes the framing needed before play
- typed `assets.items[]` replaces one-off string asset references while preserving old `background` / `character` compatibility
- `sceneConfig` controls native scene object behavior inside the shipped template
- `interactionRules` maps safe inputs to whitelisted actions

The Android app still does not execute remote JavaScript, Lua or native code. Remote config can change visuals, duration, points, object lifetime, hit radius, spawn timing, lives and task rules inside existing templates. A completely new mechanic still requires a new native template.

Runtime orientation is session-scoped. The manifest no longer hard-locks `MainActivity` to portrait; active game sessions apply the published orientation, and the app shell returns to portrait when gameplay ends or pauses back to the catalog.

Asset loading is resilient:

- `local://` assets use native placeholder visuals
- `/v1/assets/{assetId}` and full `https://` URLs are resolved by the Android image loader
- PNG, WebP and sanitized SVG are supported by the backend upload path
- missing assets show placeholders instead of crashing the game

The first admin-driven acceptance path is:

`Admin creates Fruit Slash variant -> uploads fruit/bomb assets -> selects landscape -> publishes -> Android refreshes config -> variant appears without app update -> game opens landscape -> camera/motion/pose interaction scores against visible objects`.

## 2026-05-06 category and program-flow model

Game definitions now separate content discovery from runtime mechanics:

- `category` lets the admin place a game under `SPORT`, `FUN` or `EDUCATION`.
- `tags` provide lightweight grouping/search hints.
- `programSteps` let a level behave like a playlist or sport program instead of one isolated mini-game.

Program steps are intentionally declarative. Examples:

- `MOTION_REPS`: complete 10 squats, then move to the next activity.
- `HOLD_POSE`: hold a plank position for 30 seconds.
- `REST`: show a rest countdown before the next block.
- `INSTRUCTION`: show a coaching card.
- `PLAY_GAME`: run the current game scene for a duration.

This does not mean Android can run arbitrary new code. It means the shipped template/runtime can combine known motion primitives, scene rules and guided steps into many more admin-created experiences.
