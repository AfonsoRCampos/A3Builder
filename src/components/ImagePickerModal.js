"use client";

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';

export default function ImagePickerModal({ open = false, onConfirm = () => {}, onCancel = () => {} }) {
  const [images, setImages] = useState([]); // { id, src, name, file? }
  const [selectedId, setSelectedId] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    // reset selection when opened
    setSelectedId(null);
    // load persisted images from API
    (async () => {
      try {
        const res = await fetch('/api/images');
        if (!res.ok) throw new Error('failed to load images');
        const json = await res.json();
        const items = (json.images || []).map((it, idx) => ({ id: `i-${idx}-${it.name}`, src: it.url, name: it.name, persisted: true }));
        setImages(items);
      } catch (err) {
        console.warn('Could not load images', err);
        setImages([]);
      }
    })();
  }, [open]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onCancel();
      if (e.key === 'Enter' && selectedId) {
        const img = images.find(i => i.id === selectedId);
        if (img) onConfirm(img);
      }
    }
    if (!open) return;
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, selectedId, images, onCancel, onConfirm]);

  if (!open) return null;

  const handleUploadCardClick = () => {
    if (inputRef.current) inputRef.current.click();
  };

  const readFileAsDataURL = (file) => new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = reject;
    fr.readAsDataURL(file);
  });

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, zIndex: 1400, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div role="dialog" aria-modal="true" style={{ width: 880, maxWidth: '96%', maxHeight: '86%', background: 'white', padding: 14, borderRadius: 8, boxShadow: '0 10px 40px rgba(0,0,0,0.35)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0 }}>Select Image</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onCancel} aria-label="Close" style={{ background: 'transparent', border: 'none', fontSize: 16, cursor: 'pointer' }}>✕</button>
          </div>
        </div>

        <div style={{ marginTop: 12, overflow: 'hidden', flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ overflowY: 'auto', padding: 6 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
              {/* Upload card */}
                        <div onClick={handleUploadCardClick} style={{ minHeight: 120, border: '1px dashed #bbb', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 8 }}>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 28, marginBottom: 6 }}>⬆</div>
                            <div style={{ fontSize: 13, color: '#333' }}>Upload image</div>
                            <div style={{ fontSize: 12, color: '#666' }}>PNG, JPG, GIF (max 8MB)</div>
                          </div>
                        </div>
                        <input ref={inputRef} type="file" accept="image/*" onChange={async (e) => {
                          const files = Array.from(e.target.files || []);
                          for (const f of files) {
                            try {
                              const dataUrl = await readFileAsDataURL(f);
                              const res = await fetch('/api/upload', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ filename: f.name, data: dataUrl }) });
                              if (!res.ok) throw new Error('upload failed');
                              const json = await res.json();
                              const newItem = { id: `p-${Date.now()}-${json.filename}`, src: json.url, name: json.filename, persisted: true };
                              setImages(prev => [newItem, ...prev]);
                              setSelectedId(newItem.id);
                            } catch (err) {
                              console.error('Upload failed', err);
                            }
                          }
                        }} style={{ display: 'none' }} />

              {/* Image cards */}
              {images.length === 0 && (
                <div style={{ gridColumn: '1/-1', color: '#666', padding: 8 }}>No images yet. Use the Upload card to add images.</div>
              )}

              {images.map(img => (
                <div key={img.id} onClick={() => setSelectedId(img.id)} onDoubleClick={() => { setSelectedId(img.id); onConfirm(img); }} style={{ border: selectedId === img.id ? '2px solid var(--main)' : '1px solid #ddd', borderRadius: 8, overflow: 'hidden', cursor: 'pointer', display: 'flex', flexDirection: 'column', background: '#fafafa' }}>
                  <div style={{ width: '100%', aspectRatio: '4/3', background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Image src={img.src} alt={img.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'cover', display: 'block' }} />
                  </div>
                  <div style={{ padding: 8, fontSize: 12, color: '#333', display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{img.name || 'image'}</div>
                    <div style={{ marginLeft: 8 }}>
                      <button onClick={(e) => { e.stopPropagation(); setSelectedId(img.id); onConfirm(img); }} style={{ padding: '6px 8px' }}>Choose</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>, document.body
  );
}
