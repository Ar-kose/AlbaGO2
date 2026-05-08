# P3 Admin Publish Path Inventory

**Date:** 2026-05-08
**Branch:** platform-v2
**API Base:** http://localhost:3000/v1 (global prefix `v1` set in main.ts:9)

---

## 1. Complete Route Table

| Method | Route | Controller | Description |
|---|---|---|---|
| `GET` | `/v1/game-definitions/active?appVersion=` | GamesController.active | Public active game list (filters: non-internal, validated, PUBLISHED, minAppVersion) |
| `GET` | `/v1/internal/game-definitions` | InternalGamesController.list | Admin: list ALL game definitions |
| `GET` | `/v1/internal/game-definitions/:id` | InternalGamesController.get | Admin: get single definition |
| `GET` | `/v1/internal/game-definitions/:id/validation` | InternalGamesController.validation | Admin: run legacy validation on stored def |
| `POST` | `/v1/internal/game-definitions/v3/validate` | InternalGamesController.validateV3 | Admin: validate arbitrary JSON against v3 schema |
| `POST` | `/v1/internal/game-definitions` | InternalGamesController.create | Admin: create new draft (default status DRAFT) |
| `PATCH` | `/v1/internal/game-definitions/:id` | InternalGamesController.update | Admin: update existing definition |
| `POST` | `/v1/internal/game-definitions/:gameId/publish` | ContentPublishController.publish | Admin: publish (runs legacy validation, status -> PUBLISHED) |
| `POST` | `/v1/internal/game-definitions/:gameId/rollback` | ContentPublishController.rollback | Admin: rollback to REVIEW |
| `POST` | `/v1/internal/assets` | AssetsController.upload | Admin: upload game asset (multipart) |
| `GET` | `/v1/assets/:assetId` | AssetsController.get | Public: serve uploaded asset |

---

## 2. Create DTO Shape (`POST /v1/internal/game-definitions`)

```json
{
  "gameKey": "string (required)",
  "template": "TARGET_HIT | ENDLESS_RUNNER | FRUIT_SLASH | DODGE_RUN | FIT_CHALLENGE | SCENE_PLAY (required)",
  "title": "string (required)",
  "description": "string (required)",
  "minAppVersion": "string (required)",
  "orientation": "PORTRAIT | LANDSCAPE (required)",
  "cameraRequirement": "FULL_BODY | UPPER_BODY | HAND_TARGET (required)",
  "supportedMotions": ["SQUAT", "JUMPING_JACK", "JUMP_ROPE"] (required),
  "levels": [GameLevelDto] (required),
  "assets": { "background": {...}, "character": {...}, "soundtrack?": {...}, "items?": [...] } (required),
  "category": "SPORT | FUN | EDUCATION (optional)",
  "tags": ["string"] (optional),
  "status": "DRAFT | REVIEW | SCHEDULED | PUBLISHED | ARCHIVED (optional, default DRAFT)",
  "segmentRuleJson": {} (optional),
  "actorId": "string (optional)"
}
```

### GameLevelDto
```json
{
  "levelId": "string",
  "durationSec": 45,
  "targetScore": 100,
  "difficulty": "string",
  "motionRules": [{"motion": "SQUAT", "event": "REP_COUNTED", "points": 10, "cooldownMs": 1000}],
  "rewardRules": [{"rewardType": "STAR", "amount": 1, "minimumScore": 50}],
  "config": {},
  "sceneConfig": {
    "type": "PROMPT_SEQUENCE",
    "spawnRateMs": 2400,
    "maxObjects": 5,
    "objects": [
      {
        "objectId": "cuce_prompt",
        "objectType": "cuce_prompt",
        "label": "Cuce",
        "assetKey": "cuceCard",
        "requiredMotion": "SQUAT",
        "points": 10,
        "lifeMs": 2400
      }
    ]
  },
  "interactionRules": [
    {
      "ruleId": "hit_cuce",
      "input": "MOTION_EVENT",
      "motion": "SQUAT",
      "action": "ADD_SCORE",
      "points": 10,
      "cooldownMs": 1000
    }
  ],
  "tasks": [],
  "programSteps": [
    {
      "stepId": "p3_scene_play_step",
      "type": "PLAY_GAME",
      "title": "Komutu takip et",
      "description": "Cuce gelirse squat, deve gelirse jumping jack yap.",
      "durationSec": 45,
      "successMessage": "P3 remote Scene Play tamamlandi.",
      "nextOnComplete": true
    }
  ]
}
```

---

## 3. Publish Flow

