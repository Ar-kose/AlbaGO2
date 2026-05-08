# P4 Working Tree Review

Date: 2026-05-08 17:00
Branch: platform-v2

## Changed files (git status --short)

### Modified (staged or unstaged) — 37 files with actual diff
```
 M .claude/settings.local.json
 M README.md
 M admin/src/app/games/games-console.tsx
 M admin/src/app/page.tsx
 M admin/src/lib/alba-api.ts
 M android/app/build.gradle.kts
 M android/build.gradle.kts
 M android/core_data/build.gradle.kts
 M android/core_data/src/main/java/com/alba/core/data/AlbaMotionController.kt
 M android/core_data/src/main/java/com/alba/core/data/MotionUiState.kt
 M android/core_motion/src/main/java/com/alba/core/motion/MotionEngine.kt
 M android/core_motion/src/test/java/com/alba/core/motion/MotionDetectorsTest.kt
 M android/core_network/build.gradle.kts
 M android/core_network/src/main/java/com/alba/core/network/SupabaseAuth.kt
 M android/core_network/src/main/java/com/alba/core/network/SupabaseClient.kt
 M android/core_network/src/main/java/com/alba/core/network/SupabaseData.kt
 M android/core_network/src/main/java/com/alba/core/network/SupabaseModels.kt
 M android/core_network/src/main/java/com/alba/core/network/SupabaseRealtime.kt
 M android/core_network/src/main/java/com/alba/core/network/SupabaseStorage.kt
 M android/core_runtime/build.gradle.kts
 M android/core_runtime/src/main/java/com/alba/core/runtime/GameRuntime.kt
 M android/feature_games/src/main/java/com/alba/feature/games/GamesFeature.kt
 M android/gradle.properties
 M backend/prisma/schema.prisma
 M backend/src/common/contracts.ts
 M backend/src/game-sessions/game-sessions.module.ts
 M backend/src/games/games.module.ts
 M backend/src/persistence/persistence.module.ts
 M backend/test/publish-validation.spec.ts
 M docs/01-architecture/backend-architecture.md
 M docs/01-architecture/game-runtime-architecture.md
 M docs/01-architecture/mobile-architecture.md
 M docs/05-api/api-overview.md
 M docs/07-release/changelog.md
 M docs/07-release/known-issues.md
 M docs/07-release/release-checklist.md
 M openapi/alba-api.yaml
```

Diff stat: 37 files, +2751 -1090

### Untracked files (??)
```
?? .mcp.json
?? android/core_network/src/test/
?? android/core_runtime/src/main/java/com/alba/core/runtime/GameDefinitionV3.kt
?? android/core_runtime/src/test/
?? artifacts/crash-reports/dodge-run-20260508-150858.log
?? artifacts/crash-reports/fit-challenge-20260508-150858.log
?? artifacts/crash-reports/fruit-slash-20260508-150858.log
?? artifacts/crash-reports/p1-cold-launch-20260508-150858.log
?? artifacts/crash-reports/p3-scene-play-20260508-164931.log
?? artifacts/demo-videos/
?? artifacts/verification/
?? backend/prisma/migrations/20260508152000_game_session_result_submission/
?? backend/src/common/game-definition-v3.ts
?? backend/src/persistence/game-sessions.repository.ts
?? backend/test/game-definition-v3.spec.ts
?? backend/test/game-sessions.spec.ts
?? docs/07-release/p1-phone-connected-runbook.md
?? docs/08-sprint-logs/2026-05-platform-v2-build-verification.md
?? docs/08-sprint-logs/2026-05-sprint-04.md
?? docs/08-sprint-logs/2026-05-sprint-05.md
?? scripts/
```

### Modified but not in diff (only working-tree flag changes)
Large set of .agent/ files (skills, agents, workflows), stitch_* HTML files, and other config files show as modified with only line-ending or metadata changes.

## Expected P0/P1/P2/P3/P4 files

### P0 — Platform Verification
- artifacts/verification/platform-v2-20260508.log
- scripts/verify-platform-v2.ps1

### P1 — Physical Device Acceptance
- artifacts/verification/p1-device-acceptance-summary-20260508-150858.md
- artifacts/verification/p1-evidence-index-20260508-151309.md
- artifacts/crash-reports/p1-cold-launch-20260508-150858.log
- artifacts/crash-reports/fruit-slash-20260508-150858.log
- artifacts/crash-reports/dodge-run-20260508-150858.log
- artifacts/crash-reports/fit-challenge-20260508-150858.log
- artifacts/demo-videos/*.mp4

### P2 — Session Persistence
- artifacts/verification/p2-session-inventory-20260508-152120.md
- artifacts/verification/p2-session-persistence-summary-20260508-153911.md
- artifacts/verification/p2-backend-admin-verification-20260508-153720.log
- artifacts/verification/p2-backend-admin-verification-20260508-153739.log
- artifacts/verification/p2-android-verification-20260508-153813.log
- backend/prisma/migrations/20260508152000_game_session_result_submission/
- backend/src/game-sessions/game-sessions.module.ts
- backend/src/persistence/game-sessions.repository.ts
- backend/test/game-sessions.spec.ts

### P3 — Admin Publish QA
- artifacts/verification/p3-admin-publish-inventory-20260508-000000.md
- artifacts/verification/p3-admin-publish-qa-summary-20260508-163452.md
- artifacts/verification/p3-failed-draft-20260508-163418.json
- artifacts/verification/p3-publish-scene-play-20260508-163452.md
- artifacts/verification/p3-published-game-payload-20260508-163452.json
- artifacts/crash-reports/p3-scene-play-20260508-164931.log
- artifacts/demo-videos/p3-scene-play-20260508-164931.mp4
- backend/src/common/game-definition-v3.ts
- backend/test/game-definition-v3.spec.ts
- android/core_runtime/src/main/java/com/alba/core/runtime/GameDefinitionV3.kt

### P4 — Release Candidate (this sprint)
- artifacts/verification/p4-*.md (to be created)

## Unrelated / ownership-unclear files

The following should NOT be committed automatically:

1. **.agent/ directory** (~200 files) — agent framework skills, workflows, prompts. Ownership unclear; these are shared infrastructure files, not platform-v2 feature work.
2. **.claude/settings.local.json** — local Claude Code settings with potential local paths/tokens.
3. **stitch_a_l_ekran_splash/** — HTML design mockups, likely from design tool export, not part of the codebase build.
4. **.mcp.json** — MCP server configuration, local dev environment.
5. **package-lock.json** — dependency lock file changes; should be committed only with explicit dependency changes.

## Commit safety

- **Auto-commit safe:** NO
- **Reason:** Working tree contains ~200+ .agent/ files with unclear ownership, local settings files (.claude/settings.local.json, .mcp.json), and design mockup exports (stitch_*). The 37 files with actual diff content include legitimate platform-v2 work (Android modules, backend contracts, game sessions, docs) mixed with infrastructure files. Cannot auto-commit without user review and approval of which files belong to platform-v2.
- **Recommended commit grouping (if user approves):**
  1. `feat(backend): game session persistence and result submission`
  2. `feat(android): game runtime v3 and supabase network layer updates`
  3. `feat(admin): API client and games console updates`
  4. `docs: platform v2 architecture, API, and release docs`
  5. `test(release): platform v2 verification evidence bundle`
  6. `chore(release): platform v2 debug RC artifact`
