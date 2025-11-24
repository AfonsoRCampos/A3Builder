import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChromePicker } from 'react-color';
import { getContrastTextColor } from '@/utils/Utils';
import { MdDelete, MdOutlineDragIndicator } from "react-icons/md";
import { NodeResizeControl } from '@xyflow/react';
import { IoMdResize } from "react-icons/io";
import { AutoTextSize } from 'auto-text-size';

export default function TextNode({ id, data = {} }) {
    const editable = !!data.editable;
    const defaultFontSize = data?.fontSize || 14;
    const defaultBg = data?.bgColor || '#fff';
    const defaultColor = data?.textColor || '#000';

    const [text, setText] = useState(data.text || '');
    const [fontSize, setFontSize] = useState(defaultFontSize);
    const [bgColor, setBgColor] = useState(defaultBg);
    const [textColor, setTextColor] = useState(defaultColor);
    const [showBgPicker, setShowBgPicker] = useState(false);
    const [showTextPicker, setShowTextPicker] = useState(false);
    const [bgPickerPos, setBgPickerPos] = useState({ left: 0, top: 0 });
    const [textPickerPos, setTextPickerPos] = useState({ left: 0, top: 0 });

    const swatchBgRef = useRef(null);
    const swatchTextRef = useRef(null);
    const bgPortalRef = useRef(null);
    const textPortalRef = useRef(null);

    const ref = useRef(null);
    const wrapperRef = useRef(null);
    const [sizeKey, setSizeKey] = useState(0);

    // keep local state in sync if parent updates
    useEffect(() => {
        if (typeof data.text === 'string' && data.text !== text) setText(data.text);
        if (Number.isFinite(data.fontSize) && data.fontSize !== fontSize) setFontSize(data.fontSize);
        if (data.bgColor && data.bgColor !== bgColor) setBgColor(data.bgColor);
        if (data.textColor && data.textColor !== textColor) setTextColor(data.textColor);
    }, [data, text, fontSize, bgColor, textColor]);

    // Close pickers when clicking outside or pressing Escape
    useEffect(() => {
        if (!showBgPicker && !showTextPicker) return;
        function onDocDown(e) {
            if (bgPortalRef.current && bgPortalRef.current.contains(e.target)) return;
            if (textPortalRef.current && textPortalRef.current.contains(e.target)) return;
            setShowBgPicker(false);
            setShowTextPicker(false);
        }
        function onKey(e) {
            if (e.key === 'Escape') {
                setShowBgPicker(false);
                setShowTextPicker(false);
            }
        }
        document.addEventListener('mousedown', onDocDown);
        document.addEventListener('touchstart', onDocDown);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onDocDown);
            document.removeEventListener('touchstart', onDocDown);
            document.removeEventListener('keydown', onKey);
        };
    }, [showBgPicker, showTextPicker]);

    // Ensure AutoTextSize recalculates at least once when the node's
    // container size becomes available. Some environments/renderers
    // won't trigger a recalculation until a resize — use a ResizeObserver
    // to detect the initial size and force a remount of AutoTextSize via key.
    useEffect(() => {
        const el = wrapperRef.current;
        if (!el || typeof ResizeObserver === 'undefined') return;
        let observed = false;
        const ro = new ResizeObserver((entries) => {
            if (!entries || entries.length === 0) return;
            if (observed) return;
            observed = true;
            // Use a timestamp key to force AutoTextSize to mount now that
            // the element has a stable size.
            setSizeKey(Date.now());
            ro.disconnect();
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    return (
        <>
            {editable && (
                <>
                    <NodeResizeControl minWidth={50} minHeight={50} style={{ zIndex: 1 }}>
                        <div style={{ position: 'absolute', right: 5, bottom: 5, zIndex: 1000, pointerEvents: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <IoMdResize style={{ transform: 'rotate(90deg)', transformOrigin: 'center', display: 'block', color: "var(--main)" }} />
                        </div>
                    </NodeResizeControl>
                </>
            )}
            {editable && (
                <div
                    style={{
                        position: 'absolute',
                        top: -35,
                        left: 0,
                        right: 0,
                        zIndex: 10,
                        display: 'flex',
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        gap: 6,
                        alignItems: 'center',
                        boxSizing: 'border-box',
                        pointerEvents: 'none',    // allow children to opt into pointer events
                        flexWrap: 'nowrap',       // do not wrap; let items overflow if needed
                        overflow: 'visible',      // show overflowing controls fully
                        whiteSpace: 'nowrap'
                    }}
                >
                    <div style={{ position: 'relative', height: 30, display: 'flex', flexDirection: 'row', alignItems: 'center', zIndex: 20, background: 'var(--accent-highlight)', padding: '4px 6px', boxSizing: 'border-box', gap: 6, borderRadius: 6, pointerEvents: 'auto', flexShrink: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'center', height: '100%' }}>
                            <div style={{ color: 'white', padding: 0, height: '100%', display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
                                <div
                                    ref={swatchBgRef}
                                    style={{ height: "100%", aspectRatio: '1 / 1', padding: 0, border: 0, background: bgColor, borderRadius: 30, cursor: 'pointer', color: getContrastTextColor(bgColor), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 'bold' }}
                                    onClick={() => {
                                        if (swatchBgRef.current) {
                                            const rect = swatchBgRef.current.getBoundingClientRect();
                                            setBgPickerPos({ left: rect.left, top: rect.bottom + 6 });
                                        }
                                        setShowBgPicker(s => !s);
                                    }}
                                >Bg</div>
                                <div
                                    ref={swatchTextRef}
                                    style={{ height: "100%", aspectRatio: '1 / 1', padding: 0, border: 0, background: textColor, borderRadius: 30, cursor: 'pointer', color: getContrastTextColor(textColor), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 'bold' }}
                                    onClick={() => {
                                        if (swatchTextRef.current) {
                                            const rect = swatchTextRef.current.getBoundingClientRect();
                                            setTextPickerPos({ left: rect.left, top: rect.bottom + 6 });
                                        }
                                        setShowTextPicker(s => !s);
                                    }}
                                    title="Toggle text color picker"
                                >Txt</div>
                            </div>
                        </div>
                    </div>

                    <div style={{ height: 30, display: 'flex', flexDirection: 'row', alignItems: 'center', zIndex: 20, background: 'var(--accent-highlight)', padding: '4px 6px', boxSizing: 'border-box', gap: 6, borderRadius: 6, pointerEvents: 'auto', flexShrink: 0 }}>
                        <MdDelete onClick={() => { if (typeof data.onDelete === 'function') data.onDelete(id); }} style={{ height: '100%', width: 'auto', color: 'white', padding: 2, border: 0, background: 'var(--cancel-highlight)', borderRadius: 30, cursor: 'pointer' }} />
                        <MdOutlineDragIndicator style={{ color: 'black', padding: 0, height: '100%', display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }} />
                    </div>
                </div >
            )
            }
            <div ref={wrapperRef} style={{ position: 'relative', display: 'flex', flexDirection: 'column', height: '100%', width: '100%', gap: 0 }}>
                {editable && <textarea
                    id={id}
                    ref={ref}
                    value={text}
                    onChange={(e) => {
                        if (!editable) return;
                        const v = e.target.value;
                        setText(v);
                        if (typeof data.onChange === 'function') data.onChange(id, { text: v });
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                    onFocus={(e) => e.stopPropagation()}
                    readOnly={!editable}
                    style={{
                        background: bgColor,
                        color: textColor,
                        fontSize: 10,
                        width: '100%',
                        height: `100%`,
                        paddingTop: 8,
                        boxSizing: 'border-box',
                        overflowWrap: 'break-word',
                        whiteSpace: 'pre-wrap',
                        padding: 4,
                        userSelect: 'text',
                        resize: 'none',
                        cursor: 'text',
                        overflow: 'auto'
                    }}
                />
                }
                {!editable &&
                    <AutoTextSize
                        key={sizeKey}
                        mode='box'
                        minFontSizePx={0}
                        maxFontSizePx={50}
                        style={{
                            cursor: 'default',
                            background: bgColor,
                            color: textColor,
                            width: '100%',
                            boxSizing: 'border-box',
                            padding: 6,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            whiteSpace: 'pre-wrap',
                            overflowWrap: 'break-word'
                        }}
                    >{text}
                    </AutoTextSize>}

            </div>
            {
                typeof document !== 'undefined' && showBgPicker && createPortal(
                    <div
                        ref={bgPortalRef}
                        onMouseDown={(e) => e.stopPropagation()}
                        onPointerDown={(e) => e.stopPropagation()}
                        style={{ position: 'fixed', left: bgPickerPos.left, top: bgPickerPos.top, zIndex: 9999, boxShadow: '0 6px 22px rgba(0,0,0,0.2)' }}
                    >
                        <ChromePicker
                            color={bgColor}
                            onChangeComplete={(color) => {
                                setBgColor(color.hex);
                                if (typeof data.onChange === 'function') data.onChange(id, { bgColor: color.hex });
                            }}
                        />
                    </div>,
                    document.body
                )
            }

            {
                typeof document !== 'undefined' && showTextPicker && createPortal(
                    <div
                        ref={textPortalRef}
                        onMouseDown={(e) => e.stopPropagation()}
                        onPointerDown={(e) => e.stopPropagation()}
                        style={{ position: 'fixed', left: textPickerPos.left, top: textPickerPos.top, zIndex: 9999, boxShadow: '0 6px 22px rgba(0,0,0,0.2)' }}
                    >
                        <ChromePicker
                            color={textColor}
                            onChangeComplete={(color) => {
                                setTextColor(color.hex);
                                if (typeof data.onChange === 'function') data.onChange(id, { textColor: color.hex });
                            }}
                        />
                    </div>,
                    document.body
                )
            }
        </>
    );
}