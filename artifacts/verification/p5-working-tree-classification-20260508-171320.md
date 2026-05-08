# P5 Working Tree Classification

Date: 2026-05-08 17:13
Branch: platform-v2
Diff stat: 37 files with real diff, +2813/-1091
Total modified in status: ~200+ files (most .agent/ files are metadata-only changes)

## Files that belong to P0-P4 platform-v2 work

### Verification Scripts (P0)
```
scripts/verify-platform-v2.ps1 (new)
scripts/preflight-physical-device.ps1 (new)
scripts/accept-device-demo.ps1 (new)
scripts/check-android-crash-log.ps1 (new)
```

### Backend / Session Persistence (P2)
```
backend/src/game-sessions/game-sessions.module.ts (modified)
backend/src/persistence/game-sessions.repository.ts (new)
backend/src/persistence/persistence.module.ts (modified)
backend/src/common/contracts.ts (modified)
backend/prisma/migrations/20260508152000_game_session_result_submission/ (new)
backend/prisma/schema.prisma (modified)
backend/test/game-sessions.spec.ts (new)
```

### Backend / Game Definition v3 (P3)
```
backend/src/common/game-definition-v3.ts (new)
backend/test/game-definition-v3.spec.ts (new)
backend/src/games/games.module.ts (modified)
backend/test/publish-validation.spec.ts (modified)
```

### Android / Session Sync (P2)
```
android/core_network/src/main/java/com/alba/core/network/SupabaseData.kt (modified)
android/core_network/src/main/java/com/alba/core/network/SupabaseModels.kt (modified)
android/core_network/src/main/java/com/alba/core/network/SupabaseClient.kt (modified)
android/core_network/src/test/ (new)
```

### Android / Scene Play Remote Parsing (P3)
```
android/core_runtime/src/main/java/com/alba/core/runtime/GameDefinitionV3.kt (new)
android/core_runtime/src/main/java/com/alba/core/runtime/GameRuntime.kt (modified)
android/core_data/src/main/java/com/alba/core/data/AlbaMotionController.kt (modified)
android/core_runtime/src/test/ (new)
android/feature_games/src/main/java/com/alba/feature/games/GamesFeature.kt (modified)
```

### Android / General Improvements (P0-P3)
```
android/app/build.gradle.kts (modified)
android/build.gradle.kts (modified)
android/core_data/build.gradle.kts (modified)
android/core_motion/build.gradle.kts (modified)
android/core_network/build.gradle.kts (modified)
android/core_runtime/build.gradle.kts (modified)
android/gradle.properties (modified)
android/core_motion/src/main/java/com/alba/core/motion/MotionEngine.kt (modified)
android/core_motion/src/test/java/com/alba/core/motion/MotionDetectorsTest.kt (modified)
android/core_network/src/main/java/com/alba/core/network/SupabaseAuth.kt (modified)
android/core_network/src/main/java/com/alba/core/network/SupabaseRealtime.kt (modified)
android/core_network/src/main/java/com/alba/core/network/SupabaseStorage.kt (modified)
```

### Admin / API Client & Games Console (P2/P3)
```
admin/src/lib/alba-api.ts (modified)
admin/src/app/games/games-console.tsx (modified)
admin/src/app/page.tsx (modified)
```

### OpenAPI / API Contract (P2/P3)
```
openapi/alba-api.yaml (modified)
```

### Documentation (P0-P4)
```
README.md (modified)
docs/07-release/changelog.md (modified)
docs/07-release/known-issues.md (modified)
docs/07-release/release-checklist.md (modified)
docs/07-release/p1-phone-connected-runbook.md (new)
docs/08-sprint-logs/2026-05-sprint-05.md (new)
docs/08-sprint-logs/2026-05-sprint-04.md (new)
docs/08-sprint-logs/2026-05-platform-v2-build-verification.md (new)
docs/01-architecture/backend-architecture.md (modified)
docs/01-architecture/game-runtime-architecture.md (modified)
docs/01-architecture/mobile-architecture.md (modified)
docs/05-api/api-overview.md (modified)
```

### Evidence Artifacts (P1-P4)
```
artifacts/verification/ (all files, new)
artifacts/crash-reports/ (all P1-P4 logs, new)
artifacts/demo-videos/ (all P1/P3 videos, new)
artifacts/release/ (RC package, new)
```

