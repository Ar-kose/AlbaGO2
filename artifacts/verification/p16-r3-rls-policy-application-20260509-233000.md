# P16.3 RLS Policy Application

**Date:** 2026-05-09 23:30:00
**Previous:** P16.2 = PASS
**Decision: PASS**

---

## Summary

RLS policies applied successfully to all 9 camelCase Prisma tables. 3-batch migration executed via Supabase MCP. Post-migration smoke tests pass.

## Migration Results

| Batch | Tables | Status |
|---|---|---|
| Batch 1 | `_prisma_migrations`, `User`, `AuditLog`, `Device` | APPLIED |
| Batch 2 | `GameDefinition`, `GameLevel` | APPLIED + public_read policy |
| Batch 3 | `GameSession`, `WorkoutSession`, `RewardGrant` | APPLIED + user_own policy |

## Verification

| Check | Result |
|---|---|
| All 9 tables RLS enabled | PASS (verified via pg_class.relrowsecurity) |
| Backend active games endpoint | PASS |
| Backend session submit (with fix) | PASS (game_session_8903b35a stored) |
| Backend build | PASS |

## Bug Found & Fixed

During smoke testing discovered that Android sends `calories: null` which the backend validation rejected as "calories must be numeric". Fixed in `backend/src/game-sessions/game-sessions.module.ts` line 207: added `dto.calories !== null` check alongside `!== undefined`.

## Rollback

Complete rollback SQL in `docs/06-security/p16-rls-migration-plan.md`. All changes reversible.
