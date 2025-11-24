'use client';

import React, { useRef, useEffect } from 'react';
import { toInitialLast, isoToDateString } from '@/utils/Utils';
import { AutoTextSize } from 'auto-text-size'
import Link from 'next/link';
import { useA3s } from '@/state/A3Context';
import './A3Header.css';

const A3Header = ({ header, editable = false }) => {
    const { a3s } = useA3s() || { a3s: [] };

    const cellStyle = {
        height: "100%",
        width: "100%",
        border: "1px solid #000",
        overflow: "hidden",
        boxSizing: "border-box",
        padding: "2px",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center"
    };

    const sidewaysContainerRef = useRef(null);
    const rotatedRef = useRef(null);

    useEffect(() => {
        // Measure the container and set the rotated inner element's width/height
        // swapped so the visual rotated block fits and can be captured correctly.
        const cont = sidewaysContainerRef.current;
        const rot = rotatedRef.current;
        if (!cont || !rot) return;

        const update = () => {
            try {
                const cw = cont.clientWidth || 0;
                const ch = cont.clientHeight || 0;
                // Set rotated box dimensions swapped so it visually occupies the
                // parent's height as width and parent's width as height.
                rot.style.width = `${ch}px`;
                rot.style.height = `${cw}px`;
                rot.style.lineHeight = `${cw}px`;
            } catch (e) {
                // ignore measurement errors
            }
        };

        update();
        // also update on window resize
        window.addEventListener('resize', update);
        return () => window.removeEventListener('resize', update);
    }, [header?.id]);

    const shortId = (id) => {
        if (!id) return '';
        const parts = String(id).split('-');
        // If looks like A3-001-B return A3-001, otherwise return original
        if (parts.length >= 3) return parts.slice(0, 2).join('-');
        return id;
    };

    const findLatestFullIdForBase = (base) => {
        if (!base || !Array.isArray(a3s)) return null;
        const candidates = a3s.filter(x => x && x.header && x.header.id && (x.header.id === base || x.header.id.startsWith(base + '-')));
        if (!candidates.length) return null;
        // pick the max id string (assumes version suffix sorts lexicographically)
        candidates.sort((a, b) => a.header.id.localeCompare(b.header.id));
        return candidates[candidates.length - 1].header.id;
    };

    const renderIdList = (raw) => {
        const items = Array.isArray(raw) ? raw : (raw ? [raw] : []);
        if (!items.length) return null;
        const elems = [];
        items.forEach((rid, i) => {
            const base = shortId(rid);
            const full = findLatestFullIdForBase(base);
            const display = base || rid;
            // If we're in edit mode, don't create navigable links — render plain text
            if (full && !editable) {
                elems.push(
                    <Link key={i} href={`/a3/${full}/view`} style={{ color: 'inherit', textDecoration: 'underline' }}>
                        {display}
                    </Link>
                );
            } else {
                elems.push(<span key={i}>{display}</span>);
            }
            if (i < items.length - 1) elems.push(', ');
        });
        return elems;
    };

    const renderRefsAndFiles = (rawRefs, attachments) => {
        const refs = Array.isArray(rawRefs) ? rawRefs : (rawRefs ? [rawRefs] : []);
        const atts = Array.isArray(attachments) ? attachments : [];
        const elems = [];

        // render A3 refs first
        refs.forEach((rid, i) => {
            const base = shortId(rid);
            const full = findLatestFullIdForBase(base);
            const display = base || rid;
            if (full && !editable) {
                elems.push(
                    <Link key={`ref-${i}`} href={`/a3/${full}/view`} style={{ color: 'inherit', textDecoration: 'underline' }}>
                        {display}
                    </Link>
                );
            } else {
                elems.push(<span key={`ref-${i}`}>{display}</span>);
            }
            elems.push(', ');
        });

        // render attachments as F1, F2 etc and link to viewer
        atts.forEach((att, idx) => {
            const label = `F${idx + 1}`;
            if (!editable) {
                elems.push(
                    <a key={`file-${idx}`} href={att.url} download style={{ color: 'inherit', textDecoration: 'underline' }} rel="noopener noreferrer">
                        {label}
                    </a>
                );
            } else {
                elems.push(<span key={`file-${idx}`}>{label}</span>);
            }
            if (idx < atts.length - 1) elems.push(', ');
            if (idx === atts.length - 1 && refs.length > 0) elems.push('');
        });

        if (elems.length === 0) return null;
        return elems;
    };

    return (
        <div
            style={{
                display: "grid",
                gridTemplateColumns: "3% 25% 25% 11% 11% 25%",
                gridTemplateRows: "1fr 1fr",
                width: "100%",
                height: "100%",
                maxHeight: "100%",
                overflow: "hidden",
                boxSizing: "border-box",
            }}
        >
            <div
                ref={sidewaysContainerRef}
                className="forceCenter"
                style={{
                    gridColumn: "1",
                    gridRow: "1 / span 2",
                    fontWeight: "bold",
                    position: 'relative',
                    overflow: 'visible',
                    ...cellStyle
                }}
            >
                <div
                    ref={rotatedRef}
                    style={{
                        position: 'absolute',
                        left: '50%',
                        top: '50%',
                        transform: 'translate(-50%, -50%) rotate(-90deg)',
                        transformOrigin: 'center',
                        whiteSpace: 'nowrap',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        pointerEvents: 'none',
                    }}
                >
                    <AutoTextSize>{header.id}</AutoTextSize>
                </div>
            </div>
            <div className="forceCenter" style={{ gridColumn: "2", gridRow: "1 / span 2", ...cellStyle }}>
                <AutoTextSize>{header.title}</AutoTextSize>
            </div>
            <div style={{ gridColumn: "3", gridRow: "1", ...cellStyle }}>
                <AutoTextSize mode='boxoneline'><b>Responsible:</b> {toInitialLast(header.owner)}</AutoTextSize>
            </div>
            <div style={{ gridColumn: "3", gridRow: "2", ...cellStyle }}>
                <AutoTextSize mode='box'><b>Team:</b> {header.team.map(toInitialLast).join(", ")}</AutoTextSize>
            </div>
            <div style={{ gridColumn: "4", gridRow: "1 / span 2", ...cellStyle }}>
            <AutoTextSize mode='box'>
                <b>Last Updated:</b><br />{isoToDateString(header.lastUpdated)}<br />
                <b>By:</b><br />{toInitialLast(header.by)}
            </AutoTextSize>
            </div>
            <div style={{ gridColumn: "5", gridRow: "1", ...cellStyle }}>
                <AutoTextSize mode='box'><b>From:</b><br />{isoToDateString(header.start)}</AutoTextSize>
            </div>
            <div style={{ gridColumn: "5", gridRow: "2", ...cellStyle }}>
                <AutoTextSize mode='box'><b>To:</b><br />{isoToDateString(header.end)}</AutoTextSize>
            </div>
            <div style={{ gridColumn: "6", gridRow: "1", ...cellStyle }}>
                <AutoTextSize mode='boxoneline'>
                    <b>Ref. By:</b><br />{renderIdList(header.refBy)}
                </AutoTextSize>
            </div>
            <div style={{ gridColumn: "6", gridRow: "2", ...cellStyle }}>
                <AutoTextSize mode='boxoneline'>
                    <b>Refs:</b><br />{renderRefsAndFiles(header.refs, header.attachments)}
                </AutoTextSize>
            </div>
        </div>
    );
};

export default A3Header;