import fs from 'fs';
import path from 'path';
import { toInitialLast } from '@/utils/Utils';

function formatDateForLog(d) {
    if (!d) return 'N/A';
    try {
        const dt = new Date(d);
        if (isNaN(dt)) return String(d);
        const pad = n => String(n).padStart(2, '0');
        const dd = pad(dt.getUTCDate());
        const mm = pad(dt.getUTCMonth() + 1);
        const yyyy = dt.getUTCFullYear();
        const hh = pad(dt.getUTCHours());
        const min = pad(dt.getUTCMinutes());
        // if time portion is midnight UTC, show only date
        if (dt.getUTCHours() === 0 && dt.getUTCMinutes() === 0 && dt.getUTCSeconds() === 0) {
            return `${dd}-${mm}-${yyyy}`;
        }
        return `${dd}-${mm}-${yyyy} ${hh}:${min}`;
    } catch (e) { return String(d); }
}

function arraysEqual(a, b) {
    const A = Array.isArray(a) ? a : (a ? [a] : []);
    const B = Array.isArray(b) ? b : (b ? [b] : []);
    if (A.length !== B.length) return false;
    const norm = arr => arr.map(x => (typeof x === 'object' ? JSON.stringify(x) : String(x))).sort();
    const sa = norm(A);
    const sb = norm(B);
    for (let i = 0; i < sa.length; i++) if (sa[i] !== sb[i]) return false;
    return true;
}

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

