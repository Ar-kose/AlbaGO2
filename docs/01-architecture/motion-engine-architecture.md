# Motion Engine Architecture

AlbaGo motion engine remains a model-agnostic domain layer between pose estimation and user-facing workout or game flows.

## Public contracts

- `PoseFrame`
- `MotionDetector`
- `MotionDetectorState`
- `MotionEvent`
- `WorkoutSessionState`

## Runtime pipeline

1. Camera analysis produces a frame.
2. MediaPipe Pose converts the frame into landmarks.
3. Landmarks are normalized into `PoseFrame`.
4. The selected detector advances its state machine.
5. Completed movement cycles emit `REP_COUNTED`.
6. Motion events feed workout state, debug UI and game runtime without direct UI coupling.

## Sprint 3 rules

- `SQUAT` and `JUMPING_JACK` use stricter duration gates and cooldowns.
- Detector metadata now carries `detectorVersion`, `phase`, `repDurationMs` and bad-form reasons when relevant.
- Out-of-frame and low-confidence input blocks counting.
- `JUMP_ROPE` uses baseline calibration and remains prototype quality.
