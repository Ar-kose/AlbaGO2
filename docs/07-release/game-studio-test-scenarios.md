# AlbaGo Game Studio — Test Senaryoları

## Test Matrisi

Her senaryo için: uygula, sonucu PASS/FAIL olarak işaretle, FAIL ise kanıt ekle.

---

## S1 — Admin Oyun Oluşturma

| Adım | Beklenen |
|---|---|
| `/games/new` sayfasına git | 6 şablon kartı görünür |
| "Komut Takip Oyunu" seç | Wizard açılır, step 3'te başlar |
| Oyun adı gir: "Pilot Test Oyunu" | Ad alanı dolar |
| Açıklama gir | Açıklama alanı dolar |
| "İleri" ile tüm adımları geç | Step 6'ya ulaşılır |
| "Taslak Kaydet"e tıkla | "Taslak kaydedildi" ve oyun ID'si görünür |

**Sonuç:** PASS / FAIL

---

## S2 — Game Studio Preview Testi

| Adım | Beklenen |
|---|---|
| Oluşturulan oyunun Studio sayfasına git | 3 kolonlu workspace açılır |
| Mock Motion Console'dan SQUAT seç, "Doğru Hareket" tıkla | Preview'da skor +10 artar |
| "Yanlış Form" tıkla | Preview'da "Yanlış form!" feedback'i görünür |
| Event Log'da hareketler listelenir | MOTION event'leri görünür |

**Sonuç:** PASS / FAIL

---

## S3 — Admin Publish Testi

| Adım | Beklenen |
|---|---|
| Publish Center'da "Validate Et" tıkla | Validation sonucu görünür |
| Hata varsa düzelt | Hatalar temizlenir |
| "Yayına Al" tıkla | "yayınlandı! Mobil katalogda görünecek." mesajı |
| Status badge "Yayında" olur | Yeşil badge |
| `GET /active?appVersion=0.2.0` çağrısı | Oyun listede görünür |

**Sonuç:** PASS / FAIL

---

## S4 — Mobil Katalog Testi

| Adım | Beklenen |
|---|---|
| Android uygulamayı aç | Ana ekran gelir |
| Oyunlar sekmesine git | Katalog yüklenir |
| Pull-to-refresh yap | Katalog yenilenir |
| Yeni publish edilen oyun listede görünür | Oyun adı doğru |
| Oyun kartında template, kategori, süre bilgisi görünür | Bilgiler doğru |

**Sonuç:** PASS / FAIL

---

## S5 — Kamera İzni Testi

| Adım | Beklenen |
|---|---|
| Uygulama ilk açılışta kamera izni ister | İzin dialog'u görünür |
| "İzin Ver"e tıkla | Kamera açılır |
| Kamerayı kapatmayı dene (hızlı ayarlardan) | Oyun pause olur veya uyarı verir |
| Kamerayı tekrar aç | Oyun devam eder |

**Sonuç:** PASS / FAIL

---

## S6 — Oyun Açma Testi

| Adım | Beklenen |
|---|---|
| Katalogdan bir oyuna tıkla | Detay sayfası açılır |
| Oyun adı, açıklama, süre, kategori doğru | Bilgiler admin'dekiyle aynı |
| Desteklenen hareketler listelenir | Hareket isimleri doğru |
| "Oyunu Başlat" butonu görünür | Buton aktif |

**Sonuç:** PASS / FAIL

---

## S7 — Skor Üretme Testi

| Adım | Beklenen |
|---|---|
| Oyunu başlat | Kamera aktif, oyun ekranı gelir |
| İstenen hareketi yap (örn: Squat) | Skor artar (+10 veya hareketin puanı) |
| Yanlış hareket yap | "Yanlış form" veya ceza puanı |
| Combo yap (arka arkaya doğru hareket) | Combo sayacı artar |
| Skor HUD'da anlık güncellenir | Gecikme < 500ms |

**Sonuç:** PASS / FAIL

---

## S8 — Oyun Tamamlama Testi

| Adım | Beklenen |
|---|---|
| Oyunu süresi dolana kadar oyna | Oyun otomatik biter |
| Result screen çıkar | Toplam skor, hareket sayıları, süre |
| Sync status görünür | "SYNCED" veya senkronizasyon durumu |
| "Oyunlara Dön" butonu çalışır | Kataloğa döner |

**Sonuç:** PASS / FAIL

---

## S9 — Result Submit Testi

| Adım | Beklenen |
|---|---|
| Oyun bittikten sonra backend kontrolü | `GET /game-sessions?gameDefinitionId=X` yeni session döner |
| Admin Studio > Session Results > Yenile | Yeni session listede görünür |
| Skor, süre, combo değerleri doğru | Mobilde görünenle aynı |

**Sonuç:** PASS / FAIL

---

## S10 — Offline / Online Tekrar Testi

| Adım | Beklenen |
|---|---|
| Uçuş modunu aç | İnternet kesilir |
| Oyun oyna ve bitir | Oyun normal çalışır |
| Result screen'de sync status | "Cevrimdisi - sonra gonderilecek" |
| Uçuş modunu kapat | İnternet geri gelir |
| Bekle (30sn) veya "Tekrar dene" | Sync otomatik tamamlanır |
| Admin session panel kontrolü | Session görünür |

**Sonuç:** PASS / FAIL

---

## S11 — Crash-Free Smoke Testi

| Adım | Beklenen |
|---|---|
| Tüm test senaryolarını uygula | — |
| Test sonunda logcat kontrolü | `FATAL EXCEPTION` yok |
| Uygulama crash/donma yapmadı | Tüm ekranlar açıldı |
| Arka plana alıp geri getir | Uygulama resume oldu |

**Sonuç:** PASS / FAIL

---

## S12 — Admin Session Takip Testi

| Adım | Beklenen |
|---|---|
| Admin'de oyunun Studio sayfasına git | Workspace açılır |
| Session Results panelinde "Yenile" tıkla | Mobil oturumlar listelenir |
| En son oturum skor, süre, tarih bilgisi | Doğru |
| Mobil Test Checklist'te ilgili maddeleri işaretle | Checkbox çalışır, counter artar |
| Sayfayı yenile | Checklist state'i korunur (localStorage) |

**Sonuç:** PASS / FAIL

---

## Özet Tablo

| # | Senaryo | Sonuç | Not |
|---|---|---|---|
| S1 | Admin oyun oluşturma | | |
| S2 | Game Studio preview | | |
| S3 | Admin publish | | |
| S4 | Mobil katalog | | |
| S5 | Kamera izni | | |
| S6 | Oyun açma | | |
| S7 | Skor üretme | | |
| S8 | Oyun tamamlama | | |
| S9 | Result submit | | |
| S10 | Offline/online | | |
| S11 | Crash-free smoke | | |
| S12 | Admin session takip | | |
