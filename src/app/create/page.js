"use client";
import React, { useState, useEffect } from "react";
import A3Preview from '@/components/A3Preview';
import EditorShell from '@/components/EditorShell';
import { useUser } from "@/state/UserContext";
import { useA3s } from "@/state/A3Context";
import useMeasure from 'react-use-measure';
import { generateBuckets, shouldDisableFrequency } from '@/utils/bucketUtils';
import LayoutSettingsPanel from '@/components/LayoutSettingsPanel';
import PublishButton from '@/components/PublishButton';
import SectionEditorsPanel from '@/components/SectionEditorsPanel';
import { useRouter } from 'next/navigation';
import { FaGear } from "react-icons/fa6";

export default function CreateA3Page() {
  const { user } = useUser();
  const { a3s, setA3s } = useA3s();

  const initialA3 = {
    published: false,
    draft: true,
    header: {
      id: "",
      title: "", 
      owner: user,
      team: [user],
      lastUpdated: new Date().toISOString(),
      by: user,
      start: null, 
      end: null, 
      refBy: [], 
      refs: [], 
    },
    probDef: {
      why: "", 
      where: "", 
      extra: "",
      canEdit: [user],
    },
    currentState: {
      nodes: [],
      edges: []
      ,
      // who can edit the current state section
      canEdit: [user]
    },
    actionPlan: {
      nodes: [],
      edges: []
      ,
      // who can edit the action plan
      canEdit: [user]
    },
    actionsSettings: {
      weighted: false,
    },
    actions: [],
    layout: {
      sections: {
        plan1: 20,
        plan2: 60,
        futureState: 0,
        do1: 70,
        checkAct: 30
      },
      includeFutureState: false,
      canEdit: [user],
      extraCurrentState: {
        enabled: false,
        text: []
      },
      extraCheckAct: {
        enabled: false,
        text: []
      },
    },
    metrics: {
      lag: {
        metricName: "", // user input // what (section1)
        unit: "",
        initial: null, // user input
        target: {
          type: ""
        }, // user input
        data: [],
        placeholder: {
          initial: "",
          target: "",
          up: null,
        },
        display: {
          enabled: true,
          graphType: "simple",
          showOverlay: true,
          showGrid: false,
          freq: 'monthly'
        }
      },
      leads: [],
      canEditObjectives: [user],
      canEditMetrics: [user]
    },
    progress: [],
  };

  const [a3, setA3] = useState(initialA3);
  const [activeArea, setActiveArea] = useState(null);

  const [refPlan2, boundsPlan2] = useMeasure();
  const [refPlan4, boundsPlan4] = useMeasure();
  const [refPreview, boundsPreview] = useMeasure();
  const [showLayout, setShowLayout] = useState(false);
  const [saving, setSaving] = useState(false);
  const gearRef = React.useRef(null);
  const router = useRouter();

  useEffect(() => {
    const start = a3?.header?.start;
    const end = a3?.header?.end;
    if (!start || !end || !a3?.metrics) return;

    const pickBestForGranularity = (granularity) => {
      const freqOrder = { daily: 0, weekly: 1, monthly: 2 };
      const granularityOrder = { days: 0, weeks: 1, months: 2 };
      const isFreqAllowedByGranularity = (freq, gran) => {
        if (!gran) return true;
        const fi = freqOrder[freq] ?? 0;
        const gi = granularityOrder[gran] ?? 0;
        return fi >= gi;
      };

      if (isFreqAllowedByGranularity('daily', granularity) && !shouldDisableFrequency(start, end, 'daily', 100)) return 'daily';
      if (isFreqAllowedByGranularity('weekly', granularity) && !shouldDisableFrequency(start, end, 'weekly', 100)) return 'weekly';
      if (isFreqAllowedByGranularity('monthly', granularity) && !shouldDisableFrequency(start, end, 'monthly', 100)) return 'monthly';
      return null;
    };

    let didPopulate = false;
    const next = typeof structuredClone === 'function' ? structuredClone(a3) : JSON.parse(JSON.stringify(a3));

    // populate lag if missing or ensure first bucket reflects initial when empty
    next.metrics = next.metrics || {};
    const lag = next.metrics.lag || {};
    const lagData = Array.isArray(lag.data) ? lag.data : [];
    if (!lagData || lagData.length === 0) {
      const lagGran = (next.metrics.lag?.target?.granularity) || null;
      const chosen = next.metrics.lag?.display?.freq || pickBestForGranularity(lagGran);
      if (chosen) {
        const buckets = generateBuckets(start, end, chosen);
        const initialVal = typeof next.metrics.lag?.initial !== 'undefined' ? next.metrics.lag.initial : null;
        next.metrics.lag = {
          ...(next.metrics.lag || {}),
          data: buckets.map((d, i) => ({ date: d, value: i === 0 && initialVal !== null && initialVal !== '' ? initialVal : null })),
          display: { ...(next.metrics.lag.display || {}), freq: chosen }
        };
        didPopulate = true;
      }
    } else {
      // if data exists, ensure the first bucket has the metric.initial when it's empty
        try {
          const first = next.metrics.lag.data[0] || {};
          const firstVal = typeof first.value === 'undefined' ? null : first.value;
          const initialVal = typeof next.metrics.lag?.initial !== 'undefined' ? next.metrics.lag.initial : null;
          // normalize to numbers; treat non-finite conversions (NaN/Infinity) as null to avoid unstable comparisons
          const normFirst = (firstVal === null || firstVal === '' || !Number.isFinite(Number(firstVal))) ? null : Number(firstVal);
          const normInitial = (initialVal === null || initialVal === '' || !Number.isFinite(Number(initialVal))) ? null : Number(initialVal);
          if (normFirst !== normInitial) {
            next.metrics.lag.data[0] = { ...(next.metrics.lag.data[0] || {}), value: normInitial };
            didPopulate = true;
          }
        } catch (e) { /* ignore */ }
    }

    // populate leads if missing or ensure first bucket reflects initial when empty
    next.metrics.leads = next.metrics.leads || [];
    for (let i = 0; i < next.metrics.leads.length; i++) {
      const lead = next.metrics.leads[i] || {};
      const leadData = Array.isArray(lead.data) ? lead.data : [];
      if (!leadData || leadData.length === 0) {
        const leadGran = (lead?.target?.granularity) || null;
        const chosen = lead.display?.freq || pickBestForGranularity(leadGran);
        if (chosen) {
          const buckets = generateBuckets(start, end, chosen);
          const initialVal = typeof lead?.initial !== 'undefined' ? lead.initial : null;
          next.metrics.leads[i] = {
            ...(next.metrics.leads[i] || {}),
            data: buckets.map((d, idx) => ({ date: d, value: idx === 0 && initialVal !== null && initialVal !== '' ? Number(initialVal) : null })),
            display: { ...(next.metrics.leads[i].display || {}), freq: chosen }
          };
          didPopulate = true;
        }
      } else {
        // if data exists, ensure first bucket aligns with initial when empty
        try {
          const first = next.metrics.leads[i].data[0] || {};
          const firstVal = typeof first.value === 'undefined' ? null : first.value;
          const initialVal = typeof next.metrics.leads[i]?.initial !== 'undefined' ? next.metrics.leads[i].initial : null;
          const normFirst = (firstVal === null || firstVal === '' || !Number.isFinite(Number(firstVal))) ? null : Number(firstVal);
          const normInitial = (initialVal === null || initialVal === '' || !Number.isFinite(Number(initialVal))) ? null : Number(initialVal);
          if (normFirst !== normInitial) {
            next.metrics.leads[i].data[0] = { ...(next.metrics.leads[i].data[0] || {}), value: normInitial };
            didPopulate = true;
          }
        } catch (e) { /* ignore */ }
      }
    }

    if (didPopulate) setA3(next);
  }, [a3, setA3]);

  const saveDraft = async () => {
    try {
      setSaving(true);
      // create a copy and ensure draft/published flags
      const next = typeof structuredClone === 'function' ? structuredClone(a3) : JSON.parse(JSON.stringify(a3));
      next.draft = true;
      next.published = false;
      next.header = next.header || {};
      next.header.lastUpdated = new Date().toISOString();

      const res = await fetch('/api/a3s', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next)
      });

      if (!res.ok) {
        const text = await res.text();
        console.error('Failed to save draft', res.status, text);
        return;
      }

      const saved = await res.json();
      // update local state with server response (if any)
      const final = saved || next;
      setA3(final);
      // refresh global A3 list from server to pick up any side-effects (refBy updates)
      try {
        if (typeof setA3s === 'function') {
          const rr = await fetch('/api/a3s');
          if (rr.ok) {
            const data = await rr.json();
            setA3s(Array.isArray(data) ? data : []);
          } else {
            // fallback to local upsert
            setA3s(prev => {
              const list = Array.isArray(prev) ? prev.slice() : [];
              const idx = list.findIndex(x => x?.header?.id === final?.header?.id);
              if (idx >= 0) list[idx] = final;
              else list.push(final);
              return list;
            });
          }
        }
      } catch (e) {
        console.warn('Could not refresh global A3 list', e);
      }
      router.push('/home');

    } catch (e) {
      console.error('Error saving draft', e);
      router.push('/home');
    } finally {
      setSaving(false);
    }
  };

  const bottomButtonsStyle = {
    height: '5vh',
    alignItems: 'center',
    justifyContent: 'center',
    display: 'flex',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    color: 'white',
    fontWeight: 'bold',
  }

  const colors = [
    ["var(--blue-highlight)", "var(--blue-highlight)", , "var(--blue)"],
    ["var(--accent-highlight)", "var(--accent-highlight)", "var(--accent)"],
    ["white", "var(--accent-highlight)", "var(--accent)"],
    ["var(--accent-highlight)", "var(--accent-highlight)", "var(--accent)"],
    ["white", "var(--accent-highlight)", "var(--accent)"],
    ["var(--green-highlight)", "var(--green-highlight)", "var(--green)"],
    ["var(--orange-highlight)", "var(--orange-highlight)", "var(--orange)"],
  ];

  const activeAreaLabel = {
    0: 'header',
    1: 'probDef',
    2: 'currentState',
    3: 'objectives',
    4: 'actionPlan',
    5: null,
    6: 'metrics'
  }

  return (
    <div style={{ width: "100vw", minHeight: "100vh", padding: "1em", boxSizing: "border-box", justifySelf: "center", alignItems: "center", display: "flex", flexDirection: "column", background: "#f0f0f0", gap: "6px" }}>
      <EditorShell
        a3={a3}
        setA3={setA3}
        activeArea={activeArea}
        setActiveArea={setActiveArea}
        boundsPreview={boundsPreview}
        refPlan2={refPlan2}
        boundsPlan2={boundsPlan2}
        refPlan4={refPlan4}
        boundsPlan4={boundsPlan4}
      />
      <SectionEditorsPanel a3={a3} setA3={setA3} activeArea={activeAreaLabel[activeArea]} setShowLayout={setShowLayout} width={boundsPreview.width} color={activeArea ? colors[activeArea][2] : undefined} />
      <A3Preview
        a3={a3}
        setA3={setA3}
        activeArea={activeArea}
        setActiveArea={setActiveArea}
        refPlan2={refPlan2}
        boundsPlan2={boundsPlan2}
        refPlan4={refPlan4}
        boundsPlan4={boundsPlan4}
        refPreview={refPreview}
        boundsPreview={boundsPreview}
        showLayout={showLayout}
        setShowLayout={setShowLayout}
        toggleImgSelectorCurrent={() => { imagePickerTarget.current = 'currentState'; setImagePickerOpen(true); }}
        toggleImgSelectorActionPlan={() => { imagePickerTarget.current = 'actionPlan'; setImagePickerOpen(true); }}
        editable={true}
        owner={true}
      />
      <div style={{ width: boundsPreview.width, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button ref={gearRef} onClick={() => setShowLayout(prev => !prev)} aria-expanded={showLayout} aria-label="Layout settings"
            style={{ ...bottomButtonsStyle, aspectRatio: '1/1', backgroundColor: 'var(--main-highlight)' }}>
            <FaGear />
          </button>
          <LayoutSettingsPanel a3={a3} setA3={setA3} open={showLayout} onClose={() => setShowLayout(false)} anchorRef={gearRef} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <PublishButton a3={a3} setA3={setA3} style={{ ...bottomButtonsStyle, padding: '6px', backgroundColor: 'var(--main)' }} />
          <button
            onClick={saveDraft}
            disabled={saving}
            style={{ ...bottomButtonsStyle, backgroundColor: 'var(--main-highlight)', padding: '6px' }}
          >
            {saving ? 'Saving…' : 'Save Draft'}
          </button>
        </div>
      </div>
    </div>
  );
}



