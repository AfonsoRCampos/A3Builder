"use client";
import React from 'react';
import { evaluateMetricAgainstDates } from '@/utils/chartUtils';
import { isoToDateString } from '@/utils/Utils';

export default function LagsLeadsComparison({ a3 = null, legend = true }) {
    const dates = a3?.metrics?.lag?.data.map(item => item.date) || [];
    const metrics = [
        ...(a3?.metrics?.lag?.metricName ? [a3.metrics.lag.metricName] : []),
        ...(a3?.metrics?.leads ?? []).map(item => item.metricName)
    ];
    
    let resultsMatrix = metrics.map(metric => {
            const data = a3?.metrics?.lag?.metricName === metric ? a3.metrics.lag.data : (a3?.metrics?.leads || []).find(m => m.metricName === metric)?.data || [];
            const target = a3?.metrics?.lag?.metricName === metric ? a3.metrics.lag.target : (a3?.metrics?.leads || []).find(m => m.metricName === metric)?.target || {};
            let initial = a3?.metrics?.lag?.metricName === metric ? a3.metrics.lag.initial : (a3?.metrics?.leads || []).find(m => m.metricName === metric)?.initial || null;
            initial = (initial === null || typeof initial === 'undefined') ? null : Number(initial);
            return evaluateMetricAgainstDates({ data, dates, target, initial });
    });

    const evalResults = dates.map((_, idx) => {
        if (resultsMatrix[0][idx] === null) return null;
        const leadsResults = resultsMatrix.slice(1).map(res => res[idx]);
        const totalLeads = leadsResults.filter(v => v !== null).length;
        if (totalLeads === 0) return null;
        const satisfiedLeads = leadsResults.filter(v => v === true).length;
        const leadsRatio = 2 * satisfiedLeads / totalLeads - 1; 
        if (resultsMatrix[0][idx] === true ? leadsRatio < 0 : leadsRatio > 0) return leadsRatio;
        return null;
    });

    resultsMatrix = resultsMatrix.concat([evalResults]);

    const rowLabels = [
        ...metrics,
        'Evaluation'
    ];

    const trueColor = 'var(--green, #2ecc71)';
    const falseColor = 'var(--cancel, #e74c3c)';
    const nullColor = 'var(--gray)';

    const matrixWrapperStyle = legend ? { flex: '0 0 75%', overflowX: 'auto' } : { flex: '1 1 100%', overflowX: 'auto' };
    const containerStyle = legend ? { display: 'flex', gap: 12, color: '#333' } : { display: 'block', color: '#333' };

    return (
        <div className="lags-leads-comparison" style={containerStyle}>
            <div style={matrixWrapperStyle}>
                <table style={{ borderCollapse: 'collapse', width: '100%', tableLayout: 'fixed' }}>
                    <thead>
                        <tr>
                            <th style={{ textAlign: 'left', padding: '6px 8px', width: '20%' }}>Metric / Date</th>
                            {dates.map((d, i) => (
                                <th key={`dh-${i}`} style={{ padding: '6px 4px', fontSize:"0.5em", textAlign: 'center', minWidth: 20 }} title={d}>{isoToDateString(d, 'DD/MM')}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {resultsMatrix.map((row, rIdx) => (
                            <tr key={`r-${rIdx}`}>
                                <td style={{ padding: '6px 8px', borderTop: '1px solid rgba(0,0,0,0.04)', verticalAlign: 'middle', fontSize: 13, fontWeight: rIdx === resultsMatrix.length - 1 ? 700 : 500 }}>{rowLabels[rIdx] || ''}</td>
                                {row.map((cell, cIdx) => {
                                    // evaluation row is last row
                                    if (rIdx === resultsMatrix.length - 1) {
                                        if (cell === null) {
                                            return <td key={`c-${rIdx}-${cIdx}`} style={{ padding: 6, textAlign: 'center', borderTop: '1px solid rgba(0,0,0,0.04)' }} />;
                                        }
                                        const absV = Math.min(1, Math.abs(cell));
                                        const size = 3 + Math.round(absV * 10); // 3..13px
                                        const color = cell > 0 ? '#ff7043' : '#8e44ad';
                                        return (
                                            <td key={`c-${rIdx}-${cIdx}`} style={{ padding: 6, textAlign: 'center', borderTop: '1px solid rgba(0,0,0,0.04)' }}>
                                                <div title={`alert ${cell.toFixed(2)}`} style={{ width: size, height: size, borderRadius: '50%', background: color, margin: '0 auto' }} />
                                            </td>
                                        );
                                    }

                                    // regular metric cells
                                    const bg = cell === true ? trueColor : (cell === false ? falseColor : nullColor);
                                    return (
                                        <td key={`c-${rIdx}-${cIdx}`} style={{ padding: 4, textAlign: 'center', borderTop: '1px solid rgba(0,0,0,0.04)' }}>
                                            <div style={{ width: '10px', height: '10px', margin: '0 auto', borderRadius: 4, background: bg }} />
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {legend && (
                <div style={{ flex: '0 0 25%', minWidth: 160, padding: 8, borderLeft: '1px solid rgba(0,0,0,0.04)' }}>
                    <div style={{ fontWeight: 700, marginBottom: 8 }}>Legend & Notes</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <div style={{ width: 14, height: 10, background: trueColor, borderRadius: 2 }} />
                            <div style={{ fontSize: 13 }}>Meets target</div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <div style={{ width: 14, height: 10, background: falseColor, borderRadius: 2 }} />
                            <div style={{ fontSize: 13 }}>Does not meet target</div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <div style={{ width: 14, height: 10, background: nullColor, borderRadius: 2 }} />
                            <div style={{ fontSize: 13 }}>No data / unknown</div>
                        </div>

                        <div style={{ height: 1, background: 'rgba(0,0,0,0.04)', margin: '8px 0' }} />

                        <div style={{ fontSize: 13, fontWeight: 600 }}>Evaluation circle</div>
                        <div style={{ fontSize: 12, color: '#444' }}>Circle appears when lag and lead progress is mismatched.<br />Size varies with the magnitude of the mismatch.<br />Color:<br />orange - LAG is regressing but LEADs are progressing;<br />purple - LAG is progressing but LEADs are regressing.</div>
                    </div>
                </div>
            )}
        </div>
    );
}

