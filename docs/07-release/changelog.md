# Changelog

## 2026-05-08 P4 Release Candidate Packaging

- Packaged Platform v2 debug/internal release candidate with final evidence index and checksum.
- RC APK: `albago-platform-v2-rc-debug.apk` (SHA256: `7B2AE2ABA4DF0DD3E53509854D4EA29604A3A4C178D24695DE3B438BA709A712`).
- RC physical smoke test passed on device cffbc068 (M2007J3SI, Android 12).
- Final verification: backend build/tests (32/32), admin build, Android unit tests, Android APK build — all PASS.
- npm audit triaged: 5 findings classified as accepted non-blocking.
- Working tree reviewed; unrelated .agent/ files excluded from auto-commit.
- Evidence index created linking all P0-P4 verification artifacts.
- Documentation finalized: README, release-checklist, known-issues, changelog.

## 2026-05-08 P3 Admin Publish QA & Remote Scene Play

- Verified admin/backend remote Scene Play publish path to Android runtime without app rebuild.
- Created `scripts/p3-publish-scene-play.ps1` for repeatable end-to-end publish QA.
- Fixed Android legacy pipeline to parse `sceneConfig` and `interactionRules` from remote definitions.
- Added backend tests for SCENE_PLAY publish validation (minimal valid, missing objects, empty objects).
- Added Android tests for V3 parser scene object fields, successMessage, malformed input, and fallback game playability.
- Published game `p3_scene_play_deve_cuce_20260508-163452` verified in active definitions and Android runtime.
- Backend tests: 32/32 pass. Android compilation, unit tests, and APK assembly pass.

## 2026-05-08 platform v2 demo-acceptance gate

- P0 deterministic verification was re-run through `scripts/verify-platform-v2.ps1`.
- Backend Prisma generate, backend build, backend tests, admin production build, Android `:core_runtime:testDebugUnitTest`, Android `:app:testDebugUnitTest` and Android `:app:assembleDebug` all passed.
- The verification script now seeds the Gradle wrapper distribution into `C:\gradle-cache` from the existing user Gradle cache when available, preserving the deterministic Gradle worker path.
- P1 physical-device acceptance initially blocked because `adb devices` returned no attached device on 2026-05-08, then passed after device `cffbc068` became visible through ADB.
- Sprint 5 log was created with P0 evidence and P1 blocker status.
- P1.1 device recovery was re-run on branch `platform-v2`; `adb devices -l` stayed empty after ADB server restart and optional `adb.exe` task restart, so a blocked acceptance summary was generated.
- Added P1 physical-device preflight and acceptance readiness tooling.
- Added Android crash log scanner for acceptance logs.
- Documented Android SDK path normalization: existing `ANDROID_SDK_ROOT`, existing `ANDROID_HOME`, `%LOCALAPPDATA%\Android\Sdk`, then `C:\Android\Sdk`.
- Kept P1 gated until a physical Android device became visible through ADB.
- Added the P1 phone-connected runbook plus working-tree inventory/change-set handoff artifacts for the no-device hold state.
- Captured P1 physical Android demo acceptance evidence for Fruit Slash, Dodge Run and Fit Challenge on device `cffbc068`.
- Verified physical-device cold launch and demo logs have no fatal crash signatures.
- Added P2 completed-game session result persistence through `POST /v1/game-sessions`.
- Added idempotent backend handling by `clientSessionId` and repository-backed Prisma storage.
- Added Android completed-game result sync with local result preservation on backend/network failure.
- Updated OpenAPI and release docs for game-session result submission.
- Revalidated backend/admin/Android P2 build and test gates.

## 2026-04-26

- Monorepo scaffold was established for Android, backend, admin, docs, OpenAPI and infra.
- Android multi-module foundation, backend module scaffold and initial admin dashboard were added.
- OpenAPI baseline and ADR set were created.
- Backend build, backend tests and admin production build were verified.

## 2026-04-26 Sprint 2 update

- Android Gradle wrapper was added and `android/gradlew.bat assembleDebug` started succeeding locally.
- Android app moved from placeholder shell to live CameraX plus MediaPipe pose pipeline.
- Motion coordinator routed `PoseFrame -> MotionDetector -> MotionEvent -> Workout/Game`.
- `SQUAT` and `JUMPING_JACK` were wired into workout and `TARGET_HIT`; `JUMP_ROPE` remained prototype-only.
- Backend game-definition endpoints were extended for active-game fetch plus internal draft, update, validation, publish and rollback flows.
- Admin panel gained a real Target Hit draft editor with validation, publish, rollback and audit log visibility.

