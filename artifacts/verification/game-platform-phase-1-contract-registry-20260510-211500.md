# AlbaGo Game Platform — Faz 1 Verification Report

**Tarih:** 2026-05-10
**Faz:** 1 — Contract & Registry
**Branch:** `p21-neon-nav-supabase-catalog`

## Build Results

| Katman | Komut | Sonuç |
|--------|-------|-------|
| Backend | `tsc --noEmit` | PASS |
| Backend | `npm run test` | 40/40 PASS |
| Admin | `next build` | PASS (11 sayfa) |
| Android | `:app:assembleDebug` | BUILD SUCCESSFUL |

## Yapılan Değişiklikler

### 1. Backend Contract Registry (contracts.ts)

**GameTemplateKey genişletildi:** 6 → 24 template
- Eklenen: WHACK_A_MOLE, POSE_CONTACT_TARGETS, CAMERA_ARCADE_OVERLAY, RHYTHM_MOTION, POSE_HOLD, REP_COUNTER, MOTION_SEQUENCE, INTERVAL_WORKOUT, QUIZ, FLASHCARD, MEMORY_MATCH, TRUE_FALSE, MATCH_PAIRS, REACTION, CATCH_FALLING, AVOID_OBSTACLE, COLLECT_ITEMS, PROGRAM_FLOW, HYBRID_SCENE

**MotionType genişletildi:** 3 → 10 motion
- Eklenen: PLANK_HOLD, LEFT_HAND_HIT, RIGHT_HAND_HIT, BOTH_HANDS_UP, BALANCE, POSE_STABLE, POSE_LOST

**Yeni type'lar eklendi:**
- `TemplateSupportLevel`: ANDROID_SUPPORTED | WEB_PREVIEW_ONLY | EXPERIMENTAL
- `GameplayMechanic`: 16 mechanic
- `GameTheme`: 10 tema

**GameActionType genişletildi:** 8 → 16 aksiyon

### 2. Backend Module Updates

**games.module.ts:**
- `supportedTemplates` array 24 template'e genişletildi
- `TEMPLATE_RANK` Record ile tüm template'ler sıralandı
- `@IsIn()` decorator'ları 10 motion'a genişletildi

**publish-validation.ts:**
- `allowedTemplates` Set 24 template'e genişletildi

### 3. Android Runtime Registry (GameRuntime.kt)

**GameTemplate enum:** 6 → 24 değer
**TemplateSupportLevel enum eklendi**
**GameDefinition:** `supportLevel`, `mechanics` alanları eklendi
**GameActionType:** SPAWN_TARGET eklendi
**WHACK_A_MOLE scene state:**
- `WhackAMoleTarget`: targetId, x, y, radius, assetKey, hitBy, points
- `WhackAMoleSceneState`: targets, lives, maxActiveTargets, spawnIntervalMs, visibleMs, hit/miss sayıcıları
- `tickWhackAMole()`: spawn/deactivate state machine
- `handleWhackAMoleEvent()`: BAD_FORM/out-of-frame handling
- `initialWhackAMoleScene()`: config'ten target okuma

**GameDefinitionV3.kt:** Yeni template'ler `else` branch ile IdleSceneState'e düşüyor

**AlbaMotionController.kt:** publicTemplates listesi 4 → 11 template (ANDROID_SUPPORTED olanlar)

### 4. Android UI (GamesFeature.kt)

- `templateLabel()`: 24 template için label, else fallback
- `templateAccent()`: WHACK_A_MOLE/POSE_CONTACT için neon pembe
- `howToPlay()`: WHACK_A_MOLE için talimat
- `WhackAMoleScene` composable: neon sahnede hit/miss/can/spawn durumu
- `SceneStateCard` when: WhackAMoleSceneState branch + else

### 5. Admin API (alba-api.ts)

- `GameTemplate` type: 24 değer
- `PublicDemoTemplate`: WHACK_A_MOLE, POSE_CONTACT_TARGETS eklendi
- `MotionType`: 10 değer
- `TEMPLATE_LABELS`: tüm template'ler için Record
- `buildDemoDraft(WHACK_A_MOLE)`: 3 hedefli orman refleks oyunu
- `isPublicDemoTemplate`: yeni template'ler eklendi

## Eksikler / Sonraki Fazlara Kalan

- WHACK_A_MOLE renderer: hedef asset'leri overlay'de gösterme (Faz 5)
- Keypoint collision detector: pose keypoint → target hit (Faz 5)
- Admin target position editor: görsel x/y ayarlama (Faz 3)
- Audio upload ve event mapping (Faz 3)
- Web preview runtime (Faz 4)
- Detaylı test suite (Faz 2)
