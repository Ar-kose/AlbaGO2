# Release Checklist

## 2026-05-08 Platform v2 Demo Acceptance Status

- P0 deterministic verification gate: PASS
- Backend build/test: PASS
- Admin production build: PASS
- Android `:core_runtime:testDebugUnitTest`: PASS
- Android `:app:testDebugUnitTest`: PASS
- Android `:app:assembleDebug`: PASS
- Physical device acceptance completed: PASS on `cffbc068` (`M2007J3SI`, Android 12)
- Demo video captured: PASS for Fruit Slash, Dodge Run and Fit Challenge
- Manual catalog tap validation: PENDING human touch / mirroring validation if needed
- Remote config publish/refresh on device: PASS (P3), game `p3_scene_play_deve_cuce_20260508-163452` published and verified
- Game session result sync: PASS by backend and Android tests; optional physical backend-write smoke remains a follow-up
- Workout session sync verified on device: NOT STARTED, future scope
- P1 recovery pass on branch `platform-v2`: PASS, physical device visible through `adb devices -l`
- P2 session persistence/result sync: PASS
- P3/P4 expansion: P3 PASS (2026-05-08), P4 PASS (2026-05-08)

P4 release candidate checklist:

- [x] P0 platform verification passed
- [x] P1 physical-device acceptance passed
- [x] P2 session persistence passed
- [x] P3 admin publish QA passed
- [x] P4 final verification passed
- [x] P4 working tree review completed
- [x] P4 npm audit triaged (5 findings, accepted non-blocking)
- [x] RC APK artifact produced
- [x] SHA256 checksum generated
- [x] RC metadata written
- [x] Evidence index generated
- [x] RC physical smoke test passed (device cffbc068)
- [x] Documentation finalized (README, changelog, known-issues, release-checklist, sprint-log)
- [x] P4 release candidate summary written
- [x] Known issues reviewed and classified

P1 readiness checklist:

- [x] P0 platform verification passed
- [x] Android SDK path detection normalized
- [x] Physical-device preflight script added
- [x] Device acceptance script added in fail-fast mode
- [x] Android crash log scanner added
- [x] Physical Android device visible through `adb devices -l`
- [x] Debug APK installed on physical device
- [x] Cold launch crash log captured
- [x] Fruit Slash physical demo video captured
- [x] Dodge Run physical demo video captured
- [x] Fit Challenge physical demo video captured
- [x] Crash logs scanned with no fatal signatures
- [x] P1 release evidence bundle complete

P2 session persistence checklist:

- [x] Backend `POST /v1/game-sessions` accepts completed game results
- [x] Backend validates required fields and rejects invalid payloads
- [x] Duplicate `clientSessionId` submissions are idempotent
- [x] Game session result payload persists through repository boundary
- [x] Android submits completed game results asynchronously
- [x] Android sync failure does not crash or block the local result screen
- [x] OpenAPI updated for game-session result submission
- [x] Backend build/tests passed
- [x] Admin build passed
- [x] Android compile/unit tests/debug assemble passed

Evidence:

- `artifacts/verification/platform-v2-20260508.log`
- `artifacts/verification/device-prep-20260508.log`
- `artifacts/verification/p1-device-acceptance-summary-20260508.md`
- `artifacts/verification/physical-device-preflight-20260508-121938.log`
- `artifacts/verification/p1-device-acceptance-summary-20260508-121945.md`
- `artifacts/verification/working-tree-inventory-20260508-123126.md`
- `artifacts/verification/p1-readiness-change-set-20260508-123126.md`
- `artifacts/verification/physical-device-preflight-20260508-123217.log`
- `artifacts/verification/p1-device-acceptance-summary-20260508-123222.md`
- `artifacts/verification/physical-device-preflight-20260508-150853.log`
- `artifacts/verification/p1-device-acceptance-summary-20260508-150858.md`
- `artifacts/verification/p1-evidence-index-20260508-151309.md`
- `artifacts/crash-reports/p1-cold-launch-20260508-150858.log`
- `artifacts/crash-reports/fruit-slash-20260508-150858.log`
- `artifacts/crash-reports/dodge-run-20260508-150858.log`
- `artifacts/crash-reports/fit-challenge-20260508-150858.log`
- `artifacts/demo-videos/fruit-slash-20260508-150858.mp4`
- `artifacts/demo-videos/dodge-run-20260508-150858.mp4`
- `artifacts/demo-videos/fit-challenge-20260508-150858.mp4`
- `artifacts/verification/p2-session-inventory-20260508-152120.md`
- `artifacts/verification/p2-backend-admin-verification-20260508-153739.log`
- `artifacts/verification/p2-android-verification-20260508-153813.log`
- `artifacts/verification/p2-session-persistence-summary-20260508-153911.md`

