import React from 'react';

export default function AddActionCard({ onAdd = () => {}, disabled = false }) {
  return (
    <div onClick={() => !disabled && onAdd()} style={{ width: '100%', minHeight: 160, border: '2px dashed #ccc', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1, borderRadius: 6, boxSizing: 'border-box' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 18, fontWeight: 'bold' }}>+ Add Action</div>
        <div style={{ fontSize: 12, color: '#666' }}>{disabled ? 'Disabled' : 'Create a new action'}</div>
      </div>
    </div>
  );
}
