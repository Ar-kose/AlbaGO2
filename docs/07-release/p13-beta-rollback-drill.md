# P13 Beta Rollback Drill

**Date:** 2026-05-09
**Pilot:** P13 Controlled Beta

## Rollback Triggers

Rollback is initiated when:

- P0 crash discovered in distributed APK
- P1 widespread blocker affecting all testers
- Security vulnerability found in the build
- Backend data corruption detected
- Wrong APK artifact distributed

## Rollback Target

- **APK:** `artifacts/release/p12-secure-beta-pilot-20260509-160000/app-debug.apk`
- **SHA256:** `0c37185af6074a94b757fe4ed98c4b7df2e0d4ae8e25d53d3a0a8d6de63eb756`
- **Version:** 0.1.0 (P12 Secure Beta)

## Rollback Steps

1. **Stop distribution** — Remove any new APK from shared location
2. **Notify testers** — Send message: "New build revoked. Revert to P12 secure beta package. SHA256: 0c37185..."
3. **Reinstall previous APK** — Testers run `adb install -r app-debug.apk` with the P12 package
4. **Preserve backend** — Do NOT roll back Supabase database; persistent data is valuable
5. **Halt admin publish** — Freeze content changes until issue resolved
6. **Collect logs** — Gather all crash logs and session data for debugging
7. **Patch forward** — Create hotfix, verify, re-distribute

## Rollback Verification

| Step | Status | Notes |
|---|---|---|
| Distribution stopped | — | — |
| Testers notified | — | — |
| P12 APK reinstalled | — | — |
| Backend data preserved | — | — |
| Admin publish halted | — | — |
| Logs collected | — | — |
| Patch ready | — | — |

## Tester Notification Template

```
ALBAGO BETA — ROLLBACK NOTICE

The current beta build has been revoked due to a critical issue.

Please reinstall the previous stable build:
  SHA256: 0c37185af6074a94b757fe4ed98c4b7df2e0d4ae8e25d53d3a0a8d6de63eb756

Command:
  adb install -r app-debug.apk

Verify hash before testing:
  Get-FileHash app-debug.apk -Algorithm SHA256

You will be notified when a new build is available.
```

## Drill Result

| Attempt | Date | Result | Notes |
|---|---|---|---|
| — | — | Not yet executed | — |
