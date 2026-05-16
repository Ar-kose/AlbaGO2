# AlbaGo Game Studio — Tester Onboarding

## Test Kullanıcısına Kısa Açıklama

AlbaGo, hareket algılamalı mobil oyun platformudur. Bu pilot testte, admin panelden yayınlanan oyunları mobil uygulamada görecek, açacak, oynayacak ve skor üreteceksin. Amacımız uçtan uca zincirin sorunsuz çalıştığını doğrulamak.

## APK Kurulum Adımları

1. USB kablosu ile telefonu bilgisayara bağla
2. Telefonda USB Debugging'i aç (Ayarlar > Geliştirici Seçenekleri > USB Hata Ayıklama)
3. APK dosyasını kur:
   ```
   adb install -r android\app\build\outputs\apk\debug\app-debug.apk
   ```
4. Kurulum başarılı mesajını gör: `Success`

## Kamera İzni

1. AlbaGo uygulamasını aç
2. Kamera izni sorulduğunda "İzin Ver"e tıkla
3. Kamera görüntüsü ekranda belirmeli
4. İzin verilmezse oyun çalışmaz

## Oyun Kataloğunu Açma

1. Uygulama ana ekranında "Oyunlar" sekmesine git
2. Katalog otomatik yüklenir (internet bağlantısı gerekli)
3. Yüklenmezse ekranı aşağı çekerek yenile (pull-to-refresh)
4. Katalogda en az 2-4 oyun görünmeli

## Oyunu Başlatma

1. İstediğin oyuna tıkla
2. Oyun detay sayfası açılır (oyun adı, açıklama, süre, hareketler)
3. "Oyunu Başlat" butonuna tıkla
4. Oyun ekranı açılır, kamera aktif olur

## Hareket Yapma

Oyun tipine göre yapılacak hareketler değişir:

| Oyun | Hareket |
|---|---|
| Deve-Cüce (SCENE_PLAY) | Squat (Cüce) ve Jumping Jack (Deve) |
| Meyve Kesme (FRUIT_SLASH) | Jumping jack ile meyve kes, squat ile bombadan kaç |
| Engel Kaçış (DODGE_RUN) | Squat ile eğil, jumping jack ile zıpla |
| Spor Mücadelesi (FIT_CHALLENGE) | Sırayla squat, jumping jack, plank |

Kamera seni tam görmeli. Yeterli ışık olduğundan emin ol.

## Skor / Result Beklenen Davranış

1. Her doğru harekette +10/+12 puan kazanırsın
2. Skor ekranın üst kısmında görünür
3. Oyun süresi dolunca otomatik biter
4. Bitince sonuç ekranı çıkar (toplam skor, hareket sayıları)
5. Sonuç otomatik olarak sunucuya gönderilir
6. "SYNCED" yazısı görürsen sonuç başarıyla kaydedilmiştir
7. İnternet yoksa "Cevrimdisi - sonra gonderilecek" yazar, endişelenme

## Hata Bildirme

Sorun yaşarsan şu bilgileri not et:
- Hangi oyundaydın?
- Ne yapmaya çalışıyordun?
- Ne oldu (hata mesajı, crash, donma)?
- Ekran görüntüsü alabildin mi?

Bildirim için: test koordinatörüne ilet.

## Gizlilik Notu

- Bu pilot test kapsamında toplanan veriler sadece hareket ve skor bilgileridir
- Kamera görüntüsü cihazında kalır, sunucuya gönderilmez
- Kişisel bilgilerin (ad, fotoğraf, konum) toplanmaz
- Test sonuçları sadece geliştirme ekibiyle paylaşılır
