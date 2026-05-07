# Admin-Driven Game System V1

## Goal

AlbaGo should allow new playable game variations without shipping a new Android build, as long as the variation uses an already shipped native runtime capability.

The supported model is:

`No-code scene + motion rules + typed assets + safe interaction actions`

Sprint 4.1 adds `SCENE_PLAY`, a generic scene/rule runtime for command games and simple object games. This is the first step away from writing a separate native template for every idea.

Sprint 4.2 adds content organization and guided programs:

`category + tags + program steps`

This lets admin separate `Spor`, `Eglence` and `Egitim` content and define playlist-like flows such as `Squat set -> Plank hold -> Rest -> Next activity`.

## What Admin Can Change

- game title and description
- template: `SCENE_PLAY`, `FRUIT_SLASH`, `DODGE_RUN`, `FIT_CHALLENGE`
- category: `SPORT`, `FUN`, `EDUCATION`
- tags for catalog grouping/search
- orientation: `PORTRAIT` or `LANDSCAPE`
- camera requirement: `FULL_BODY`, `UPPER_BODY`, `HAND_TARGET`
- duration and target score
- points and cooldown values
- scene config such as hit radius, spawn rate, object lifetime, lives and travel speed
- task rules for `FIT_CHALLENGE`
- program/playlist steps: motion reps, hold-pose blocks, rest blocks, instructions and play-game blocks
- scene object rows for `SCENE_PLAY`, including label, asset key, required motion, points and lifetime
- PNG, WebP and sanitized SVG assets
- publish, rollback and archive state

## What Still Requires Android Work

- a completely new game mechanic
- a new camera or pose model integration
- new native collision behavior that cannot be expressed by existing template config
- arbitrary scripting

Adding a brand-new exercise detector, such as push-up, still needs a detector implementation unless it can be expressed later through a generic pose-condition detector. Adding a new game scenario, such as Deve Cuce, should not need a new app build when it fits `SCENE_PLAY`.

Remote JavaScript, Lua or native code is intentionally not supported.

## Asset Flow

1. Admin uploads a PNG, WebP or SVG through `POST /v1/internal/assets`.
2. Backend validates size and MIME type; SVG content is rejected if it contains scripts, event handlers or `javascript:`.
3. Backend stores the file under local dev storage and returns a manifest item.
4. Admin attaches the manifest item to `assets.items[]`.
5. Android resolves the asset URI at runtime.
6. If the asset cannot load, Android shows a native placeholder instead of crashing.

## Orientation Flow

1. Admin selects `PORTRAIT` or `LANDSCAPE`.
2. Android catalog/detail remains normal app shell.
3. When the game session starts, Android applies the game orientation.
4. When gameplay ends or exits back to shell, Android returns to portrait.

## First Acceptance Scenario

1. Create a new Fruit Slash variation in admin.
2. Upload fruit and bomb assets.
3. Select `LANDSCAPE`.
4. Change points, duration and spawn timing.
5. Publish the game.
6. Refresh Android game config.
7. Confirm the game appears without app update.
8. Start the game and confirm it opens landscape.
9. Confirm visible objects use the uploaded assets or safe placeholders.
10. Confirm camera/motion interaction updates score and result payload.

## Scene Play Acceptance Scenario

1. Create a `SCENE_PLAY` game named `Deve Cuce`.
2. Add two scene objects:
   - `Cuce`, required motion `SQUAT`, asset key `cuceCard`, points `10`.
   - `Deve`, required motion `JUMPING_JACK`, asset key `deveCard`, points `12`.
3. Upload or select card assets.
4. Publish the game.
5. Refresh Android game config.
6. Confirm the game appears without app update.
7. Start the game and confirm each prompt is cleared by the matching MotionEvent.

## Sport Program Acceptance Scenario

1. Create or edit a `FIT_CHALLENGE` game.
2. Set category to `SPORT`.
3. Add program steps:
   - `Squat seti`, type `MOTION_REPS`, motion `SQUAT`, target `10`.
   - `Plank tutusu`, type `HOLD_POSE`, hold `30` seconds.
   - `Dinlenme`, type `REST`, duration `20` seconds.
4. Publish the game.
5. Refresh Android game config.
6. Confirm the catalog can filter the game under `Spor`.
7. Confirm the prep screen shows the program/playlist flow.

## Known Follow-Ups

- Store upload metadata in the database instead of only serving file bytes from local storage.
- Add S3-compatible storage implementation for production.
- Add explicit asset cache invalidation and versioning.
- Expand camera readiness UI for `FULL_BODY`, `UPPER_BODY` and `HAND_TARGET`.
- Implement Android program runner execution for hold-pose timers, rest timers and automatic next-activity transitions.
- Add new motion primitives such as `PLANK`, `PUSH_UP` and `LUNGE` when detector quality is ready.
