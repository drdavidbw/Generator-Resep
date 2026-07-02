// Serverless proxy: client sends the photo, this function calls Claude
// with the API key kept server-side (Vercel Environment Variable), never
// exposed to the browser.

export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  // Basic CORS (tighten origin in production if needed)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    // --- Simple shared-secret app auth (not the Anthropic key) ---
    const appToken = process.env.APP_ACCESS_TOKEN;
    if (appToken) {
      const auth = req.headers['authorization'] || '';
      if (auth !== `Bearer ${appToken}`) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Server belum dikonfigurasi: ANTHROPIC_API_KEY belum diset di Vercel.' });
    }

    const { imageBase64, mediaType } = req.body || {};
    if (!imageBase64) {
      return res.status(400).json({ error: 'imageBase64 wajib diisi.' });
    }

    const prompt = `Kamu membaca foto notes work order resep dokter di IGD rumah sakit (tulisan tangan).
Struktur notes: nama dokter di baris paling atas. Lalu berulang kelompok 2 baris:
- Baris 1: "R/ [nama obat] [jumlah dalam angka romawi]" diikuti tanggal di ujung kanan format day/month (contoh "9/4" = 9 April). Kadang ada 2 nama obat dalam satu kelompok untuk 1 resep yang sama (pasien yang sama).
- Baris 2: nama pasien diikuti "/" lalu nomor Rekam Medis (RM).
Tahun SELALU 2026.
Kembalikan HANYA JSON valid (tanpa markdown fence) dengan struktur:
{"doctor":"dr. Nama","resep":[{"rm":"1389814","patientName":"Bp. Aditiya Danan Jaya","date":"2026-04-09","items":[{"obat":"Etanyl Inj","jumlah":1}]}]}
"jumlah" adalah angka (integer) hasil konversi dari romawi. Jika 1 kelompok punya lebih dari 1 baris obat sebelum nama pasien berikutnya, gabungkan semua obat itu ke items pada resep yang sama.`;

    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 2048,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType || 'image/jpeg', data: imageBase64 } },
            { type: 'text', text: prompt }
          ]
        }]
      })
    });

    if (!upstream.ok) {
      const t = await upstream.text();
      return res.status(upstream.status).json({ error: `Anthropic API error: ${t.slice(0, 500)}` });
    }

    const json = await upstream.json();
    let text = json.content?.[0]?.text || '';
    text = text.trim().replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/```$/, '');

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      return res.status(502).json({ error: 'Gagal parse hasil ekstraksi AI.', raw: text });
    }

    return res.status(200).json(parsed);
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Unknown error' });
  }
}
