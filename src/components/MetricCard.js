import React from 'react';
import { MdDelete } from "react-icons/md";
import InputText from './InputText';
import { generateBuckets, shouldDisableFrequency, countBuckets } from '@/utils/bucketUtils';

const cardStyle = {
    border: '1px solid var(--main)',
    borderRadius: 8,
    padding: '12px',
    boxSizing: 'border-box',
    background: 'white',
    minHeight: 200,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
};

const headerStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
};

const sectionStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
};

export default function MetricCard({ metric, index, onChange, onDelete, isDeletable, start, end }) {
    const safeMetric = metric || { metricName: '', unit: '', initial: '', target: { mode: 'linear' } };

    const update = (patch) => {
        onChange({ ...safeMetric, ...patch });
    };

    // parse a numeric-like input into a finite Number or null
    const parseNumber = (v) => {
        if (v === null || typeof v === 'undefined' || v === '') return null;
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
    };

    // When the absolute target value is edited, sync percent relative to initial (if available)
    const handleValueChange = (e) => {
        const raw = e?.target?.value;
        const val = parseNumber(raw);
        const init = parseNumber(safeMetric.initial);

        if (val === null) {
            // user cleared value -> clear percent and mode
            update({ target: { ...(safeMetric.target || {}), value: null, percent: null, mode: 'none' } });
            return;
        }

        let percent = null;
        if (init === null || init === 0) {
            // cannot compute percent reliably
            percent = null;
        } else {
            const diff = val - init;
            const mag = Math.round((Math.abs(diff) / Math.abs(init)) * 10000) / 100; // two decimals magnitude
            if (diff > 0) percent = mag; // positive => increase
            else if (diff < 0) percent = -mag; // negative => decrease
            else percent = 0;
        }

        update({ target: { ...(safeMetric.target || {}), value: val, percent } });
    };

    // When percent is edited, sync absolute value relative to initial. Percent is stored as magnitude (positive).
    const handlePercentChange = (e) => {
        const raw = e?.target?.value;
        const pct = parseNumber(raw);
        const init = parseNumber(safeMetric.initial);

        if (pct === null) {
            update({ target: { ...(safeMetric.target || {}), percent: null, value: null } });
            return;
        }

        // determine current direction from stored signed percent (default +)
        const currentSign = (safeMetric.target && typeof safeMetric.target.percent === 'number' && safeMetric.target.percent < 0) ? -1 : 1;
        if (init === null || init === 0) {
            // cannot compute absolute value reliably; store signed percent (magnitude * currentSign)
            update({ target: { ...(safeMetric.target || {}), percent: currentSign * pct, value: null } });
            return;
        }

        const value = Math.round((init * (1 + currentSign * (pct / 100))) * 100) / 100;
        update({ target: { ...(safeMetric.target || {}), percent: currentSign * pct, value } });
    };

    // Handle direction select: 'up' | 'down' | 'none'
    const handleDirectionChange = (e) => {
        const dir = e?.target?.value || 'none';
        const pctRaw = parseNumber(safeMetric?.target?.percent);
        const mag = pctRaw === null ? null : Math.abs(pctRaw);
        const init = parseNumber(safeMetric.initial);

        if (mag === null) {
            // nothing to sign; keep percent null/zero but no stored mode field
            if (dir === 'none') update({ target: { ...(safeMetric.target || {}), percent: 0, value: init } });
            return;
        }

        const signed = dir === 'down' ? -mag : mag;
        if (init === null || init === 0) {
            update({ target: { ...(safeMetric.target || {}), percent: signed, value: null } });
            return;
        }

        const value = Math.round((init * (1 + (signed / 100))) * 100) / 100;
        update({ target: { ...(safeMetric.target || {}), percent: signed, value } });
    };

    return (
        <div style={cardStyle}>
            <div style={headerStyle}>
                <strong>{(!safeMetric.metricName) ? (index === 0 ? 'Lag' : `Lead ${index}`) : safeMetric.metricName}{index === 0 ? ' (Main Objective)' : ''}</strong>
                {isDeletable && (
                    <button
                        type="button"
                        onClick={() => onDelete?.()}
                        aria-label="Delete metric"
                        style={{
                            background: 'var(--cancel)',
                            height: '100%',
                            color: 'white',
                            aspectRatio: '1/1',
                            borderRadius: '30px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 0,
                            border: 'none',
                            cursor: 'pointer'
                        }}
                    >
                        <MdDelete />
                    </button>
                )}
            </div>

            <div style={sectionStyle}>
                <div>
                    Metric Name
                    <InputText height='2em' value={safeMetric.metricName} onChange={(e) => update({ metricName: e.target.value })} style={{ width: '100%' }} />
                </div>

                <label>
                    Unit
                    <InputText height='2em' value={safeMetric.unit} onChange={(e) => update({ unit: e.target.value })} style={{ width: '100%' }} />
                </label>
                <label>
                    Initial Value
                    <InputText height='2em' type="number" inputMode="decimal" value={safeMetric.initial} onChange={(e) => update({ initial: e.target.value })} style={{ width: '100%' }} placeholder='Enter value...' />
                </label>
                <label>
                    Monitor Frequency
                    {(() => {
                        // helper to enforce sustain granularity rules like in CheckActForm
                        const freqOrder = { daily: 0, weekly: 1, monthly: 2 };
                        const granularityOrder = { days: 0, weeks: 1, months: 2 };
                        function isFreqAllowedByGranularity(freq, gran) {
                            if (!gran) return true;
                            const fi = freqOrder[freq] ?? 0;
                            const gi = granularityOrder[gran] ?? 0;
                            return fi >= gi;
                        }

                        const metricGran = safeMetric?.target?.granularity || null;
                        const dailyDisabled = shouldDisableFrequency(start, end, 'daily', 100) || !isFreqAllowedByGranularity('daily', metricGran);
                        const weeklyDisabled = shouldDisableFrequency(start, end, 'weekly', 100) || !isFreqAllowedByGranularity('weekly', metricGran);
                        const monthlyDisabled = shouldDisableFrequency(start, end, 'monthly', 100) || !isFreqAllowedByGranularity('monthly', metricGran);

                        const setPerMetricFreq = (freq) => {
                            // If the chosen frequency is invalid for the current project span or granularity,
                            // record the preference but DO NOT populate metric data (prevent accidental data creation).
                            const isDisabled = shouldDisableFrequency(start, end, freq, 100) || !isFreqAllowedByGranularity(freq, metricGran);
                            if (isDisabled) {
                                update({ display: { ...(safeMetric.display || {}), freq } });
                                return;
                            }

                            // Valid frequency: generate buckets and replace metric.data with clean bucket rows (value: null or initial for first bucket)
                            try {
                                const buckets = generateBuckets(start, end, freq);
                                const initialVal = typeof safeMetric.initial !== 'undefined' ? safeMetric.initial : null;
                                const firstValue = (initialVal === null || initialVal === '' || !Number.isFinite(Number(initialVal))) ? null : Number(initialVal);
                                const data = buckets.map((d, i) => ({ date: d, value: i === 0 ? firstValue : null }));
                                update({ display: { ...(safeMetric.display || {}), freq }, data });
                            } catch (e) {
                                // fallback: still set the freq but don't populate data
                                update({ display: { ...(safeMetric.display || {}), freq } });
                            }
                        };

                        const current = (safeMetric.display && safeMetric.display.freq) || 'monthly';

                        const freqOptions = [
                            { value: 'daily', label: `Daily${(!dailyDisabled && start && end) ? `: ${countBuckets(start, end, 'daily')} checkpoints` : dailyDisabled ? ' (disabled)' : ''}`, disabled: dailyDisabled },
                            { value: 'weekly', label: `Weekly${(!weeklyDisabled && start && end) ? `: ${countBuckets(start, end, 'weekly')} checkpoints` : weeklyDisabled ? ' (disabled)' : ''}`, disabled: weeklyDisabled },
                            { value: 'monthly', label: `Monthly${(!monthlyDisabled && start && end) ? `: ${countBuckets(start, end, 'monthly')} checkpoints` : monthlyDisabled ? ' (disabled)' : ''}`, disabled: monthlyDisabled }
                        ];

                        return (
                            <InputText
                                height='2em'
                                value={current}
                                onChange={e => setPerMetricFreq(e.target.value)}
                                options={freqOptions}
                            />
                        );
                    })()}
                </label>
            </div>



            {Number.isFinite(Number(safeMetric.initial)) && (
                <>
                    <hr style={{ border: 'none', height: '1px', background: 'var(--main)', marginTop: 6 }} />
                    <div style={{ marginBottom: 'auto' }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                            <label>Define Target</label>
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', flexDirection: 'column' }}>
                            <div style={{ fontSize: 12, color: '#666', width: '100%' }}>At project end, reach:</div>
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center', width: '100%' }}>
                                <InputText width='100%' height='2em' type='number' inputMode='decimal' placeholder="Value" value={safeMetric.target?.value || ''} onChange={handleValueChange} style={{ fontSize: '0.8em' }} />
                                {safeMetric.unit ?
                                    (<div style={{ fontSize: '0.8em', color: '#666', minWidth: 20, textAlign: 'right' }}>{safeMetric.unit}</div>) : null}
                            </div>
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                <InputText
                                    height='2em'
                                    width='50%'
                                    value={(safeMetric.target && typeof safeMetric.target.percent === 'number') ? (safeMetric.target.percent > 0 ? 'up' : safeMetric.target.percent < 0 ? 'down' : 'none') : 'none'}
                                    onChange={handleDirectionChange}
                                    options={[{ value: 'up', label: 'Increase' }, { value: 'down', label: 'Decrease' }, { value: 'none', label: 'Direction' }]}
                                    style={{ fontSize: '0.8em' }}
                                />
                                <InputText
                                    height='2em'
                                    type='number'
                                    inputMode='decimal'
                                    value={Math.abs(safeMetric?.target?.percent) || 0}
                                    onChange={handlePercentChange}
                                    placeholder="Value"
                                    style={{ fontSize: '0.8em' }}
                                    min={0}
                                    width='50%'
                                />
                                <div style={{ fontSize: '0.8em', color: '#666', minWidth: 10, textAlign: 'center', verticalAlign: 'middle' }}>%</div>
                            </div>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <label>Monitorization</label>
                            </div>
                            <InputText
                                height='2em'
                                width='100%'
                                value={safeMetric.target?.mode || 'linear'}
                                onChange={(e) => update({ target: { ...(safeMetric.target || {}), mode: e.target.value } })}
                                options={[{ value: 'linear', label: 'Linear' }, { value: 'constant', label: 'Constant' }]}
                                style={{ fontSize: '0.8em' }}
                            />
                        </div>
                    </div>
                </>
            )}


        </div>
    );
}
