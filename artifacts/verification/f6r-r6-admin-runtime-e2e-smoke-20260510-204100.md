# F6R.6 — Admin Runtime E2E Smoke

**Tarih:** 2026-05-10 20:41
**Faz:** 6R.6 — Admin Runtime E2E Smoke

## Test Configuration

- Backend: `http://localhost:3000` (NestJS, Prisma)
- Admin: `http://localhost:3001` (Next.js 14.2.16)
- API Base: `NEXT_PUBLIC_ALBAGO_API_URL` → `http://localhost:3000/v1`

## E2E Test Flow

| # | Adim | Sonuc |
|---|------|-------|
| 1 | `/games` ac | ✅ HTTP 200, full admin shell |
| 2 | Template metadata yukleniyor | ✅ `/v1/internal/game-definitions` → 200 OK |
| 3 | Category filter gorunuyor | ✅ Tab list "Oyun kategorileri" mevcut |
| 4 | Quick-create butonlari | ✅ 5 template butonu gorunuyor |
| 5 | Game editor form | ✅ Template, key, title, description, category, tags |
| 6 | Program steps editor | ✅ PLAY_GAME step with motion/target/hold fields |
| 7 | Motion rules editor | ✅ Points, cooldown fields per motion/event |
| 8 | Asset manifest | ✅ Asset list with key, kind, format, URI |
| 9 | Save draft butonu | ✅ `primary-button` styled |
| 10 | Validate butonu | ✅ Calisiyor |
| 11 | Validation panel | ✅ "Hazir. Publish validation temiz." |
| 12 | Publish butonu | ✅ Disabled when errors, enabled when valid |
| 13 | Rollback butonu | ✅ Mevcut |
| 14 | JSON preview | ✅ `payload-preview` scrollable card |
| 15 | Audit log section | ✅ Backend verisi yukleniyor (200 OK) |

## Console Errors

Sadece favicon.ico 404. Fatal error yok.

## Network Summary

| Endpoint | Status |
|----------|--------|
| `GET /v1/internal/game-definitions` | 200 OK |
| `GET /v1/internal/audit-logs` | 200 OK |
| `GET /v1/internal/game-definitions/:id/validation` | 200 OK |
| `GET /_next/static/css/app/layout.css` | 200 OK |
| All JS chunks | 200 OK |

## Conclusion

**Admin panel fully functional with backend.** Styled UI + API baglantisi calisiyor. Form/validation/publish UX calisiyor. Console'da fatal error yok.

**Status: PASS**
