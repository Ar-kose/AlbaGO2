# AlbaGo Master Roadmap — AI Agent Execution Plan

**Oluşturulma tarihi:** 2026-05-10  
**Amaç:** AlbaGo projesinin sonsuz geliştirme döngüsünü durdurmak, mevcut konumu netleştirmek ve çalışan/dağıtılabilir APK'ye giden yolu kapılı, işaretlenebilir ve doğrulanabilir adımlara bölmek.  
**Kullanım şekli:** AI ajanı bu dosyayı ana plan olarak takip eder. Bir madde yalnızca kabul kriteri ve doğrulama kanıtı tamamlandıysa `[x]` yapılır.

---

## 0. Tek Cümlelik Ürün Tanımı

AlbaGo; Android kamera üzerinden gerçek zamanlı vücut hareketlerini algılayıp kısa, tekrarlanabilir, oyunlaştırılmış egzersiz deneyimlerine dönüştüren **Android-first egzersiz ve mini oyun platformudur**.

Temel ürün vaadi:

1. Kullanıcının hareketi güvenilir şekilde sayılır.
2. Aynı hareketler farklı oyun şablonlarına bağlanabilir.
3. Yeni oyun varyasyonları ve içerikler admin panelden uzaktan yayınlanabilir.
4. Kullanıcı, kısa oturumlar sonunda skorunu, ilerlemesini ve senkronizasyon durumunu görebilir.

---

## 1. Mevcut Durum — Proje Şu Anda Nerede?

### 1.1 Kısa karar

Proje **bitmiş ürün** değil; fakat teknik prototip aşamasını geçmiş ve **platform-v2 / beta aday** seviyesine gelmiş durumda.

Şu anki en doğru tanım:

> **AlbaGo, debug/internal RC APK üretebilen, Android + backend + admin tarafı büyük ölçüde çalışan, fakat üretim/release APK ve çok cihazlı beta kabul kapıları tamamlanmamış bir MVP aday platformudur.**

### 1.2 Son güvenilir durum etiketi

- Branch: `platform-v2`
- P19 kararı: `CONDITIONAL GO`
- P19 durumu: 14 kapının tamamı sınıflandırılmış
- Full verification: 9/9 PASS, 11 ardışık başarılı koşum olarak raporlanmış
- Backend tests: 40/40 PASS olarak raporlanmış
- Android unit tests: PASS olarak raporlanmış
- Admin build: PASS olarak raporlanmış
- Beta package: APK assembled / packaging ready olarak raporlanmış
- Security: secret leak yok, PII yok, RLS regresyonu yok olarak raporlanmış
- Kalan ana risk: fiziksel Xiaomi cihaz smoke/sync/WorkManager e2e kanıtı cihaz erişimi nedeniyle risk accepted durumda

### 1.3 Şu anda çalışan ana parçalar

- Android native app:
  - Onboarding
  - Home
  - Sport / Education / Entertainment yüzeyleri
  - Demo oyun katalog akışı
  - Game prep ekranı
  - Aktif oyun deneyimi
  - Result screen
  - Profile ekranı
  - Room tabanlı lokal session geçmişi
  - WorkManager tabanlı sync queue altyapısı

- Motion / pose tarafı:
  - CameraX pipeline
  - MediaPipe pose asset
  - `SQUAT`, `JUMPING_JACK`, `JUMP_ROPE` motion desteği
  - Debug overlay ve mock motion injection
  - `JUMP_ROPE` hâlâ prototip kalite notu taşıyor

- Game runtime:
  - GameDefinition v3 parser
  - Template-specific runtime state
  - Program runner v1
  - `PLAY_GAME`, `MOTION_REPS`, `REST`, `INSTRUCTION`, `HOLD_POSE` adımları
  - Fruit Slash / Dodge Run / Fit Challenge
  - Scene Play / no-code komut oyunu altyapısı

- Backend:
  - NestJS modular monolith
  - Prisma/PostgreSQL repository sınırı
  - Game definitions
  - Game sessions
  - Profiles
  - Assets
  - Audit logs
  - Admin publish/rollback
  - RLS uygulanmış Supabase/PostgreSQL ortamı

- Admin:
  - Next.js admin console
  - Game definition CRUD
  - Publish/rollback
  - Asset upload
  - Category/tag/program step editor
  - Mobile payload preview

### 1.4 Henüz tamamlanmış ürün sayılmayan alanlar

Aşağıdaki maddeler bitmeden proje “hazır ürün” sayılmayacak:

