# Remote Game Definition Schema

AlbaGo Sprint 4 keeps game definitions data-driven and template-limited.

## Required top-level fields

- `id`
- `gameKey`
- `version`
- `template`
- `title`
- `description`
- `status`
- `minAppVersion`
- `category`: `SPORT`, `FUN` or `EDUCATION`
- `tags`: lightweight catalog/search labels
- `orientation`
- `cameraRequirement`
- `supportedMotions`
- `levels`
- `assets`

## V2 admin-driven fields

- `orientation`: `PORTRAIT` or `LANDSCAPE`. Android applies this only during the active game session and returns the shell to portrait after the game.
- `cameraRequirement`: `FULL_BODY`, `UPPER_BODY` or `HAND_TARGET`. This lets the prep/readiness layer explain whether the user needs full body, upper body or hand-target framing.
- `assets.items[]`: typed asset manifest entries with `key`, `kind`, `format`, `uri`, `mimeType`, optional dimensions, `sha256` and byte size.
- `levels[*].sceneConfig`: template-safe scene configuration such as lane count, object lifetime, hit radius, obstacle travel speed or task card style.
- `levels[*].interactionRules`: whitelisted input/action rules. The app never executes remote code.
- `levels[*].programSteps`: playlist-style steps for sport or learning flows, for example rep targets, plank/hold blocks, rest blocks and instruction cards.

## Supported templates

- `FRUIT_SLASH`
- `DODGE_RUN`
- `FIT_CHALLENGE`
- `SCENE_PLAY`
- `TARGET_HIT` (internal/debug)
- `ENDLESS_RUNNER` (internal/debug)

## Level fields

- `levelId`
- `durationSec`
- `targetScore`
- `difficulty`
- `motionRules`
- `rewardRules`
- `config`
- `sceneConfig`
- `interactionRules`
- `tasks` for `FIT_CHALLENGE`
- `programSteps` for guided programs and playlists
- `sceneConfig.objects[]` for `SCENE_PLAY`

## Program step fields

- `stepId`
- `type`: `PLAY_GAME`, `MOTION_REPS`, `HOLD_POSE`, `REST` or `INSTRUCTION`
- `title`
- `description`
- `motion`: optional motion target for rep-based steps
- `targetCount`: required for rep targets
- `holdSec`: used for plank/hold steps
- `durationSec`: used for play/rest/instruction steps
- `successMessage`
- `nextOnComplete`: whether AlbaGo should guide the user to the next playlist item

## Supported actions

- `ADD_SCORE`
- `REMOVE_OBJECT`
- `RESET_COMBO`
- `DECREASE_LIFE`
- `PROGRESS_TASK`
- `PAUSE_GAME`
- `SHOW_EFFECT`
- `COMPLETE_LEVEL`

## Sprint 4 validation rules

- `FRUIT_SLASH`
  - requires `config.spawnRateMs`
  - requires `sceneConfig.defaultHitRadius`
  - requires at least one scoring rule
- `DODGE_RUN`
  - requires `config.lives`
  - requires `config.obstacleSpawnMs`
  - requires `sceneConfig.travelMs`
- `FIT_CHALLENGE`
  - requires a non-empty `tasks` list
  - task motions must match supported motions
- `SCENE_PLAY`
  - requires `config.spawnRateMs`
  - requires non-empty `sceneConfig.objects[]`
  - requires at least one scoring interaction

## Mobile behavior

- Android reads duration, score rules and template config directly from the published definition.
- Android renders visible scene objects from the chosen shipped template:
  - `FRUIT_SLASH` renders targets from spawn/rule config.
  - `DODGE_RUN` renders obstacles from lives/spawn/damage config.
  - `FIT_CHALLENGE` renders task cards from `tasks`.
  - `SCENE_PLAY` renders generic prompt/object cards from `sceneConfig.objects[]` and clears them with matching `MotionEvent` rules.
- `FRUIT_SLASH` also supports camera-pose contact. Wrist/index/thumb keypoints can cut visible targets, while scoring still comes from the published motion rules.
- Uploaded PNG/WebP/SVG assets can replace template object visuals through `assets.items[]`; local `local://` assets remain safe demo fallbacks.
- Android resolves assets cache-first through its image loader. If an uploaded asset is missing or invalid, the native template shows a placeholder object instead of crashing.
- Published definitions are cached locally.
- Debug-only local fallback definitions exist only to protect local QA when the backend is unavailable.
- No arbitrary code or script is executed on device.
- Invalid or unavailable remote content leads to cached/fallback content or an empty-state card, not an app crash.
- Unknown `template`, `motion`, `event`, `status` or cached rule-action enum values are skipped on Android.
- Definitions with no playable level or no scoring rules are filtered out before catalog rendering.
- The user-facing flow presents a prep screen before starting camera-backed gameplay.

## Remote update boundary

Admin can create or update many games without an app release as long as each game uses a shipped runtime capability. For example, new Fruit Slash variants can change title, duration, point values, spawn timing, penalty settings and asset references remotely. New simple command/object games, such as Deve Cuce, should use `SCENE_PLAY` instead of a dedicated native template.

Admin can also categorize content as sport, fun or education and chain steps into a lightweight playlist. This supports sport programs such as `Squat set -> Plank hold -> Rest -> Next activity` without a new Android release, as long as each step uses supported motion/hold/runtime primitives.

Admin cannot safely ship a completely new native mechanic by sending arbitrary code to the app. If AlbaGo needs a brand-new mechanic that is not expressible by `SCENE_PLAY`, `FRUIT_SLASH`, `DODGE_RUN` or `FIT_CHALLENGE`, Android must first ship a new runtime capability.
