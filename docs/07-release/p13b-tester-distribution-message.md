# AlbaGo P13B Tester Distribution Message

**Date:** 2026-05-09
**Pilot:** P13B Live Tester Rollout

---

Merhaba, AlbaGo beta testine katildigin icin tesekkurler.

## APK

- **Dosya:** app-debug.apk
- **SHA256:** `0c37185af6074a94b757fe4ed98c4b7df2e0d4ae8e25d53d3a0a8d6de63eb756`
- **Boyut:** ~113.9 MB

## Kurulum

```bash
adb install -r app-debug.apk
```

Kurulum sonrasi SHA256 dogrula:

```powershell
Get-FileHash app-debug.apk -Algorithm SHA256
```

Beklenen: `0c37185af6074a94b757fe4ed98c4b7df2e0d4ae8e25d53d3a0a8d6de63eb756`

SHA256 uyusmuyorsa test etme, dogru dosyayi iste.

## Test Etmen Gereken Akis

1. Uygulamayi ac (cold launch).
2. Ana sayfayi kontrol et (selamlama, gunluk ilerleme).
3. "Eglence" sekmesine git → Demo Oyunlar ekranini ac.
4. **Meyve Kesme**: Hazirla → Oyuna Basla → oyna → sonuc ekranina ulas.
5. **Engelden Kacis**: Ayni akisi tekrarla.
6. **Spor Mucadelesi**: Ayni akisi tekrarla.
7. Her oyun sonrasi result ekraninda sync durumunu kontrol et.
8. Android geri tusunu her ekranda test et (takilma olmamali).
9. Alt navigasyonu test et (A tusu Home'a gitmeli).
10. Hata varsa ekran goruntusu veya video al.

## Crash Log Toplama

```bash
adb logcat -d AndroidRuntime:E AlbaGo:D *:S > crash_log.txt
```

## Geri Bildirim Formati

```
Tester ID:
Cihaz modeli:
Android surumu:
APK SHA256 (dogrulandi mi?):
Hangi oyunda sorun varsa:
Beklenen davranis:
Gerceklesen davranis:
Tekrar uretme adimlari:
Ekran goruntusu/video (varsa):
Crash log (varsa):
```

Tesekkurler!
