# Resep Proxy — Backend untuk Generator Resep dari Work Order Notes

Backend serverless (Vercel) yang menjadi perantara antara aplikasi generator resep
dan Claude API, supaya API key tidak pernah disimpan di browser/client.

## Struktur
- `api/extract.js` — serverless function yang menerima foto notes, memanggil Claude API
  (API key diambil dari environment variable server-side), dan mengembalikan data resep
  terstruktur (JSON).
- `public/index.html` — frontend generator resep (upload foto → ekstraksi otomatis →
  koreksi manual → cetak 4 resep/lembar F4).

## Deploy ke Vercel
1. Import repo ini di https://vercel.com/new
2. Di Settings → Environment Variables, tambahkan:
   - `ANTHROPIC_API_KEY` — API key Claude Anda (rahasia)
   - `APP_ACCESS_TOKEN` — (opsional) token internal untuk staf IGD, supaya endpoint tidak
     bisa dipakai sembarang orang
3. Deploy. Buka URL yang diberikan Vercel untuk memakai aplikasi.

## Catatan keamanan
- API key Claude hanya ada di environment variable server, tidak pernah dikirim ke browser.
- Data pasien (RM, nama, resep) dikirim ke Claude API untuk ekstraksi tapi tidak disimpan
  permanen oleh backend ini. Pastikan kebijakan data rumah sakit Anda mengizinkan hal ini,
  atau pertimbangkan hosting on-prem untuk skenario data sensitif.
