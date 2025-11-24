import React, { useMemo } from 'react';

function normalizeProgress(v) {
  if (v == null) return 0;
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return n <= 1 ? n * 100 : n;
}

export default function ActionsProgressBar({ actions = [], weighted = false }) {
  const percent = useMemo(() => {
    if (!Array.isArray(actions) || actions.length === 0) return 0;
    const mapWeight = (w) => {
      if (!w) return 1;
      if (w === 'high') return 3;
      if (w === 'medium') return 2;
      if (w === 'low') return 1;
      return 1;
    };

    if (!weighted) {
      const sum = actions.reduce((s, a) => s + normalizeProgress(a.progress), 0);
      return Math.round(sum / actions.length);
    }

    const weightedSum = actions.reduce((s, a) => s + normalizeProgress(a.progress) * mapWeight(a.weight), 0);
    const weightTotal = actions.reduce((s, a) => s + mapWeight(a.weight), 0) || actions.length;
    return Math.round(weightedSum / weightTotal);
  }, [actions, weighted]);

  return (
    <div className="actions-progress">
      <div className="actions-progress-label">Progress</div>
      {/* ticks at every 10% (exclude 0% and 100%) */}
      <div className="actions-progress-bar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} style={{ position: 'relative' }}>
        {Array.from({ length: 9 }).map((_, i) => {
          const v = (i + 1) * 10; // 10,20,...,90
          return (
            <span
              key={`tick-${v}`}
              aria-hidden
              className="actions-progress-tick"
              style={{
                position: 'absolute',
                left: `${v}%`,
                top: 0,
                bottom: 0,
                width: 1,
                background: 'rgba(0, 0, 0, 0.46)',
                transform: 'translateX(-0.5px)'
              }}
            />
          );
        })}
        <div className="actions-progress-fill" style={{ width: `${percent}%` }} />
      </div>
      <div className="actions-progress-percent">{percent}%</div>
    </div>
  );
}
