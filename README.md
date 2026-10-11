# AM + Temp Mail + Spotify Search

Website gabungan **Generate Temp Mail** + **Aktivasi Alight Motion Premium** + **Spotify Track Search**.

## Fitur
- Generate email sementara + inbox (auto-refresh)
- Saved emails + search inbox by email
- Tab aktivasi Alight Motion Premium (input email + magic link)
- Deteksi magic link (login / verifikasi) dengan tombol copy / buka / pakai untuk AM
- Auto-save email ke localStorage
- **Spotify Search**: cari track, tampilkan judul, artis, durasi, thumbnail, dan link ke Spotify
- Navigasi tab

## API
- Temp mail: proxy ke `api.theresav.eu`
- AM Premium: proxy ke `/api/am-verif` → `GET /api/am-verif2?key=&email=&link=`
- Spotify Search: `POST https://api.jhx.my.id/sp-search` (CORS enabled)

## Deploy
Siap deploy ke Vercel (sudah ada `vercel.json` + serverless functions di `/api`).

```bash
vercel --prod
```

Atau import repository ini langsung di Vercel.