- Release APK imzalama, build flavor ayrımı ve production güvenlik ayarları
- Debug-only QA yüzeylerinin release build'den kesin ayrılması
- `usesCleartextTraffic`, backend URL, versioning, signing, minify/shrink kararlarının release standardına bağlanması
- En az 3 fiziksel cihazda uçtan uca beta kabul testi
- WorkManager offline queue e2e kanıtı
- Fiziksel cihazda completed session → backend sync kanıtı
- Manual catalog tap walkthrough veya mirroring ile kanıt
- Play Store / dağıtım öncesi izin, gizlilik, veri güvenliği ve crash reporting hazırlığı
- Daily goals, leaderboard, reward flow, basic anti-cheat gibi MVP'de adı geçen fakat release için net kapıya bağlanmamış ürün parçaları
- Asset storage metadata'nın production kalıcı depoya alınması
- Admin dependency/security follow-up
- Auth / guest-to-profile migration kararlarının tamamlanması

---

## 2. Kapsam Disiplini

### 2.1 Bu roadmap'in ana hedefi

İlk hedef, yeni özellik üretmek değil:

> **Mevcut platformu güvenilir, doğrulanmış, dağıtılabilir bir Android APK seviyesine getirmek.**

### 2.2 MVP içinde kabul edilen kapsam

- Android native uygulama
- Kamera ve pose pipeline
- `SQUAT`, `JUMPING_JACK`, `JUMP_ROPE`
- Demo oyunlar ve game runtime
- Workout/session yönetimi
- Local persistence ve offline sync queue
- Remote game definition fetch + local validation
- Admin content publishing
- Asset upload / manifest
- Result screen ve session history
- Basic daily goals / rewards / leaderboard foundation
- Basic anti-cheat kontrolleri

### 2.3 Şimdilik kapsam dışı

Ajan bu alanlara plan dışı girmeyecek:

- iOS istemcisi
- Ödeme / subscription / paywall
- Reklam mediation
- Gerçek zamanlı multiplayer
- Sosyal ağ / friend graph
- Arbitrary script tabanlı genel oyun motoru
- Büyük UI redesign
- Yeni büyük game template ailesi
- AI coach / sesli koçluk
- Sunucu tarafı video analizi

---

## 3. Hazır Olma Seviyeleri

### 3.1 Demo-ready

Bu seviye büyük ölçüde geçmiş görünüyor.

- [x] Android debug APK assemble ediliyor
- [x] Üç demo oyun çalışıyor
- [x] Backend/admin build ve test geçiyor
- [x] P1/P2/P3/P4 kanıtları mevcut
- [x] RC APK ve SHA256 oluşturulmuş

### 3.2 Internal beta-ready

Bu seviye kısmen hazır, fakat yeniden kanıtlanmalı.

- [ ] En güncel branch'ten temiz APK üretildi
- [ ] En az 3 gerçek cihazda onboarding → 3 oyun → result → sync akışı tamamlandı
- [ ] Her cihaz için crash log kontrolü yapıldı
- [ ] Supabase/backend'de session sync kaydı doğrulandı
- [ ] Admin publish/refresh fiziksel cihazda doğrulandı
- [ ] Final beta report üretildi

### 3.3 Usable APK-ready

Kullanıcının “APK dosyası haline getirip kullanabilmek istiyorum” hedefi için minimum seviye budur.

- [ ] Release/beta flavor net
- [ ] Debug-only araçlar release build'de kapalı
- [ ] İmzalı APK veya AAB üretiliyor
- [ ] Backend URL production/staging değerleri güvenli yönetiliyor
- [ ] Cleartext sadece debug'da açık
- [ ] Crash reporting veya en azından log toplama stratejisi var
- [ ] Session kaybı yaşanmıyor
- [ ] Offline kullanımda lokal sonuç korunuyor
- [ ] Sync retry güvenilir çalışıyor
- [ ] Kullanıcı açısından ana akış kırılmıyor

### 3.4 Store-ready

Bu roadmap'in sonraki aşaması; ilk hedef değildir.

- [ ] Play Store signing / AAB
- [ ] Privacy policy
- [ ] Data Safety formu
- [ ] Permission disclosure
- [ ] Production crash analytics
- [ ] Release notes
- [ ] Beta track / internal testing setup
- [ ] App icon, screenshots, store listing

---

## 4. Ajan Çalışma Kuralları

Ajan bu dosyayı uygularken aşağıdaki kurallara uymalıdır.

### 4.1 İşaretleme kuralı

Bir görev ancak şu üç şey tamamlandıysa `[x]` yapılır:

1. Kod/doküman değişikliği tamamlandı.
2. Kabul kriterleri geçti.
3. Kanıt dosyası `artifacts/verification/` altına yazıldı.

### 4.2 Her fazın zorunlu çıktısı

Her faz sonunda şu dosya üretilir:

