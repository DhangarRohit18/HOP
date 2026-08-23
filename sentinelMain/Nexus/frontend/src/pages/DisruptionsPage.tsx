import React, { useEffect, useState } from 'react';
import { Card } from '../components/ui/Card';
import { PageHeader } from '../components/ui/PageHeader';
import { MetricCard } from '../components/ui/MetricCard';
import { StatusBadge } from '../components/ui/StatusBadge';

const API_BASE = '/api/v1';

const DEMO_INCIDENTS = [
  {
    incident_id: 'INC-104', title: 'SUP-001 Fabrication Delay — PO-2026-001', severity: 'CRITICAL',
    supplier_code: 'SUP-001', po_number: 'PO-2026-001', component_code: 'CMP-001', financial_exposure: 16400000,
    sentinel_status: 'RECOVERED', detected_at: '2026-08-23T02:14:33Z', resolved_at: '2026-08-23T02:17:12Z',
    blast_radius: 8, affected_vehicles: 400, recovery_action: 'Emergency spot procurement from SUP-007 (NexaElec)',
    root_cause: 'Supplier allocation conflict: Apex Precision Parts capacity diverted to competitor OEM order.',
  },
  {
    incident_id: 'INC-105', title: 'CMP-007 Inventory Breach — Steering Rack Critical Stock', severity: 'HIGH',
    supplier_code: 'SUP-006', po_number: 'PO-2026-007', component_code: 'CMP-007', financial_exposure: 4200000,
    sentinel_status: 'IN_PROGRESS', detected_at: '2026-08-23T09:01:05Z', resolved_at: null,
    blast_radius: 4, affected_vehicles: 100, recovery_action: 'Expedited freight evaluation in progress',
    root_cause: 'Safety stock threshold breach: AxisTech lead time exceeds coverage window.',
  },
  {
    incident_id: 'INC-103', title: 'SUP-003 Quality Non-Conformance — Turbocharger Batch', severity: 'MEDIUM',
    supplier_code: 'SUP-003', po_number: 'PO-2026-003', component_code: 'CMP-003', financial_exposure: 1800000,
    sentinel_status: 'MONITORING', detected_at: '2026-08-22T18:30:00Z', resolved_at: null,
    blast_radius: 3, affected_vehicles: 150, recovery_action: 'Quality re-inspection scheduled. Hold on batch T-8821.',
    root_cause: 'Dimensional variance in turbocharger turbine blade casting exceeding ±0.02mm tolerance.',
  },
];

export interface DisruptionsPageProps {
  onNavigate?: (path: string) => void;
}

