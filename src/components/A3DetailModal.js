"use client";
import { useEffect, useState } from 'react';
import ProgressChart from '@/components/charts/ProgressChart';
import SimpleBarGraph from './charts/SimpleBarGraph';
import GapAnalysisGraph from './charts/GapAnalysisGraph';
import LagsLeadsComparison from './LagsLeadsComparison';

function LegendItem({ color = '#000', label = '', dashed = false, hidden = false, solid = false }) {
  if (hidden) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#333' }}>
      <div style={{ position: 'relative', width: 18, height: 8, background: solid || dashed ? 'transparent' : color, borderTop: dashed ? `2px dashed ${color}` : solid ? `2px solid ${color}` : 'none', top: solid || dashed ? 4 : 0 }} />
      <div>{label}</div>
    </div>
  );
}

export default function A3DetailModal({ open, a3, onClose }) {
  const [percentMode, setPercentMode] = useState(false);
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose && onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || !a3) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(0,0,0,0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 20
      }}
      onClick={() => { onClose && onClose(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        style={{
          background: 'white',
          borderRadius: 8,
          width: '90%',
          maxHeight: '90vh',
          overflow: 'hidden',
          boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
          display: 'flex',
          flexDirection: 'column'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 12px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
          <h3 style={{ margin: 0 }}>{a3?.header?.title || a3?.header?.id || 'A3 Details'}</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => { onClose && onClose(); }} style={{ cursor: 'pointer', padding: '6px 10px', borderRadius: 6, border: 'none', background: 'var(--cancel)', color: 'white' }}>Close</button>
          </div>
        </div>

        <div style={{ padding: 12, overflow: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            {/* Left block: title + toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <h4 style={{ margin: 0 }}><u>Action Plan Progress</u></h4>
            </div>

            {/* Spacer */}
            <div style={{ flex: 1 }} />

            {/* Legend on right */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <LegendItem color="var(--green)" label={'Progress (%)'} solid={true} />
              <LegendItem color="var(--cancel)" label={'Total Tasks'} solid={true} />
              <LegendItem color="var(--accent)" label={'Prog. Target'} dashed={true} />
            </div>
          </div>

          <div style={{ margin: '8px 0 18px 0' }}>
            <ProgressChart progress={a3?.progress || []} height={200} percent={percentMode} />
          </div>
          <h4><u>LAG Measure ({a3.metrics?.lag.metricName} ({a3.metrics?.lag.unit}))</u></h4>
          <div style={{ margin: '8px 0 18px 0', height: 200, display: 'flex', flexDirection: 'row', gap: 12 }}>
            <div style={{ flex: '0 0 30%', minWidth: 0, height: '100%' }}>
              <GapAnalysisGraph metric={a3.metrics?.lag || {}} minHeight={200} unit={a3.metrics?.lag?.unit || ''} />
            </div>
            <div style={{ flex: '0 0 70%', minWidth: 0, height: '100%' }}>
              <SimpleBarGraph
                metric={a3.metrics?.lag || {}}
                showZones={false}
                showGrid={false}
                targetLine={true}
                bgColor="transparent"
                minHeight={200}
                style={{ width: '100%', height: '100%' }}
              />
            </div>
          </div>
          {a3.metrics?.leads && (
            <>
              <h4><u>LAG vs LEADS</u></h4>
              <LagsLeadsComparison a3={a3} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