```text
artifacts/verification/pXX-<phase-name>-summary-YYYYMMDD-HHMMSS.md
```

İçerik minimum:

- Ne değişti?
- Hangi komutlar çalıştı?
- Hangi testler geçti/kaldı?
- APK path ve SHA256 varsa nedir?
- Kalan riskler nelerdir?
- Sonraki faza geçiş kararı: `GO`, `CONDITIONAL GO`, `NO-GO`

### 4.3 Yeni özellik yasağı

Aşağıdaki koşullardan biri varsa yeni özellik eklenmez:

- P0/P1 bug açık
- Full verification kırmızı
- APK assemble kırmızı
- Backend test kırmızı
- Security secret/PII riski açık
- Session sync veri kaybı riski açık
- Roadmap fazı tamamlanmadan yeni faza geçilmek isteniyor

### 4.4 Riskli işlem kuralı

Ajan şunları kullanıcı onayı olmadan yapmaz:

- Database drop/reset
- Production Supabase RLS değişikliği
- Key rotation
- Release signing key üretimi/değişimi
- Git history rewrite
- Büyük dependency upgrade
- `npm audit fix --force`
- Play Store veya dış dağıtım

---

## 5. Global Doğrulama Komutları

Ajan fazlardan sonra uygun olanları çalıştırmalı ve sonuçları kanıt dosyasına yazmalıdır.

### 5.1 Windows PowerShell ortamı

```powershell
$env:JAVA_HOME='C:\Program Files\Android\Android Studio\jbr'
$env:ANDROID_SDK_ROOT="$env:LOCALAPPDATA\Android\Sdk"
$env:ANDROID_HOME="$env:ANDROID_SDK_ROOT"
$env:GRADLE_USER_HOME='C:\gradle-cache'
$env:PATH="$env:JAVA_HOME\bin;$env:ANDROID_SDK_ROOT\platform-tools;$env:PATH"
```

### 5.2 Full platform verification

```powershell
powershell -ExecutionPolicy Bypass -File scripts/verify-platform-v2.ps1
```

### 5.3 Backend

```powershell
npm.cmd install
npm.cmd run prisma:generate --workspace backend
npm.cmd run build --workspace backend
npm.cmd run test --workspace backend
```

### 5.4 Admin

```powershell
npm.cmd run build --workspace admin
```

### 5.5 Android

```powershell
Set-Location android
.\gradlew.bat testDebugUnitTest --no-daemon
.\gradlew.bat :app:assembleDebug --no-daemon
Set-Location ..
```

### 5.6 APK hash

```powershell
Get-FileHash android\app\build\outputs\apk\debug\app-debug.apk -Algorithm SHA256
```

### 5.7 Physical device smoke

```powershell
adb devices -l
adb install -r android\app\build\outputs\apk\debug\app-debug.apk
adb reverse tcp:3000 tcp:3000
adb logcat -c
adb shell am start -n com.alba.app/com.alba.app.MainActivity
```

---

# 6. Roadmap Fazları

## P20 — Re-baseline & Sonsuz Döngüyü Durdurma

**Amaç:** Platform-v2'nin son durumunu tek gerçek baseline yapmak; eski, çelişkili veya tekrarlı planları kapatmak.

### Görevler

- [ ] P20.1 — `platform-v2` branch'inin güncel commit'ini kaydet.
  - Kabul: commit hash, branch adı ve working tree durumu kanıt dosyasına yazıldı.

- [ ] P20.2 — Working tree sınıflandırması yap.
  - Kabul: app/backend/admin/docs/artifacts/.agent/stitch/local settings değişiklikleri ayrı gruplandı.
  - Kabul: ownership-unclear dosyalar otomatik commitlenmedi.

- [ ] P20.3 — P19 risk accepted maddelerini açık issue olarak yeniden aç.
  - Açılacak riskler:
    - Xiaomi physical smoke
    - WorkManager e2e device proof
    - Completed session backend sync physical proof
    - Manual catalog tap/mirroring walkthrough
  - Kabul: `artifacts/verification/p20-risk-register-*.md` üretildi.

- [ ] P20.4 — Bu roadmap'i repoya ekle.
  - Hedef path: `docs/00-product/albago-master-roadmap.md`
  - Kabul: roadmap dosyası repo içinde var ve README'den referans veriliyor.

- [ ] P20.5 — Eski roadmap ve release dokümanlarını “historical” olarak etiketle.
  - Kabul: `docs/00-product/roadmap.md` artık bu dosyayı ana plan olarak gösteriyor.

- [ ] P20.6 — Full verification çalıştır.
  - Kabul: 9/9 PASS veya tüm kırıklar kanıtla raporlandı.

### P20 çıkış kriteri

