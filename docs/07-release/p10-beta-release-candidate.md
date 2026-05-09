# P10 Beta Release Candidate

**Date:** 2026-05-09
**Status: CONDITIONAL GO**

## Included

- **P8**: Interactive recovery (clickable game cards, camera trap fix, back navigation)
- **P9R**: Legacy UI route removal (NeonGamePrepScreen, no old white-card GamesHomeScreen)
- **P10**: Physical UX acceptance, session persistence, admin publish refresh

## APK

- **Path:** artifacts/release/p10-beta-release-candidate-20260509-140000/app-debug.apk
- **SHA256:** 0c37185af6074a94b757fe4ed98c4b7df2e0d4ae8e25d53d3a0a8d6de63eb756
- **Size:** 113.9 MB
- **Version:** 0.1.0
- **Package:** com.alba.app

## Verification Matrix

| Gate | Status |
|------|--------|
| Backend tests (32/32) | PASS |
| Admin build | PASS |
| Android unit tests | PASS |
| APK assemble | PASS |
| Full platform verification (9/9) | PASS |
| Physical device UX | PASS |
| Session persistence (API) | PASS |
| Duplicate idempotency | PASS |
| Admin publish validation | PASS |
| Crash scan (physical device) | PASS |
| Legacy UI removal | PASS |
| BackHandler | PASS |
| Persistent backend | CONDITIONAL (no Docker) |

## Known Issues

1. PostgreSQL unavailable locally; backend runs in-memory fallback
2. Supabase remote DB available but requires auth integration
3. APK size 113.9 MB
4. Quick access items show "Yakında"

## Install

```powershell
adb install -r app-debug.apk
adb reverse tcp:3000 tcp:3000
```

## Rollback

Use previous artifact if needed.
