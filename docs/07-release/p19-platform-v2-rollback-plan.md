# P19 platform-v2 Rollback Plan

**Date:** 2026-05-10
**Branch:** `platform-v2` → `main`
**Rollback target:** `bde3b5b` (Supabase entegrasyonu, admin panel güncellemeleri)

---

## Trigger Conditions

| Condition | Action |
|---|---|
| App crash on cold launch | Immediate rollback |
| Game session data loss (local or server) | Rollback + data recovery |
| WorkManager duplicate storm | Disable worker, rollback queue code |
| RLS blocks backend game-sessions POST | Rollback RLS policies |
| Profile endpoint breaks app | Disable profile route, keep rest |
| Secret leak detected | Immediate rollback + key rotation |

## Rollback Steps

### Full Rollback (catastrophic)

```bash
git revert ad38b88 b07473e  # Revert P13-P18 + P8-P12
git push origin main
```

### Partial Rollback Options

**RLS only:**
```sql
-- Run rollback SQL from docs/06-security/p16-rls-migration-plan.md
ALTER TABLE "GameSession" DISABLE ROW LEVEL SECURITY;
-- ... (repeat for all 9 tables)
```

**Room/Worker only:**
- Remove `core_data/src/main/java/.../local/` directory
- Revert `AlbaMotionController.kt` syncFinishedGame changes
- Revert ProfileScreen Room dependency

**Profile only:**
- Revert `backend/src/profiles/`
- Revert `ProfileScreen.kt`

## Data Safety

| Data | Rollback Impact |
|---|---|
| Local Room sessions | Survive rollback (DB file on device) |
| Backend GameSession rows | Survive (no schema drop) |
| RLS policies | Need manual SQL rollback |
| Profile API routes | Removed, no data loss |

## Recovery Verification

After rollback:
1. `npm run test --workspace backend` → 32/32 PASS (pre-profile count)
2. `./gradlew :app:assembleDebug` → BUILD SUCCESSFUL
3. App cold launch → no crash
4. Game play → result screen OK
5. Sync → reaches backend