- [ ] `GO`: Working tree temiz veya bilinçli sınıflandırılmış
- [ ] `GO`: Bu dosya ana plan olarak repoda
- [ ] `GO`: Full verification sonucu mevcut
- [ ] `NO-GO`: Testler kırmızıysa P21'e geçme

---

## P21 — Fiziksel Cihaz Kanıtlarını Kapatma

**Amaç:** Kodun zaten çalıştığı varsayımını bırakıp, gerçek cihaz üzerinde kullanıcı akışını kanıtlamak.

### Görevler

- [ ] P21.1 — En az 1 cihazda hızlı smoke yap.
  - Akış: launch → onboarding → home → demo catalog → 1 oyun → result.
  - Kabul: crash log yok.

- [ ] P21.2 — Xiaomi veya mevcut ana test cihazında P19 risklerini kapat.
  - Kabul: Xiaomi cihaz hâlâ yoksa başka fiziksel cihazla test yapılır; Xiaomi özel riski ayrı kalır.

- [ ] P21.3 — Manual catalog tap walkthrough tamamla.
  - Yöntem: fiziksel dokunuş, Android Studio Device Mirroring veya scrcpy.
  - Kabul: kullanıcı gerçekten katalog kartına dokunarak oyuna girdi.

- [ ] P21.4 — Üç demo oyunu gerçek flow ile test et.
  - Fruit Slash
  - Dodge Run
  - Fit Challenge
  - Kabul: her oyun result screen'e ulaştı.

- [ ] P21.5 — Completed game session backend sync kanıtı al.
  - Kabul: backend/Supabase tarafında yeni session kaydı görüldü.
  - Kabul: aynı `clientSessionId` tekrarlandığında duplicate/idempotent davranış doğrulandı.

- [ ] P21.6 — Offline sync testi yap.
  - Adımlar:
    1. Backend/network kapalıyken oyun bitir.
    2. Result screen'in kaybolmadığını doğrula.
    3. Profile/local history'de session gör.
    4. Network açılınca WorkManager retry ile sync olduğunu doğrula.
  - Kabul: queue pending → synced geçişi kanıtlandı.

- [ ] P21.7 — Crash log ve video kanıtlarını kaydet.
  - Path:
    - `artifacts/crash-reports/p21-*`
    - `artifacts/demo-videos/p21-*`
    - `artifacts/verification/p21-device-acceptance-summary-*.md`

### P21 çıkış kriteri

- [ ] 1 fiziksel cihaz PASS
- [ ] 3 oyun PASS
- [ ] Session sync PASS
- [ ] Offline retry PASS
- [ ] Crash scan PASS

---

## P22 — Release/Beta APK Paketleme Standardı

**Amaç:** Debug APK üreten projeyi, kullanılabilir beta/release APK üreten projeye çevirmek.

### Görevler

- [ ] P22.1 — Android build flavor ayrımı yap.
  - Önerilen flavor/build types:
    - `debug`: local backend, QA panel açık
    - `beta`: staging/Supabase backend, QA panel sınırlı veya kapalı
    - `release`: production config, QA panel kapalı
  - Kabul: `BuildConfig.DEBUG` dışında açık `ALBA_QA_ENABLED` gibi net flag var.

- [ ] P22.2 — Release signing planını oluştur.
  - Kabul: signing key dosyası repoya eklenmedi.
  - Kabul: `keystore.properties.example` oluşturuldu.
  - Kabul: gerçek keystore path secret olarak tutuldu.

- [ ] P22.3 — Versioning standardını belirle.
  - Şu an görünen durum: `versionCode = 1`, `versionName = 0.1.0`.
  - Kabul: her beta/release build için versionCode artıyor.
  - Kabul: APK metadata dosyası üretiliyor.

- [ ] P22.4 — Cleartext policy'yi güvenli hale getir.
  - Kabul: cleartext sadece debug/local için açık.
  - Kabul: beta/release için network security config net.

- [ ] P22.5 — Release build smoke yap.
  - Komut örneği:

```powershell
Set-Location android
.\gradlew.bat :app:assembleRelease --no-daemon
Set-Location ..
```

- [ ] P22.6 — APK boyutu ve shrink kararı ver.
  - Kabul: APK size raporlandı.
  - Kabul: MediaPipe model ve asset boyut etkisi not edildi.
  - Kabul: minify/shrink/resource shrink açılacaksa smoke test tekrarlandı.

- [ ] P22.7 — Debug-only kod sızıntısı kontrolü yap.
  - Kontrol:
    - QA panel
    - mock motion buttons
    - backend override
    - debug launch extras
    - verbose logs
  - Kabul: beta/release kullanıcı akışında görünmüyor.

