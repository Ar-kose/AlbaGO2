# P1 Physical Device Acceptance

Date: 2026-05-08 15:12:25 +03:00
Branch: platform-v2
Device serial: cffbc068
Device model: M2007J3SI
Android version: 12
APK: C:\Users\user\Desktop\AlbaGo\android\app\build\outputs\apk\debug\app-debug.apk
Backend URL mode: adb reverse tcp:3000 tcp:3000

## Result

- Cold launch: PASS
- Fruit Slash demo: PASS
- Dodge Run demo: PASS
- Fit Challenge demo: PASS
- Crash logs: PASS

## Evidence

- P0 verification log: artifacts/verification/platform-v2-20260508.log
- Cold launch crash log: C:\Users\user\Desktop\AlbaGo\artifacts\crash-reports\p1-cold-launch-20260508-150858.log
- Fruit Slash video: C:\Users\user\Desktop\AlbaGo\artifacts\demo-videos\fruit-slash-20260508-150858.mp4
- Fruit Slash log: C:\Users\user\Desktop\AlbaGo\artifacts\crash-reports\fruit-slash-20260508-150858.log
- Dodge Run video: C:\Users\user\Desktop\AlbaGo\artifacts\demo-videos\dodge-run-20260508-150858.mp4
- Dodge Run log: C:\Users\user\Desktop\AlbaGo\artifacts\crash-reports\dodge-run-20260508-150858.log
- Fit Challenge video: C:\Users\user\Desktop\AlbaGo\artifacts\demo-videos\fit-challenge-20260508-150858.mp4
- Fit Challenge log: C:\Users\user\Desktop\AlbaGo\artifacts\crash-reports\fit-challenge-20260508-150858.log

## Notes

- Debug QA launch extras were used for direct demo startup.
- Direct manual tap validation still needs human touch / mirroring if ADB input injection is blocked.
