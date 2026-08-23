import React, { useEffect, useState } from 'react';
import { Card } from '../components/ui/Card';
import { PageHeader } from '../components/ui/PageHeader';
import { StatusBadge } from '../components/ui/StatusBadge';

const API_BASE = 'http://localhost:8000/api/v1';

export interface OperatorProductionProps {
  onNavigate?: (path: string) => void;
}

export const OperatorProductionPage: React.FC<OperatorProductionProps> = ({ onNavigate }) => {
  const [production, setProduction] = useState<any[]>([]);

  const fetchProduction = async () => {
    try {
      const res = await fetch(`${API_BASE}/operator/production`, {
        headers: { 'X-User-Email': 'operator@nexus.io' },
      });
      if (res.ok) setProduction(await res.json());
    } catch (e) {
      console.error('Failed to fetch operator production orders', e);
    }
  };

  useEffect(() => {
    fetchProduction();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="PRODUCTION CONTINUITY DASHBOARD"
        subtitle="Assembly lines, manufacturing schedule commitments, required component dependencies, and risk status"
        badge="OPERATOR PRODUCTION"
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
                <th className="pb-2">Production Order</th>
                <th className="pb-2">Priority</th>
                <th className="pb-2">Planned Start</th>
                <th className="pb-2">Planned Completion</th>
                <th className="pb-2">Required Component</th>
                <th className="pb-2">Status</th>
                <th className="pb-2">Production Risk</th>
                <th className="pb-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DDD5EA]/50">
              {production.map((prd) => (
                <tr key={prd.id}>
                  <td className="py-3 font-bold text-[#834DFB]">{prd.order_number}</td>
                  <td className="py-3">
                    <span className="px-2 py-0.5 bg-[#EEE8FF] text-[#834DFB] border border-[#C9BDD9] rounded text-[10px] font-bold">
                      {prd.priority}
                    </span>
                  </td>
                  <td className="py-3 text-[#594B69]">{prd.start_date}</td>
                  <td className="py-3 text-[#594B69]">{prd.completion_date}</td>
                  <td className="py-3 font-bold text-[#1B082C]">{prd.required_component}</td>
                  <td className="py-3 text-[#594B69]">{prd.status}</td>
                  <td className="py-3">
                    <StatusBadge status={prd.production_risk === 'CRITICAL' ? 'critical' : 'healthy'} size="sm" />
                  </td>
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

export default OperatorProductionPage;
