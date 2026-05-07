# Mobile Architecture

AlbaGo Android client is now a multi-surface demo app built around a real camera-to-motion-to-game loop.

## Modules

- `app`: Compose shell, home surface, Motion Lab, workout/game containers and debug QA access
- `core_camera`: CameraX preview plus image-analysis stream
- `core_pose`: MediaPipe Pose adapter and `PoseFrame` mapping
- `core_motion`: detector contracts and state-machine-based motion counting
- `core_runtime`: multi-template game runtime and scene-state engines
- `core_data`: motion coordinator, QA storage, workout engine, retry queue and active game fetch/cache logic
- `core_network`: Retrofit client and backend DTOs
- `feature_workout`: workout summary and control panels
- `feature_games`: 3-game public demo catalog and session/result surfaces

## Live pipeline

`PreviewView + ImageAnalysis -> MediaPipe Pose -> PoseFrame -> MotionDetector(s) -> MotionEvent(s) -> WorkoutSessionEngine / GameRuntime -> Compose UI`

## Sprint 4 mobile decisions

- Visible catalog contains only `FRUIT_SLASH`, `DODGE_RUN` and `FIT_CHALLENGE`.
- `TARGET_HIT` remains a debug/regression template and is excluded from the public catalog.
- Game UX now follows `catalog -> detail/prep -> active session -> result`.
- The camera preview is not shown on catalog/detail screens; it appears when gameplay or Motion Lab needs it.
- Active game resolution order is:
  - published remote definitions
  - cached published definitions
  - debug-only local fallback definitions
- Catalog rendering is defensive:
  - invalid remote/cache enum values are skipped
  - games without playable levels are filtered out
  - the catalog shows loading, empty, error or offline fallback copy instead of crashing
- When a game is active, all supported detectors for that game are evaluated on the same frame stream.
- Debug HUD is hidden by default and only shown when the QA panel is expanded.
- Pose overlay can be toggled at runtime from the debug QA panel.
- QA panel can inject mock motion events so games can be tested without repeated physical movement.
- Active game orientation is now remote-driven. Android reads `GameDefinition.orientation`, applies landscape or portrait during the active session and returns the shell to portrait after gameplay.
- Android parses `cameraRequirement` so prep/readiness UI can guide `FULL_BODY`, `UPPER_BODY` and `HAND_TARGET` framing.
- Android parses typed `assets.items[]` and resolves uploaded PNG/WebP/SVG asset URLs with a native placeholder fallback.
- Android parses `sceneConfig` and `interactionRules` as safe template inputs; it still does not execute remote code.
- Android parses `category`, `tags` and `programSteps` so the catalog can be grouped as sport/fun/education and the prep screen can explain playlist-like activity flows.
- `programSteps` are presentation and guidance metadata in this pass; scoring still comes from `MotionEvent`, task rules and template runtime state.

## Device validation status

On `2026-04-26`, the Android build was revalidated, installed to a real device, cold-launched and visually confirmed with fresh screenshots. Full human-driven motion walkthrough remains a QA follow-up task.

On `2026-05-03`, catalog crash hardening was implemented and `:app:assembleDebug` passed with Android Studio JBR 21. Device `cffbc068` installed and cold-launched the APK with no `AndroidRuntime` crash captured after launch; manual catalog interaction remains pending because OS input injection blocks `adb shell input tap`.

On `2026-05-05`, `:app:assembleDebug --no-daemon --stacktrace` passed after adding remote orientation, typed asset parsing and Android asset URL resolution.

On `2026-05-06`, targeted Android Kotlin compile and `:app:assembleDebug` passed after adding category filtering and program-step parsing/display for game prep.
