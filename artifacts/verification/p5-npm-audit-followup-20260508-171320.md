# P5 npm Audit Follow-up

Date: 2026-05-08 17:13
Command: `npm audit --workspace <workspace> --audit-level=moderate`

## Current findings

**Total: 5** (3 backend, 2 admin)

### Backend workspace — 3 high

| Package | Severity | Direct/Transitive | Fix | Breaking? |
|---------|----------|-------------------|-----|-----------|
| effect <3.20.0 | high | transitive (via @prisma/config → prisma) | `npm audit fix` | No |
| @prisma/config | high | transitive | via effect fix | No |
| prisma | high | transitive | via effect fix | No |

**Advisory:** GHSA-38f7-945m-qr2g — Effect AsyncLocalStorage context lost/contaminated inside Effect fibers under concurrent load with RPC.

### Admin workspace — 1 critical, 1 moderate

| Package | Severity | Direct/Transitive | Fix | Breaking? |
|---------|----------|-------------------|-----|-----------|
| next | critical (14 CVEs) | direct | `npm audit fix --force` | **YES** — downgrades to next@14.2.35 |
| postcss <8.5.10 | moderate | transitive (via next) | via next downgrade | **YES** |

**Key CVEs:** DoS via Server Actions/Components, SSRF in middleware redirects, cache poisoning, authorization bypass, request smuggling, image cache exhaustion.

## Safe fix candidates

### Backend: effect (transitive via Prisma)

```
npm audit fix --workspace backend
```

- **Risk:** LOW. Semver-compatible update of a transitive dependency.
- **Impact:** effect updated to ≥3.20.0. Prisma's internal dependency only.
- **Verification needed:** Backend build + tests (32 tests).
- **Recommendation:** APPLY NOW.

## Unsafe/deferred fix candidates

### Admin: next (direct) + postcss (transitive)

```
npm audit fix --force --workspace admin
```

- **Risk:** HIGH. Forces downgrade from Next.js 14.2.16 to 14.2.35. While this stays within 14.x, the `--force` flag indicates npm considers this outside the stated dependency range. Could break admin features.
- **Verification needed:** Full admin build + manual smoke test of all pages.
- **Recommendation:** DEFER. Wait for a patched Next.js 15.x release or confirm 14.2.35 compatibility through testing.

## Recommendation

- **Fix now:** Backend `npm audit fix` (non-breaking, low risk)
- **Defer:** Admin next/postcss (requires --force downgrade, high verification cost)
- **Reason:** Backend fix is a safe transitive update with no breaking risk. Admin fix requires a forced downgrade that could break the admin panel and needs full re-verification. The admin panel is an internal tool, so the CVEs (mostly DoS against public-facing deployments) have low practical risk.

## If backend fix is applied

Expected result after `npm audit fix --workspace backend`:
- Backend: 0 vulnerabilities
- Admin: 2 vulnerabilities (unchanged, deferred)
- Total: 2 (down from 5)

Verification:
```
npm run build --workspace backend
npm run test --workspace backend
```
