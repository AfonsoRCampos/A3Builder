"use client";
import React, { useMemo } from 'react';
import useMeasure from 'react-use-measure';
import { Group } from '@visx/group';
// import { LinePath, AreaClosed, Bar } from '@visx/shape';
// import { scaleLinear } from '@visx/scale';
// import { curveMonotoneX } from '@visx/curve';
// import { Circle } from '@visx/shape';

// progress: [{date: 'YYYY-MM-DD', total: number|null, completed: number|null}, ...]
export default function ProgressChart({ progress = [], height = 180, colors = {}, margin = { top: 8, right: 45, bottom: 27.5, left: 45 } }) {
    const cfg = {
        completed: colors.completed || 'var(--green, #39b54a)',
        gap: colors.gap || '#ce3131ff',
        totalPoint: colors.totalPoint || 'var(--cancel, #ffe600ff)',
        targetLine: colors.targetLine || 'var(--accent, #f39c12)',
        todayLine: colors.todayLine || 'rgba(0, 0, 0, 1)'
    };

    const rows = progress.slice();

    const { data, todayIndex, maxY } = useMemo(() => {
        const out = rows.map((r, i) => ({
            idx: i,
            date: r?.date || null,
            total: (r && r.total != null) ? Number(r.total) : null,
            completed: (r && r.completed != null) ? Number(r.completed) : null
        }));

        // compute today index (last index with a date <= today)
        const todayStr = new Date().toISOString().slice(0, 10);
        let todayIdx = null;
        for (let i = 0; i < out.length; i++) {
            const d = out[i].date;
            if (!d) continue;
            if (d <= todayStr) todayIdx = i;
            else break;
        }
        if (todayIdx === null) todayIdx = Math.min(out.length - 1, 0);

        // forward-fill totals but do not default to 0 before the first known value
        let lastTotal = null;
        const effTotals = out.map((r) => {
            if (r.total !== null && Number.isFinite(r.total)) {
                lastTotal = r.total;
            }
            return lastTotal;
        });

        // find last known total value (used as fallback)
        let lastKnownTotal = null;
        for (let i = effTotals.length - 1; i >= 0; i--) {
            if (effTotals[i] != null) { lastKnownTotal = effTotals[i]; break; }
        }
        if (lastKnownTotal == null) lastKnownTotal = 0;

        // compute max Y from totals and completed up to todayIndex
        let maxVal = 0;
        for (let i = 0; i <= todayIdx; i++) {
            const t = effTotals[i] || 0;
            const c = out[i].completed || 0;
            maxVal = Math.max(maxVal, t, c);
        }
        if (maxVal === 0) maxVal = 1;

        return { data: out, todayIndex: todayIdx, maxY: maxVal };
    }, [rows]);

    const [ref, bounds] = useMeasure();
    const width = Math.max(300, Math.floor(bounds.width || 760));

    const innerWidth = Math.max(10, width - margin.left - margin.right);
    const innerHeight = Math.max(10, height - margin.top - margin.bottom);

    const x = (i) => margin.left + (innerWidth * (i / Math.max(1, data.length - 1)));
    const yEff = (v) => margin.top + innerHeight - (((v || 0) / maxY) * innerHeight);
    const yPercent = (v) => margin.top + innerHeight - (((v || 0) / 100) * innerHeight);
    
    // responsive presentation rules based on measured width
    const showXAxisTitle = width >= 320;
    const showYAxisTitle = width >= 240;

    // axis ticks: Y axis (numeric) and X axis (dates)
    // reduce y ticks to save vertical space on small widths
    const yTickCount = width >= 420 ? 4 : (width >= 360 ? 2 : 1);
    const yTicks = (() => {
        const n = yTickCount;
        const ticks = [];
        const maxVal = maxY;
        for (let i = 0; i <= n; i++) {
            const v = Math.round((maxVal * i) / n * 100) / 100;
            ticks.push(v);
        }
        return ticks.reverse();
    })();

    const fmtDate = (iso) => {
        if (!iso) return '';
        try {
            const d = new Date(iso);
            if (isNaN(d)) return iso;
            const day = String(d.getDate()).padStart(2, '0');
            const month = String(d.getMonth() + 1).padStart(2, '0');
            return `${day}/${month}`;
        } catch (e) { return iso; }
    };

    const xLabelIndices = (() => {
        if (!data || data.length === 0) return [];
        const len = data.length;
        if (width >= 420) {
            return [0, Math.round((len - 1) * 0.25), Math.round((len - 1) * 0.5), Math.round((len - 1) * 0.75), len - 1];
        }
        if (width >= 360) {
            return [0, Math.round((len - 1) * 0.5), len - 1];
        }
        // very narrow: only start and end (and today if different)
        const idxs = [0, len - 1];
        const todayIdx = typeof todayIndex === 'number' ? Math.min(todayIndex, len - 1) : null;
        if (todayIdx != null && !idxs.includes(todayIdx)) idxs.splice(1, 0, todayIdx);
        return idxs;
    })();

    // helpers: effort total (left axis) and percent completed (right axis)
    const getTotalValue = (d) => d && d.total != null ? d.total : null;
    const getPercentValue = (d) => {
        if (!d) return null;
        if (d.completed == null || d.total == null || Number(d.total) === 0) return null;
        return (Number(d.completed) / Number(d.total)) * 100;
    };


    return (
        <div ref={ref} style={{ width: '100%' }}>
            <svg width={width} height={height}>
                <rect x={0} y={0} width={width} height={height} fill="transparent" />
                {/* SVG defs for axis arrow markers */}
                <Group>
                    {/* Y axis ticks & labels */}
                    {yTicks.map((vt, i) => {
                        const yy = yEff(vt);
                        return (
                            <g key={`yt-${i}`}>
                                <line x1={margin.left - 6} x2={width - margin.right} y1={yy} y2={yy} stroke="rgba(0,0,0,0.04)" strokeWidth={1} />
                                <text x={margin.left - 8} y={yy + 4} fontSize={10} fill="#444" textAnchor="end">{vt}</text>
                            </g>
                        );
                    })}

                    {/* percent ticks on right axis */}
                    {[100, 75, 50, 25, 0].map((pt, i) => {
                        const yy = yPercent(pt);
                        return (
                            <g key={`pt-${i}`}>
                                <text x={width - margin.right + 8} y={yy + 4} fontSize={10} fill="#444" textAnchor="start">{pt}</text>
                            </g>
                        );
                    })}

                    {/* Y axis (vertical) - arrow at top pointing up */}
                    <line
                        x1={margin.left}
                        y1={height - margin.bottom}
                        x2={margin.left}
                        y2={margin.top}
                        stroke="#444"
                        strokeWidth={1}
                        strokeOpacity={0.6}
                    />
                    <line
                        x1={width - margin.right}
                        y1={height - margin.bottom}
                        x2={width - margin.right}
                        y2={margin.top}
                        stroke="#444"
                        strokeWidth={1}
                        strokeOpacity={0.6}
                    />
                    {/* X axis (horizontal) - arrow at right pointing right */}
                    <line
                        x1={margin.left}
                        y1={height - margin.bottom}
                        x2={width - margin.right}
                        y2={height - margin.bottom}
                        stroke="#444"
                        strokeWidth={1}
                        strokeOpacity={0.6}
                    />

                    {/* X axis labels */}
                    {xLabelIndices.map(idx => {
                        const dx = x(idx);
                        const label = data[idx] && data[idx].date ? fmtDate(data[idx].date) : '';
                        return (
                            <g key={`xl-${idx}`} transform={`translate(${dx}, ${height - margin.bottom + 14})`}>
                                <text x={0} y={0} fontSize={10} fill="#444" textAnchor="middle">{label}</text>
                            </g>
                        );
                    })}

                    {/* Today label on X axis (aligned with today vertical line) */}
                    {typeof todayIndex === 'number' && data[todayIndex] && (
                        <g key="today-label" transform={`translate(${x(todayIndex)}, ${height - margin.bottom + 14})`}>
                            <text x={0} y={0} fontSize={10} fill="#444" textAnchor="middle">Today</text>
                        </g>
                    )}

                    {/* Axis titles (responsive) */}
                    {showYAxisTitle && (
                        <text x={10} y={margin.top + innerHeight / 2 - margin.bottom} fontSize={11} fill="#444" textAnchor="end" transform={`rotate(-90 ${10} ${margin.top + innerHeight / 2 - margin.bottom})`}>Tasks</text>
                    )}
                    {showYAxisTitle && (
                        <text x={width - 11} y={margin.top + innerHeight / 2 - margin.bottom} fontSize={11} fill="#444" textAnchor="start" transform={`rotate(90 ${width - 11} ${margin.top + innerHeight / 2 - margin.bottom})`}>Percent (%)</text>
                    )}
                    {showXAxisTitle && (
                        <text x={margin.left + innerWidth / 2} y={height - 2} fontSize={11} fill="#444" textAnchor="middle">Timeline</text>
                    )}

                    {/* connecting line for total (effort) points - left axis */}
                    <path
                        d={(() => {
                            const pts = [];
                            for (let i = 0; i < data.length; i++) {
                                const v = getTotalValue(data[i]);
                                if (v == null) continue;
                                pts.push([x(i), yEff(v)]);
                            }
                            if (pts.length === 0) return '';
                            let dstr = `M ${pts[0][0]} ${pts[0][1]}`;
                            for (let i = 1; i < pts.length; i++) dstr += ` L ${pts[i][0]} ${pts[i][1]}`;
                            return dstr;
                        })()}
                        fill="none"
                        stroke={cfg.totalPoint}
                        strokeWidth={1.5}
                        strokeLinecap="round"
                    />

                    {/* percent connecting line - right axis */}
                    <path
                        d={(() => {
                            const pts = [];
                            for (let i = 0; i < data.length; i++) {
                                const v = getPercentValue(data[i]);
                                if (v == null) continue;
                                pts.push([x(i), yPercent(v)]);
                            }
                            if (pts.length === 0) return '';
                            let dstr = `M ${pts[0][0]} ${pts[0][1]}`;
                            for (let i = 1; i < pts.length; i++) dstr += ` L ${pts[i][0]} ${pts[i][1]}`;
                            return dstr;
                        })()}
                        fill="none"
                        stroke={cfg.completed}
                        strokeWidth={1.5}
                        strokeLinecap="round"
                    />



                    {/* percent target line (0 -> 100) on right axis */}
                    {data.length > 0 && (
                        <line x1={x(0)} y1={yPercent(0)} x2={x(Math.max(0, data.length - 1))} y2={yPercent(100)} stroke={cfg.targetLine} strokeWidth={1.5} strokeDasharray="4 4" strokeLinecap="round" />
                    )}

                    {/* today vertical line */}
                    {(() => {
                        const todayStr = new Date().toISOString().slice(0, 10);
                        let todayIndex = null;
                        for (let i = 0; i < data.length; i++) {
                            if (!data[i].date) continue;
                            if (data[i].date <= todayStr) todayIndex = i;
                            else break;
                        }
                        if (todayIndex == null) return null;
                        const tx = x(todayIndex);
                        return <line x1={tx} y1={margin.top} x2={tx} y2={height - margin.bottom} stroke={cfg.todayLine} strokeWidth={1} strokeDasharray="2 2" />;
                    })()}
                </Group>
            </svg>
        </div>
    );
}