1. `POST /v1/internal/game-definitions` -> creates definition with `status: 'DRAFT'`, `version: 1`
2. `PATCH /v1/internal/game-definitions/:id` -> edit fields (version bumps each time)
3. `POST /v1/internal/game-definitions/v3/validate` -> optional v3 schema check
4. `GET /v1/internal/game-definitions/:id/validation` -> legacy validation check
5. `POST /v1/internal/game-definitions/:gameId/publish` with `{ "actorId": "..." }`:
   - Loads game by ID
   - Runs legacy `validateGameDefinition()` (NOT v3 validation)
   - If errors: returns `{ error: "publish_validation_failed", errors: [...] }`
   - If clean: sets `status = 'PUBLISHED'`, `publishedAt = now`, saves, audits
6. `GET /v1/game-definitions/active?appVersion=0.2.0` -> includes newly published game

---

## 4. Active Definition Filtering

In `GamesService.getActive(appVersion)`:
1. List all definitions from repository
2. Filter out `internalOnly === true` (from `segmentRuleJson.internalOnly`)
3. Filter by `validateGameAccess(game, appVersion)` which checks:
   - `validateGameDefinition(game)` passes (structural validity)
   - `compareVersions(appVersion, game.minAppVersion) >= 0`
   - `game.status === 'PUBLISHED'`
4. Sort by template rank then version desc

---

## 5. Android Fetch/Parse/Launch Path

1. App starts -> `AlbaMotionController.init()` -> `refreshActiveGames()`
2. `SupabaseData.getActiveGames()` -> `GET {backendUrl}/game-definitions/active?appVersion=0.2.0`
3. Response parsed into `RuntimeCatalogCache` -> mapped to `List<GameDefinition>` via `supabaseGameToDefinition()`
4. **Critical finding:** Legacy mapping sets `sceneConfig = emptyMap()` and `interactionRules = emptyList()`
5. `GameDefinitionValidator` requires `sceneConfig["objects"]` and `interactionRules` for SCENE_PLAY -> **SCENE_PLAY games fetched via legacy pipeline will FAIL validation**
6. V3 parser (`GameDefinitionV3Parser`) exists with proper scene object/rules support but is NEVER called in production fetch path
7. Direct launch via: `adb shell am start -n com.alba.app/.MainActivity --es albago.startDestination GAMES --es albago.autostartGameId <gameId> --es albago.mockRep SQUAT`
8. QA panel provides "Config yenile" button for manual refresh

---

## 6. Two Parallel Validation Systems

| Aspect | Legacy (`validateGameDefinition`) | V3 (`validateGameDefinitionV3`) |
|---|---|---|
| Input | `GameDefinitionEntity` (uppercase enums) | Raw JSON (lowercase enums) |
| Used by publish? | YES | NO (standalone endpoint only) |
| SCENE_PLAY checks | sceneConfig.objects, interactionRules, spawnRateMs | scene.objects[], rules[], capabilities |
| Casing | `LANDSCAPE`, `FULL_BODY`, `SPORT` | `landscape`, `full_body`, `sport` |

Publish runs LEGACY validation only. A game could pass v3 but fail legacy, or vice versa.

---

## 7. Key Risk Notes for P3

1. **SCENE_PLAY sceneConfig gap:** Android legacy pipeline drops `sceneConfig` and `interactionRules`. Either the backend's active endpoint response format must include these fields in a way the legacy Android parser can read, OR the Android fetch path needs to use the V3 parser for SCENE_PLAY games.

2. **Validation mismatch:** Backend publish uses legacy validation. The test game must pass legacy validation (which checks `sceneConfig.objects` and `interactionRules` at the entity level), not just v3 validation.

3. **Android `getGameInteractionRules()` returns empty list:** Interaction rules have no backend API path in the current Android network layer. This must be fixed or worked around.

4. **No auth on game definition endpoints:** All internal endpoints are unauthenticated. Acceptable for local dev but should be noted.

5. **V3 parser is tested but disconnected:** The Android V3 parser and data model exist but are not wired into the fetch pipeline. P3 needs to either wire it or fix the legacy pipeline.

6. **`appVersion=0.2.0` is hardcoded** in the Android fetch URL. The publish script must ensure `minAppVersion` is compatible.

---

## 8. Existing Test Coverage

**Backend:**
- `game-definition-v3.spec.ts` — 13 tests for v3 validation (valid Scene Play, unknown actions, missing fields)
- `publish-validation.spec.ts` — 3 tests (version compare, seeded game validation, score suspicion)
- `game-sessions.spec.ts` — 5 tests for session submission

**Android:**
- `GameDefinitionV3ParserTest.kt` — 4 tests (parse valid, reject unknown actions/capabilities/fields)
- `GameRuntimeProgramRunnerTest.kt` — 10 tests (program step execution, advance, complete)

**Gaps:** No E2E publish flow test, no Android remote fetch integration test, no CRUD endpoint tests.