### P22 çıkış kriteri

- [ ] İmzalı veya imzalanabilir release APK üretildi
- [ ] SHA256 yazıldı
- [ ] Debug-only yüzeyler kapalı
- [ ] Release install smoke PASS

---

## P23 — Backend Persistence & Production Environment Sertleştirme

**Amaç:** Backend'in demo/in-memory davranışından production/staging güvenilirliğine geçmesi.

### Görevler

- [ ] P23.1 — Environment contract'i netleştir.
  - Kabul: `.env.example` eksiksiz.
  - Kabul: production'da in-memory fallback fail-fast.

- [ ] P23.2 — Prisma migration deploy akışını doğrula.

```powershell
npm.cmd run prisma:generate --workspace backend
npm.cmd run prisma:migrate:deploy --workspace backend
npm.cmd run prisma:seed --workspace backend
```

- [ ] P23.3 — Supabase/PostgreSQL bağlantı smoke yap.
  - Kabul: backend start log persistence mode `prisma` gösteriyor.
  - Kabul: game definition ve game session yazılıyor.

- [ ] P23.4 — RLS regression script/check oluştur.
  - Kabul: 47/47 tablo RLS durumu otomatik doğrulanıyor.

- [ ] P23.5 — Asset metadata persistence'ı production hale getir.
  - Mevcut borç: local upload metadata process memory'de.
  - Kabul: asset metadata DB veya S3-compatible metadata store'a yazılıyor.
  - Kabul: backend restart sonrası asset listesi kaybolmuyor.

- [ ] P23.6 — Admin auth/token güvenliğini netleştir.
  - Kabul: internal endpoints admin guard ile korunuyor.
  - Kabul: service role key client'a sızmıyor.
  - Kabul: audit log actor bilgisi tutarlı.

- [ ] P23.7 — Dependency security follow-up.
  - Kabul: backend audit temiz veya kabul edilmiş risk belgelendi.
  - Kabul: admin Next/PostCSS bulguları fix/defer kararıyla kaydedildi.
  - Yasak: `npm audit fix --force` kullanıcı onayı olmadan çalıştırma.

### P23 çıkış kriteri

- [ ] Persistent DB PASS
- [ ] Asset metadata persistent PASS
- [ ] RLS regression PASS
- [ ] Admin/internal auth PASS
- [ ] Audit risk register güncel

---

## P24 — User, Profile, Auth & Guest Migration

**Amaç:** Guest-first deneyimi bozmadan kullanıcı/profil sisteminin güvenli temelini tamamlamak.

### Görevler

- [ ] P24.1 — Guest identity kararını belgele.
  - Kabul: anonymous session → profile migration dokümanı güncel.
  - Kabul: explicit consent prensibi korunuyor.

- [ ] P24.2 — Profile endpoint canlı doğrulama.
  - `GET /v1/profiles/me`
  - `PUT /v1/profiles/me`
  - Kabul: backend restart sonrası route prefix bug yok.

- [ ] P24.3 — Android profile UI polish.
  - Kabul: local Room history düzgün gösteriliyor.
  - Kabul: pending/synced/failed state anlaşılır.
  - Kabul: kullanıcıya yanıltıcı “hesap hazır” mesajı verilmiyor.

- [ ] P24.4 — Auth provider design freeze.
  - Karar verilecek:
    - Supabase Auth mı?
    - Backend-issued guest token mı?
    - Hybrid mi?
  - Kabul: tehdit modeli ve migration path yazıldı.

- [ ] P24.5 — Guest-to-account migration POC.
  - Kabul: mevcut lokal session history kaybolmuyor.
  - Kabul: backend profile ile eşleşme idempotent.

### P24 çıkış kriteri

- [ ] Guest-first akış bozulmadı
- [ ] Profile canlı endpoint PASS
- [ ] Auth design approved
- [ ] Session migration data-loss risk yok

---

## P25 — Motion Quality & Camera Readiness

**Amaç:** Kullanıcının hareketini güvenilir saymak; yanlış pozisyon, kötü kadraj ve prototip motion risklerini azaltmak.

### Görevler

- [ ] P25.1 — Camera readiness card'ı game detail/prep flow'a bağla.
  - Gereksinimler:
    - `FULL_BODY`
    - `UPPER_BODY`
    - `HAND_TARGET`
  - Kabul: kullanıcı oyuna başlamadan gerekli kadrajı görüyor.

- [ ] P25.2 — Motion detector acceptance test matrisi oluştur.
  - Motions:
    - `SQUAT`
    - `JUMPING_JACK`
    - `JUMP_ROPE`
  - Kabul: her motion için valid rep, bad form, out-of-frame, cooldown testi var.

