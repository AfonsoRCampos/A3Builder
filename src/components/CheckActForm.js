"use client";
import React, { useEffect, useMemo, useState } from 'react';
import { generateBuckets, shouldDisableFrequency, countBuckets } from '@/utils/bucketUtils';
import { isoToDateString, toInitialLast, formatCommentTimestamp } from '@/utils/Utils';
import { IoClose } from "react-icons/io5";
import './CheckActForm.css';
import InputText from './InputText';
import { useUser } from '@/state/UserContext';
import SimpleBarGraph from '@/components/charts/SimpleBarGraph';

// Minimal Check/Act form
// Props: a3, setA3
export default function CheckActForm({ a3, setA3 }) {
    const { user } = useUser();
    const [newComment, setNewComment] = useState('');
    const start = a3?.header?.start || null;
    const end = a3?.header?.end || null;

    const globalFreq = 'monthly';

    // Build a canonical list of metrics from a3.metrics: lag (id: 'lag') and leads (id: 'lead-#')
    const metricsList = useMemo(() => {
        const out = [];
        if (a3?.metrics?.lag) {
            out.push({ id: 'lag', label: a3.metrics.lag.metricName || 'Lag', type: 'lag', ref: ['metrics', 'lag'] });
        }
        if (Array.isArray(a3?.metrics?.leads)) {
            a3.metrics.leads.forEach((l, i) => {
                out.push({ id: `lead-${i}`, label: l.metricName || `Lead ${i + 1}`, type: 'lead', ref: ['metrics', 'leads', i] });
            });
        }
        return out.slice(0, 6); // enforce maximum 6 metrics in UI
    }, [a3?.metrics]);

    // frequency/granularity helpers
    const freqOrder = { daily: 0, weekly: 1, monthly: 2 };
    const granularityOrder = { days: 0, weeks: 1, months: 2 };
    function isFreqAllowedByGranularity(freq, gran) {
        if (!gran) return true; // no restriction
        const fi = freqOrder[freq] ?? 0;
        const gi = granularityOrder[gran] ?? 0;
        return fi >= gi;
    }

    const [editing, setEditing] = useState(null);
    const [editorRows, setEditorRows] = useState([]);

    // compute buckets for currently editing metric using its per-metric setting or global
    const editingFreq = useMemo(() => {
        if (!editing) return null;
        const metric = metricsList.find(m => m.id === editing);
        if (!metric) return null;
        if (metric.type === 'lag') return a3?.metrics?.lag?.display.freq || globalFreq;
        const idx = metric.ref[2];
        return a3?.metrics?.leads?.[idx]?.display.freq || globalFreq;
    }, [editing, metricsList, a3?.metrics, globalFreq]);

    const buckets = useMemo(() => {
        if (!start || !end || !editingFreq) return [];
        return generateBuckets(start, end, editingFreq);
    }, [start, end, editingFreq]);

    const freqDisabled = useMemo(() => {
        if (!start || !end) return true;
        return shouldDisableFrequency(start, end, editingFreq || globalFreq, 100);
    }, [start, end, editingFreq, globalFreq]);

    const editingData = useMemo(() => {
        if (!editing) return null;
        const metric = metricsList.find(m => m.id === editing);
        return metric.type === 'lag' ? a3?.metrics?.lag : metric.type === 'lead' ? a3?.metrics?.leads?.[metric.ref[2]] : null;
    }, [a3, editing, metricsList]);

    const editingMetric = useMemo(() => {
        if (!editing) return null;
        const metric = metricsList.find(m => m.id === editing);
        return metric;
    }, [editing, metricsList]);

    useEffect(() => {
        if (!editing) return setEditorRows([]);
        // load existing data from the corresponding metric's data array
        const metric = metricsList.find(m => m.id === editing);
        if (!metric) return setEditorRows([]);
        // read current data from a3.metrics path (support date objects or strings)
        const existingMap = {};
        try {
            if (metric.type === 'lag') {
                (a3.metrics.lag.data || []).forEach(d => {
                    const dt = d?.date instanceof Date ? d.date : (d?.date ? new Date(d.date) : null);
                    if (dt && !isNaN(dt.getTime())) existingMap[dt.getTime()] = d.value;
                });
            } else if (metric.type === 'lead') {
                const idx = metric.ref[2];
                const lead = a3.metrics.leads?.[idx];
                (lead?.data || []).forEach(d => {
                    const dt = d?.date instanceof Date ? d.date : (d?.date ? new Date(d.date) : null);
                    if (dt && !isNaN(dt.getTime())) existingMap[dt.getTime()] = d.value;
                });
            }
        } catch (e) { /* ignore */ }
        const rows = buckets.map(b => ({ date: b, value: existingMap[b.getTime()] ?? null }));
        // ensure first row reflects metric.initial when present
        try {
            const metricObj = metric.type === 'lag' ? a3.metrics.lag : a3.metrics.leads?.[metric.ref[2]];
            if (rows.length > 0 && metricObj) {
                const initialVal = metricObj.initial;
                if ((rows[0].value === null || typeof rows[0].value === 'undefined' || rows[0].value === '') && typeof initialVal !== 'undefined' && initialVal !== null && initialVal !== '') {
                    rows[0].value = initialVal;
                }
            }
        } catch (e) { /* ignore */ }
        setEditorRows(rows);
    }, [editing, buckets, a3, metricsList]);

    function setMetricDisplay(id, enabled) {
        setA3(prev => {
            const next = typeof structuredClone === 'function' ? structuredClone(prev) : JSON.parse(JSON.stringify(prev));
            next.metrics = next.metrics || {};
            if (id === 'lag') {
                next.metrics.lag = next.metrics.lag || {};
                next.metrics.lag.display = next.metrics.lag.display || {};
                next.metrics.lag.display.enabled = Boolean(enabled);
            } else if (id.startsWith('lead-')) {
                const idx = Number(id.split('-')[1]);
                next.metrics.leads = next.metrics.leads || [];
                next.metrics.leads[idx] = next.metrics.leads[idx] || {};
                next.metrics.leads[idx].display = next.metrics.leads[idx].display || {};
                next.metrics.leads[idx].display.enabled = Boolean(enabled);
            }
            return next;
        });
    }

    // generic setter for fields under metric.display (e.g., showOverlay, showGrid)
    function setMetricDisplayField(id, field, value) {
        setA3(prev => {
            const next = typeof structuredClone === 'function' ? structuredClone(prev) : JSON.parse(JSON.stringify(prev));
            next.metrics = next.metrics || {};
            if (id === 'lag') {
                next.metrics.lag = next.metrics.lag || {};
                next.metrics.lag.display = next.metrics.lag.display || {};
                next.metrics.lag.display[field] = value;
            } else if (id.startsWith('lead-')) {
                const idx = Number(id.split('-')[1]);
                next.metrics.leads = next.metrics.leads || [];
                next.metrics.leads[idx] = next.metrics.leads[idx] || {};
                next.metrics.leads[idx].display = next.metrics.leads[idx].display || {};
                next.metrics.leads[idx].display[field] = value;
            }
            return next;
        });
    }

    function setPerMetricFreq(id, freq) {
        // If the chosen frequency is invalid for the current project span, record the preference
        // but DO NOT populate metric data (prevent accidental data creation).
        // also enforce sustain granularity: don't allow frequencies more granular than the sustain granularity
        const metric = id === 'lag' ? a3?.metrics?.lag : (id.startsWith('lead-') ? a3?.metrics?.leads?.[Number(id.split('-')[1])] : null);
        const metricGran = metric?.target?.granularity || null;
        const isDisabled = shouldDisableFrequency(start, end, freq, 100) || !isFreqAllowedByGranularity(freq, metricGran);
        // Persist frequency on the metric object itself. If the freq is disabled, set the field but do not populate data.
        if (isDisabled) {
            setA3(prev => {
                const next = typeof structuredClone === 'function' ? structuredClone(prev) : JSON.parse(JSON.stringify(prev));
                next.metrics = next.metrics || {};
                if (id === 'lag') {
                    next.metrics.lag = next.metrics.lag || {};
                    next.metrics.lag.display.freq = freq;
                } else if (id.startsWith('lead-')) {
                    const idx = Number(id.split('-')[1]);
                    next.metrics.leads = next.metrics.leads || [];
                    next.metrics.leads[idx] = next.metrics.leads[idx] || {};
                    next.metrics.leads[idx].display.freq = freq;
                }
                return next;
            });
            return;
        }

        // Valid frequency: generate buckets and replace metric.data with clean bucket rows (value: null)
        const buckets = generateBuckets(start, end, freq);
        setA3(prev => {
            const next = typeof structuredClone === 'function' ? structuredClone(prev) : JSON.parse(JSON.stringify(prev));
            next.metrics = next.metrics || {};
            if (id === 'lag') {
                next.metrics.lag = next.metrics.lag || {};
                const initialVal = typeof next.metrics.lag?.initial !== 'undefined' ? next.metrics.lag.initial : null;
                next.metrics.lag.data = buckets.map((d, i) => ({ date: d, value: i === 0 && initialVal !== null && initialVal !== '' ? initialVal : null }));
                next.metrics.lag.display = next.metrics.lag.display || {};
                next.metrics.lag.display.freq = freq;
            } else if (id.startsWith('lead-')) {
                const idx = Number(id.split('-')[1]);
                next.metrics.leads = next.metrics.leads || [];
                next.metrics.leads[idx] = next.metrics.leads[idx] || {};
                const initialVal = typeof next.metrics.leads[idx]?.initial !== 'undefined' ? next.metrics.leads[idx].initial : null;
                next.metrics.leads[idx].data = buckets.map((d, i) => ({ date: d, value: i === 0 && initialVal !== null && initialVal !== '' ? initialVal : null }));
                next.metrics.leads[idx].display = next.metrics.leads[idx].display || {};
                next.metrics.leads[idx].display.freq = freq;
            }
            return next;
        });
    }

    function updateRow(idx, value) {
        const next = [...editorRows];
        // if this row is in the future, ignore updates
        const row = next[idx];
        const rowTime = row?.date instanceof Date ? row.date.getTime() : new Date(row?.date).getTime();
        if (rowTime > Date.now()) return;
        next[idx] = { ...next[idx], value };
        setEditorRows(next);
        // Persist the changed value immediately into the a3 metrics data structure
        if (editing) {
            const metric = metricsList.find(m => m.id === editing);
            if (!metric) return;
            setA3(prev => {
                const clone = typeof structuredClone === 'function' ? structuredClone(prev) : JSON.parse(JSON.stringify(prev));
                clone.metrics = clone.metrics || {};
                // normalize numeric value: treat non-finite conversions (NaN/Infinity) as null
                let parsed = null;
                if (value !== '' && value !== null && typeof value !== 'undefined') {
                    const n = Number(String(value).replace(',', '.'));
                    parsed = Number.isFinite(n) ? n : null;
                }
                const dateKey = next[idx].date instanceof Date ? next[idx].date.getTime() : new Date(next[idx].date).getTime();
                if (metric.type === 'lag') {
                    clone.metrics.lag = clone.metrics.lag || {};
                    // persist initial if editing first row
                    if (idx === 0) clone.metrics.lag.initial = parsed;
                    clone.metrics.lag.data = clone.metrics.lag.data || [];
                    let found = false;
                    for (let i = 0; i < clone.metrics.lag.data.length; i++) {
                        const d = clone.metrics.lag.data[i];
                        const dt = d?.date instanceof Date ? d.date : (d?.date ? new Date(d.date) : null);
                        if (dt && dt.getTime() === dateKey) {
                            clone.metrics.lag.data[i].value = parsed;
                            found = true;
                            break;
                        }
                    }
                    if (!found) {
                        // insert in-order (append and sort) to be safe
                        clone.metrics.lag.data.push({ date: next[idx].date, value: parsed });
                        clone.metrics.lag.data.sort((a, b) => (a.date instanceof Date ? a.date.getTime() : new Date(a.date).getTime()) - (b.date instanceof Date ? b.date.getTime() : new Date(b.date).getTime()));
                    }
                } else if (metric.type === 'lead') {
                    const leadIdx = metric.ref[2];
                    clone.metrics.leads = clone.metrics.leads || [];
                    clone.metrics.leads[leadIdx] = clone.metrics.leads[leadIdx] || {};
                    if (idx === 0) clone.metrics.leads[leadIdx].initial = parsed;
                    clone.metrics.leads[leadIdx].data = clone.metrics.leads[leadIdx].data || [];
                    let found = false;
                    for (let i = 0; i < clone.metrics.leads[leadIdx].data.length; i++) {
                        const d = clone.metrics.leads[leadIdx].data[i];
                        const dt = d?.date instanceof Date ? d.date : (d?.date ? new Date(d.date) : null);
                        if (dt && dt.getTime() === dateKey) {
                            clone.metrics.leads[leadIdx].data[i].value = parsed;
                            found = true;
                            break;
                        }
                    }
                    if (!found) {
                        clone.metrics.leads[leadIdx].data.push({ date: next[idx].date, value: parsed });
                        clone.metrics.leads[leadIdx].data.sort((a, b) => (a.date instanceof Date ? a.date.getTime() : new Date(a.date).getTime()) - (b.date instanceof Date ? b.date.getTime() : new Date(b.date).getTime()));
                    }
                }
                return clone;
            });
        }
    }

    const checkboxStyle = {
        width: 16,
        height: 16,
        cursor: 'pointer',
        borderRadius: '50%',
        display: 'inline-block',
        verticalAlign: 'middle',
        boxSizing: 'border-box',
        appearance: 'none',
        WebkitAppearance: 'none',
        MozAppearance: 'none',
        border: '2px solid var(--orange-dark, #f39c12)',
        backgroundColor: 'transparent'
    }

    // whether the currently editing metric is included in the displayed metrics (stored per-metric)
    const isDisplayed = (() => {
        if (!editing) return false;
        const metric = metricsList.find(m => m.id === editing);
        if (!metric) return false;
        if (metric.type === 'lag') return a3?.metrics?.lag?.display?.enabled ?? true;
        const idx = metric.ref[2];
        return a3?.metrics?.leads?.[idx]?.display?.enabled ?? false;
    })();

    // Render the editor table for the current editing metric (extracted to avoid duplication)
    function renderEditorTable() {
        return (
            <div>
                {freqDisabled && <div style={{ color: '#a33', marginBottom: 8 }}>Frequency appears disabled: set project dates or reduce span</div>}
                <div className="checkact-edit-wrap" style={{ maxHeight: '40vh', overflow: 'auto', border: '2px solid var(--orange-dark)', borderRadius: 6 }}>
                    <table className="checkact-edit-table">
                        <thead>
                            <tr>
                                <th style={{ textAlign: 'center', padding: 6 }}>Date</th>
                                <th style={{ textAlign: 'center', padding: 6 }}>Measured {editingMetric?.label || 'Value'} {editingData?.unit ? ` (${editingData.unit})` : ''}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {editorRows.map((r, i) => {
                                const rowTime = r.date instanceof Date ? r.date.getTime() : new Date(r.date).getTime();
                                const isFuture = rowTime > Date.now();
                                return (
                                    <tr key={`${r.date}-${editing}`} style={isFuture ? { opacity: 0.45 } : {}}>
                                        <td style={{ padding: 6 }}>{isoToDateString(r.date)}</td>
                                        <td style={{ padding: 6 }}>
                                            <InputText key={`${r.date}-${editing}`} type="number" inputMode="decimal" value={r.value ?? null} onChange={e => updateRow(i, e.target.value)} style={{ width: '100%' }} placeholder='Enter number...' hoverColor='var(--orange)' disabled={isFuture} />
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }

    // preview type stored per-metric under metric.display.graphType
    const graphType = editingData?.display?.graphType || 'simple';

    return (
        <div style={{ alignItems: 'center', justifyContent: 'center' }}>
            <h3 style={{ fontWeight: 'bold' }}>Metric Monitoring</h3>

            <div style={{ marginBottom: 12 }}>
                <div className="checkact-table-wrap" style={{ marginTop: 8 }}>
                    <table className="checkact-table">
                        <thead>
                            <tr>
                                <th style={{ textAlign: 'center', padding: 8, width: '10%' }}>Metric</th>
                                <th style={{ textAlign: 'center', padding: 8, width: '10%' }}>Display?</th>
                                <th style={{ textAlign: 'center', padding: 8, width: '20%' }}>Monitor Frequency</th>
                                <th style={{ textAlign: 'center', padding: 8, width: '10%' }}>Filled Checkpoints</th>
                                <th style={{ textAlign: 'center', padding: 8, width: '10%' }}>Edit</th>
                            </tr>
                        </thead>
                        <tbody>
                            {metricsList.map(m => {
                                const checked = m.type === 'lag' ? (a3?.metrics?.lag?.display?.enabled ?? true) : (a3?.metrics?.leads?.[m.ref[2]]?.display?.enabled ?? false);
                                // unit lookup
                                let unit = '';
                                if (m.type === 'lag') unit = a3?.metrics?.lag?.unit || '';
                                if (m.type === 'lead') {
                                    const idx = m.ref[2];
                                    unit = a3?.metrics?.leads?.[idx]?.unit || '';
                                }
                                const rowFreq = (m.type === 'lag' ? (a3?.metrics?.lag?.display.freq) : (a3?.metrics?.leads?.[m.ref[2]]?.display.freq)) || globalFreq;
                                // determine which options should be disabled for this metric (based on span and sustain granularity)
                                const metricGran = m.type === 'lag' ? a3?.metrics?.lag?.target?.granularity : a3?.metrics?.leads?.[m.ref[2]]?.target?.granularity;
                                const dailyDisabled = shouldDisableFrequency(start, end, 'daily', 100) || !isFreqAllowedByGranularity('daily', metricGran);
                                const weeklyDisabled = shouldDisableFrequency(start, end, 'weekly', 100) || !isFreqAllowedByGranularity('weekly', metricGran);
                                const monthlyDisabled = shouldDisableFrequency(start, end, 'monthly', 100) || !isFreqAllowedByGranularity('monthly', metricGran);

                                return (
                                    <tr key={m.id}>
                                        <td>
                                            <span style={{ fontWeight: 600 }}>{m.label} ({unit})</span>
                                            <div style={{ color: '#666', fontSize: 12 }}><span style={{ marginLeft: 8, color: '#999' }}>({m.id})</span></div>
                                        </td>
                                        <td>
                                            <input
                                                type="checkbox"
                                                checked={checked}
                                                style={m.id === 'lag' ? { ...checkboxStyle, backgroundColor: 'var(--gray)', border: '2px solid var(--gray-dark)', cursor: 'not-allowed' } : checked ? { ...checkboxStyle, backgroundColor: 'var(--orange)', border: '2px solid var(--orange-dark)' } : checkboxStyle}
                                                disabled={m.id === 'lag'}
                                                onChange={e => setMetricDisplay(m.id, e.target.checked)}
                                            />
                                        </td>
                                        <td>
                                            <select className="metric-freq-select" value={rowFreq} onChange={e => setPerMetricFreq(m.id, e.target.value)}>
                                                <option value="daily" disabled={dailyDisabled}>Daily: {countBuckets(start, end, 'daily')} checkpoints {dailyDisabled ? ' (disabled)' : ''}</option>
                                                <option value="weekly" disabled={weeklyDisabled}>Weekly: {countBuckets(start, end, 'weekly')} checkpoints {weeklyDisabled ? ' (disabled)' : ''}</option>
                                                <option value="monthly" disabled={monthlyDisabled}>Monthly: {countBuckets(start, end, 'monthly')} checkpoints {monthlyDisabled ? ' (disabled)' : ''}</option>
                                            </select>
                                        </td>
                                        <td className="checkact-td--center">
                                            {(() => {
                                                const data = m.type === 'lag' ? (a3?.metrics?.lag?.data || []) : (a3?.metrics?.leads?.[m.ref[2]]?.data || []);
                                                if (!data || data.length === 0) return <span className="checkact-small-muted">—</span>;
                                                const today = new Date();
                                                const filtered = data.filter(d => (d.date instanceof Date ? d.date.getTime() : new Date(d.date).getTime()) <= today.getTime());
                                                const total = filtered.length;
                                                const filled = filtered.filter(d => d.value !== null && d.value !== undefined && d.value !== '').length;
                                                return <span>{filled} / {total}</span>;

                                            })()}
                                        </td>
                                        <td>
                                            <button onClick={() => setEditing(prev => prev === m.id ? null : m.id)} style={editing === m.id ? { ...checkboxStyle, backgroundColor: 'var(--orange)' } : { ...checkboxStyle }} />
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {editing && (
                <div style={{ border: '2px solid var(--orange-dark)', padding: 8, borderRadius: 6, width: isDisplayed ? '100%' : '50%', marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong>Editing {editingMetric.label}</strong>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, marginRight: 3 }}>
                            <IoClose style={{ scale: 1.5, backgroundColor: 'var(--cancel-highlight)', borderRadius: '4px', cursor: 'pointer', color: 'white' }} onClick={() => setEditing(null)} />
                        </div>
                    </div>

                    {/* If the metric is displayed, show an editor and a preview side-by-side. Otherwise show the editor centered. */}
                    {isDisplayed ? (
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', justifyContent: 'center' }}>
                            <div style={{ width: '50%' }}>
                                {renderEditorTable()}
                            </div>

                            <div style={{ width: '50%' }}>
                                <div style={{ border: '2px dashed var(--orange-dark)', background: 'white', borderRadius: 6, padding: 8, height: '40vh', maxHeight: '40vh', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '10%' }}>
                                        <strong style={{ display: 'block', marginBottom: 4 }}>Display Preview</strong>
                                    </div>

                                    <div className="checkact-edit-wrap" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 0, overflow: 'auto' }}>
                                        {/* Wire SimpleBarGraph for now; other types will be added later */}
                                        {graphType === 'simple' && (
                                            <div style={{ flex: 1, minHeight: 0 }}>
                                                <SimpleBarGraph data={editorRows} metric={editingData} placeholderLabel={editingMetric.label} showZones={editingData?.display?.showOverlay ?? true} showGrid={editingData?.display?.showGrid ?? false} />
                                            </div>
                                        )}
                                        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', minWidth: 0, flex: '0 1 auto' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={Boolean(editingData?.display?.showOverlay ?? true)}
                                                    onChange={e => setMetricDisplayField(editing, 'showOverlay', e.target.checked)}
                                                    style={editingData?.display?.showOverlay ? { ...checkboxStyle, backgroundColor: 'var(--orange)', border: '2px solid var(--orange-dark)' } : checkboxStyle}
                                                />
                                                <span style={{ fontSize: 12, color: '#555' }}>Show overlay</span>
                                            </label>

                                            {/* <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', minWidth: 0, flex: '0 1 auto' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={Boolean(editingData?.display?.showGrid ?? false)}
                                                    onChange={e => setMetricDisplayField(editing, 'showGrid', e.target.checked)}
                                                    style={editingData?.display?.showGrid ? { ...checkboxStyle, backgroundColor: 'var(--orange)', border: '2px solid var(--orange-dark)' } : checkboxStyle}
                                                />
                                                <span style={{ fontSize: 12, color: '#555' }}>Show grid</span>
                                            </label> */}
                                        </div>
                                        {graphType !== 'simple' && (
                                            <div style={{ padding: 12, color: '#666' }}>
                                                Graph type &quot;{graphType}&quot; not implemented yet.
                                            </div>
                                        )}
                                    </div>


                                </div>
                            </div>
                        </div>
                    ) : (
                        <div>
                            {renderEditorTable()}
                        </div>
                    )}
                </div>
            )}

            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', minWidth: 0, flex: '0 1 auto' }}>
                    <input
                        type="checkbox"
                        checked={a3.layout.extraCheckAct.enabled}
                        onChange={e => setA3(prev => {
                            const next = typeof structuredClone === 'function' ? structuredClone(prev) : JSON.parse(JSON.stringify(prev));
                            next.layout = next.layout || {};
                            next.layout.extraCheckAct = next.layout.extraCheckAct || {};
                            next.layout.extraCheckAct.enabled = Boolean(e.target.checked);
                            return next;
                        })}
                        style={a3.layout.extraCheckAct.enabled ? { ...checkboxStyle, backgroundColor: 'var(--orange)', border: '2px solid var(--orange-dark)' } : checkboxStyle}
                    />
                    <span style={{ fontSize: 12, color: '#555' }}>Additional Comments</span>
                </label>
            </div>
            {a3.layout?.extraCheckAct?.enabled && (
                <div style={{ marginTop: 8 }}>
                    <label style={{ fontWeight: 'bold', display: 'block', marginBottom: 6 }}>Additional Comments</label>

                    <div style={{ border: '1px solid var(--orange)', borderRadius: 6, padding: 8 }}>
                        {/* Comments list */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: '24vh', overflow: 'auto', marginBottom: 8 }}>
                            {(Array.isArray(a3.layout?.extraCheckAct?.text) && a3.layout.extraCheckAct.text.length > 0) ? (
                                a3.layout.extraCheckAct.text.map((entry, idx) => {
                                    // support legacy string entries and convert to structured object for display
                                    let comment = null;
                                    if (entry && typeof entry === 'object' && entry.text) {
                                        comment = entry;
                                    } else if (typeof entry === 'string') {
                                        const m = String(entry).match(/^(.+?)\s*\(([^)]+)\):\s*(.*)$/);
                                        const parsedAuthorDisplay = m ? m[1].trim() : null;
                                        const parsedWhenRaw = m ? m[2] : null;
                                        const parsedText = m ? m[3] : entry;
                                        // try to convert legacy locale date to ISO
                                        let parsedWhen = null;
                                        if (parsedWhenRaw) {
                                            const dt = new Date(parsedWhenRaw);
                                            if (!isNaN(dt)) parsedWhen = dt.toISOString();
                                        }
                                        comment = { author: null, authorDisplay: parsedAuthorDisplay || null, date: parsedWhen || null, text: parsedText };
                                    } else {
                                        comment = { author: null, authorDisplay: null, date: null, text: String(entry ?? '') };
                                    }

                                    const canDelete = (a3?.header?.owner === user) || (comment.author && comment.author === user);
                                    const label = comment.authorDisplay ? `${comment.authorDisplay}${comment.date ? ` (${formatCommentTimestamp(comment.date)})` : ''}` : null;
                                    return (
                                        <div key={`comment-${idx}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, background: 'white', padding: '6px 8px', borderRadius: 6 }}>
                                            <div style={{ fontSize: 13, color: '#222', wordBreak: 'break-word', flex: 1 }}>{label ? `${label}: ${comment.text}` : comment.text}</div>
                                            {canDelete && (
                                                <button aria-label={`Delete comment ${idx}`} onClick={() => {
                                                    // remove the comment at idx
                                                    setA3(prev => {
                                                        const next = typeof structuredClone === 'function' ? structuredClone(prev) : JSON.parse(JSON.stringify(prev));
                                                        next.layout = next.layout || {};
                                                        next.layout.extraCheckAct = next.layout.extraCheckAct || {};
                                                        next.layout.extraCheckAct.text = Array.isArray(next.layout.extraCheckAct.text) ? next.layout.extraCheckAct.text.slice() : [];
                                                        next.layout.extraCheckAct.text.splice(idx, 1);
                                                        return next;
                                                    });
                                                }} style={{ marginLeft: 8, background: 'transparent', border: '1px solid rgba(0,0,0,0.06)', padding: '6px', borderRadius: 6, cursor: 'pointer' }}>Delete</button>
                                            )}
                                        </div>
                                    );
                                })
                            ) : (
                                <div style={{ color: '#666', fontSize: 13 }}>No comments yet</div>
                            )}
                        </div>

                        {/* New comment input */}
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <input
                                type="text"
                                value={newComment}
                                onChange={e => setNewComment(e.target.value)}
                                placeholder="Write a comment..."
                                style={{ flex: 1, padding: '8px', borderRadius: 6, border: '1px solid rgba(0,0,0,0.08)' }}
                            />
                            <button
                                onClick={() => {
                                    const text = String(newComment || '').trim();
                                    if (!text) return;
                                    const authorRaw = user || null;
                                    const whenIso = new Date().toISOString();
                                    const formattedAuthor = authorRaw ? toInitialLast(authorRaw) : null;
                                    const obj = { author: authorRaw, authorDisplay: formattedAuthor, date: whenIso, text };
                                    setA3(prev => {
                                        const next = typeof structuredClone === 'function' ? structuredClone(prev) : JSON.parse(JSON.stringify(prev));
                                        next.layout = next.layout || {};
                                        next.layout.extraCheckAct = next.layout.extraCheckAct || {};
                                        next.layout.extraCheckAct.text = Array.isArray(next.layout.extraCheckAct.text) ? next.layout.extraCheckAct.text.slice() : [];
                                        next.layout.extraCheckAct.text.push(obj);
                                        return next;
                                    });
                                    setNewComment('');
                                }}
                                style={{ padding: '8px 12px', borderRadius: 6, background: 'var(--orange)', color: 'white', border: 'none', cursor: 'pointer' }}
                                disabled={!newComment.trim()}
                            >Add</button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
