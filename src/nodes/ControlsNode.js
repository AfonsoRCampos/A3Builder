import React, { useState, useMemo } from 'react';
import { IoIosAddCircle } from "react-icons/io";
import { IoIosCloseCircle } from "react-icons/io";

export default function ControlsNode({ id, data = {}, ...props }) {
    const px = data?.position?.x ?? (Number.isFinite(props.position?.x)
        ? props.position.x
        : Number.isFinite(props.node?.position?.x)
            ? props.node.position.x
            : 0);
    const py = data?.position?.y ?? (Number.isFinite(props.position?.y)
        ? props.position.y
        : Number.isFinite(props.node?.position?.y)
            ? props.node.position.y
            : 0);
    const [expanded, setExpanded] = useState(false);

    const maxX = data?.maxX || 0;
    const maxY = data?.maxY || 0;

    const style = {
        background: 'transparent',
    };

    const bigIconStyle = {
        width: 50,
        height: 50,
        borderRadius: 50,
        background: 'var(--main)',
        fontWeight: 700,
        fontSize: 32,
        cursor: 'pointer',
        color: "var(--accent-highlight)",
    };

    const options = [
        { label: "Text", icon: (<IoIosAddCircle />), onClick: data?.addTextNode },
        { label: "Image", icon: (<IoIosAddCircle />), onClick: data?.openImagePicker },
    ]

    const r = 60;
    const w = 90;
    const h = 30;

    const visibleAnchors = useMemo(() => Array.from({ length: 8 }, (_, i) => {
        const borders = {
            0: 'left',
            1: 'left',
            2: 'bottom',
            3: 'right',
            4: 'right',
            5: 'right',
            6: 'top',
            7: 'left',
        }
        const boxOffsets = {
            0: {
                x: [0, w],
                y: [-h / 2, h / 2],
            },
            1: {
                x: [0, w],
                y: [-h / 2, h / 2],
            },
            2: {
                x: [-w / 2, w / 2],
                y: [0, h],
            },
            3: {
                x: [-w, 0],
                y: [-h / 2, h / 2],
            },
            4: {
                x: [-w, 0],
                y: [-h / 2, h / 2],
            },
            5: {
                x: [-w, 0],
                y: [-h / 2, h / 2],
            },
            6: {
                x: [-w / 2, w / 2],
                y: [-h, 0],
            },
            7: {
                x: [0, w],
                y: [-h / 2, h / 2],
            },
        }
        const angle = (i / 8) * (2 * Math.PI) - Math.PI / 2;
        const x = -Math.sin(angle) * r;
        const y = -Math.cos(angle) * r;

        const boxOffSetX = [x + boxOffsets[i].x[0], x + boxOffsets[i].x[1]];
        const boxOffSetY = [y + boxOffsets[i].y[0], y + boxOffsets[i].y[1]];

        const leftMost = px + boxOffSetX[0] + 25
        const rightMost = px + boxOffSetX[1] + 25
        const topMost = py + boxOffSetY[0] + 25
        const bottomMost = py + boxOffSetY[1] + 25
        const xOffset = borders[i] === 'left' ? +w / 2 : borders[i] === 'right' ? -w / 2 : 0;
        const yOffset = borders[i] === 'top' ? +h / 2 : borders[i] === 'bottom' ? -h / 2 : 0;

        if (leftMost < 0 || rightMost > maxX || topMost < 0 || bottomMost > maxY) {
            return null;
        }
        return { idx: i, x, y, xOffset, yOffset, leftMost, rightMost, topMost, bottomMost };
    }), [r, w, h, maxX, maxY, px, py]);

    const selectedAnchors = useMemo(() => {
        const vals = (visibleAnchors || []).filter(Boolean);
        if (vals.length < 2) return [];

        const present = new Set(vals.map(v => v.idx));
        for (let i = 0; i < 8; i++) {
            const a = i;
            const b = (i + 1) % 8;
            if (present.has(a) && present.has(b)) {
                const first = vals.find(v => v.idx === a);
                const second = vals.find(v => v.idx === b);
                if (first && second) return [first, second];
            }
        }
    }, [visibleAnchors]);

    return (
        <div style={{ ...style, position: 'relative', opacity: 0.7 }} data-node-id={id}>
            {expanded ? (
                <IoIosCloseCircle style={bigIconStyle} onClick={() => setExpanded(prev => !prev)} />
            ) : (
                <IoIosAddCircle style={bigIconStyle} onClick={() => setExpanded(prev => !prev)} />
            )}
            {expanded && (selectedAnchors || []).map((anchor, i) => (
                <div
                    key={anchor.idx}
                    data-anchor-idx={anchor.idx}
                    data-anchor-border={anchor.border}
                    title={`anchor ${anchor.idx}`}
                    onClick={() => {
                        const handler = options[i]?.onClick;
                        if (typeof handler === 'function') {
                            const absX = px + 25 + (anchor.xOffset || 0) + (anchor.x || 0);
                            const absY = py + 25 + (anchor.yOffset || 0) + (anchor.y || 0);
                            handler({ x: Math.round(absX), y: Math.round(absY) });
                        }
                    }}
                    style={{
                        position: 'absolute',
                        left: 25 + anchor.xOffset + anchor.x,
                        top: 25 + anchor.yOffset + anchor.y,
                        transform: 'translate(-50%, -50%)',
                        width: w,
                        height: h,
                        borderRadius: 6,
                        background: 'var(--accent-highlight)',
                        border: '2px solid var(--main)',
                        boxSizing: 'border-box',
                        pointerEvents: 'auto',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 10,
                        color: 'var(--main)',
                        cursor: 'pointer'
                    }}
                >
                    {options[i].icon} {options[i].label}
                </div>
            ))}
        </div>
    );
}