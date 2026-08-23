import React, { useEffect, useState } from 'react';
import { Card } from '../components/ui/Card';
import { PageHeader } from '../components/ui/PageHeader';
import { StatusBadge } from '../components/ui/StatusBadge';

const API_BASE = 'http://localhost:8000/api/v1';

export interface OperatorInventoryProps {
  onNavigate?: (path: string) => void;
}

export const OperatorInventoryPage: React.FC<OperatorInventoryProps> = ({ onNavigate }) => {
  const [inventory, setInventory] = useState<any[]>([]);

  const fetchInventory = async () => {
    try {
      const res = await fetch(`${API_BASE}/operator/inventory`, {
        headers: { 'X-User-Email': 'operator@nexus.io' },
      });
      if (res.ok) setInventory(await res.json());
    } catch (e) {
      console.error('Failed to fetch operator inventory', e);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

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
            🏷️ TRACE MATERIAL (QR MATRIX)
          </button>
        }
      />

      <Card className="p-5 border border-[#DDD5EA]">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono-tech text-xs">
            <thead>
              <tr className="border-b border-[#DDD5EA] text-[#81758F] uppercase text-[10px]">
                <th className="pb-2">Part Number</th>
                <th className="pb-2">Component Name</th>
                <th className="pb-2">Current Stock</th>
                <th className="pb-2">Daily Usage</th>
                <th className="pb-2">Safety Stock</th>
                <th className="pb-2">Days Coverage</th>
                <th className="pb-2">Risk State</th>
                <th className="pb-2">Warehouse</th>
                <th className="pb-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DDD5EA]/50">
              {inventory.map((item) => (
                <tr key={item.id}>
                  <td className="py-3 font-bold text-[#834DFB]">{item.part_number}</td>
                  <td className="py-3 font-bold text-[#1B082C]">{item.name}</td>
                  <td className="py-3 text-[#1B082C] font-semibold">{item.current_stock} Units</td>
                  <td className="py-3 text-[#594B69]">{item.daily_usage} / day</td>
                  <td className="py-3 text-[#594B69]">{item.safety_stock} Units</td>
                  <td className="py-3 font-extrabold text-[#1B082C]">{item.coverage_days.toFixed(1)} Days</td>
                  <td className="py-3">
                    <StatusBadge status={item.risk_level === 'CRITICAL' ? 'critical' : 'healthy'} size="sm" />
                  </td>
                  <td className="py-3 text-[#594B69]">{item.warehouse_code}</td>
                  <td className="py-3 text-right">
                    <button
                      onClick={() => onNavigate && onNavigate('/material-demo')}
                      className="px-3 py-1 bg-[#EEE8FF] hover:bg-[#834DFB] text-[#834DFB] hover:text-[#F5F3FF] font-mono-tech text-[11px] font-bold rounded transition-colors"
                    >
                      🏷️ TRACE
                    </button>
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

export default OperatorInventoryPage;
