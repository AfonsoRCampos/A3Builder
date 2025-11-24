// Small helpers to compute bar colors and diffs for charts
export function computeBarColors(data = [], target = {}, colorScheme = {}) {
    const good = colorScheme.good || 'var(--green, #2ecc71)';
    const bad = colorScheme.bad || 'var(--cancel, #e74c3c)';

    const initialVal = (!!data[0]?.value) ? Number(data[0]?.value) : null;

    const colors = new Array(data.length).fill(null);
    let lastNonNull = null;
    // new target contract: { mode: 'linear'|'constant', value: number }
    const targetMode = (target && target.mode) || 'constant';
    const targetValueEnd = typeof target?.value !== 'undefined' ? Number(target.value) : null;

    // compute time span if dates available
    let startTs = null;
    let endTs = null;
    try {
        const firstDate = data[0]?.date;
        const lastDate = data[data.length - 1]?.date;
        const s = firstDate ? Date.parse(firstDate) : NaN;
        const e = lastDate ? Date.parse(lastDate) : NaN;
        if (Number.isFinite(s) && Number.isFinite(e) && e > s) {
            startTs = s;
            endTs = e;
        }
    } catch (e) { /* ignore */ }

    const getTargetAtIndex = (i) => {
        if (targetMode === 'linear' && initialVal !== null && targetValueEnd !== null && startTs !== null) {
            const dt = data[i]?.date ? Date.parse(data[i].date) : null;
            if (!Number.isFinite(dt)) return targetValueEnd;
            const t = Math.max(0, Math.min(1, (dt - startTs) / (endTs - startTs)));
            return initialVal + t * (targetValueEnd - initialVal);
        }
        // fallback to constant end value
        return targetValueEnd;
    };

    const intentUp = (initialVal !== null && targetValueEnd !== null) ? (targetValueEnd > initialVal) : (targetValueEnd !== null ? targetValueEnd > 0 : true);

    for (let i = 0; i < data.length; i++) {
        const raw = data[i]?.value;
        if (raw === null || typeof raw === 'undefined') {
            colors[i] = null;
            continue;
        }
        const v = Number(raw);
        const targetAt = getTargetAtIndex(i);
        if (typeof targetAt !== 'number' || Number.isNaN(targetAt)) {
            colors[i] = null;
            continue;
        }
        const satisfied = intentUp ? (v >= targetAt) : (v <= targetAt);
        colors[i] = satisfied ? good : bad;
        lastNonNull = v;
    }

    return { colors };
}

export function computeDiffs(data = []) {
    const diffs = new Array(data.length).fill(null);
    let lastNonNull = null;
    for (let i = 0; i < data.length; i++) {
        const v = data[i]?.value;
        if (v === null || typeof v === 'undefined') {
            diffs[i] = null;
            continue;
        }
        if (lastNonNull === null) {
            diffs[i] = null; // no diff for the first known point
        } else {
            diffs[i] = v - lastNonNull;
        }
        lastNonNull = v;
    }
    return diffs;
}

export function evaluateMetricAgainstDates({ data = [], dates = [], target = {}, initial = null }) {
    // parse and sort data points by timestamp
    const pts = (Array.isArray(data) ? data : []).map(d => {
        const dt = d?.date ? Date.parse(d.date) : NaN;
        const v = (d && typeof d.value !== 'undefined' && d.value !== null) ? Number(d.value) : null;
        return { dt: Number.isFinite(dt) ? dt : NaN, v };
    }).filter(p => Number.isFinite(p.dt));

    pts.sort((a, b) => a.dt - b.dt);
    const times = pts.map(p => p.dt);
    const vals = pts.map(p => p.v);

    const startTs = times.length ? times[0] : null;
    const endTs = times.length ? times[times.length - 1] : null;

    // initial value: prefer explicit `initial`, else first data value if present
    const initialVal = (initial !== null && typeof initial !== 'undefined') ? Number(initial) : (vals.length ? vals[0] : null);

    const targetMode = (target && target.mode) || 'constant';
    const targetEnd = (typeof target?.value !== 'undefined' && target?.value !== null) ? Number(target.value) : null;

    const getTargetAtTs = (ts) => {
        if (targetMode === 'linear' && initialVal !== null && targetEnd !== null && startTs !== null && endTs !== null && endTs > startTs) {
            const t = Math.max(0, Math.min(1, (ts - startTs) / (endTs - startTs)));
            return initialVal + t * (targetEnd - initialVal);
        }
        return targetEnd;
    };

    const intentUp = (initialVal !== null && targetEnd !== null) ? (targetEnd > initialVal) : (targetEnd !== null ? targetEnd > 0 : true);

    // helper: binary search latest index with times[idx] <= ts
    const findLatestIndex = (ts) => {
        if (!times.length) return -1;
        let lo = 0, hi = times.length - 1, ans = -1;
        while (lo <= hi) {
            const mid = (lo + hi) >> 1;
            if (times[mid] <= ts) {
                ans = mid; lo = mid + 1;
            } else {
                hi = mid - 1;
            }
        }
        return ans;
    };

    // normalize input dates into numeric timestamps
    const parsedDates = (Array.isArray(dates) ? dates : []).map(d => {
        if (d == null) return NaN;
        if (typeof d === 'number') return d;
        const p = Date.parse(d);
        return Number.isFinite(p) ? p : NaN;
    });

    return parsedDates.map((ts) => {
        if (!Number.isFinite(ts)) return null;

        const idx = findLatestIndex(ts);
        let value = null;
        if (idx === -1) {
            // no recorded point at or before ts
            if (startTs !== null && ts < startTs && initialVal !== null) {
                value = initialVal; // use initial when date is before measurements
            } else {
                return null;
            }
        } else {
            value = vals[idx];
            if (value === null || typeof value === 'undefined') return null;
        }

        // When we use the last-known recorded value (vals[idx]) for evaluation,
        // the meaningful comparison is against the target at the time that value
        // was recorded (times[idx]) rather than the requested `ts` which may
        // fall in-between samples. Use the found timestamp when idx >= 0.
        const effectiveTsForTarget = (idx >= 0 && Number.isFinite(times[idx])) ? times[idx] : ts;
        const targetAt = getTargetAtTs(effectiveTsForTarget);
        if (targetAt === null || typeof targetAt === 'undefined' || Number.isNaN(targetAt)) return null;

        return intentUp ? (value >= targetAt) : (value <= targetAt);
    });
}
