# P9 Beta Candidate Release Notes

**Date:** 2026-05-09
**Status:** PENDING FINAL VERIFICATION

## Included Fixes (P8 Interactive Recovery)

- Game cards (Fruit Slash, Dodge Run, Fit Challenge) now clickable with "Hazırla" buttons
- Demo Catalog → Real game flow wired via GAMES destination
- Center "A" bottom button no longer opens camera (safe: goes to HOME)
- BackHandler added to all camera/game screens (Android system back works)
- Navigation back stack (previousDestination + navigateBack)
- Non-functional quick access items show "Yakında" label with reduced opacity
- Snackbar feedback for unavailable features

## APK

- **Path:** artifacts/release/p9-beta-candidate-20260509-125500/app-debug.apk
- **SHA256:** b9bcccd2ec71ef879d416ee22449c586e17f8bdf11b1f57c7995b35782ae0c24
- **Size:** 113.7 MB
- **Version:** 0.1.0
- **Package:** com.alba.app

## Verification Matrix

| Gate | Status |
|------|--------|
| Fresh build (P9.2) | PASS |
| Backend tests (32/32) | PASS |
| Admin build | PASS |
| Android unit tests | PASS |
| APK assemble | PASS |
| Full platform verification (9/9) | PASS |
| Persistent backend | CONDITIONAL (Supabase available, local PostgreSQL pending) |
| Physical device UX | PENDING USER |
| Session persistence | PASS (API-level, idempotency confirmed) |
| Admin publish validation | PASS |
| Crash scan | PENDING |

## Known Issues

1. PostgreSQL not available locally (Docker not installed); backend runs in-memory
2. Supabase remote DB requires auth integration for session persistence (P10)
3. APK size 113.7 MB (asset split planned)
4. Quick access items (Görevler, Arkadaşlar, etc.) show "Yakında" — not yet implemented
5. "Tümünü Gör >" on Entertainment screen is cosmetic only
6. SegmentRow filters on DemoCatalog are visual only

## Install

```powershell
adb install -r app-debug.apk
adb reverse tcp:3000 tcp:3000
```

## Rollback

Use previous beta artifact from P7:
```powershell
adb uninstall com.alba.app
adb install artifacts/release/beta-20260509/app-debug.apk
```
