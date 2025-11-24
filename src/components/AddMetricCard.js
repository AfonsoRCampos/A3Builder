import React from 'react';

const style = {
    border: '2px dashed #bbb',
    borderRadius: 8,
    padding: '12px',
    minHeight: 250,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#ffffffff',
    cursor: 'pointer',
};

export default function AddMetricCard({ onAdd, disabled }) {
    return (
        <div style={{ ...style, display: disabled ? 'none' : 'flex' }} onClick={() => !disabled && onAdd && onAdd()} aria-disabled={disabled}>
            <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 24, lineHeight: 1 }} aria-hidden>+</div>
                <div style={{ fontSize: 12, color: '#666' }}>{disabled ? 'Max 5 leads' : 'Add metric'}</div>
            </div>
        </div>
    );
}
