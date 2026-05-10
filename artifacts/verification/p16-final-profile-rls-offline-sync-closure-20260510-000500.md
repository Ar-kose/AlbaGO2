# P16 Final Profile, RLS & Offline Sync Closure

**Date:** 2026-05-10 00:05:00
**Previous:** P15 = CONDITIONAL PASS
**Final Decision: CONDITIONAL PASS**

---

## Summary

P16 kapsaminda:
- **OkHttp sync root cause bulundu ve fix edildi**: `calories: null` → backend validation reject (HTTP 400). Fix: backend artık null kabul ediyor + Android `calories = 0.0`
- **RLS policy enforcement**: 9 camelCase Prisma tablosuna RLS enable + policy uygulandı
- **Profile foundation**: Backend profiles module (40/40 tests) + Android profile shell (build PASS, emulator QA PASS)
- **Anonymous session → profile migration design**: Belgelendi, explicit consent prensibi
- **WorkManager offline sync queue**: Tasarım donduruldu, implementasyon P17'ye ertelendi
- **Full verification**: 9/9 PASS (8. ardışık)
- **Physical Xiaomi smoke**: BLOCKED (cihaz online fakat fiziksel test kullanıcı tarafından henüz yapılmadı)

## Delivered

| Gate | Status | Details |
|---|---|---|
| P16.0 Physical OkHttp closure | CONDITIONAL | Backend fix applied, OkHttp POST reaches backend (verified via logcat), sync works with fixed validation, but full physical game flow replay pending |
| P16.1 RLS policy design | PASS | 9 tables, 3 categories (backend-only, public-read, user-owned) |
| P16.2 RLS migration plan | PASS | 3-batch safe migration + rollback SQL |
| P16.3 RLS policy application | PASS | All 9 tables RLS enabled, policies applied |
| P16.4 Profile backend | PASS | profiles module, 2 endpoints, 8 new tests |
| P16.5 Android profile shell | PASS | ProfileScreen.kt, PROFILE destination, build PASS |
| P16.6 Anonymous session migration | PASS | Design doc, explicit consent model |
| P16.7 WorkManager sync queue | PASS (design) | Design frozen, implementation P17 |
| P16.8 Emulator QA | PASS | Pixel_7 API 37, APK installed, screenshots captured |
| P16.9 Physical smoke | BLOCKED | Xiaomi online but no game replay yet |
| P16.10 Security regression | PASS | No secret leaks, no PII, RLS active |
| P16.11 Test suite | PASS | Backend 40/40, Android unit tests PASS |
| P16.12 Full verification | PASS | 9/9 PASS (8th consecutive) |

## Key Bug Fixed

**P16-CAL-001**: `calories must be numeric` — Android `GameSessionSubmitRequest` sends `calories: null`. Backend `normalizeSubmitDto()` rejected null as non-numeric. Fixed both sides:
- Backend: `dto.calories !== undefined && dto.calories !== null` check
- Android: `calories = 0.0` instead of `null`

## Code Changes

| File | Type | Description |
|---|---|---|
| `backend/src/game-sessions/game-sessions.module.ts` | FIX | Accept null for optional numeric fields |
| `backend/src/profiles/profiles.module.ts` | NEW | Profiles module (controller + service) |
| `backend/src/app.module.ts` | UPDATE | Import ProfilesModule |
| `backend/test/profiles.spec.ts` | NEW | 8 profile tests |
| `android/core_data/.../AlbaMotionController.kt` | FIX | calories = 0.0 |
| `android/app/.../ui/showcase/ProfileScreen.kt` | NEW | Profile screen composable |
| `android/app/.../AlbaApplication.kt` | UPDATE | PROFILE destination + route |
| `android/app/.../ui/showcase/ShowcaseScreens.kt` | UPDATE | onOpenProfile callback + quick action |
| `docs/06-security/p16-rls-policy-design.md` | NEW | RLS design |
| `docs/06-security/p16-rls-migration-plan.md` | NEW | RLS migration plan |
| `docs/03-architecture/p16-anonymous-session-profile-migration.md` | NEW | Session migration design |
| `docs/03-architecture/p16-workmanager-offline-sync-queue.md` | NEW | WorkManager design |

## Verification Matrix

| Gate | Status | Evidence |
|---|---|---|
| P15 physical closure | CONDITIONAL | OkHttp fix deployed, sync works via backend test |
| RLS design | PASS | docs/06-security/p16-rls-policy-design.md |
| RLS migration | PASS | docs/06-security/p16-rls-migration-plan.md |
| RLS application | PASS | 9/9 tables verified via pg_class |
| Profile backend | PASS | 40/40 tests, profiles.spec.ts |
| Android profile shell | PASS | build PASS, emulator QA |
| Anonymous session migration | PASS | design doc |
| WorkManager sync | PASS (design) | design doc, P17 plan |
| Emulator QA | PASS | screenshots, APK installed |
| Physical smoke | BLOCKED | no game replay |
| Security regression | PASS | no secrets, no PII |
| Tests | PASS | 40/40 backend, Android PASS |
| Full verification | PASS | 9/9 (8th consecutive) |

## Device / Emulator Coverage

- **emulator**: Pixel_7 API 37 (emulator-5554) — APK installed, app launched
- **physical**: Xiaomi M2007J3SI (cffbc068) — APK installed, app launched, OkHttp POST reaches backend (logcat confirmed), calories fix pending physical game replay

## Database

| Metric | Before P16 | After P16 |
|---|---|---|
| GameSession count | 4 | 6 |
| New sessions | — | 2 (fix test + backend smoke) |
| RLS enabled tables | 37/46 | 46/46 (all) |
| RLS disabled legacy | 9 | 0 |

## Security

- secrets_leaked: None
- rls_status: All 46 tables RLS enabled
- service_role_client_exposure: None (anon key is publishable, unused dead code)
- PII collected: None (displayName only, optional)

## Remaining Debt

| ID | Severity | Area | Plan |
|---|---|---|---|
| SYNC-001 | P2 | Xiaomi physical OkHttp sync | P17 physical smoke |
| SYNC-002 | P2 | WorkManager offline queue | P17 implementation |
| PROFILE-001 | P2 | Auth integration | P18+ |
| PROFILE-002 | P3 | Session history UI | P18 |

## Release Decision

- **Continue beta:** YES — profile foundation + RLS enforcement complete
- **Hotfix required:** No
- **Move to P17:** CONDITIONAL — OkHttp sync fix deployed, needs physical device verification
- **Blocked by:** Nothing critical

## P17 Candidate Priorities

1. Physical Xiaomi OkHttp sync smoke (P16.0 closure)
2. WorkManager offline sync queue implementation
3. Guest token persistence on device
4. Session history UI
5. Auth provider integration design
6. Leaderboard foundation
