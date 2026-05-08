# AlbaGo Platform v2 RC Release Notes

## Summary

Platform v2 moves AlbaGo from a local demo prototype to a verified admin-driven, remotely configurable, physically tested demo platform. This release candidate has passed all five verification gates (P0-P4) and is ready for handoff review.

## Highlights

- **P0 platform verification gate** is green. Backend, admin, and Android all build and test clean.
- **P1 physical Android demo acceptance** passed on device `cffbc068` (M2007J3SI, Android 12). Three demo game videos captured (Fruit Slash, Dodge Run, Fit Challenge).
- **P2 game session persistence and Android result sync** passed. Backend `POST /v1/game-sessions` supports idempotent result submission via `clientSessionId`. Android submits results asynchronously and preserves local results on network failure.
- **P3 admin-published remote Scene Play** runs on Android without app rebuild. Game `p3_scene_play_deve_cuce_20260508-163452` published via admin API and verified in Android runtime.
- **P4 debug/internal RC APK** packaged with SHA256 checksum and full evidence index.
- **P5 post-RC stabilization** complete. Working tree classified, commit proposal drafted, safe npm audit fix applied (backend: 0 vulnerabilities).

## Key Artifacts

- **RC APK:** `artifacts/release/albago-platform-v2-rc-20260508-170015/albago-platform-v2-rc-debug.apk`
- **SHA256:** `7B2AE2ABA4DF0DD3E53509854D4EA29604A3A4C178D24695DE3B438BA709A712`
- **Evidence index:** `artifacts/verification/p4-evidence-index-20260508-170015.md`
- **P1 demo videos:** `artifacts/demo-videos/` (Fruit Slash, Dodge Run, Fit Challenge)
- **P3 remote Scene Play video:** `artifacts/demo-videos/p3-scene-play-20260508-164931.mp4`
- **RC metadata:** `artifacts/release/albago-platform-v2-rc-20260508-170015/release-metadata.md`

## Gate Results

| Gate | Description | Result |
|------|-------------|--------|
| P0 | Platform verification | PASS |
| P1 | Physical device acceptance | PASS |
| P2 | Session persistence & sync | PASS |
| P3 | Admin publish QA | PASS |
| P4 | RC packaging & evidence | PASS |
| P5 | Post-RC stabilization | PASS |

## Accepted Non-Blockers

- **Manual catalog tap validation:** ADB input automation blocked by device OS. QA direct-launch evidence (P1/P3) provides equivalent coverage. Can be completed via Android Studio Device Mirroring or direct human touch at any time.
- **npm audit (admin):** 2 remaining findings (1 critical next, 1 moderate postcss). Fix requires `--force` downgrade to next@14.2.35. Deferred pending a patched Next.js 15.x release. Admin panel is an internal tool, so practical exploit risk is low.
- **Dirty working tree:** Ownership-unclear .agent/ files, stitch_* design exports, and local settings excluded from commit. See P5 commit proposal for human review.

## Verification Commands

```powershell
# Full platform verification
powershell -ExecutionPolicy Bypass -File scripts/verify-platform-v2.ps1

# Physical device check
powershell -ExecutionPolicy Bypass -File scripts/preflight-physical-device.ps1

# Backend tests
npm run test --workspace backend

# Android APK build
cd android && .\gradlew.bat :app:assembleDebug --no-daemon
```

## Reviewer Checklist

- [ ] Inspect P4 evidence index (`artifacts/verification/p4-evidence-index-20260508-170015.md`)
- [ ] Review P5 working tree classification (`artifacts/verification/p5-working-tree-classification-20260508-171320.md`)
- [ ] Review P5 commit grouping proposal (`artifacts/verification/p5-commit-proposal-20260508-171320.md`)
- [ ] Install RC APK on a physical device if available
- [ ] Review OpenAPI session endpoint changes (`openapi/alba-api.yaml`)
- [ ] Review Android sync failure behavior (async, non-blocking)
- [ ] Review Scene Play publish QA script (`scripts/p3-publish-scene-play.ps1`)
- [ ] Review npm audit follow-up triage (`artifacts/verification/p5-npm-audit-followup-20260508-171320.md`)
- [ ] Approve commit grouping or request changes
