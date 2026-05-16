# AlbaGo Game Studio — Rollback Plan

## Hangi Durumda Pilot Durdurulur

Aşağıdaki tetikleyicilerden herhangi biri gerçekleşirse:

| Tetikleyici | Şiddet | Aksiyon |
|---|---|---|
| Fatal crash (kullanıcıya crash dialog'u) | Kritik | Derhal durdur |
| Session kaybı (skor backend'e gitmiyor) | Kritik | 2 saat içinde düzeltilemezse durdur |
| Admin panel erişilemez | Kritik | 1 saat içinde düzelmezse durdur |
| Katalog boş geliyor | Yüksek | Aynı gün düzeltilemezse durdur |
| Yanlış skor hesaplama | Yüksek | Oyunu yayından kaldır |
| Aşırı pil tüketimi | Orta | Kullanıcıya bildir, düzelt |

## Published Oyun Nasıl Geri Alınır

### Yöntem 1: Admin Studio Rollback (önerilen)

1. Admin panelde oyunun Studio sayfasına git: `/games/{id}/studio`
2. Publish Center'da "Rollback (Geri Al)" butonuna tıkla
3. Oyun status'u `REVIEW` olur
4. Oyun aktif katalogdan otomatik kalkar
5. Mobil kullanıcılar bir sonraki katalog yenilemede oyunu görmez

### Yöntem 2: API ile Rollback

```bash
curl -X POST http://localhost:3000/v1/internal/game-definitions/{gameId}/rollback \
  -H "Content-Type: application/json" \
  -d '{"actorId":"admin@local"}'
```

### Yöntem 3: Manuel Status Değişikliği

```bash
curl -X PATCH http://localhost:3000/v1/internal/game-definitions/{gameId} \
  -H "Content-Type: application/json" \
  -d '{"status":"REVIEW","actorId":"admin@local"}'
```

## APK Dağıtımı Nasıl Durdurulur

- APK dosyası paylaşım linki kaldırılır
- Test kullanıcılarına "pilot durduruldu" bildirimi yapılır
- Yeni APK build alınmaz

## Test Kullanıcısına Nasıl Bilgi Verilir

1. Test koordinatörü tüm test kullanıcılarına mesaj atar
2. Mesaj içeriği:
   - Pilot test geçici olarak durduruldu
   - Sebep (kısa, teknik olmayan açıklama)
   - Tahmini devam süresi (biliniyorsa)
   - Uygulamayı kaldırmaları gerekmez

## Session / Result Verileri Nasıl Korunur

- **Backend session'ları:** Rollback oyun verisini DEĞİL, sadece status'u değiştirir. Session kayıtları silinmez.
- **Mobil cihazdaki session'lar:** Room DB'de kalır. Sync olmamış veriler WorkManager ile bekler.
- **Admin audit log:** Tüm publish/rollback işlemleri audit log'a kaydedilir.

## Destructive Veri Silme

Pilot/beta kapsamında **hiçbir destructive veri silme işlemi yapılmaz**:
- Oyun tanımı silinmez (status değişir)
- Session verisi silinmez
- Kullanıcı verisi silinmez
- Asset silinmez

## Rollback Sonrası Doğrulama

```bash
# Oyunun status'unu kontrol et
curl -s http://localhost:3000/v1/internal/game-definitions/{gameId} | python -c "import sys,json; print(json.load(sys.stdin).get('status'))"
# Beklenen: REVIEW

# Aktif katalogdan kalktığını doğrula
curl -s "http://localhost:3000/v1/game-definitions/active?appVersion=0.2.0" | python -c "import sys,json; ids=[g['id'] for g in json.load(sys.stdin).get('items',[])]; print('ROLLBACK_OK' if '{gameId}' not in ids else 'STILL_ACTIVE')"
# Beklenen: ROLLBACK_OK
```

## Re-Publish (Geri Alma İptali)

Rollback edilen oyun tekrar yayınlanabilir:
1. Studio sayfasında "Yayına Al" butonuna tıkla
2. Veya API ile publish endpoint'ini çağır
3. Oyun eski session'larıyla birlikte tekrar aktif katalogda görünür
