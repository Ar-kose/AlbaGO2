# AlbaGo Game Studio — Pilot Runbook

## Pilot Amacı

Game Studio MVP'nin kontrollü bir kullanıcı grubuyla gerçek fiziksel ortamda test edilmesi. Amaç: oyun oluşturma, yayınlama, mobil katalogda görme, oynama, skor üretme ve sonuç takip zincirinin uçtan uca doğrulanması.

## Pilot Kapsamı

- Admin panelden oyun oluşturma ve düzenleme
- Game Studio workspace'te preview ve mock test
- Oyun publish etme
- Mobil uygulamada katalog yenileme ve oyunu görme
- Oyunu açma, oynama, skor üretme
- Oyun sonucunun backend'e gönderilmesi
- Admin session panelinde sonuç takibi
- Crash-free çalışma doğrulaması

## Pilot Dışı Kapsam

- Production deployment
- Push notification
- Gerçek asset storage/render (MVP'de local:// fallback)
- App Store / Play Store yayını
- Kullanıcı segmentasyonu veya cohort analizi
- Gelir modeli testi

## Kullanılacak APK

- **Dosya:** `android/app/build/outputs/apk/debug/app-debug.apk`
- **Build komutu:** `.\gradlew.bat :app:assembleDebug --no-daemon`
- **Build süresi:** ~1dk 20sn
- **Boyut:** ~109MB
- **Tip:** Debug (release değil)

## Backend / Admin Çalışma Şartları

Backend ve admin aynı makinede çalışıyor olmalı:

```powershell
# Backend (port 3000)
npm.cmd run start:dev --workspace backend

# Admin (port 3001)
PORT=3001 npm.cmd run dev --workspace admin
```

Mobil cihaz aynı ağda değilse USB ile bağlanmalı:
```powershell
adb reverse tcp:3000 tcp:3000
```

## Test Kullanıcı Rolleri

| Rol | Görev |
|---|---|
| Admin | Panelden oyun oluşturur, publish eder, session'ları takip eder |
| Tester | Mobil uygulamada oyun kataloğunu görür, oyunu açar, oynar, skor üretir |

## Test Cihazları

| Cihaz | Android | Durum |
|---|---|---|
| Xiaomi M2007J3SI | 12 (SDK 31) | Kanıtlandı (Faz 4 E2E) |
| Ek cihaz | 13/14 | Önerilir |

## Test Oyunları

| Oyun | Template | Durum |
|---|---|---|
| F4 Test Deve-Cuce Oyunu | SCENE_PLAY | PUBLISHED, active endpoint'te |
| Engelden Kacis | DODGE_RUN | PUBLISHED |
| Spor Mucadelesi | FIT_CHALLENGE | PUBLISHED |
| Deve Cuce | SCENE_PLAY | PUBLISHED |

## Test Süresi

- **Tahmini:** 1-2 saat
- **Önerilen:** 2 oturum (farklı günlerde)

## Geri Bildirim Toplama

Her test adımı için:
1. Test senaryosu uygulanır
2. Sonuç (PASS/FAIL) not edilir
3. FAIL durumunda ekran görüntüsü veya log alınır
4. `artifacts/verification/` altına kanıt dosyası yazılır

Geri bildirim formu: `game-studio-feedback-form-template.md`

## Başarı Kriterleri

- Tüm test senaryoları PASS
- En az 3 farklı oyun tipinde skor üretilmiş
- Admin session panelinde tüm sonuçlar görünür
- Sıfır fatal crash
- Rollback test edilmiş

## Durdurma Kriterleri

Aşağıdaki durumlardan herhangi biri gerçekleşirse pilot durdurulur:
- Fatal crash (kullanıcıya crash dialog'u gösteren hata)
- Session kaybı (skor üretilmesine rağmen backend'e gitmeyen sonuç)
- Admin panel erişilemezliği
- Oyun kataloğunun boş gelmesi (aktif oyunların kaybolması)

## Rollback Adımları

1. Admin panelden ilgili oyunun Studio sayfasına gir
2. "Rollback (Geri Al)" butonuna tıkla → oyun status'u REVIEW olur
3. Oyun aktif katalogdan kalkar
4. Kullanıcıya bilgi ver
5. Session verileri korunur (silinmez)

Detaylı rollback planı: `game-studio-rollback-plan.md`

## Kanıt Dosyaları

Tüm kanıtlar şurada toplanır:
```
artifacts/verification/p5-*.md
artifacts/crash-reports/p5-*.log
```

## Acil Durum İletişimi

- Pilot durdurma kararı → tüm test kullanıcılarına bildir
- APK dağıtımı durdur
- Backend log'ları al
- Crash log'ları al
- `artifacts/verification/p5-incident-*.md` oluştur
