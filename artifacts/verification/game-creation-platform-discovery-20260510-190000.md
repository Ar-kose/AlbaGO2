# AlbaGo Game Creation Platform — Discovery Report (Faz 0)

**Tarih:** 2026-05-10
**Branch:** `p21-neon-nav-supabase-catalog`
**Durum:** Keşif tamamlandı, kod değişikliği yapılmadı

---

## 1. Mevcut Mimari Özeti

AlbaGo 3 katmanlı bir motion-game platformudur:

```
Admin Panel (Next.js 14) → Backend API (NestJS) → Prisma → PostgreSQL
                                                         ↓
Android (Kotlin Compose)  →  CameraX → MediaPipe Pose → MotionEngine → GameRuntime
```

**Kritik mimari kısıt:** Yeni oyun mekanikleri Android'de yeni native template kodu gerektirir. Admin sadece mevcut template'lerin konfigürasyonunu değiştirebilir. Uzaktan kod çalıştırma desteklenmez (güvenlik kararı).

---

## 2. Template Registry (Mevcut)

### GameTemplate (6 değer, 4 public)

| Template | Destek | Scene State | Açıklama |
|----------|--------|-------------|----------|
| `FRUIT_SLASH` | ANDROID | `FruitSlashSceneState` | 3 lane'de meyve kesme, wrist keypoint collision |
| `DODGE_RUN` | ANDROID | `DodgeRunSceneState` | Engel kaçma, 3 obstacle type |
| `FIT_CHALLENGE` | ANDROID | `FitChallengeSceneState` | Görev bazlı spor challenge |
| `SCENE_PLAY` | ANDROID | `ScenePlaySceneState` | Genel prompt/object oyunları |
| `TARGET_HIT` | INTERNAL | `IdleSceneState` | Debug/internal only |
| `ENDLESS_RUNNER` | INTERNAL | `IdleSceneState` | Debug/internal only |

### MotionType (3 değer)

```
SQUAT, JUMPING_JACK, JUMP_ROPE
```

v3 schema'da `PLANK_HOLD` ek olarak var ama runtime'da dedektörü yok.

---

## 3. Android Runtime Yetenekleri

### GameSceneState hiyerarşisi (sealed interface)

```
GameSceneState
├── IdleSceneState           (TARGET_HIT, ENDLESS_RUNNER)
├── FruitSlashSceneState     (FRUIT_SLASH)
├── DodgeRunSceneState       (DODGE_RUN)
├── FitChallengeSceneState   (FIT_CHALLENGE)
└── ScenePlaySceneState      (SCENE_PLAY)
```

### Keypoint Collision (mevcut — SADECE FRUIT_SLASH)

- **Konum:** `AlbaMotionController.kt:626-666` — `buildGamePoseInteractionEvent()`
- **Kullanılan keypoint'ler:** `left_wrist, right_wrist, left_index, right_index, left_thumb, right_thumb`
- **Hit test:** normalized (0-1) koordinatlarda squared distance < hitRadius
- **Min confidence:** 0.15f
- **Mirroring:** sol-sağ ayna desteği var
- **Kısıt:** Sadece FRUIT_SLASH için hardcoded, genelleştirilmemiş

### InteractionRule.keypoints (MEVCUT ama KULLANILMIYOR)

```kotlin
// GameRuntime.kt line 140
data class InteractionRule(
    ...
    val keypoints: List<String> = emptyList(),  // TANIMLI ama runtime'da OKUNMUYOR
    ...
)
```

### Pose Altyapısı (33 MediaPipe landmark)

```
nose, left_eye_inner, left_eye, ..., left_wrist, right_wrist, 
left_hip, right_hip, left_knee, right_knee, left_ankle, right_ankle
```

Tüm landmark'lar normalize edilmiş koordinatlarla (0-1) kullanılabilir durumda.

---

## 4. Backend Validation (Mevcut)

### V1 Validation (`publish-validation.ts`)

- 6 template için allow list
- Template-specific checks: FRUIT_SLASH (spawnRateMs, defaultHitRadius), DODGE_RUN (lives, obstacleSpawnMs, travelMs), FIT_CHALLENGE (taskRulesJson), SCENE_PLAY (spawnRateMs, sceneConfig.objects)
- `hasRequiredAssets()` — template-specific asset key kontrolü
- **Eksik:** WHACK_A_MOLE veya diğer yeni template'ler için validation yok

### V3 Validation (`game-definition-v3.ts`)

- İleriye dönük, daha zengin schema
- **8 condition type:** MOTION_EVENT, POSE_CONTACT, TIMER_EXPIRED, OBJECT_EXPIRED, STEP_COMPLETED, SCORE_REACHED, LIFE_ZERO, QUIZ_ANSWERED
- **16 action type:** ADD_SCORE, REMOVE_OBJECT, SPAWN_OBJECT, DECREASE_LIFE, INCREASE_LIFE, PLAY_SOUND, SHOW_EFFECT, vb.
- **Scene type'lar:** PROMPT_SEQUENCE, OBJECT_SPAWN, LANE_OBSTACLES, TASK_SEQUENCE
- **Mevcut motion'lar:** SQUAT, JUMPING_JACK, JUMP_ROPE, PLANK_HOLD
- **Kısıt:** V1 ve V3 ayrı path'ler, ortak migration yok

### Contract Tipleri (`contracts.ts`)

