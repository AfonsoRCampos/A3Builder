import React, { useState, useEffect } from 'react';
import InputText from './InputText';
import Select from 'react-select';
import { useEmployees } from '@/state/EmployeesContext';
import { useUser } from '@/state/UserContext';
import FilePickerModal from './FilePickerModal';
import { toFullName } from '@/utils/Utils';
import { DateRangePicker } from 'rsuite';
import './A3HeaderForm.css';

function spanSummary(start, end) {
    try {
        const s = new Date(start);
        const e = new Date(end);
        const utcS = Date.UTC(s.getFullYear(), s.getMonth(), s.getDate());
        const utcE = Date.UTC(e.getFullYear(), e.getMonth(), e.getDate());
        const msPerDay = 24 * 60 * 60 * 1000;
        const days = Math.floor((utcE - utcS) / msPerDay) + 1;
        const weeks = Math.floor(days / 7);
        const months = Math.max(1, Math.round(days / 30));
        return `${days} day${days > 1 ? 's' : ''}, ${weeks} week${weeks !== 1 ? 's' : ''}, ${months} month${months !== 1 ? 's' : ''}`;
    } catch (e) {
        return '';
    }
}

// Coerce various date representations into a valid Date instance or null
function toDateSafe(v) {
    if (!v) return null;
    if (v instanceof Date) {
        return isNaN(v.getTime()) ? null : v;
    }
    try {
        const d = new Date(v);
        return isNaN(d.getTime()) ? null : d;
    } catch (e) {
        return null;
    }
}

