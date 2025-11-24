"use client";
import React, { useMemo, useState } from 'react';
import { useUser } from '@/state/UserContext';
import { useRouter } from 'next/navigation';
import { useA3s } from '@/state/A3Context';

function validateA3(a3) {
  const issues = [];
  const header = a3?.header || {};

  if (!header.title || String(header.title).trim() === '') {
    issues.push({ path: 'Header', message: 'A title is required' });
  }
  if (!header.start) {
    issues.push({ path: 'Header', message: 'Start date is required' });
  }
  if (!header.end) {
    issues.push({ path: 'Header', message: 'End date is required' });
  }

  // team/owner
  if (!Array.isArray(header.team) || header.team.length < 2) {
    issues.push({ path: 'Header', message: 'At least two team members are required' });
  }

  // problem definition
  if (!a3?.probDef || !a3.probDef.why || String(a3.probDef.why).trim() === '') {
    issues.push({ path: 'Problem Definition', message: 'Problem statement (why) is required' });
  }

  // lag metric basic checks
  const lag = a3?.metrics?.lag || {};
  if (!lag.metricName || String(lag.metricName).trim() === '') {
    issues.push({ path: 'Objectives', message: 'Primary metric name is required' });
  }
  // initial can be 0, so only treat undefined/null/empty-string as missing
  if (lag.initial === null || typeof lag.initial === 'undefined' || String(lag.initial).trim() === '') {
    issues.push({ path: 'Objectives', message: 'Primary metric initial value is required' });
  }
  if (!lag.target || !lag.target.percent || !lag.target.value || lag.target.mode === '') {
    issues.push({ path: 'Objectives', message: 'Primary metric target must be defined' });
  }

  return issues;
}

export default function PublishButton({ a3, setA3, onPublished, style }) {
  const [publishing, setPublishing] = useState(false);
  const [hovered, setHovered] = useState(false);
  const router = useRouter();
  const { setA3s } = useA3s();
  const { user } = useUser();

  const isOwner = Boolean(a3?.header?.owner && user && a3.header.owner === user);

  const validation = useMemo(() => {
    const issues = validateA3(a3 || {});
    return { valid: issues.length === 0, issues };
  }, [a3]);

  const groupedIssues = useMemo(() => {
    const map = {};
    (validation.issues || []).forEach(it => {
      const key = it.path || 'Other';
      if (!map[key]) map[key] = [];
      map[key].push(it.message);
    });
    return map;
  }, [validation.issues]);

  const doPublish = async () => {
    if (!validation.valid || publishing) return;
    setPublishing(true);
    try {
      const next = typeof structuredClone === 'function' ? structuredClone(a3) : JSON.parse(JSON.stringify(a3));
      next.draft = false;
      next.published = true;
      next.header = next.header || {};
      next.header.lastUpdated = new Date().toISOString();

      const res = await fetch('/api/a3s', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next)
      });

      if (!res.ok) {
        const text = await res.text();
        console.error('Failed to publish', res.status, text);
        return;
      }

      const saved = await res.json();
      const final = saved || next;
      // update local editor state
      if (typeof setA3 === 'function') setA3(final);
      // upsert into global list
      try {
        if (typeof setA3s === 'function') {
          setA3s(prev => {
            const list = Array.isArray(prev) ? prev.slice() : [];
            const idx = list.findIndex(x => x?.header?.id === final?.header?.id);
            if (idx >= 0) list[idx] = final;
            else list.push(final);
            return list;
          });
        }
      } catch (e) {
        console.warn('Could not update global A3 list', e);
      }

      if (typeof onPublished === 'function') onPublished(final);
      router.push('/home');
    } catch (e) {
      console.error('Publish error', e);
    } finally {
      setPublishing(false);
    }
  };

  const disabled = !validation.valid || publishing || !isOwner;

  // normalize styles and apply disabled appearance
  const baseStyle = style && typeof style === 'object' ? { ...style } : {
    padding: '8px 12px',
    borderRadius: 6,
    border: '1px solid var(--main)',
    background: 'var(--main)',
    cursor: 'pointer',
    color: 'inherit'
  };

  const appliedStyle = {
    ...baseStyle,
    background: disabled ? 'var(--gray-dark)' : baseStyle.backgroundColor,
    cursor: disabled ? 'not-allowed' : baseStyle.cursor,
    color: disabled ? '#666' : baseStyle.color
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
        <button
            onClick={doPublish}
            disabled={disabled}
            aria-disabled={disabled}
            style={appliedStyle}
        >
            {publishing ? 'Publishing…' : 'Publish'}
        </button>

        {hovered && (
            <div style={{
                position: 'absolute',
                right: 0,
                bottom: 'calc(100% + 8px)', // place above the button with an 8px gap
                width: isOwner ? 360 : 220,
                maxWidth: 'calc(100vw - 40px)',
                background: 'rgba(255, 255, 255, 1)',
                border: '1px solid rgba(0,0,0,0.12)',
                boxShadow: '0 6px 18px rgba(0,0,0,0.12)',
                borderRadius: 6,
                padding: 12,
                fontSize: 13,
                zIndex: 1400,
                transformOrigin: 'right bottom', // grow upwards and to the left
                transition: 'transform 140ms ease, opacity 140ms ease',
                display: validation.valid ? 'none' : 'block'
            }}>
                {!isOwner ? (
                  <div style={{ fontWeight: 600 }}>Only the A3 owner may publish.</div>
                ) : !validation.valid ? (
                <>
                  <div style={{ fontWeight: 600, marginBottom: 8 }}>Cannot publish — fix these fields:</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {Object.keys(groupedIssues).map((pathKey) => (
                      <div key={pathKey} style={{ borderLeft: '2px solid rgba(0,0,0,0.06)', paddingLeft: 10 }}>
                        <div style={{ fontWeight: 600, marginBottom: 6 }}>{pathKey}</div>
                        <ul style={{ margin: 0, paddingLeft: 16 }}>
                          {groupedIssues[pathKey].map((msg, idx) => (
                            <li key={idx}>{msg}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </>
                ) : null}
            </div>
        )}
    </div>
);
}
