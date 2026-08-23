import React, { useEffect, useState } from 'react';
import { Card } from '../components/ui/Card';
import { PageHeader } from '../components/ui/PageHeader';
import { StatusBadge } from '../components/ui/StatusBadge';
import { MetricCard } from '../components/ui/MetricCard';

const API_BASE = 'http://localhost:8000/api/v1';

const DEMO_PRODUCTION = [
  { id: 'PRD-001', order_number: 'PRD-2026-001', product: 'Maruti Baleno (BLN-22)', priority: 'P1-CRITICAL', start_date: '2026-08-22', completion_date: '2026-08-28', required_component: 'CMP-001 (ECU)', qty_required: 400, status: 'BLOCKED', production_risk: 'CRITICAL', line: 'LINE-A1-PUNE', customer_order: 'SO-2026-001' },
  { id: 'PRD-002', order_number: 'PRD-2026-002', product: 'Maruti Swift Dzire (SZD-8)', priority: 'P1-CRITICAL', start_date: '2026-08-21', completion_date: '2026-08-27', required_component: 'CMP-002 (ABS Module)', qty_required: 300, status: 'IN_PROGRESS', production_risk: 'HEALTHY', line: 'LINE-A2-PUNE', customer_order: 'SO-2026-002' },
  { id: 'PRD-003', order_number: 'PRD-2026-003', product: 'Maruti Vitara Brezza (VBZ-5)', priority: 'P2-HIGH', start_date: '2026-08-25', completion_date: '2026-09-01', required_component: 'CMP-003 (Turbocharger)', qty_required: 150, status: 'AT_RISK', production_risk: 'WARNING', line: 'LINE-B1-MANESAR', customer_order: 'SO-2026-003' },
  { id: 'PRD-004', order_number: 'PRD-2026-004', product: 'Maruti S-Cross (SCX-4)', priority: 'P2-HIGH', start_date: '2026-08-24', completion_date: '2026-08-30', required_component: 'CMP-005 (Clutch Pack)', qty_required: 200, status: 'IN_PROGRESS', production_risk: 'HEALTHY', line: 'LINE-B2-MANESAR', customer_order: 'SO-2026-004' },
  { id: 'PRD-005', order_number: 'PRD-2026-005', product: 'Maruti Ignis (IGN-7)', priority: 'P3-MEDIUM', start_date: '2026-08-27', completion_date: '2026-09-03', required_component: 'CMP-007 (Steering Rack)', qty_required: 100, status: 'BLOCKED', production_risk: 'CRITICAL', line: 'LINE-C1-GUJARAT', customer_order: 'SO-2026-005' },
  { id: 'PRD-006', order_number: 'PRD-2026-006', product: 'Maruti Alto K10 (ALT-22)', priority: 'P3-MEDIUM', start_date: '2026-08-23', completion_date: '2026-08-29', required_component: 'CMP-006 (Alternator)', qty_required: 400, status: 'COMPLETED', production_risk: 'HEALTHY', line: 'LINE-A1-PUNE', customer_order: 'SO-2026-006' },
];

export interface OperatorProductionProps {
  onNavigate?: (path: string) => void;
}

