# P1 Phone Connected Runbook

## Purpose

Run this after a real Android phone is connected and visible to Windows.

## Preconditions

- Phone is unlocked.
- Developer Options enabled.
- USB debugging enabled.
- RSA prompt accepted.
- USB mode is File Transfer/MTP if needed.
- `adb devices -l` shows a physical device in `device` state.

## Step 1 - Verify Branch

```powershell
git branch --show-current
```

Expected:

```text
platform-v2
```

## Step 2 - Run Physical Preflight

```powershell
powershell -ExecutionPolicy Bypass -File scripts/preflight-physical-device.ps1
```

Expected:

```text
PASS
```

If multiple devices are connected, rerun with:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/preflight-physical-device.ps1 -DeviceSerial <serial>
```

## Step 3 - Run P1 Acceptance

```powershell
powershell -ExecutionPolicy Bypass -File scripts/accept-device-demo.ps1 -Build
```

If multiple devices are connected:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/accept-device-demo.ps1 -Build -DeviceSerial <serial>
```

## Step 4 - Verify Expected Artifacts

Expected files:

- `artifacts/verification/p1-device-acceptance-summary-*.md`
- `artifacts/crash-reports/p1-cold-launch-*.log`
- `artifacts/crash-reports/fruit-slash-*.log`
- `artifacts/crash-reports/dodge-run-*.log`
- `artifacts/crash-reports/fit-challenge-*.log`
- `artifacts/demo-videos/fruit-slash-*.mp4`
- `artifacts/demo-videos/dodge-run-*.mp4`
- `artifacts/demo-videos/fit-challenge-*.mp4`

## Step 5 - Acceptance Checks

P1 can be marked green only if:

- physical device was used
- APK installed successfully
- app cold-launched
- three demo videos were captured
- crash scanner passed for all logs
- summary says `PASS`

## Step 6 - Update Docs After Success

Update:

- `README.md`
- `docs/08-sprint-logs/2026-05-sprint-05.md`
- `docs/07-release/release-checklist.md`
- `docs/07-release/known-issues.md`
- `docs/07-release/changelog.md`

## If Still Blocked

Do not proceed to P2/P3/P4. Update the latest P1 blocked summary.