function getChangeLog(current, previous) {
    // produce a structured changelog map: keys -> array of phrase strings
    // Keep a short string `message` for backward compatibility
    if (!previous) return { changelog: { 'General': ['Initial snapshot.'] } };
    try {
        const sections = ['General', 'Problem Definition', 'Metrics & Objectives', 'Actions', 'Current State', 'Future State'];
        let changelog = {};

        for (const h of sections) {
            if (h === 'General') {
                if (current.header.title !== previous.header.title) {
                    changelog['General'] = changelog['General'] || [];
                    changelog['General'].push(`Title changed from "${previous.header.title || 'Untitled'}" to "${current.header.title || 'Untitled'}".`);
                }
                if (current.header.team !== previous.header.team) {
                    // calculate diff in team members
                    const currentTeam = Array.isArray(current.header.team) ? current.header.team : [];
                    const previousTeam = Array.isArray(previous.header.team) ? previous.header.team : [];
                    const normalize = m => {
                        if (m == null) return '';
                        if (typeof m === 'object') return m.id || m.name || JSON.stringify(m);
                        return String(m);
                    };

                    const curNorm = currentTeam.map(normalize);
                    const prevNorm = previousTeam.map(normalize);

                    const added = curNorm.filter(x => !prevNorm.includes(x)).map(x => toInitialLast(x));
                    const removed = prevNorm.filter(x => !curNorm.includes(x)).map(x => toInitialLast(x));

                    if (added.length) {
                        changelog['General'] = changelog['General'] || [];
                        changelog['General'].push(`Team members added: ${added.join(', ')}.`);
                    }
                    if (removed.length) {
                        changelog['General'] = changelog['General'] || [];
                        changelog['General'].push(`Team members removed: ${removed.join(', ')}.`);
                    }
                }
                if ((current.header.start !== previous.header.start) || (current.header.end !== previous.header.end)) {
                    changelog['General'] = changelog['General'] || [];
                    changelog['General'].push(`Project timeline changed from ${formatDateForLog(previous.header.start)} - ${formatDateForLog(previous.header.end)} to ${formatDateForLog(current.header.start)} - ${formatDateForLog(current.header.end)}.`);
                }
                if ((current.header.refs || []).sort().join(',') !== (previous.header.refs || []).sort().join(',')) {
                    changelog['General'] = changelog['General'] || [];
                    changelog['General'].push(`External A3 references changed.`);
                }
                if ((current.header.attachments || []).sort().join(',') !== (previous.header.attachments || []).sort().join(',')) {
                    changelog['General'] = changelog['General'] || [];
                    changelog['General'].push(`File attachments changed.`);
                }
                if (JSON.stringify(current.layout.sections) !== JSON.stringify(previous.layout.sections)) {
                    changelog['General'] = changelog['General'] || [];
                    changelog['General'].push(`Layout changed.`);
                }
                if (!arraysEqual(current.layout.canEdit, previous.layout.canEdit)) {
                    changelog['General'] = changelog['General'] || [];
                    changelog['General'].push(`(OWNER) Layout edit permissions changed.`);
                }
            } else if (h === 'Problem Definition') {
                if (current.probDef.why !== previous.probDef.why) {
                    changelog['Problem Definition'] = changelog['Problem Definition'] || [];
                    changelog['Problem Definition'].push(`"Why" statement updated.`);
                }
                if (current.probDef.where !== previous.probDef.where) {
                    changelog['Problem Definition'] = changelog['Problem Definition'] || [];
                    changelog['Problem Definition'].push(`"Where" statement updated.`);
                }
                if (current.probDef.extra !== previous.probDef.extra) {
                    changelog['Problem Definition'] = changelog['Problem Definition'] || [];
                    changelog['Problem Definition'].push(`Additional problem details updated.`);
                }
                if (JSON.stringify(current.metrics.lag.placeholder) !== JSON.stringify(previous.metrics.lag.placeholder)) {
                    changelog['Problem Definition'] = changelog['Problem Definition'] || [];
                    changelog['Problem Definition'].push(`Problem placeholder updated.`);
                }
                if (!arraysEqual(current.probDef.canEdit, previous.probDef.canEdit)) {
                    changelog['Problem Definition'] = changelog['Problem Definition'] || [];
                    changelog['Problem Definition'].push(`(OWNER) Problem Definition edit permissions changed.`);
                }
            } else if (h === 'Current State') {
                if (JSON.stringify(current.currentState) !== JSON.stringify(previous.currentState)) {
                    changelog['Current State'] = changelog['Current State'] || [];
                    changelog['Current State'].push(`Current State canvas updated.`);
                }
                if (current.layout.extraCurrentState.enabled !== previous.layout.extraCurrentState.enabled) {
                    changelog['Current State'] = changelog['Current State'] || [];
                    changelog['Current State'].push(`Current State comment section ${current.layout.extraCurrentState.enabled ? 'enabled' : 'disabled'}.`);
                }
                if (JSON.stringify(current.layout.extraCurrentState.text) !== JSON.stringify(previous.layout.extraCurrentState.text)) {
                    changelog['Current State'] = changelog['Current State'] || [];
                    changelog['Current State'].push(`Current State comments updated.`);
                }
                if (!arraysEqual(current.currentState.canEdit, previous.currentState.canEdit)) {
                    changelog['Current State'] = changelog['Current State'] || [];
                    changelog['Current State'].push(`(OWNER) Current State edit permissions changed.`);
                }
            } else if (h === 'Future State') {
                if (current.layout.includeFutureState !== previous.layout.includeFutureState) {
                    changelog['Future State'] = changelog['Future State'] || [];
                    changelog['Future State'].push(`Section ${current.layout.includeFutureState ? 'enabled' : 'disabled'}.`);
                }
                if (JSON.stringify(current.actionPlan) !== JSON.stringify(previous.actionPlan)) {
                    changelog['Future State'] = changelog['Future State'] || [];
                    changelog['Future State'].push(`Future State canvas updated.`);
                }
                if (!arraysEqual(current.actionPlan.canEdit, previous.actionPlan.canEdit)) {
                    changelog['Future State'] = changelog['Future State'] || [];
                    changelog['Future State'].push(`(OWNER) Future State edit permissions changed.`);
                }
            } else if (h === 'Actions') {
                const curActions = Array.isArray(current.actions) ? current.actions : [];
                const prevActions = Array.isArray(previous.actions) ? previous.actions : [];

                const curById = new Map(curActions.map(a => [String(a.id), a]));
                const prevById = new Map(prevActions.map(a => [String(a.id), a]));

                const added = curActions.filter(a => !prevById.has(String(a.id)));
                const removed = prevActions.filter(a => !curById.has(String(a.id)));

                if (added.length) {
                    changelog['Actions'] = changelog['Actions'] || [];
                    changelog['Actions'].push(`Added actions: ${added.map(a => `#${a.id} ${a.description || ''}`.trim()).join(', ')}.`);
                }
                if (removed.length) {
                    changelog['Actions'] = changelog['Actions'] || [];
                    changelog['Actions'].push(`Removed actions: ${removed.map(a => `#${a.id} ${a.description || ''}`.trim()).join(', ')}.`);
                }

                // per-action changes for existing actions
                const commonIds = Array.from(curById.keys()).filter(id => prevById.has(id));
                for (const id of commonIds) {
                    const cur = curById.get(id);
                    const prev = prevById.get(id);
                    const diffs = [];
                    // progress change
                    if ((typeof cur.progress !== 'undefined' || typeof prev.progress !== 'undefined') && cur.progress !== prev.progress) {
                        const fmt = v => (v === null || typeof v === 'undefined' ? '—' : (Number(v) <= 1 ? `${Math.round(Number(v) * 100)}%` : `${Math.round(Number(v))}%`));
                        diffs.push(`progress ${fmt(prev.progress)} → ${fmt(cur.progress)}`);
                    }
                    // owner change
                    if ((cur.owner || '') !== (prev.owner || '')) {
                        const oldOwner = prev.owner ? toInitialLast(prev.owner) : '—';
                        const newOwner = cur.owner ? toInitialLast(cur.owner) : '—';
                        diffs.push(`owner ${oldOwner} → ${newOwner}`);
                    }
                    // limit change
                    if ((cur.limit || '') !== (prev.limit || '')) {
                        const oldLimit = prev.limit || '—';
                        const newLimit = cur.limit || '—';
                        diffs.push(`limit ${oldLimit} → ${newLimit}`);
                    }
                    // weight change
                    if ((cur.weight || '') !== (prev.weight || '')) {
                        const oldW = prev.weight || '—';
                        const newW = cur.weight || '—';
                        diffs.push(`weight ${oldW} → ${newW}`);
                    }

                    if (diffs.length) {
                        changelog['Actions'] = changelog['Actions'] || [];
                        changelog['Actions'].push(`Action #${id} (${cur.description || ''}): ${diffs.join('; ')}.`);
                    }
                }

                // actionsSettings.weighted changed?
                try {
                    const curWeighted = current.actionsSettings && typeof current.actionsSettings.weighted !== 'undefined' ? Boolean(current.actionsSettings.weighted) : null;
                    const prevWeighted = previous.actionsSettings && typeof previous.actionsSettings.weighted !== 'undefined' ? Boolean(previous.actionsSettings.weighted) : null;
                    if (curWeighted !== null && prevWeighted !== null && curWeighted !== prevWeighted) {
                        changelog['Actions'] = changelog['Actions'] || [];
                        changelog['Actions'].push(`Weighting ${curWeighted ? 'enabled' : 'disabled'}.`);
                    }
                } catch (e) { /* ignore */ }

            } else if (h === 'Metrics & Objectives') {
                const curMetrics = current.metrics || {};
                const prevMetrics = previous.metrics || {};

                // handle primary lag metric
                const curLag = curMetrics.lag || {};
                const prevLag = prevMetrics.lag || {};
                const lagName = curLag.metricName || prevLag.metricName || 'lag';

                if ((curLag.metricName || '') !== (prevLag.metricName || '')) {
                    changelog['Metrics & Objectives'] = changelog['Metrics & Objectives'] || [];
                    changelog['Metrics & Objectives'].push(`Metric name changed: "${prevLag.metricName || '—'}" → "${curLag.metricName || '—'}".`);
                }
                if ((curLag.unit || '') !== (prevLag.unit || '')) {
                    changelog['Metrics & Objectives'] = changelog['Metrics & Objectives'] || [];
                    changelog['Metrics & Objectives'].push(`Metric ${lagName} unit changed: "${prevLag.unit || '—'}" → "${curLag.unit || '—'}".`);
                }
                if (typeof curLag.initial !== 'undefined' || typeof prevLag.initial !== 'undefined') {
                    if (String(curLag.initial || '') !== String(prevLag.initial || '')) {
                        changelog['Metrics & Objectives'] = changelog['Metrics & Objectives'] || [];
                        changelog['Metrics & Objectives'].push(`Metric ${lagName} initial value changed: "${prevLag.initial || '—'}" → "${curLag.initial || '—'}".`);
                    }
                }
                // target comparison (value/mode/percent)
                const curT = curLag.target || {};
                const prevT = prevLag.target || {};
                const targetDiffs = [];
                if (typeof curT.value !== 'undefined' || typeof prevT.value !== 'undefined') {
                    if (String(curT.value || '') !== String(prevT.value || '')) targetDiffs.push(`value ${prevT.value || '—'} → ${curT.value || '—'}`);
                }
                if (typeof curT.mode !== 'undefined' || typeof prevT.mode !== 'undefined') {
                    if ((curT.mode || '') !== (prevT.mode || '')) targetDiffs.push(`mode ${prevT.mode || '—'} → ${curT.mode || '—'}`);
                }
                if (typeof curT.percent !== 'undefined' || typeof prevT.percent !== 'undefined') {
                    if (String(curT.percent || '') !== String(prevT.percent || '')) targetDiffs.push(`percent ${prevT.percent || '—'} → ${curT.percent || '—'}`);
                }
                if (targetDiffs.length) {
                    changelog['Metrics & Objectives'] = changelog['Metrics & Objectives'] || [];
                    changelog['Metrics & Objectives'].push(`Metric ${lagName} target changed: ${targetDiffs.join('; ')}.`);
                }
                // data changed -> generic note only
                try {
                    const curData = Array.isArray(curLag.data) ? curLag.data : [];
                    const prevData = Array.isArray(prevLag.data) ? prevLag.data : [];
                    if (JSON.stringify(curData) !== JSON.stringify(prevData)) {
                        changelog['Metrics & Objectives'] = changelog['Metrics & Objectives'] || [];
                        changelog['Metrics & Objectives'].push(`Metric ${lagName} data updated.`);
                    }
                } catch (e) { /* ignore */ }

                // handles lead metrics (array)
                const curLeads = Array.isArray(curMetrics.leads) ? curMetrics.leads : [];
                const prevLeads = Array.isArray(prevMetrics.leads) ? prevMetrics.leads : [];
                const prevByName = new Map(prevLeads.map(m => [m.metricName || String(Math.random()), m]));
                const curByName = new Map(curLeads.map(m => [m.metricName || String(Math.random()), m]));

                const addedLeads = curLeads.filter(m => !(prevByName.has(m.metricName)));
                const removedLeads = prevLeads.filter(m => !(curByName.has(m.metricName)));

                if (addedLeads.length) {
                    changelog['Metrics & Objectives'] = changelog['Metrics & Objectives'] || [];
                    changelog['Metrics & Objectives'].push(`Added metrics: ${addedLeads.map(m => `${m.metricName || 'unnamed'}`).join(', ')}.`);
                }
                if (removedLeads.length) {
                    changelog['Metrics & Objectives'] = changelog['Metrics & Objectives'] || [];
                    changelog['Metrics & Objectives'].push(`Removed metrics: ${removedLeads.map(m => `${m.metricName || 'unnamed'}`).join(', ')}.`);
                }

                // compare existing leads
                for (const [name, curM] of curByName.entries()) {
                    if (!prevByName.has(name)) continue;
                    const prevM = prevByName.get(name);
                    const diffs = [];
                    if ((curM.unit || '') !== (prevM.unit || '')) diffs.push(`unit ${prevM.unit || '—'} → ${curM.unit || '—'}`);
                    if (String(curM.initial || '') !== String(prevM.initial || '')) diffs.push(`initial ${prevM.initial || '—'} → ${curM.initial || '—'}`);
                    const curMt = curM.target || {};
                    const prevMt = prevM.target || {};
                    if (String(curMt.value || '') !== String(prevMt.value || '')) diffs.push(`target value ${prevMt.value || '—'} → ${curMt.value || '—'}`);
                    if ((curMt.mode || '') !== (prevMt.mode || '')) diffs.push(`target mode ${prevMt.mode || '—'} → ${curMt.mode || '—'}`);
                    if (diffs.length) {
                        changelog['Metrics & Objectives'] = changelog['Metrics & Objectives'] || [];
                        changelog['Metrics & Objectives'].push(`Metric ${name}: ${diffs.join('; ')}.`);
                    }
                    // data change => generic
                    try {
                        const curData = Array.isArray(curM.data) ? curM.data : [];
                        const prevData = Array.isArray(prevM.data) ? prevM.data : [];
                        if (JSON.stringify(curData) !== JSON.stringify(prevData)) {
                            changelog['Metrics & Objectives'] = changelog['Metrics & Objectives'] || [];
                            changelog['Metrics & Objectives'].push(`Metric ${name} data updated.`);
                        }
                    } catch (e) { /* ignore */ }
                }
                // permissions: canEditObjectives / canEditMetrics
                try {
                    const curCanEditObj = Array.isArray(curMetrics.canEditObjectives) ? curMetrics.canEditObjectives : (curMetrics.canEditObjectives || []);
                    const prevCanEditObj = Array.isArray(prevMetrics.canEditObjectives) ? prevMetrics.canEditObjectives : (prevMetrics.canEditObjectives || []);
                    if (JSON.stringify(curCanEditObj) !== JSON.stringify(prevCanEditObj)) {
                        changelog['Metrics & Objectives'] = changelog['Metrics & Objectives'] || [];
                        changelog['Metrics & Objectives'].push(`(OWNER) Objectives edit permissions changed.`);
                    }

                    const curCanEditMet = Array.isArray(curMetrics.canEditMetrics) ? curMetrics.canEditMetrics : (curMetrics.canEditMetrics || []);
                    const prevCanEditMet = Array.isArray(prevMetrics.canEditMetrics) ? prevMetrics.canEditMetrics : (prevMetrics.canEditMetrics || []);
                    if (JSON.stringify(curCanEditMet) !== JSON.stringify(prevCanEditMet)) {
                        changelog['Metrics & Objectives'] = changelog['Metrics & Objectives'] || [];
                        changelog['Metrics & Objectives'].push(`(OWNER) Check Act edit permissions changed.`);
                    }
                } catch (e) { /* ignore */ }
                // also mirror Check/Act changes into Metrics (if present)
                try {
                    if (current.layout && previous.layout && current.layout.extraCheckAct && previous.layout.extraCheckAct) {
                        if (current.layout.extraCheckAct.enabled !== previous.layout.extraCheckAct.enabled) {
                            changelog['Metrics & Objectives'] = changelog['Metrics & Objectives'] || [];
                            changelog['Metrics & Objectives'].push(`Check/Act comment section ${current.layout.extraCheckAct.enabled ? 'enabled' : 'disabled'}.`);
                        }
                        if (JSON.stringify(current.layout.extraCheckAct.text) !== JSON.stringify(previous.layout.extraCheckAct.text)) {
                            changelog['Metrics & Objectives'] = changelog['Metrics & Objectives'] || [];
                            changelog['Metrics & Objectives'].push(`Check/Act comments updated.`);
                        }
                        if (!arraysEqual(current.layout.extraCheckAct.canEdit, previous.layout.extraCheckAct.canEdit)) {
                            changelog['Metrics & Objectives'] = changelog['Metrics & Objectives'] || [];
                            changelog['Metrics & Objectives'].push(`(OWNER) Check/Act edit permissions changed.`);
                        }
                    }
                } catch (e) { /* ignore */ }
                // Mirror Check/Act messages under Objectives as well
                try {
                    if (current.layout && previous.layout && current.layout.extraCheckAct && previous.layout.extraCheckAct) {
                        if (current.layout.extraCheckAct.enabled !== previous.layout.extraCheckAct.enabled) {
                            changelog['Objectives'] = changelog['Objectives'] || [];
                            changelog['Objectives'].push(`Check/Act comment section ${current.layout.extraCheckAct.enabled ? 'enabled' : 'disabled'}.`);
                        }
                        if (JSON.stringify(current.layout.extraCheckAct.text) !== JSON.stringify(previous.layout.extraCheckAct.text)) {
                            changelog['Objectives'] = changelog['Objectives'] || [];
                            changelog['Objectives'].push(`Check/Act comments updated.`);
                        }
                        if (!arraysEqual(current.layout.extraCheckAct.canEdit, previous.layout.extraCheckAct.canEdit)) {
                            changelog['Objectives'] = changelog['Objectives'] || [];
                            changelog['Objectives'].push(`(OWNER) Check/Act edit permissions changed.`);
                        }
                    }
                } catch (e) { /* ignore */ }
            }
        }

        return { changelog };
    } catch (e) {
        return { changelog: { 'General': ['Changelog generation failed.'] } };
    }
}

export default function handler(req, res) {
    const { series } = req.query;
    if (!series) return res.status(400).json({ error: 'Missing series id' });

    const versionsPath = path.join(process.cwd(), 'src', 'data', 'A3Versions.json');
    let versions = {};
    if (fs.existsSync(versionsPath)) {
        try { versions = JSON.parse(fs.readFileSync(versionsPath, 'utf8') || '{}'); } catch (e) { versions = {}; }
    }

    if (req.method === 'GET') {
        const seriesObj = versions[series] || { versions: {}, history: [], currentVersion: null };
        return res.status(200).json(seriesObj);
    }

    if (req.method === 'POST') {
        const a3Path = path.join(process.cwd(), 'src', 'data', 'A3s.json');
        if (!fs.existsSync(a3Path)) return res.status(500).json({ error: 'A3s data missing' });
        const all = JSON.parse(fs.readFileSync(a3Path, 'utf8') || '[]');
        const current = all.find(a => a.header && a.header.id && a.header.id.split('-')[1] === series);
        if (!current) return res.status(404).json({ error: 'Series not found' });

        versions[series] = versions[series] || {};
        const existingVersions = Object.keys(versions[series] || {});
        const last = existingVersions.length === 0 ? null : existingVersions.sort((a, b) => labelToNumber(a) - labelToNumber(b))[existingVersions.length - 1];
        const next = last ? nextVersionLabel(last) : 'B';

        const previous = last ? versions[series][last]?.snapshot || null : null;
        const { changelog } = getChangeLog(current, previous);

        versions[series][next] = { snapshot: current, meta: { ts: Date.now(), changelog: changelog || {} } };

        fs.writeFileSync(versionsPath, JSON.stringify(versions, null, 2), 'utf8');

        // update current A3 header id to new version (A3-<series>-<next>)
        const idx = all.findIndex(a => a.header && a.header.id && a.header.id.split('-')[1] === series);
        if (idx !== -1) {
            // update id for the A3 and fix cross-references across other A3s
            const oldId = all[idx].header.id;
            const parts = all[idx].header.id.split('-');
            parts[2] = next;
            const newId = parts.join('-');
            all[idx].header.id = newId;

            // Update other A3s: replace refs/refBy occurrences of oldId with newId
            for (let i = 0; i < all.length; i++) {
                if (!all[i] || !all[i].header) continue;
                // skip the updated entry
                if (i === idx) continue;
                if (Array.isArray(all[i].header.refs)) {
                    let changed = false;
                    all[i].header.refs = all[i].header.refs.map(r => {
                        if (r === oldId) { changed = true; return newId; }
                        return r;
                    });
                    if (changed) {
                        // ensure uniqueness
                        all[i].header.refs = Array.from(new Set(all[i].header.refs));
                    }
                }
                if (Array.isArray(all[i].header.refBy)) {
                    let changed = false;
                    all[i].header.refBy = all[i].header.refBy.map(r => {
                        if (r === oldId) { changed = true; return newId; }
                        return r;
                    });
                    if (changed) {
                        all[i].header.refBy = Array.from(new Set(all[i].header.refBy));
                    }
                }
            }

            fs.writeFileSync(a3Path, JSON.stringify(all, null, 2), 'utf8');
        }

        return res.status(201).json({ version: next, meta: versions[series][next].meta });
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
