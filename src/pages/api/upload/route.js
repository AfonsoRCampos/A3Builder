import fs from 'fs';
import path from 'path';

const IMGS_DIR = path.join(process.cwd(), 'public', 'imgs');

function sanitizeFilename(name) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { filename, data } = body || {};
    if (!filename || !data) return new Response(JSON.stringify({ error: 'filename and data required' }), { status: 400 });

    // parse data URL
    const match = data.match(/^data:(image\/(png|jpeg|jpg|gif|webp));base64,(.*)$/);
    if (!match) return new Response(JSON.stringify({ error: 'invalid data URL' }), { status: 400 });
    const mime = match[1];
    const ext = mime.split('/')[1] === 'jpeg' ? 'jpg' : mime.split('/')[1];
    const base64 = match[3];

    if (!fs.existsSync(IMGS_DIR)) fs.mkdirSync(IMGS_DIR, { recursive: true });

    const clean = sanitizeFilename(filename);
    const unique = `${Date.now()}-${clean}`;
    const outPath = path.join(IMGS_DIR, `${unique}.${ext}`);

    const buffer = Buffer.from(base64, 'base64');
    fs.writeFileSync(outPath, buffer);

    const url = `/imgs/${encodeURIComponent(path.basename(outPath))}`;
    return new Response(JSON.stringify({ filename: path.basename(outPath), url }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
}
