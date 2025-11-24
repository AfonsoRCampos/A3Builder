import React from "react";
import { Text } from '@visx/text';
import { scaleBand } from '@visx/scale';
import { Bar } from '@visx/shape';
import useMeasure from 'react-use-measure';
import { isoToDateString, getBars, formatCompact } from "@/utils/Utils";


const GapGraph = ({
    metricName = "",
    unit = "",
    initial,
    start,
    end,
    target,
    placeholder = { initial: "", target: "", up: null },
}) => {
    const [ref, bounds] = useMeasure();
    const width = (bounds.width || 300);
    const height = (bounds.height || 120);
    const margin = { top: height * 0.05, right: width * 0.025, bottom: height * 0.075, left: width * 0.05 };

    // Responsive font sizing based on available footprint.
    // baseFont scales with the smaller dimension so text fits well in narrow or short boxes.
    const baseFont = Math.max(10, Math.floor(Math.min(Math.max(1, width), Math.max(1, height)) * 0.07));
    const xLabelFont = Math.max(10, Math.floor(baseFont * 0.95));
    const foFont = Math.max(10, Math.floor(baseFont * 0.75));
    const yLabel = metricName ? `${metricName}${unit ? ` (${unit})` : ""}` : "";
    const format = (!start || !end) ? "DD/MM/YYYY" : (new Date(start).getFullYear() === new Date(end).getFullYear()) ? "DD/MM" : "DD/MM/YYYY";
    const textMargin = 3;
    const tickLen = 4;
    const barTextGap = 5;
    const xLabels = [
        (!start) ? "Initial" : isoToDateString(start, format),
        "Gap",
        (!end) ? "Target" : isoToDateString(end, format)
    ];
    const yLabels = [0, "Low", "Middle", "High", 100];

    const graphWidth = width - margin.left - margin.right;
    const graphHeight = height - margin.top - margin.bottom;

    const xScale = scaleBand({
        domain: xLabels,
        range: [textMargin, graphWidth],
        paddingInner: 0.6,
        paddingOuter: 0.2,
    });

    const yScale = scaleBand({
        domain: yLabels,
        range: [graphHeight, 0],
    });

    const initialLabel = (!initial) ? (!placeholder.initial ? "???" : placeholder.initial) : `${formatCompact(Number(initial))} ${unit}`;
    const targetLabel = (!target) ? (!placeholder.target ? "???" : placeholder.target) : `${formatCompact(Number(target.value))} ${unit}`;
    const gapLabel = (!metricName && !unit) ? (!placeholder.gap ? "???" : placeholder.gap) : '???';

    const bars = getBars(initial, target, initialLabel, targetLabel, gapLabel, placeholder, unit);

    return (
        <div ref={ref} style={{ width: "100%", height: "100%" }}>
            <svg
                width={width}
                height={height}
                style={{ display: "block" }}
                viewBox={`0 0 ${width} ${height}`}
            >
                <Text
                    x={margin.left / 2}
                    y={height / 2}
                    fontSize={xLabelFont}
                    fontWeight={"bold"}
                    verticalAnchor="middle"
                    textAnchor="middle"
                    angle={"-90"}
                >
                    {yLabel}
                </Text>
                {/* SVG defs (arrow marker) */}
                <defs>
                    <marker id="gap-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerUnits="strokeWidth" markerWidth="8" markerHeight="6" orient="auto">
                        <path d="M 0 0 L 10 5 L 0 10 z" fill="#0a0" />
                    </marker>
                </defs>

                {/* Bar Rendering */}
                {Object.entries(bars)
                    .filter(([k]) => k !== "gap" && k !== "line")
                    .map(([k, v], i) => {
                        const barX = margin.left + xScale(k === "initial" ? xLabels[0] : xLabels[2]);
                        const barY = yScale(v.y) + margin.top;
                        const barHeight = graphHeight - barY + barTextGap;
                        // label spans from top margin down to barY
                        const labelHeight = Math.max(0, barY);
                        const labelWidth = xScale.bandwidth() * 2;
                        return (
                            <g key={`bar-group-${k}`}>
                                {/* Label spanning from graph top (margin.top) down to bar start (barY) using foreignObject for wrapping */}
                                {labelHeight > 6 && (
                                    <foreignObject
                                        x={barX + xScale.bandwidth() / 2 - labelWidth / 2}
                                        y={0}
                                        width={labelWidth}
                                        height={labelHeight}
                                    >
                                        <div xmlns="http://www.w3.org/1999/xhtml" style={{
                                            width: '100%',
                                            height: '100%',
                                            fontSize: `${foFont}px`,
                                            color: '#333',
                                            display: 'flex',
                                            alignItems: 'flex-end',
                                            justifyContent: 'center',
                                            textAlign: 'center',
                                            overflow: 'visible',
                                            wordWrap: 'break-word',
                                            lineHeight: '1.1'
                                        }}>
                                            {v.label}
                                        </div>
                                    </foreignObject>
                                )}
                                <Bar
                                    x={barX}
                                    y={barY}
                                    width={xScale.bandwidth()}
                                    height={barHeight}
                                    fill={k === "initial" ? "#888" : "#0a0"}
                                />
                            </g>
                        );
                    })}
                {
                    bars.gap.type === "none" ?
                        (<>
                            <foreignObject
                                x={margin.left + xScale(xLabels[1]) - xScale.bandwidth() / 2}
                                y={0}
                                width={xScale.bandwidth() * 2}
                                height={graphHeight}
                            >
                                <div xmlns="http://www.w3.org/1999/xhtml" style={{
                                    width: '100%',
                                    height: '100%',
                                    fontSize: `${foFont}px`,
                                    color: '#333',
                                    display: 'flex',
                                    alignItems: 'flex-end',
                                    justifyContent: 'center',
                                    textAlign: 'center',
                                    overflow: 'visible',
                                    wordWrap: 'break-word',
                                    lineHeight: '1.1'
                                }}>
                                    {bars.gap.label}
                                </div>
                            </foreignObject>
                        </>) : (<>
                            <foreignObject
                                x={margin.left + xScale.bandwidth() / 2 + xScale.bandwidth() * 1.6}
                                y={0}
                                width={xScale.bandwidth() * 2.2 + 2*margin.left}
                                height={Math.min(yScale(bars.initial.y), yScale(bars.target.y)) + margin.top}
                            >
                                <div xmlns="http://www.w3.org/1999/xhtml" style={{
                                    width: '100%',
                                    height: '100%',
                                    fontSize: `${foFont}px`,
                                    color: '#333',
                                    display: 'flex',
                                    alignItems: 'flex-end',
                                    justifyContent: 'center',
                                    textAlign: 'center',
                                    overflow: 'visible',
                                    wordWrap: 'break-word',
                                    lineHeight: '1.1'
                                }}>
                                    {bars.gap.label}
                                </div>
                            </foreignObject>
                            <line
                                x1={xScale(xLabels[0]) + margin.left + xScale.bandwidth() * 1.6}
                                y1={yScale(bars.initial.y) + margin.top}
                                x2={xScale(xLabels[2]) + margin.left - xScale.bandwidth() * 0.6}
                                y2={yScale(bars.target.y) + margin.top}
                                stroke="#0a0"
                                strokeWidth={2}
                                strokeLinecap="round"
                                markerEnd="url(#gap-arrow)"
                            />
                            {/* optional horizontal line for sustain targets */}
                            {bars.line && (
                                <line
                                    x1={margin.left}
                                    x2={graphWidth + margin.left}
                                    y1={yScale(bars.line.y) + margin.top}
                                    y2={yScale(bars.line.y) + margin.top}
                                    stroke="red"
                                    strokeWidth={2}
                                    strokeLinecap="round"
                                />
                            )}
                        </>)
                }
                {/* X Axis */}
                <line
                    x1={margin.left * 0.5}
                    y1={height - margin.bottom - textMargin}
                    x2={width - margin.right}
                    y2={height - margin.bottom - textMargin}
                    stroke="#000"
                    strokeWidth={1}
                />
                {/* Y Axis */}
                <line
                    x1={margin.left + textMargin}
                    y1={height - margin.bottom * 0.5}
                    x2={margin.left + textMargin}
                    y2={margin.top}
                    stroke="#000"
                    strokeWidth={1}
                />
                {/* X Axis Labels */}
                {xLabels.map((label, i) => (
                    <g key={`x-label-group-${i}`}>
                        <Text
                            key={`x-label-${i}`}
                            x={margin.left + xScale(label) + xScale.bandwidth() / 2}
                            y={height - margin.bottom}
                            fontSize={xLabelFont}
                            fontWeight={"bold"}
                            verticalAnchor="start"
                            textAnchor="middle"
                        >
                            {label}
                        </Text>
                        <line
                            key={`x-tick-${i}`}
                            x1={margin.left + xScale(label) + xScale.bandwidth() / 2}
                            x2={margin.left + xScale(label) + xScale.bandwidth() / 2}
                            y1={height - margin.bottom - textMargin - tickLen}
                            y2={height - margin.bottom - textMargin}
                            stroke="#000"
                            strokeWidth={1}
                        />
                    </g>
                ))}
            </svg>
        </div>
    );
};

export default GapGraph;