export const OperatorProductionPage: React.FC<OperatorProductionProps> = ({ onNavigate }) => {
  const [production, setProduction] = useState<any[]>(DEMO_PRODUCTION);
  const [filter, setFilter] = useState<'ALL' | 'BLOCKED' | 'IN_PROGRESS' | 'AT_RISK' | 'COMPLETED'>('ALL');
  const [selected, setSelected] = useState<any>(null);

  useEffect(() => {
    fetch(`${API_BASE}/operator/production`, { headers: { 'X-User-Email': 'operator@nexus.io' } })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.length) setProduction(d); })
      .catch(() => {});
  }, []);

  const filtered = production.filter(p => filter === 'ALL' || p.status === filter);
  const blocked = production.filter(p => p.status === 'BLOCKED').length;
  const inProgress = production.filter(p => p.status === 'IN_PROGRESS').length;
  const atRisk = production.filter(p => p.production_risk !== 'HEALTHY').length;

  const statusStyle = (s: string) => {
    switch (s) {
      case 'BLOCKED': return 'bg-[#FDF2F2] text-[#D94B5B] border-[#F8B4B4]';
      case 'IN_PROGRESS': return 'bg-[#ECFDF5] text-[#3A9B68] border-[#A7F3D0]';
      case 'AT_RISK': return 'bg-[#FFFBEB] text-[#F59E0B] border-[#FCD34D]';
      case 'COMPLETED': return 'bg-[#EEE8FF] text-[#834DFB] border-[#C9BDD9]';
      default: return 'bg-[#F5F3FF] text-[#81758F] border-[#DDD5EA]';
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="PRODUCTION CONTINUITY DASHBOARD"
        subtitle="Assembly lines, manufacturing schedule commitments, required component dependencies, and risk status"
        badge="OPERATOR PRODUCTION"
        actions={
          <button onClick={() => onNavigate && onNavigate('/material-demo')}
            className="px-4 py-2 bg-[#834DFB] hover:bg-[#7040E5] text-[#F5F3FF] font-mono-tech text-xs font-bold rounded shadow-xs flex items-center gap-2">
            🏷️ TRACE MATERIAL
          </button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Active Orders" value={production.length} subtext="Across all assembly lines" highlightColor="indigo" />
        <MetricCard title="Blocked" value={blocked} subtext="Component shortage" highlightColor="rose" />
        <MetricCard title="In Progress" value={inProgress} subtext="Active manufacturing" highlightColor="emerald" />
        <MetricCard title="At Risk" value={atRisk} subtext="Warning/Critical status" highlightColor="amber" />
      </div>

      {/* PRODUCTION LINE VISUAL */}
      <Card className="p-5 border border-[#DDD5EA]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-mono-tech font-bold text-sm text-[#1B082C]">🏭 PRODUCTION LINE STATUS</h3>
          <span className="text-[10px] text-[#81758F] font-mono-tech">Live telemetry — Maruti Suzuki Plants</span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {['LINE-A1-PUNE', 'LINE-A2-PUNE', 'LINE-B1-MANESAR', 'LINE-B2-MANESAR'].map(line => {
            const lineOrders = production.filter(p => p.line === line);
            const blocked = lineOrders.some(p => p.status === 'BLOCKED');
            return (
              <div key={line} className={`p-3 rounded border ${blocked ? 'bg-[#FDF2F2] border-[#F8B4B4]' : 'bg-[#ECFDF5] border-[#A7F3D0]'}`}>
                <div className={`font-mono-tech font-bold text-xs ${blocked ? 'text-[#D94B5B]' : 'text-[#3A9B68]'}`}>
                  {blocked ? '🔴 BLOCKED' : '🟢 RUNNING'}
                </div>
                <div className="font-mono-tech text-[10px] text-[#1B082C] font-bold mt-1">{line}</div>
                <div className="font-mono-tech text-[9px] text-[#81758F] mt-0.5">{lineOrders.length} order(s)</div>
              </div>
            );
          })}
        </div>
      </Card>

      <div className="flex gap-2 flex-wrap">
        {(['ALL', 'BLOCKED', 'IN_PROGRESS', 'AT_RISK', 'COMPLETED'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded text-xs font-bold font-mono-tech transition-colors border ${filter === f ? 'bg-[#834DFB] text-white border-[#834DFB]' : 'bg-white text-[#594B69] border-[#DDD5EA] hover:bg-[#F5F3FF]'}`}>
            {f.replace('_', ' ')}
          </button>
        ))}
      </div>

      <Card className="p-5 border border-[#DDD5EA]">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono-tech text-xs">
            <thead>
              <tr className="border-b border-[#DDD5EA] text-[#81758F] uppercase text-[10px]">
                <th className="pb-2 pr-4">Order No.</th>
                <th className="pb-2 pr-4">Product</th>
                <th className="pb-2 pr-4">Priority</th>
                <th className="pb-2 pr-4">Assembly Line</th>
                <th className="pb-2 pr-4">Start Date</th>
                <th className="pb-2 pr-4">Due Date</th>
                <th className="pb-2 pr-4">Required Component</th>
                <th className="pb-2 pr-4">Qty</th>
                <th className="pb-2 pr-4">Status</th>
                <th className="pb-2 pr-4">Risk</th>
                <th className="pb-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DDD5EA]/50">
              {filtered.map((prd) => (
                <tr key={prd.id} className="hover:bg-[#FBFAFF] transition-colors">
                  <td className="py-3 pr-4 font-bold text-[#834DFB]">{prd.order_number}</td>
                  <td className="py-3 pr-4 font-bold text-[#1B082C]">{prd.product}</td>
                  <td className="py-3 pr-4 font-bold text-[10px]">
                    <span className={prd.priority.startsWith('P1') ? 'text-[#D94B5B]' : prd.priority.startsWith('P2') ? 'text-[#F59E0B]' : 'text-[#3A9B68]'}>
                      {prd.priority}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-[#594B69]">{prd.line}</td>
                  <td className="py-3 pr-4 text-[#594B69]">{prd.start_date}</td>
                  <td className="py-3 pr-4 text-[#594B69]">{prd.completion_date}</td>
                  <td className="py-3 pr-4 font-bold text-[#1B082C]">{prd.required_component}</td>
                  <td className="py-3 pr-4 text-[#594B69]">{prd.qty_required}</td>
                  <td className="py-3 pr-4">
                    <span className={`px-2 py-0.5 rounded border text-[9px] font-bold ${statusStyle(prd.status)}`}>
                      {prd.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    <StatusBadge status={prd.production_risk === 'CRITICAL' ? 'critical' : prd.production_risk === 'WARNING' ? 'degraded' : 'healthy'} size="sm" />
                  </td>
                  <td className="py-3 text-right">
                    <button onClick={() => setSelected(prd)}
                      className="px-2 py-1 bg-[#EEE8FF] hover:bg-[#834DFB] text-[#834DFB] hover:text-white font-mono-tech text-[10px] font-bold rounded transition-colors">
                      📋 DETAIL
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {selected && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-[#DDD5EA] rounded-lg p-6 max-w-lg w-full shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#DDD5EA] pb-3">
              <h3 className="font-mono-tech font-bold text-sm text-[#1B082C]">🏭 PRODUCTION DETAIL // {selected.order_number}</h3>
              <button onClick={() => setSelected(null)} className="text-[#81758F] hover:text-[#1B082C] text-lg">✕</button>
            </div>
            <div className="grid grid-cols-2 gap-2 font-mono-tech text-xs">
              {[
                ['Product', selected.product], ['Assembly Line', selected.line],
                ['Priority', selected.priority], ['Customer Order', selected.customer_order],
                ['Component', selected.required_component], ['Qty Required', selected.qty_required],
                ['Start', selected.start_date], ['Due Date', selected.completion_date],
                ['Status', selected.status], ['Risk', selected.production_risk],
              ].map(([k, v]) => (
                <div key={k} className="p-2 bg-[#FBFAFF] border border-[#DDD5EA] rounded">
                  <div className="text-[#81758F] text-[9px] uppercase">{k}</div>
                  <div className="font-bold text-[#1B082C] mt-0.5">{v}</div>
                </div>
              ))}
            </div>
            {selected.status === 'BLOCKED' && (
              <div className="p-3 bg-[#FDF2F2] border border-[#F8B4B4] rounded text-[#D94B5B] text-xs font-bold font-mono-tech">
                🔴 LINE BLOCKED — Component {selected.required_component} stock insufficient. Sentinel agent activated.
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => { setSelected(null); onNavigate && onNavigate('/operator/disruptions'); }}
                className="flex-1 px-4 py-2 bg-[#D94B5B] text-white text-xs font-bold rounded font-mono-tech">
                🚨 VIEW DISRUPTION
              </button>
              <button onClick={() => setSelected(null)}
                className="px-4 py-2 border border-[#DDD5EA] text-[#594B69] text-xs font-bold rounded font-mono-tech">CLOSE</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OperatorProductionPage;
