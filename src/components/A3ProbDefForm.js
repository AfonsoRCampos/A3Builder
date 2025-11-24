"use client";
import React, { useState, useEffect, useRef } from 'react';
import InputText from './InputText';
import Select from 'react-select';
import 'quill/dist/quill.snow.css';

function RichText({ value, onChange, placeholder }) {
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

const A3ProbDefForm = ({ probDef, lag, end, setA3 }) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div
            style={{
                width: '100%',
                minHeight: '100%',
                height: 'auto',
                padding: '1em',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
            }}
        >
            <div>
                <label htmlFor="a3-lag" style={{ fontWeight: 'bold' }}>Main Goal</label>
                <div style={{ marginLeft: '1em', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', fontWeight: 'normal' }}>
                        We want to change{' '}
                        <InputText
                            id="a3-metric-name"
                            value={lag.metricName || ''}
                            onChange={e => setA3(prev => {
                                const val = e?.target?.value ?? '';
                                const prevLag = prev.metrics?.lag || {};
                                const newLag = { ...prevLag, metricName: val };
                                // if either name or unit is missing, clear the initial value
                                if (!val || !newLag.unit) newLag.initial = '';
                                return { ...prev, metrics: { ...prev.metrics, lag: newLag } };
                            })}
                            placeholder="Metric"
                            width="8em"
                            style={{ display: 'inline-block', marginLeft: '0.5em', textAlign: 'center' }}
                            height='1.7em'
                        />
                        , which is measured in{' '}
                        <InputText
                            id="a3-metric-unit"
                            value={lag.unit || ''}
                            onChange={e => setA3(prev => {
                                const val = e?.target?.value ?? '';
                                const prevLag = prev.metrics?.lag || {};
                                const newLag = { ...prevLag, unit: val };
                                // if either name or unit is missing, clear the initial value
                                if (!val || !newLag.metricName) newLag.initial = '';
                                return { ...prev, metrics: { ...prev.metrics, lag: newLag } };
                            })}
                            placeholder="Unit"
                            width="4em"
                            style={{ display: 'inline-block', marginLeft: '0.5em', textAlign: 'center' }}
                            height='1.7em'
                        />.
                    </span>
                    {lag.metricName && lag.unit && (
                        <span style={{ display: 'flex', alignItems: 'center', fontWeight: 'normal' }}>
                            At the time of the project&apos;s starting date,&nbsp;
                            <b>{lag.metricName}</b>
                            <>&nbsp;was</>
                            <InputText
                                id="a3-metric-value"
                                type="number"
                                inputMode="decimal"
                                value={lag.initial || ''}
                                onChange={e => {
                                    const raw = e?.target?.value ?? '';
                                    // normalize numeric input: convert commas, accept finite numbers, otherwise store empty string
                                    let parsed = '';
                                    if (raw !== null && raw !== '') {
                                        const n = Number(String(raw).replace(',', '.'));
                                        parsed = Number.isFinite(n) ? n : '';
                                    }
                                    setA3(prev => ({
                                        ...prev,
                                        metrics: { ...prev.metrics, lag: { ...prev.metrics.lag, initial: parsed } }
                                    }));
                                }}
                                placeholder="Init. Val."
                                width="7em"
                                style={{ display: 'inline-block', marginLeft: '0.5em', marginRight: '0.5em', textAlign: 'center' }}
                                height='1.7em'
                                step="any"
                            />
                            <b>{lag.unit}.</b>
                        </span>
                    )}
                    {(!lag.metricName || !lag.unit) && (
                        <span style={{ display: 'flex', fontWeight: 'normal', flexWrap: 'wrap', flexDirection: 'column', gap: '6px' }}>
                            <b>Not sure yet?</b>
                            <div>
                                Try briefly describing the Initial Problem
                                <InputText
                                    id="a3-metric-placeholder-initial"
                                    value={lag.placeholder.initial || ''}
                                    onChange={e => setA3(prev => ({
                                        ...prev,
                                        metrics: { ...prev.metrics, lag: { ...prev.metrics.lag, placeholder: { ...prev.metrics.lag.placeholder, initial: e.target.value } } }
                                    }))}
                                    placeholder="Initial State/Problem"
                                    width="11em"
                                    style={{ marginLeft: '0.5em', textAlign: 'center' }}
                                    height='1.7em'
                                />,
                            </div>
                            <div>the Final Solution
                                <InputText
                                    id="a3-metric-placeholder-target"
                                    value={lag.placeholder.target || ''}
                                    onChange={e => setA3(prev => ({
                                        ...prev,
                                        metrics: { ...prev.metrics, lag: { ...prev.metrics.lag, placeholder: { ...prev.metrics.lag.placeholder, target: e.target.value } } }
                                    }))}
                                    placeholder="Final State/Solution"
                                    width="11em"
                                    style={{ marginLeft: '0.5em', textAlign: 'center' }}
                                    height='1.7em'
                                />,
                            </div>
                            <div>and the expected change
                                <InputText
                                    id="a3-metric-placeholder-gap"
                                    value={lag.placeholder.gap || ''}
                                    onChange={e => setA3(prev => ({
                                        ...prev,
                                        metrics: { ...prev.metrics, lag: { ...prev.metrics.lag, placeholder: { ...prev.metrics.lag.placeholder, gap: e.target.value } } }
                                    }))}
                                    placeholder="Expected Change"
                                    width="11em"
                                    style={{ marginLeft: '0.5em', textAlign: 'center' }}
                                    height='1.7em'
                                />.
                            </div>
                            <div>
                                You expect to see a(n)
                                <div style={{
                                    width: '11.5em',
                                    marginLeft: '0.5em',
                                    display: 'inline-block',
                                }}
                                    onMouseEnter={() => setIsHovered(true)}
                                    onMouseLeave={() => setIsHovered(false)}
                                >
                                    <Select
                                        id="a3-metric-placeholder-up"
                                        value={
                                            typeof lag.placeholder.up === 'boolean'
                                                ? (lag.placeholder.up
                                                    ? { value: true, label: 'Increase' }
                                                    : { value: false, label: 'Decrease' })
                                                : null
                                        }
                                        onChange={option => setA3(prev => ({
                                            ...prev,
                                            metrics: {
                                                ...prev.metrics,
                                                lag: {
                                                    ...prev.metrics.lag,
                                                    placeholder: {
                                                        ...prev.metrics.lag.placeholder,
                                                        up: option ? option.value : null
                                                    }
                                                }
                                            }
                                        }))}
                                        options={[
                                            { value: true, label: 'Increase' },
                                            { value: false, label: 'Decrease' }
                                        ]}
                                        isClearable
                                        placeholder="Select..."
                                        styles={{
                                            control: base => ({
                                                ...base,
                                                minHeight: '1.7em',
                                                height: '1.7em',
                                                border: `1px solid var(--main)`,
                                                background: isHovered ? 'var(--accent)' : 'white',
                                                borderRadius: '6px',
                                                fontSize: '1em',
                                                transition: 'background 0.2s, border-color 0.2s',
                                                boxSizing: 'border-box'
                                            }),
                                            valueContainer: base => ({ ...base, height: '1.7em', padding: '0 6px' }),
                                            input: base => ({ ...base, margin: 0, padding: 0 }),
                                            indicatorsContainer: base => ({ ...base, height: '1.7em' })
                                        }}
                                    />
                                </div>
                            </div>
                        </span>
                    )}

                </div>
            </div>
            <div>
                <label htmlFor="a3-why" style={{ fontWeight: 'bold' }}>Why?</label>
                <InputText
                    id="a3-title"
                    value={probDef.why}
                    onChange={e => setA3(prev => ({
                        ...prev,
                        probDef: { ...prev.probDef, why: e.target.value }
                    }))}
                    placeholder="Why do we need to address this problem?"
                />
            </div>
            <div>
                <label htmlFor="a3-where" style={{ fontWeight: 'bold' }}>Where?</label>
                <InputText
                    id="a3-where"
                    value={probDef.where}
                    onChange={e => setA3(prev => ({
                        ...prev,
                        probDef: { ...prev.probDef, where: e.target.value }
                    }))}
                    placeholder="Where is the problem occurring?"
                />
            </div>
            <div>
                <label htmlFor="a3-extra" style={{ fontWeight: 'bold', display: 'block', marginBottom: 6 }}>Additional Comments (optional)</label>
                <div style={{ border: '1px solid var(--main)', borderRadius: 6, overflow: 'hidden' }}>
                    <RichText
                        value={probDef.extra || ''}
                        onChange={val => setA3(prev => ({
                            ...prev,
                            probDef: { ...prev.probDef, extra: val }
                        }))}
                        placeholder="Optional"
                    />
                </div>
            </div>
        </div >
    );
};

export default A3ProbDefForm;

