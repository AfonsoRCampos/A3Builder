"use client";
import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useUser } from '@/state/UserContext';
import { useA3s } from '@/state/A3Context';
import EditorShell from '@/components/EditorShell';
import useMeasure from 'react-use-measure';
import { generateBuckets, shouldDisableFrequency } from '@/utils/bucketUtils';
import LayoutSettingsPanel from '@/components/LayoutSettingsPanel';
import PublishButton from '@/components/PublishButton';
import A3Preview from '@/components/A3Preview';
import SectionEditorsPanel from '@/components/SectionEditorsPanel';
import { FaGear } from 'react-icons/fa6';
import { ensureLateFlagsForA3, ensureProgressForA3 } from '@/utils/actionsHelpers';

export default function EditA3Page() {
    const params = useParams();
    const router = useRouter();
    const { user } = useUser();
    const { a3s = [], setA3s } = useA3s();
    const id = params?.id || '';

    const [a3, setA3] = useState(null);

    const [activeArea, setActiveArea] = useState(null);
    const [isOwner, setIsOwner] = useState(false);
    const [refPlan2, boundsPlan2] = useMeasure();
    const [refPlan4, boundsPlan4] = useMeasure();
    const [refPreview, boundsPreview] = useMeasure();
    const [showLayout, setShowLayout] = useState(false);
    const [saving, setSaving] = useState(false);
    const gearRef = React.useRef(null);
    const [layoutEditable, setLayoutEditable] = useState(false);

    useEffect(() => {
        const isInList = (list) => {
            if (!list) return false;
            try {
                return Array.isArray(list) && user ? list.includes(user) : false;
            } catch (e) { return false; }
        };

        const found = (a3s || []).find(x => x?.header?.id === id) || null;
        if (!found) return; // wait for list to load
        // authorization: owner or team member
        const owner = found.header?.owner;
        const team = Array.isArray(found.header?.team) ? found.header.team : [];
        if (!(owner === user || team.includes(user))) {
            // not authorized
            router.push('/home');
            return;
        }
        // compute late flags and persist if changed
        try {
            let updated = ensureLateFlagsForA3(found);
            updated = ensureProgressForA3(updated);
            const changed = JSON.stringify(updated) !== JSON.stringify(found);
            setIsOwner(owner === user);
            setA3(updated);
            setLayoutEditable(owner === user || isInList(updated.layout?.canEdit));
            if (changed) {
                (async () => {
                    try {
                        const res = await fetch('/api/a3s', {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(updated)
                        });
                        if (!res.ok) {
                            const txt = await res.text().catch(() => '');
                            console.warn('Auto-save late flags/progress failed', res.status, txt);
                        }
                    } catch (e) {
                        console.warn('Auto-save late flags/progress error', e);
                    }
                })();
            }
        } catch (e) {
            setIsOwner(owner === user);
            setA3(found);
            setLayoutEditable(owner === user || isInList(found.layout?.canEdit));
        }
    }, [a3s, id, router, user]);

    useEffect(() => {
        const start = a3?.header?.start;
        const end = a3?.header?.end;
        if (!start || !end || !a3?.metrics) return;

        const pickBestForGranularity = (granularity) => {
            const freqOrder = { daily: 0, weekly: 1, monthly: 2 };
            const granularityOrder = { days: 0, weeks: 1, months: 2 };
            const isFreqAllowedByGranularity = (freq, gran) => {
                if (!gran) return true;
                const fi = freqOrder[freq] ?? 0;
                const gi = granularityOrder[gran] ?? 0;
                return fi >= gi;
            };

            if (isFreqAllowedByGranularity('daily', granularity) && !shouldDisableFrequency(start, end, 'daily', 100)) return 'daily';
            if (isFreqAllowedByGranularity('weekly', granularity) && !shouldDisableFrequency(start, end, 'weekly', 100)) return 'weekly';
            if (isFreqAllowedByGranularity('monthly', granularity) && !shouldDisableFrequency(start, end, 'monthly', 100)) return 'monthly';
            return null;
        };

        let didPopulate = false;
        const next = typeof structuredClone === 'function' ? structuredClone(a3) : JSON.parse(JSON.stringify(a3));

        // populate lag if missing or ensure first bucket reflects initial when empty
        next.metrics = next.metrics || {};
        const lag = next.metrics.lag || {};
        const lagData = Array.isArray(lag.data) ? lag.data : [];
        if (!lagData || lagData.length === 0) {
            const lagGran = (next.metrics.lag?.target?.granularity) || null;
            const chosen = next.metrics.lag?.display?.freq || pickBestForGranularity(lagGran);
            if (chosen) {
                const buckets = generateBuckets(start, end, chosen);
                const initialVal = typeof next.metrics.lag?.initial !== 'undefined' ? next.metrics.lag.initial : null;
                next.metrics.lag = {
                    ...(next.metrics.lag || {}),
                    data: buckets.map((d, i) => ({ date: d, value: i === 0 && initialVal !== null && initialVal !== '' ? initialVal : null })),
                    display: { ...(next.metrics.lag.display || {}), freq: chosen }
                };
                didPopulate = true;
            }
        } else {
            // if data exists, ensure the first bucket has the metric.initial when it's empty
            try {
                const first = next.metrics.lag.data[0] || {};
                const firstVal = typeof first.value === 'undefined' ? null : first.value;
                const initialVal = typeof next.metrics.lag?.initial !== 'undefined' ? next.metrics.lag.initial : null;
                // normalize to numbers; treat non-finite results (NaN/Infinity) as null to avoid unstable comparisons
                const normFirst = (firstVal === null || firstVal === '' || !Number.isFinite(Number(firstVal))) ? null : Number(firstVal);
                const normInitial = (initialVal === null || initialVal === '' || !Number.isFinite(Number(initialVal))) ? null : Number(initialVal);
                if (normFirst !== normInitial) {
                    next.metrics.lag.data[0] = { ...(next.metrics.lag.data[0] || {}), value: normInitial };
                    didPopulate = true;
                }
            } catch (e) { /* ignore */ }
        }

        // populate leads if missing or ensure first bucket reflects initial when empty
        next.metrics.leads = next.metrics.leads || [];
        for (let i = 0; i < next.metrics.leads.length; i++) {
            const lead = next.metrics.leads[i] || {};
            const leadData = Array.isArray(lead.data) ? lead.data : [];
            if (!leadData || leadData.length === 0) {
                const leadGran = (lead?.target?.granularity) || null;
                const chosen = lead.display?.freq || pickBestForGranularity(leadGran);
                if (chosen) {
                    const buckets = generateBuckets(start, end, chosen);
                    const initialVal = typeof lead?.initial !== 'undefined' ? lead.initial : null;
                    next.metrics.leads[i] = {
                        ...(next.metrics.leads[i] || {}),
                        data: buckets.map((d, idx) => ({ date: d, value: idx === 0 && initialVal !== null && initialVal !== '' ? Number(initialVal) : null })),
                        display: { ...(next.metrics.leads[i].display || {}), freq: chosen }
                    };
                    didPopulate = true;
                }
            } else {
                // if data exists, ensure first bucket aligns with initial when empty
                try {
                    const first = next.metrics.leads[i].data[0] || {};
                    const firstVal = typeof first.value === 'undefined' ? null : first.value;
                    const initialVal = typeof next.metrics.leads[i]?.initial !== 'undefined' ? next.metrics.leads[i].initial : null;
                    const normFirst = (firstVal === null || firstVal === '' || !Number.isFinite(Number(firstVal))) ? null : Number(firstVal);
                    const normInitial = (initialVal === null || initialVal === '' || !Number.isFinite(Number(initialVal))) ? null : Number(initialVal);
                    if (normFirst !== normInitial) {
                        next.metrics.leads[i].data[0] = { ...(next.metrics.leads[i].data[0] || {}), value: normInitial };
                        didPopulate = true;
                    }
                } catch (e) { /* ignore */ }
            }
        }

        if (didPopulate) setA3(next);
    }, [a3, setA3]);

    if (!user) return null;

    if (!a3) {
        return <div style={{ padding: 24, textAlign: 'center' }}>Loading A3 for edit…</div>;
    }

    const updateDraft = async () => {
        try {
            setSaving(true);
            // create a copy and ensure draft/published flags
            const next = typeof structuredClone === 'function' ? structuredClone(a3) : JSON.parse(JSON.stringify(a3));
            next.draft = a3.draft;
            next.published = a3.published;
            next.header = next.header || {};
            next.header.lastUpdated = new Date().toISOString();

            const res = await fetch('/api/a3s', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(next)
            });

            if (!res.ok) {
                const text = await res.text();
                console.error('Failed to update A3', res.status, text);
                return;
            }

            const saved = await res.json();
            // update local state with server response (if any)
            const final = saved || next;
            setA3(final);
            // refresh global list from server to pick up side-effects (refs/refBy updates)
            try {
                if (typeof setA3s === 'function') {
                    const rr = await fetch('/api/a3s');
                    if (rr.ok) {
                        const data = await rr.json();
                        setA3s(Array.isArray(data) ? data : []);
                    } else {
                        setA3s(prev => {
                            const list = Array.isArray(prev) ? prev.slice() : [];
                            const idx = list.findIndex(x => x?.header?.id === final?.header?.id);
                            if (idx >= 0) list[idx] = final;
                            else list.push(final);
                            return list;
                        });
                    }
                }
            } catch (e) {
                console.warn('Could not refresh global A3 list', e);
            }
            console.log('A3 updated', saved);
            // navigate back to the list after saving draft
            router.push('/home');

        } catch (e) {
            console.error('Error updating A3', e);
            router.push('/home');
        } finally {
            setSaving(false);
        }
    };

    const createNewVersion = async () => {
        updateDraft();
        try {
            setSaving(true);
            const series = a3?.header?.id?.split('-')?.[1];
            if (!series) {
                console.error('Cannot determine series id for versioning');
                return;
            }

            const body = { author: user || null, message: `Version from ${user || 'unknown'}` };
            const res = await fetch(`/api/a3s/${series}/versions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (!res.ok) {
                const text = await res.text();
                console.error('Failed to create version', res.status, text);
                return;
            }

            const data = await res.json(); // { version, meta }
            const nextVersion = data?.version;

            // Update local A3 id to new version
            setA3(prev => {
                if (!prev) return prev;
                const next = typeof structuredClone === 'function' ? structuredClone(prev) : JSON.parse(JSON.stringify(prev));
                if (next.header && typeof next.header.id === 'string') {
                    const parts = next.header.id.split('-');
                    parts[2] = nextVersion;
                    next.header.id = parts.join('-');
                    next.header.lastUpdated = new Date().toISOString();
                    next.published = true;
                    next.draft = false;
                }
                return next;
            });

            // Refresh global list from server to pick up id-changes and cross-ref updates
            try {
                if (typeof setA3s === 'function') {
                    const rr = await fetch('/api/a3s');
                    if (rr.ok) {
                        const data = await rr.json();
                        setA3s(Array.isArray(data) ? data : []);
                    }
                }
            } catch (e) {
                console.warn('Could not refresh global A3 list after versioning', e);
            }

            // navigate back to the list
            router.push('/home');

        } catch (e) {
            console.error('Error creating version', e);
        } finally {
            setSaving(false);
        }
    }

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

    const colors = [
        ["var(--blue-highlight)", "var(--blue-highlight)", , "var(--blue)"],
        ["var(--accent-highlight)", "var(--accent-highlight)", "var(--accent)"],
        ["white", "var(--accent-highlight)", "var(--accent)"],
        ["var(--accent-highlight)", "var(--accent-highlight)", "var(--accent)"],
        ["white", "var(--accent-highlight)", "var(--accent)"],
        ["var(--green-highlight)", "var(--green-highlight)", "var(--green)"],
        ["var(--orange-highlight)", "var(--orange-highlight)", "var(--orange)"],
    ];

    const activeAreaLabel = {
        0: 'header',
        1: 'probDef',
        2: 'currentState',
        3: 'objectives',
        4: 'actionPlan',
        5: null,
        6: 'metrics'
    }

    return (
        <div style={{ width: "100vw", minHeight: "100vh", padding: "1em", boxSizing: "border-box", justifySelf: "center", alignItems: "center", display: "flex", flexDirection: "column", background: "#f0f0f0", gap: "6px" }}>
            <EditorShell
                a3={a3}
                setA3={setA3}
                activeArea={activeArea}
                setActiveArea={setActiveArea}
                boundsPreview={boundsPreview}
                refPlan2={refPlan2}
                boundsPlan2={boundsPlan2}
                refPlan4={refPlan4}
                boundsPlan4={boundsPlan4}
            />
            {isOwner && <SectionEditorsPanel a3={a3} setA3={setA3} activeArea={activeAreaLabel[activeArea]} setShowLayout={setShowLayout} width={boundsPreview.width} color={activeArea ? colors[activeArea][2] : undefined} />}
            <A3Preview
                a3={a3}
                setA3={setA3}
                activeArea={activeArea}
                setActiveArea={setActiveArea}
                refPlan2={refPlan2}
                boundsPlan2={boundsPlan2}
                refPlan4={refPlan4}
                boundsPlan4={boundsPlan4}
                refPreview={refPreview}
                boundsPreview={boundsPreview}
                showLayout={showLayout}
                setShowLayout={setShowLayout}
                toggleImgSelectorCurrent={() => { imagePickerTarget.current = 'currentState'; setImagePickerOpen(true); }}
                toggleImgSelectorActionPlan={() => { imagePickerTarget.current = 'actionPlan'; setImagePickerOpen(true); }}
                editable={true}
                owner={isOwner}
            />
            <div style={{ width: boundsPreview.width, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {layoutEditable && (
                        <>
                            <button ref={gearRef} onClick={() => setShowLayout(prev => !prev)} aria-expanded={showLayout} aria-label="Layout settings"
                                style={{ ...bottomButtonsStyle, aspectRatio: '1/1', backgroundColor: 'var(--main-highlight)' }}>
                                <FaGear />
                            </button>
                            <LayoutSettingsPanel a3={a3} setA3={setA3} open={showLayout} onClose={() => setShowLayout(false)} anchorRef={gearRef} />
                        </>
                    )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {a3.draft && isOwner && (
                        <>
                            <PublishButton a3={a3} setA3={setA3} style={{ ...bottomButtonsStyle, padding: '6px', backgroundColor: 'var(--main)' }} />
                        </>
                    )}
                    {a3.published && isOwner && (
                        <button
                            onClick={createNewVersion}
                            disabled={saving || !isOwner}
                            style={{ ...bottomButtonsStyle, backgroundColor: 'var(--main)', padding: '6px' }}
                        >
                            {saving ? 'Creating version...' : 'New Version'}
                        </button>
                    )}
                    <button
                        onClick={updateDraft}
                        disabled={saving}
                        style={{ ...bottomButtonsStyle, backgroundColor: 'var(--main-highlight)', padding: '6px' }}
                    >
                        {saving ? 'Updating...' : 'Update'}
                    </button>
                </div>
            </div>
        </div>
    );
}
