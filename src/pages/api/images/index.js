import fs from 'fs';
import path from 'path';

const IMGS_DIR = path.join(process.cwd(), 'public', 'imgs');

export default function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();
  try {
    if (!fs.existsSync(IMGS_DIR)) fs.mkdirSync(IMGS_DIR, { recursive: true });
    const files = fs.readdirSync(IMGS_DIR).filter(f => !f.startsWith('.'));
    const items = files.map(f => ({ name: f, url: `/imgs/${encodeURIComponent(f)}` }));
    res.status(200).json({ images: items });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
}
