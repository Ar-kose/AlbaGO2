# P16.4 Profile Domain Model & Backend API

**Date:** 2026-05-09 23:45:00
**Previous:** P16.3 = PASS
**Decision: PASS**

---

## Summary

Profiles module created with NestJS controller, service, Prisma persistence, and in-memory fallback. 8 tests pass. Device-profile semantics (no auth required).

## Files Changed

| File | Change |
|---|---|
| `backend/src/profiles/profiles.module.ts` | NEW — ProfilesService + ProfilesController |
| `backend/src/app.module.ts` | Added ProfilesModule import |
| `backend/test/profiles.spec.ts` | NEW — 8 profile tests |

## API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/v1/profiles/me` | X-Alba-Guest-Token or X-Alba-Device-Id header | Get or create device profile |
| PUT | `/v1/profiles/me` | X-Alba-Guest-Token header required | Update displayName |

## ProfileResponse

```json
{
  "id": "user_xxx",
  "guestToken": "guest-xxx",
  "displayName": "Test User",
  "status": "ACTIVE",
  "createdAt": "2026-05-09T...",
  "note": "Device profile. Account system pending."
}
```

## Design Decisions

- No PII collected (displayName only, optional)
- Guest token identifies device/user without auth
- Honest `note` field: "Account system pending"
- Prisma `User` model used for persistence
- In-memory fallback when DATABASE_URL missing

## Test Results

```
PASS test/profiles.spec.ts
  getOrCreateProfile
    ✓ creates a guest profile when no token exists
    ✓ returns the same profile for the same guest token
    ✓ creates different profiles for different tokens
  updateProfile
    ✓ updates displayName for an existing profile
    ✓ rejects update without a guest token
    ✓ rejects empty displayName
    ✓ rejects update for non-existent profile
    ✓ returns note about account system pending
```

Backend: 40/40 tests PASS
