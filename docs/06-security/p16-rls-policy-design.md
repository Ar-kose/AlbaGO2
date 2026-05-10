# P16 RLS Policy Design

**Date:** 2026-05-09
**Source:** P15 RLS Audit (9 tables, RLS disabled)
**Context:** Backend-only architecture — Android app calls NestJS API, NestJS uses Prisma → Supabase PostgreSQL. No direct client-to-Supabase access.

## Architecture Reality

```
Android (anon key unused) → NestJS (Prisma, service-role DB connection) → Supabase PostgreSQL
```

RLS policies do NOT affect backend service-role access (service_role bypasses RLS). Enabling RLS is defense-in-depth for:
1. Accidental anon-key direct access in future
2. Supabase dashboard / SQL editor exposure
3. Multi-tenant readiness
4. Compliance baseline

## Table Inventory & Policy Decisions

### 1. `_prisma_migrations` — Prisma internal (4 rows)

| Attribute | Value |
|---|---|
| Data class | Backend-only (Prisma internal) |
| Client direct access | Never |
| RLS action | **Enable RLS, no policy** (table inaccessible to anon/authenticated roles) |
| Migration | `ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;` |
| Rollback | `ALTER TABLE "_prisma_migrations" DISABLE ROW LEVEL SECURITY;` |

### 2. `User` — User accounts (0 rows)

| Attribute | Value |
|---|---|
| Data class | Backend-only (PII: guestToken) |
| Client direct access | Never |
| RLS action | **Enable RLS, no policy** (backend-only table) |
| Rationale | Contains guestToken (user identifier). No scenario where client reads/writes directly. |
| Migration | `ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;` |
| Rollback | `ALTER TABLE "User" DISABLE ROW LEVEL SECURITY;` |

### 3. `AuditLog` — Admin audit trail (0 rows)

| Attribute | Value |
|---|---|
| Data class | Backend-only (admin audit data) |
| Client direct access | Never |
| RLS action | **Enable RLS, no policy** (backend-only table) |
| Rationale | Audit integrity. Only backend writes. Client never reads. |
| Migration | `ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;` |
| Rollback | `ALTER TABLE "AuditLog" DISABLE ROW LEVEL SECURITY;` |

### 4. `Device` — Device registrations (0 rows)

| Attribute | Value |
|---|---|
| Data class | User-owned metadata |
| Client direct access | No (currently backend-only) |
| RLS action | **Enable RLS, backend-only policy** |
| Rationale | Low sensitivity but linked to User. No current client access pattern. |
| Migration | `ALTER TABLE "Device" ENABLE ROW LEVEL SECURITY;` |
| Rollback | `ALTER TABLE "Device" DISABLE ROW LEVEL SECURITY;` |

### 5. `GameDefinition` — Game definitions (6 rows)

| Attribute | Value |
|---|---|
| Data class | Public content (admin-published games) |
| Client direct access | Read-only possible in future |
| RLS action | **Enable RLS, public-read policy** |
| Policy | `CREATE POLICY "public_read" ON "GameDefinition" FOR SELECT USING (true);` |
| Rationale | Published game content is public. Only admin writes via backend. |
| Migration | `ALTER TABLE "GameDefinition" ENABLE ROW LEVEL SECURITY;` + public-read policy |
| Rollback | Drop policy + disable RLS |

### 6. `GameLevel` — Game levels (6 rows)

| Attribute | Value |
|---|---|
| Data class | Public content (child of GameDefinition) |
| Client direct access | Read-only possible in future |
| RLS action | **Enable RLS, public-read policy** |
| Policy | `CREATE POLICY "public_read" ON "GameLevel" FOR SELECT USING (true);` |
| Migration | `ALTER TABLE "GameLevel" ENABLE ROW LEVEL SECURITY;` + public-read policy |
| Rollback | Drop policy + disable RLS |

### 7. `GameSession` — Game session results (4 rows)

