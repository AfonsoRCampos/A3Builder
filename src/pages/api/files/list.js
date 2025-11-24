const fs = require('fs');
const path = require('path');
const { UPLOADS_DIR, ensureUploadsDir, publicUrlFor } = require('../../../utils/fileUtils');

export default function handler(req, res) {
    try {
        ensureUploadsDir();
        const files = fs.readdirSync(UPLOADS_DIR).filter(f => fs.statSync(path.join(UPLOADS_DIR, f)).isFile());
        const items = files.map(f => ({ name: f, url: publicUrlFor(f) }));
        res.status(200).json({ files: items });
    } catch (e) {
        console.error('files/list error', e);
        res.status(500).json({ error: 'Failed to list files' });
    }
}
