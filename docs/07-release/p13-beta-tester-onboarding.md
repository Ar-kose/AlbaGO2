# AlbaGo Beta Tester Onboarding

**Date:** 2026-05-09
**Pilot:** P13 Controlled Beta

## Install Package

- **APK path:** `artifacts/release/p12-secure-beta-pilot-20260509-160000/app-debug.apk`
- **SHA256:** `0c37185af6074a94b757fe4ed98c4b7df2e0d4ae8e25d53d3a0a8d6de63eb756`
- **Version:** 0.1.0

## Device Requirements

- Android 12+ preferred
- Camera permission granted
- Stable network connection
- At least 500 MB free storage
- USB debugging enabled (for adb install)

## Install

```bash
adb install -r app-debug.apk
```

For local backend:
```bash
adb reverse tcp:3000 tcp:3000
```

## Pre-Test Verification

After install, verify the APK hash on-device or re-compute from the same file used for adb install:

```powershell
Get-FileHash app-debug.apk -Algorithm SHA256
```

Expected: `0c37185af6074a94b757fe4ed98c4b7df2e0d4ae8e25d53d3a0a8d6de63eb756`

If hash does not match, STOP and request the correct artifact.

## Test Flow

1. Launch AlbaGo app
2. Complete onboarding if visible
3. Verify home screen shows greeting, daily progress
4. Open "Eglence" tab → Demo Oyunlar
5. Open Fruit Slash (Meyve Kesme) prep screen
6. Start Fruit Slash → play → reach result screen
7. Return to catalog
8. Repeat for Dodge Run (Engelden Kacis)
9. Repeat for Fit Challenge (Spor Mucadelesi)
10. Test Android back button on every screen
11. Test bottom navigation (A button → Home, not camera)
12. Check sync state on result screen after each game
13. Collect crash log or confirm no crash

## Report Format

```
Tester:
Device model:
Android version:
APK SHA256:
Issue title:
Severity (P0/P1/P2/P3/P4):
Steps:
Expected:
Actual:
Screenshot/video:
Crash log (if any):
```

## Crash Log Collection

```bash
adb logcat -d | findstr "AndroidRuntime\|FATAL\|AlbaGo" > crash_log.txt
```

## Support

If you encounter a P0 crash or P1 blocker, stop testing and notify immediately.
For P2/P3 issues, continue testing and file the report.
