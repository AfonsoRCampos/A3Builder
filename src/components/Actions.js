import React from 'react';
import ActionsTable from './ActionsTable';
import ActionsProgressBar from './ActionsProgressBar';
import { AutoTextSize } from 'auto-text-size'
import './Actions.css';

export default function Actions({ a3, twoPct }) {
    const actions = a3?.actions || [];
    const team = a3?.header?.team || [];
    const weighted = a3?.actionsSettings?.weighted || false;

    const cellStyle = {
        outline: "1px solid #000",
        overflow: "hidden",
        boxSizing: "border-box",
    };

    return (
        <div className="actions-section">
            <div style={{ fontWeight: 'bold', width: '60%', height: `${twoPct}px`, ...cellStyle, paddingLeft: '2px', zIndex: 2, position: 'relative', backgroundColor: 'var(--green-highlight)', top: 0, left: 0, outlineOffset: '-1px' }}>
                <AutoTextSize mode='boxoneline' style={{ height: '100%' }}>
                    Action Plan
                </AutoTextSize>
            </div>

            <div className="actions-table-wrap">
                <ActionsTable actions={actions} team={team} weighted={weighted} />
            </div>

            <div className="actions-progress-wrap">
                <ActionsProgressBar actions={actions} weighted={weighted} />
            </div>
        </div>
    );
}
