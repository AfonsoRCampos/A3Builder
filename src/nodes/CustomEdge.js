import React from 'react';
import { getBezierPath, getStraightPath, getSmoothStepPath } from '@xyflow/react';
// note: we'll draw the path ourselves so we can attach markerStart/markerEnd
import { TiArrowLeftThick, TiArrowRightThick } from "react-icons/ti";


// arrowSource: false, arrowTarget: false,
// data: {
//     label: '',
//     pathType: 'smoothstep',
//     color: '#000',
//     thickness: 1,
//     editable: true
// } 

export default function CustomEdge({ id, data, ...props }) {
    // ensure variables are always defined and provide a safe default for pathType
    let edgePath = '';
    let labelX = 0;
    let labelY = 0;
    const pathType = data?.pathType || 'smoothstep';
    const thickness = data?.thickness || 1;
    const editable = data?.editable || true;
    const color = data?.color || '#000';
    const arrowSource = data?.arrowSource || false;
    const arrowTarget = data?.arrowTarget || false;

    if (pathType === 'straight') {
        [edgePath, labelX, labelY] = getStraightPath(props);
    } else if (pathType === 'step') {
        [edgePath, labelX, labelY] = getSmoothStepPath(props);
    } else {
        [edgePath, labelX, labelY] = getBezierPath(props);
    }

    const markerId = `a3-edge-marker-${id}`;

    const onToggleSource = () => {
        const patch = { data: { ...(data || {}), arrowSource: !arrowSource } };
        window.dispatchEvent(new CustomEvent('a3:updateEdge', { detail: { id, patch } }));
    };

    const onToggleTarget = () => {
        const patch = { data: { ...(data || {}), arrowTarget: !arrowTarget } };
        window.dispatchEvent(new CustomEvent('a3:updateEdge', { detail: { id, patch } }));
    };

    return (
        <g>
            <defs>
                <marker id={markerId} markerWidth="8" markerHeight="8" refX="8" refY="4" orient="auto">
                    <path d="M0,0 L8,4 L0,8 z" fill={color} />
                </marker>
            </defs>

            <path d={edgePath} stroke={color} strokeWidth={thickness} fill="none" markerStart={arrowSource ? `url(#${markerId})` : undefined} markerEnd={arrowTarget ? `url(#${markerId})` : undefined} />

            {editable && (
                <foreignObject x={labelX} y={labelY} height={30} width={300} className='APTAPT'>
                    <div style={{ position: 'absolute', height: 30, display: 'flex', flexDirection: 'row', alignItems: 'center', zIndex: 20, background: 'var(--accent-highlight)', padding: '4px 6px', boxSizing: 'border-box', width: 'min-content', gap: 6, borderRadius: 6 }}>
                        <div onClick={onToggleSource}
                            style={{ height: "100%", aspectRatio: '1 / 1', padding: 0, border: 0, borderRadius: 30, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 'bold', color: 'white', backgroundColor: arrowSource ? 'var(--main)' : 'transparent', border: '1px solid black' }}
                        >
                            <TiArrowLeftThick />
                        </div>
                        <div onClick={onToggleTarget}
                            style={{ height: "100%", aspectRatio: '1 / 1', padding: 0, border: 0, borderRadius: 30, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 'bold', color: 'white', backgroundColor: arrowTarget ? 'var(--main)' : 'transparent', border: '1px solid black' }}
                        >
                            <TiArrowRightThick />
                        </div>
                    </div>
                </foreignObject>
            )}
        </g>
    );
};