# P33.1 — Linux Asset Hosting Discovery

## Tarih
2026-05-12

## Karar

```
P33.1 DISCOVERY: PASS
allMandatoryPass: true
failedMandatory: []
P33.2 PHP Asset API MVP aşamasına geçilebilir.
```

---

## 1. Hosting Bilgileri

| Alan | Değer |
|---|---|
| Domain | `albago.tr` |
| Document root | `/home/basutlar/public_html/albago.tr` |
| Web server | LiteSpeed |
| HTTPS | Aktif |
| PHP | 8.3.30 |
| Timezone | Europe/Istanbul |

## 2. Upload Konfigürasyonu

| Ayar | Değer | Sonuç |
|---|---|---|
| `file_uploads` | `1` | PASS |
| `upload_max_filesize` | `512M` | PASS |
| `post_max_size` | `512M` | PASS |
| `max_file_uploads` | `20` | PASS |
| `max_execution_time` | `300` | PASS |
| `memory_limit` | `2048M` | PASS |

## 3. Zorunlu Extension / Function

| Kontrol | Sonuç |
|---|---|
| `fileinfo` | PASS |
| `json` | PASS |
| `mbstring` | PASS |
| `finfo_open()` | PASS |
| `getimagesize()` | PASS |
| `hash_equals()` | PASS |

## 4. Opsiyonel Extension'lar

| Kontrol | Sonuç |
|---|---|
| GD | PASS |
| Imagick | PASS |
| PDO MySQL / mysqli | PASS |
| cURL | PASS |
| OpenSSL | PASS |

## 5. Disk ve Yazılabilirlik

| Kontrol | Sonuç |
|---|---|
| Disk boş alan | **105728.7 MB** |
| Document root writable | PASS |
| `assets/` writable | PASS |
| `data/` writable | PASS |

## 6. Mandatory Check Matrix

| # | Kriter | Eşik | Sonuç |
|---|---|---|---|
| M1 | PHP major ≥ 8 | 8.0+ | PASS |
| M2 | `file_uploads = On` | On / 1 | PASS |
| M3 | `upload_max_filesize` | ≥ 10M | PASS |
| M4 | `post_max_size` | ≥ 11M | PASS |
| M5 | `fileinfo` extension | loaded | PASS |
| M6 | `json` extension | loaded | PASS |
| M7 | Disk boş alan | ≥ 500MB | PASS |
| M8 | Document root yazılabilir | true | PASS |
| M9 | `finfo_open()` | exists | PASS |
| M10 | `getimagesize()` | exists | PASS |
| M11 | `hash_equals()` | exists | PASS |
| M12 | `.htaccess` AllowOverride | enabled | PASS |
| M13 | Public URL | albago.tr | PASS |

## 7. P33.2'ye Geçiş

```
READY FOR P33.2
```

---

## 8. Hosting Temizlik

Diagnostic test dosyaları **silinmeli**:

- [ ] `p33-diagnostics.php` sil
- [ ] `test.txt` sil
- [ ] `assets/` ve `data/` klasörleri diagnostic tarafından oluşturulduysa kalabilir (P33.2'de kullanılacak)