export const DisruptionsPage: React.FC<DisruptionsPageProps> = ({ onNavigate }) => {
  const [disruptions, setDisruptions] = useState<any[]>(DEMO_INCIDENTS);
  const [selectedIncident, setSelectedIncident] = useState<any>(null);
  const [filter, setFilter] = useState<'ALL' | 'CRITICAL' | 'HIGH' | 'MEDIUM'>('ALL');

  useEffect(() => {
    fetch(`${API_BASE}/operator/disruptions`, { headers: { 'X-User-Email': 'operator@nexus.io' } })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.length) setDisruptions(d); })
      .catch(() => {});
  }, []);

  const filtered = disruptions.filter(d => filter === 'ALL' || d.severity === filter);
  const critical = disruptions.filter(d => d.severity === 'CRITICAL').length;
  const active = disruptions.filter(d => d.sentinel_status !== 'RECOVERED').length;
  const totalExposure = disruptions.reduce((s, d) => s + d.financial_exposure, 0);
  const recoveredExposure = disruptions.filter(d => d.sentinel_status === 'RECOVERED').reduce((s, d) => s + d.financial_exposure, 0);

  const severityStyle = (s: string) => {
    switch (s) {
      case 'CRITICAL': return 'bg-[#FDF2F2] text-[#D94B5B] border-[#F8B4B4]';
      case 'HIGH': return 'bg-[#FFFBEB] text-[#F59E0B] border-[#FCD34D]';
      case 'MEDIUM': return 'bg-[#ECFDF5] text-[#3A9B68] border-[#A7F3D0]';
      default: return 'bg-[#F5F3FF] text-[#81758F] border-[#DDD5EA]';
    }
  };

  const statusStyle = (s: string) => {
    switch (s) {
      case 'RECOVERED': return 'bg-[#ECFDF5] text-[#3A9B68] border-[#A7F3D0]';
      case 'IN_PROGRESS': return 'bg-[#FFFBEB] text-[#F59E0B] border-[#FCD34D]';
      case 'MONITORING': return 'bg-[#EEE8FF] text-[#834DFB] border-[#C9BDD9]';
      default: return 'bg-[#F5F3FF] text-[#81758F] border-[#DDD5EA]';
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="OPERATIONAL DISRUPTION RADAR"
        subtitle="Real-time disruption investigation radar, graph topology analysis, and mitigation tracking"
        badge="OPERATOR"
        actions={
          <button onClick={() => onNavigate && onNavigate('/operator/agent')}
            className="px-4 py-2 bg-[#834DFB] hover:bg-[#7040E5] text-[#F5F3FF] font-mono-tech text-xs font-bold rounded shadow-xs flex items-center gap-2">
            🤖 SENTINEL TIMELINE
          </button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Active Disruptions" value={active} subtext="Requiring attention" highlightColor="rose" />
        <MetricCard title="Critical Severity" value={critical} subtext="P1 incidents" highlightColor="rose" />
        <MetricCard title="Total SLA Exposure" value={`₹${(totalExposure / 10000000).toFixed(1)}Cr`} subtext="Financial risk" highlightColor="amber" />
        <MetricCard title="Exposure Recovered" value={`₹${(recoveredExposure / 10000000).toFixed(1)}Cr`} subtext="By Sentinel agent" highlightColor="emerald" />
      </div>

      {/* DISRUPTION TIMELINE BAR */}
      <Card className="p-4 border border-[#DDD5EA]">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-mono-tech font-bold text-xs text-[#1B082C] uppercase">Recovery Progress</h3>
          <span className="font-mono-tech text-[10px] text-[#81758F]">{Math.round(recoveredExposure / totalExposure * 100)}% exposure mitigated</span>
        </div>
        <div className="w-full h-3 bg-[#DDD5EA] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#3A9B68] rounded-full transition-all"
            style={{ width: `${Math.round(recoveredExposure / totalExposure * 100)}%` }}
          />
        </div>
      </Card>

      <div className="flex gap-2 flex-wrap">
        {(['ALL', 'CRITICAL', 'HIGH', 'MEDIUM'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded text-xs font-bold font-mono-tech transition-colors border ${filter === f ? 'bg-[#834DFB] text-white border-[#834DFB]' : 'bg-white text-[#594B69] border-[#DDD5EA] hover:bg-[#F5F3FF]'}`}>
            {f}
          </button>
        ))}
      </div>

      <Card className="p-5 border border-[#DDD5EA]">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono-tech text-xs">
            <thead>
              <tr className="border-b border-[#DDD5EA] text-[#81758F] uppercase text-[10px]">
                <th className="pb-2 pr-4">Incident ID</th>
                <th className="pb-2 pr-4">Title</th>
                <th className="pb-2 pr-4">Severity</th>
                <th className="pb-2 pr-4">Supplier</th>
                <th className="pb-2 pr-4">PO</th>
                <th className="pb-2 pr-4">Component</th>
                <th className="pb-2 pr-4">SLA Exposure</th>
                <th className="pb-2 pr-4">Blast Radius</th>
                <th className="pb-2 pr-4">Sentinel</th>
                <th className="pb-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DDD5EA]/50">
              {filtered.map((dis) => (
                <tr key={dis.incident_id} className="hover:bg-[#FBFAFF] transition-colors">
                  <td className="py-3 pr-4 font-bold text-[#834DFB]">{dis.incident_id}</td>
                  <td className="py-3 pr-4 font-bold text-[#1B082C] max-w-[200px]">{dis.title}</td>
                  <td className="py-3 pr-4">
                    <span className={`px-2 py-0.5 rounded border text-[9px] font-bold ${severityStyle(dis.severity)}`}>
                      {dis.severity}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-[#594B69]">{dis.supplier_code}</td>
                  <td className="py-3 pr-4 text-[#1B082C]">{dis.po_number}</td>
                  <td className="py-3 pr-4 text-[#1B082C]">{dis.component_code}</td>
                  <td className="py-3 pr-4 font-bold text-[#D94B5B]">₹{(dis.financial_exposure / 1000000).toFixed(1)}M</td>
                  <td className="py-3 pr-4 font-bold text-[#1B082C]">{dis.blast_radius} nodes</td>
                  <td className="py-3 pr-4">
                    <span className={`px-2 py-0.5 rounded border text-[9px] font-bold ${statusStyle(dis.sentinel_status)}`}>
                      {dis.sentinel_status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <button onClick={() => setSelectedIncident(dis)}
                      className="px-2 py-1 bg-[#EEE8FF] hover:bg-[#834DFB] text-[#834DFB] hover:text-white font-mono-tech text-[10px] font-bold rounded transition-colors">
                      🔍 INVESTIGATE
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* DETAILED INVESTIGATION MODAL */}
      {selectedIncident && (
        <div className="fixed inset-0 bg-[#1B082C]/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-[#DDD5EA] rounded-lg p-6 max-w-2xl w-full shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#DDD5EA] pb-3">
              <h3 className="font-mono-tech font-bold text-base text-[#1B082C]">
                🚨 DISRUPTION INVESTIGATION // {selectedIncident.incident_id}
              </h3>
              <button onClick={() => setSelectedIncident(null)} className="text-[#81758F] hover:text-[#1B082C] text-xl">✕</button>
            </div>

            <div className="grid grid-cols-2 gap-3 font-mono-tech text-xs">
              {[
                ['Incident ID', selectedIncident.incident_id], ['Severity', selectedIncident.severity],
                ['Supplier', selectedIncident.supplier_code], ['PO Number', selectedIncident.po_number],
                ['Component', selectedIncident.component_code], ['Vehicles Affected', selectedIncident.affected_vehicles],
                ['Blast Radius', `${selectedIncident.blast_radius} supply chain nodes`],
                ['SLA Exposure', `₹${(selectedIncident.financial_exposure / 1000000).toFixed(1)}M`],
                ['Detected', selectedIncident.detected_at?.replace('T', ' ').replace('Z', '')],
                ['Status', selectedIncident.sentinel_status],
              ].map(([k, v]) => (
                <div key={k} className="p-2 bg-[#FBFAFF] border border-[#DDD5EA] rounded">
                  <div className="text-[#81758F] text-[9px] uppercase">{k}</div>
                  <div className="font-bold text-[#1B082C] mt-0.5">{v}</div>
                </div>
              ))}
            </div>

            <div className="space-y-3 font-mono-tech text-xs">
              <div className="p-3 bg-[#FBFAFF] border border-[#DDD5EA] rounded space-y-1">
                <span className="text-[10px] text-[#81758F] uppercase font-bold">📌 Root Cause</span>
                <p className="text-[#1B082C]">{selectedIncident.root_cause}</p>
              </div>
              <div className="p-3 bg-[#EEE8FF] border border-[#C9BDD9] rounded space-y-1">
                <span className="text-[10px] text-[#834DFB] uppercase font-bold">🤖 Sentinel Recovery Action</span>
                <p className="text-[#1B082C]">{selectedIncident.recovery_action}</p>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2 gap-3">
              <button onClick={() => { setSelectedIncident(null); onNavigate && onNavigate('/operator/agent'); }}
                className="flex-1 px-4 py-2 bg-[#834DFB] text-white font-mono-tech text-xs font-bold rounded shadow-xs">
                🤖 VIEW SENTINEL TIMELINE
              </button>
              <button onClick={() => { setSelectedIncident(null); onNavigate && onNavigate('/graph-viewer'); }}
                className="flex-1 px-4 py-2 bg-[#0F172A] text-white font-mono-tech text-xs font-bold rounded shadow-xs">
                🕸️ OPEN GRAPH VIEWER
              </button>
              <button onClick={() => setSelectedIncident(null)}
                className="px-4 py-2 border border-[#DDD5EA] text-[#594B69] font-mono-tech text-xs font-bold rounded hover:bg-[#F5F3FF]">
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DisruptionsPage;
