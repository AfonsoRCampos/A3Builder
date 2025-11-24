"use client";
import React, { useRef, useEffect, useLayoutEffect, useState } from "react";
import A3Header from "@/components/A3Header";
import Canvas from "@/components/Canvas";
import MetricsTextBox from "@/components/MetricsTextBox";
import Actions from '@/components/Actions';
import CheckAct from "@/components/CheckAct";
import A3ProbDef from "@/components/A3ProbDef";
import { useUser } from '@/state/UserContext';

export default function A3Preview({
    a3,
    setA3,
    activeArea,
    setActiveArea,
    refPlan2,
    refPlan4,
    refPreview,
    boundsPreview,
    toggleImgSelectorCurrent,
    toggleImgSelectorActionPlan,
    editable = false,
    owner = false,
    print = false
}) {

    function RotatedLabel({ children, containerStyle = {}, innerStyle = {}, flip = false }) {
        const containerRef = useRef(null);
        const innerRef = useRef(null);

        useEffect(() => {
            const cont = containerRef.current;
            const rot = innerRef.current;
            if (!cont || !rot) return;

            const update = () => {
                try {
                    const cw = cont.clientWidth || 0;
                    const ch = cont.clientHeight || 0;
                    // swap dimensions so rotated element visually fits
                    rot.style.width = `${ch}px`;
                    rot.style.height = `${cw}px`;
                    rot.style.lineHeight = `${cw}px`;
                } catch (e) {
                    // ignore
                }
            };

            update();
            window.addEventListener('resize', update);
            return () => window.removeEventListener('resize', update);
        }, [children]);

        return (
            <div ref={containerRef} style={{ position: 'relative', overflow: 'visible', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', ...containerStyle }}>
                <div ref={innerRef} style={{ position: 'absolute', left: '50%', top: '50%', transform: `translate(-50%, -50%) rotate(${flip ? 90 : -90}deg)`, transformOrigin: 'center', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', ...innerStyle }}>
                    {children}
                </div>
            </div>
        );
    }

    const { user } = useUser();

    // local ref to the preview container so we can measure it and compute
    // pixel values for relative sizes (e.g. 2% of preview height).
    const [twoPct, setTwoPct] = useState(0);

    // Use the external measurement (boundsPreview) to compute twoPct = 2% of preview height.
    useLayoutEffect(() => {
        if (!boundsPreview) return;
        try {
            const h = boundsPreview.height || 0;
            setTwoPct(Math.max(0, Math.round(h * 0.03)));
        } catch (e) {
            // ignore
        }
    }, [boundsPreview]);

    const isInList = (list) => {
        if (!list) return false;
        try {
            return Array.isArray(list) && user ? list.includes(user) : false;
        } catch (e) { return false; }
    };

    // determine per-section edit permission for the current viewer
    const headerEditable = editable && (owner);
    const probDefEditable = editable && (owner || isInList(a3.probDef?.canEdit));
    const currentStateEditable = editable && (owner || isInList(a3.currentState?.canEdit));
    const actionPlanEditable = editable && (owner || isInList(a3.actionPlan?.canEdit));
    const objectivesEditable = editable && (owner || isInList(a3.metrics?.canEditObjectives));
    const metricsEditable = editable && (owner || isInList(a3.metrics?.canEditMetrics));
    // determine actions editability: only if overall editable, or owner, or user assigned to any action
    let actionsEditable = false;
    try {
        if (!editable) {
            actionsEditable = false;
        } else if (owner) {
            actionsEditable = true;
        } else if (Array.isArray(a3.actions)) {
            actionsEditable = a3.actions.some(act => {
                try {
                    if (!act) return false;
                    if (act.owner && act.owner === user) return true;
                    if (Array.isArray(act.team) && act.team.includes(user)) return true;
                    if (Array.isArray(act.assignees) && act.assignees.includes(user)) return true;
                    if (act.assignee && act.assignee === user) return true;
                    return false;
                } catch (e) { return false; }
            });
        }
    } catch (e) { actionsEditable = false; }

    const handleAreaClick = (area) => {
        setActiveArea(prev => prev === area ? null : area);
    };

    const colors = [
        ["var(--blue-highlight)", "var(--blue-highlight)", , "var(--blue)"],
        ["var(--accent-highlight)", "var(--accent-highlight)", "var(--accent)"],
        ["white", "var(--accent-highlight)", "var(--accent)"],
        ["var(--accent-highlight)", "var(--accent-highlight)", "var(--accent)"],
        ["white", "var(--accent-highlight)", "var(--accent)"],
        ["var(--green-highlight)", "var(--green-highlight)", "var(--green)"],
        ["var(--orange-highlight)", "var(--orange-highlight)", "var(--orange)"],
    ];

    return (
        <div
            ref={refPreview}
            style={{
                height: print ? "100%" : "94vh",
                maxWidth: print ? "100%" : "calc(100vw - 2em)",
                aspectRatio: "420/297",
                background: "white",
                border: "2px solid",
                borderColor: colors[activeArea]?.[2] || "var(--main)",
                boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
                boxSizing: "border-box",
                position: 'relative',
                padding: "0",
                margin: 0,
                overflow: "hidden",
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'stretch',
            }}
        >
            {/* Header */}
            <div
                onClick={headerEditable ? () => handleAreaClick(0) : undefined}
                style={{
                    width: "100%",
                    height: "10%",
                    flex: '0 0 10%',
                    maxHeight: '10%',
                    overflow: 'hidden',
                    background: activeArea === 0 ? colors[0]?.[0] || "white" : "white",
                    cursor: (headerEditable ? 'pointer' : 'default'),
                    transition: "background 0.2s",
                    borderBottom: "1px solid var(--main)",
                    boxSizing: "border-box",
                }}
            >
                <A3Header header={a3.header} editable={headerEditable} owner={owner} setA3={setA3} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "3% 47% 47% 3%", flex: '1 1 0%', minHeight: 0, overflow: 'hidden' }}>
                {/* Side Bar - Left */}
                <RotatedLabel containerStyle={{ background: "var(--accent-highlight)", display: 'flex', fontWeight: 'bold', color: 'gray', borderLeft: '1px solid var(--main)', borderBottom: '1px solid var(--main)', boxSizing: 'border-box', fontSize: '0.8em' }}>
                    PLAN
                </RotatedLabel>
                <div
                    style={{
                        cursor: "pointer",
                        transition: "background 0.2s",
                        borderRight: "1px solid var(--main)",
                        height: "100%",
                        boxSizing: "border-box",
                        overflow: 'hidden',
                    }}
                >
                    <div style={{ display: "grid", gridTemplateRows: `${a3.layout?.sections?.plan1}% ${a3.layout?.sections?.plan2}% 20%`, height: "100%", gridTemplateColumns: "100%", minHeight: 0, overflow: 'hidden' }}>
                        {/* Plan 1 */}
                        <div
                            onClick={probDefEditable ? () => handleAreaClick(1) : undefined}
                            style={{
                                background: activeArea === 1 ? colors[1]?.[1] || "white" : "white",
                                cursor: (probDefEditable ? 'pointer' : 'default'),
                                transition: "background 0.2s",
                                borderBottom: "1px solid var(--main)",
                                borderLeft: "1px solid var(--main)",
                                borderTop: "1px solid var(--main)",
                                boxSizing: "border-box",
                            }}
                        >
                            <A3ProbDef probDef={a3.probDef} lag={a3.metrics.lag} start={a3.header.start} end={a3.header.end} editable={probDefEditable} owner={owner} setA3={setA3} twoPct={twoPct} />
                        </div>
                        {/* Plan 2 */}
                        <div
                            ref={refPlan2}
                            onClick={currentStateEditable ? () => handleAreaClick(2) : undefined}
                            style={{
                                background: activeArea === 2 ? colors[2]?.[1] || "white" : "white",
                                cursor: (currentStateEditable ? 'pointer' : 'default'),
                                transition: "background 0.2s",
                                borderLeft: "1px solid var(--main)",
                                borderBottom: "1px solid var(--main)",
                                borderTop: "1px solid var(--main)",
                                boxSizing: "border-box",
                            }}
                        >
                            <Canvas a3={a3} a3Key={'currentState'} nodes={a3.currentState.nodes} edges={a3.currentState.edges} editable={false} setA3={setA3} toggleImgSelector={toggleImgSelectorCurrent} imageToCreate={null} onImageCreated={() => { }} twoPct={twoPct} />
                        </div>
                        {/* Plan 3 */}
                        <div
                            onClick={objectivesEditable ? () => handleAreaClick(3) : undefined}
                            style={{
                                background: activeArea === 3 ? colors[3]?.[1] || "white" : "white",
                                cursor: (objectivesEditable ? 'pointer' : 'default'),
                                transition: "background 0.2s",
                                borderLeft: "1px solid var(--main)",
                                borderTop: "1px solid var(--main)",
                                boxSizing: "border-box",
                            }}
                        >
                            <MetricsTextBox metrics={a3.metrics} setA3={setA3} start={a3.header.start} end={a3.header.end} editable={objectivesEditable} owner={owner} twoPct={twoPct} />
                        </div>
                    </div>
                </div>
                <div
                    style={{
                        cursor: "pointer",
                        transition: "background 0.2s",
                        borderRight: "1px solid var(--main)",
                        height: "100%",
                        boxSizing: "border-box",
                        overflow: 'hidden',
                    }}
                >
                    <div style={{ display: "grid", gridTemplateRows: `${a3.layout.includeFutureState ? a3.layout?.sections?.futureState : a3.layout?.sections?.do1}% ${a3.layout.includeFutureState ? a3.layout?.sections?.do1 : a3.layout?.sections?.checkAct}% ${a3.layout.includeFutureState ? a3.layout?.sections?.checkAct : 0}%`, height: "100%", minHeight: 0, overflow: 'hidden' }}>
                        {/* Plan 4 */}
                        {a3.layout.includeFutureState && (
                            <div
                                ref={refPlan4}
                                onClick={actionPlanEditable ? () => handleAreaClick(4) : undefined}
                                style={{
                                    background: activeArea === 4 ? colors[4]?.[1] || "white" : "white",
                                    cursor: (actionPlanEditable ? 'pointer' : 'default'),
                                    transition: "background 0.2s",
                                    borderBottom: "1px solid var(--main)",
                                    borderLeft: "1px solid var(--main)",
                                    borderTop: "1px solid var(--main)",
                                    boxSizing: "border-box",
                                }}
                            >
                                <Canvas a3={a3} a3Key={'actionPlan'} nodes={a3.actionPlan.nodes} edges={a3.actionPlan.edges} editable={false} setA3={setA3} toggleImgSelector={toggleImgSelectorActionPlan} imageToCreate={null} onImageCreated={() => { }} twoPct={twoPct} />
                            </div>)}
                        {/* Do 1 */}
                        <div
                            onClick={actionsEditable ? () => handleAreaClick(5) : undefined}
                            style={{
                                background: activeArea === 5 ? colors[5]?.[1] || "white" : "white",
                                cursor: (actionsEditable ? 'pointer' : 'default'),
                                transition: "background 0.2s",
                                borderLeft: "1px solid var(--main)",
                                borderBottom: "1px solid var(--main)",
                                borderTop: "1px solid var(--main)",
                                boxSizing: "border-box",
                            }}
                        >
                            <Actions a3={a3} setA3={setA3} owner={owner} twoPct={twoPct} />
                        </div>
                        {/* Check + Act 1 */}
                        <div
                            onClick={metricsEditable ? () => handleAreaClick(6) : undefined}
                            style={{
                                background: activeArea === 6 ? colors[6]?.[1] || "white" : "white",
                                cursor: (metricsEditable ? 'pointer' : 'default'),
                                transition: "background 0.2s",
                                borderLeft: "1px solid var(--main)",
                                borderTop: "1px solid var(--main)",
                                boxSizing: "border-box",
                            }}
                        >
                            <CheckAct metrics={a3.metrics} editable={metricsEditable} owner={owner} twoPct={twoPct} a3={a3} />
                        </div>
                    </div>
                </div>
                {/* Side Bar - Right */}
                <div
                    style={{
                        fontWeight: "bold",
                        color: "gray",
                        borderLeft: "1px solid var(--main)",
                        height: "100%",
                        boxSizing: "border-box",
                        overflow: 'hidden',
                    }}
                >
                    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0, overflow: 'hidden' }}>

                        {(() => {
                            const heights = a3.layout.includeFutureState ? [
                                `${a3.layout?.sections?.futureState}%`,
                                `${a3.layout?.sections?.do1}%`,
                                `${a3.layout?.sections?.checkAct}%`,
                            ] : [
                                undefined,
                                `${a3.layout?.sections?.do1}%`,
                                `${a3.layout?.sections?.checkAct}%`,
                            ];
                            return (
                                <>
                                    {a3.layout.includeFutureState && (
                                        <RotatedLabel flip={true} containerStyle={{ background: "var(--accent-highlight)", fontWeight: 'bold', color: 'gray', borderBottom: '1px solid var(--main)', borderTop: '1px solid var(--main)', gridRow: '1', height: heights[0], boxSizing: 'border-box', fontSize: '0.8em' }}>
                                            {/* intentionally empty label area (future state header) */}
                                        </RotatedLabel>)}
                                    <RotatedLabel flip={true} containerStyle={{ fontWeight: 'bold', color: 'gray', borderBottom: '1px solid var(--main)', borderTop: '1px solid var(--main)', gridRow: '1', height: heights[1], boxSizing: 'border-box', fontSize: '0.8em', background: 'var(--green-highlight)' }}>
                                        DO
                                    </RotatedLabel>
                                    <RotatedLabel flip={true} containerStyle={{ fontWeight: 'bold', color: 'gray', borderBottom: '1px solid var(--main)', borderTop: '1px solid var(--main)', gridRow: '1', height: heights[2], boxSizing: 'border-box', fontSize: '0.8em', background: 'var(--orange-highlight)' }}>
                                        CHECK + ACT
                                    </RotatedLabel>
                                </>
                            );
                        })()}
                    </div>
                </div>
            </div>
        </div>
    );
}


