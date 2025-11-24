"use client";
import React, { use, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser } from '@/state/UserContext';
import { useA3s } from '@/state/A3Context';
import useMeasure from 'react-use-measure';
import A3Preview from '@/components/A3Preview';
import A3Downloader from '@/components/A3Downloader';
import InputText from '@/components/InputText';
import { ensureLateFlagsForA3, ensureProgressForA3 } from '@/utils/actionsHelpers';

export default function ViewA3Page() {
    const params = useParams();
    const router = useRouter();
    const { user } = useUser();
    const { a3s = [] } = useA3s();
    const id = params?.id || '';

    const [a3, setA3] = useState(null);
    const [displayed, setDisplayed] = useState(null);
    const [versions, setVersions] = useState([]);
    const [loadingVersions, setLoadingVersions] = useState(false);
    const [selectedVersion, setSelectedVersion] = useState("CURRENT");
    const [format, setFormat] = useState('A3');
    const [showDownloader, setShowDownloader] = useState(false);
    const [refPreview, boundsPreview] = useMeasure();

    useEffect(() => {
        const found = (a3s || []).find(x => x?.header?.id === id) || null;
        if (!found) return; // wait for list to load
        const owner = found.header?.owner;
        const team = Array.isArray(found.header?.team) ? found.header.team : [];
        if (!(owner === user || team.includes(user))) {
            router.push('/home');
            return;
        }
        // compute late flags and daily progress; persist if new flags or progress were added
        try {
            let updated = ensureLateFlagsForA3(found);
            updated = ensureProgressForA3(updated);
            const changed = JSON.stringify(updated) !== JSON.stringify(found);
            setA3(updated);
            setDisplayed(updated);
            if (changed) {
                (async () => {
                    try {
                        const res = await fetch('/api/a3s', {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(updated)
                        });
                        if (!res.ok) {
                            // log but don't block rendering
                            const txt = await res.text().catch(() => '');
                            console.warn('Auto-save late flags/progress failed', res.status, txt);
                        }
                    } catch (e) {
                        console.warn('Auto-save late flags/progress error', e);
                    }
                })();
            }
        } catch (e) {
            // fallback to original found if helper throws
            setA3(found);
            setDisplayed(found);
        }
    }, [a3s, id, router, user]);

    // fetch versions for this A3 series
    useEffect(() => {
        if (!a3) return;
        const parts = (a3.header?.id || '').split('-');
        if (parts.length < 3) return;
        const series = parts[1];
        setLoadingVersions(true);
        fetch(`/api/a3s/${series}/versions`).then(r => r.json()).then(data => {
            // normalize response: support either { versions: {label: { snapshot, meta }}} or direct mapping
            const raw = data || {};
            let map = {};
            if (raw.versions && typeof raw.versions === 'object') map = raw.versions;
            else {
                // filter non-version keys like history/currentVersion if present
                Object.keys(raw).forEach(k => {
                    if (k === 'history' || k === 'currentVersion') return;
                    if (raw[k] && raw[k].snapshot) map[k] = raw[k];
                });
            }
            const list = Object.keys(map).map(label => ({ label, snapshot: map[label].snapshot || null, meta: map[label].meta || {} }));
            // sort by timestamp desc
            list.sort((a, b) => (b.meta?.ts || 0) - (a.meta?.ts || 0));
            setVersions(list);
        }).catch(() => setVersions([])).finally(() => setLoadingVersions(false));
    }, [a3]);

    if (!displayed) return <div style={{ padding: 24 }}>Loading A3…</div>;

    const bottomButtonsStyle = {
        height: '5vh',
        alignItems: 'center',
        justifyContent: 'center',
        display: 'flex',
        border: 'none',
        borderRadius: 6,
        cursor: 'pointer',
        color: 'white',
        fontWeight: 'bold',
    }

    return (
        <main style={{ padding: 16, display: 'flex', gap: 16 }}>
            <div style={{ flex: '0 0 80%', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0, justifyContent: 'center', alignItems: 'center', display: 'flex' }}>
                    <div style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <A3Preview
                            a3={displayed}
                            refPreview={refPreview}
                            boundsPreview={boundsPreview}
                            setA3={() => { }}
                            setActiveArea={() => { }}
                            setShowLayout={() => { }}
                            toggleImgSelectorCurrent={() => { }}
                            toggleImgSelectorActionPlan={() => { }}
                            editable={false}
                        />
                    </div>
                </div>

                {/* (controls moved to the aside so they stick to the bottom) */}
            </div>

            <aside style={{ flex: '1 1 30%', boxSizing: 'border-box', borderLeft: '1px solid rgba(0,0,0,0.06)', paddingLeft: 12, display: 'flex', flexDirection: 'column', height: 'calc(100vh - 32px)' }}>
                <h3 style={{ marginTop: 0 }}>Versions</h3>
                {loadingVersions ? (
                    <div>Loading versions…</div>
                ) : (
                    <>
                        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingRight: 8 }}>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <div
                                    onClick={() => { setDisplayed(a3); setSelectedVersion('CURRENT'); }}
                                    style={{
                                        padding: 8,
                                        borderRadius: 6,
                                        background: selectedVersion === 'CURRENT' ? '#eef' : 'transparent',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 6,
                                        flex: 1
                                    }}
                                >
                                    <div style={{ fontWeight: 'bold' }}>Current</div>
                                    <div style={{ color: '#444', fontSize: 12 }}>{new Date(a3.header?.ts || a3.header?.updated || Date.now()).toLocaleString()}</div>
                                    <div style={{ color: '#666', fontSize: 12 }}>Live (uncommitted)</div>
                                </div>
                            </div>
                            {versions.length === 0 && <div style={{ color: '#666' }}>No versions yet.</div>}
                            {versions.map(v => (
                                <div key={v.label} style={{ padding: 8, borderRadius: 6, background: selectedVersion === v.label ? '#eef' : 'transparent', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 6 }} onClick={() => { setDisplayed(v.snapshot || a3); setSelectedVersion(v.label); }}>
                                    <div style={{ fontWeight: 'bold' }}>{v.label}</div>
                                    <div style={{ color: '#444', fontSize: 12 }}>{new Date(v.meta?.ts || 0).toLocaleString()}</div>
                                    <div style={{ color: '#666', fontSize: 12, textAlign: 'left' }}>
                                        {v.meta?.changelog && Object.keys(v.meta.changelog).length > 0 ? (
                                            Object.entries(v.meta.changelog).map(([section, items]) => (
                                                <div key={section} style={{ marginBottom: 6 }}>
                                                    <div style={{ fontWeight: '600' }}>{section}</div>
                                                    {Array.isArray(items) && items.length > 0 ? (
                                                        <ul style={{ margin: '4px 0 0 1em', padding: 0 }}>
                                                            {items.map((it, idx) => (
                                                                <li key={idx} style={{ listStyle: 'disc', marginLeft: '1em', fontSize: 12 }}>{it}</li>
                                                            ))}
                                                        </ul>
                                                    ) : null}
                                                </div>
                                            ))
                                        ) : (
                                            <div>{v.meta?.message || ''}</div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Controls stuck to the bottom of the aside */}
                        <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: 8, marginTop: 8, display: 'flex', justifyContent: 'flex-end', gap: 8, alignItems: 'center' }}>
                            <button
                                onClick={() => { setShowDownloader(true); }}
                                style={{ ...bottomButtonsStyle, backgroundColor: 'var(--main)', padding: '6px', width: '100%' }}
                            >
                                {showDownloader ? 'Downloading...' : 'Download'}
                            </button>
                        </div>
                    </>
                )}
            </aside>
            {showDownloader && (
                <A3Downloader a3={displayed} format={format} onFinish={() => setShowDownloader(false)} />
            )}
        </main>
    );
}