### Backend Config / Seed / Module wiring (P0-P3)
```
backend/.env.example (modified)
backend/jest.config.js (modified)
backend/nest-cli.json (modified)
backend/package.json (modified)
backend/tsconfig.json (modified)
backend/src/app.module.ts (modified)
backend/src/main.ts (modified)
backend/prisma/seed.ts (modified)
backend/prisma/migrations/20260426190000_init/migration.sql (modified)
backend/prisma/migrations/20260426194500_sprint4_demo_games/migration.sql (modified)
backend/prisma/migrations/20260505120000_admin_driven_games_v1/migration.sql (modified)
```

## Files that are ownership-unclear (DO NOT COMMIT)

### .agent/ directory (~200 files)
```
.agent/.shared/ui-ux-pro-max/data/*.csv
.agent/.shared/ui-ux-pro-max/scripts/*.py
.agent/ARCHITECTURE.md
.agent/agents/*.md
.agent/mcp_config.json
.agent/rules/GEMINI.md
.agent/scripts/*.py
.agent/skills/**/SKILL.md
.agent/skills/**/*.md
.agent/skills/**/*.py
.agent/workflows/*.md
```
Reason: Shared agent framework infrastructure. Not platform-v2 specific. Ownership belongs to the AI tooling layer, not the AlbaGo product.

### .claude/settings.local.json
Reason: Local Claude Code configuration; may contain local paths and preferences.

### .mcp.json
Reason: MCP server configuration for local development environment.

### stitch_a_l_ekran_splash/ directory
```
stitch_a_l_ekran_splash/a_l_ekran_splash/code.html
stitch_a_l_ekran_splash/albago_ana_ekran/code.html
stitch_a_l_ekran_splash/e_itim_modu/code.html
stitch_a_l_ekran_splash/e_lence_modu/code.html
stitch_a_l_ekran_splash/kamera_i_zni/code.html
stitch_a_l_ekran_splash/onboarding_1_v_cut_kontrol/code.html
stitch_a_l_ekran_splash/onboarding_2_modlar/code.html
stitch_a_l_ekran_splash/onboarding_3_ba_la/code.html
stitch_a_l_ekran_splash/spor_modu/code.html
```
Reason: Design tool export (likely Stitch/design-to-code). Reference screens for mobile direction. Not part of the buildable codebase.

### .gitignore
Reason: Modified, but unclear if changes are intentional platform-v2 adjustments or unrelated.

### uploads/assets/
```
uploads/assets/asset_409b9f08-ada4-4b4a-bb16-ed92b6f85c26.svg
uploads/assets/asset_9ae245d9-79c7-4dad-89a2-1714d9218075.svg
```
Reason: Uploaded assets from admin panel testing. Runtime data, not source code.

### package-lock.json
Reason: Dependency lock file. Should only be committed if dependency changes are intentional and verified.

## Files likely generated/noisy

### Build outputs (already in .gitignore or should be)
```
artifacts/logs/admin-dev.log
artifacts/logs/backend-dev.log
```
These are runtime dev logs. Consider adding `artifacts/logs/` to .gitignore.

### Test assets
```
artifacts/test-assets/albago-bad.svg
artifacts/test-assets/albago-test-fruit.svg
```
These are test fixtures, may be intentional. Review needed.

### Gradle wrapper binary
```
android/gradlew (modified)
android/gradle/wrapper/gradle-wrapper.properties (modified)
```
The gradlew script change is suspicious — it might be a line-ending change. Review before committing.

### Binary evidence (should NOT be in git)
```
artifacts/demo-videos/*.mp4 (68+71+7+4 MB)
artifacts/release/albago-platform-v2-rc-20260508-170015/albago-platform-v2-rc-debug.apk (108 MB)
```
These are large binary files. Do not commit to git unless project policy explicitly tracks release binaries.

## Commit safety

- **Auto-commit safe:** NO
- **Reason:** Working tree contains ~200 ownership-unclear .agent/ files, local IDE/CLI settings, design tool exports (stitch_*), runtime upload data, and large binary evidence files. Even among the legitimate platform-v2 files, careful grouping is needed to produce reviewable commits.
- **Human approval required before commit:** YES
