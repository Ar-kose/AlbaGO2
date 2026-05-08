# Platform v2 RC — PR Description Draft

## What changed

Platform v2 is a five-gate verification and stabilization pass that converts the AlbaGo prototype into a reviewable, evidence-backed release candidate. No new product features were added — this is verification, bug fixing, packaging, documentation, and handoff preparation.

### Core changes across gates

**P0 — Platform Verification Tooling**
- Added `scripts/verify-platform-v2.ps1` for deterministic gate checks.
- Added `scripts/preflight-physical-device.ps1`, `scripts/accept-device-demo.ps1`, and `scripts/check-android-crash-log.ps1`.

**P1 — Physical Device Acceptance**
- Captured demo videos for Fruit Slash, Dodge Run, and Fit Challenge on physical device `cffbc068` (M2007J3SI, Android 12).
- Crash logs scanned and clean for all three games.

**P2 — Game Session Persistence & Android Result Sync**
- Backend: `POST /v1/game-sessions` with idempotent `clientSessionId` handling, Prisma-backed persistence.
- Android: async result submission with local result preservation on network failure.
- New migration: `20260508152000_game_session_result_submission`.

**P3 — Admin Publish QA & Remote Scene Play**
- Backend: Game Definition V3 with SCENE_PLAY template, sceneConfig, interactionRules.
- Android: V3 parser fix — `sceneConfig` and `interactionRules` were previously dropped from remote definitions.
- Admin: API client updates for publish QA flow.

**P4 — RC Packaging & Evidence Bundle**
- Debug RC APK built, checksum generated, evidence index created.
- npm audit triaged (5 findings → 0 backend after safe fix, 2 admin deferred).
- Working tree reviewed, ownership-unclear files excluded.

**P5 — Post-RC Stabilization & Git Hygiene**
- RC integrity confirmed (SHA256 match).
- Working tree classified into 10 proposed commit groups.
- Safe npm audit fix applied to backend (0 vulnerabilities).
- Release notes and PR description drafted.

## Verification

All gates passed with these verification runs:

| Check | Result |
|-------|--------|
| Backend build | PASS |
| Backend tests | 32/32 PASS |
| Admin build | PASS (Next.js 14.2.16) |
| Android unit tests | PASS |
| Android APK build | PASS |
| Physical device cold launch | PASS (cffbc068) |
| P4 RC physical smoke | PASS |
| npm audit (backend) | 0 vulnerabilities |
| npm audit (admin) | 2 deferred |

## Evidence

- `artifacts/verification/p4-evidence-index-20260508-170015.md` — full P0-P4 index
- `artifacts/verification/p5-working-tree-classification-20260508-171320.md` — file classification
- `artifacts/verification/p5-commit-proposal-20260508-171320.md` — commit grouping plan
- `artifacts/release/albago-platform-v2-rc-20260508-170015/` — RC APK + checksum + metadata

## Known non-blockers

1. Manual catalog tap validation — ADB input blocked on test device; QA direct launch covers demos.
2. npm audit admin — 2 findings (next/postcss); fix requires forced downgrade, deferred.
3. Working tree dirty — .agent/ files and design exports excluded; human commit approval needed.

## Rollback / recovery

- This is a verification/docs/packaging branch. No destructive schema changes.
- Backend migration is additive (`game_sessions` table).
- Android changes are additive (new V3 parser, new sync path).
- Rollback: revert to `main` and re-run `scripts/verify-platform-v2.ps1`.

## Review focus

1. **Backend session persistence** — `backend/src/game-sessions/`, `backend/src/persistence/game-sessions.repository.ts`
2. **Android result sync** — `android/core_network/`, `android/core_runtime/`
3. **V3 game definition parser** — `android/core_runtime/.../GameDefinitionV3.kt`, `backend/src/common/game-definition-v3.ts`
4. **OpenAPI contract** — `openapi/alba-api.yaml`
5. **Commit grouping** — `artifacts/verification/p5-commit-proposal-20260508-171320.md`
