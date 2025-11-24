import React from "react";
import { getNextActionId, ensureProgressForA3 } from "../utils/actionsHelpers";
import ActionCard from "./ActionCard";
import AddActionCard from "./AddActionCard";
import { useUser } from '@/state/UserContext';

export default function ActionsForm({ a3, setA3 }) {
    const { user } = useUser();
    const actions = Array.isArray(a3.actions) ? a3.actions : [];
    const weighted = a3.actionsSettings?.weighted || false;

    const isOwner = Boolean(a3?.header?.owner && user && a3.header.owner === user);

    const addAction = () => {
        const nextId = getNextActionId(actions);
        const newAction = {
            id: nextId,
            description: "",
            owner: null,
            progress: 0,
            limit: a3.header?.end ? a3.header.end : null,
            lateFlags: [
                // {limit: new Date(a3.header?.end).toISOString().slice(0,10)},
                // {limit: new Date(a3.header?.start).toISOString().slice(0,10)},
                // {limit: new Date(a3.header?.start).toISOString().slice(0,10)},
            ],
            weight: 'low',
        };
        setA3(prev => {
            const next = { ...(prev || {}) };
            next.actions = [...(prev.actions || []), newAction];
            // refresh progress series immediately when actions change
            try { return ensureProgressForA3(next); } catch (e) { return next; }
        });
    };

    const updateAction = (id, patch) => {
        setA3(prev => {
            const next = { ...(prev || {}) };
            next.actions = (prev.actions || []).map(a => a.id === id ? { ...a, ...patch } : a);
            try { return ensureProgressForA3(next); } catch (e) { return next; }
        });
    };

    const deleteAction = (id) => {
        setA3(prev => {
            const next = { ...(prev || {}) };
            next.actions = (prev.actions || []).filter(a => a.id !== id);
            try { return ensureProgressForA3(next); } catch (e) { return next; }
        });
    };

    const toggleWeighted = (enabled) => {
        setA3(prev => ({
            ...prev,
            actionsSettings: { ...(prev.actionsSettings || {}), weighted: enabled },
        }));
    };

    const sortedActions = [...actions].sort((a, b) => (Number(a.id) || 0) - (Number(b.id) || 0));

    const checkboxStyle = {
        width: 16,
        height: 16,
        cursor: 'pointer',
        borderRadius: '50%',
        display: 'inline-block',
        verticalAlign: 'middle',
        boxSizing: 'border-box',
        appearance: 'none',
        WebkitAppearance: 'none',
        MozAppearance: 'none',
        border: '2px solid #000',
        backgroundColor: 'transparent'
    }

    return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, width: '100%', justifyContent: 'center' }}>
            <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ fontWeight: 'bold' }}>Actions</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <label style={{ fontSize: 12 }}>Weighted actions?</label>
                    <input
                        type="checkbox"
                        style={weighted ? { ...checkboxStyle, backgroundColor: 'var(--green)', border: '2px solid var(--green)' } : checkboxStyle}
                        checked={Boolean(weighted)}
                        onChange={(e) => toggleWeighted(e.target.checked)}
                        aria-label="Weighted toggle"
                    />
                </div>
            </div>

            {sortedActions.map(a => (
                <div key={a.id} style={{ flex: '0 0 calc(33.333% - 12px)', boxSizing: 'border-box', minWidth: 0 }}>
                    <ActionCard
                        action={a}
                        team={a3.header?.team || []}
                        weighted={Boolean(weighted)}
                        startDate={a3.header?.start}
                        endDate={a3.header?.end}
                        onChange={(patch) => updateAction(a.id, patch)}
                        onDelete={() => deleteAction(a.id)}
                        currentUser={user}
                        a3Owner={a3?.header?.owner}
                    />
                </div>
            ))}

                <div style={{ flex: '0 0 calc(33.333% - 12px)', boxSizing: 'border-box', minWidth: 0 }}>
                <AddActionCard onAdd={addAction} disabled={!isOwner} />
            </div>
        </div>
    );
}