## 2026-04-26 Sprint 3 update

- Product name was updated from `Alba` to `AlbaGo` across visible app, admin, API and documentation surfaces.
- Android Motion Lab gained a debug-only QA panel with backend base URL override, retry sync control and richer live state visibility.
- Workout and game session creation now use stable `clientSessionKey` values for idempotent backend session creation.
- Android now caches the last published active game definition and queues failed workout/game result sync payloads for retry.
- Squat and jumping jack detectors were retuned with stricter state machines, duration gates and richer event metadata.
- Jump rope detector was upgraded from placeholder behavior to a baseline-calibrated first prototype.
- Backend now exposes Prisma-based persistence scaffolding and hybrid repository support for game definitions and audit logs.
- Backend listens on `0.0.0.0` for easier physical-device and LAN testing.
- `assembleDebug`, backend build/test and admin build passed again after Sprint 3 changes.
- A physical Android device was detected, `app-debug.apk` was installed over `adb`, `adb reverse tcp:3000 tcp:3000` succeeded and AlbaGo was cold-launched from `adb shell am start`.
- Full camera, pose, motion and gameplay acceptance on device remains a manual QA follow-up item.

## 2026-04-26 Sprint 4 update

- Android home surface was redesigned around an `arcade sport` presentation layer.
- Game catalog now exposes exactly 3 public demo games: `FRUIT_SLASH`, `DODGE_RUN` and `FIT_CHALLENGE`.
- `GameRuntime` was expanded to template-specific scene engines, combo tracking, accuracy and structured game session results.
- Android game state now tracks per-game motion counts, active template and richer QA metadata.
- QA panel gained config refresh, motion log clear and overlay toggle actions.
- Backend game definitions were expanded with template-aware `config` and `tasks` data.
- Publish validation now enforces template-specific rules for Sprint 4 demo games.
- Prisma schema and seed were extended for `configJson`, `taskRulesJson` and structured result payload support.
- Admin dashboard now reads live game and audit data instead of static mock data.
- Admin game editor now supports multiple templates and public demo game drafts.
- `android\\gradlew.bat assembleDebug` passed after Sprint 4 Android UI and runtime changes.
- Physical-device evidence was refreshed with new AlbaGo home and Motion Lab screenshots captured on `2026-04-26`.

## 2026-05-03 experience update

- The `/stitch_a_l_ekran_splash` reference screens were reviewed and adapted into the AlbaGo mobile direction.
- Android game flow was stabilized into `catalog -> detail/prep -> active session -> result`.
- Game catalog no longer opens with the camera preview by default; camera now appears during active gameplay.
- A game detail/prep screen was added with instructions, supported motions, duration, difficulty and camera-placement guidance.
- Debug QA panel gained mock motion controls for `SQUAT`, `JUMPING_JACK`, `JUMP_ROPE`, `BAD_FORM` and `USER_OUT_OF_FRAME`.
- Game result payloads now use game-session motion counts instead of relying on the workout session summary.
- `android\\gradlew.bat assembleDebug` passed after the design and flow changes.

## 2026-05-03 catalog crash hardening

- Fixed the likely catalog-button crash path by removing nested vertical scrolling from the game content surface.
- Replaced unsafe catalog/detail/HUD `levels.first()` access with safe empty/invalid game states.
- Hardened remote active-game parsing so unknown enum values or invalid rules are skipped instead of crashing catalog load.
- Hardened cached game parsing with safe enum parsing and optional field handling.
- `GameRuntime` now uses a safe fallback level if an invalid definition reaches runtime.
- Home and catalog copy were tightened toward the AlbaGo arcade-sport product direction; visible debug/backend text was removed from user-facing game catalog cards.
- `android\\gradlew.bat :app:assembleDebug` passed with Android Studio JBR 21 and explicit Android SDK env vars.
- Physical device `cffbc068` was detected, the debug APK was installed, `adb reverse tcp:3000 tcp:3000` succeeded and cold launch completed with no `AndroidRuntime` crash in the captured log.
- Catalog button automation remained blocked by the device OS `INJECT_EVENTS` restriction, so human touch/mirroring validation and demo video capture were pending at that time. P1 demo videos were later captured on 2026-05-08 with QA direct launch extras.

## 2026-05-04 design/game camera pass

