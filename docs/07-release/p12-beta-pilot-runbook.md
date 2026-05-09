# P12 Beta Pilot Runbook

**Date:** 2026-05-09
**Audience:** Internal testers only

## Install

```powershell
adb install -r app-debug.apk
adb reverse tcp:3000 tcp:3000
```

## Required Setup
- Android 12+ device
- Camera permission granted
- Network access to backend (localhost:3000 via adb reverse or QA panel URL override)

## APK
- **SHA256:** 0c37185af6074a94b757fe4ed98c4b7df2e0d4ae8e25d53d3a0a8d6de63eb756
- **Version:** 0.1.0

## Test Flow

1. Launch app → Complete onboarding
2. Home: Check greeting, daily progress, quick access items
3. Tap "Eglence" tab → Demo Oyunlar
4. **Meyve Kesme**: Tap card/Hazırla → Neon prep → Oyuna Başla → Play → Result
5. **Engelden Kacis**: Same flow
6. **Spor Mucadelesi**: Same flow
7. Check sync state on result screen
8. Test Android back button on each screen
9. Test bottom navigation (A button goes to Home, not camera)

## Report Format
```
Device model:
Android version:
Build SHA256:
Game tested:
Issue found:
Steps to reproduce:
Screenshot/video:
```

## Known Issues
- Quick access items show "Yakında"
- APK size 113.9 MB
- Camera required for gameplay (no emulator support)
