import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  const { series, version } = req.query;
  if (!series || !version) return res.status(400).json({ error: 'Missing params' });

  const versionsPath = path.join(process.cwd(), 'src', 'data', 'A3Versions.json');
  if (!fs.existsSync(versionsPath)) return res.status(404).json({ error: 'No versions file' });
  const versions = JSON.parse(fs.readFileSync(versionsPath, 'utf8') || '{}');
  const seriesObj = versions[series] || { };

  if (req.method === 'GET') {
    const v = seriesObj.versions && seriesObj[version];
    if (!v) return res.status(404).json({ error: 'Version not found' });
    return res.status(200).json(v);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