- Active game sessions now render the CameraX preview as a full-screen play surface instead of the previous fixed-height half-screen camera card.
- A new immersive game overlay was added for score, time, combo, active motion, scene summary and finish/home actions.
- Home screen cards were tightened toward the referenced dark arcade-sport direction: compact goal cards, high-contrast dark surfaces and shorter CTA labels.
- Debug-only launch extras were added for QA: `albago.startDestination`, `albago.autostartGameId` and `albago.mockRep`.
- `FRUIT_SLASH` and `DODGE_RUN` now score on valid mock/real reps even when no target/obstacle is currently visible, making demos testable and playable from an empty scene.
- `android\\gradlew.bat clean :app:assembleDebug` passed, APK install passed on physical device `cffbc068`, and full-screen game screenshots were captured.

## 2026-05-04 visible game object pass

- Fruit Slash now renders visible fruit, bonus and penalty targets over the full-screen camera preview.
- Fruit Slash starts with immediate visible targets before the first timed spawn, so the player can see what to slice as soon as the game opens.
- Dodge Run now renders a runner avatar and visible obstacle cards from runtime scene state.
- Fit Challenge now renders a central active-task progress card from runtime scene state.
- `android\\gradlew.bat :app:assembleDebug` passed after the visible scene object changes.
- Physical device `cffbc068` installed the updated APK and screenshots were captured for Fruit Slash, Dodge Run and Fit Challenge object layers.

## 2026-05-04 Fruit Slash interaction pass

- Fruit Slash now cuts visible targets from camera-pose contact using wrist, index and thumb keypoints.
- Runtime scoring now honors a `targetId` metadata path so a specific visible target can be removed instead of only scoring generic reps.
- Fruit Slash hand contact can remain interactive with upper-body pose visibility, while stricter full-body requirements remain important for squat/fitness flows.
- Physical device `cffbc068` installed the updated APK; `artifacts/screenshots/albago-fruit-contact-ready.png` shows score and sliced count changing from camera interaction.

## 2026-05-05 admin-driven game system v1

- Remote game definition v2 added `orientation`, `cameraRequirement`, typed `assets.items[]`, `sceneConfig` and `interactionRules`.
- Backend gained `POST /v1/internal/assets` for PNG/WebP/sanitized SVG uploads and `GET /v1/assets/{assetId}` static serving.
- Prisma schema and migration now persist game orientation, camera requirement, scene config and interaction rules.
- Seeded Fruit Slash, Dodge Run and Fit Challenge definitions were upgraded with typed asset manifests and template-safe scene/interaction config.
- Admin game console now supports orientation, camera requirement, typed asset upload/listing, template config tuning and mobile payload preview.
- Android parses v2 game definitions, applies per-game landscape/portrait orientation during active play and resolves remote asset URLs with placeholder fallback.
- Verification passed: backend build/test, admin production build and Android `:app:assembleDebug --no-daemon --stacktrace`.

## 2026-05-06 scene-rule engine direction

- Added `SCENE_PLAY`, a generic no-code scene/rule template for command games and simple object games.
- Seeded `Deve Cuce` as the first `SCENE_PLAY` example so kids' prompt games can be published without a dedicated native template.
- Admin game console now exposes a Scene Play builder with editable scene objects: label, asset key, required motion, points and lifetime.
- Backend publish validation now accepts `SCENE_PLAY` and requires scene objects plus scoring interactions.
- Android runtime can spawn generic Scene Play objects and clear them with matching MotionEvent rules.
- Android catalog/session UI can display Scene Play prompt cards and score/life/miss state.
- Verification passed: backend build/test, admin production build, targeted Android Kotlin compile, and `:app:assembleDebug` with Android Studio JBR 21 plus `--% -Dkotlin.compiler.execution.strategy=in-process`.

## 2026-05-06 category and program-flow pass

- Added admin-facing game categories: `SPORT`, `FUN` and `EDUCATION`.
- Active game definitions now expose `category`, `tags` and level-level `programSteps` for playlist-like sport programs.
- Seeded Fit Challenge now describes a multi-step sport program: squat reps, jumping jack reps, jump rope reps and a plank/hold step.
- Admin console gained category filtering/editing and a Program / Playlist Flow builder for rep targets, hold-pose blocks, rest blocks and instruction steps.
- Android parses category and program metadata, filters the game catalog by category and shows the planned program flow on the prep screen.
- OpenAPI and remote game definition docs were updated for category and program-step fields.
- Verification passed: backend build/test, admin production build, targeted Android Kotlin compile and `:app:assembleDebug`.
