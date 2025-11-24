'use client';
import React, { useEffect } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import A3Preview from '@/components/A3Preview';

const FORMATS_MM = {
    A4: [297, 210],
    A3: [420, 297],
    A0: [1189, 841]
};

export default function A3Downloader({ a3, format = 'A3', dpi = 96, onFinish }) {
    const mmToPx = (mm, dpi) => Math.round((mm * dpi) / 25.4);
    const size = FORMATS_MM[format] || FORMATS_MM.A3;
    const [wPx, hPx] = size.map(mm => mmToPx(mm, dpi));

    const downloadPdf = async () => {
        try {
            const container = document.getElementById('a3-downloader');
            if (!container) throw new Error('Download container not found');

            // Give layout/paint one tick to complete
            await new Promise(r => setTimeout(r, 80));

            const canvas = await html2canvas(container, { useCORS: true, scale: 2 });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [size[0], size[1]] });
            // Add image sized to exact mm dimensions of the PDF
            pdf.addImage(imgData, 'PNG', 0, 0, size[0], size[1]);
            pdf.save(`${a3?.header?.id || 'a3-export'}_${format}.pdf`);

            // After saving the PDF, also download any attachments (if present)
            try {
                const atts = Array.isArray(a3?.header?.attachments) ? a3.header.attachments : [];
                for (const att of atts) {
                    try {
                        const resp = await fetch(att.url);
                        if (!resp.ok) continue;
                        const blob = await resp.blob();
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = att.name || (att.url.split('/').pop() || 'file');
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                        window.URL.revokeObjectURL(url);
                        // small delay between downloads to avoid browser throttling
                        await new Promise(r => setTimeout(r, 150));
                    } catch (e) {
                        // swallow per-file errors
                        // console.warn('attachment download failed', att, e);
                    }
                }
            } catch (e) {
                // swallow attachment loop errors
            }
        } catch (e) {
            // swallow errors silently for now; caller can handle if needed
            // console.error('A3Downloader error', e);
        }
    };

    useEffect(() => {
        if (!a3) return;
        let mounted = true;
        (async () => {
            // ensure render finished
            await new Promise(r => setTimeout(r, 120));
            if (!mounted) return;
            await downloadPdf();
            if (mounted && typeof onFinish === 'function') onFinish();
        })();
        return () => { mounted = false; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [a3, format, dpi]);

    return (
        <>
            <div id={'a3-downloader'} style={{
                position: 'fixed',
                left: '-10000px',
                top: '0',
                width: `${wPx}px`,
                height: `${hPx}px`,
                overflow: 'hidden',
            }}>
                <A3Preview
                    a3={a3}
                    setA3={() => { }}
                    activeArea={null}
                    setActiveArea={() => { }}
                    editable={false}
                    owner={false}
                    print={true}
                />
            </div>
        </>
    );
}
