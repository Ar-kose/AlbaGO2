# API Overview

## AlbaGo public mobile surface

- `POST /v1/guest-sessions`
- `POST /v1/devices/register`
- `GET /v1/motions`
- `POST /v1/workout-sessions`
- `PATCH /v1/workout-sessions/:id`
- `POST /v1/game-sessions`
- `PATCH /v1/game-sessions/:id`
- `GET /v1/game-definitions/active`
- `GET /v1/daily-goals`
- `GET /v1/leaderboards`
- `POST /v1/reward-claims`
- `GET /v1/assets/:assetId`

## AlbaGo internal admin surface

- `GET /v1/internal/game-definitions`
- `GET /v1/internal/game-definitions/:id`
- `GET /v1/internal/game-definitions/:id/validation`
- `POST /v1/internal/game-definitions`
- `PATCH /v1/internal/game-definitions/:id`
- `POST /v1/internal/game-definitions/:id/publish`
- `POST /v1/internal/game-definitions/:id/rollback`
- `POST /v1/internal/assets`
- `GET /v1/internal/audit-logs`

## Sprint 4+ contract notes

- Public active-game responses can return template demos plus `SCENE_PLAY` no-code scene games.
- `GameDefinition.template` supports:
  - `FRUIT_SLASH`
  - `DODGE_RUN`
  - `FIT_CHALLENGE`
  - `SCENE_PLAY`
  - internal compatibility templates remain supported by backend/admin
- `GameLevel` now carries:
  - `config`
  - `sceneConfig`
  - `interactionRules`
  - `tasks` for `FIT_CHALLENGE`
  - `programSteps` for guided playlists such as rep sets, plank holds, rest blocks and instruction cards
  - `sceneConfig.objects[]` for `SCENE_PLAY`
- `GameDefinition` now carries:
  - `category`: `SPORT`, `FUN` or `EDUCATION`
  - `tags`: catalog/search labels used by admin and mobile filtering
  - `orientation`: `PORTRAIT` or `LANDSCAPE`
  - `cameraRequirement`: `FULL_BODY`, `UPPER_BODY` or `HAND_TARGET`
  - `assets.items[]`: typed upload manifest entries for PNG/WebP/SVG-backed scene objects
- `POST /v1/internal/assets` accepts multipart `file` uploads for PNG, WebP and sanitized SVG files up to 5 MB.
- `GET /v1/assets/:assetId` serves uploaded asset bytes for Android/admin preview usage.
- `POST /v1/game-sessions` accepts completed Android game result submissions. Required fields are `clientSessionId`, `gameKey`, `score` and `resultPayload`; optional fields include `gameDefinitionId`, `gameDefinitionVersion`, `deviceId`, `startedAt`, `endedAt`, `durationSec`, `combo`, `accuracy` and `calories`.
- `POST /v1/game-sessions` is idempotent on `clientSessionId`; the legacy alias `clientSessionKey` is still accepted at the boundary.
- Duplicate game-session submissions return the existing server session with `duplicate_accepted` rather than creating a second row.
- `PATCH /v1/game-sessions/:id` remains available for legacy session updates and can include a structured `resultPayload`.
- Backend create endpoints that still use the older create/update flow remain idempotent on `clientSessionKey`.
- Prisma-backed persistence is now the source of truth for game definitions, levels and audit logs.
- Android now builds `resultPayload.motionCounts` from the active game session rather than from the workout-only summary.
- Android submits completed game results asynchronously and keeps the local result screen usable if the backend is unavailable.
- Android treats `/v1/game-definitions/active` as untrusted remote content: unknown enum values, empty levels and invalid motion rules are skipped before catalog display.
- If the active-game request fails, Android falls back to cached definitions and then debug-only local demo definitions.
