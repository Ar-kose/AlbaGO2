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

## Runtime session persistence

- `POST /v1/game-sessions` stores completed Android game results.
- `clientSessionId` is the mobile idempotency key; repeated submissions return the existing server session.
- `GameSessionsRepository` writes through Prisma when persistence is enabled and keeps the in-memory fallback for dev/test runs.
- The stored result is a summary payload only; raw camera frames or pose landmark arrays are not sent to the backend.

## İlk kalite kuralları

- Publish öncesi schema ve asset doğrulaması
- Reward grant için idempotency
- `minAppVersion` uyumluluk kontrolü
- Skor ve tempo tutarlılık kontrolleri
