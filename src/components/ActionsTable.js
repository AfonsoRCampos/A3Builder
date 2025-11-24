"use client";
import React from 'react';
import { toInitialLast } from '@/utils/Utils';
import { isoToDateString } from '@/utils/Utils';
import { Tooltip } from 'react-tooltip';
import 'react-tooltip/dist/react-tooltip.css'

export default function ActionsTable({ actions = [], team = [], weighted = false }) {
    const ROW_HEIGHT = '48px';
    const columns = weighted
        ? [
            { key: 'id', label: 'ID', width: '4%' },
            { key: 'desc', label: 'Description', width: '42%' },
            { key: 'owner', label: 'Owner', width: '15%' },
            { key: 'progress', label: 'Progress', width: '14%' },
            { key: 'limit', label: 'Limit', width: '15%' },
            { key: 'weight', label: 'Weight', width: '10%' },
        ]
        : [
            { key: 'id', label: 'ID', width: '4%' },
            { key: 'desc', label: 'Description', width: '47%' },
            { key: 'owner', label: 'Owner', width: '20%' },
            { key: 'progress', label: 'Progress', width: '14%' },
            { key: 'limit', label: 'Limit', width: '15%' },
        ];

    // compute normalized font size from ROW_HEIGHT (increase baseline)
    const _rowH = typeof ROW_HEIGHT === 'string' ? parseInt(ROW_HEIGHT, 10) || 48 : ROW_HEIGHT;
    const _fontPx = Math.max(13, Math.min(16, Math.floor(_rowH * 0.42)));
    const tableStyle = { tableLayout: 'fixed', width: '100%', fontSize: `${_fontPx}px` };

    return (
        <div className="actions-table-container">
            <Tooltip id="lateFlags" style={{ color: 'white', background: '#000', zIndex: 99999 }} />
            <table className="actions-table" style={tableStyle}>
                <thead>
                    <tr>
                        {columns.map(col => (
                            <th key={col.key} style={{ width: col.width }}>{col.label}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {actions.length === 0 ? (
                        <tr style={{ height: ROW_HEIGHT }}>
                            <td colSpan={columns.length} style={{ textAlign: 'center', opacity: 0.6 }}>No actions</td>
                        </tr>
                    ) : actions.map(action => {
                        const owner = team.find(t => t === action.owner) || action.owner;
                        const ownerLabel = owner ? (typeof owner === 'string' ? toInitialLast(owner) : (owner.name || owner.fullName || String(owner))) : '—';
                        const progressRaw = typeof action.progress === 'number' ? action.progress : 0;
                        const progress = progressRaw <= 1 ? Math.round(progressRaw * 100) : Math.round(progressRaw);
                        const description = action.description || 'TBD';
                        const weightRaw = action.weight || '';
                        let weightLabel = '';
                        if (weightRaw) {
                            const w = String(weightRaw).toLowerCase();
                            if (w === 'medium') weightLabel = 'Med.';
                            else weightLabel = w.charAt(0).toUpperCase() + w.slice(1);
                        }

                        return (
                            <tr key={action.id} style={{ height: ROW_HEIGHT }}>
                                <td className="id-cell" style={{ display: 'table-cell', verticalAlign: 'middle', padding: '0 0.3em', overflow: 'hidden' }}>
                                    <div className="forceCenter" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, boxSizing: 'border-box' }}>
                                        <span className="id-text" style={{ display: 'inline-block', lineHeight: 1, margin: 0, padding: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{action.id}</span>
                                    </div>
                                </td>
                                <td className="desc-cell" style={{ display: 'table-cell', verticalAlign: 'middle', padding: '0 0.3em' }}>
                                    <div className="forceCenter" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, boxSizing: 'border-box' }}>
                                        <div style={{ display: 'block', width: '100%', whiteSpace: 'normal', overflowWrap: 'break-word', textAlign: 'center' }}>
                                            <div className="desc-content" style={{ display: 'block', lineHeight: 1.1, margin: 0, padding: 0, whiteSpace: 'normal', textAlign: 'center' }}>{description}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="owner-cell" style={{ display: 'table-cell', verticalAlign: 'middle', padding: '0 0.3em', overflow: 'hidden' }}>
                                    <div className="forceCenter" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, boxSizing: 'border-box' }}>
                                        <span style={{ display: 'inline-block', lineHeight: 1, margin: 0, padding: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ownerLabel}</span>
                                    </div>
                                </td>
                                <td className="progress-cell" style={{ display: 'table-cell', verticalAlign: 'middle', padding: '0 1em', overflow: 'hidden' }}>
                                    <div className="forceCenter" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, boxSizing: 'border-box' }}>
                                        <span style={{ display: 'inline-block', lineHeight: 1, margin: 0, padding: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{progress}%</span>
                                    </div>
                                </td>
                                <td className="limit-cell" style={{ display: 'table-cell', verticalAlign: 'middle', padding: '0 1em', overflow: 'hidden', position: 'relative' }}>
                                    <div className="forceCenter" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, boxSizing: 'border-box' }}>
                                        <span style={{ display: 'inline-block', lineHeight: 1, margin: 0, padding: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'center' }}>{action.limit ? isoToDateString(action.limit, "DD/MM/YY") : '—'}</span>
                                    </div>
                                    {(action.lateFlags || []).length > 0 && (
                                        <span
                                            className="late-dots forceCenter"
                                            style={{
                                                position: 'absolute',
                                                left: '50%',
                                                transform: 'translateX(-50%)',
                                                top: '5%',
                                                display: 'inline-flex',
                                                gap: 6,
                                                alignItems: 'center'
                                            }}
                                        >
                                            {(action.lateFlags || []).slice(0, 3).map((f, i) => (
                                                <span key={i} className="late-dot" data-tooltip-id="lateFlags" data-tooltip-content={`Late on ${isoToDateString(f, "DD/MM/YY")}`} data-tooltip-place="top" />
                                            ))}
                                        </span>
                                    )}
                                </td>
                                {weighted && (
                                    <td className="weight-cell" style={{ display: 'table-cell', verticalAlign: 'middle', padding: '0 1em' }}>
                                        <div className="forceCenter" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, boxSizing: 'border-box' }}>
                                            <span style={{ display: 'inline-block', lineHeight: 1, margin: 0, padding: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{weightLabel}</span>
                                        </div>
                                    </td>
                                )}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
