# Demo Games Sprint 4

## 2026-05-03 Catalog Hardening Update

- Catalog opens through a safe `catalog -> detail/prep -> active session -> result` flow.
- Missing levels, unsupported templates and invalid remote/cache rules are filtered before a game card can crash the app.
- Backend-offline mode uses cached definitions or debug local fallback games.
- Mock motion remains the required fast test path for all 3 games before full physical movement testing.
- Latest Android build passed; device `cffbc068` installed and cold-launched the APK, but physical video capture is still pending because automated taps are blocked by `INJECT_EVENTS`.

## 2026-05-04 Full-screen Game Pass

- Active games now open as full-screen camera scenes with a game HUD overlay.
- Debug QA can start a specific game through `adb shell am start ... --es albago.startDestination GAMES --es albago.autostartGameId <game_id>`.
- Debug QA can inject one mock rep on launch with `--es albago.mockRep SQUAT|JUMPING_JACK|JUMP_ROPE`.
- Fruit Slash was verified with `fruit_slash_demo + JUMPING_JACK`: score `15`, combo `x1`, sliced count incremented.
- Fit Challenge was verified with `fit_challenge_demo + SQUAT`: score/progress increased and skeleton overlay was visible on-device.
- Dodge Run was verified with `dodge_run_demo + JUMP_ROPE`: score `3` and energy/progress updated, but obstacle/life pacing still needs tuning because the demo can finish quickly.

## 2026-05-04 Visible Scene Object Pass

- Fruit Slash now renders visible fruit, bonus and penalty targets on top of the full-screen camera preview.
- Fruit Slash starts with initial visible targets so the player immediately sees what can be sliced before the first timed spawn.
- Dodge Run now renders the runner avatar and visible obstacle cards (`EGIL`, `ZIPLA`, `ENERJI`) from `DodgeRunSceneState`.
- Fit Challenge now renders a central active task card with progress, quality and points per rep.
- The object layer is generated from template scene state, which is driven by the published `GameDefinition` level config and rules.
- On-device screenshots captured:
  - `artifacts/screenshots/albago-fruit-objects-start.png`
  - `artifacts/screenshots/albago-fruit-visible.png`
  - `artifacts/screenshots/albago-dodge-objects.png`
  - `artifacts/screenshots/albago-fit-objects.png`

## 2026-05-04 Fruit Slash Camera Contact Pass

- Fruit Slash now supports direct camera-pose contact: wrist, index and thumb keypoints can collide with visible fruit targets.
- The contact event carries `targetId` metadata so the exact on-screen target is removed and scored.
- Fruit Slash no longer requires full-body visibility for hand-target contact; upper-body and hand pose can keep the game interactive.
- Rep-based events are still supported, so squat and jumping-jack can continue to drive slicing when full motion cycles are counted.
- On-device screenshot captured:
  - `artifacts/screenshots/albago-fruit-contact-ready.png`

## 2026-05-05 Admin-Driven V1 Pass

- The 3 public demo games now use remote definition v2 fields:
  - `orientation`
  - `cameraRequirement`
  - typed `assets.items[]`
  - `sceneConfig`
  - `interactionRules`
- Fruit Slash can now be published as a landscape hand-target game with panel-managed fruit/bonus/bomb assets, hit radius, object lifetime and spawn tuning.
- Dodge Run can now be published as a landscape full-body game with panel-managed runner/obstacle assets, lives, travel timing and obstacle spawn tuning.
- Fit Challenge can now be published as a portrait full-body game with panel-managed task sequence, points and icon assets.
- Admin asset upload supports PNG, WebP and sanitized SVG in local development.
- Android resolves uploaded assets when available and keeps native placeholders as the safety fallback.
- This pass verified build and schema integration. Manual physical gameplay video capture is still pending.

## 2026-05-06 Category and Sport Playlist Pass

- Admin-created games now have a category: `SPORT`, `FUN` or `EDUCATION`.
- Admin can filter game definitions by category and edit category/tags in the game form.
- A Program / Playlist Flow builder was added for multi-step sport or learning experiences.
- Fit Challenge now carries a sample sport playlist:
  - squat reps
  - jumping jack reps
  - jump rope reps
  - plank hold
- Android parses these fields and shows category filters plus program steps on the game prep screen.
- This is the first step toward sport programs that continue from one activity to the next without shipping a new APK.


## Fruit Slash

- oyun amacı: MotionEvent tabanlı hızlı refleks ve combo demosu
- desteklenen hareketler: `SQUAT`, `JUMPING_JACK`
- skor kuralları:
  - `JUMPING_JACK REP_COUNTED => +15`
  - `SQUAT REP_COUNTED => +10`
  - `BAD_FORM => combo reset ve isteğe bağlı ceza`
- config alanları:
  - `spawnRateMs`
  - `comboMultiplier`
  - `penaltyObjects`
  - `penaltyPoints`
- kabul kriterleri:
  - hareket geldiğinde hedef temizlenir
  - skor ve combo değişir
  - sonuç ekranı açılır
- bilinen sorunlar:
  - el takibi tabanlı gerçek slash yönü yok
- demo kanıtı:
  - video beklemede

## Dodge Run

- oyun amacı: hareketle aksiyon/engel kaçış demosu
- desteklenen hareketler: `SQUAT`, `JUMPING_JACK`, `JUMP_ROPE`
- skor kuralları:
  - `SQUAT REP_COUNTED => duck obstacle`
  - `JUMPING_JACK REP_COUNTED => jump obstacle`
  - `JUMP_ROPE REP_COUNTED => energy`
  - `BAD_FORM => can/tempo cezası`
- config alanları:
  - `lives`
  - `obstacleSpawnMs`
  - `damageOnMiss`
  - `baseDistancePerTick`
- kabul kriterleri:
  - engeller sahnede görünür
  - doğru hareket doğru obstacle tipini temizler
  - `USER_OUT_OF_FRAME` oyunu duraklatır
- bilinen sorunlar:
  - tam insanlı cihaz videosu beklemede
- demo kanıtı:
  - video beklemede

## Fit Challenge

- oyun amacı: fitness odaklı görev tabanlı egzersiz demosu
- desteklenen hareketler: `SQUAT`, `JUMPING_JACK`, `JUMP_ROPE`
- skor kuralları:
  - görevdeki her geçerli tekrar hedefi azaltır ve puan verir
  - `BAD_FORM => quality/accuracy düşürür`
- config alanları:
  - `showQualityScore`
  - `advanceAutomatically`
  - `tasks[]`
- kabul kriterleri:
  - görevler sırayla ilerler
  - tamamlanan görev sonraki göreve otomatik geçer
  - sonuç ekranı accuracy ve combo özetini gösterir
- bilinen sorunlar:
  - jump rope görevi halen prototype detector kalitesine bağlıdır
- demo kanıtı:
  - video beklemede

## Cihaz Kanıtı

- `artifacts/albago-sprint4-home-clean.png`
- `artifacts/albago-sprint4-foreground.png`
- `artifacts/albago-after-fix-home.png`
- `artifacts/crash-reports/catalog-crash-after-fix.log`
- `artifacts/demo-videos/*.mp4` kayıtları beklemede
