const fs = require('fs');
const path = require('path');
const { UPLOADS_DIR, ensureUploadsDir, sanitizeFilename, publicUrlFor } = require('../../../utils/fileUtils');

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    try {
        ensureUploadsDir();
        const { filename, data } = req.body || {};
        if (!data) return res.status(400).json({ error: 'Missing data' });

        // data should be a data URL like data:<mime>;base64,<payload>
        const m = String(data).match(/^data:([^;]+);base64,(.*)$/);
        if (!m) return res.status(400).json({ error: 'Invalid data URL' });
        const mime = m[1];
        const base64 = m[2];
        const raw = Buffer.from(base64, 'base64');

        const safeName = sanitizeFilename(filename || 'file');
        const dest = path.join(UPLOADS_DIR, safeName);
        await fs.promises.writeFile(dest, raw);
        const url = publicUrlFor(safeName);
        res.status(200).json({ filename: safeName, url });
    } catch (e) {
        console.error('files/upload error', e);
        res.status(500).json({ error: 'Upload failed' });
    }
}
