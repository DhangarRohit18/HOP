import React, { useEffect, useState } from 'react';
import { Card } from '../components/ui/Card';
import { PageHeader } from '../components/ui/PageHeader';
import { StatusBadge } from '../components/ui/StatusBadge';
import { MetricCard } from '../components/ui/MetricCard';

const API_BASE = '/api/v1';

const DEMO_INVENTORY = [
  { id: 'INV-001', part_number: 'CMP-001', name: 'Engine Control Unit (ECU)', current_stock: 48, daily_usage: 12, safety_stock: 60, coverage_days: 4.0, risk_level: 'CRITICAL', warehouse_code: 'WH-PUNE-A1', unit_cost: 1850, last_reorder: '2026-08-20', supplier_code: 'SUP-001' },
  { id: 'INV-002', part_number: 'CMP-002', name: 'ABS Module Assembly', current_stock: 320, daily_usage: 18, safety_stock: 90, coverage_days: 17.8, risk_level: 'HEALTHY', warehouse_code: 'WH-PUNE-A2', unit_cost: 950, last_reorder: '2026-08-15', supplier_code: 'SUP-002' },
  { id: 'INV-003', part_number: 'CMP-003', name: 'Turbocharger Unit', current_stock: 95, daily_usage: 22, safety_stock: 110, coverage_days: 4.3, risk_level: 'WARNING', warehouse_code: 'WH-CHENNAI-B1', unit_cost: 3200, last_reorder: '2026-08-18', supplier_code: 'SUP-003' },
  { id: 'INV-004', part_number: 'CMP-004', name: 'Fuel Injection Rail', current_stock: 500, daily_usage: 30, safety_stock: 150, coverage_days: 16.7, risk_level: 'HEALTHY', warehouse_code: 'WH-PUNE-A3', unit_cost: 420, last_reorder: '2026-08-10', supplier_code: 'SUP-001' },
  { id: 'INV-005', part_number: 'CMP-005', name: 'Transmission Clutch Pack', current_stock: 78, daily_usage: 10, safety_stock: 50, coverage_days: 7.8, risk_level: 'WARNING', warehouse_code: 'WH-CHENNAI-B2', unit_cost: 2100, last_reorder: '2026-08-19', supplier_code: 'SUP-004' },
  { id: 'INV-006', part_number: 'CMP-006', name: 'Alternator 95A', current_stock: 450, daily_usage: 25, safety_stock: 125, coverage_days: 18.0, risk_level: 'HEALTHY', warehouse_code: 'WH-PUNE-A1', unit_cost: 680, last_reorder: '2026-08-12', supplier_code: 'SUP-005' },
  { id: 'INV-007', part_number: 'CMP-007', name: 'Steering Rack Assembly', current_stock: 35, daily_usage: 15, safety_stock: 75, coverage_days: 2.3, risk_level: 'CRITICAL', warehouse_code: 'WH-DELHI-C1', unit_cost: 1450, last_reorder: '2026-08-22', supplier_code: 'SUP-006' },
  { id: 'INV-008', part_number: 'CMP-008', name: 'Brake Caliper Set (Front)', current_stock: 620, daily_usage: 40, safety_stock: 200, coverage_days: 15.5, risk_level: 'HEALTHY', warehouse_code: 'WH-PUNE-A2', unit_cost: 360, last_reorder: '2026-08-08', supplier_code: 'SUP-002' },
];

export interface OperatorInventoryProps {
  onNavigate?: (path: string) => void;
}

