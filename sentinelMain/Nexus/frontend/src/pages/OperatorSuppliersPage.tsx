import React, { useEffect, useState } from 'react';
import { Card } from '../components/ui/Card';
import { PageHeader } from '../components/ui/PageHeader';
import { StatusBadge } from '../components/ui/StatusBadge';

const API_BASE = 'http://localhost:8000/api/v1';

export interface OperatorSuppliersProps {
  onNavigate?: (path: string) => void;
}

export const OperatorSuppliersPage: React.FC<OperatorSuppliersProps> = ({ onNavigate }) => {
  const [suppliers, setSuppliers] = useState<any[]>([]);

  const fetchSuppliers = async () => {
    try {
      const res = await fetch(`${API_BASE}/operator/suppliers`, {
        headers: { 'X-User-Email': 'operator@nexus.io' },
      });
      if (res.ok) setSuppliers(await res.json());
    } catch (e) {
      console.error('Failed to fetch operator suppliers', e);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="SUPPLIER 360 DEGREE RADAR"
        subtitle="Operational supplier directory, reliability scores, monthly capacity allocation, and disruption index"
        badge="OPERATOR SUPPLIERS"
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
                <th className="pb-2">Supplier Code</th>
                <th className="pb-2">Supplier Name</th>
                <th className="pb-2">Tier</th>
                <th className="pb-2">Reliability Score</th>
                <th className="pb-2">Monthly Capacity</th>
                <th className="pb-2">Active POs</th>
                <th className="pb-2">Risk Level</th>
                <th className="pb-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DDD5EA]/50">
              {suppliers.map((s) => (
                <tr key={s.id}>
                  <td className="py-3 font-bold text-[#834DFB]">{s.supplier_code}</td>
                  <td className="py-3 font-bold text-[#1B082C]">{s.name}</td>
                  <td className="py-3 text-[#594B69]">{s.tier}</td>
                  <td className="py-3 font-bold text-[#3A9B68]">{(s.reliability_score * 100).toFixed(1)}%</td>
                  <td className="py-3 text-[#1B082C]">{s.monthly_capacity_units.toLocaleString()} Units</td>
                  <td className="py-3 text-[#594B69] font-semibold">{s.active_pos}</td>
                  <td className="py-3">
                    <StatusBadge status={s.risk_status === 'AT_RISK' ? 'critical' : 'healthy'} size="sm" />
                  </td>
                  <td className="py-3 text-right">
                    <button
                      onClick={() => onNavigate && onNavigate('/material-demo')}
                      className="px-3 py-1 bg-[#EEE8FF] hover:bg-[#834DFB] text-[#834DFB] hover:text-[#F5F3FF] font-mono-tech text-[11px] font-bold rounded transition-colors"
                    >
                      🔍 VIEW 360
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

export default OperatorSuppliersPage;
