# AlbaGo Game Studio — Known Issues

## Sürüm: MVP Pilot (2026-05-11)

---

## 1. ADB Inject Kısıtlaması

**Etki:** Mobil UI testlerinin bir kısmı sadece fiziksel dokunma ile yapılabilir. ADB `input tap` komutları INJECT_EVENTS izni olmadığı için çalışmaz.

**Geçici çözüm:** Tüm mobil UI testleri elle yapılmalıdır.

**Kalıcı çözüm:** Test cihazında root veya özel debug build gerekir. Pilot sonrası değerlendirilecek.

---

## 2. Asset'ler local:// veya Fallback

**Etki:** Oyun içi görseller (arka plan, karakter, obje) şu an `local://` URI şeması kullanır. Gerçek görsel dosyaları sunucudan indirilmez. Yerleşik fallback/placeholder gösterilir.

**Geçici çözüm:** MVP için kabul edilebilir. Oyun çalışır ve crash üretmez.

**Kalıcı çözüm:** Gerçek asset upload → storage → Android download → cache zinciri Faz 5 Paket 3'te ele alınacak.

---

## 3. Admin Auth Geçici (admin@local)

**Etki:** Admin panelde tüm işlemler `admin@local` aktörü ile yapılır. `REQUIRE_INTERNAL_ADMIN_TOKEN` kapalı olduğu sürece internal endpoint'ler korumasızdır.

**Geçici çözüm:** Pilot sadece local ağda, güvenli ortamda çalıştırılmalıdır. Public internet'e açılmamalıdır.

**Kalıcı çözüm:** Gerçek auth/rol modeli Faz 5 Paket 4'te ele alınacak.

---

## 4. Fiziksel Ortam Etkileri

**Etki:** MediaPipe pose detection kalitesi şu faktörlerden etkilenir:
- Düşük ışık
- Kameraya uzaklık (çok yakın/çok uzak)
- Karmaşık arka plan
- Hızlı hareket
- Kamera açısı

**Geçici çözüm:** Test sırasında iyi ışıklandırma, düz arka plan ve tam vücut görünürlüğü sağlanmalıdır.

---

## 5. Cihaz Performans Değişkenliği

**Etki:** MediaPipe ve TensorFlow Lite işlemleri CPU/GPU yoğundur. Düşük özellikli cihazlarda:
- Kare hızı düşebilir
- Hareket algılama gecikebilir
- Pil tüketimi artabilir

**Test edilen cihaz:** Xiaomi M2007J3SI (Snapdragon 865, Adreno 650) — sorunsuz.

**Geçici çözüm:** Pilot öncesi en az 2 farklı cihazda test yapılmalıdır.

---

## 6. Offline Sync Bekleyen Veriler

**Etki:** İnternet bağlantısı kesildiğinde oyun sonuçları cihazda bekler (Room DB + WorkManager). Bağlantı dönünce otomatik gönderilir. Ancak çok sayıda bekleyen sonuç birikirse toplu gönderim süresi uzayabilir.

**Geçici çözüm:** Test sırasında stabil internet bağlantısı kullanılmalıdır.

---

## 7. Backend In-Memory Fallback

**Etki:** Backend `DATABASE_URL` olmadığında in-memory depolama kullanır. Backend yeniden başlatıldığında tüm veriler kaybolur (seeded demo oyunlar hariç).

**Geçici çözüm:** Test sırasında backend'i yeniden başlatma. Production'da gerçek veritabanı kullan.

---

## 8. Android 12+ Kamera İzni

**Etki:** Android 12 ve üzerinde kamera izni ilk açılışta istenir. Kullanıcı reddederse oyun çalışmaz.

**Geçici çözüm:** Tester onboarding'de kamera izni adımı vurgulanmıştır.
