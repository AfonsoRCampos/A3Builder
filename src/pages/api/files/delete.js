const fs = require('fs');
const path = require('path');
const { UPLOADS_DIR, ensureUploadsDir } = require('../../../utils/fileUtils');

export default async function handler(req, res) {
    if (req.method !== 'POST' && req.method !== 'DELETE') return res.status(405).json({ error: 'Method not allowed' });
    try {
        ensureUploadsDir();
        const { filename } = req.body || {};
        if (!filename) return res.status(400).json({ error: 'Missing filename' });
        const dest = path.join(UPLOADS_DIR, filename);
        if (!fs.existsSync(dest)) return res.status(404).json({ error: 'Not found' });
        await fs.promises.unlink(dest);
        res.status(200).json({ deleted: filename });
    } catch (e) {
        console.error('files/delete error', e);
        res.status(500).json({ error: 'Delete failed' });
    }
}
