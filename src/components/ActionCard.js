import React from 'react';
import Select from 'react-select';
import DatePicker from "react-datepicker";
import { Slider } from 'rsuite';
import { toFullName } from '@/utils/Utils';
import InputText from './InputText';
import { MdDelete } from "react-icons/md";
import "react-datepicker/dist/react-datepicker.css";
import './ActionCard.css';

export default function ActionCard({ action, team = [], weighted = false, startDate = null, endDate = null, onChange = () => { }, onDelete = () => { }, currentUser = null, a3Owner = null }) {

    const handleField = (field, value) => {
        onChange({ [field]: value });
    };

    const teamOptions = team.map(emp => ({ value: emp, label: toFullName(emp) }));

    // Simple native segmented control for Effort (low, medium, high)
    function SegmentedEffort({ value, field }) {
        const options = ['low', 'medium', 'high'];
        return (
            <div className="segmented-weight" role="tablist" aria-label="Effort">
                {options.map(opt => (
                    <button
                        key={opt}
                        type="button"
                        className={`seg-btn ${value === opt ? 'active' : ''} ${opt === 'low' ? 'bg-green' : opt === 'medium' ? 'bg-orange' : opt === 'high' ? 'bg-red' : ''}`}
                        onClick={() => { if (editable) handleField(field, opt); }}
                        disabled={!editable}
                        aria-pressed={value === opt}
                        style={{ cursor: editable ? 'pointer' : 'not-allowed' }}
                    >
                        {opt[0].toUpperCase() + opt.slice(1)}
                    </button>
                ))}
            </div>
        );
    }

    const styles = {
        control: (base) => ({
            ...base,
            background: 'white', // selector background
            border: `1px solid var(--green)`,
            borderRadius: '6px',
            transition: "background 0.2s, border-color 0.2s",
            boxSizing: "border-box",
            '&:hover': {
                background: 'var(--green-highlight)',
            },
        }),
        value: (base, state) => {
            return state.data.value === header.owner
                ? { ...base, background: 'var(--green)' }
                : { ...base, background: 'var(--green-highlight)' };
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

    // determine permissions
    const editable = Boolean(currentUser && (currentUser === a3Owner || currentUser === action.owner));
    const ownerChangeAllowed = Boolean(currentUser && currentUser === a3Owner);

    return (
        <div style={{ width: '100%', border: '2px solid var(--green)', padding: '10px 20px', borderRadius: 6, display: 'flex', flexDirection: 'column', gap: 4, boxSizing: 'border-box', background: 'white', cursor: editable ? 'pointer' : 'not-allowed' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 'bold' }}>Action #{action.id}</div>
                <button
                    type="button"
                    onClick={() => { if (editable) onDelete(action.id); }}
                    aria-label="Delete metric"
                    style={{
                        background: editable ? 'var(--cancel)' : 'rgba(0,0,0,0.08)',
                        height: '25px',
                        color: 'white',
                        aspectRatio: '1/1',
                        borderRadius: '30px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: 0,
                        border: 'none',
                        cursor: editable ? 'pointer' : 'not-allowed'
                    }}
                    disabled={!editable}
                >
                    <MdDelete />
                </button>
            </div>

            <div>
                <label style={{ fontSize: 12, color: '#444' }}>Description</label>
                <InputText value={action.description || ''} onChange={(e) => { if (editable) handleField('description', e.target.value); }} placeholder="Describe the action..." style={{ width: '100%', boxSizing: 'border-box', resize: 'none', cursor: editable ? 'pointer' : 'not-allowed' }}
                    borderColor='var(--green)' hoverColor='var(--green-highlight)' disabled={!editable} aria-disabled={!editable} />
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
                <label style={{ fontSize: 12, color: '#444' }}>Owner</label>
                <Select
                    options={teamOptions}
                    closeMenuOnSelect={true}
                    value={teamOptions.find(o => o.value === (action.owner)) || null}
                    onChange={selected => { if (ownerChangeAllowed) handleField('owner', selected ? selected.value : null); }}
                    placeholder="Owner"
                    styles={styles}
                    isDisabled={!ownerChangeAllowed}
                />
            </div>

            <div style={!(startDate && endDate) ? { opacity: 0.5, cursor: 'not-allowed' } : {}}>
                <label style={{ fontSize: 12, color: '#444' }}>Limit</label>
                <DatePicker
                    showIcon
                    dateFormat='dd/MM/yyyy'
                    selected={action.limit ? (action.limit instanceof Date ? action.limit : new Date(action.limit)) : endDate}
                    onChange={(value) => { if (ownerChangeAllowed) handleField('limit', value); }}
                    minDate={startDate}
                    maxDate={endDate}
                    className="custom-date-input"
                    wrapperClassName="custom-date-wrapper"
                    width="100%"
                    disabled={!startDate || !endDate || !ownerChangeAllowed}
                    style={!(startDate && endDate && ownerChangeAllowed) ? { cursor: 'not-allowed' } : {}}
                />
            </div>

            <div>
                <label style={{ fontSize: 12, color: '#444', marginBottom: 10 }}>Progress</label>
                <Slider
                    className="action-slider"
                    style={{ width: '100%' }}
                    value={typeof action.progress === 'number' ? Math.round(action.progress * 100) : 0}
                    max={100}
                    step={25}
                    graduated
                    progress
                    renderMark={(mark) => `${mark}%`}
                    onChange={(value) => { if (editable) handleField('progress', value / 100); }}
                    disabled={!editable}
                />
            </div>

            {weighted && (
                <div>
                    <label style={{ fontSize: 12, color: '#444' }}>Effort</label>
                    <SegmentedEffort value={action.weight || null} field='weight' disabled={!editable} />
                </div>
            )}

        </div>
    );
}
