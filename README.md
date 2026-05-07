# AlbaGo

Android-first, AI-assisted and gamified exercise MVP monorepo.

## Workspace layout

- `android/`: Android native app, CameraX pipeline, pose estimation, motion engine and demo game runtime
- `backend/`: NestJS modular monolith API with Prisma-backed game definition and audit persistence
- `admin/`: Next.js admin console for multi-template demo game management
- `docs/`: product, architecture, ADR and sprint documentation
- `openapi/`: API contract sources
- `infra/`: local infrastructure bootstrap
- `artifacts/`: local device screenshots and demo evidence files

## Sprint 4 status

Sprint 4 moves AlbaGo from a technical prototype toward a presentation-quality demo build.

- Android now exposes 4 user-facing surfaces: `Home`, `Motion Lab`, `Workout`, `Demo Oyunlar`
- Game flow is stabilized as `catalog -> detail/prep -> active session -> result`
- Demo game catalog is now limited to 3 public games:
  - `FRUIT_SLASH`
  - `DODGE_RUN`
  - `FIT_CHALLENGE`
- `TARGET_HIT` remains in code only for debug/regression purposes
- Game runtime now supports template-specific scene state, combo, accuracy and structured result payloads
- Debug QA can inject mock `SQUAT`, `JUMPING_JACK`, `JUMP_ROPE`, `BAD_FORM` and `USER_OUT_OF_FRAME` events
- Backend publishes 3 public demo games and keeps internal/debug templates out of the public active list
- Admin panel supports multi-template editing, validation, publish and rollback
- Admin-created games now carry a category (`SPORT`, `FUN`, `EDUCATION`) and optional tags, so the catalog can be filtered by purpose.
- Sport-style games can define program/playlist steps such as rep targets, plank/hold steps, rest blocks and automatic next-step guidance.

## Latest local verification

Validated on `2026-05-06` on this machine:

- Backend/OpenAPI/Admin/Android domain models were extended with game categories, tags and level-level `programSteps`.
- The admin game console now has category filters, category editing and a program/playlist builder for sports flows such as squat sets, plank holds and next activity guidance.
- Android parses the new category/program fields, filters the catalog by category and shows program steps on the game prep screen.
- Verification passed:
  - `npm.cmd run build --workspace backend`
  - `npm.cmd run test --workspace backend`
  - `npm.cmd run build --workspace admin`
  - `android\\gradlew.bat :core_runtime:compileDebugKotlin :core_network:compileDebugKotlin :core_data:compileDebugKotlin :feature_games:compileDebugKotlin --no-daemon`
  - `android\\gradlew.bat :app:assembleDebug --no-daemon`

Validated on `2026-05-05` on this machine:

- Admin-driven game definition v2 was added: per-game `orientation`, `cameraRequirement`, typed asset manifest items, `sceneConfig` and `interactionRules`.
- Backend now accepts PNG, WebP and sanitized SVG uploads through `POST /v1/internal/assets` and serves uploaded assets from `/v1/assets/{assetId}`.
- Admin game editor now supports orientation, camera requirement, typed asset upload/listing, template config tuning and a mobile payload preview.
- Android runtime parses v2 game definitions, applies landscape/portrait orientation during active gameplay and resolves uploaded asset URLs with local placeholder fallback.
- Prisma schema/migration now includes `orientation`, `cameraRequirement`, `sceneConfig` and `interactionRules` for persistent game definitions.
- Verification passed:
  - `npm.cmd run prisma:generate --workspace backend`
  - `npm.cmd run build --workspace backend`
  - `npm.cmd run test --workspace backend`
  - `npm.cmd run build --workspace admin`
  - `android\\gradlew.bat :app:assembleDebug --no-daemon --stacktrace`

Validated on `2026-05-04` on this machine:

- `android\\gradlew.bat clean :app:assembleDebug` passed with Android Studio JBR 21 and explicit Android SDK environment variables.
- The default shell Java was Java 26, which Gradle/Kotlin could not parse; use the Android Studio JBR command block below for repeatable APK output.
- Catalog crash hardening was implemented for game open flows:
  - nested game-screen scrolling was removed
  - unsafe `levels.first()` calls were replaced with safe empty/invalid states
  - remote/cache enum parsing now skips invalid content instead of crashing
  - backend-offline catalog falls back to cached or local demo games in debug builds
