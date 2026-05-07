# Security And Permissions

## MVP izinleri

- `INTERNET`
- `ACCESS_NETWORK_STATE`
- `CAMERA`
- `POST_NOTIFICATIONS`
- `FOREGROUND_SERVICE` gerekirse

## Bilinçli olarak dışarıda bırakılanlar

- `READ_CONTACTS`
- `READ_PHONE_STATE`
- `QUERY_ALL_PACKAGES`
- `ACCESS_BACKGROUND_LOCATION`

## Gizlilik ilkeleri

- Ham kamera görüntüsü varsayılan olarak sunucuya gönderilmez
- Kamera izni yalnızca ilgili deneyim öncesi istenir
- HTTPS zorunludur
- Token güvenli storage katmanında tutulur
- Çocuk kullanıcılar için veri minimizasyonu gözetilir