- [ ] P25.3 — `JUMP_ROPE` prototip riskini kapat veya kapsamdan çıkar.
  - Karar seçenekleri:
    - A: P25'te kaliteyi yükselt
    - B: release gate dışında bırak ama UI'da dürüst göster
  - Kabul: karar belgelendi.

- [ ] P25.4 — `HOLD_POSE` gerçek pose detection kararını ver.
  - Mevcut durum: timer-gated v1.
  - Kabul: release için timer-gated kalacaksa kullanıcı copy'si yanıltıcı değil.
  - Kabul: gerçek plank/push-up/lunge motion backlog'a taşındı.

- [ ] P25.5 — 15+ FPS hedefini ölç.
  - Kabul: en az 1 fiziksel cihazda pose pipeline FPS ölçümü var.
  - Kabul: düşük FPS fallback davranışı belgelendi.

- [ ] P25.6 — Camera permission failure UX.
  - Kabul: izin reddedilirse kullanıcı çıkmaz sokakta kalmıyor.
  - Kabul: ayarlara yönlendirme veya alternatif açıklama var.

### P25 çıkış kriteri

- [ ] Camera readiness wired
- [ ] Motion test matrix PASS
- [ ] JUMP_ROPE kararı net
- [ ] FPS ölçümü var
- [ ] Permission UX PASS

---

## P26 — Game Runtime & Content Platform Stabilizasyonu

**Amaç:** Admin'den yayınlanan içeriklerin Android'i çökertmemesini ve yeni oyun varyasyonlarının app update gerektirmeden güvenli çalışmasını sağlamak.

### Görevler

- [ ] P26.1 — GameDefinition v3 contract freeze.
  - Kabul: backend/admin/android/openapi aynı sözleşmeyi kullanıyor.
  - Kabul: eski/invalid payload safe reject veya fallback alıyor.

- [ ] P26.2 — Scene Play uçtan uca regression.
  - Akış: admin create → validate → publish → Android refresh → play → result.
  - Kabul: app rebuild olmadan çalışıyor.

- [ ] P26.3 — Asset cache invalidation/versioning tasarımı.
  - Mevcut borç: image loader cache-first davranışı explicit invalidation içermiyor.
  - Kabul: asset key/version/sha256 davranışı net.

- [ ] P26.4 — Publish validation negatif testleri.
  - Testler:
    - missing level
    - invalid motion
    - invalid enum
    - missing asset
    - unsafe SVG
    - unsupported min app version
  - Kabul: backend reject, Android crash yok.

- [ ] P26.5 — Program runner e2e.
  - Akış:
    - `MOTION_REPS`
    - `REST`
    - `HOLD_POSE`
    - `INSTRUCTION`
    - `PLAY_GAME`
  - Kabul: step progression görülebilir ve testli.

### P26 çıkış kriteri

- [ ] Contract tests PASS
- [ ] Scene Play e2e PASS
- [ ] Asset invalidation kararı var
- [ ] Publish validation negatif testleri PASS
- [ ] Program runner e2e PASS

---

## P27 — MVP Product Features: Goals, Rewards, Leaderboard, Anti-cheat

**Amaç:** MVP kapsamına yazılmış fakat ürün kapısı olarak netleşmemiş temel oyunlaştırma parçalarını minimum çalışır hale getirmek.

### Görevler

- [ ] P27.1 — Daily goals minimum model.
  - Kabul: kullanıcı günlük hedef ilerlemesini görebiliyor.
  - Kabul: local-first veya backend-backed karar belgelendi.

- [ ] P27.2 — Reward flow minimum model.
  - Kabul: oyun sonucu → reward calculation → UI feedback.
  - Kabul: idempotency var.

- [ ] P27.3 — Leaderboard foundation.
  - Kabul: en az gameKey bazlı skor listesi backend'de üretilebiliyor.
  - Kabul: PII göstermiyor; guest display name güvenli.

- [ ] P27.4 — Basic anti-cheat kontrolleri.
  - Minimum kontroller:
    - clientSessionId idempotency
    - duration/score sanity check
    - impossible rep rate check
    - duplicate submit protection
  - Kabul: backend reject/warn davranışı testli.

- [ ] P27.5 — Product copy review.
  - Kabul: “yakında” olan alanlar net; kullanıcı çalışan özelliği çalışmayanla karıştırmıyor.

### P27 çıkış kriteri

- [ ] Daily goal MVP PASS
- [ ] Reward MVP PASS
- [ ] Leaderboard foundation PASS
- [ ] Anti-cheat basic PASS
- [ ] Copy honesty PASS

---

## P28 — QA Automation & Regression Harness

