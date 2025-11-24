import React from 'react';
import useMeasure from 'react-use-measure';
import { scaleBand, scaleLinear } from '@visx/scale';
import { Bar } from '@visx/shape';
import { Text } from '@visx/text';
import { computeBarColors } from '@/utils/chartUtils';
import { isoToDateString, formatCompact } from '@/utils/Utils';

const SimpleBarGraph = ({ metric = {}, showZones = true, showGrid = false, targetLine = false, bgColor = 'transparent', minWidth = 100, minHeight = 100 }) => {
    const [ref, bounds] = useMeasure();
    const target = metric?.target || {};
    const data = Array.isArray(metric?.data) ? metric.data : [];

    const margin = { top: 5, right: 5, bottom: 35, left: 25 };
    const width = Math.max(minWidth, bounds.width || margin.left + margin.right + minWidth);
    const height = Math.max(minHeight, bounds.height || margin.top + margin.bottom + minHeight);
    const graphWidth = Math.max(0, width - margin.left - margin.right);
    const graphHeight = Math.max(0, height - margin.top - margin.bottom);

    // Responsive font sizing
    const baseFont = Math.max(Math.floor(Math.min(Math.max(1, width), Math.max(1, height)) * 0.06));
    const axisFont = Math.max(Math.floor(baseFont * 0.85));
    const tickFont = Math.max(Math.floor(baseFont * 0.85));

    // normalize values
    const values = data.map(d => (d && typeof d.value !== 'undefined' && d.value !== null) ? Number(d.value) : null);
    const numeric = values.map(v => (v !== null ? Number(v) : null)).filter(v => v !== null);
    const initialVal = (!!data[0]?.value) ? Number(data[0]?.value) : null;
    const targetValue = Number(target.value);
    if (numeric.length === 0 || typeof targetValue !== 'number' || Number.isNaN(targetValue)) {
        return (
            <div ref={ref} style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', textAlign: 'center', background: bgColor }}>
                No data to preview
            </div>
        );
    }

    let maxVal = Math.max(...numeric, targetValue ?? -Infinity);
    let minVal = Math.min(...numeric, targetValue ?? Infinity);
    const domainRange = maxVal - minVal;
    maxVal += domainRange * 0.1;
    minVal -= domainRange * 0.1;
    const negativeValues = maxVal * minVal < 0;

    // xScale can be computed regardless of numeric y-domain; used for band/grid positions
    const xScale = scaleBand({ domain: data.map((d, i) => String(i)), range: [0, graphWidth], paddingInner: 0.1, paddingOuter: 0 });
    const yScale = scaleLinear({ domain: [minVal, maxVal], range: [graphHeight, 0] });

    // compute per-bar target values for shading and pass to color helper
    // compute start/end timestamps for interpolation
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

    const getTargetAt = (i) => {
        const targetMode = (target && target.mode) || 'constant';
        const endVal = typeof target?.value !== 'undefined' ? Number(target.value) : null;
        if (targetMode === 'linear' && initialVal !== null && endVal !== null && startTs !== null) {
            const dt = data[i]?.date ? Date.parse(data[i].date) : null;
            if (!Number.isFinite(dt)) return endVal;
            const t = Math.max(0, Math.min(1, (dt - startTs) / (endTs - startTs)));
            return initialVal + t * (endVal - initialVal);
        }
        return endVal;
    };

    const targetsAt = data.map((_, i) => getTargetAt(i));
    const { colors } = computeBarColors(data, target, {});

    return (
        <div ref={ref} style={{ width: '100%', height: '100%', background: bgColor }}>
            <svg width={'100%'} height={'100%'} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
                <Text x={2} y={(height - margin.bottom) / 2} fontSize={`${baseFont}px`} fontWeight={'bold'} verticalAnchor='start' textAnchor='middle' angle='-90'>
                    {`${metric.metricName} (${metric.unit || ''})`}
                </Text>

                {/* Optional faint vertical grid lines at band edges (behind everything) */}
                {showGrid && (() => {
                    const lines = [];
                    for (let i = 0; i < data.length; i++) {
                        const left = margin.left + (xScale(String(i)) ?? 0);
                        const halfInnerPad = (typeof xScale.step === 'function' && typeof xScale.paddingInner === 'function') ? (xScale.step() * xScale.paddingInner() / 2) : 0;
                        const right = left + (xScale.bandwidth() || 0) + halfInnerPad;
                        lines.push(right);
                    }
                    return lines.map((xpos, idx) => (
                        <line
                            key={`grid-${idx}`}
                            x1={xpos}
                            x2={xpos}
                            y1={margin.top}
                            y2={margin.top + graphHeight}
                            stroke="rgba(0, 0, 0, 0.1)"
                            strokeWidth={1}
                            // strokeDasharray="2 2"
                        />
                    ));
                })()}

                {/* Optional shaded zones between consecutive checkpoints (drawn under bars) */}
                {showZones && (() => {
                    const endVal = typeof target?.value !== 'undefined' ? Number(target.value) : null;
                    const intentUp = (initialVal !== null && endVal !== null) ? (endVal > initialVal) : (endVal !== null ? endVal > 0 : true);

                    // build path along target points
                    const points = targetsAt.map((tv, i) => {
                        const x = margin.left + (xScale(String(i)) ?? 0) + xScale.bandwidth() / 2;
                        const y = margin.top + (yScale(typeof tv === 'number' ? tv : endVal) ?? 0);
                        return { x, y };
                    }).filter(p => Number.isFinite(p.x) && Number.isFinite(p.y));

                    if (points.length < 2) return null;

                    // build SVG paths for both good and inverse (bad) zones
                    const leftX = points[0].x;
                    const rightX = points[points.length - 1].x;
                    const topY = margin.top;
                    const bottomY = margin.top + graphHeight;

                    // helper to join points into 'L x y' segments
                    const pointsToPath = (pts) => pts.map(p => ` L ${p.x} ${p.y}`).join('');

                    if (intentUp) {
                        // bad zone: area below the target line down to bottom
                        let dBad = `M ${leftX} ${points[0].y}`;
                        dBad += pointsToPath(points);
                        dBad += ` L ${rightX} ${bottomY} L ${leftX} ${bottomY} Z`;

                        // good zone: area from top down to the target line
                        let dGood = `M ${leftX} ${topY}`;
                        dGood += pointsToPath(points);
                        dGood += ` L ${rightX} ${topY} Z`;

                        return (
                            <g>
                                <path key={`zone-bad`} d={dBad} fill={'var(--chart-bad, #e74c3c)'} opacity={0.08} />
                                <path key={`zone-good`} d={dGood} fill={'var(--chart-good, #2ecc71)'} opacity={0.12} />
                            </g>
                        );
                    } else {
                        // intent down: good zone is area from bottom up to the target line
                        let dGood = `M ${leftX} ${bottomY}`;
                        dGood += pointsToPath(points);
                        dGood += ` L ${rightX} ${bottomY} Z`;

                        // bad zone: area above the target line up to top
                        let dBad = `M ${leftX} ${points[0].y}`;
                        dBad += pointsToPath(points);
                        dBad += ` L ${rightX} ${topY} L ${leftX} ${topY} Z`;

                        return (
                            <g>
                                <path key={`zone-bad`} d={dBad} fill={'var(--chart-bad, #e74c3c)'} opacity={0.08} />
                                <path key={`zone-good`} d={dGood} fill={'var(--chart-good, #2ecc71)'} opacity={0.12} />
                            </g>
                        );
                    }
                })()}

                {/* target line following per-point targets */}
                {showZones && (() => {
                    const linePoints = targetsAt.map((tv, i) => {
                        const x = margin.left + (xScale(String(i)) ?? 0) + xScale.bandwidth() / 2;
                        const y = margin.top + (yScale(typeof tv === 'number' ? tv : targetValue) ?? 0);
                        return { x, y };
                    }).filter(p => Number.isFinite(p.x) && Number.isFinite(p.y));

                    if (linePoints.length < 2) return null;

                    let d = `M ${linePoints[0].x} ${linePoints[0].y}`;
                    linePoints.slice(1).forEach(p => { d += ` L ${p.x} ${p.y}`; });

                    return (
                        <path d={d} fill="none" stroke={'var(--chart-target, #f3ca12ff)'} strokeDasharray={'2 2'} strokeWidth={1} strokeLinecap="round" strokeLinejoin="round" />
                    );
                })()}

                {/* Bars */}
                {data.map((d, i) => {
                    const v = d?.value;
                    if (v === null || typeof v === 'undefined') return null;
                    const x = margin.left + (xScale(String(i)) ?? 0);
                    const barW = xScale.bandwidth();
                    const y = margin.top + (yScale(Number(v)));
                    const h = graphHeight - yScale(Number(v));
                    const fill = colors[i] || 'rgba(0,0,0,0.12)';
                    return (
                        <g key={`bar-${i}`}>
                            <Bar x={x} y={y} width={barW} height={h} fill={fill} />
                        </g>
                    );
                })}

                {/* Optional horizontal target line across the chart */}
                {targetLine && Number.isFinite(targetValue) && (
                    <line
                        x1={margin.left}
                        x2={margin.left + graphWidth}
                        y1={margin.top + yScale(targetValue)}
                        y2={margin.top + yScale(targetValue)}
                        stroke={'var(--gray-dark)'}
                        strokeWidth={1}
                        strokeDasharray={'4 4'}
                        pointerEvents={'none'}
                    />
                )}
                {/* label at the right end of the target line */}
                {targetLine && Number.isFinite(targetValue) && (
                    <Text
                        x={margin.left + graphWidth - 6}
                        y={margin.top + yScale(targetValue) - 6}
                        fontSize={tickFont}
                        textAnchor='end'
                        verticalAnchor='end'
                        fill={'var(--gray-dark)'}
                    >
                        Target
                    </Text>
                )}


                {/* Y axis */}
                <line x1={margin.left} x2={margin.left} y1={margin.top} y2={margin.top + graphHeight} stroke="#444" strokeWidth={1} />
                {(() => {
                    const ticks = (() => {
                        const out = [minVal, maxVal];
                        if (!out.includes(targetValue)) out.push(targetValue);
                        if (initialVal && !out.includes(initialVal)) out.push(initialVal);
                        if (negativeValues && !out.includes(0)) out.push(0);
                        return Array.from(new Set(out)).sort((a, b) => a - b);
                    })();
                    return (
                        <g>
                            {ticks.map((tv, ti) => {
                                const y = margin.top + yScale(tv);
                                return (
                                    <g key={`yt-${ti}`}>
                                        <line x1={margin.left - 4} x2={margin.left} y1={y} y2={y} stroke="#444" strokeWidth={1} />
                                        <Text x={margin.left - 6} y={y} fontSize={tickFont} textAnchor='end' verticalAnchor='middle' transform={`rotate(-45 ${margin.left - 6} ${y})`}>{formatCompact(tv)}</Text>
                                    </g>
                                );
                            })}
                        </g>
                    );
                })()}

                {/* X axis labels (auto-thinned + rotate fallback) */}
                {(() => {
                    const minLabelPx = 30; // approximate width per label
                    const maxLabels = Math.max(2, Math.floor(graphWidth / minLabelPx));
                    const total = data.length;

                    let tickIndexes = [];
                    if (total <= maxLabels) {
                        tickIndexes = data.map((_, i) => i);
                    } else {
                        // include first and last, then sample evenly
                        const slots = Math.max(2, maxLabels);
                        const step = Math.ceil((total) / (slots));
                        tickIndexes = [0];
                        for (let i = 0; i < total - 1; i += step) {
                            if (i === 0) continue;
                            tickIndexes.push(i);
                        }
                        if (tickIndexes[tickIndexes.length - 1] !== total - 1) tickIndexes.push(total - 1);
                    }

                    const yBase = margin.top + graphHeight;
                    return tickIndexes.map(i => {
                        const xCenter = margin.left + (xScale(String(i)) ?? 0) + xScale.bandwidth() / 2;

                        const label = isoToDateString(data[i]?.date, 'DD/MM');
                        const y = height - margin.bottom + 6;
                        // small tick for each chosen x position
                        return (
                            <React.Fragment key={`xfrag-${i}`}>
                                <line key={`xt-${i}`} x1={xCenter} x2={xCenter} y1={yBase} y2={yBase + 4} stroke="#444" strokeWidth={1} />
                                <Text key={`xl-${i}`} x={xCenter} y={y + 5} fontSize={axisFont} textAnchor='middle'> 
                                    {label}
                                </Text>
                            </React.Fragment>
                        );
                    });
                })()}
                {/* X axis baseline */}
                <line x1={margin.left} x2={margin.left + graphWidth} y1={margin.top + graphHeight} y2={margin.top + graphHeight} stroke="#444" strokeWidth={1} />
            </svg>
        </div>
    );
};

export default SimpleBarGraph;
