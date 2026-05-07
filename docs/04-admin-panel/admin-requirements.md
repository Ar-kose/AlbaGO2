# Admin Requirements

## MVP modülleri

- Admin auth
- Game definition CRUD
- Level editor
- Motion rule editor
- Reward rule editor
- Asset manifest görünümü
- Publish/rollback akışı
- Audit log görünümü
- Basit dashboard

## Yayın durumu

- `DRAFT`
- `REVIEW`
- `SCHEDULED`
- `PUBLISHED`
- `ARCHIVED`

## Kritik kontroller

- Eksik asset ile publish yapılamaz
- Uygun olmayan `minAppVersion` içeriği yayınlanamaz
- Her publish değişikliği version kaydı ve audit log üretir
- Kill switch ve segment kuralı config seviyesinde tutulur
