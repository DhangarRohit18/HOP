import React, { useEffect, useState } from 'react';
import { Card } from '../components/ui/Card';
import { PageHeader } from '../components/ui/PageHeader';
import { StatusBadge } from '../components/ui/StatusBadge';

const API_BASE = 'http://localhost:8000/api/v1';

export const OperatorApprovalsPage: React.FC = () => {
  const [approvals, setApprovals] = useState<any[]>([]);
  const [deciding, setDeciding] = useState(false);

  const fetchApprovals = async () => {
    try {
      const res = await fetch(`${API_BASE}/operator/approvals`, {
        headers: { 'X-User-Email': 'operator@nexus.io' },
      });
      if (res.ok) setApprovals(await res.json());
    } catch (e) {
      console.error('Failed to fetch approval requests', e);
    }
  };

  useEffect(() => {
    fetchApprovals();
    const interval = setInterval(fetchApprovals, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleDecision = async (approvalId: string, decision: 'APPROVED' | 'REJECTED') => {
    setDeciding(true);
    try {
      const res = await fetch(`${API_BASE}/operator/approvals/${approvalId}/decide`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Email': 'operator@nexus.io',
        },
        body: JSON.stringify({ decision }),
      });
      if (res.ok) {
        fetchApprovals();
      }
    } catch (e) {
      console.error('Failed to process approval decision', e);
    } finally {
      setDeciding(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="HUMAN-IN-THE-LOOP APPROVAL REQUESTS"
        subtitle="Review and decide Sentinel agent emergency recovery proposals exceeding financial threshold rules"
        badge="OPERATOR APPROVALS"
      />

      <Card className="p-5 border border-[#DDD5EA]">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono-tech text-xs">
            <thead>
              <tr className="border-b border-[#DDD5EA] text-[#81758F] uppercase text-[10px]">
                <th className="pb-2">Approval ID</th>
                <th className="pb-2">Requested Action</th>
                <th className="pb-2">Reason</th>
                <th className="pb-2">Financial Value</th>
                <th className="pb-2">Impact</th>
                <th className="pb-2">Status</th>
                <th className="pb-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DDD5EA]/50">
              {approvals.map((app) => (
                <tr key={app.id}>
                  <td className="py-3 font-bold text-[#834DFB]">{app.id.slice(0, 8)}...</td>
                  <td className="py-3 font-bold text-[#1B082C]">{app.requested_action}</td>
                  <td className="py-3 text-[#594B69] max-w-xs">{app.reason}</td>
                  <td className="py-3 font-bold text-[#D94B5B]">${Number(app.financial_value).toLocaleString()}</td>
                  <td className="py-3 font-bold text-[#834DFB]">{app.production_impact}</td>
                  <td className="py-3">
                    <StatusBadge status={app.status === 'APPROVED' ? 'healthy' : app.status === 'PENDING' ? 'critical' : 'degraded'} size="sm" />
                  </td>
                  <td className="py-3 text-right">
                    {app.status === 'PENDING' ? (
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleDecision(app.id, 'APPROVED')}
                          disabled={deciding}
                          className="px-3 py-1 bg-[#3A9B68] text-[#F5F3FF] font-bold rounded text-[11px]"
                        >
                          ✅ APPROVE
                        </button>
                        <button
                          onClick={() => handleDecision(app.id, 'REJECTED')}
                          disabled={deciding}
                          className="px-3 py-1 bg-[#D94B5B] text-[#F5F3FF] font-bold rounded text-[11px]"
                        >
                          ❌ REJECT
                        </button>
                      </div>
                    ) : (
                      <span className="text-[#81758F] font-bold">{app.decided_by || 'DECIDED'}</span>
                    )}
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

export default OperatorApprovalsPage;
