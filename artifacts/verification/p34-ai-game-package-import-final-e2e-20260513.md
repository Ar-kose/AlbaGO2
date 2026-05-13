# P34 — AI Game Package Import Final E2E Verification

## Tarih
2026-05-13

## Karar

```
P34 VERTICAL SLICE COMPLETE
ALBAGO_GAME_PACKAGE import → validate → draft → publish → active endpoint → mobile zinciri calisiyor.
FRUIT_SLASH template destegi tamam.
```

---

## 1. Final E2E Test Matrisi

| # | Test | Sonuc |
|---|------|-------|
| 1 | Backend build | PASS |
| 2 | Backend test | PASS (5 suites, 89/89) |
| 3 | Admin build | PASS (14 routes) |
| 4 | Valid FRUIT_SLASH validate | PASS |
| 5 | Invalid template (BOSS_CHALLENGE) | ERROR |
| 6 | Missing cover | ERROR |
| 7 | local:// cover | ERROR |
| 8 | Unsupported motion | ERROR |
| 9 | Forbidden field (token, script) | ERROR |
| 10 | Import → Draft | PASS (game_... DRAFT) |
| 11 | Draft Studio'da aciliyor | redirectTo mevcut |
| 12 | title korunuyor | PASS ("P34 Final Meyve Kesme") |
| 13 | template korunuyor | PASS (FRUIT_SLASH) |
| 14 | category korunuyor | PASS (FUN) |
| 15 | orientation korunuyor | PASS (LANDSCAPE) |
| 16 | assets.cover korunuyor | PASS (https://albago.tr/assets/covers/test.png) |
| 17 | rules motionRules'a donustu | PASS (JUMPING_JACK +15, SQUAT +10) |
| 18 | scoring rewardRules'a donustu | PASS (STAR x3, min 420) |
| 19 | interactionRules default | PASS (POSE_CONTACT + MOTION_EVENT) |
| 20 | Publish validation | PASS (0 errors) |
| 21 | Publish | PASS (published: true) |
| 22 | Active endpoint | PASS (5 active games, P34 included) |
| 23 | Active endpoint category | PASS (FUN) |
| 24 | Active endpoint template | PASS (FRUIT_SLASH) |
| 25 | Active endpoint orientation | PASS (LANDSCAPE) |
| 26 | Active endpoint cover | PASS (https://albago.tr/assets/covers/test.png) |
| 27 | Android build | PASS |
| 28 | /games route | 200 |
| 29 | /games/new route | 200 |
| 30 | /games/import route | 200 |
| 31 | /assets route | 200 |
| 32 | /analytics route | 200 |
| 33 | Sidebar "Paket Ice Aktar" | Gorunuyor |

---

## 2. Yeni Dosyalar (P34)

### Backend (4 dosya)
```
backend/src/game-packages/game-package.types.ts     — TypeScript types
backend/src/game-packages/game-package.validator.ts  — Schema + runtime + asset + security validator
backend/src/game-packages/game-package.mapper.ts     — Package → GameDefinitionEntity mapper
backend/src/game-packages/game-packages.module.ts    — NestJS module (validate + import)
```

### Admin (2 dosya)
```
admin/src/lib/game-package-api.ts                    — Frontend API client
admin/src/app/(admin)/games/import/page.tsx          — Import page UI
```

### Guncellenen (3 dosya)
```
backend/src/app.module.ts                            — GamePackagesModule import
admin/src/app/components/admin-sidebar.tsx            — "Paket Ice Aktar" nav
```

---

## 3. API Endpoint'leri

| Endpoint | Method | Amac |
|----------|--------|------|
| /internal/game-packages/validate | POST | Paket schema + runtime + asset + security validation |
| /internal/game-packages/import | POST | Validated paketi GameDefinition DRAFT'a donustur |

---

## 4. Validation Kurallari (17 kural)

| Kod | Aciklama |
|-----|----------|
| invalid_json | JSON parse edilemedi |
| invalid_schema_version | schemaVersion "1.0" degil |
| invalid_package_type | packageType "ALBAGO_GAME_PACKAGE" degil |
| missing_game_title | Oyun basligi yok |
| unsupported_template | Template desteklenmiyor |
| invalid_category | Kategori gecersiz |
| invalid_orientation | Orientation gecersiz |
| invalid_camera_requirement | Kamera gereksinimi gecersiz |
| invalid_duration | Sure 5-600 arasinda degil |
| missing_cover | Kapak gorseli eksik |
| local_uri_not_allowed | local:// veya file:// URI |
| invalid_asset_url | Gecersiz URL veya private IP |
| unsupported_motion | Hareket desteklenmiyor |
| unsupported_event | Event desteklenmiyor |
| forbidden_field | Yasakli alan (token, script, vb) |
| missing_assets | assets alani eksik |

---

## 5. Veri Akisi (Kanitlanmis)

```
AI Game Package JSON
  → Admin /games/import → paste JSON → "Dogrula"
  → POST /internal/game-packages/validate
  → Schema + template + category + orientation + cover + asset + motion + security check
  → Validation panel (ozet + runtime uyumlulugu + hatalar)
  → "Draft Olustur"
  → POST /internal/game-packages/import
  → mapGamePackageToEntity()
  → GameDefinitionEntity (DRAFT)
  → GameDefinitionsRepository.save()
  → "Studio'da Ac" → /games/:id/studio
  → Preview / Publish
  → GET /v1/game-definitions/active
  → Android katalog → FRUIT_SLASH oyunu FUN kategorisinde
```

---

## Sonraki Adimlar (P34 hardening)

```
- SCENE_PLAY, DODGE_RUN, FIT_CHALLENGE template destegi
- .albago-game.zip import
- Paket icindeki gorselleri otomatik PHP asset server'a yukleme
- AI paket kalite skoru
- Versioned package registry
```
