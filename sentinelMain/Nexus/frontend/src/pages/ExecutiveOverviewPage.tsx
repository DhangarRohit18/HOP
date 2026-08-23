import React, { useEffect, useState } from 'react';
import { Card } from '../components/ui/Card';
import { MetricCard } from '../components/ui/MetricCard';
import { PageHeader } from '../components/ui/PageHeader';
import { StatusBadge } from '../components/ui/StatusBadge';

const API_BASE = 'http://localhost:8000/api/v1';

const DEMO_EXECUTIVE_DATA = {
  business_metrics: {
    production_continuity_score: 98.4,
    financial_exposure_usd: 0,
    recovery_success_rate: 100.0,
    supplier_risk_index: 'LOW',
    total_disruptions_ytd: 7,
    avg_resolution_time_seconds: 147,
    cost_avoided_ytd: 62400000,
    supply_chain_health: 94.2,
  },
  incidents_summary: [
    { incident_id: 'INC-104', title: 'SUP-001 Fabrication Delay — ECU Shortage', supplier_code: 'SUP-001', initial_risk: 'CRITICAL', current_risk: 'LOW', financial_exposure: 0, recovery_status: 'RECOVERED', resolved_in: '2m 39s' },
    { incident_id: 'INC-105', title: 'CMP-007 Inventory Breach — Steering Rack', supplier_code: 'SUP-006', initial_risk: 'HIGH', current_risk: 'MEDIUM', financial_exposure: 4200000, recovery_status: 'IN_PROGRESS', resolved_in: null },
    { incident_id: 'INC-103', title: 'SUP-003 Quality Non-Conformance — Turbo Batch', supplier_code: 'SUP-003', initial_risk: 'MEDIUM', current_risk: 'MEDIUM', financial_exposure: 1800000, recovery_status: 'MONITORING', resolved_in: null },
    { incident_id: 'INC-101', title: 'Tier-2 Supplier Capacity Constraint', supplier_code: 'SUP-008', initial_risk: 'HIGH', current_risk: 'LOW', financial_exposure: 0, recovery_status: 'RECOVERED', resolved_in: '4m 12s' },
    { incident_id: 'INC-099', title: 'Port Delay — Chennai Inbound Shipment', supplier_code: 'SUP-003', initial_risk: 'CRITICAL', current_risk: 'LOW', financial_exposure: 0, recovery_status: 'RECOVERED', resolved_in: '7m 45s' },
  ],
  monthly_trend: [
    { month: 'Mar', incidents: 3, avoided: 8.2 },
    { month: 'Apr', incidents: 2, avoided: 5.1 },
    { month: 'May', incidents: 4, avoided: 12.4 },
    { month: 'Jun', incidents: 1, avoided: 3.8 },
    { month: 'Jul', incidents: 5, avoided: 19.6 },
    { month: 'Aug', incidents: 3, avoided: 13.3 },
  ],
  top_risks: [
    { risk: 'Single-source dependency on SUP-001 for CMP-001', likelihood: 'HIGH', impact: 'CRITICAL', mitigation: 'Dual-sourcing under evaluation' },
    { risk: 'Tier-2 supplier concentration in Chennai region', likelihood: 'MEDIUM', impact: 'HIGH', mitigation: 'Geographic diversification roadmap Q4' },
    { risk: 'Lead time variability > 14 days for turbocharger supply', likelihood: 'HIGH', impact: 'MEDIUM', mitigation: 'Safety stock buffer increased to 120 days' },
  ],
};

