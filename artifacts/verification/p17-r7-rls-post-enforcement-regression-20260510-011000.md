# P17.7 RLS Post-Enforcement Regression

**Date:** 2026-05-10 01:10:00
**Decision: PASS**

---

## Summary

All 47 public tables confirmed RLS enabled. Backend active games endpoint functional. Profile endpoint 404 was caused by double-prefix bug (`setGlobalPrefix('v1')` + `@Controller('v1/profiles')`), fixed to `@Controller('profiles')`.

## RLS Status

47/47 tables with `relrowsecurity = true` — no regression after P16 enforcement.

## Backend Checks

| Endpoint | Status |
|---|---|
| GET /v1/game-definitions/active | PASS |
| POST /v1/game-sessions | PASS (verified P16) |
| Backend service role path | PASS (Prisma unaffected by RLS) |
| Client direct DB access | None (confirmed anon key unused) |
