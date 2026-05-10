# P13 Hotfix Policy

**Date:** 2026-05-09
**Pilot:** P13 Controlled Beta

## When to Hotfix

Hotfix is ONLY permitted for:

- P0 crash (app becomes unusable)
- P1 game unplayable (game does not start or cannot complete)
- P1 session sync broken (results not persisted to Supabase)
- P1 navigation trap (user cannot exit a screen)
- P1 security issue (credential leak, unauthorized access)

Hotfix is NOT permitted for:

- P2 UX issues (can be addressed in next sprint)
- P3 cosmetic issues
- P4 suggestions
- Feature additions

## Hotfix Workflow

1. **Collect evidence** — crash log, screenshot, repro steps from tester
2. **Reproduce locally** — confirm the issue on dev environment
3. **Minimal patch** — smallest possible change that fixes the issue
4. **Run tests** — backend unit tests, Android unit tests
5. **Physical device smoke** — verify fix on at least 1 physical device
6. **Generate new APK** — assembleDebug with new SHA256
7. **Update checksum** — record new SHA256 in release artifacts
8. **Notify testers** — previous APK deprecated, distribute new APK
9. **Write release note** — document what was fixed and why
10. **Update issue register** — mark issue as resolved with fix commit

## Hotfix Build Commands

```powershell
npm.cmd run build --workspace backend
npm.cmd run test --workspace backend

Set-Location android
$env:JAVA_HOME='C:\Program Files\Android\Android Studio\jbr'
$env:ANDROID_SDK_ROOT="$env:LOCALAPPDATA\Android\Sdk"
$env:ANDROID_HOME="$env:ANDROID_SDK_ROOT"
$env:GRADLE_USER_HOME='C:\gradle-cache'
$env:PATH="$env:JAVA_HOME\bin;$env:ANDROID_SDK_ROOT\platform-tools;$env:PATH"
.\gradlew.bat testDebugUnitTest --no-daemon
.\gradlew.bat :app:assembleDebug --no-daemon
Set-Location ..
```

## Hotfix Release Note Template

```md
# Hotfix: P13-HF-001

**Date:** YYYY-MM-DD
**Issue:** P13-XXX
**Severity:** P0/P1
**Summary:** Brief description of the fix
**APK SHA256:** <new hash>
**Supersedes:** <old hash>
**Verified on:** <device model>, Android <version>
```

## Hotfix Log

| HF ID | Date | Issue | Severity | New SHA256 | Verified |
|---|---|---|---|---|---|
| — | — | — | — | — | — |
