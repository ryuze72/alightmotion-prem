export const config = { runtime: 'nodejs', maxDuration: 30 };

const VERIFY_API = process.env.AM_VERIFY_API || 'https://v2.api-varhad.my.id/tools/amprem/verif/link';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { email, link } = req.query;
  if (!email || !link) {
    return res.status(400).json({ status: false, message: 'email dan link wajib diisi' });
  }

  try {
    const url = `${VERIFY_API}?email=${encodeURIComponent(email)}&link=${encodeURIComponent(link)}`;
    const upstream = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; AM-Prem/1.0)',
      },
    });

    const text = await upstream.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { status: false, message: 'Invalid response', raw: text.slice(0, 500) };
    }

    res.status(upstream.ok ? 200 : upstream.status).json(data);
  } catch (err) {
    res.status(500).json({ status: false, message: err.message || 'Proxy error' });
  }
}