## Branding

- Visible product name updated from `Alba` to `AlbaGo`
- Android app label shows `AlbaGo`
- Admin metadata and headers show `AlbaGo`
- OpenAPI and Swagger title/description use `AlbaGo`

## Android

- Camera permission flow verified at workout or Motion Lab entry
- QA backend override works in debug build
- Remote game definition fetch fallback order verified
- Game session result sync flow verified by Android unit/compile/build checks
- Workout session sync remains future scope

P3 admin publish QA checklist:

- [x] Admin/backend can publish Scene Play game
- [x] Active game definitions endpoint includes published game
- [x] Android can refresh and launch remote game without rebuild
- [x] P3 physical demo video captured
- [x] P3 crash log scan passed
- [x] Backend tests: 32/32 pass
- [x] Android compilation, unit tests, APK assembly: PASS
- [x] P2 session sync still works for remote game
- [x] P3 evidence summary written

P3 evidence:

- `artifacts/verification/p3-admin-publish-inventory-20260508-000000.md`
- `artifacts/verification/p3-publish-scene-play-20260508-163452.md`
- `artifacts/verification/p3-published-game-payload-20260508-163452.json`
- Physical device acceptance completed and demo videos captured - PASS on 2026-05-08 using device `cffbc068`

## Backend

- OpenAPI contract updated
- Publish validation and reward idempotency tests passed
- Session create idempotency by `clientSessionKey` verified
- Completed game result submission idempotency by `clientSessionId` verified
- Prisma client generated
- Migration and seed flow documented
- Audit log persistence path verified
  - P0 verification on 2026-05-08 confirms Prisma generate, backend build and backend tests pass.

## Admin

- AlbaGo `TARGET_HIT` draft editor loads
- Publish validation surfaces missing fields correctly
- Publish and rollback flows still work
- Audit log remains visible

## Documentation

- `README.md` updated
- `openapi/alba-api.yaml` updated
- `changelog.md` updated
- `known-issues.md` updated
- Sprint log updated
- Product rename note recorded

## P6 Beta Readiness Gate

- [x] Backend build passes — PASS (NestJS)
- [x] Backend tests pass — PASS (32/32, 3 suites)
- [x] Admin build passes — PASS (Next.js 14.2.16)
- [x] Android unit tests pass — PASS (testDebugUnitTest)
- [x] Android debug APK assembles — PASS (113,605,914 bytes)
- [ ] Physical device cold launch passes — PENDING (device not connected)
- [ ] Manual catalog walkthrough passes — PENDING (device not connected)
- [ ] At least one completed session syncs to backend — PENDING (device not connected)
- [ ] Crash logs contain no AndroidRuntime fatal signatures — PENDING (device not connected)
- [x] Release package checksum is recorded — SHA256: `0869B549CEDE607CC312062BF100A85024540F9CD0044AC23D1D25A32F826C91`
- [x] Known issues are updated

**P6 Status: CONDITIONAL GO** — All automated verification passes. Physical device items pending device connection.

### P6 Evidence

- `artifacts/verification/p6-working-tree-inventory-20260508-230800.md`
- `artifacts/verification/p6-beta-readiness-summary-20260509-001700.md`
- `artifacts/verification/p6-manual-device-walkthrough-20260509-001700.md`
- `artifacts/verification/p6-release-risk-register-20260508-230800.md`
- `artifacts/verification/p6-session-sync-evidence-20260509-001700.md`
- `artifacts/verification/p6-admin-publish-refresh-evidence-20260509-001700.md`

### P6 Decision Criteria

| Decision | Criteria |
|----------|----------|
| **GO** | All automated tests green; physical device cold launch + manual walkthrough pass; >=1 session synced; no fatal crash; known issues non-critical or clearly workarounded |
| **CONDITIONAL GO** | Automated tests green; manual walkthrough partially successful; non-critical UX/device limitation with documented workaround |
| **NO-GO** | Android fatal crash; backend session persistence broken; publish validation bypassable; APK cannot assemble; unknown or unreproducible release artifact |
