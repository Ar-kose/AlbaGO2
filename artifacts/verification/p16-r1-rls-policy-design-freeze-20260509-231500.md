# P16.1 RLS Policy Design Freeze

**Date:** 2026-05-09 23:15:00
**Previous:** P15 = CONDITIONAL PASS
**Decision: PASS**

---

## Summary

9 Prisma-mapped table (all camelCase) for RLS policies designed. Architecture confirmed: Android → NestJS backend → Prisma → Supabase PostgreSQL. No direct client-to-Supabase access; anon key in build.gradle.kts is unused (dead code). RLS is defense-in-depth.

## Design Decisions

| Table | RLS Action | Policy | Rationale |
|---|---|---|---|
| `_prisma_migrations` | Enable, no policy | Backend-only | Prisma internal |
| `User` | Enable, no policy | Backend-only | Contains guestToken (PII) |
| `AuditLog` | Enable, no policy | Backend-only | Audit integrity |
| `Device` | Enable, no policy | Backend-only | Linked to User |
| `GameDefinition` | Enable + public-read | SELECT USING(true) | Published content |
| `GameLevel` | Enable + public-read | SELECT USING(true) | Published content |
| `GameSession` | Enable + user-owned | USING userId | User game history |
| `WorkoutSession` | Enable + user-owned | USING userId | User workout data |
| `RewardGrant` | Enable + user-owned | USING userId | User rewards |

## Key Finding

Service role bypasses RLS — all backend operations continue unaffected. RLS only blocks anon/authenticated role access, which currently doesn't exist (client uses NestJS API, not Supabase SDK).

## Files

- Design: `docs/06-security/p16-rls-policy-design.md`
- Migration plan: `docs/06-security/p16-rls-migration-plan.md`
