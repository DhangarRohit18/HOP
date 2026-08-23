import React, { useEffect, useState } from 'react';
import { Card } from '../components/ui/Card';
import { PageHeader } from '../components/ui/PageHeader';
import { StatusBadge } from '../components/ui/StatusBadge';
import { MetricCard } from '../components/ui/MetricCard';

const API_BASE = '/api/v1';

const DEMO_POS = [
  { id: 'PO-001', po_number: 'PO-2026-001', supplier_code: 'SUP-001', supplier_name: 'Apex Precision Parts', component: 'CMP-001 (ECU)', quantity: 500, order_date: '2026-08-10', expected_delivery_date: '2026-08-24', total_amount: 925000, delay_days: 4.0, status: 'DELAYED', currency: '₹', priority: 'P1-CRITICAL' },
  { id: 'PO-002', po_number: 'PO-2026-002', supplier_code: 'SUP-002', supplier_name: 'BharatElectech Systems', component: 'CMP-002 (ABS Module)', quantity: 300, order_date: '2026-08-12', expected_delivery_date: '2026-08-26', total_amount: 285000, delay_days: 0, status: 'ON_SCHEDULE', currency: '₹', priority: 'P2-HIGH' },
  { id: 'PO-003', po_number: 'PO-2026-003', supplier_code: 'SUP-003', supplier_name: 'Chennai Turbo Forge', component: 'CMP-003 (Turbocharger)', quantity: 150, order_date: '2026-08-08', expected_delivery_date: '2026-08-22', total_amount: 480000, delay_days: 2.5, status: 'DELAYED', currency: '₹', priority: 'P2-HIGH' },
  { id: 'PO-004', po_number: 'PO-2026-004', supplier_code: 'SUP-004', supplier_name: 'Maratha Drivetrain Corp.', component: 'CMP-005 (Clutch Pack)', quantity: 200, order_date: '2026-08-15', expected_delivery_date: '2026-08-28', total_amount: 420000, delay_days: 0, status: 'ON_SCHEDULE', currency: '₹', priority: 'P3-MEDIUM' },
  { id: 'PO-005', po_number: 'PO-2026-005', supplier_code: 'SUP-005', supplier_name: 'PowerGen Auto Electricals', component: 'CMP-006 (Alternator)', quantity: 400, order_date: '2026-08-14', expected_delivery_date: '2026-08-25', total_amount: 272000, delay_days: 0, status: 'DELIVERED', currency: '₹', priority: 'P3-MEDIUM' },
  { id: 'PO-006', po_number: 'PO-2026-006', supplier_code: 'SUP-001', supplier_name: 'Apex Precision Parts', component: 'CMP-004 (Fuel Rail)', quantity: 600, order_date: '2026-08-18', expected_delivery_date: '2026-09-02', total_amount: 252000, delay_days: 0, status: 'PROCESSING', currency: '₹', priority: 'P3-MEDIUM' },
  { id: 'PO-007', po_number: 'PO-2026-007', supplier_code: 'SUP-006', supplier_name: 'AxisTech Steering Solutions', component: 'CMP-007 (Steering Rack)', quantity: 100, order_date: '2026-08-20', expected_delivery_date: '2026-08-30', total_amount: 145000, delay_days: 1.5, status: 'DELAYED', currency: '₹', priority: 'P1-CRITICAL' },
];

export interface OperatorPurchaseOrdersProps {
  onNavigate?: (path: string) => void;
}

