import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
  const filePath = path.join(process.cwd(), 'src', 'data', 'A3s.json');

  if (req.method === 'GET') {
    const fileContents = fs.readFileSync(filePath, 'utf8');
    const A3s = JSON.parse(fileContents);
    return res.status(200).json(A3s);
  }

  if (req.method === 'POST') {
    const newA3 = req.body;
    const fileContents = fs.readFileSync(filePath, 'utf8');
    const A3s = JSON.parse(fileContents);

    // helper: generate next A3 id like A3-001-A
    function makeNextA3Id(list) {
      if (!Array.isArray(list) || list.length === 0) return 'A3-001-A';
      const numbers = list
        .map(a3 => {
          const id = a3?.header?.id || '';
          const m = id.split('-')[1];
          return m ? parseInt(m, 10) : 0;
        })
        .filter(n => n > 0);
      const maxNum = numbers.length ? Math.max(...numbers) : 0;
      const nextNum = (maxNum + 1).toString().padStart(3, '0');
      return `A3-${nextNum}-A`;
    }

    if (!newA3.header.id) {
      newA3.header.id = makeNextA3Id(A3s);
    }

    // look for existing entry by series id (the middle part of header.id)
    const seriesId = (newA3?.header?.id || '').split('-')[1];
    const idx = A3s.findIndex(A3 => (A3?.header?.id || '').split('-')[1] === seriesId);
    const existing = idx !== -1 ? A3s[idx] : null;

    if (existing && existing.published) return res.status(409).json({ error: 'A3 id already exists.' });
    else if (existing && existing.draft) {
      A3s[idx] = newA3;
      fs.writeFileSync(filePath, JSON.stringify(A3s, null, 2), 'utf8');
    } else {
      A3s.push(newA3);
    }

    try {
      const srcId = newA3?.header?.id;
      const refs = Array.isArray(newA3.header?.refs) ? newA3.header.refs : [];
      for (const t of refs) {
        const ti = A3s.findIndex(a => a && a.header && a.header.id === t);
        if (ti !== -1) {
          A3s[ti].header.refBy = Array.isArray(A3s[ti].header.refBy) ? A3s[ti].header.refBy : [];
          if (!A3s[ti].header.refBy.includes(srcId)) A3s[ti].header.refBy.push(srcId);
        }
      }
    } catch (e) {
      console.error('Failed to reconcile refs on create', e);
    }

    fs.writeFileSync(filePath, JSON.stringify(A3s, null, 2), 'utf8');

    // Also create the initial version snapshot (version A) in central versions file
    if (newA3.published) {
      try {
        const versionsPath = path.join(process.cwd(), 'src', 'data', 'A3Versions.json');
        let versions = {};
        if (fs.existsSync(versionsPath)) {
          const raw = fs.readFileSync(versionsPath, 'utf8') || '{}';
          versions = JSON.parse(raw);
        }
        // ensure series entry exists
        const series = (newA3.header && String(newA3.header.id || '').split('-')[1]) || null;
        if (!series) throw new Error('Invalid A3 header id for versioning');
        versions[series] = versions[series] || {};

        // determine next version label (use 'A' when no existing versions)
        function nextVersionLabel(label) {
          if (!label) return 'A';
          const base = 26;
          const letters = label.toUpperCase().split('');
          let digits = letters.map(ch => ch.charCodeAt(0) - 65);
          for (let i = digits.length - 1; i >= 0; i--) {
            digits[i] += 1;
            if (digits[i] < base) {
              return digits.map(d => String.fromCharCode(65 + d)).join('');
            }
            digits[i] = 0;
            if (i === 0) {
              digits = [0].concat(digits);
              return digits.map(d => String.fromCharCode(65 + d)).join('');
            }
          }
          return 'A';
        }

        function labelToNumber(label) {
          if (!label) return 0;
          const letters = label.toUpperCase().split('');
          let value = 0;
          for (let i = 0; i < letters.length; i++) {
            value = value * 26 + (letters[i].charCodeAt(0) - 64);
          }
          return value;
        }

        const existingLabels = Object.keys(versions[series] || {});
        let initialLabel = 'A';
        if (existingLabels.length > 0) {
          const last = existingLabels.sort((a, b) => labelToNumber(a) - labelToNumber(b))[existingLabels.length - 1];
          initialLabel = nextVersionLabel(last);
        }

        // compute the updated id for the A3 (set version label to initialLabel)
        let newId = newA3.header.id;
        try {
          const parts = String(newA3.header.id || '').split('-');
          if (parts.length >= 3) {
            parts[2] = initialLabel;
            newId = parts.join('-');
          }
        } catch (e) { /* ignore - keep existing id */ }

        // persist version snapshot using the (updated) snapshot id
        const snapshot = { ...newA3, header: { ...(newA3.header || {}), id: newId } };
        versions[series][initialLabel] = { snapshot, meta: { ts: Date.now(), message: 'A3 Published.' } };
        fs.writeFileSync(versionsPath, JSON.stringify(versions, null, 2), 'utf8');

        // Update stored A3s list to reflect the bumped id and reconcile cross-references
        try {
          // find the entry in the in-memory A3s array (we already mutated A3s above)
          const idx2 = A3s.findIndex(a => a && a.header && String(a.header.id || '').split('-')[1] === series);
          if (idx2 !== -1) {
            const oldId = A3s[idx2].header.id;
            A3s[idx2].header.id = newId;

            // Update other A3s: replace refs/refBy occurrences of oldId with newId
            for (let i = 0; i < A3s.length; i++) {
              if (!A3s[i] || !A3s[i].header) continue;
              if (i === idx2) continue;
              if (Array.isArray(A3s[i].header.refs)) {
                let changed = false;
                A3s[i].header.refs = A3s[i].header.refs.map(r => {
                  if (r === oldId) { changed = true; return newId; }
                  return r;
                });
                if (changed) {
                  A3s[i].header.refs = Array.from(new Set(A3s[i].header.refs));
                }
              }
              if (Array.isArray(A3s[i].header.refBy)) {
                let changed = false;
                A3s[i].header.refBy = A3s[i].header.refBy.map(r => {
                  if (r === oldId) { changed = true; return newId; }
                  return r;
                });
                if (changed) {
                  A3s[i].header.refBy = Array.from(new Set(A3s[i].header.refBy));
                }
              }
            }

            // write the updated A3s.json back to disk so stored A3 id matches published version
            fs.writeFileSync(filePath, JSON.stringify(A3s, null, 2), 'utf8');

            // reflect id change in the object we return to the client
            newA3.header.id = newId;
          }
        } catch (e) {
          console.error('Failed to update A3s ids after publishing', e);
        }
      } catch (e) {
        // non-fatal: continue but log
        console.error('Failed to write initial version snapshot or update ids', e);
      }
    }
    return res.status(201).json(newA3);
  }

  // Upsert / save edits to an existing A3 (by series id)
  if (req.method === 'PUT') {
    const updatedA3 = req.body;
    if (!updatedA3 || !updatedA3.header || !updatedA3.header.id) return res.status(400).json({ error: 'Invalid A3 payload' });
    const series = updatedA3.header.id.split('-')[1];
    const fileContents = fs.readFileSync(filePath, 'utf8');
    const A3s = JSON.parse(fileContents);
    const idx = A3s.findIndex(A3 => A3.header.id.split('-')[1] === series);
    if (idx === -1) {
      A3s.push(updatedA3);
      try {
        const srcId = updatedA3.header.id;
        const refs = Array.isArray(updatedA3.header.refs) ? updatedA3.header.refs : [];
        for (const t of refs) {
          const ti = A3s.findIndex(a => a && a.header && a.header.id === t);
          if (ti !== -1) {
            A3s[ti].header.refBy = Array.isArray(A3s[ti].header.refBy) ? A3s[ti].header.refBy : [];
            if (!A3s[ti].header.refBy.includes(srcId)) A3s[ti].header.refBy.push(srcId);
          }
        }
      } catch (e) { console.error('Failed to reconcile refs on upsert-new', e); }
    } else {
      const prev = A3s[idx];
      A3s[idx] = updatedA3;
      try {
        const srcId = updatedA3.header.id;
        const prevRefs = Array.isArray(prev.header?.refs) ? prev.header.refs : [];
        const newRefs = Array.isArray(updatedA3.header?.refs) ? updatedA3.header.refs : [];
        const added = newRefs.filter(x => !prevRefs.includes(x));
        const removed = prevRefs.filter(x => !newRefs.includes(x));
        for (const t of added) {
          const ti = A3s.findIndex(a => a && a.header && a.header.id === t);
          if (ti !== -1) {
            A3s[ti].header.refBy = Array.isArray(A3s[ti].header.refBy) ? A3s[ti].header.refBy : [];
            if (!A3s[ti].header.refBy.includes(srcId)) A3s[ti].header.refBy.push(srcId);
          }
        }
        for (const t of removed) {
          const ti = A3s.findIndex(a => a && a.header && a.header.id === t);
          if (ti !== -1 && Array.isArray(A3s[ti].header.refBy)) {
            A3s[ti].header.refBy = A3s[ti].header.refBy.filter(x => x !== srcId);
          }
        }
      } catch (e) { console.error('Failed to reconcile refs on update', e); }
    }
    fs.writeFileSync(filePath, JSON.stringify(A3s, null, 2), 'utf8');
    return res.status(200).json(updatedA3);
  }

  // Delete a single A3 by full header.id
  if (req.method === 'DELETE') {
    const payload = req.body || {};
    const idToDelete = payload.id || (req.query && req.query.id);
    if (!idToDelete) return res.status(400).json({ error: 'Missing id to delete' });

    const fileContentsDel = fs.readFileSync(filePath, 'utf8');
    let A3sDel = JSON.parse(fileContentsDel || '[]');
    const idxDel = A3sDel.findIndex(A3 => A3 && A3.header && A3.header.id === idToDelete);
    if (idxDel === -1) return res.status(404).json({ error: 'A3 not found' });

    // remove from list
    const removed = A3sDel.splice(idxDel, 1)[0];

    // Clean up any cross-references in remaining A3s (remove this id from their refs and refBy)
    try {
      for (let i = 0; i < A3sDel.length; i++) {
        const a = A3sDel[i];
        if (!a || !a.header) continue;
        if (Array.isArray(a.header.refs)) {
          const before = a.header.refs.length;
          a.header.refs = a.header.refs.filter(x => x !== idToDelete);
          // if changed, keep the new array
        }
        if (Array.isArray(a.header.refBy)) {
          const before = a.header.refBy.length;
          a.header.refBy = a.header.refBy.filter(x => x !== idToDelete);
        }
      }

      fs.writeFileSync(filePath, JSON.stringify(A3sDel, null, 2), 'utf8');
    } catch (e) {
      console.error('Failed to write A3s.json on delete (cleanup)', e);
      return res.status(500).json({ error: 'Failed to delete A3' });
    }

    // Also remove any versions snapshot for the series (best-effort, non-fatal)
    try {
      const versionsPath = path.join(process.cwd(), 'src', 'data', 'A3Versions.json');
      if (fs.existsSync(versionsPath)) {
        const raw = fs.readFileSync(versionsPath, 'utf8') || '{}';
        const versions = JSON.parse(raw);
        const series = (removed && removed.header && removed.header.id) ? removed.header.id.split('-')[1] : null;
        if (series && versions[series]) {
          delete versions[series];
          fs.writeFileSync(versionsPath, JSON.stringify(versions, null, 2), 'utf8');
        }
      }
    } catch (e) {
      // log and continue — deletion of versions is non-fatal
      console.error('Failed to remove A3Versions entry on delete', e);
    }

    return res.status(200).json({ deleted: idToDelete });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
