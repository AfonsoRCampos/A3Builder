'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import useMeasure from 'react-use-measure';
import { ReactFlow, Background, applyNodeChanges } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import ControlsNode from '@/nodes/ControlsNode';
import TextNode from '@/nodes/TextNode';
import ImgNode from '@/nodes/ImgNode';
import { AutoTextSize } from 'auto-text-size'
import { formatCommentTimestamp } from '@/utils/Utils';

const cellStyle = {
    outlineOffset: "-1px",
    outline: "1px solid #000",
    overflow: "hidden",
    boxSizing: "border-box",
};

export default function Canvas({
    editable = false,
    a3Key,
    nodes,
    setA3,
    toggleImgSelector,
    imageToCreate,
    onImageCreated,
    twoPct,
    a3
}) {
    // --- State and refs ---
    const [refMeasure, bounds] = useMeasure();
    const maxX = Math.round(bounds.width || 0);
    const maxY = Math.round(bounds.height || 0);
    const [viewport, setViewport] = useState({ x: 0, y: 0, zoom: 1 });

    // --- Callbacks (order: dependencies first) ---
    // denormalizeNodes does not depend on any other callbacks
    const denormalizeNodes = useCallback((nodesArr) => {
        if (!Array.isArray(nodesArr)) return [];
        return nodesArr.map(n => {
            let position = n.position;
            let measured = n.measured;
            let width = n.width;
            let height = n.height;
            if (n.data && n.data.positionNorm && maxX > 0 && maxY > 0) {
                position = {
                    x: Math.round(n.data.positionNorm.x * maxX),
                    y: Math.round(n.data.positionNorm.y * maxY)
                };
            }
            if (n.data && n.data.sizeNorm && maxX > 0 && maxY > 0) {
                width = Math.round(n.data.sizeNorm.width * maxX);
                height = Math.round(n.data.sizeNorm.height * maxY);
                measured = { width, height };
            }
            const data = { ...(n.data || {}), editable: editable };
            return { ...n, position, data, measured, width, height };
        });
    }, [maxX, maxY, editable]);

    const [localNodes, _setLocalNodes] = useState(() => []);
    const initializedRef = useRef(null);
    const handleTextNodeAddRef = useRef(null);
    const onNodeDataChangeRef = useRef(null);
    const onNodeDeleteRef = useRef(null);

    // --- ensureControlsNode depends on handleTextNodeAddRef.current (ref to avoid circular deps) ---
    const ensureControlsNode = useCallback((nodesArr) => {
        if (!editable) return nodesArr;
        if (!(maxX > 0 && maxY > 0 && editable)) return nodesArr;
        if ((nodesArr || []).some(n => n.id === 'controls')) return nodesArr;
        const controlsNode = {
            id: 'controls',
            type: 'controls',
            data: { __ui: true, maxX, maxY, addTextNode: (handleTextNodeAddRef.current || (() => {})), openImagePicker: toggleImgSelector, position: { x: maxX - 20 - 50, y: 20 } },
            position: { x: maxX - 20 - 50, y: 20 },
            draggable: true,
        };
        return [...nodesArr, controlsNode];
    }, [maxX, maxY, editable, toggleImgSelector]);

    // --- setLocalNodes uses ensureControlsNode and denormalizeNodes ---
    const setLocalNodes = useCallback((updater) => {
        const injectCallbacks = (nodesArr) => {
            if (!Array.isArray(nodesArr)) return nodesArr;
            if (!editable) return nodesArr;
            const onChangeFn = (onNodeDataChangeRef.current || (() => {}));
            const onDeleteFn = (onNodeDeleteRef.current || (() => {}));
            return nodesArr.map(n => ({ ...n, data: { ...(n.data || {}), editable: editable, onChange: onChangeFn, onDelete: onDeleteFn } }));
        };

        if (typeof updater === 'function') {
            _setLocalNodes(prev => {
                // compute proposed next array from updater
                const proposed = updater(prev) || [];
                // build map of existing nodes by id to preserve their denormalized state
                const prevMap = new Map(prev.map(n => [n.id, n]));

                // for each proposed node, if it existed before keep the previous denormalized node
                // (preserving width/height/measured/position etc). Only denormalize truly new nodes.
                const toDenormalize = [];
                const next = proposed.map(n => {
                    if (prevMap.has(n.id)) {
                        const existing = prevMap.get(n.id);
                        // merge data from proposed into existing.data but keep existing visual attrs
                        return { ...existing, data: { ...(existing.data || {}), ...(n.data || {}) } };
                    } else {
                        toDenormalize.push(n);
                        return n; // placeholder; will replace after denormalization
                    }
                });

                // denormalize only the new nodes (toDenormalize)
                const denormNew = denormalizeNodes(toDenormalize || []);
                // replace placeholders in next with denormalized versions
                let di = 0;
                for (let i = 0; i < next.length; i++) {
                    if (!prevMap.has(next[i].id)) {
                        next[i] = denormNew[di++] || next[i];
                    }
                }

                const ensured = ensureControlsNode(next);
                return injectCallbacks(ensured);
            });
        } else {
            const next = ensureControlsNode(denormalizeNodes(updater));
            _setLocalNodes(injectCallbacks(next));
        }
    }, [_setLocalNodes, denormalizeNodes, ensureControlsNode, editable]);

    // --- onNodeDataChange and onNodeDelete defined after setLocalNodes to avoid circular refs ---
    const onNodeDataChange = useCallback((nodeId, patch) => {
        if (!editable) return;
        setLocalNodes(prev => prev.map(n => {
            if (n.id !== nodeId) return n;
            let newData = { ...(n.data || {}), ...patch };
            return { ...n, data: newData };
        }));
    }, [editable, setLocalNodes]);

    const onNodeDelete = useCallback((nodeId) => {
        if (!editable) return;
        setLocalNodes(prev => prev.filter(n => n.id !== nodeId));
    }, [editable, setLocalNodes]);

    // expose callbacks via refs so setLocalNodes can inject them without circular deps
    onNodeDataChangeRef.current = onNodeDataChange;
    onNodeDeleteRef.current = onNodeDelete;

    // --- handleTextNodeAdd depends on onNodeDataChange and onNodeDelete ---
    const handleTextNodeAdd = useCallback(() => {
        if (!editable) return;
        const pos = { x: Math.round(maxX / 2), y: Math.round(maxY / 2) };
        const posNorm = (maxX > 0 && maxY > 0)
            ? { x: pos.x / maxX, y: pos.y / maxY }
            : { x: 0.5, y: 0.5 };

        // sensible defaults for text node size (relative to container)
        const DEFAULT_TEXT_WIDTH_RATIO = 0.20; // 20% of canvas width
        const DEFAULT_TEXT_HEIGHT_RATIO = 0.08; // 8% of canvas height

        let measured = undefined;
        let sizeNorm = undefined;
        if (maxX > 0 && maxY > 0) {
            const displayW = Math.max(24, Math.round(maxX * DEFAULT_TEXT_WIDTH_RATIO));
            const displayH = Math.max(16, Math.round(maxY * DEFAULT_TEXT_HEIGHT_RATIO));
            measured = { width: displayW, height: displayH };
            sizeNorm = { width: Math.min(1, displayW / maxX), height: Math.min(1, displayH / maxY) };
        }

        const newNode = {
            id: `text-${Date.now()}`,
            type: 'text',
            position: pos,
            measured,
            data: {
                text: 'New Text',
                fontSize: 14,
                bgColor: '#fff',
                textColor: '#000',
                onChange: onNodeDataChange,
                onDelete: onNodeDelete,
                positionNorm: posNorm,
                ...(sizeNorm ? { sizeNorm } : {})
            }
        };

        setLocalNodes(prev => [...prev, newNode]);
    }, [maxX, maxY, onNodeDataChange, onNodeDelete, editable, setLocalNodes]);

    // keep ref to handler so ensureControlsNode can call it without causing circular deps
    handleTextNodeAddRef.current = handleTextNodeAdd;

    // --- updateA3 (no dependencies on above except setA3, a3Key, maxX, maxY) ---
    const updateA3 = useCallback((nodesArg) => {
        if (!editable) return;
        if (typeof setA3 !== 'function') return;
        const sanitize = (d) => {
            if (!d) return d;
            const out = {};
            Object.keys(d).forEach(k => {
                if (typeof d[k] !== 'function') out[k] = d[k];
            });
            return out;
        };
        const nodesToSave = (nodesArg || []).filter(n => !(n.data && n.data.__ui)).map(n => {
            const base = { id: n.id, type: n.type, position: n.position };
            const dataSan = sanitize(n.data);
            if (maxX > 0 && maxY > 0) {
                dataSan.positionNorm = { x: (n.position?.x || 0) / maxX, y: (n.position?.y || 0) / maxY };
                if (n.measured && typeof n.measured.width === 'number' && typeof n.measured.height === 'number') {
                    dataSan.sizeNorm = { width: n.measured.width / maxX, height: n.measured.height / maxY };
                }
            }
            if (n.type === 'text' && typeof n.data.fontSize === 'number' && maxY > 0) {
                dataSan.fontSizeNorm = n.data.fontSize / maxY;
            }
            return { ...base, data: dataSan };
        });
        // Only update parent state if the serialized nodes actually changed.
        // This avoids unnecessary parent updates that can trigger re-renders
        // and lead to update loops (React Flow + parent feeding nodes back).
        setA3(prev => {
            try {
                const prevNodes = (prev && prev[a3Key] && prev[a3Key].nodes) || [];
                const prevSerialized = JSON.stringify(prevNodes);
                const nextSerialized = JSON.stringify(nodesToSave);
                if (prevSerialized === nextSerialized) {
                    return prev; // no change, avoid updating
                }
            } catch (e) {
                // if serialization fails, fall back to updating to be safe
            }
            return {
                ...prev,
                [a3Key]: { nodes: nodesToSave }
            };
        });
    }, [setA3, a3Key, maxX, maxY, editable]);

    // --- Other callbacks ---
    const onViewportChange = useCallback((newViewport) => {
        setViewport(newViewport);
    }, []);

    const onNodesChange = useCallback(
        (changes) => {
            if (!editable) return;
            _setLocalNodes(prev => {
                const updated = applyNodeChanges(changes, prev);
                // Persist to parent state after updating localNodes
                // defer parent update to avoid setState during rendering of sibling components
                Promise.resolve().then(() => updateA3(updated));
                return updated;
            });
        },
        [editable, updateA3],
    );

    // --- Effects ---
    useEffect(() => {
        if (!editable) return;
        if (!(maxX > 0 && maxY > 0)) return;
        const incomingIds = (nodes || []).map(n => n.id).join(',');
        if (initializedRef.current === incomingIds) return;
        setLocalNodes(nodes || []);
        initializedRef.current = incomingIds;
    }, [editable, nodes, maxX, maxY, setLocalNodes]);

    useEffect(() => {
        if (!imageToCreate || !imageToCreate.src) return;
        // Load image to determine aspect ratio and compute sensible default sizeNorm
        const img = new window.Image();
        img.src = imageToCreate.src;
        const handleLoad = () => {
            const naturalW = img.naturalWidth || img.width || 1;
            const naturalH = img.naturalHeight || img.height || 1;
            const aspect = naturalH / naturalW;

            // default to 25% of container width (adjustable)
            const DEFAULT_WIDTH_RATIO = 0.25;
            if (maxX > 0 && maxY > 0) {
                let displayW = Math.round(maxX * DEFAULT_WIDTH_RATIO);
                let displayH = Math.round(displayW * aspect);
                // ensure we don't overflow container
                if (displayH > maxY) {
                    displayH = Math.round(maxY * 0.5);
                    displayW = Math.round(displayH / aspect);
                }
                const coords = { x: Math.round(maxX / 2), y: Math.round(maxY / 2) };
                const posNorm = { x: coords.x / maxX, y: coords.y / maxY };
                const sizeNorm = { width: Math.min(1, displayW / maxX), height: Math.min(1, displayH / maxY) };

                const newNode = {
                    id: `img-${Date.now()}`,
                    type: 'img',
                    position: coords,
                    measured: { width: displayW, height: displayH },
                    data: {
                        image: imageToCreate.src,
                        name: imageToCreate.name,
                        positionNorm: posNorm,
                        sizeNorm,
                    }
                };

                // Use setLocalNodes (which preserves existing denormalized nodes) and persist
                setLocalNodes(prev => {
                    const next = [...prev, newNode];
                    try { Promise.resolve().then(() => updateA3(next)); } catch (e) { /* swallow during init */ }
                    return next;
                });
                if (typeof onImageCreated === 'function') onImageCreated();
            } else {
                // fallback: container not measured yet — add basic node (will denormalize later)
                const coords = { x: 0, y: 0 };
                const posNorm = { x: 0.5, y: 0.5 };
                const newNode = {
                    id: `img-${Date.now()}`,
                    type: 'img',
                    position: coords,
                    data: { image: imageToCreate.src, name: imageToCreate.name, positionNorm: posNorm }
                };
                setLocalNodes(prev => [...prev, newNode]);
                if (typeof onImageCreated === 'function') onImageCreated();
            }
        };
        img.onload = handleLoad;
        img.onerror = () => {
            // still add node without size if image fails to load
            const coords = { x: Math.round(maxX / 2), y: Math.round(maxY / 2) };
            const posNorm = (maxX > 0 && maxY > 0) ? { x: coords.x / maxX, y: coords.y / maxY } : { x: 0.5, y: 0.5 };
            const newNode = {
                id: `img-${Date.now()}`,
                type: 'img',
                position: coords,
                data: { image: imageToCreate.src, name: imageToCreate.name, positionNorm: posNorm }
            };
            setLocalNodes(prev => [...prev, newNode]);
            if (typeof onImageCreated === 'function') onImageCreated();
        };

        // cleanup
        return () => {
            img.onload = null;
            img.onerror = null;
        };
    }, [imageToCreate, maxX, maxY, onImageCreated, denormalizeNodes, ensureControlsNode, updateA3, setLocalNodes]);

    // --- Memoized/derived values ---
    const derivedNodes = useMemo(() => {
        if (editable) return localNodes;
        if (!nodes) return [];
        return nodes.map(n => {
            let position = n.position;
            let measured = n.measured;
            let width = n.width;
            let height = n.height;
            let data = { ...(n.data || {}), editable: false };
            if (n.data && n.data.positionNorm && maxX > 0 && maxY > 0) {
                position = {
                    x: Math.round(n.data.positionNorm.x * maxX),
                    y: Math.round(n.data.positionNorm.y * maxY)
                };
            }
            if (n.data && n.data.sizeNorm && maxX > 0 && maxY > 0) {
                width = Math.round(n.data.sizeNorm.width * maxX);
                height = Math.round(n.data.sizeNorm.height * maxY);
                measured = { width, height };
            }
            if (n.type === 'text' && n.data && typeof n.data.fontSizeNorm === 'number' && maxY > 0) {
                data.fontSize = Math.round(n.data.fontSizeNorm * maxY);
            }
            return { ...n, position, data, measured, width, height };
        });
    }, [editable, nodes, maxX, maxY, localNodes]);

    const nodeTypes = {
        controls: ControlsNode,
        text: TextNode,
        img: ImgNode,
    };

    return (
        <>
            {!editable && (
                <div style={{ fontWeight: 'bold', width: '60%', height: `${twoPct}px`, ...cellStyle, zIndex: 2, position: 'relative', paddingLeft: '2px', backgroundColor: 'var(--accent-highlight)' }}>
                    <AutoTextSize mode='boxoneline' style={{ height: '100%' }}>
                        {a3Key === 'currentState' ? 'Current State' : 'Future State'}
                    </AutoTextSize>
                </div>
            )}
            <div ref={refMeasure} style={{ height: !editable && a3Key === 'currentState' && a3.layout.extraCurrentState.enabled ? '80%' : '100%', width: '100%', position: 'relative', top: editable ? "0" : `-${twoPct}px`, zIndex: 1, cursor: editable ? undefined : 'default' }}>
                <ReactFlow
                    nodeTypes={nodeTypes}
                    viewport={viewport}
                    onViewportChange={onViewportChange}
                    nodes={derivedNodes}
                    onNodesChange={onNodesChange}
                    style={{ pointerEvents: editable ? undefined : 'none', touchAction: editable ? undefined : 'none' }}
                    autoPanOnNodeFocus={false}
                    minZoom={1}
                    translateExtent={maxX > 0 && maxY > 0 ? [[0, 0], [maxX, maxY]] : undefined}
                    nodeExtent={maxX > 0 && maxY > 0 ? [[0, 0], [maxX, maxY]] : undefined}
                    connectionMode='Loose'
                    {...(editable ? {
                        nodesDraggable: true,
                        nodesConnectable: true,
                        elementsSelectable: true,
                        panOnScroll: true,
                        panOnDrag: true,
                        zoomOnScroll: true,
                        zoomOnPinch: true,
                        zoomOnDoubleClick: true,
                        maxZoom: 2
                    } : {maxZoom: 1, minZoom: 1})}
                >
                    {editable && <Background />}
                </ReactFlow>
            </div>
            {!editable && a3Key === 'currentState' && a3.layout.extraCurrentState.enabled &&(
                <div style={{ fontWeight: 'bold', width: '100%', height: `20%`, top: `-${twoPct}px`, position: 'relative', borderTop: '1px solid rgba(0,0,0,1)' }}>
                    <AutoTextSize mode='box' style={{ height: '100%' }}>
                                {a3.layout.extraCurrentState.text.map((line, idx) => {
                                    let text = '';
                                    if (line && typeof line === 'object' && 'text' in line) {
                                        const label = line.authorDisplay ? `${line.authorDisplay}${line.date ? ` (${formatCommentTimestamp(line.date)})` : ''}` : null;
                                        text = label ? `${label}: ${line.text}` : line.text;
                                    } else {
                                        text = String(line ?? '');
                                    }
                                    return (<p key={`extra-current-state-line-${idx}`}>{text}</p>);
                                })}
                    </AutoTextSize>
                </div>
            )}
        </>
    );
}