export const ExecutiveOverviewPage: React.FC = () => {
  const [data, setData] = useState<any>(DEMO_EXECUTIVE_DATA);

  useEffect(() => {
    fetch(`${API_BASE}/executive/overview`, { headers: { 'X-User-Email': 'executive@nexus.io' } })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setData(d); })
      .catch(() => {});
  }, []);

  const metrics = data?.business_metrics;
  const isRecovered = metrics?.financial_exposure_usd === 0;
  const maxAvoided = Math.max(...(data?.monthly_trend?.map((t: any) => t.avoided) || [1]));

  return (
    <div className="space-y-6">
      <PageHeader
        title="EXECUTIVE BUSINESS CONTINUITY OVERVIEW"
        subtitle="High-level operational continuity dashboard, risk exposures, and incident resolution status (READ-ONLY)"
        badge="EXECUTIVE (READ-ONLY)"
      />

      {/* PRIMARY KPI CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Production Continuity" value={`${metrics?.production_continuity_score ?? 98.4}%`} subtext="Target threshold > 95%" highlightColor="emerald" />
        <MetricCard title="SLA Exposure" value={isRecovered ? '₹0 (RECOVERED)' : `₹${((metrics?.financial_exposure_usd ?? 6000000) / 1000000).toFixed(1)}M`} subtext={isRecovered ? 'Mitigation verified' : 'Active risk'} highlightColor={isRecovered ? 'emerald' : 'rose'} />
        <MetricCard title="Recovery Rate" value={`${metrics?.recovery_success_rate ?? 100}%`} subtext="Sentinel agent automation" highlightColor="indigo" />
        <MetricCard title="Avg Resolution" value={`${metrics?.avg_resolution_time_seconds ?? 147}s`} subtext="Time to full recovery" highlightColor="amber" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Cost Avoided YTD" value={`₹${((metrics?.cost_avoided_ytd ?? 62400000) / 10000000).toFixed(1)}Cr`} subtext="Via autonomous recovery" highlightColor="emerald" />
        <MetricCard title="Supplier Risk Index" value={metrics?.supplier_risk_index ?? 'LOW'} subtext="Evaluated across 120 nodes" highlightColor={isRecovered ? 'emerald' : 'amber'} />
        <MetricCard title="Supply Chain Health" value={`${metrics?.supply_chain_health ?? 94.2}%`} subtext="Composite score" highlightColor="indigo" />
        <MetricCard title="Disruptions YTD" value={metrics?.total_disruptions_ytd ?? 7} subtext="All successfully contained" highlightColor="rose" />
      </div>

      {/* MONTHLY TREND */}
      <Card className="p-5 border border-[#DDD5EA]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-mono-tech font-bold text-sm text-[#1B082C]">📈 FINANCIAL EXPOSURE AVOIDED (₹ Cr) — Monthly Trend</h3>
          <span className="text-[10px] text-[#81758F] font-mono-tech bg-[#ECFDF5] px-2 py-0.5 rounded border border-[#A7F3D0] text-[#3A9B68] font-bold">100% AUTOMATED</span>
        </div>
        <div className="flex items-end gap-3 h-32">
          {data?.monthly_trend?.map((t: any) => (
            <div key={t.month} className="flex-1 flex flex-col items-center gap-1">
              <span className="font-mono-tech text-[10px] text-[#834DFB] font-bold">₹{t.avoided}Cr</span>
              <div className="w-full bg-gradient-to-t from-[#834DFB] to-[#C4B5FD] rounded-t transition-all"
                style={{ height: `${(t.avoided / maxAvoided) * 80}px` }} />
              <span className="font-mono-tech text-[9px] text-[#81758F]">{t.month}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* TOP STRATEGIC RISKS */}
      <Card className="p-5 border border-[#DDD5EA] space-y-4">
        <h3 className="font-mono-tech font-bold text-sm text-[#1B082C]">⚠️ TOP STRATEGIC RISKS — Board-Level View</h3>
        <div className="space-y-3">
          {data?.top_risks?.map((r: any, i: number) => (
            <div key={i} className="p-3 bg-[#FBFAFF] border border-[#DDD5EA] rounded font-mono-tech">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="font-bold text-xs text-[#1B082C] mb-1">{r.risk}</div>
                  <div className="text-[10px] text-[#594B69]">Mitigation: {r.mitigation}</div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <span className={`px-2 py-0.5 rounded border text-[9px] font-bold ${r.likelihood === 'HIGH' ? 'bg-[#FDF2F2] text-[#D94B5B] border-[#F8B4B4]' : 'bg-[#FFFBEB] text-[#F59E0B] border-[#FCD34D]'}`}>
                    L: {r.likelihood}
                  </span>
                  <span className={`px-2 py-0.5 rounded border text-[9px] font-bold ${r.impact === 'CRITICAL' ? 'bg-[#FDF2F2] text-[#D94B5B] border-[#F8B4B4]' : r.impact === 'HIGH' ? 'bg-[#FFFBEB] text-[#F59E0B] border-[#FCD34D]' : 'bg-[#ECFDF5] text-[#3A9B68] border-[#A7F3D0]'}`}>
                    I: {r.impact}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* INCIDENT TABLE */}
      <Card className="p-5 border border-[#DDD5EA] space-y-4">
        <div className="flex items-center justify-between border-b border-[#DDD5EA] pb-3">
          <h3 className="font-mono-tech font-bold text-sm text-[#1B082C]">📋 INCIDENT RECOVERY REPORTS</h3>
          <span className="px-2 py-0.5 bg-[#EEE8FF] text-[#834DFB] text-[10px] font-mono-tech font-bold rounded">STRICTLY READ-ONLY</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono-tech text-xs">
            <thead>
              <tr className="border-b border-[#DDD5EA] text-[#81758F] uppercase text-[10px]">
                <th className="pb-2 pr-4">Incident ID</th>
                <th className="pb-2 pr-4">Disruption Title</th>
                <th className="pb-2 pr-4">Supplier</th>
                <th className="pb-2 pr-4">Initial Risk</th>
                <th className="pb-2 pr-4">Current Risk</th>
                <th className="pb-2 pr-4">SLA Exposure</th>
                <th className="pb-2 pr-4">Resolved In</th>
                <th className="pb-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DDD5EA]/50">
              {data?.incidents_summary?.map((inc: any) => (
                <tr key={inc.incident_id} className="hover:bg-[#FBFAFF] transition-colors">
                  <td className="py-3 pr-4 font-bold text-[#834DFB]">{inc.incident_id}</td>
                  <td className="py-3 pr-4 font-bold text-[#1B082C]">{inc.title}</td>
                  <td className="py-3 pr-4 text-[#594B69]">{inc.supplier_code}</td>
                  <td className="py-3 pr-4 text-[#D94B5B] font-bold">{inc.initial_risk}</td>
                  <td className="py-3 pr-4 font-bold">
                    <span className={inc.current_risk === 'LOW' ? 'text-[#3A9B68]' : inc.current_risk === 'MEDIUM' ? 'text-[#F59E0B]' : 'text-[#D94B5B]'}>
                      {inc.current_risk}
                    </span>
                  </td>
                  <td className="py-3 pr-4 font-semibold text-[#1B082C]">
                    {inc.financial_exposure === 0 ? <span className="text-[#3A9B68]">₹0 (RECOVERED)</span> : `₹${(inc.financial_exposure / 1000000).toFixed(1)}M`}
                  </td>
                  <td className="py-3 pr-4 text-[#3A9B68] font-bold">{inc.resolved_in || 'In Progress'}</td>
                  <td className="py-3">
                    <StatusBadge status={inc.recovery_status === 'RECOVERED' ? 'healthy' : inc.recovery_status === 'MONITORING' ? 'degraded' : 'critical'} size="sm" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default ExecutiveOverviewPage;
