export function getNextActionId(actions = []) {
  if (!Array.isArray(actions) || actions.length === 0) return 1;
  // Use the integer part of the id when it's a numeric-ish string (e.g. '2.1' -> 2)
  const nums = actions.map(a => {
    const n = Number(a.id);
    if (!Number.isFinite(n)) return 0;
    return Math.floor(n);
  });
  return Math.max(...nums, 0) + 1;
}

export function clampProgress(v) {
  const allowed = [0, 25, 50, 75, 100];
  const n = Number(v);
  return allowed.includes(n) ? n : 0;
}

export function validateLimitAgainstEnd(limitIso, endIso) {
  if (!limitIso) return true;
  if (!endIso) return true;
  const limit = Date.parse(limitIso);
  const end = Date.parse(endIso);
  if (!Number.isFinite(limit) || !Number.isFinite(end)) return false;
  return limit < end;
}

export function ensureLateFlagsForA3(a3) {
  if (!a3) return a3;
  const next = typeof structuredClone === 'function' ? structuredClone(a3) : JSON.parse(JSON.stringify(a3));
  if (!Array.isArray(next.actions)) return next;

  const now = Date.now();

  next.actions = next.actions.map(action => {
    // normalize structures
    const a = { ...(action || {}) };
    a.lateFlags = Array.isArray(a.lateFlags) ? [...a.lateFlags] : [];

    // must have owner and a limit date and incomplete progress
    const hasOwner = a.owner && String(a.owner).trim() !== '';
    const limitIso = a.limit ? (new Date(a.limit).toISOString()) : null;
    const progress = typeof a.progress === 'number' ? a.progress : (typeof a.progress === 'string' ? Number(a.progress) : NaN);
    const incomplete = Number.isFinite(progress) ? (progress < 100) : true;

    if (hasOwner && limitIso && incomplete) {
      const limitTime = Date.parse(limitIso);
      if (Number.isFinite(limitTime) && now > limitTime) {
        // if we've already recorded this exact limit iso, do nothing
        if (!a.lateFlags.includes(limitIso)) {
          // push the limitIso as the flag, cap to 3 flags
          a.lateFlags.push(limitIso);
          if (a.lateFlags.length > 3) a.lateFlags = a.lateFlags.slice(-3);
        }
      }
    }

    return a;
  });

  return next;
}

// return ISO date string YYYY-MM-DD
export function dateOnly(iso) {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    if (isNaN(d)) return null;
    return d.toISOString().slice(0, 10);
  } catch (e) {
    return null;
  }
}

function dateRangeDays(startIso, endIso) {
  // returns array of YYYY-MM-DD strings for each day in [startIso, endIso]
  const out = [];
  try {
    const s = new Date(startIso);
    const e = new Date(endIso);
    if (isNaN(s) || isNaN(e)) return out;
    let cur = new Date(s.valueOf());
    while (cur <= e) {
      out.push(cur.toISOString().slice(0, 10));
      cur.setDate(cur.getDate() + 1);
    }
  } catch (e) { /* ignore */ }
  return out;
}

function normalizeActionProgress(v) {
  if (v == null) return 0;
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return n <= 1 ? n * 100 : n;
}

export function computeActionsProgress(actions = [], weighted = false) {
  if (!Array.isArray(actions) || actions.length === 0) return 0;
  const mapWeight = (w) => {
    if (!w) return 1;
    if (w === 'high') return 3;
    if (w === 'medium') return 2;
    if (w === 'low') return 1;
    return 1;
  };

  if (!weighted) {
    const sum = actions.reduce((s, a) => s + normalizeActionProgress(a.progress), 0);
    return Math.round(sum / actions.length);
  }

  const weightedSum = actions.reduce((s, a) => s + normalizeActionProgress(a.progress) * mapWeight(a.weight), 0);
  const weightTotal = actions.reduce((s, a) => s + mapWeight(a.weight), 0) || actions.length;
  return Math.round(weightedSum / weightTotal);
}

// compute total weight and completed weight (not percent) for an actions list
export function computeActionsTotals(actions = [], weighted = false) {
  if (!Array.isArray(actions) || actions.length === 0) return { total: 0, completed: 0 };
  const mapWeight = (w) => {
    if (!w) return 1;
    if (w === 'high') return 3;
    if (w === 'medium') return 2;
    if (w === 'low') return 1;
    return 1;
  };

  const progressFrac = (p) => {
    if (p == null) return 0;
    const n = Number(p);
    if (!Number.isFinite(n)) return 0;
    const percent = n <= 1 ? n * 100 : n; // normalize 0-1 to percent
    const frac = Math.max(0, Math.min(1, percent / 100));
    return frac;
  };

  if (!weighted) {
    const total = actions.length;
    const completed = actions.reduce((s, a) => s + progressFrac(a.progress), 0);
    return { total, completed };
  }

  const total = actions.reduce((s, a) => s + mapWeight(a.weight), 0);
  const completed = actions.reduce((s, a) => s + mapWeight(a.weight) * progressFrac(a.progress), 0);
  return { total, completed };
}

