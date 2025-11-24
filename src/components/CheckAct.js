import React from 'react';
import { AutoTextSize } from 'auto-text-size';
import { formatCommentTimestamp } from '@/utils/Utils';
import SimpleBarGraph from './charts/SimpleBarGraph';

export default function CheckAct({ metrics = {}, twoPct, a3 }) {
    const cellStyle = {
        outlineOffset: "-1px",
        outline: "1px solid #000",
        overflow: "hidden",
        boxSizing: "border-box",
    };


    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            flex: '1 1 0',
            height: '100%',
            maxHeight: '100%',
            width: '100%',
            boxSizing: 'border-box',
            overflow: 'hidden'
        }}>
            <div style={{ fontWeight: "bold", paddingLeft: '2px', width: '60%', flex: `0 0 ${twoPct}px`, ...cellStyle, backgroundColor: 'var(--orange-highlight)' }}>
                <AutoTextSize mode='boxoneline' style={{ height: '100%' }}>
                    Objective Monitoring
                </AutoTextSize>
            </div>

            <div style={{ boxSizing: 'border-box', flex: '1 1 0', height: `100%`, overflow: 'hidden' }}>
                <div style={{
                    display: 'grid',
                    padding: 1,
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 6,
                    alignItems: 'stretch',
                    height: `100%`,
                    alignContent: 'start',
                    boxSizing: 'border-box',
                    overflow: 'hidden',
                    gridAutoRows: 'minmax(120px, 1fr)'
                }}>
                    {(() => {
                        // Ensure lag is always first, then leads in order
                        const list = [];
                        if (metrics?.lag) list.push({ id: 'lag', metric: metrics.lag });
                        if (Array.isArray(metrics?.leads)) {
                            metrics.leads.filter(ld => ld.display.enabled).forEach((ld, idx) => list.push({ id: `lead-${idx}`, metric: ld }));
                        }
                        return list.map((entry, i) => {
                            const m = entry.metric || {};
                            return (
                                <div key={entry.id} style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    height: '100%',
                                    boxSizing: 'border-box',
                                    overflow: 'hidden'
                                }}>
                                    <p style={{ height: '10%', fontWeight: 'bold', fontSize: '0.70em', textAlign: 'center', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.metricName}{m.unit ? ` (${m.unit})` : ''}</p>
                                    <div style={{ flex: '1 1 0', minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                                        <div style={{ flex: '1 1 0', minHeight: 0, overflow: 'hidden' }}>
                                            <SimpleBarGraph metric={m} minHeight={100} minWidth={100} showGrid={m.display.showGrid} showZones={m.display.showOverlay} />
                                        </div>
                                    </div>
                                </div>
                            );
                        });
                    })()}
                </div>
            </div>

            {a3.layout.extraCheckAct.enabled &&
            <div style={{ fontWeight: 'bold', width: '100%', height: `20%`, position: 'relative', borderTop: '1px solid rgba(0,0,0,1)' }}>
                    {Array.isArray(a3.layout.extraCheckAct.text) && (
                        <AutoTextSize mode='box' maxstyle={{ height: '100%', background: 'white', padding: 6 }}>
                            {a3.layout.extraCheckAct.text.map((entry, idx) => {
                                let text = '';
                                if (entry && typeof entry === 'object' && 'text' in entry) {
                                    const label = entry.authorDisplay ? `${entry.authorDisplay}${entry.date ? ` (${formatCommentTimestamp(entry.date)})` : ''}` : null;
                                    text = label ? `${label}: ${entry.text}` : entry.text;
                                } else {
                                    text = String(entry ?? '');
                                }
                                return <div key={`checkact-extra-${idx}`} style={{ fontSize: 13, color: '#222', marginBottom: 4 }}>{text}</div>;
                            })}
                        </AutoTextSize>
                    )}
            </div>}
        </div>
    );
}
