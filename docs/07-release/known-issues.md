# Known Issues

## Resolved in code: Demo oyunları keşfet / Kataloğu aç crash

Sebep:

- Game catalog flow had nested vertical scrolling between the game shell and game content surface.
- Catalog/detail/HUD code assumed every remote or cached `GameDefinition` had at least one level via `levels.first()`.
- Remote and cached game parsing used unsafe enum `valueOf(...)`, so unknown template, motion, event or status values could abort catalog loading.

Çözüm:

- Game content no longer adds a second vertical scroll inside the already scrollable game shell.
- Game detail, catalog cards, HUD and runtime now tolerate missing/invalid levels and show a safe unavailable state instead of crashing.
- Remote and cached game definitions now use safe enum parsing; invalid definitions/rules/tasks are skipped and the app falls back to cached or local demo games when possible.

Test edilen cihaz:

- `2026-05-03`: physical device `cffbc068` was detected, debug APK installed successfully, `adb reverse tcp:3000 tcp:3000` succeeded and the app cold-launched without an `AndroidRuntime` crash.
- Catalog button interaction could not be automated because the device blocks `adb shell input tap` with `INJECT_EVENTS`; human touch/mirroring validation is still needed.

Test edilen emulator:

- Not run in this pass.

Kanıt videosu/screenshot:

- Original catalog-button video proof was pending manual interaction; P1 demo videos were later captured on 2026-05-08 with QA direct launch extras.
- Build proof: `android\\gradlew.bat :app:assembleDebug` passed on `2026-05-03` with Android Studio JBR 21 and Android SDK env vars.
- Launch/crash proof: `artifacts/crash-reports/catalog-crash-after-fix.log` and `artifacts/albago-after-fix-home.png`.

- Physical Android device detection, APK install, cold launch and P1 demo video capture are now confirmed; full catalog tap walkthrough still needs human touch or mirroring validation if required.
- Android unit tests now pass on this machine when `GRADLE_USER_HOME=C:\gradle-cache` is used; keep this environment override for repeatable verification.
- `JUMP_ROPE` detector is still prototype quality and is not a sprint gate.
- Prisma persistence is now active for game definitions, levels, audit logs and completed game session result submissions. Workout session persistence remains a future scope.
- Android debug builds on this Windows path require `android.overridePathCheck=true` because the workspace folder contains non-ASCII characters.
- This machine does not currently have JDK 17 installed; debug builds were revalidated with Android Studio JBR 21 plus explicit `JAVA_HOME` and `ANDROID_SDK_ROOT`.
- The default shell Java is Java 26 on `2026-05-03`; Gradle/Kotlin fails with `JavaVersion.parse(26)` unless `JAVA_HOME` is pointed to Android Studio JBR 21.
- Direct `adb shell input tap` automation is blocked on the connected device by OS input-injection restrictions, so human interaction remains necessary for full demo walkthrough capture.
- On `2026-05-03`, device-side automated taps were still blocked by OS input-injection restrictions, so catalog button interaction required manual interaction. P1 demo video capture later used QA direct launch extras successfully.

## 2026-05-04 update: Full-screen game camera and mock scoring

Sebep:

- Active game sessions previously reused the same fixed-height `MotionCameraStage` used by Motion Lab, so the camera looked like a half-screen panel instead of a real game surface.
- Fruit Slash and Dodge Run were too strict for demo QA because a valid mock/real rep did not score if the runtime scene happened to have no matching target or obstacle at that exact moment.

Çözüm:

- Active game sessions now use `MotionCameraStage(modifier = Modifier.fillMaxSize(), rounded = false)` with an immersive HUD overlay.
- Fruit Slash now awards an instant fruit-slice score when a valid rep arrives on an empty scene.
- Dodge Run now awards rhythm/energy progress when a valid rep arrives before the next obstacle is present.
- Debug-only launch extras allow direct catalog/game startup and mock rep injection when device input automation is blocked.

Test edilen cihaz:

- `2026-05-04`: physical device `cffbc068`, clean debug APK install succeeded.
- `Fruit Slash`: debug autostart + mock `JUMPING_JACK` produced score `15`, combo `x1`, full-screen camera and HUD screenshot.
- `Fit Challenge`: debug autostart + mock/visible pose state showed score `7`, `1/10` task progress and skeleton overlay on the full-screen camera.
- `Dodge Run`: debug autostart + mock `JUMP_ROPE` produced score `3`; it can finish quickly when obstacle misses drain lives, so tuning remains recommended.

Test edilen emulator:

- AVD `AlbaGoApi35` exists, but it did not reach ready state in the timed boot attempt and appeared as `offline`; physical-device testing was used instead.

Kanıt videosu/screenshot:

- `artifacts/screenshots/albago-redesign-home2.png`
- `artifacts/screenshots/albago-autostart-game.png`
- `artifacts/screenshots/albago-game-mock-score-clean2.png`
- `artifacts/screenshots/albago-fit-mock.png`
- `artifacts/screenshots/albago-dodge-mock2.png`
- Video capture is still pending because direct ADB touch injection is blocked; use Android Studio Device Mirroring or physical touch for the final walkthrough recording.

## 2026-05-04 update: Visible game objects

Sebep:

- Fruit Slash, Dodge Run and Fit Challenge had runtime scene state, but the active camera overlay only showed score/HUD summary.
- This made Fruit Slash look broken because fruit targets were not visually represented even when the runtime could score reps.

Çözüm:

- Added a template-aware object layer on top of the full-screen camera preview.
- Fruit Slash now shows visible fruit/bonus/penalty targets.
- Dodge Run now shows the runner and obstacle cards.
- Fit Challenge now shows the active task card with progress.
- Fruit Slash now starts with initial visible targets before the first timed spawn.

Test edilen cihaz:

- `2026-05-04`: physical device `cffbc068`, updated APK installed successfully.
- Fruit Slash object layer screenshot confirms visible `MEYVE` and `BONUS` targets.
- Dodge Run object layer screenshot confirms visible runner and `ENERJI` obstacle.
- Fit Challenge object layer screenshot confirms visible active task card.

Test edilen emulator:

- Not rerun in this pass; physical-device screenshots were used because the device is connected and camera behavior is the priority.

Kanıt videosu/screenshot:

- `artifacts/screenshots/albago-fruit-objects-start.png`
- `artifacts/screenshots/albago-fruit-visible.png`
- `artifacts/screenshots/albago-dodge-objects.png`
- `artifacts/screenshots/albago-fit-objects.png`

## 2026-05-05 update: Admin-driven game system v1

Sebep:

- Oyunlar Android koduna fazla bagli kalmaya baslamisti; admin panelden yeni varyasyon eklemek icin orientation, asset manifest, scene config ve interaction rules eksikti.
- Backend asset yolu sadece manifest JSON sakliyordu; gercek PNG/WebP/SVG upload ve public asset serving yoktu.
- Android manifest portrait lock nedeniyle admin panelden yatay oyun secimi uygulanamiyordu.

Cozum:

- Remote game definition v2 eklendi: `orientation`, `cameraRequirement`, `assets.items[]`, `sceneConfig`, `interactionRules`.
- Backend `POST /v1/internal/assets` ve `GET /v1/assets/{assetId}` destekliyor; SVG icin script/event-handler sanitization kontrolu var.
- Admin panel typed asset upload, orientation, camera requirement ve mobile payload preview destekliyor.
- Android runtime v2 schema'yi parse ediyor, aktif oyunda orientation uyguluyor ve remote asset URL'lerini placeholder fallback ile cozuyor.

Test edilen cihaz:

- Bu turda fiziksel cihaz gameplay walkthrough'u tekrar alinmadi; Android debug APK build dogrulamasi yapildi.

Test edilen emulator:

- Bu turda emulator acilmadi.

Kanıt videosu/screenshot:

- Video pending. Bu degisiklik altyapi ve build dogrulama turudur.
- Build proof:
  - `npm.cmd run build --workspace backend`
  - `npm.cmd run test --workspace backend`
  - `npm.cmd run build --workspace admin`
  - `android\\gradlew.bat :app:assembleDebug --no-daemon --stacktrace`

Acik takip:

- Backend local upload metadata su an process memory'de tutuluyor; dosya bytes kalici klasore yaziliyor, ama prod icin S3 uyumlu metadata repository gerekiyor.
- Android asset cache-first davranisi image loader seviyesinde calisiyor; explicit disk cache invalidation/versioning sonraki sprintte netlestirilmeli.
- Camera readiness ekraninin `FULL_BODY`, `UPPER_BODY`, `HAND_TARGET` rehber metinlerini tam UI akisi olarak guclendirmek gerekiyor.

## 2026-05-06 update: Category and program flow limits

Sebep:

- Admin-created games can now be categorized and can carry program/playlist steps, but the Android runtime still treats `programSteps` mainly as prep-screen guidance metadata.
- Fully automatic playlist execution such as `Squat set -> Plank timer -> Rest -> Next game` needs a dedicated program runner state machine on Android.

Cozum:

