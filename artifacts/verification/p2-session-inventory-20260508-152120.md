# P2 Session Inventory

Date: 2026-05-08 15:21:20 +03:00
Branch: platform-v2

## Existing Backend Models / Endpoints Found

- `backend/prisma/schema.prisma` already contains `GameSession` with `clientSessionKey @unique`, `gameDefinitionId`, `workoutSessionId`, timestamps, score, version and JSON result payload fields.
- `backend/src/game-sessions/game-sessions.module.ts` exposes legacy `POST /game-sessions` create and `PATCH /game-sessions/:id` update backed directly by `InMemoryStore`.
- `backend/src/persistence/` has Prisma-backed repositories for game definitions and audit logs, but no game session repository yet.
- `backend/src/common/contracts.ts` has `GameSessionEntity` and `GameSessionResultPayload`, but fields use old `clientSessionKey` / `gameDefinitionId` naming.
- Backend tests currently cover publish validation and GameDefinition v3 validation; no game-session tests exist.

## Existing Android Flow Found

- `GameRuntime.buildResult()` already builds a result with game id, version, score, duration, motion counts, combo max, accuracy and timestamps.
- `AlbaMotionController.finishGame()` preserves local result UI, then calls `maybeSyncFinishedGame(force = true)`.
- `syncFinishedGame()` currently exits early when `gameRemoteId == null`, and otherwise calls stub-like `SupabaseData.updateGameSession(...)`.
- `SupabaseData` already reads backend catalog via HTTP, but game-session create/update are local stubs.
- `MotionUiState.GameUiState` has only `syncMessage`, no structured sync status/server id/error fields.

## Missing Pieces

- Idempotent backend submit-result API contract for Android payloads.
- Prisma/in-memory repository boundary for game session result persistence.
- Backend validation and tests for success, duplicate idempotency, invalid payload and optional fields.
- Android HTTP client for `POST /game-sessions` result submission.
- Android sync state that reports syncing/synced/failed without blocking local result screen.
- Docs/OpenAPI updates for endpoint, idempotency and failure behavior.

## Chosen Implementation Path

- Keep the existing public route `POST /v1/game-sessions` and accept both `clientSessionId` and legacy `clientSessionKey` aliases.
- Add `GameSessionsRepository` that writes to Prisma when available and falls back to `InMemoryStore` for dev/test.
- Preserve legacy `PATCH /game-sessions/:id` for compatibility, but add result-submit behavior to `POST /game-sessions`.
- Add Android DTO/client code in `core_network` using the existing `AlbaSupabase.backendBaseUrl` HTTP pattern.
- Wire `finishGame()` to submit the completed result even when the old remote session id was never created.
- Keep failure local-only: result screen remains usable, sync state becomes failed, and no raw camera/pose frames are sent.

## Files Planned for Edit

- `backend/src/common/contracts.ts`
- `backend/src/game-sessions/game-sessions.module.ts`
- `backend/src/persistence/game-sessions.repository.ts`
- `backend/src/persistence/persistence.module.ts`
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/*` additive migration if schema changes
- `backend/test/game-sessions.spec.ts`
- `android/core_network/src/main/java/com/alba/core/network/SupabaseData.kt`
- `android/core_network/src/main/java/com/alba/core/network/SupabaseModels.kt`
- `android/core_data/src/main/java/com/alba/core/data/AlbaMotionController.kt`
- `android/core_data/src/main/java/com/alba/core/data/MotionUiState.kt`
- `openapi/alba-api.yaml`
- `README.md` and release/API docs after verification
