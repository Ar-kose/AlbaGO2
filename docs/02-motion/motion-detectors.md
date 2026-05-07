# Motion Detectors

## Active detector set

- `SquatDetectorV1`
- `JumpingJackDetectorV1`
- `JumpRopeDetectorV1`

## Shared rules

- Every detector consumes standard `PoseFrame`.
- Detectors remain UI-independent.
- Counting only happens when a full motion cycle closes.
- Low visibility and missing landmarks suppress scoring.
- `USER_OUT_OF_FRAME` is meaningful for both workout and game pause behavior.

## Sprint 4 tuning notes

- `SquatDetectorV1`
  - uses a stricter standing/down/bottom/up cycle
  - blocks half-squat counting
  - emits richer metadata for phase and rep timing
- `JumpingJackDetectorV1`
  - requires a full `closed -> open -> closed` cycle
  - expects both upper-body and lower-body confirmation
- `JumpRopeDetectorV1`
  - remains prototype quality
  - uses baseline ankle/hip calibration and airborne detection
  - is valid for demo exploration but not a sprint gate

## Runtime usage in Sprint 4

- Workout mode evaluates the selected detector.
- Game mode evaluates all detectors required by the active game definition.
- QA panel exposes detector version, phase, last event and motion log for tuning.
- QA panel can inject mock `SQUAT`, `JUMPING_JACK`, `JUMP_ROPE`, `BAD_FORM` and `USER_OUT_OF_FRAME` events for simulator-friendly game testing.
