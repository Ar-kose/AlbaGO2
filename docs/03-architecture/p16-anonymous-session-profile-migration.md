# P16 Anonymous Session to Profile Migration Design

**Date:** 2026-05-09
**Context:** P14/P15 local-first anonymous sessions, P16 profile foundation

## Current State

- Game sessions are created with `clientSessionKey` (local UUID)
- No user/profile association exists
- Sessions are stored locally on device
- Backend sync is non-blocking, local-first
- `GameSession.userId` is nullable (String?)

## Migration Principles

1. **No automatic PII association** — user must explicitly opt in
2. **Local sessions are never lost** — migration is additive, not destructive
3. **Duplicate prevention by `clientSessionKey`** — existing idempotency preserved
4. **Profile creation is explicit** — no background profile generation

## Migration Design

### Phase 1: Current (P15/P16)

```
Device → Local Session (clientSessionKey: "game-local-{timestamp}")
       → Backend Sync (POST /v1/game-sessions)
       → DB GameSession (userId: null, clientSessionKey set)
```

Anonymous sessions have `userId = null`. They belong to a device, not a user.

### Phase 2: Profile Creation (P16+)

When user creates a profile:
1. Server generates `User` record with `guestToken`
2. Local device stores `guestToken` in SharedPreferences
3. New sessions include `guestToken` via header
4. Backend associates `GameSession.userId` with the User's id

### Phase 3: Historical Migration (P17+)

When profile system is ready:
1. User sees "X oturumun profilinde degil. Tasimak ister misin?" prompt
2. On consent, client sends `POST /v1/profiles/me/migrate-sessions` with list of `clientSessionKey`s
3. Backend updates `GameSession.userId` for matching sessions where `userId IS NULL`
4. Response: `{ migrated: N, duplicates: M, skipped: K }`
5. No sessions are moved without explicit consent

## Data Integrity

| Scenario | Action |
|---|---|
| Duplicate clientSessionKey | Backend returns `duplicate_accepted` (existing idempotency) |
| Session already owned by another user | Skip, do not reassign |
| User deletes profile | Sessions revert to anonymous (userId set to null) |
| Multiple devices, same user | Each device has own guestToken until unified account |

## Privacy Disclosure (Future)

When profile migration is offered:
> "Cihazinda kayitli oyun sonuclarini profiline tasimak ister misin? 
> Bu islem sonuclarinin sana ait oldugunu kaydeder ve 
> gelecekte hesap sistemine baglanabilir. 
> Verilerin cihazinda kalmaya devam eder."

## Implementation Sequence

1. P16: Profile module (backend) + profile shell (Android) - DONE
2. P17: `guestToken` persisted on device, sent as header with session requests
3. P18: Migration endpoint + UI prompt
4. P19: Full auth integration (Supabase Auth or similar)

## Decision

- **No auto-migration** — explicit user action required
- **No data loss** — anonymous sessions remain accessible
- **clientSessionKey preserved** — idempotency across migration
- **Opt-out supported** — user can decline session migration