export function ensureProgressForA3(a3) {
  if (!a3) return a3;
  const next = typeof structuredClone === 'function' ? structuredClone(a3) : JSON.parse(JSON.stringify(a3));
  const startStr = dateOnly(next.header?.start);
  const endStr = dateOnly(next.header?.end);
  if (!startStr || !endStr) return next;

  const days = dateRangeDays(startStr, endStr); // array of YYYY-MM-DD
  if (!Array.isArray(next.progress)) next.progress = [];

  const actions = Array.isArray(next.actions) ? next.actions : [];
  const weighted = Boolean(next.actionsSettings && next.actionsSettings.weighted);
  // liveTotals: { total, completed } measured in weight-units (completed is sum of weighted fractions)
  const liveTotals = computeActionsTotals(actions, weighted);

  const todayStr = dateOnly(new Date().toISOString());

  // map existing progress by date for stable merging
  const existingMap = {};
  next.progress.forEach(p => {
    try {
      if (!p) return;
      // normalize p.date whether it's a Date object or a string
      const key = dateOnly(p.date) || dateOnly(String(p.date));
      if (!key) return;
      const total = (p.total === undefined || p.total === '' || p.total === null ? null : (Number.isFinite(Number(p.total)) ? Number(p.total) : p.total));
      const completed = (p.completed === undefined || p.completed === '' || p.completed === null ? null : (Number.isFinite(Number(p.completed)) ? Number(p.completed) : p.completed));
      existingMap[key] = { total, completed };

    } catch (e) {
      // ignore malformed entries
    }
  });

  // build canonical entries for full span
  const entries = days.map(d => ({ date: d, total: (existingMap[d] ? existingMap[d].total : null), completed: (existingMap[d] ? existingMap[d].completed : null) }));

  // Find the index for today within entries
  const todayIndex = entries.findIndex(en => en.date === todayStr);
  const lastIndexToConsider = todayIndex;

  // If there is no historical completed data and liveTotals.completed is zero,
  // ensure completion rate is filled with 0 up to today. This prevents
  // showing null/empty completed values when there is simply no data yet.
  try {
    const hasAnyCompleted = entries[0].completed != null;
    if (!hasAnyCompleted && todayIndex >= 0) {
      for (let i = 0; i <= todayIndex; i++) {
        if (!entries[i]) continue;
        // set completed to 0 when missing
        if (entries[i].completed == null) entries[i].completed = 0;
      }
    }
  } catch (e) { /* non-fatal */ }

  // Find the first unfilled day (both total and completed null) up to today
  let firstUnfilled = -1;
  for (let i = 0; i <= lastIndexToConsider; i++) {
    const e = entries[i];
    if ((e.total === null || typeof e.total === 'undefined') && (e.completed === null || typeof e.completed === 'undefined')) {
      firstUnfilled = i;
      break;
    }
  }

  // Determine seed values: the last known values before firstUnfilled, or liveTotals when none exist
  let lastTotal = null;
  let lastCompleted = null;
  if (firstUnfilled > 0) {
    for (let j = firstUnfilled - 1; j >= 0; j--) {
      const e = entries[j];
      if (e && (e.total != null || e.completed != null)) {
        lastTotal = e.total != null ? e.total : null;
        lastCompleted = e.completed != null ? e.completed : null;
        break;
      }
    }
  }
  if (lastTotal === null && lastCompleted === null) {
    // no historical filled values — seed with live totals so we can build forward
    lastTotal = liveTotals.total || null;
    lastCompleted = liveTotals.completed || null;
  }

  // If there is no unfilled day up to today, still ensure today's entry reflects liveTotals
  if (firstUnfilled === -1) {
    const tIdx = lastIndexToConsider;
    if (tIdx >= 0) {
      entries[tIdx].total = liveTotals.total;
      entries[tIdx].completed = liveTotals.completed;
    }
  } else {
    // Fill from firstUnfilled up to todayIndex using last known values, but don't overwrite already filled days
    for (let i = firstUnfilled; i <= lastIndexToConsider; i++) {
      const e = entries[i];
      if (!e) continue;
      // if this is the today row, set to liveTotals
      if (e.date === todayStr) {
        e.total = liveTotals.total;
        e.completed = liveTotals.completed;
        lastTotal = e.total;
        lastCompleted = e.completed;
        continue;
      }
      // only fill missing values, keep existing ones
      if (e.total == null) e.total = lastTotal;
      if (e.completed == null) e.completed = lastCompleted;
      // update last known if this row now has values
      if (e.total != null) lastTotal = e.total;
      if (e.completed != null) lastCompleted = e.completed;
    }
  }
  next.progress = entries;
  // debug trace to help when progress doesn't appear to update
  try { console.debug && console.debug('[ensureProgressForA3] progress entries built:', { start: startStr, end: endStr, days: days.length, today: todayStr, liveTotals, entriesLength: entries.length }); } catch (e) { }
  return next;
}
