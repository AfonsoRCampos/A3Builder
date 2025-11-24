"use client";
import React, { useEffect, useState, useRef } from 'react';

export default function FilePickerModal({ open = false, onCancel = () => {}, onConfirm = () => {}, accept = '*' }) {
    const [files, setFiles] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [selectedFileName, setSelectedFileName] = useState('');
    const fileRef = useRef(null);

    useEffect(() => {
        if (!open) return;
        let mounted = true;
        (async () => {
            try {
                const res = await fetch('/api/files/list');
                if (!res.ok) return;
                const data = await res.json();
                if (mounted) setFiles(Array.isArray(data.files) ? data.files : []);
            } catch (e) {
                console.error('Failed to list files', e);
            }
        })();
        return () => { mounted = false; };
    }, [open]);

    const handleFileInput = async (ev) => {
        const f = ev.target.files && ev.target.files[0];
        if (!f) return;
        try {
            setSelectedFileName(f.name);
            setUploading(true);
            const reader = new FileReader();
            const dataUrl = await new Promise((resolve, reject) => {
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(f);
            });
            const body = { filename: f.name, data: dataUrl };
            const res = await fetch('/api/files/upload', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            if (!res.ok) {
                const txt = await res.text().catch(() => '');
                throw new Error('Upload failed ' + res.status + ' ' + txt);
            }
            const json = await res.json();
            const newItem = { name: json.filename, url: json.url };
            setFiles(prev => [newItem, ...prev]);
        } catch (e) {
            console.error('Upload error', e);
            alert('Upload failed');
        } finally {
            setUploading(false);
            if (fileRef.current) fileRef.current.value = '';
        }
    };

    if (!open) return null;

    return (
        <div style={{ position: 'fixed', left: 0, top: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 }}>
            <div style={{ width: 640, maxWidth: '95%', background: 'white', borderRadius: 8, padding: 16, boxSizing: 'border-box' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <strong>Select or Upload File</strong>
                    <button onClick={onCancel} style={{ border: 'none', background: 'transparent', cursor: 'pointer', background: 'var(--cancel)', padding: '4px 6px', borderRadius: 6, color: 'white' }}>Close</button>
                </div>
                <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input ref={fileRef} type="file" accept={accept} onChange={handleFileInput} style={{ display: 'none' }} />
                    <button onClick={() => fileRef.current && fileRef.current.click()} style={{ padding: '4px 6px', borderRadius: 6, background: 'var(--blue)', color: 'white', border: 'none', cursor: 'pointer' }}>
                        {uploading ? 'Uploading...' : 'Choose File'}
                    </button>
                    <div style={{ color: '#666', fontSize: 13 }}>{selectedFileName || 'No file chosen'}</div>
                </div>
                <div style={{ maxHeight: '40vh', overflow: 'auto', borderTop: '1px solid var(--blue-dark)', paddingTop: 8 }}>
                    {files.length ? files.map((f, idx) => (
                        <div key={`fp-${idx}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 4px', borderRadius: 6 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{ width: 30, height: 30, background: 'var(--blue)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <span style={{ fontSize: 12 }}>{f.name.split('.').pop()}</span>
                                </div>
                                <div style={{ fontSize: 13 }}>{f.name}</div>
                            </div>
                            <div>
                                <a href={f.url} target="_blank" rel="noreferrer" style={{ padding: '6px 8px', borderRadius: 6, textDecoration: 'none', border: '1px solid var(--blue-dark)', marginRight: 8 }}>Open</a>
                                <button onClick={() => onConfirm({ name: f.name, url: f.url })} style={{ padding: '3px 4px', borderRadius: 6, cursor: 'pointer', background: 'var(--blue)', color: 'white', border: 'none' }}>Choose</button>
                            </div>
                        </div>
                    )) : (<div style={{ color: '#666' }}>No files uploaded yet</div>)}
                </div>
            </div>
        </div>
    );
}
