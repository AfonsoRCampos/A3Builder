"use client";
import React, { useEffect, useRef } from 'react';
import 'quill/dist/quill.snow.css';

export default function RichText({ value, onChange, placeholder }) {
    const containerRef = useRef(null);
    const quillRef = useRef(null);

    useEffect(() => {
        let mounted = true;
        let Quill;
        (async () => {
            const mod = await import('quill');
            Quill = mod.default || mod;
            if (!mounted || !containerRef.current) return;
            quillRef.current = new Quill(containerRef.current, {
                theme: 'snow',
                modules: { toolbar: [['bold', 'italic', 'underline'], ['link']] }
            });
            quillRef.current.root.setAttribute('data-placeholder', placeholder || '');
            try {
                const createDOMPurify = (await import('dompurify')).default;
                const DOMPurify = createDOMPurify(window);
                quillRef.current.clipboard.dangerouslyPasteHTML(DOMPurify.sanitize(value || ''));
            } catch (e) {
                quillRef.current.clipboard.dangerouslyPasteHTML(value || '');
            }
            quillRef.current.on('text-change', async () => {
                const html = quillRef.current.root.innerHTML;
                try {
                    const createDOMPurify = (await import('dompurify')).default;
                    const DOMPurify = createDOMPurify(window);
                    const clean = DOMPurify.sanitize(html === '<p><br></p>' ? '' : html);
                    onChange && onChange(clean);
                } catch (e) {
                    onChange && onChange(html === '<p><br></p>' ? '' : html);
                }
            });
        })();

        return () => { mounted = false; try { quillRef.current && quillRef.current.off && quillRef.current.off('text-change'); } catch (e) {} };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // keep value in sync when parent changes it externally
    useEffect(() => {
        try {
            if (quillRef.current && typeof value === 'string') {
                const current = quillRef.current.root.innerHTML || '';
                if (value !== current) quillRef.current.clipboard.dangerouslyPasteHTML(value || '');
            }
        } catch (e) { }
    }, [value]);

    return <div style={{ backgroundColor: 'white', cursor: 'text' }}>
        <div ref={containerRef} />
    </div>;
}
