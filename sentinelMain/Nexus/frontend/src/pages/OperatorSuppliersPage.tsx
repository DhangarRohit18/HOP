import React, { useEffect, useState } from 'react';
import { Card } from '../components/ui/Card';
import { PageHeader } from '../components/ui/PageHeader';
import { StatusBadge } from '../components/ui/StatusBadge';
import { MetricCard } from '../components/ui/MetricCard';

const API_BASE = 'http://localhost:8000/api/v1';

const DEMO_SUPPLIERS = [
  { id: 'SUP-001', supplier_code: 'SUP-001', name: 'Apex Precision Parts Pvt. Ltd.', tier: 'TIER-1', reliability_score: 0.87, monthly_capacity_units: 12000, active_pos: 3, risk_status: 'AT_RISK', location: 'Pune, Maharashtra', lead_time_days: 7, defect_rate: '0.8%', payment_terms: 'NET-30', certifications: ['ISO 9001', 'IATF 16949'] },
  { id: 'SUP-002', supplier_code: 'SUP-002', name: 'BharatElectech Systems', tier: 'TIER-1', reliability_score: 0.94, monthly_capacity_units: 8500, active_pos: 2, risk_status: 'STABLE', location: 'Bangalore, Karnataka', lead_time_days: 5, defect_rate: '0.3%', payment_terms: 'NET-45', certifications: ['ISO 9001', 'IATF 16949', 'AEC-Q100'] },
  { id: 'SUP-003', supplier_code: 'SUP-003', name: 'Chennai Turbo Forge Ltd.', tier: 'TIER-2', reliability_score: 0.78, monthly_capacity_units: 4200, active_pos: 1, risk_status: 'AT_RISK', location: 'Chennai, Tamil Nadu', lead_time_days: 14, defect_rate: '1.4%', payment_terms: 'NET-30', certifications: ['ISO 9001'] },
  { id: 'SUP-004', supplier_code: 'SUP-004', name: 'Maratha Drivetrain Corp.', tier: 'TIER-1', reliability_score: 0.91, monthly_capacity_units: 6000, active_pos: 2, risk_status: 'STABLE', location: 'Nashik, Maharashtra', lead_time_days: 6, defect_rate: '0.5%', payment_terms: 'NET-45', certifications: ['ISO 9001', 'IATF 16949'] },
  { id: 'SUP-005', supplier_code: 'SUP-005', name: 'PowerGen Auto Electricals', tier: 'TIER-2', reliability_score: 0.89, monthly_capacity_units: 9000, active_pos: 1, risk_status: 'STABLE', location: 'Coimbatore, Tamil Nadu', lead_time_days: 8, defect_rate: '0.6%', payment_terms: 'NET-30', certifications: ['ISO 9001'] },
  { id: 'SUP-006', supplier_code: 'SUP-006', name: 'AxisTech Steering Solutions', tier: 'TIER-1', reliability_score: 0.72, monthly_capacity_units: 3500, active_pos: 2, risk_status: 'AT_RISK', location: 'Gurgaon, Haryana', lead_time_days: 10, defect_rate: '1.9%', payment_terms: 'NET-15', certifications: ['ISO 9001'] },
];

export interface OperatorSuppliersProps {
  onNavigate?: (path: string) => void;
}