const A3HeaderForm = ({ header, setA3 }) => {
    const { employees } = useEmployees();
    const [allA3s, setAllA3s] = useState([]);
    const { user } = useUser();
    const [filePickerOpen, setFilePickerOpen] = useState(false);

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const res = await fetch('/api/a3s');
                if (!res.ok) return;
                const data = await res.json();
                if (mounted) setAllA3s(Array.isArray(data) ? data : []);
            } catch (e) {
                console.error('Failed to load A3s for refs', e);
            }
        })();
        return () => { mounted = false; };
    }, []);

    const teamOptions = employees
        .filter(emp => emp !== header.owner)
        .map(emp => ({ value: emp, label: toFullName(emp) }));

    const styles = {
        control: (base) => ({
            ...base,
            background: 'white', // selector background
            border: `1px solid var(--main)`,
            borderRadius: '6px',
            transition: "background 0.2s, border-color 0.2s",
            boxSizing: "border-box",
            '&:hover': {
                background: 'var(--blue-hover)',
            },
        }),
        multiValue: (base, state) => {
            return state.data.value === header.owner
                ? { ...base, background: 'var(--blue)' }
                : { ...base, background: 'var(--blue-highlight)' };
        },
        multiValueLabel: (base, state) => {
            return state.data.value === header.owner
                ? { ...base, fontWeight: 'bold', color: 'white' }
                : { ...base };
        },
        multiValueRemove: (base, state) => {
            return state.data.value === header.owner
                ? { ...base, display: 'none' }
                : { ...base };
        },
        menuPortal: (base) => ({
            ...base,
            zIndex: 999999,
            overflow: 'visible'
        }),
        menu: (base) => ({
            ...base,
            zIndex: 999999,
            fontSize: 12,
            padding: 0,
            overflow: 'visible'
        }),
    };

    // Build options for references select (exclude current A3 id)
    const refOptions = (allA3s || [])
        .filter(a => a && a.header && a.header.id && a.header.id !== header.id)
        .map(a => ({ value: a.header.id, label: `${a.header.id} — ${a.header.title || '(untitled)'}` }));

    const findOptionByValue = (val) => refOptions.find(o => o.value === val) || { value: val, label: val };

    return (
        <div
            style={{
                width: '100%',
                minHeight: '100%',
                height: 'min-content',
                padding: '1em',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                overflow: 'none'
            }}
        >
            <div>
                <label htmlFor="a3-title" style={{ fontWeight: 'bold' }}>Title:</label>
                <InputText
                    id="a3-title"
                    value={header.title}
                    onChange={e => setA3(prev => ({
                        ...prev,
                        header: { ...prev.header, title: e.target.value }
                    }))}
                    hoverColor='var(--blue-hover)'
                    placeholder="Enter A3 title."
                />
            </div>
            <div>
                <label style={{ fontWeight: 'bold' }}>Team Members:</label>
                <Select
                    isMulti
                    options={teamOptions}
                    closeMenuOnSelect={false}
                    value={header.team.map(member => ({ value: member, label: toFullName(member) }))}
                    isClearable={option => option.value !== header.owner}
                    styles={styles}
                    onChange={selected =>
                        setA3(prev => ({
                            ...prev,
                            header: {
                                ...prev.header,
                                team: [header.owner, ...selected.map(opt => opt.value !== header.owner ? opt.value : null).filter(Boolean)]
                            }
                        }))
                    }
                />
            </div>
            <div>
                <label style={{ fontWeight: 'bold' }}>
                    Project Start and End Dates
                    {header.start && header.end ? (
                        <span style={{ fontWeight: 400, marginLeft: 8, color: '#555', fontSize: '0.9em' }}>
                            — {spanSummary(header.start, header.end)}
                        </span>
                    ) : null}
                </label>
                <DateRangePicker
                    block
                    className='custom-date-range'
                    format='dd/MM/yyyy'
                    placeholder='Select start and end dates.'
                    // ensure DateRangePicker always receives Date instances (handles when header values are strings)
                    value={(() => {
                        const s = toDateSafe(header.start);
                        const e = toDateSafe(header.end);
                        return s && e ? [s, e] : null;
                    })()}
                    onChange={range => {
                        setA3(prev => ({
                            ...prev,
                            header: {
                                ...prev.header,
                                start: range && range[0] ? range[0] : null,
                                end: range && range[1] ? range[1] : null
                            }
                        }));
                    }}
                    character=' to '
                />
            </div>
            <div>
                <label style={{ fontWeight: 'bold' }}>References</label>
                <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>Link this A3 to other A3s. Search by ID or title.</div>
                <Select
                    isMulti
                    options={refOptions}
                    closeMenuOnSelect={false}
                    value={(Array.isArray(header.refs) ? header.refs : []).map(r => findOptionByValue(r))}
                    styles={styles}
                    filterOption={(option, input) => {
                        if (!input) return true;
                        const q = input.toLowerCase();
                        return (option.label || '').toLowerCase().includes(q) || (option.value || '').toLowerCase().includes(q);
                    }}
                    onChange={async (selected) => {
                        // selected is an array of option objects
                        const newRefs = (selected || []).map(s => s.value);
                        const prevRefs = Array.isArray(header.refs) ? header.refs : [];
                        const added = newRefs.filter(x => !prevRefs.includes(x));
                        const removed = prevRefs.filter(x => !newRefs.includes(x));

                        // update local state immediately
                        setA3(prev => ({
                            ...prev,
                            header: {
                                ...prev.header,
                                refs: newRefs
                            }
                        }));

                        // if this A3 is already saved (has an id), sync with server
                        try {
                            const sourceId = header && header.id ? header.id : null;
                            if (sourceId) {
                                if (added.length) {
                                    await fetch('/api/a3s/refs', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ sourceId, targets: added, action: 'add' })
                                    });
                                }
                                if (removed.length) {
                                    await fetch('/api/a3s/refs', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ sourceId, targets: removed, action: 'remove' })
                                    });
                                }
                            }
                        } catch (e) {
                            console.error('Failed to sync refs from header form', e);
                        }
                    }}
                    placeholder='Search A3 by id or title...'
                    menuPortalTarget={document.body}
                />
                </div>

                <div>
                    <label style={{ fontWeight: 'bold' }}>Attachments</label>
                    <div style={{ fontSize: 12, color: '#666', marginBottom: 6 }}>Upload files (images, pdf, docs) and attach to this A3.</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 8 }}>
                        {(Array.isArray(header.attachments) && header.attachments.length > 0) ? (
                            header.attachments.map((att, idx) => (
                                <div key={`att-${idx}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'white', padding: '4px 6px', borderRadius: 6, border: '1px solid var(--blue-dark)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <div style={{ width: 30, aspectRatio: '1 / 1', background: 'var(--blue)', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                                            <span style={{ fontSize: 12 }}>{(att.name || '').split('.').pop()}</span>
                                        </div>
                                        <div style={{ fontSize: 13 }}>{att.name}</div>
                                    </div>
                                    <div>
                                        <button onClick={() => {
                                            // only remove attachment reference from the A3; do not delete file from disk
                                            setA3(prev => {
                                                const next = typeof structuredClone === 'function' ? structuredClone(prev) : JSON.parse(JSON.stringify(prev));
                                                next.header = next.header || {};
                                                next.header.attachments = Array.isArray(next.header.attachments) ? next.header.attachments.slice() : [];
                                                next.header.attachments.splice(idx, 1);
                                                return next;
                                            });
                                        }} style={{ padding: '3px 4px', borderRadius: 6, background: 'var(--cancel)', color: 'white', border: 'none', cursor: 'pointer' }}>Remove</button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div style={{ color: '#666', fontSize: 13 }}>No attachments</div>
                        )}
                    </div>
                    <div>
                        <button onClick={() => setFilePickerOpen(true)} style={{ padding: '3px 8px', borderRadius: 6, background: 'var(--blue)', color: 'white', border: '1px solid var(--blue-dark)', cursor: 'pointer' }}>Add file</button>
                    </div>
                    <FilePickerModal open={filePickerOpen} onCancel={() => setFilePickerOpen(false)} accept='*/*' onConfirm={(f) => {
                        // f: { name, url }
                        const att = { id: f.name, name: f.name, url: f.url, uploadedBy: user || null, uploadedAt: new Date().toISOString() };
                        setA3(prev => {
                            const next = typeof structuredClone === 'function' ? structuredClone(prev) : JSON.parse(JSON.stringify(prev));
                            next.header = next.header || {};
                            next.header.attachments = Array.isArray(next.header.attachments) ? next.header.attachments.slice() : [];
                            next.header.attachments.push(att);
                            return next;
                        });
                        setFilePickerOpen(false);
                    }} />
            </div>
        </div>
    );
};

export default A3HeaderForm;
