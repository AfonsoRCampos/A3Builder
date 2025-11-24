import React from 'react';
import MetricCard from '@/components/MetricCard';
import AddMetricCard from '@/components/AddMetricCard';

const containerStyle = {
    display: 'grid',
    gap: 10,
    gridTemplateColumns: '33% 34% 33%',
    alignItems: 'stretch',
    width: '100%',
    justifyContent: 'center',
};

export default function MetricsForm({ metrics, setA3, start, end }) {
    const lag = metrics?.lag || { metricName: '', unit: '', initial: '', target: {type: ''} };
    const leads = metrics?.leads || [];

    const updateLag = (newLag) => {
        setA3(prev => ({ ...prev, metrics: { ...prev.metrics, lag: newLag } }));
    };

    const updateLeadAt = (idx, updated) => {
        setA3(prev => {
            const copy = { ...prev };
            const leadsCopy = (copy.metrics?.leads || []).slice();
            leadsCopy[idx] = updated;
            copy.metrics = { ...(copy.metrics || {}), leads: leadsCopy };
            return copy;
        });
    };

    const addLead = () => {
        setA3(prev => {
            const copy = { ...prev };
            const leadsCopy = (copy.metrics?.leads || []).slice();
            leadsCopy.push({ metricName: '', unit: '', initial: '', target: {value: null, percent: null, mode: 'linear'}, data: [], display: { enabled: false, graphType: 'simple', showOverlay: true, showGrid: false, freq: 'monthly' } });
            copy.metrics = { ...(copy.metrics || {}), leads: leadsCopy };
            return copy;
        });
    };

    const deleteLeadAt = (idx) => {
        setA3(prev => {
            const copy = { ...prev };
            const leadsCopy = (copy.metrics?.leads || []).slice();
            leadsCopy.splice(idx, 1);
            copy.metrics = { ...(copy.metrics || {}), leads: leadsCopy };
            return copy;
        });
    };

    const maxLeads = 5;

    return (
        <div style={{width: '100%', alignContent: 'center', alignSelf: 'center' }}>
            <div style={{ marginBottom: 8, fontWeight: 'bold' }}>Metrics</div>
            <div style={containerStyle}>
                <MetricCard metric={lag} index={0} onChange={updateLag} isDeletable={false} start={start} end={end} />

                {leads.map((m, i) => (
                    <MetricCard
                        key={`lead-${i}`}
                        metric={m}
                        index={i + 1}
                        onChange={(updated) => updateLeadAt(i, updated)}
                        onDelete={() => deleteLeadAt(i)}
                        isDeletable={true}
                        start={start}
                        end={end}
                    />
                ))}

                <AddMetricCard onAdd={addLead} disabled={leads.length >= maxLeads} />
            </div>
        </div>
    );
}