export const OperatorPurchaseOrdersPage: React.FC<OperatorPurchaseOrdersProps> = ({ onNavigate }) => {
  const [pos, setPos] = useState<any[]>(DEMO_POS);
  const [filter, setFilter] = useState<'ALL' | 'DELAYED' | 'ON_SCHEDULE' | 'DELIVERED' | 'PROCESSING'>('ALL');
  const [selectedPO, setSelectedPO] = useState<any>(null);

  useEffect(() => {
    fetch(`${API_BASE}/operator/purchase-orders`, { headers: { 'X-User-Email': 'operator@nexus.io' } })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.length) setPos(d); })
      .catch(() => {});
  }, []);

  const filtered = pos.filter(p => filter === 'ALL' || p.status === filter);
  const delayed = pos.filter(p => p.status === 'DELAYED').length;
  const totalValue = pos.reduce((s, p) => s + p.total_amount, 0);
  const atRiskValue = pos.filter(p => p.status === 'DELAYED').reduce((s, p) => s + p.total_amount, 0);

  const statusStyle = (status: string) => {
    switch (status) {
      case 'DELAYED': return 'bg-[#FDF2F2] text-[#D94B5B] border-[#F8B4B4]';
      case 'ON_SCHEDULE': return 'bg-[#ECFDF5] text-[#3A9B68] border-[#A7F3D0]';
      case 'DELIVERED': return 'bg-[#EEE8FF] text-[#834DFB] border-[#C9BDD9]';
      case 'PROCESSING': return 'bg-[#FFFBEB] text-[#F59E0B] border-[#FCD34D]';
      default: return 'bg-[#F5F3FF] text-[#81758F] border-[#DDD5EA]';
    }
  };

  const priorityStyle = (p: string) => p.startsWith('P1') ? 'text-[#D94B5B]' : p.startsWith('P2') ? 'text-[#F59E0B]' : 'text-[#3A9B68]';

  return (
    <div className="space-y-6">
      <PageHeader
        title="PURCHASE ORDERS RADAR"
        subtitle="Graph procurement tracking, supplier delivery ETAs, schedule delay risk, and financial values"
        badge="OPERATOR POs"
        actions={
          <button onClick={() => onNavigate && onNavigate('/material-demo')}
            className="px-4 py-2 bg-[#834DFB] hover:bg-[#7040E5] text-[#F5F3FF] font-mono-tech text-xs font-bold rounded shadow-xs flex items-center gap-2">
            🏷️ TRACE MATERIAL
          </button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Total POs" value={pos.length} subtext="Open purchase orders" highlightColor="indigo" />
        <MetricCard title="Delayed POs" value={delayed} subtext="Requiring intervention" highlightColor="rose" />
        <MetricCard title="Total Procurement" value={`₹${(totalValue / 1000000).toFixed(1)}M`} subtext="Current period value" highlightColor="emerald" />
        <MetricCard title="At-Risk Value" value={`₹${(atRiskValue / 1000).toFixed(0)}K`} subtext="From delayed orders" highlightColor="amber" />
      </div>

      <div className="flex gap-2 flex-wrap">
        {(['ALL', 'DELAYED', 'ON_SCHEDULE', 'DELIVERED', 'PROCESSING'] as const).map(f => (
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
                <th className="pb-2 pr-4">PO Number</th>
                <th className="pb-2 pr-4">Supplier</th>
                <th className="pb-2 pr-4">Component</th>
                <th className="pb-2 pr-4">Priority</th>
                <th className="pb-2 pr-4">Qty</th>
                <th className="pb-2 pr-4">Order Date</th>
                <th className="pb-2 pr-4">Expected Delivery</th>
                <th className="pb-2 pr-4">Value</th>
                <th className="pb-2 pr-4">Delay</th>
                <th className="pb-2 pr-4">Status</th>
                <th className="pb-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DDD5EA]/50">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-[#FBFAFF] transition-colors">
                  <td className="py-3 pr-4 font-bold text-[#834DFB]">{p.po_number}</td>
                  <td className="py-3 pr-4 text-[#1B082C]">
                    <div className="font-bold">{p.supplier_code}</div>
                    <div className="text-[#81758F] text-[10px]">{p.supplier_name}</div>
                  </td>
                  <td className="py-3 pr-4 text-[#1B082C] font-semibold">{p.component}</td>
                  <td className="py-3 pr-4 font-bold text-[10px]">
                    <span className={priorityStyle(p.priority)}>{p.priority}</span>
                  </td>
                  <td className="py-3 pr-4 text-[#594B69]">{p.quantity?.toLocaleString()}</td>
                  <td className="py-3 pr-4 text-[#594B69]">{p.order_date}</td>
                  <td className="py-3 pr-4 text-[#594B69]">{p.expected_delivery_date}</td>
                  <td className="py-3 pr-4 font-bold text-[#1B082C]">{p.currency}{p.total_amount?.toLocaleString()}</td>
                  <td className="py-3 pr-4 font-bold">
                    {p.delay_days > 0
                      ? <span className="text-[#D94B5B]">+{p.delay_days.toFixed(1)} Days</span>
                      : <span className="text-[#3A9B68]">On Time</span>}
                  </td>
                  <td className="py-3 pr-4">
                    <span className={`px-2 py-0.5 rounded border text-[9px] font-bold ${statusStyle(p.status)}`}>
                      {p.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <button onClick={() => setSelectedPO(p)}
                      className="px-2 py-1 bg-[#EEE8FF] hover:bg-[#834DFB] text-[#834DFB] hover:text-white font-mono-tech text-[10px] font-bold rounded transition-colors">
                      🏷️ TRACE
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* PO DETAIL MODAL */}
      {selectedPO && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-[#DDD5EA] rounded-lg p-6 max-w-lg w-full shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#DDD5EA] pb-3">
              <h3 className="font-mono-tech font-bold text-sm text-[#1B082C]">📋 PO DETAIL // {selectedPO.po_number}</h3>
              <button onClick={() => setSelectedPO(null)} className="text-[#81758F] hover:text-[#1B082C] text-lg">✕</button>
            </div>
            <div className="grid grid-cols-2 gap-2 font-mono-tech text-xs">
              {[
                ['PO Number', selectedPO.po_number], ['Supplier', selectedPO.supplier_code],
                ['Component', selectedPO.component], ['Priority', selectedPO.priority],
                ['Quantity', selectedPO.quantity?.toLocaleString()],
                ['Total Value', `${selectedPO.currency}${selectedPO.total_amount?.toLocaleString()}`],
                ['Order Date', selectedPO.order_date], ['Expected Delivery', selectedPO.expected_delivery_date],
                ['Status', selectedPO.status], ['Delay', selectedPO.delay_days > 0 ? `+${selectedPO.delay_days} days` : 'None'],
              ].map(([k, v]) => (
                <div key={k} className="p-2 bg-[#FBFAFF] border border-[#DDD5EA] rounded">
                  <div className="text-[#81758F] text-[9px] uppercase">{k}</div>
                  <div className="font-bold text-[#1B082C] text-xs mt-0.5">{v}</div>
                </div>
              ))}
            </div>
            {selectedPO.status === 'DELAYED' && (
              <div className="p-3 bg-[#FDF2F2] border border-[#F8B4B4] rounded text-[#D94B5B] text-xs font-bold font-mono-tech">
                ⚠️ DELAYED PO — Sentinel agent is monitoring and has triggered alternate supplier evaluation.
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => { setSelectedPO(null); onNavigate && onNavigate('/material-demo'); }}
                className="flex-1 px-4 py-2 bg-[#834DFB] text-white text-xs font-bold rounded font-mono-tech">
                🏷️ TRACE MATERIAL PASSPORT
              </button>
              <button onClick={() => setSelectedPO(null)}
                className="px-4 py-2 border border-[#DDD5EA] text-[#594B69] text-xs font-bold rounded font-mono-tech">CLOSE</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OperatorPurchaseOrdersPage;
