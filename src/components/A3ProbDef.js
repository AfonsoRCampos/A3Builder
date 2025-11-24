'use client';

import React, { useEffect, useState } from 'react';
import { AutoTextSize } from 'auto-text-size'
import GapGraph from './charts/GapGraph';

const A3ProbDef = ({ probDef, lag, start, end, twoPct }) => {
    const cellStyle = {
        height: "100%",
        width: "100%",
        overflow: "hidden"
    };

    const [sanitizedExtra, setSanitizedExtra] = useState('');

    useEffect(() => {
        let mounted = true;
        const sanitize = async () => {
            try {
                if (!probDef?.extra) {
                    if (mounted) setSanitizedExtra('');
                    return;
                }
                const createDOMPurify = (await import('dompurify')).default;
                const DOMPurify = createDOMPurify(window);
                const clean = DOMPurify.sanitize(probDef.extra);
                if (mounted) setSanitizedExtra(clean);
            } catch (e) {
                if (mounted) setSanitizedExtra(probDef.extra || '');
            }
        };
        sanitize();
        return () => { mounted = false; };
    }, [probDef?.extra]);

    return (
        <div
            style={{
                display: "grid",
                gridTemplateColumns: "60% 40%",
                gridTemplateRows: `${twoPct}px 1fr`,
                width: "100%",
                height: "100%",
                maxHeight: "100%",
                overflow: "hidden",
                boxSizing: "border-box"
            }}
        >
            <div style={{ gridColumn: "1", gridRow: "1", fontWeight: "bold", ...cellStyle, paddingLeft: '2px', backgroundColor: 'var(--accent-highlight)', height: `${twoPct}px`, borderBottom: '1px solid rgba(0,0,0,1)', borderLeft: '1px solid rgba(0,0,0,1)' }}>
                <AutoTextSize mode='boxoneline' style={{ height: '100%' }}>
                    Problem Definition
                </AutoTextSize>
            </div>
            <div style={{ gridColumn: "1", gridRow: "2", ...cellStyle, paddingLeft: '2px', height: '100%' }}>
                <AutoTextSize mode='box' style={{ height: '100%' }}>
                    <b>What?</b>
                    {lag.metricName && lag.unit ? 
                        ` ${lag.metricName} (measured in ${lag.unit})` 
                        : <i>(click to edit)</i>

                    }<br />
                    <b>Why?</b> {probDef.why || <i>(click to edit)</i>}
                    {probDef.where && (
                        <>
                            <br /><b>Where?</b> {probDef.where}
                        </>
                    )}
                    {sanitizedExtra && (
                        <>
                            <div dangerouslySetInnerHTML={{ __html: sanitizedExtra }} />
                        </>
                    )}
                </AutoTextSize>
            </div>
            <div style={{ gridColumn: "2", gridRow: "1 / span 3", ...cellStyle, padding: 0, borderLeft: '1px solid rgba(0,0,0,1)' }}>
                <GapGraph metricName={lag.metricName} unit={lag.unit} initial={lag.initial} placeholder={lag.placeholder} start={start} target={lag.target} end={end} />
            </div>
        </div>
    );
};

export default A3ProbDef;