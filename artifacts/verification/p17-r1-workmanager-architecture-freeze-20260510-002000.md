# P17.1 WorkManager Architecture Freeze

**Date:** 2026-05-10 00:20:00
**Decision: PASS**

---

## Summary

WorkManager + Room offline sync queue architecture frozen. Design documented in `docs/03-architecture/p17-workmanager-offline-sync-architecture.md`.

## Architecture

```
Game Finished → LOCAL_SAVED → Room saveAndEnqueue → QUEUED
→ WorkManager OneTimeWorkRequest → SYNCING
→ OkHttp POST → SYNCED | RETRY_SCHEDULED | FAILED_PERMANENT
```

## Components

- Room database: `AlbaDatabase` (2 entities, 2 DAOs)
- Repository: `GameSessionRepository`
- Worker: `GameSessionSyncWorker` (CoroutineWorker)
- Backoff: Exponential, 30s base, 5 max attempts
- Network constraint: CONNECTED
- Idempotency: Backend `clientSessionKey` UNIQUE

## State Machine

```
LOCAL_SAVED → QUEUED → SYNCING → SYNCED
                          ↓
                    RETRY_SCHEDULED → SYNCING
                          ↓
                    FAILED_PERMANENT
```
