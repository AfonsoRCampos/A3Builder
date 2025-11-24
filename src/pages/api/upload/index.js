import fs from 'fs';
import path from 'path';

const IMGS_DIR = path.join(process.cwd(), 'public', 'imgs');

function sanitizeFilename(name) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  try {
    const body = req.body;
    const { filename, data } = body || {};
    if (!filename || !data) return res.status(400).json({ error: 'filename and data required' });

    const match = String(data).match(/^data:(image\/(png|jpeg|jpg|gif|webp));base64,(.*)$/);
    if (!match) return res.status(400).json({ error: 'invalid data URL' });
    const mime = match[1];
    const ext = mime.split('/')[1] === 'jpeg' ? 'jpg' : mime.split('/')[1];
    const base64 = match[3];

    if (!fs.existsSync(IMGS_DIR)) fs.mkdirSync(IMGS_DIR, { recursive: true });

    const clean = sanitizeFilename(filename);
    const unique = `${clean}`;
    const outPath = path.join(IMGS_DIR, `${unique}`);

    const buffer = Buffer.from(base64, 'base64');
    fs.writeFileSync(outPath, buffer);

    const url = `/imgs/${encodeURIComponent(path.basename(outPath))}`;
    res.status(200).json({ filename: path.basename(outPath), url });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
}