export const OperatorSuppliersPage: React.FC<OperatorSuppliersProps> = ({ onNavigate }) => {
  const [suppliers, setSuppliers] = useState<any[]>(DEMO_SUPPLIERS);
  const [selected, setSelected] = useState<any>(null);
  const [filter, setFilter] = useState<'ALL' | 'AT_RISK' | 'STABLE'>('ALL');

  useEffect(() => {
    fetch(`${API_BASE}/operator/suppliers`, { headers: { 'X-User-Email': 'operator@nexus.io' } })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.length) setSuppliers(d); })
      .catch(() => {});
  }, []);

  const filtered = suppliers.filter(s => filter === 'ALL' || s.risk_status === filter);
  const atRisk = suppliers.filter(s => s.risk_status === 'AT_RISK').length;
  const avgReliability = (suppliers.reduce((s, i) => s + i.reliability_score, 0) / suppliers.length * 100).toFixed(1);
  const totalPOs = suppliers.reduce((s, i) => s + i.active_pos, 0);

  const scoreBar = (score: number) => {
    const pct = score * 100;
    const color = pct < 80 ? '#D94B5B' : pct < 90 ? '#F59E0B' : '#3A9B68';
    return (
      <div className="flex items-center gap-2">
        <div className="w-16 h-1.5 bg-[#DDD5EA] rounded-full overflow-hidden">
          <div style={{ width: `${pct}%`, background: color }} className="h-full rounded-full" />
        </div>
        <span className="font-bold text-xs" style={{ color }}>{pct.toFixed(1)}%</span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="SUPPLIER 360° RADAR"
        subtitle="Operational supplier directory, reliability scores, monthly capacity allocation, and disruption index"
        badge="OPERATOR SUPPLIERS"
        actions={
          <button onClick={() => onNavigate && onNavigate('/material-demo')}
            className="px-4 py-2 bg-[#834DFB] hover:bg-[#7040E5] text-[#F5F3FF] font-mono-tech text-xs font-bold rounded shadow-xs flex items-center gap-2">
            🏷️ TRACE MATERIAL
          </button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Total Suppliers" value={suppliers.length} subtext="Active supply nodes" highlightColor="indigo" />
        <MetricCard title="At Risk" value={atRisk} subtext="Need immediate attention" highlightColor="rose" />
        <MetricCard title="Avg. Reliability" value={`${avgReliability}%`} subtext="Weighted across all tiers" highlightColor="amber" />
        <MetricCard title="Active POs" value={totalPOs} subtext="Open purchase orders" highlightColor="emerald" />
      </div>

      <div className="flex gap-2">
        {(['ALL', 'AT_RISK', 'STABLE'] as const).map(f => (
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
                <th className="pb-2 pr-4">Code</th>
                <th className="pb-2 pr-4">Supplier Name</th>
                <th className="pb-2 pr-4">Tier</th>
                <th className="pb-2 pr-4">Location</th>
                <th className="pb-2 pr-4">Reliability</th>
                <th className="pb-2 pr-4">Capacity/Mo.</th>
                <th className="pb-2 pr-4">Lead Time</th>
                <th className="pb-2 pr-4">Active POs</th>
                <th className="pb-2 pr-4">Risk</th>
                <th className="pb-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DDD5EA]/50">
              {filtered.map((s) => (
                <tr key={s.id} className="hover:bg-[#FBFAFF] transition-colors">
                  <td className="py-3 pr-4 font-bold text-[#834DFB]">{s.supplier_code}</td>
                  <td className="py-3 pr-4 font-bold text-[#1B082C]">{s.name}</td>
                  <td className="py-3 pr-4">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${s.tier === 'TIER-1' ? 'bg-[#EEE8FF] text-[#834DFB] border-[#C9BDD9]' : 'bg-[#F5F3FF] text-[#81758F] border-[#DDD5EA]'}`}>
                      {s.tier}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-[#594B69]">{s.location}</td>
                  <td className="py-3 pr-4">{scoreBar(s.reliability_score)}</td>
                  <td className="py-3 pr-4 text-[#1B082C] font-semibold">{s.monthly_capacity_units.toLocaleString()}</td>
                  <td className="py-3 pr-4 text-[#594B69]">{s.lead_time_days} days</td>
                  <td className="py-3 pr-4 font-bold text-[#1B082C]">{s.active_pos}</td>
                  <td className="py-3 pr-4">
                    <StatusBadge status={s.risk_status === 'AT_RISK' ? 'critical' : 'healthy'} size="sm" />
                  </td>
                  <td className="py-3 text-right">
                    <button onClick={() => setSelected(s)}
                      className="px-2 py-1 bg-[#EEE8FF] hover:bg-[#834DFB] text-[#834DFB] hover:text-white font-mono-tech text-[10px] font-bold rounded transition-colors">
                      🔍 VIEW 360°
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* SUPPLIER 360 DETAIL MODAL */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-[#DDD5EA] rounded-lg p-6 max-w-2xl w-full shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#DDD5EA] pb-3">
              <h3 className="font-mono-tech font-bold text-sm text-[#1B082C]">🏭 SUPPLIER 360° // {selected.supplier_code}</h3>
              <button onClick={() => setSelected(null)} className="text-[#81758F] hover:text-[#1B082C] text-lg">✕</button>
            </div>
            <div className="grid grid-cols-2 gap-4 font-mono-tech text-xs">
              <div className="space-y-2">
                <h4 className="font-bold text-[10px] text-[#81758F] uppercase">Company Info</h4>
                {[['Name', selected.name], ['Location', selected.location], ['Tier', selected.tier], ['Payment Terms', selected.payment_terms]].map(([k, v]) => (
                  <div key={k} className="flex justify-between py-1 border-b border-[#DDD5EA]/50">
                    <span className="text-[#81758F]">{k}</span>
                    <span className="font-bold text-[#1B082C]">{v}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <h4 className="font-bold text-[10px] text-[#81758F] uppercase">Performance</h4>
                {[
                  ['Reliability Score', `${(selected.reliability_score * 100).toFixed(1)}%`],
                  ['Defect Rate', selected.defect_rate],
                  ['Lead Time', `${selected.lead_time_days} days`],
                  ['Monthly Capacity', `${selected.monthly_capacity_units?.toLocaleString()} units`],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between py-1 border-b border-[#DDD5EA]/50">
                    <span className="text-[#81758F]">{k}</span>
                    <span className="font-bold text-[#1B082C]">{v}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-bold text-[10px] text-[#81758F] uppercase font-mono-tech mb-2">Certifications</h4>
              <div className="flex gap-2 flex-wrap">
                {selected.certifications?.map((c: string) => (
                  <span key={c} className="px-2 py-0.5 bg-[#EEE8FF] text-[#834DFB] border border-[#C9BDD9] rounded text-[10px] font-bold font-mono-tech">{c}</span>
                ))}
              </div>
            </div>
            {selected.risk_status === 'AT_RISK' && (
              <div className="p-3 bg-[#FDF2F2] border border-[#F8B4B4] rounded text-[#D94B5B] text-xs font-bold font-mono-tech">
                ⚠️ AT RISK: Reliability below 90% threshold. Sentinel agent recommends dual-sourcing evaluation.
              </div>
            )}
            <button onClick={() => setSelected(null)} className="w-full px-4 py-2 border border-[#DDD5EA] text-[#594B69] text-xs font-bold rounded font-mono-tech hover:bg-[#F5F3FF]">CLOSE</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OperatorSuppliersPage;
