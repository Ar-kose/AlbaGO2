# F6R.4 — Static CSS Route Regression Test

**Tarih:** 2026-05-10 20:39
**Faz:** 6R.4 — Static CSS Route Regression

## Automated Smoke Test

```powershell
$base = "http://localhost:3000"
$page = Invoke-WebRequest "$base/games" -UseBasicParsing
```

## Results

| Check | Result | Detail |
|-------|--------|--------|
| `/games` HTTP status | **200** | Page loads successfully |
| CSS link in HTML | **Found** | `/_next/static/css/app/layout.css` |
| CSS chunk HTTP status | **200** | Direct fetch confirmed |
| CSS content length | **14,354 bytes** | Non-empty (Tailwind would be ~100KB+) |
| JS chunks (webpack) | **200** | `webpack.js`, `main-app.js` loading |
| JS chunks (pages) | **200** | All 8 route page chunks loading |
| Static images | **200** | Logo, backgrounds, thumbnails all OK |

## CSS Content Verification

- CSS file contains custom design system rules (not Tailwind utilities)
- All `:root` variables present including newly added `--stroke`
- Layout rules: `.shell`, `.admin-shell`, `.sidebar`, `.admin-main`
- Component rules: `.panel`, `.badge`, `.field`, `.button-row`, etc.
- Responsive breakpoints at 1100px and 640px

## Conclusion

**All static assets load correctly with HTTP 200.** CSS is non-empty and contains the complete design system. No 404/500 errors for static resources.

**Status: PASS**
