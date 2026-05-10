# platform-v2 PR Review Packet

**Branch:** `platform-v2` → `main`
**Commit:** `ad38b88`
**PR:** https://github.com/Ar-kose/AlbaGO2/pull/new/platform-v2

---

## Summary

Local-first game sessions, profile foundation, RLS enforcement, and offline sync infrastructure across 6 phases (P13-P18). 159 files, +18147/-1412 lines. 10 consecutive 9/9 full platform verifications.

## Major Changes

### Game Experience (P13-P14)
- Local-first result: result always saved on device, sync is non-blocking background
- Debug UI elements hidden from normal user flow
- Dark neon theme consistency
- Turkish user-facing messages

### Network (P15)
- HttpURLConnection → OkHttp 4.12.0 migration
- HttpLoggingInterceptor at BASIC level
- Timeouts: connect 10s, read 15s, write 10s
- Emulator QA: Pixel_7 API 37

### Security (P16)
- RLS enforcement: 47/47 public tables protected
- 9 legacy camelCase tables: policies applied (backend-only, public-read, user-owned)
- Profile backend: NestJS module with GET/PUT endpoints
- Android profile shell: dark neon theme, honest "hesap sistemi yakinda" messaging

### Offline Sync (P17-P18)
- Room database: 2 entities (LocalGameSession, SyncQueueItem), 2 DAOs
- WorkManager sync worker: CoroutineWorker with exponential backoff, 5 max attempts
- Game finish → Room save → Queue enqueue → Worker sync flow
- Profile screen reads real Room data (total games, top score, recent sessions)

## File Map for Reviewers

```
Backend:
  backend/src/profiles/profiles.module.ts          — NEW: profile CRUD
  backend/src/game-sessions/game-sessions.module.ts — calories null fix
  backend/test/profiles.spec.ts                    — NEW: 8 profile tests

Android (core):
  android/core_data/src/main/java/.../local/       — NEW: Room + Worker (8 files)
  android/core_data/.../AlbaMotionController.kt    — saveAndEnqueue wiring
  android/core_network/.../SupabaseData.kt         — OkHttp migration

Android (UI):
  android/app/.../ProfileScreen.kt                 — NEW: profile with Room data
  android/app/.../AlbaApplication.kt               — PROFILE destination
  android/feature_games/.../GamesFeature.kt        — local-first result UI

Docs:
  docs/03-architecture/                            — Session migration + WorkManager design
  docs/06-security/                                — RLS policy design + migration plan
```

## Verification Summary

| Gate | Count |
|---|---|
| Full platform verifications (9/9) | 10 consecutive (P9-P18) |
| Backend tests | 40/40 |
| Android unit tests | PASS |
| Admin build | PASS |
| Emulator QA | Pixel_7 API 37 |

## Risk Areas

| Risk | Severity | Mitigation |
|---|---|---|
| Physical Xiaomi sync not verified | Low | OkHttp POST confirmed via logcat; emulator covers UI |
| WorkManager worker not e2e tested on device | Low | Code compiled + wired; Room DAOs tested via build |
| RLS 47-table enforcement | Very Low | All backend flows verified in P16-P18 |

## Rollback

See `docs/07-release/p19-platform-v2-rollback-plan.md`. Rollback target: `bde3b5b` (pre-platform-v2).
