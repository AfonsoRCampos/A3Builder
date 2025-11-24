"use client";
import React, { useEffect, useMemo, useRef, useState } from 'react';

// Minimal layout settings panel. Controls are: plan1, plan2, (goals locked 20), futureState (toggleable), do1, checkAct
// header is fixed at 10% (not editable). The component edits a local copy and commits on Apply.
export default function LayoutSettingsPanel({ a3, setA3, open = false, onClose, anchorRef = null }) {
  const defaults = useMemo(() => ({
    sections: {
      plan1: 20,
      plan2: 60,
      futureState: 20,
      do1: 60,
      checkAct: 20
    },
    includeFutureState: true
  }), []);
  const [local, setLocal] = useState(() => ({ ...(a3.layout) }));

  useEffect(() => {
    setLocal(a3.layout || defaults);
  }, [a3.layout, defaults]);

  function resetToDefaults() {
    setLocal(defaults);
  }

  function applyAndCommit() {
    const newSections = {
      plan1: local.sections.plan1,
      plan2: local.sections.plan2,
      futureState: local.includeFutureState ? local.sections.futureState : 10,
      do1: local.sections.do1,
      checkAct: local.sections.checkAct
    };

    const newLayout = { ...(local || {}), sections: newSections, includeFutureState: local.includeFutureState };
    setA3(prev => ({ ...prev, layout: newLayout }));
    if (onClose) onClose();
  }

  const panelRef = useRef(null);
  const [coords, setCoords] = useState(null); // { top, left }
  const PANEL_WIDTH = 360;

  useEffect(() => {
    if (!open) return;

    function compute() {
      // default fallback: bottom-left small inset
      let left = 12;
      let top = null;

      if (anchorRef && anchorRef.current) {
        try {
          const rect = anchorRef.current.getBoundingClientRect();
          // prefer placing below the anchor
          left = rect.left;
          top = rect.bottom + 8;
        } catch (e) {
          left = 12;
          top = null;
        }
      }

      // measure panel if already rendered to avoid overflow
      const panel = panelRef.current;
      if (panel) {
        const h = panel.offsetHeight;
        const w = panel.offsetWidth || PANEL_WIDTH;
        // keep inside viewport horizontally
        if (left + w > window.innerWidth - 12) left = Math.max(12, window.innerWidth - w - 12);
        // if placing below would overflow, try placing above
        if (top !== null && top + h > window.innerHeight - 12) {
          const rect = anchorRef && anchorRef.current ? anchorRef.current.getBoundingClientRect() : null;
          if (rect) {
            top = rect.top - h - 8;
          } else {
            top = Math.max(12, window.innerHeight - h - 12);
          }
        }
      }

      setCoords({ top, left });
    }

    // compute initially and on resize/scroll
    compute();
    window.addEventListener('resize', compute);
    window.addEventListener('scroll', compute, true);
    return () => {
      window.removeEventListener('resize', compute);
      window.removeEventListener('scroll', compute, true);
    };
  }, [open, anchorRef]);

  if (!open) return null;

  const outerStyle = coords && typeof coords.top === 'number'
    ? { position: 'fixed', left: coords.left, top: coords.top, zIndex: 1200 }
    : { position: 'fixed', left: 12, bottom: 12, zIndex: 1200 };

  return (
    <div ref={panelRef} style={outerStyle}>
      <div style={{
        width: PANEL_WIDTH,
        boxShadow: '0 6px 18px rgba(0,0,0,0.12)',
        background: 'white',
        borderRadius: 8,
        padding: 12,
        fontSize: 13,
        color: '#222'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <strong>Layout settings</strong>
          <button onClick={() => { if (onClose) onClose(); }} aria-label="Close" style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}>✕</button>
        </div>

        {/* Left column slider: single handle splits the non-goals 80% between Plan1 and Plan2 */}
        <div style={{ marginTop: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div style={{ color: '#444' }}>Left column — Plan 1 / Plan 2</div>
            <div style={{ color: '#444' }}>Plan1: {local.sections.plan1}% • Plan2: {80 - local.sections.plan1}%</div>
          </div>
          <input type="range" min={10} max={70} value={local.sections.plan1} onChange={e => setLocal(l => ({ ...l, sections: { ...l.sections, plan1: Number(e.target.value), plan2: 80 - Number(e.target.value) } }))} style={{ width: '100%', marginTop: 8, accentColor: 'var(--main)' }} />
        </div>

        {/* Right column slider(s) */}
        <div style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" checked={local.includeFutureState} onChange={(s) => {setLocal(l => ({ ...l, includeFutureState: !l.includeFutureState })); local.includeFutureState ? setLocal(l => ({ ...l, sections: { ...l.sections, futureState: 10, do1: 70, checkAct: 30 } })) : setLocal(l => ({ ...l, sections: { ...l.sections, futureState: 33, do1: 34, checkAct: 33 } }))}} style={{ accentColor: 'var(--main)' }} /> Include Future State
            </label>
            <div style={{ marginLeft: 'auto', color: '#444' }}>Right column distribution</div>
          </div>

          {local.includeFutureState ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ color: '#444' }}>Future: {local.sections.futureState}%</div>
                <div style={{ color: '#444' }}>Do: {local.sections.do1}%</div>
                <div style={{ color: '#444' }}>Check: {100 - local.sections.do1 - local.sections.futureState}%</div>
              </div>
              {/* two handles implemented as two range inputs constrained to maintain order */}
              <input type="range" min={10} max={80} value={local.sections.futureState} onChange={e => setLocal(l => ({ ...l, sections: { ...l.sections, futureState: Number(e.target.value), do1: Math.max(10, 90 - Number(e.target.value)) } }))} style={{ width: '100%', marginTop: 8, accentColor: 'var(--main)' }} />
              <input type="range" min={10} max={90 - local.sections.futureState} value={local.sections.do1} onChange={e => setLocal(l => ({ ...l, sections: { ...l.sections, do1: Number(e.target.value), checkAct: Math.max(10, 100 - Number(e.target.value) - local.sections.futureState) } }))} style={{ width: '100%', marginTop: 4, accentColor: 'var(--main)' }} />
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ color: '#444' }}>Do: {local.sections.do1}%</div>
                <div style={{ color: '#444' }}>Check: {local.sections.checkAct}%</div>
              </div>
              <input type="range" min={10} max={90} value={local.sections.do1} onChange={e => setLocal(l => ({ ...l, sections: { ...l.sections, do1: Number(e.target.value), checkAct: Math.max(10, 100 - Number(e.target.value)) } }))} style={{ width: '100%', marginTop: 8, accentColor: 'var(--main)' }} />
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
          <button onClick={resetToDefaults} style={{ background: 'var(--main-highlight)', color: 'white', border: 'none', padding: '4px 8px', borderRadius: 4, cursor: 'pointer' }}>Reset</button>
          <button onClick={applyAndCommit} style={{ background: 'var(--main)', color: 'white', border: 'none', padding: '4px 8px', borderRadius: 4, cursor: 'pointer' }}>Apply</button>
        </div>
      </div>
    </div>
  );
}