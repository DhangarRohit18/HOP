import React, { useEffect, useState } from 'react';
import { Card } from '../components/ui/Card';
import { PageHeader } from '../components/ui/PageHeader';
import { MetricCard } from '../components/ui/MetricCard';
import { StatusBadge } from '../components/ui/StatusBadge';

const API_BASE = 'http://localhost:8000/api/v1';

const DEMO_RUNS = [
  {
    id: 'RUN-001', incident_id: 'INC-104', event_id: 'PO_DELAYED', status: 'RECOVERED',
    started_at: '2026-08-23T02:14:33Z', completed_at: '2026-08-23T02:17:12Z', duration_seconds: 159,
    timeline_steps: [
      { time: '02:14:33', step: 'EVENT_INGESTED', message: 'Kafka event EVT-2090 received: PO-2026-001 delay signal from SUP-001 (+4.0 days)', type: 'INFO' },
      { time: '02:14:35', step: 'GRAPH_TRAVERSAL', message: 'Neo4j BFS traversal initiated from node SUP-001 → CMP-001 → PRD-2026-001 → SO-2026-001. Depth: 4 hops, 8 affected nodes.', type: 'ANALYSIS' },
      { time: '02:14:41', step: 'IMPACT_QUANTIFIED', message: 'Financial SLA exposure calculated: ₹16.4M liquidated damages if PRD-2026-001 misses 2026-08-28 deadline.', type: 'RISK' },
      { time: '02:14:48', step: 'INVENTORY_CHECK', message: 'CMP-001 current stock: 48 units. Daily usage: 12 units. Coverage: 4.0 days. Safety stock threshold: 60 units. CRITICAL breach confirmed.', type: 'ANALYSIS' },
      { time: '02:14:55', step: 'SUPPLIER_EVALUATION', message: 'Alternate supplier catalog query: SUP-007 (NexaElec) — reliability 0.91, lead time 3 days, unit cost ₹1,920 (+3.8% premium). Quality score: 0.89 ✅', type: 'DECISION' },
      { time: '02:15:08', step: 'RECOVERY_PROPOSED', message: 'Emergency spot procurement: 500 units CMP-001 from SUP-007. Total value ₹960,000. Approval required (exceeds ₹500,000 threshold).', type: 'DECISION' },
      { time: '02:15:12', step: 'APPROVAL_TRIGGERED', message: 'Human-in-the-loop approval request APV-2026-001 sent to operator@nexus.io. Waiting for authorization.', type: 'INFO' },
      { time: '02:16:45', step: 'APPROVED', message: 'Operator decision: APPROVED. User: operator@nexus.io. Authorization code: AUTH-8821.', type: 'SUCCESS' },
      { time: '02:16:47', step: 'PO_CREATED', message: 'Emergency Purchase Order EMG-PO-001 raised. Supplier: SUP-007. Qty: 500 units. ETA: 2026-08-25 (3 days).', type: 'ACTION' },
      { time: '02:17:10', step: 'RECOVERY_VERIFIED', message: 'CMP-001 projected coverage: 4.0 + 41.7 = 45.7 days post-delivery. PRD-2026-001 production window protected. SLA exposure: ₹0.', type: 'SUCCESS' },
      { time: '02:17:12', step: 'INCIDENT_CLOSED', message: 'INC-104 resolved. Total resolution time: 2m 39s. Financial exposure avoided: ₹16.4M.', type: 'SUCCESS' },
    ]
  },
  {
    id: 'RUN-002', incident_id: 'INC-105', event_id: 'INVENTORY_BREACH', status: 'IN_PROGRESS',
    started_at: '2026-08-23T09:01:05Z', completed_at: null, duration_seconds: null,
    timeline_steps: [
      { time: '09:01:05', step: 'EVENT_INGESTED', message: 'Inventory telemetry alert: CMP-007 (Steering Rack) stock at 35 units. Coverage: 2.3 days. Below safety stock (75 units).', type: 'INFO' },
      { time: '09:01:12', step: 'GRAPH_TRAVERSAL', message: 'Impact path: CMP-007 → PRD-2026-005 (Ignis) → SO-2026-005 (Fleet order, 100 vehicles).', type: 'ANALYSIS' },
      { time: '09:01:19', step: 'IMPACT_QUANTIFIED', message: 'Estimated SLA exposure: ₹4.2M if SO-2026-005 delayed past 2026-09-05.', type: 'RISK' },
      { time: '09:01:28', step: 'SUPPLIER_EVALUATION', message: 'Querying alternate suppliers for CMP-007. SUP-006 (AxisTech) current lead time: 10 days — insufficient. Searching catalog...', type: 'ANALYSIS' },
      { time: '09:01:45', step: 'DECISION_PENDING', message: 'No same-lead-time alternate found. Recommending expedited freight from SUP-006 at premium (+₹45,000 freight cost) for 5-day delivery.', type: 'DECISION' },
    ]
  },
];