export const OperatorInventoryPage: React.FC<OperatorInventoryProps> = ({ onNavigate }) => {
  const [inventory, setInventory] = useState<any[]>(DEMO_INVENTORY);
  const [filter, setFilter] = useState<'ALL' | 'CRITICAL' | 'WARNING' | 'HEALTHY'>('ALL');
  const [search, setSearch] = useState('');
  const [selectedItem, setSelectedItem] = useState<any>(null);

  useEffect(() => {
    fetch(`${API_BASE}/operator/inventory`, { headers: { 'X-User-Email': 'operator@nexus.io' } })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.length) setInventory(d); })
      .catch(() => {});
  }, []);

  const filtered = inventory.filter(item => {
    const matchSearch = item.name.toLowerCase().includes(search.toLowerCase()) || item.part_number.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'ALL' || item.risk_level === filter;
    return matchSearch && matchFilter;
  });

  const critical = inventory.filter(i => i.risk_level === 'CRITICAL').length;
  const warning = inventory.filter(i => i.risk_level === 'WARNING').length;
  const healthy = inventory.filter(i => i.risk_level === 'HEALTHY').length;
  const totalValue = inventory.reduce((sum, i) => sum + i.current_stock * i.unit_cost, 0);

  const riskColor = (level: string) => {
    if (level === 'CRITICAL') return 'text-[#D94B5B]';
    if (level === 'WARNING') return 'text-[#F59E0B]';
    return 'text-[#3A9B68]';
  };

  const coverageBar = (days: number) => {
    const pct = Math.min((days / 20) * 100, 100);
    const color = days < 5 ? '#D94B5B' : days < 8 ? '#F59E0B' : '#3A9B68';
    return (
      <div className="flex items-center gap-2">
        <div className="w-20 h-1.5 bg-[#DDD5EA] rounded-full overflow-hidden">
          <div style={{ width: `${pct}%`, background: color }} className="h-full rounded-full transition-all" />
        </div>
        <span className="font-bold" style={{ color }}>{days.toFixed(1)}d</span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="OPERATIONAL INVENTORY TELEMETRY"
        subtitle="Real-time stock positions, daily usage velocity, days coverage calculations, and risk levels"
        badge="OPERATOR INVENTORY"
        actions={
          <button
            onClick={() => onNavigate && onNavigate('/material-demo')}
            className="px-4 py-2 bg-[#834DFB] hover:bg-[#7040E5] text-[#F5F3FF] font-mono-tech text-xs font-bold rounded shadow-xs flex items-center gap-2"
          >
            🏷️ TRACE MATERIAL
          </button>
        }
      />

      {/* KPI CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Critical Stock" value={critical} subtext="Immediate reorder required" highlightColor="rose" />
        <MetricCard title="Warning Stock" value={warning} subtext="Below safety threshold" highlightColor="amber" />
        <MetricCard title="Healthy Stock" value={healthy} subtext="Within safe coverage" highlightColor="emerald" />
        <MetricCard title="Total Inventory Value" value={`₹${(totalValue / 1000000).toFixed(1)}M`} subtext="Across all warehouses" highlightColor="indigo" />
      </div>

      {/* FILTERS */}
      <Card className="p-4 border border-[#DDD5EA]">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex gap-2">
            {(['ALL', 'CRITICAL', 'WARNING', 'HEALTHY'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded text-xs font-bold font-mono-tech transition-colors border ${filter === f ? 'bg-[#834DFB] text-white border-[#834DFB]' : 'bg-white text-[#594B69] border-[#DDD5EA] hover:bg-[#F5F3FF]'}`}>
                {f}
              </button>
            ))}
          </div>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search part or component..."
            className="px-3 py-1.5 border border-[#DDD5EA] rounded text-xs font-mono-tech w-64 focus:outline-none focus:border-[#834DFB]"
          />
        </div>
      </Card>

      {/* TABLE */}
      <Card className="p-5 border border-[#DDD5EA]">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono-tech text-xs">
            <thead>
              <tr className="border-b border-[#DDD5EA] text-[#81758F] uppercase text-[10px]">
                <th className="pb-2 pr-4">Part No.</th>
                <th className="pb-2 pr-4">Component Name</th>
                <th className="pb-2 pr-4">Current Stock</th>
                <th className="pb-2 pr-4">Daily Usage</th>
                <th className="pb-2 pr-4">Safety Stock</th>
                <th className="pb-2 pr-4">Coverage</th>
                <th className="pb-2 pr-4">Risk State</th>
                <th className="pb-2 pr-4">Supplier</th>
                <th className="pb-2 pr-4">Warehouse</th>
                <th className="pb-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DDD5EA]/50">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-[#FBFAFF] transition-colors">
                  <td className="py-3 pr-4 font-bold text-[#834DFB]">{item.part_number}</td>
                  <td className="py-3 pr-4 font-bold text-[#1B082C] max-w-[180px]">{item.name}</td>
                  <td className="py-3 pr-4 font-semibold text-[#1B082C]">{item.current_stock.toLocaleString()}</td>
                  <td className="py-3 pr-4 text-[#594B69]">{item.daily_usage}/day</td>
                  <td className="py-3 pr-4 text-[#594B69]">{item.safety_stock}</td>
                  <td className="py-3 pr-4">{coverageBar(item.coverage_days)}</td>
                  <td className="py-3 pr-4">
                    <span className={`font-bold text-[10px] px-2 py-0.5 rounded border ${item.risk_level === 'CRITICAL' ? 'bg-[#FDF2F2] text-[#D94B5B] border-[#F8B4B4]' : item.risk_level === 'WARNING' ? 'bg-[#FFFBEB] text-[#F59E0B] border-[#FCD34D]' : 'bg-[#ECFDF5] text-[#3A9B68] border-[#A7F3D0]'}`}>
                      {item.risk_level}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-[#594B69]">{item.supplier_code}</td>
                  <td className="py-3 pr-4 text-[#594B69]">{item.warehouse_code}</td>
                  <td className="py-3 text-right flex items-center gap-1 justify-end">
                    <button onClick={() => setSelectedItem(item)} className="px-2 py-1 bg-[#EEE8FF] hover:bg-[#834DFB] text-[#834DFB] hover:text-white rounded text-[10px] font-bold transition-colors">
                      📋 DETAIL
                    </button>
                    <button onClick={() => onNavigate && onNavigate('/material-demo')} className="px-2 py-1 bg-[#EEE8FF] hover:bg-[#834DFB] text-[#834DFB] hover:text-white rounded text-[10px] font-bold transition-colors">
                      🏷️ TRACE
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-12 text-center text-[#81758F] font-mono-tech text-sm">No components match current filters.</div>
          )}
        </div>
      </Card>

      {/* ITEM DETAIL MODAL */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-[#DDD5EA] rounded-lg p-6 max-w-lg w-full shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#DDD5EA] pb-3">
              <h3 className="font-mono-tech font-bold text-sm text-[#1B082C]">📦 INVENTORY DETAIL // {selectedItem.part_number}</h3>
              <button onClick={() => setSelectedItem(null)} className="text-[#81758F] hover:text-[#1B082C] text-lg">✕</button>
            </div>
            <div className="space-y-3 font-mono-tech text-xs">
              <div className="grid grid-cols-2 gap-3">
                {[
                  ['Component', selectedItem.name],
                  ['Supplier', selectedItem.supplier_code],
                  ['Warehouse', selectedItem.warehouse_code],
                  ['Unit Cost', `₹${selectedItem.unit_cost?.toLocaleString()}`],
                  ['Current Stock', `${selectedItem.current_stock} units`],
                  ['Safety Stock', `${selectedItem.safety_stock} units`],
                  ['Daily Usage', `${selectedItem.daily_usage} units/day`],
                  ['Coverage', `${selectedItem.coverage_days.toFixed(1)} days`],
                  ['Last Reorder', selectedItem.last_reorder],
                  ['Total Value', `₹${(selectedItem.current_stock * selectedItem.unit_cost)?.toLocaleString()}`],
                ].map(([k, v]) => (
                  <div key={k} className="p-2 bg-[#FBFAFF] border border-[#DDD5EA] rounded">
                    <div className="text-[#81758F] text-[9px] uppercase mb-0.5">{k}</div>
                    <div className="font-bold text-[#1B082C]">{v}</div>
                  </div>
                ))}
              </div>
              {selectedItem.risk_level === 'CRITICAL' && (
                <div className="p-3 bg-[#FDF2F2] border border-[#F8B4B4] rounded text-[#D94B5B] font-bold">
                  ⚠️ CRITICAL: Stock below safety threshold. Immediate reorder required. Sentinel agent monitoring.
                </div>
              )}
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => onNavigate && onNavigate('/material-demo')} className="flex-1 px-4 py-2 bg-[#834DFB] text-white text-xs font-bold rounded">🏷️ TRACE MATERIAL PASSPORT</button>
              <button onClick={() => setSelectedItem(null)} className="px-4 py-2 border border-[#DDD5EA] text-[#594B69] text-xs font-bold rounded">CLOSE</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OperatorInventoryPage;
