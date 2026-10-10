export const config = { runtime: 'nodejs', maxDuration: 30 };
const API_BASE = process.env.AM_API_BASE || 'https://api.theresav.eu';
const API_KEY = process.env.AM_API_KEY || 'kyzo_c0817e7b8c1a9278';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const upstream = await fetch(`${API_BASE}/api/tempmail?key=${encodeURIComponent(API_KEY)}`, {
      headers: { Accept: 'application/json', 'User-Agent': 'AM-TempMail/1.0' },
    });
    const data = await upstream.json();
    res.status(upstream.status).json(data);
  } catch (err) {
    res.status(500).json({ status: false, message: err.message || 'Proxy error' });
  }
}