const typeStyle = (type: string) => {
  switch (type) {
    case 'SUCCESS': return 'text-[#3A9B68] bg-[#ECFDF5] border-[#A7F3D0]';
    case 'RISK': return 'text-[#D94B5B] bg-[#FDF2F2] border-[#F8B4B4]';
    case 'DECISION': return 'text-[#834DFB] bg-[#EEE8FF] border-[#C9BDD9]';
    case 'ACTION': return 'text-[#0284C7] bg-[#E0F2FE] border-[#BAE6FD]';
    case 'ANALYSIS': return 'text-[#0F766E] bg-[#CCFBF1] border-[#99F6E4]';
    default: return 'text-[#81758F] bg-[#F5F3FF] border-[#DDD5EA]';
  }
};

export const OperatorAgentActivityPage: React.FC = () => {
  const [runs, setRuns] = useState<any[]>(DEMO_RUNS);
  const [expanded, setExpanded] = useState<string>(DEMO_RUNS[0]?.id || '');

  useEffect(() => {
    fetch(`${API_BASE}/operator/agent-runs`, { headers: { 'X-User-Email': 'operator@nexus.io' } })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.length) setRuns(d); })
      .catch(() => {});
  }, []);

  const resolved = runs.filter(r => r.status === 'RECOVERED').length;
  const avgTime = runs.filter(r => r.duration_seconds).reduce((s, r) => s + r.duration_seconds, 0) / (runs.filter(r => r.duration_seconds).length || 1);

  return (
    <div className="space-y-6">
      <PageHeader
        title="SENTINEL AGENT LIFECYCLE TIMELINE"
        subtitle="Operational event processing runs, graph analysis steps, and automated recovery executions"
        badge="SENTINEL AGENT"
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Total Agent Runs" value={runs.length} subtext="This session" highlightColor="indigo" />
        <MetricCard title="Resolved" value={resolved} subtext="Fully recovered" highlightColor="emerald" />
        <MetricCard title="In Progress" value={runs.length - resolved} subtext="Active investigations" highlightColor="amber" />
        <MetricCard title="Avg Resolution" value={`${Math.round(avgTime)}s`} subtext="Time to recovery" highlightColor="rose" />
      </div>

      {/* AGENT ACTIVITY FEED */}
      <div className="space-y-4">
        {runs.map((run) => (
          <Card key={run.id} className="border border-[#DDD5EA] overflow-hidden">
            {/* RUN HEADER */}
            <button
              onClick={() => setExpanded(expanded === run.id ? '' : run.id)}
              className="w-full p-5 flex items-center justify-between hover:bg-[#FBFAFF] transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className={`w-3 h-3 rounded-full ${run.status === 'RECOVERED' ? 'bg-[#3A9B68]' : 'bg-[#F59E0B] animate-pulse'}`} />
                <div className="text-left">
                  <div className="font-mono-tech font-bold text-sm text-[#1B082C]">
                    🤖 INCIDENT: {run.incident_id} <span className="text-[#81758F] font-normal text-xs ml-2">EVENT: {run.event_id}</span>
                  </div>
                  <div className="font-mono-tech text-[10px] text-[#81758F] mt-0.5">
                    Started: {run.started_at} {run.duration_seconds ? `• Duration: ${run.duration_seconds}s` : '• Active'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={run.status === 'RECOVERED' ? 'healthy' : 'degraded'} />
                <span className="text-[#81758F] text-lg">{expanded === run.id ? '▲' : '▼'}</span>
              </div>
            </button>

            {/* EXPANDED TIMELINE */}
            {expanded === run.id && (
              <div className="border-t border-[#DDD5EA] p-5 space-y-3 max-h-[480px] overflow-y-auto bg-[#FAFAFA]">
                <h4 className="font-mono-tech font-bold text-[10px] text-[#81758F] uppercase mb-3">📋 Agent Decision Log — {run.timeline_steps?.length} Steps</h4>
                {run.timeline_steps?.map((step: any, idx: number) => (
                  <div key={idx} className="flex items-start gap-3">
                    {/* Timeline connector */}
                    <div className="flex flex-col items-center">
                      <div className="w-2 h-2 rounded-full bg-[#834DFB] mt-1.5 shrink-0" />
                      {idx < run.timeline_steps.length - 1 && <div className="w-px flex-1 bg-[#DDD5EA] mt-0.5 min-h-[20px]" />}
                    </div>
                    <div className="pb-3 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono-tech text-[10px] text-[#81758F]">{step.time}</span>
                        <span className={`px-2 py-0.5 rounded border text-[9px] font-bold font-mono-tech ${typeStyle(step.type)}`}>
                          {step.step}
                        </span>
                      </div>
                      <p className="font-mono-tech text-[11px] text-[#1B082C] leading-relaxed">{step.message}</p>
                    </div>
                  </div>
                ))}
                {run.status === 'RECOVERED' && (
                  <div className="mt-4 p-3 bg-[#ECFDF5] border border-[#A7F3D0] rounded text-[#3A9B68] text-xs font-bold font-mono-tech">
                    ✅ SENTINEL RECOVERY COMPLETE — All downstream impacts mitigated. Financial exposure: ₹0.
                  </div>
                )}
                {run.status === 'IN_PROGRESS' && (
                  <div className="mt-4 p-3 bg-[#FFFBEB] border border-[#FCD34D] rounded text-[#F59E0B] text-xs font-bold font-mono-tech animate-pulse">
                    ⏳ AGENT ACTIVE — Processing decision tree... Awaiting supplier response.
                  </div>
                )}
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
};

export default OperatorAgentActivityPage;
