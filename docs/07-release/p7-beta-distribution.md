# P7 Beta Distribution

**Date:** 2026-05-09
**Branch:** platform-v2
**Build Number:** 0.1.0 (debug)

## SHA256

```
b41336832126b2a198238ee8fb6b7ac289a646c08f0667ff155b89a695d353b8
```

## APK Info

- **Path:** artifacts/release/beta-20260509/app-debug.apk
- **Size:** 113.6 MB
- **Version:** 0.1.0
- **Package:** com.alba.app
- **Min SDK:** Based on Android 12+ (API 31+)
- **Target:** Android 12 (API 31)

## Test Coverage

| Area | Status | Details |
|------|--------|---------|
| Backend unit tests | PASS | 32 tests, 3 suites |
| Android core_runtime tests | PASS | Unit tests passed |
| Android app tests | PASS | Unit tests passed |
| Admin build | PASS | Next.js 14.2.16 |
| Physical device | PASS | M2007J3SI (Xiaomi), Android 12 |
| Emulator | PASS | Medium_Phone_API_36.1 |
| Crash scan | PASS | No AndroidRuntime errors |
| Session sync | PASS | 3/3 scenarios verified |
| Duplicate protection | PASS | Idempotency confirmed |
| Publish validation | PASS | Both positive and negative tests |

## Known Issues

- APK size 113.6 MB (future: asset split for downloadable content)
- Camera-based games require physical device (emulator uses virtual scene)
- Docker not available locally; backend runs in-memory mode
- ADB reverse tunnel needed for local backend connectivity

## Install Instructions

```powershell
adb install -r artifacts/release/beta-20260509/app-debug.apk
```

## Rollback Instructions

```powershell
adb uninstall com.alba.app
# Re-install previous version
```

## Artifact Structure

```
artifacts/release/beta-20260509/
    app-debug.apk
    checksum.txt
    release-notes.md
    known-issues.md
```