**Amaç:** Her yeni AI ajan koşumunda aynı şeylerin tekrar tekrar bozulmasını engellemek.

### Görevler

- [ ] P28.1 — Verification script'i gate bazlı rapor üretecek hale getir.
  - Kabul: hangi adımın kırıldığı net görülüyor.

- [ ] P28.2 — Android smoke script'lerini standardize et.
  - Preflight
  - Install
  - Launch
  - Crash scan
  - Direct QA game launch
  - Video capture

- [ ] P28.3 — Backend contract regression.
  - Kabul: OpenAPI ile backend response shape uyumsuzluğu yakalanıyor.

- [ ] P28.4 — Admin publish Playwright veya API smoke.
  - Kabul: UI veya API üzerinden publish/rollback smoke otomatik.

- [ ] P28.5 — Artifact index generator.
  - Kabul: her release/pilot için tek evidence index otomatik yazılıyor.

- [ ] P28.6 — Flaky environment guard.
  - Kontroller:
    - Java version
    - Android SDK path
    - Gradle cache
    - `GRADLE_USER_HOME`
    - adb device availability
  - Kabul: yanlış ortamda net hata mesajı.

### P28 çıkış kriteri

- [ ] Full verification script deterministik
- [ ] Android smoke otomasyonlu
- [ ] Evidence index otomatik
- [ ] Environment guard PASS

---

## P29 — Controlled Beta Pilot

**Amaç:** Gerçek kullanıcı/cihaz verisiyle ürünün kırılmadığını görmek.

### Görevler

- [ ] P29.1 — Beta APK paketini üret.
  - Kabul: APK path, SHA256, versionCode, versionName kaydedildi.

- [ ] P29.2 — Tester onboarding dokümanını güncelle.
  - Kabul: kurulum, izinler, backend bağlantısı, test akışı net.

- [ ] P29.3 — En az 3 fiziksel cihaz belirle.
  - Kabul: cihaz modeli ve Android version kaydedildi.

- [ ] P29.4 — Her tester için tam akış.
  - Onboarding
  - Home
  - Demo catalog
  - 3 demo oyun
  - Result
  - Sync state
  - Profile/history
  - Back navigation
  - Crash log

- [ ] P29.5 — Issue triage.
  - Severity:
    - P0: crash/data loss/security
    - P1: game unplayable/sync broken/navigation trap
    - P2: önemli UX
    - P3: minor
    - P4: öneri

- [ ] P29.6 — Hotfix policy uygula.
  - Kabul: sadece P0/P1 için hotfix.
  - Kabul: P2/P3/P4 sonraki sprint backlog'a taşındı.

- [ ] P29.7 — Final pilot report.
  - Karar: PASS / CONDITIONAL PASS / FAIL

### P29 çıkış kriteri

- [ ] 3+ cihaz PASS
- [ ] No P0/P1
- [ ] Sync verified
- [ ] Admin publish/refresh stable
- [ ] Final pilot report mevcut

---

## P30 — Play Store / Dış Dağıtım Hazırlığı

**Amaç:** APK kullanımı mümkün hale geldikten sonra dış dağıtıma hazırlanmak.

### Görevler

- [ ] P30.1 — APK yerine AAB stratejisini değerlendir.
  - Kabul: internal test için APK, Play Store için AAB kararı net.

- [ ] P30.2 — Play signing ve release key yönetimi.
  - Kabul: key repoya girmiyor.

- [ ] P30.3 — Privacy policy.
  - Kapsam:
    - Kamera izni
    - Motion/pose işleme
    - Session result data
    - Profile/display name
    - Crash/log data
  - Kabul: kullanıcıya video upload edilmediği veya edilirse nasıl işlendiği net anlatılıyor.

- [ ] P30.4 — Data Safety formu hazırlığı.
  - Kabul: hangi veri toplanıyor, hangisi cihazda kalıyor, hangisi backend'e gidiyor belgelendi.

- [ ] P30.5 — Permission copy.
  - Kabul: kamera izni neden gerekli, uygulama içinde açık.

- [ ] P30.6 — Store listing assets.
  - App name
  - Short description
  - Long description
  - Screenshots
  - Icon
  - Feature graphic

- [ ] P30.7 — Production monitoring.
  - Crash reporting
  - Basic analytics
  - Sync failure rate
  - Backend 4xx/5xx rate
  - Worker retry/failure rate

### P30 çıkış kriteri

- [ ] Internal testing track hazır
- [ ] Privacy/Data Safety hazır
- [ ] Monitoring hazır
- [ ] Release notes hazır

---

# 7. Öncelik Sırası — Ajan İçin Net Komut

Ajan sırayı bozmayacak:

