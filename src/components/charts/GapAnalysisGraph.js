import React from 'react';
import useMeasure from 'react-use-measure';
import { scaleBand, scaleLinear } from '@visx/scale';
import { Bar } from '@visx/shape';
import { Text } from '@visx/text';
import { formatCompact } from '@/utils/Utils';

export default function GapAnalysisGraph({ metric = {}, minHeight = 120, minWidth = 120, unit = '' }) {
    const [ref, bounds] = useMeasure();
    const width = Math.max(minWidth, bounds.width || minWidth);
    const height = Math.max(minHeight, bounds.height || minHeight);

    // Responsive font sizing
    const baseFont = Math.max(10, Math.floor(Math.min(Math.max(1, width), Math.max(1, height)) * 0.07));
    const labelFont = Math.max(9, Math.floor(baseFont * 0.95));
    const smallFont = Math.max(8, Math.floor(baseFont * 0.8));

    // Extract values from metric (support multiple shapes)
    const initial = (typeof metric.initial !== 'undefined' && metric.initial != null) ? Number(metric.initial) : (Array.isArray(metric.data) && metric.data[0] ? Number(metric.data[0].value) : null);
    // Determine latest as the value from the highest (most recent) date that has a non-null value.
    let latest = null;
    if (Array.isArray(metric.data) && metric.data.length) {
        let best = null; // { dt, value }
        for (const entry of metric.data) {
            if (!entry) continue;
            const v = entry.value;
            if (v == null || Number.isNaN(Number(v))) continue;
            const dt = entry.date ? Date.parse(entry.date) : NaN;
            if (!Number.isFinite(dt)) continue; // skip entries without valid date
            if (!best || dt > best.dt) best = { dt, value: Number(v) };
        }
        latest = best ? best.value : null;
    }
    const target = (metric && metric.target && typeof metric.target.value !== 'undefined') ? Number(metric.target.value) : (typeof metric.target === 'number' ? Number(metric.target) : null);

    // Guard
    if (initial == null || latest == null || target == null || [initial, latest, target].some(v => Number.isNaN(v))) {
        return (
            <div ref={ref} style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
                No data to preview
            </div>
        );
    }

    // Compute the derived bars
    const up = initial < target;
    
    const debt = latest ? (up && latest > target) || (!up && latest < target) ? 0 : Math.abs(target - latest) : Math.abs(target - initial); // may be + or -
    const extra = latest ? (up && latest > target) || (!up && latest < target) ? Math.abs(target - latest) : 0 : 0;
    const completed = latest ? (up && latest <= initial) || (!up && latest >= initial) ? 0 : Math.abs(latest - initial) - extra : 0;

    // Bars: initial, (completed), (debt), target
    const items = [];
    items.push({ key: 'initial', label: 'As Is', value: initial, color: 'var(--gray, #888)' });
    items.push({ key: 'gap', label: 'Gap', value: completed + debt + extra });
    items.push({ key: 'target', label: 'To Be', value: target, color: 'var(--gray, #2196f3)' });

    const margin = { top: 18, right: 8, bottom: 36, left: 44 };
    const graphWidth = Math.max(10, width - margin.left - margin.right);
    const graphHeight = Math.max(10, height - margin.top - margin.bottom);

    const xScale = scaleBand({ domain: items.map((d) => d.key), range: [0, graphWidth], paddingInner: 0.3, paddingOuter: 0.1 });
    const maxVal = Math.max(Math.abs(initial), Math.abs(latest), Math.abs(target), up ? Math.abs(target + extra) : 1);
    const yScale = scaleLinear({ domain: [0, maxVal * 1.12], range: [graphHeight, 0] });

    const fmt = (v) => `${formatCompact(v)}${unit ? ` ${unit}` : ''}`;

    return (
        <div ref={ref} style={{ width: '100%', height: '100%' }}>
            <svg width={'100%'} height={'100%'} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
                {/* Y axis labels */}
                <line x1={margin.left} x2={margin.left} y1={margin.top} y2={margin.top + graphHeight} stroke="#444" strokeWidth={1} />
                {([0, 0.5, 1].map((t, idx) => {
                    const val = Math.round((maxVal * 1.12) * t * 100) / 100;
                    const yy = margin.top + yScale(val);
                    return (
                        <g key={`yt-${idx}`}>
                            <line x1={margin.left - 6} x2={width - margin.right} y1={yy} y2={yy} stroke="rgba(0,0,0,0.04)" strokeWidth={1} />
                            <Text key={`yl-${idx}`} x={margin.left - 8} y={yy + 4} fontSize={smallFont} fill="#444" textAnchor="end">{formatCompact(val)}</Text>
                        </g>
                    );
                }))}

                {/* simple X axis baseline (no labels or ticks) */}
                <line x1={margin.left} x2={margin.left + graphWidth} y1={margin.top + graphHeight} y2={margin.top + graphHeight} stroke="#444" strokeWidth={1} />

                {/* Bars: initial, stacked GAP, target */}
                {(() => {
                    const bw = xScale.bandwidth();
                    // initial (left)
                    const initX = margin.left + (xScale('initial') || 0);
                    const initBy = margin.top + yScale(Math.abs(items[0].value));
                    const initBh = graphHeight - yScale(Math.abs(items[0].value));

                    const initGroup = (
                        <g key={`bar-initial`}>
                            <Bar x={initX} y={initBy} width={bw} height={initBh} fill={items[0].color} />
                            <Text x={initX + bw / 2} y={Math.max(12, initBy - 6)} fontSize={labelFont} textAnchor='middle' fill="#111">{fmt(items[0].value)}</Text>
                            <Text x={initX + bw / 2} y={margin.top + graphHeight + 16} fontSize={baseFont} fontWeight='bold' textAnchor='middle'>{items[0].label}</Text>
                        </g>
                    );

                    // target (right)
                    const targX = margin.left + (xScale('target') || 0);
                    const targBy = margin.top + yScale(Math.abs(items[2].value));
                    const targBh = graphHeight - yScale(Math.abs(items[2].value));

                    const targGroup = (
                        <g key={`bar-target`}>
                            <Bar x={targX} y={targBy} width={bw} height={targBh} fill={items[2].color} />
                            <Text x={targX + bw / 2} y={Math.max(12, targBy - 6)} fontSize={labelFont} textAnchor='middle' fill="#111">{fmt(items[2].value)}</Text>
                            <Text x={targX + bw / 2} y={margin.top + graphHeight + 16} fontSize={baseFont} fontWeight='bold' textAnchor='middle'>{items[2].label}</Text>
                        </g>
                    );

                    // GAP (middle) - stacked segments
                    const gapX = margin.left + (xScale('gap') || 0);
                    const segments = [];
                    // define segment values
                    const segCompleted = completed;
                    const segDebt = debt;
                    const segExtra = extra;
                    // order depends on direction
                    if (up) {
                        // bottom: debt, then completed, then extra (top)
                        if (segCompleted > 0) segments.push({ key: 'completed', value: segCompleted, color: 'var(--green, #39b54a)', label: 'Completed' });
                        if (segDebt > 0) segments.push({ key: 'debt', value: segDebt, color: 'var(--cancel, #e74c3c)', label: 'Remaining' });
                        if (segExtra > 0) segments.push({ key: 'extra', value: segExtra, color: 'var(--green-dark, #f39c12)', label: 'Extra' });
                    } else {
                        // DOWN: bottom: extra, completed, debt (top)
                        if (segExtra > 0) segments.push({ key: 'extra', value: segExtra, color: 'var(--green-dark, #f39c12)', label: 'Extra' });
                        if (segDebt > 0) segments.push({ key: 'debt', value: segDebt, color: 'var(--cancel, #e74c3c)', label: 'Remaining' });
                        if (segCompleted > 0) segments.push({ key: 'completed', value: segCompleted, color: 'var(--green, #39b54a)', label: 'Completed' });
                    }

                    // compute gap bottom value depending on direction
                    let gapBottomValue = 0;
                    if (up) {
                        gapBottomValue = Math.min(initial, latest); // bottom anchored at initial
                    } else {
                        // when going down, bottom is the lower between target and latest (target - extra)
                        gapBottomValue = target - extra;
                    }

                    // stack segments from gapBottomValue upward
                    let cumulative = 0; // sum of previously rendered segment values
                    const gapGroup = (
                        <g key={`bar-gap`}>
                            {segments.map((s) => {
                                if (!s || !s.value) return null;
                                const segBottomValue = gapBottomValue + cumulative;
                                const segTopValue = gapBottomValue + cumulative + s.value;
                                const top = margin.top + yScale(segTopValue);
                                const bottom = margin.top + yScale(segBottomValue);
                                const heightSeg = bottom - top;
                                const yLabelPos = top + heightSeg / 2;
                                const segX = gapX;
                                cumulative += s.value;
                                return (
                                    <g key={`seg-${s.key}`}>
                                        <Bar x={segX} y={top} width={bw} height={heightSeg} fill={s.color} />
                                        {heightSeg > 14 && (
                                            <Text x={segX + bw / 2} y={yLabelPos} fontSize={smallFont} textAnchor='middle' fill="#fff">{formatCompact(s.value)}</Text>
                                        )}
                                    </g>
                                );
                            })}
                            {/* total gap label above stack */}
                            <Text x={gapX + bw / 2} y={margin.top + yScale(gapBottomValue + cumulative) - 6} fontSize={labelFont} textAnchor='middle' fill="#111">{fmt(cumulative)}</Text>
                            <Text x={gapX + bw / 2} y={margin.top + graphHeight + 16} fontSize={baseFont} fontWeight='bold' textAnchor='middle'>{items[1].label}</Text>
                        </g>
                    );

                    return [initGroup, gapGroup, targGroup];
                })()}

            </svg>
        </div>
    );
}
