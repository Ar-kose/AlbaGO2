# Release Checklist

## Branding

- Visible product name updated from `Alba` to `AlbaGo`
- Android app label shows `AlbaGo`
- Admin metadata and headers show `AlbaGo`
- OpenAPI and Swagger title/description use `AlbaGo`

## Android

- Camera permission flow verified at workout or Motion Lab entry
- QA backend override works in debug build
- Remote game definition fetch fallback order verified
- Workout and game session sync flow verified
- Physical device acceptance completed and demo video captured

## Backend

- OpenAPI contract updated
- Publish validation and reward idempotency tests passed
- Session create idempotency by `clientSessionKey` verified
- Prisma client generated
- Migration and seed flow documented
- Audit log persistence path verified

## Admin

- AlbaGo `TARGET_HIT` draft editor loads
- Publish validation surfaces missing fields correctly
- Publish and rollback flows still work
- Audit log remains visible

## Documentation

- `README.md` updated
- `openapi/alba-api.yaml` updated
- `changelog.md` updated
- `known-issues.md` updated
- Sprint log updated
- Product rename note recorded
