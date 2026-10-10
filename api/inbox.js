export const config = { runtime: 'nodejs', maxDuration: 30 };
const API_BASE = 'https://api.theresav.eu';
const API_KEY = process.env.THERESA_API_KEY || 'hOLlZ';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const email = req.query.email;
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ status: false, message: 'Parameter email wajib diisi' });
  }

  try {
    const target = `${API_BASE}/api/tools/generator-email/inbox?email=${encodeURIComponent(email)}`;
    const upstream = await fetch(target, {
      headers: { 'x-apikey': API_KEY, Accept: 'application/json' },
    });
    const data = await upstream.json();
    res.status(upstream.status).json(data);
  } catch (err) {
    res.status(500).json({ status: false, message: err.message || 'Proxy error' });
  }
}
