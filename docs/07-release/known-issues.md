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

- Video pending until manual device interaction is performed through physical touch, Android Studio Device Mirroring or scrcpy.
- Build proof: `android\\gradlew.bat :app:assembleDebug` passed on `2026-05-03` with Android Studio JBR 21 and Android SDK env vars.
- Launch/crash proof: `artifacts/crash-reports/catalog-crash-after-fix.log` and `artifacts/albago-after-fix-home.png`.

- Physical Android device detection, APK install, cold launch and screenshot capture are now confirmed, but the full camera/pose/motion/game walkthrough and the 3 separate demo video captures still require manual on-device testing.
- Android unit tests are currently blocked by a local Gradle test worker environment issue (`worker.org.gradle.process.internal.worker.GradleWorkerMain` not found).
- `JUMP_ROPE` detector is still prototype quality and is not a sprint gate.
- Prisma persistence is now active for game definitions, levels and audit logs, but workout and game session writes still fall back to in-memory runtime behavior.
- Android debug builds on this Windows path require `android.overridePathCheck=true` because the workspace folder contains non-ASCII characters.
- This machine does not currently have JDK 17 installed; debug builds were revalidated with Android Studio JBR 21 plus explicit `JAVA_HOME` and `ANDROID_SDK_ROOT`.
- The default shell Java is Java 26 on `2026-05-03`; Gradle/Kotlin fails with `JavaVersion.parse(26)` unless `JAVA_HOME` is pointed to Android Studio JBR 21.
- Direct `adb shell input tap` automation is blocked on the connected device by OS input-injection restrictions, so human interaction remains necessary for full demo walkthrough capture.
- On `2026-05-03`, device-side automated taps were still blocked by OS input-injection restrictions, so catalog button interaction and demo video capture require manual interaction.

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
