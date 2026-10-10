export const config = { runtime: 'nodejs', maxDuration: 30 };

const SEND_API = process.env.AM_SEND_API || 'https://v2.api-varhad.my.id/tools/amprem/verif/email';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { email } = req.query;
  if (!email) {
    return res.status(400).json({ status: false, message: 'email wajib diisi' });
  }

  try {
    const url = `${SEND_API}?email=${encodeURIComponent(email)}`;
    const upstream = await fetch(url, {
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://v2.api-varhad.my.id/',
      },
    });

    const text = await upstream.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      // Cloudflare challenge or HTML
      if (text.includes('Just a moment') || text.includes('cloudflare')) {
        data = { status: false, message: 'Cloudflare challenge (coba lagi atau ganti endpoint)' };
      } else {
        data = { status: false, message: 'Invalid response', raw: text.slice(0, 300) };
      }
    }

    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ status: false, message: err.message || 'Proxy error' });
  }
}