1. **P20:** Baseline ve planı sabitle
2. **P21:** Fiziksel cihaz kanıtlarını kapat
3. **P22:** Release/beta APK standardını kur
4. **P23:** Backend/persistence/security hardening
5. **P24:** Profile/auth/guest migration
6. **P25:** Motion/camera kalite kapıları
7. **P26:** Game runtime/admin content stabilizasyonu
8. **P27:** Goals/rewards/leaderboard/anti-cheat
9. **P28:** Regression automation
10. **P29:** Controlled beta pilot
11. **P30:** Play Store/dış dağıtım hazırlığı

---

# 8. Bug / Issue Severity Tanımı

## P0 — Durdurucu

- App cold launch crash
- Data loss
- Secret leak
- Security bypass
- Backend migration destructive failure

Aksiyon: geliştirmeyi durdur, rollback/hotfix.

## P1 — Beta engelleyici

- Oyun başlayamıyor veya tamamlanamıyor
- Result screen kayboluyor
- Session sync tamamen kırık
- Navigation trap
- Camera permission akışı çıkmaza giriyor

Aksiyon: hotfix veya faz içinde çözmeden ilerleme yok.

## P2 — Önemli ama blocker değil

- UX karışıklığı
- Bazı cihazlarda düşük FPS
- Tek motion kalitesi zayıf
- Admin publish edge case

Aksiyon: faz içinde veya sonraki faz backlog.

## P3/P4 — İyileştirme

- Copy polish
- Görsel küçük iyileştirme
- Yeni oyun fikri
- Nice-to-have analytics

Aksiyon: release kapıları bitmeden yapılmaz.

---

# 9. Minimum Acceptance Test Matrisi

Her “APK hazır” iddiasından önce bu matris geçmeli.

| Alan | Test | Beklenen |
|---|---|---|
| Launch | Cold start | Crash yok |
| Permission | Camera allow/deny | Çıkmaz sokak yok |
| Onboarding | Full onboarding | Home'a geçer |
| Catalog | Manual tap | Game prep açılır |
| Fruit Slash | Play → result | Skor ve sync state görünür |
| Dodge Run | Play → result | Skor ve sync state görünür |
| Fit Challenge | Play → result | Program/task progress görünür |
| Offline | Network kapalı result | Local save korunur |
| Retry | Network geri gelir | Queue sync olur |
| Profile | Recent sessions | Room verisi görünür |
| Backend | POST /v1/game-sessions | Idempotent |
| Admin | Publish/refresh | Android yeni config'i alır |
| Security | Secret scan | Secret yok |
| Build | Backend/admin/Android | PASS |
| APK | SHA256 | Metadata yazılır |

---

# 10. “Hazır” Kararı İçin Final Checklist

## 10.1 Internal usable APK

- [ ] P20 PASS
- [ ] P21 PASS
- [ ] P22 PASS
- [ ] Backend/admin/Android full verification PASS
- [ ] En az 1 fiziksel cihazda tam akış PASS
- [ ] APK SHA256 mevcut
- [ ] Bilinen riskler kullanıcıya açık

## 10.2 Beta pilot APK

- [ ] Internal usable APK PASS
- [ ] P23 critical hardening PASS
- [ ] P25 camera/motion gates PASS
- [ ] 3 cihazlık P29 pilot planı hazır
- [ ] Rollback/hotfix policy hazır

## 10.3 Production candidate

- [ ] Beta pilot PASS
- [ ] P30 privacy/data safety hazır
- [ ] Release build signing tamam
- [ ] Monitoring var
- [ ] No P0/P1 açık

---

# 11. Ajanın İlk Yapacağı İş

Ajan bir sonraki çalışmada doğrudan şunu yapmalı:

```text
P20.1 ile başla: platform-v2 branch/commit/working-tree durumunu çıkar.
Ardından P20.2 working tree sınıflandırmasını yaz.
Kod değiştirme. Önce mevcut durumu sabitle ve kanıt dosyası üret.
```

İlk kanıt dosyası önerisi:

```text
artifacts/verification/p20-baseline-and-roadmap-adoption-YYYYMMDD-HHMMSS.md
```

---

# 12. Bu Planın Başarı Ölçütü

Bu roadmap başarılı sayılırsa:

- Proje artık “sürekli bir şeyler eklenen” belirsiz loop'ta kalmaz.
- Her fazın net giriş/çıkış kriteri olur.
- AI ajanı hangi işi yapacağını, ne zaman duracağını ve neyi kanıtlayacağını bilir.
- Kullanıcı hangi seviyede olduğunu görür:
  - demo-ready
  - internal beta-ready
  - usable APK-ready
  - store-ready
- Çalışan APK üretimi, test ve kanıtla bağlanır.

