# P16 RLS Migration Plan

**Date:** 2026-05-09
**Design:** docs/06-security/p16-rls-policy-design.md
**Architecture:** Backend-only access via NestJS/Prisma → Supabase PostgreSQL (service role)

## Pre-Migration Validation

### Step 0: Verify backend health

```powershell
Invoke-RestMethod http://localhost:3000/v1/game-definitions/active
```

### Step 1: Snapshot current RLS state

```sql
SELECT c.relname, c.relrowsecurity
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind = 'r'
AND c.relname IN ('_prisma_migrations','User','AuditLog','Device','GameDefinition','GameLevel','GameSession','WorkoutSession','RewardGrant')
ORDER BY c.relname;
```

### Step 2: Verify no active client connections to these tables

All tables are backend-only access. No client SDK or anon-key reads exist.

## Migration SQL (Safe Order)

### Batch 1: Backend-only tables (no policies)

These tables have no client access path. Enabling RLS with no policies means they become inaccessible to anon/authenticated roles — which is correct since only backend service_role touches them.

```sql
-- Batch 1: Backend-only tables
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Device" ENABLE ROW LEVEL SECURITY;
```

### Batch 2: Public content tables

These tables may be read by clients in the future. Read-only policy for SELECT.

```sql
ALTER TABLE "GameDefinition" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read" ON "GameDefinition" FOR SELECT USING (true);

ALTER TABLE "GameLevel" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public_read" ON "GameLevel" FOR SELECT USING (true);
```

### Batch 3: User-owned tables (data exists in GameSession)

GameSession has 4 test rows. User-owned policy uses `current_setting('app.current_user_id')` which is NULL when not set — policy blocks access from anon/authenticated roles, but service_role bypasses.

```sql
ALTER TABLE "GameSession" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_own" ON "GameSession" FOR ALL USING ("userId" = current_setting('app.current_user_id', true));

ALTER TABLE "WorkoutSession" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_own" ON "WorkoutSession" FOR ALL USING ("userId" = current_setting('app.current_user_id', true));

ALTER TABLE "RewardGrant" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_own" ON "RewardGrant" FOR ALL USING ("userId" = current_setting('app.current_user_id', true));
```

## Post-Migration Smoke Tests

### 1. Backend active games endpoint
```powershell
Invoke-RestMethod http://localhost:3000/v1/game-definitions/active
```
Expected: Returns game list (backend uses service_role, bypasses RLS).

### 2. Game session submit
```powershell
$body = '{"clientSessionKey":"rls-smoke-test","gameKey":"fruit-slash","score":100,"durationSec":15}'
Invoke-RestMethod -Method POST -Uri http://localhost:3000/v1/game-sessions -Body $body -ContentType "application/json"
```
Expected: Session created. Backend Prisma writes via service_role, bypasses RLS.

### 3. Admin publish guard
Expected: Admin panel publish functionality unchanged.

### 4. Anon access block verification
```powershell
# Using Supabase anon key directly to read GameSession (should fail)
curl -H "apikey: sb_publishable_LjR_DV-Ksp19GtwBNQCCvg_YX_iWoZA" \
  "https://cszfdskmawqgjoxpkull.supabase.co/rest/v1/GameSession?select=count"
```
Expected: Blocked or returns empty (RLS policy denies anon).

### 5. Backend test suite
```powershell
npm.cmd run test --workspace backend
```
Expected: All 32+ tests pass.

## Rollback SQL

```sql
-- Batch 3 rollback (user-owned)
DROP POLICY IF EXISTS "user_own" ON "RewardGrant";
ALTER TABLE "RewardGrant" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_own" ON "WorkoutSession";
ALTER TABLE "WorkoutSession" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_own" ON "GameSession";
ALTER TABLE "GameSession" DISABLE ROW LEVEL SECURITY;

-- Batch 2 rollback (public content)
DROP POLICY IF EXISTS "public_read" ON "GameLevel";
ALTER TABLE "GameLevel" DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read" ON "GameDefinition";
ALTER TABLE "GameDefinition" DISABLE ROW LEVEL SECURITY;

-- Batch 1 rollback (backend-only)
ALTER TABLE "Device" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "User" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "_prisma_migrations" DISABLE ROW LEVEL SECURITY;
```

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Backend can't read tables after RLS | Very Low | High | Service role bypasses RLS |
| GameSession write fails | Very Low | Medium | Service role bypasses RLS |
| Admin publish breaks | Very Low | Medium | Service role bypasses RLS |
| Anon-key exposure exploited | Low | High | RLS now blocks even if key leaks |
| Prisma migration table lock | Very Low | Low | `_prisma_migrations` is low-traffic |

## Application Gate

- P16.1 design approved
- Backend smoke tests pass
- Admin panel functional
- No data loss
- Rollback SQL ready
