"use client";
import React from 'react';
import Select from 'react-select';
import { toFullName } from '@/utils/Utils';

// sectionKey should be one of: 'probDef','currentState','actionPlan','actionsSettings','metrics','layout','header'
export default function SectionEditorsPanel({ a3, setA3, activeArea, width, color }) {
  if (!a3 || !activeArea) return null;

  const owner = a3?.header?.owner;
  const team = Array.isArray(a3?.header?.team) ? a3.header.team : [owner].filter(Boolean);

  const teamOptions = team.map(m => ({ value: m, label: toFullName(m) }));

  const styles = {
    control: (base) => ({
      ...base,
      background: 'white',
      border: `1px solid var(--main)`,
      borderRadius: '6px',
      boxSizing: 'border-box',
      minHeight: 24,
      height: 24,
      fontSize: 12,
      padding: '0 6px'
    }),
    valueContainer: (base) => ({
      ...base,
      padding: '0 6px',
      height: 24,
      display: 'flex',
      alignItems: 'center'
    }),
    indicatorsContainer: (base) => ({
      ...base,
      height: 24
    }),
    multiValue: (base) => ({
      ...base,
      fontSize: 11,
      padding: '2px 6px'
    }),
    multiValueLabel: (base) => ({
      ...base,
      padding: '0 4px'
    }),
    input: (base) => ({
      ...base,
      margin: 0,
      padding: 0,
      height: 20,
      fontSize: 12
    }),
    menuPortal: (base) => ({
      ...base,
      zIndex: 999999
    }),
    menu: (base) => ({
      ...base,
      zIndex: 999999,
      fontSize: 12,
      padding: 0,
    }),
    multiValueRemove: (base, state) => {
      return state.data.value === owner ? { ...base, display: 'none' } : base;
    }
  };

  // get current canEdit for active area
  const getCanEdit = () => {
    try {
      if (activeArea === 'header') return a3.layout?.canEdit || [];
      if (activeArea === 'probDef') return a3.probDef?.canEdit || [];
      if (activeArea === 'currentState') return a3.currentState?.canEdit || [];
      if (activeArea === 'actionPlan') return a3.actionPlan?.canEdit || [];
      if (activeArea === 'objectives') return a3.metrics?.canEditObjectives || [];
      if (activeArea === 'metrics') return a3.metrics?.canEditMetrics || [];
      return [];
    } catch (e) { return []; }
  };

  const selectedValues = getCanEdit().map(v => ({ value: v, label: toFullName(v) }));

  const onChange = (selected) => {
    const values = Array.isArray(selected) ? selected.map(s => s.value) : [];
    // always ensure owner included
    const final = [owner, ...values.filter(v => v && v !== owner)];

    setA3(prev => {
      const next = { ...(prev || {}) };
      if (activeArea === 'header') {
        // header.team is managed separately by header form; keep owner at front
        next.layout = { ...(next.layout || {}), canEdit: Array.from(new Set(final)) };
      } else if (activeArea === 'probDef') {
        next.probDef = { ...(next.probDef || {}), canEdit: Array.from(new Set(final)) };
      } else if (activeArea === 'currentState') {
        next.currentState = { ...(next.currentState || {}), canEdit: Array.from(new Set(final)) };
      } else if (activeArea === 'actionPlan') {
        next.actionPlan = { ...(next.actionPlan || {}), canEdit: Array.from(new Set(final)) };
      } else if (activeArea === 'actionsSettings') {
        next.actionsSettings = { ...(next.actionsSettings || {}), canEdit: Array.from(new Set(final)) };
      } else if (activeArea === 'metrics') {
        next.metrics = { ...(next.metrics || {}), canEditMetrics: Array.from(new Set(final)) };
      } else if (activeArea === 'objectives') {
        next.metrics = { ...(next.metrics || {}), canEditObjectives: Array.from(new Set(final)) };
      }
      return next;
    });
  };

  const labelMap = {
    header: 'A3 layout',
    probDef: 'Problem Definition section',
    currentState: 'Current State section',
    actionPlan: 'Future State section',
    metrics: 'Metrics section',
    objectives: 'Objectives section'
  };

  return (
    <div style={{ width: width, height: 'auto', minHeight: 30, boxSizing: 'border-box', padding: '8px', background: 'white', border: `3px solid ${color}`, display: 'flex', alignItems: 'center', gap: 12, borderRadius: 6 }}>
      <div style={{  fontWeight: 'bold', fontSize: 12 }}>
        {`Can edit ${labelMap[activeArea] || 'this section'}:`}
      </div>
      <div style={{ flex: 1 }}>
        <Select
          isMulti
          options={teamOptions}
          value={selectedValues}
          styles={styles}
          closeMenuOnSelect={false}
          onChange={onChange}
          menuPortalTarget={typeof document !== 'undefined' ? document.body : undefined}
          menuPosition="fixed"
          menuPlacement="auto"
          menuShouldBlockScroll={false}
        />
      </div>
    </div>
  );
}