- Added `SPORT`, `FUN`, `EDUCATION` categories across backend/admin/OpenAPI/Android parsing.
- Added `programSteps` schema and admin editor support for rep targets, hold-pose blocks, rest blocks and instruction steps.
- Android catalog can filter by category and game prep can show the program flow.

Acik takip:

- Implement Android program runner execution so hold-pose timers, rest timers and auto-next activity transitions are enforced during gameplay.
- Add future motion primitives such as `PLANK`, `PUSH_UP` and `LUNGE` before publishing advanced sport programs.

## 2026-05-07 update: Program runner v1 and contract alignment

Sebep:

- `programSteps` existed in backend/admin/OpenAPI/Android parsing but Android runtime treated them as metadata only.
- `successMessage` was lost in Android parser pipeline.
- Backend validation had gaps for program step requirements (REST without duration, MOTION_REPS without motion).
- `HOLD_POSE` behavior was undefined on Android.
- Gradle test worker failed with `GradleWorkerMain` ClassNotFoundException on this Windows machine.

Cozum:

- Implemented Android program runner v1 state machine:
  - `ProgramStepStatus` (NOT_STARTED, ACTIVE, COMPLETED, BLOCKED)
  - `ProgramRuntimeStepState` and `ProgramRuntimeState` with step progression
  - `PLAY_GAME`: Template-based gameplay with optional durationSec
  - `MOTION_REPS`: Motion-matching rep counting with targetCount completion
  - `REST`: Timer-gated, auto-advance after durationSec
  - `INSTRUCTION`: Auto-advance after durationSec (v1 fallback 3s)
  - `HOLD_POSE`: Timer-gated hold v1; pauses on USER_OUT_OF_FRAME, resumes continue timer
  - `nextOnComplete = false` stops auto-advance
- Added 10 unit test cases for program runner
- Android `V3ProgramStepDefinition` now includes `successMessage`
- Backend validation tightened:
  - REST requires `durationSec > 0`
  - MOTION_REPS requires `motion` field
  - INSTRUCTION without `durationSec` generates warning
- Gradle test worker issue documented as environment blocker:
  - Workaround: `$env:GRADLE_USER_HOME = "C:\gradle-cache"` (avoids `ö` in default path)
  - `:app:assembleDebug` passes; `:core_runtime:testDebugUnitTest` blocked by classpath issue
  - Backend tests: 16/16 pass

Test edilen cihaz:

- Bu turda fiziksel cihaz testi yapilmadi; APK build ve backend test dogrulamasi ile sinirli.

Kanit:

- `npm run build --workspace backend` — PASS
- `npm run test --workspace backend` — 16 tests PASS
- `npm run build --workspace admin` — PASS
- `.\gradlew.bat :app:assemblesDebug` — PASS (with GRADLE_USER_HOME workaround)
- `.\gradlew.bat :core_runtime:compileDebugKotlin :core_runtime:compileDebugUnitTestKotlin` — PASS

Acik takip:

- Android unit test execution blocked by Windows username character (`ö`) in Gradle classpath. Code compiles correctly.
- Camera readiness card composable created but not yet wired into game detail flow.
- Demo videos were later captured in P1 on 2026-05-08.
- `HOLD_POSE` v1 is timer-gated only; real pose detection needs `PLANK`, `PUSH_UP`, `LUNGE` primitives.

## 2026-05-08 update: Platform v2 P0/P1 gate status

Durum:

- P0 deterministic verification now passes on this machine with `GRADLE_USER_HOME=C:\gradle-cache`.
- The first P0 attempt was blocked by a stale/incomplete Gradle wrapper ZIP lock under `C:\gradle-cache`; the cache was seeded from the existing user Gradle cache and the verification script now performs that seed automatically when possible.
- Backend build, backend tests, admin build, Android `:core_runtime:testDebugUnitTest`, Android `:app:testDebugUnitTest` and Android `:app:assembleDebug` passed on `2026-05-08`.
- P1 physical-device acceptance was initially blocked because `adb devices` returned no attached device on `2026-05-08`; it passed later the same day after device `cffbc068` became visible through ADB.

Kanit:

- `artifacts/verification/platform-v2-20260508.log`
- `artifacts/verification/device-prep-20260508.log`

Acik takip:

- Physical Android device acceptance is now complete for device `cffbc068`.
- Required `FRUIT_SLASH`, `DODGE_RUN` and `FIT_CHALLENGE` videos were captured.
- Per-game crash logs were captured and scanned.
- P1 is now completed. P2 game-session result persistence is completed; P3/P4 still need a separate explicit plan before expansion.

