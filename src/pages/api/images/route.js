import fs from 'fs';
import path from 'path';

const IMGS_DIR = path.join(process.cwd(), 'public', 'imgs');

export async function GET() {
  try {
    if (!fs.existsSync(IMGS_DIR)) fs.mkdirSync(IMGS_DIR, { recursive: true });
    const files = fs.readdirSync(IMGS_DIR).filter(f => !f.startsWith('.'));
    const items = files.map(f => ({ name: f, url: `/imgs/${encodeURIComponent(f)}` }));
    return new Response(JSON.stringify({ images: items }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
}
