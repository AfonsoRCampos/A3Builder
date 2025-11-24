import React from 'react';
import { NodeResizeControl } from '@xyflow/react';
import { IoMdResize } from "react-icons/io";
import { MdDelete, MdOutlineDragIndicator } from "react-icons/md";
import Image from 'next/image';

export default function ImgNode({ id, data = {} }) {
    const editable = !!data.editable;

    const src = data?.image || '';
    return (
        <div style={{ position: 'relative', background: '#fff', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {editable && (
                <>
                    <NodeResizeControl minWidth={50} minHeight={50} keepAspectRatio={true} style={{ background: 'transparent', border: 'none' }}>
                        <IoMdResize style={{ transform: 'rotate(90deg)', transformOrigin: 'center', display: 'block', position: 'absolute', right: 5, bottom: 5, color: "var(--main)" }} />
                    </NodeResizeControl>
                    <div style={{ position: 'absolute', top: -35, left: 0, height: 30, display: 'flex', flexDirection: 'row', alignItems: 'center', zIndex: 20, background: 'var(--accent-highlight)', padding: '4px 6px', boxSizing: 'border-box', width: 'min-content', gap: 6, borderRadius: 6 }}>
                        <MdDelete onClick={() => { if (typeof data.onDelete === 'function') data.onDelete(id); }} style={{ height: '100%', width: 'auto', color: 'white', padding: 2, border: 0, background: 'var(--cancel-highlight)', borderRadius: 30, cursor: 'pointer' }} />
                        <MdOutlineDragIndicator style={{ color: 'black', padding: 0, height: '100%', display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }} />
                    </div>
                </>
            )}

            {src ? <Image src={src} alt={data.name || 'image'} style={{ width: '100%', height: '100%', objectFit: 'fill', display: 'block', cursor: 'default' }} /> : <div style={{ color: '#666' }}>No image</div>}
        </div>
    );
}
