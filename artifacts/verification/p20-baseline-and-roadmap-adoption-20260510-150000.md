# P20 Baseline & Roadmap Adoption

**Date:** 2026-05-10
**Branch:** main (synced with platform-v2 at b3a2302)

---

## P20.1 — Current Baseline

| Attribute | Value |
|---|---|
| Branch | main |
| Commit | b3a2302c5b6ed98fa03b04e2ac1e2ee8f97d0cfb |
| Commit message | P19: platform-v2 merge readiness — PR packet, rollback, evidence |
| Remote | origin/main = origin/platform-v2 = b3a2302 |
| Last full verification | 9/9 PASS (P19) |

## P20.2 — Working Tree Classification

### Modified (1 file)

| File | Classification | Action |
|---|---|---|
| artifacts/verification/platform-v2-20260510.log | Artifact (log timestamp update only) | Can be committed or left |

### Untracked (2 files)

| File | Classification | Action |
|---|---|---|
| artifacts/verification/p13e-installed-base.apk | Binary artifact (108MB) — ownership clear | Gitignored with *.apk rule |
| docs/00-product/albago-master-roadmap.md | New master roadmap — intentional addition | Commit as part of P20.4 |

### Ownership-Unclear Files

None. All working tree items are clearly categorized.

### Not Present (clean)

- .agent/ directory — no stale agent state
- stitch/ directory — no stitch artifacts
- local settings overrides — none detected

## Decision

Working tree is clean and classified. No ownership-ambiguous files.
*.apk added to .gitignore to prevent future large binary commits.

---

## P20.3 — Risk Register

P19 risk-accepted items re-opened as tracked issues:

| Risk | Severity | Target |
|---|---|---|
| R1 Xiaomi physical smoke | Medium | P21.2 |
| R2 WorkManager e2e | Medium | P21.6 |
| R3 Session sync proof | Medium | P21.5 |
| R4 Catalog tap walkthrough | Low | P21.3 |

Risk register: `artifacts/verification/p20-risk-register-20260510-150000.md`

## P20.4 — Roadmap Repoya Eklendi

- File: `docs/00-product/albago-master-roadmap.md`
- README.md updated with roadmap reference

## P20.5 — Eski Roadmap Deprecated

- `docs/00-product/roadmap.md` updated with deprecated notice + pointer to new master roadmap

## P20.6 — Full Verification

**Result: 9/9 PASS**

| Gate | Status |
|---|---|
| Preflight | PASS |
| NPM install | PASS |
| Backend prisma generate | PASS |
| Backend build | PASS |
| Backend test | 40/40 PASS |
| Admin build | PASS |
| Android core_runtime unit tests | PASS |
| Android app unit tests | PASS |
| Android debug APK assemble | PASS |

**APK SHA256:** `98387371B67B9188667647CBDF50034BC15F6F688611648837EC01D300503862`

No failed steps. No warnings.

---

## P20 Exit Decision

- [x] GO: Working tree clean and classified
- [x] GO: Master roadmap in repo at docs/00-product/albago-master-roadmap.md
- [x] GO: Full verification 9/9 PASS
- [x] GO: Risk register created, all risks assigned to P21

**Decision: GO → P21**