- `GameDefinitionEntity` — merkezi kontrat
- `InteractionRuleEntity` — `input: MOTION_EVENT | POSE_CONTACT`, `keypoints: string[]`
- `SceneObjectDefinitionEntity` — `objectId, objectType, assetKey, position, size, hitRadius, requiredMotion`
- 6 seededGames (hardcoded TypeScript)

---

## 5. Admin Builder Yetenekleri

### Şu an yapılabilenler:
- 4 public template için oyun oluşturma/düzenleme
- SCENE_PLAY için scene object editor (add/remove/edit)
- Program/playlist builder (MOTION_REPS, HOLD_POSE, REST, INSTRUCTION)
- PNG/WebP/SVG asset upload (max 5MB)
- Motion rule editing (points, cooldown)
- Publish/rollback workflow
- V3 JSON preview
- Kategori filtreleme (dinamik — P21'de eklendi)

### Eksikler (Game Studio için):
- **Target position editor:** x/y koordinat editörü yok
- **Audio upload/mapping:** Ses dosyası upload ve event mapping yok
- **Preview runtime:** Browser'da oyun önizleme yok
- **Multi-level editing:** Sadece tek level
- **Keypoint editor:** Hangi keypoint'lerin hit yapacağı seçilemiyor
- **Spawn config editor:** spawn mode, interval, visibleMs ayarlanamıyor
- **Lives/score config:** Can ve skor konfigürasyonu UI'da yok
- **Reward rule editor:** Ödül kuralları düzenlenemiyor

---

## 6. WHACK_A_MOLE / POSE_CONTACT_TARGETS Entegrasyon Analizi

### Mevcut yapı taşları (var olan):

| Bileşen | Durum | Konum |
|---------|-------|-------|
| POSE_CONTACT condition | V3 schema'da tanımlı | `game-definition-v3.ts:33` |
| Keypoint listesi (33 landmark) | Mevcut | `PoseContracts.kt:92-124` |
| Normalized koordinatlar | Mevcut | `KeypointNormalizer` |
| Hit test (collision) | FRUIT_SLASH için çalışıyor | `AlbaMotionController.kt:626` |
| InteractionRule.keypoints | Tanımlı ama kullanılmıyor | `GameRuntime.kt:140` |
| Scene object modeli | V3'te var | `game-definition-v3.ts:70-77` |
| SCENE_PLAY renderer | Genel prompt/object | `GamesFeature.kt:841` |

### Eksik yapı taşları (yapılması gereken):

| Bileşen | Ne yapılmalı |
|---------|-------------|
| WHACK_A_MOLE GameSceneState | Yeni scene state sınıfı |
| Target spawn state machine | Config'ten okunan spawn mantığı |
| Keypoint collision detector | FRUIT_SLASH'tan genelleştirilmiş |
| Target position config | x/y normalized koordinatlar |
| Admin target editor | Görsel pozisyon editörü |
| WHACK_A_MOLE renderer | Android Compose overlay |
| Publish validation | Template-specific validation |
| Template registry | Yeni template kaydı |
| GameDefinition v4 | Yeni schema versiyonu |

---

## 7. Riskler

1. **V1/V3 schema çatallanması:** İki ayrı validation path'i var. v4 oluştururken ikisini birleştirmek veya v3'ü genişletmek gerekecek.

2. **MotionType sınırlı:** 3 motion var. WHACK_A_MOLE için `LEFT_HAND_HIT`, `RIGHT_HAND_HIT` gibi yeni motion'lar eklenmesi gerekebilir.

3. **Android'de yeni template = yeni kod:** Her yeni template için GameSceneState, renderer, ve state machine yazılması gerekiyor. Jenerik bir "config-driven scene" yaklaşımı yok.

4. **Admin'de template-specific editor'lar hardcoded:** `TemplateConfigEditor` her template için ayrı `when` branch'i. Yeni template eklemek için admin'de de kod değişikliği gerek.

5. **Test coverage:** Backend testleri (32/32) sadece mevcut 6 template'i kapsıyor. Yeni template testleri eklenmeli.

---

## 8. Faz 1 için Uygulama Önerisi

### Hedef: Contract & Registry katmanını genişlet

1. **GameTemplate genişletme:** `backend/src/common/contracts.ts` — `GameTemplateKey`'e `WHACK_A_MOLE`, `POSE_CONTACT_TARGETS` ekle
2. **android/core_runtime/GameRuntime.kt** — `GameTemplate` enum'ına ekle
3. **admin/src/lib/alba-api.ts** — `GameTemplate` type'ına ekle
4. **MotionType genişletme** (opsiyonel): Yeni motion'lar gerekirse
5. **TemplateSupportLevel ekle:** `ANDROID_SUPPORTED | WEB_PREVIEW_ONLY | EXPERIMENTAL`
6. **GameDefinition v4 şeması:** Yeni alanlar (targets, spawn config, audio events)
7. **Backend validation:** Template-specific validation kuralları

### Küçük, geri alınabilir adımlar:
- Her commit tek bir type/schema değişikliği
- Mevcut testleri sürekli çalıştır
- Her adımda backend/admin/Android build doğrula

---

## 9. Sonraki Adım

Faz 1 — Contract & Registry uygulamasına geç.

Çıktı: `artifacts/verification/game-platform-phase-1-contract-registry-YYYYMMDD-HHMMSS.md`
