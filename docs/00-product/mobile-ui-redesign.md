# AlbaGo Mobile UI Redesign

## Design goal

AlbaGo should feel like a modern sport game, not a technical camera demo. The experience should make the first action obvious, keep camera-heavy screens calm, and make game screens feel energetic enough for a product demo.

## Reference screens

Reference folder reviewed:

- `stitch_a_l_ekran_splash/albago_ana_ekran`
- `stitch_a_l_ekran_splash/e_lence_modu`
- `stitch_a_l_ekran_splash/spor_modu`
- onboarding and camera-permission examples

The implementation adapts the reference direction instead of copying it directly.

## Design language

- high-contrast game surfaces
- clear hero area
- large primary CTA
- card-based game entries
- short text blocks
- motion/status pills for scanning
- debug details hidden behind QA controls

## Palette

- primary action: magenta to coral arcade gradient
- sport accent: green
- camera/status accent: blue
- warning/error: warm orange
- page background: dark plum game shell inspired by the reference splash/home screens
- cards: white or deep plum panels with rounded corners and high-contrast pills

## Typography

- existing Compose Material typography is retained for implementation speed
- hierarchy is expressed through weight, spacing and contrast
- compact controls avoid oversized hero text inside cards

## Card system

- game cards show title, description, duration, difficulty and supported motions
- scene cards show only the information needed during play
- result sheet summarizes score, combo, accuracy and motion counts

## Home wireframe

- AlbaGo hero
- main CTA: `Oyunları keşfet`
- daily goal row
- featured 3-game preview: Meyve Kesme, Engelden Kaçış, Spor Mücadelesi
- secondary actions: Egzersiz başlat, Hareket testi
- debug entry only in debug builds

## Catalog wireframe

- short `Oyunlar` header
- user-safe loading/error/empty/offline fallback state
- category chips: `Spor`, `Eglence`, `Egitim`
- 3 public demo game cards
- program-aware cards show a `Program` pill when the level has playlist steps
- each card leads to a detail/prep screen
- backend/debug wording stays inside QA surfaces, not product cards

## Game detail wireframe

- template hero
- duration, difficulty, target score and supported motions
- how-to-play instructions
- camera placement guidance
- category and program flow when available
- start and back actions

## Program/prep UX

Spor programs should not feel like one-off mini games. The prep screen now has space for a visible playlist:

- rep target step, for example `Squat x10`
- hold-pose step, for example `Plank 30 sn`
- rest step
- next activity guidance

This gives the admin panel a product direction for sport playlists while keeping the runtime safe and template-driven.

## Game HUD

- score
- time remaining
- combo
- accuracy
- active motion
- scene-specific target/can/task progress
- visible play objects over the camera:
  - Fruit Slash fruit, bonus and penalty targets
  - Dodge Run runner and obstacle cards
  - Fit Challenge active task card

## Result screen

- total score
- combo max
- accuracy
- motion counts
- sync status
- replay
- catalog return

## QA and debug

- QA panel is debug-only.
- QA includes backend override, config refresh, overlay toggle, sync retry, motion log clear and mock motion controls.

## 2026-05-03 implementation note

- The game catalog now avoids nested scroll containers to prevent Compose measurement crashes.
- Invalid remote/cache game content no longer reaches visible game cards as a crashing state.
- Turkish user-facing copy was tightened; remaining English/debug labels are intentionally constrained to QA surfaces.

## 2026-05-04 implementation note

- Active game play now uses a full-screen CameraX surface with HUD overlay instead of a half-height camera card.
- The game HUD is layered on top of the live camera with score, remaining time, combo, current motion, accuracy and template-specific scene state.
- The game HUD now includes a middle scene-object layer, so the player can see fruit, obstacles or the active task instead of only seeing score changes.
- Home cards were simplified after physical-device screenshot review: daily target is now a wide card, today/last-game metrics are readable dark cards, and repeated CTAs no longer use low-contrast white panels.
- Reference direction remains the dark arcade-sport style from `stitch_a_l_ekran_splash/albago_ana_ekran`, adapted with AlbaGo motion/game terminology.
- Debug start extras were added only for QA capture and do not change the normal user flow.