## P1 Physical Device Acceptance Environment Note

- Date opened: 2026-05-08
- Date resolved: 2026-05-08
- Status: Resolved for P1 acceptance
- Branch: `platform-v2`
- Previous symptom: `adb devices -l` returned no usable physical device after ADB server restart.
- Resolution: physical Android device `cffbc068` became visible through ADB as `device`.
- Device: `M2007J3SI`, Android 12
- Environment: Android SDK is under `%LOCALAPPDATA%\Android\Sdk`; ADB itself runs from that SDK path.
- P1 result: PASS. Debug APK installed, `adb reverse tcp:3000 tcp:3000` succeeded, cold launch had no fatal crash, and Fruit Slash, Dodge Run and Fit Challenge demo videos were captured.
- Evidence:
  - `artifacts/verification/device-prep-20260508.log`
  - `artifacts/verification/p1-device-acceptance-summary-20260508.md`
  - `artifacts/verification/physical-device-preflight-20260508-121938.log`
  - `artifacts/verification/p1-device-acceptance-summary-20260508-121945.md`
  - `artifacts/verification/physical-device-preflight-20260508-123217.log`
  - `artifacts/verification/p1-device-acceptance-summary-20260508-123222.md`
  - `artifacts/verification/physical-device-preflight-20260508-150853.log`
  - `artifacts/verification/p1-device-acceptance-summary-20260508-150858.md`
  - `artifacts/verification/p1-evidence-index-20260508-151309.md`
- Remaining environment note:
  - Manual catalog tap validation may still require human touch, Android Studio Device Mirroring or scrcpy if ADB input injection is blocked.

Tooling:

- `powershell -ExecutionPolicy Bypass -File scripts/preflight-physical-device.ps1`
- `powershell -ExecutionPolicy Bypass -File scripts/accept-device-demo.ps1 -Build`
- `powershell -ExecutionPolicy Bypass -File scripts/check-android-crash-log.ps1 artifacts\crash-reports\<log>.log`
- Phone-connected runbook: `docs/07-release/p1-phone-connected-runbook.md`

## 2026-05-08 P2 session persistence notes

- Status: P2 game-session result persistence passed build/test verification.
- Backend result submissions are idempotent by `clientSessionId`.
- Android submits completed game results asynchronously and does not block or crash the local result screen if the backend is unavailable.
- Optional physical backend-write smoke was not run in this pass; P2 verification is covered by backend tests, Android unit tests, compile and debug APK build.
- `npm install` still reports 5 dependency audit findings; remediation was not part of the P2 session persistence scope.

## 2026-05-08 P3 Admin Publish QA notes

- Status: P3 admin publish QA PASS.
- A new SCENE_PLAY game was created via backend API, validated, published, and confirmed in active definitions.
- Android pipeline now correctly parses `sceneConfig` and `interactionRules` from remote definitions (previously dropped as empty).
- P3 game `p3_scene_play_deve_cuce_20260508-163452` published and verified.
- Manual catalog tap validation remains separate; QA direct launch path was used for automated verification.
- P3 does not include admin UI redesign, analytics, or production auth hardening (out of scope).

## 2026-05-08 P4 Release Candidate Packaging

- Status: P4 release candidate packaging PASS.
- RC directory: `artifacts/release/albago-platform-v2-rc-20260508-170015/`
- RC APK: `albago-platform-v2-rc-debug.apk`
- SHA256: `7B2AE2ABA4DF0DD3E53509854D4EA29604A3A4C178D24695DE3B438BA709A712`
- Build type: debug/internal RC
- Physical smoke test: PASS on device cffbc068 (M2007J3SI, Android 12)

### Accepted Non-Blocking

- Manual catalog tap validation remains human/mirroring-dependent; QA direct launch evidence covers automated demo acceptance.
- npm audit findings (5 total: 3 high backend via effect, 1 critical + 1 moderate admin via next/postcss) require follow-up triage/fix. See `artifacts/verification/p4-npm-audit-triage-20260508-170015.md`.
- Working tree had unrelated/ownership-unclear changes (.agent/ files, stitch_* exports, local settings), so commits were not created automatically.

### Follow-up

- Apply `npm audit fix` in backend workspace (non-breaking semver fix for effect).
- Monitor Next.js releases for patched 15.x version; upgrade admin when available.
- Migrate Prisma config from `package.json#prisma` to `prisma.config.ts` before Prisma 7.
- Android program runner execution for hold-pose timers, rest timers and auto-next transitions.
- Add future motion primitives (PLANK, PUSH_UP, LUNGE) for advanced sport programs.
