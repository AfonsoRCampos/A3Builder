import React from 'react';
import { AutoTextSize } from 'auto-text-size'
import { formatCompact } from '@/utils/Utils';

const cellStyle = {
    outlineOffset: "-1px",
    outline: "1px solid #000",
    overflow: "hidden",
    boxSizing: "border-box",
};

// Small helper to format a single metric's target as readable text
function formatTargetText(metric) {
    if (!metric) return '';
    const target = metric.target || {};
    const unit = metric.unit ? ` ${metric.unit}` : '';

    if (!target) {
        return metric.placeholder?.target || 'No target defined';
    }
    else return `Change ${metric.metricName || '(unspecified)'} from ${formatCompact(metric.initial)} to ${formatCompact(target.value)} ${unit}. (${target.percent >= 0 ? '+' : ''}${formatCompact(target.percent)}%)`; // Temporary generic text while editing target structure
}

export default function MetricsTextBox({ metrics, twoPct }) {
    const lag = metrics?.lag || null;
    const leads = Array.isArray(metrics?.leads) ? metrics.leads : [];

    const lines = [];

    // Main objective line (if lag exists)
    if (lag) {
        const targetText = formatTargetText(lag);
        lines.push(`Main Objective: ${targetText}`);
    }

    // Leads
    if (leads.length > 0) {
        // Add header only if there are leads and we have room
        if (lines.length < 7) {
            lines.push("To achieve this, we must:");
        }

        for (let i = 0; i < leads.length && lines.length < 7; i++) {
            const m = leads[i];
            const text = formatTargetText(m);
            lines.push(`• ${text}`);
        }
    }

    // If nothing at all, show a small placeholder
    if (lines.length === 0) {
        lines.push('No metrics defined');
    }

    const hasMain = Boolean(lag);

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            width: '100%',
            boxSizing: 'border-box'
        }}>
            <div style={{ fontWeight: "bold", paddingLeft: '2px', width: '60%', height: `${twoPct}px`, ...cellStyle, flex: '0 0 auto', backgroundColor: 'var(--accent-highlight)' }}>
                <AutoTextSize mode='boxoneline' style={{ height: '100%' }}>
                    Objectives (Lag and Leads)
                </AutoTextSize>
            </div>


            <div style={{ flex: '1 1 0', minHeight: 0, width: '100%', boxSizing: 'border-box', padding: 2 }}>
                <AutoTextSize
                    mode='box'
                    style={{
                        height: '100%',
                        width: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        lineHeight: 1,
                    }}
                >
                    {lines.map((l, idx) => (
                        <p
                            key={idx}
                            style={
                                idx === 0 && hasMain
                                    ? { fontWeight: 'bold', whiteSpace: 'normal', wordBreak: 'break-word', margin: 0 }
                                    : idx === 1
                                    ? { whiteSpace: 'normal', wordBreak: 'break-word', margin: 0 }
                                    : { marginLeft: '5%', whiteSpace: 'normal', wordBreak: 'break-word', marginLeft: '5%' }
                            }
                        >
                            {l}
                        </p>
                    ))}
                </AutoTextSize>
            </div>
        </div>
    );
}
