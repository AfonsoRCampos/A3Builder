const path = require('path');
const fs = require('fs');

const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads');

function ensureUploadsDir() {
    if (!fs.existsSync(UPLOADS_DIR)) {
        fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
}

function sanitizeFilename(name) {
    if (!name) return `${Date.now()}`;
    // keep extension, remove unsafe chars
    const ext = path.extname(name);
    const base = path.basename(name, ext).replace(/[^a-z0-9-_\. ]/gi, '_');
    const ts = Date.now();
    return `${ts}-${base}${ext}`;
}

function publicUrlFor(filename) {
    if (!filename) return null;
    return `/uploads/${encodeURIComponent(filename)}`;
}

module.exports = { UPLOADS_DIR, ensureUploadsDir, sanitizeFilename, publicUrlFor };
