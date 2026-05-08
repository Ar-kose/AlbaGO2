# Platform v2 Build Verification

Date: 2026-05-07
Branch: platform-v2

## Baseline Findings

- `npm.cmd run build --workspace backend` failed before Prisma client generation because generated Prisma types were absent.
- `npm.cmd run test --workspace backend` passed after `npm.cmd install`.
- `npm.cmd run build --workspace admin` failed during prerender because the admin helper imported the Supabase browser client at module load and required `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- `android\gradlew.bat :app:assembleDebug --no-daemon` failed before Kotlin compilation because transitive `androidx.browser:browser:1.9.0` requires compileSdk 36 and Android Gradle Plugin 8.9.1 while the project baseline is compileSdk 34 and AGP 8.4.2.

## Stabilization Actions

- Ran `npm.cmd install` to restore JS workspace dependencies.
- Ran `npm.cmd run prisma:generate --workspace backend`; backend build then passed.
- Pinned transitive `androidx.browser:browser` to `1.8.0` in the Android root Gradle build to preserve the SDK 34 / AGP 8.4.2 baseline.
- Moved the admin API helper from direct Supabase table operations to backend `/v1/internal/*` API calls.
- Added GameDefinition v3 backend validation, OpenAPI contract, Android parser tests, and admin v3 preview payload generation.
- Added `ALBA_API_BASE_URL` Android BuildConfig wiring and a QA backend URL override path for the controller/network facade.

## Final Verification

- `npm.cmd run build --workspace backend` passed.
- `npm.cmd run test --workspace backend` passed: 2 suites, 8 tests.
- `npm.cmd run build --workspace admin` passed.
- `.\gradlew.bat :app:assembleDebug --no-daemon` passed from `android/` when run with Android Studio JBR and `C:\Android\Sdk`.
- `.\gradlew.bat testDebugUnitTest --no-daemon` still fails in Gradle's test worker bootstrap (`Could not find or load main class worker.org.gradle.process.internal.worker.GradleWorkerMain`) before reporting parser test assertions.
- The machine default `java` is JDK 26, which Gradle/Kotlin DSL cannot parse here. Use Android Studio JBR/Java 21 or another supported JDK for Android verification.

## Minimum CI Command Set

```powershell
npm.cmd install
npm.cmd run prisma:generate --workspace backend
npm.cmd run build --workspace backend
npm.cmd run test --workspace backend
npm.cmd run build --workspace admin

$env:JAVA_HOME='C:\Program Files\Android\Android Studio\jbr'
$env:ANDROID_SDK_ROOT='C:\Android\Sdk'
$env:ANDROID_HOME="$env:ANDROID_SDK_ROOT"
$env:PATH="$env:JAVA_HOME\bin;$env:ANDROID_SDK_ROOT\platform-tools;$env:PATH"
Push-Location android
.\gradlew.bat :app:assembleDebug --no-daemon
.\gradlew.bat testDebugUnitTest --no-daemon
Pop-Location
```