| Attribute | Value |
|---|---|
| Data class | **User-owned data (HIGH sensitivity)** |
| Client direct access | Write via backend, future read-own possible |
| RLS action | **Enable RLS, user-owned policy (via userId column)** |
| Policy | Backend sets `current_setting('app.current_user_id')` before queries. Policy: `CREATE POLICY "user_own" ON "GameSession" FOR ALL USING ("userId" = current_setting('app.current_user_id'));` |
| Rationale | Contains user game history, scores. Must be isolated per user if direct access is ever opened. |
| Migration | `ALTER TABLE "GameSession" ENABLE ROW LEVEL SECURITY;` + user-owned policy |
| Rollback | Drop policy + disable RLS |

### 8. `WorkoutSession` — Workout tracking (0 rows)

| Attribute | Value |
|---|---|
| Data class | User-owned data |
| Client direct access | Write via backend, future read-own possible |
| RLS action | **Enable RLS, user-owned policy** |
| Policy | Same pattern as GameSession: `CREATE POLICY "user_own" ON "WorkoutSession" FOR ALL USING ("userId" = current_setting('app.current_user_id'));` |
| Migration | `ALTER TABLE "WorkoutSession" ENABLE ROW LEVEL SECURITY;` + user-owned policy |
| Rollback | Drop policy + disable RLS |

### 9. `RewardGrant` — Reward grants (0 rows)

| Attribute | Value |
|---|---|
| Data class | User-owned data |
| Client direct access | Write via backend only |
| RLS action | **Enable RLS, user-owned policy** |
| Policy | `CREATE POLICY "user_own" ON "RewardGrant" FOR ALL USING ("userId" = current_setting('app.current_user_id'));` |
| Migration | `ALTER TABLE "RewardGrant" ENABLE ROW LEVEL SECURITY;` + user-owned policy |
| Rollback | Drop policy + disable RLS |

## Summary Matrix

| Table | RLS Action | Policy | Risk Level |
|---|---|---|---|
| `_prisma_migrations` | Enable, no policy | Backend-only | None |
| `User` | Enable, no policy | Backend-only | Low (PII, backend-only) |
| `AuditLog` | Enable, no policy | Backend-only | Low |
| `Device` | Enable, no policy | Backend-only (for now) | Low |
| `GameDefinition` | Enable + public-read | `SELECT USING (true)` | Low (public content) |
| `GameLevel` | Enable + public-read | `SELECT USING (true)` | Low (public content) |
| `GameSession` | Enable + user-owned | `USING ("userId" = current_setting(...))` | **High** |
| `WorkoutSession` | Enable + user-owned | `USING ("userId" = current_setting(...))` | High |
| `RewardGrant` | Enable + user-owned | `USING ("userId" = current_setting(...))` | Medium |

## Implementation Gate Rules

1. **Safe to apply immediately** (data-loss risk: none): `_prisma_migrations`, `GameDefinition`, `GameLevel`, `AuditLog`, `Device`
2. **Safe but test first** (low traffic, 0 rows): `User`, `WorkoutSession`, `RewardGrant`
3. **Requires backend session variable setup**: `GameSession` (4 existing rows, active write path)

## Backend Session Variable Pattern

For user-owned tables, the NestJS backend must set the current user context before queries:

```typescript
// In Prisma service or middleware
await this.prisma.$executeRawUnsafe(
  `SELECT set_config('app.current_user_id', $1, true)`,
  userId
);
```

This is NOT required in P16 since all access is through backend service role (which bypasses RLS). It becomes necessary only if direct client access is enabled.

## Decision

- **All 9 tables: Enable RLS** — no data loss, no backend impact (service role bypasses RLS)
- **Public content tables**: Add public-read policies
- **User-owned tables**: Add user-owned policies with `app.current_user_id` session variable
- **Backend-only tables**: Enable RLS with no policies (complete lockout from anon/authenticated)
- **Rollback**: All changes reversible via `DISABLE ROW LEVEL SECURITY`
