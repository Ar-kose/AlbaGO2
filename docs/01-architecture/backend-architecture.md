# Backend Architecture

Backend, NestJS modular monolith olarak başlatılır ve ileride servis ayrıştırmasına uygun sınırlar taşır.

## MVP modülleri

- `auth`
- `users`
- `devices_consents`
- `motions`
- `workouts`
- `games`
- `game_sessions`
- `rewards`
- `leaderboards`
- `content_publish`
- `assets`
- `audit_logs`

## Altyapı

- PostgreSQL: kalıcı veri
- Redis: cache, queue ve idempotency destekleri
- S3 uyumlu storage: asset manifestleri

## İlk kalite kuralları

- Publish öncesi schema ve asset doğrulaması
- Reward grant için idempotency
- `minAppVersion` uyumluluk kontrolü
- Skor ve tempo tutarlılık kontrolleri