- Active game camera was changed from a fixed-height panel to a full-screen play surface with HUD overlay.
- Fruit Slash and Dodge Run now score on valid reps even when the scene is temporarily empty, making mock/real-motion demos playable.
- Game scenes now render visible template objects over the camera surface: Fruit Slash targets, Dodge Run obstacles and Fit Challenge task cards.
- Physical device `cffbc068` was detected after the build, the debug APK installed successfully, `adb reverse tcp:3000 tcp:3000` succeeded and cold launch completed.
- Debug QA launch extras were verified for direct catalog/game startup and mock rep injection.
- `artifacts/crash-reports/catalog-crash-after-fix.log` was captured after cold launch and contains no `AndroidRuntime` crash lines.
- Direct `adb shell input tap` is blocked by the device OS (`INJECT_EVENTS`), so catalog-button interaction still requires human touch through device mirroring/scrcpy.
- Latest screenshots:
  - `artifacts/screenshots/albago-redesign-home2.png`
  - `artifacts/screenshots/albago-game-mock-score-clean2.png`
  - `artifacts/screenshots/albago-fit-mock.png`
  - `artifacts/screenshots/albago-dodge-mock2.png`

Validated on `2026-04-26` on this machine:

- `npm.cmd run build --workspace backend`
- `npm.cmd run test --workspace backend`
- `npm.cmd run build --workspace admin`
- `android\\gradlew.bat clean assembleDebug`
- Physical device detected with `adb`
- Debug APK installed successfully
- `adb reverse tcp:3000 tcp:3000` succeeded
- App cold launch on device succeeded
- Fresh device screenshots captured:
  - `artifacts/albago-sprint4-home-clean.png`
  - `artifacts/albago-sprint4-foreground.png`

Still pending:

- human-driven full motion walkthrough
- 3 separate on-device demo video captures
- Android `testDebugUnitTest` fix for the Gradle worker environment issue
- final manual catalog button tap validation through Android Studio Device Mirroring, scrcpy or physical touch because ADB input injection is blocked on the connected device

## Local setup

### JavaScript workspaces

Use `npm.cmd` on Windows PowerShell:

```powershell
npm.cmd install
npm.cmd run build --workspace backend
npm.cmd run test --workspace backend
npm.cmd run build --workspace admin
```

### Android baseline

- JDK 17 team baseline
- Android SDK 34
- Build tools `34.0.0`
- Platform tools with `adb`

This workspace was revalidated locally with Android Studio JBR 21 plus explicit environment variables.

### Configure Android environment variables

```powershell
$env:JAVA_HOME='C:\Program Files\Android\Android Studio\jbr'
$env:ANDROID_SDK_ROOT="$env:LOCALAPPDATA\Android\Sdk"
$env:ANDROID_HOME="$env:LOCALAPPDATA\Android\Sdk"
$env:PATH="$env:JAVA_HOME\bin;$env:ANDROID_SDK_ROOT\platform-tools;$env:PATH"
```

### Install required Android SDK packages

- `platforms;android-34`
- `build-tools;34.0.0`
- `platform-tools`

### Build Android debug APK

```powershell
Set-Location android
$env:JAVA_HOME='C:\Program Files\Android\Android Studio\jbr'
$env:ANDROID_SDK_ROOT="$env:LOCALAPPDATA\Android\Sdk"
$env:ANDROID_HOME="$env:ANDROID_SDK_ROOT"
$env:PATH="$env:JAVA_HOME\bin;$env:ANDROID_SDK_ROOT\platform-tools;$env:PATH"
.\gradlew.bat :app:assembleDebug
```

Expected APK:

- `android/app/build/outputs/apk/debug/app-debug.apk`

### Physical Android device acceptance

1. Enable developer options and USB debugging.
2. Connect the device over USB.
3. Verify connection:

```powershell
adb devices
```

4. Install the debug APK:

```powershell
adb install -r .\app\build\outputs\apk\debug\app-debug.apk
```

5. Reverse the local backend port when using USB:

```powershell
adb reverse tcp:3000 tcp:3000
```

6. Launch the app:

```powershell
adb shell am start -n com.alba.app/com.alba.app.MainActivity
```

7. Verify:
   - camera permission prompt appears
   - preview opens without crash
   - pose overlay follows the user
   - squat and jumping jack counts respond
   - at least 1 demo game scores from motion
   - workout/game sync status updates

### Capture crash logs and demo videos

Use this when validating the catalog buttons or a demo walkthrough:

```powershell
New-Item -ItemType Directory -Force artifacts\crash-reports, artifacts\demo-videos
adb logcat -c
adb shell am start -n com.alba.app/com.alba.app.MainActivity
adb logcat AndroidRuntime:E AlbaGo:D *:S > artifacts\crash-reports\catalog-crash.log
```

Record a device video:

```powershell
adb shell screenrecord /sdcard/albago-demo.mp4
adb pull /sdcard/albago-demo.mp4 artifacts\demo-videos\albago-demo.mp4
```

### Debug QA direct game launch

Use these only for debug/demo validation when the connected device blocks `adb shell input tap`:

```powershell
adb shell am start -n com.alba.app/com.alba.app.MainActivity --es albago.startDestination GAMES
adb shell am start -n com.alba.app/com.alba.app.MainActivity --es albago.startDestination GAMES --es albago.autostartGameId fruit_slash_demo --es albago.mockRep JUMPING_JACK
adb shell am start -n com.alba.app/com.alba.app.MainActivity --es albago.startDestination GAMES --es albago.autostartGameId dodge_run_demo --es albago.mockRep JUMP_ROPE
adb shell am start -n com.alba.app/com.alba.app.MainActivity --es albago.startDestination GAMES --es albago.autostartGameId fit_challenge_demo --es albago.mockRep SQUAT
```

### Prisma and backend

Start PostgreSQL:

```powershell
docker compose -f infra/docker-compose.yml up -d postgres
```

Backend setup:

```powershell
Copy-Item backend\.env.example backend\.env
npm.cmd run prisma:generate --workspace backend
npm.cmd run prisma:migrate:dev --workspace backend
npm.cmd run prisma:seed --workspace backend
```

Example `DATABASE_URL`:

- `postgresql://alba:alba@localhost:5432/alba?schema=public`

Runtime entry points:

- Backend: `npm.cmd run start:dev --workspace backend`
- Admin: `npm.cmd run dev --workspace admin`
- Android default debug API base URL: `http://10.0.2.2:3000/`

### Admin-driven game assets

Local development uses backend static storage for uploaded game assets:

```powershell
npm.cmd run start:dev --workspace backend
npm.cmd run dev --workspace admin
```

In the admin game console:

- choose `FRUIT_SLASH`, `DODGE_RUN` or `FIT_CHALLENGE`
- select orientation: `Dikey` or `Yatay`
- select camera requirement: `Tam vucut`, `Ust vucut` or `El / hedef temasi`
- upload PNG, WebP or sanitized SVG assets
- publish the game
- refresh Android game config from the QA panel

Uploaded assets are referenced in `assets.items[]` and can be reused by Android without a new app build as long as the game uses an already shipped native template.

## Notes

- Android builds on this Windows path require `android.overridePathCheck=true` because the workspace path contains non-ASCII characters.
- The MediaPipe model asset is stored under `android/core_pose/src/main/assets/`.
- Debug builds expose a QA panel with backend URL override, overlay toggle, config refresh, sync retry and motion log controls.
- Prisma persistence is currently the Sprint 4 source of truth for game definitions, levels and audit logs.
- Admin can add or update games inside the templates already shipped in Android (`FRUIT_SLASH`, `DODGE_RUN`, `FIT_CHALLENGE`) without an app update. A completely new mechanic still needs a new native template unless a future generic scene/action interpreter is added.
