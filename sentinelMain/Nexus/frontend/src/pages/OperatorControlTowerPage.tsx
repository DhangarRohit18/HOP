import React, { useEffect, useState } from 'react';
import { Card } from '../components/ui/Card';
import { MetricCard } from '../components/ui/MetricCard';
import { PageHeader } from '../components/ui/PageHeader';
import { StatusBadge } from '../components/ui/StatusBadge';

const API_BASE = '/api/v1';

export interface OperatorControlTowerProps {
  onNavigate?: (path: string) => void;
}

export const OperatorControlTowerPage: React.FC<OperatorControlTowerProps> = ({ onNavigate }) => {
  const [data, setData] = useState<any>(null);
  const [approvals, setApprovals] = useState<any[]>([]);
  const [timeline, setTimeline] = useState<any>(null);
  const [deciding, setDeciding] = useState(false);

  const fetchTowerData = async () => {
    try {
      const headers = { 'X-User-Email': 'operator@nexus.io' };
      const [towerRes, appRes, timeRes] = await Promise.all([
        fetch(`${API_BASE}/operator/control-tower`, { headers }),
        fetch(`${API_BASE}/operator/approvals`, { headers }),
        fetch(`${API_BASE}/operator/agent-timeline/INC-104`, { headers }),
      ]);

      if (towerRes.ok) setData(await towerRes.json());
      if (appRes.ok) setApprovals(await appRes.json());
      if (timeRes.ok) setTimeline(await timeRes.json());
    } catch (e) {
      console.error('Failed to fetch Control Tower data', e);
    }
  };

  useEffect(() => {
    fetchTowerData();
    const interval = setInterval(fetchTowerData, 5000);
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
        await fetchTowerData();
      }
    } catch (e) {
      console.error('Failed to execute decision', e);
    } finally {
      setDeciding(false);
    }
  };

  const pendingApproval = approvals.find((a) => a.status === 'PENDING');
  const isRecovered = timeline?.status === 'RECOVERED';

  return (
    <div className="space-y-6">
      <PageHeader
        title="OPERATOR CONTROL TOWER"
        subtitle="Real-time operational topology, Sentinel agent lifecycle tracking, and human-in-the-loop approvals"
        badge="OPERATOR"
        actions={
          <button
            onClick={() => onNavigate && onNavigate('/material-demo')}
            className="px-4 py-2 bg-[#834DFB] hover:bg-[#7040E5] text-[#F5F3FF] font-mono-tech text-xs font-bold rounded shadow-xs flex items-center gap-2"
          >
            🏷️ TRACE MATERIAL (QR MATRIX)
          </button>
        }
      />

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard
          title="Active Disruptions"
          value={data?.kpis?.active_disruptions ?? 1}
          subtext="Monitored in real-time"
          highlightColor="rose"
        />
        <MetricCard
          title="Production At Risk"
          value={isRecovered ? 0 : (data?.kpis?.production_at_risk ?? 1)}
          subtext={isRecovered ? 'All paths clear' : 'PRD-2026-001 affected'}
          highlightColor={isRecovered ? 'emerald' : 'rose'}
        />
        <MetricCard
          title="Delayed POs"
          value={data?.kpis?.delayed_purchase_orders ?? 1}
          subtext="PO-2026-001 (+4.0 Days)"
          highlightColor="amber"
        />
        <MetricCard
          title="Pending Approvals"
          value={pendingApproval ? 1 : 0}
          subtext={pendingApproval ? 'Requires operator action' : 'Zero pending'}
          highlightColor={pendingApproval ? 'indigo' : 'emerald'}
        />
        <MetricCard
          title="Active Recoveries"
          value={isRecovered ? 1 : 0}
          subtext={isRecovered ? 'Recovery verified' : 'In progress'}
          highlightColor="emerald"
        />
      </div>

      {/* MAIN INCIDENT CARD & APPROVAL WORKFLOW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-5 border border-[#DDD5EA] space-y-4">
            <div className="flex items-center justify-between border-b border-[#DDD5EA] pb-3">
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-[#D94B5B] animate-ping"></span>
                <h3 className="font-mono-tech font-bold text-sm text-[#1B082C]">INCIDENT INC-104 // SUPPLIER DISRUPTION</h3>
              </div>
              <StatusBadge status={isRecovered ? 'healthy' : 'critical'} />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#FBFAFF] p-3 rounded-sm border border-[#DDD5EA] font-mono-tech text-xs">
              <div>
                <span className="text-[10px] text-[#81758F] block uppercase">Supplier</span>
                <span className="font-bold text-[#834DFB]">SUP-001 (Apex)</span>
              </div>
              <div>
                <span className="text-[10px] text-[#81758F] block uppercase">Target PO</span>
                <span className="font-bold text-[#1B082C]">PO-2026-001</span>
              </div>
              <div>
                <span className="text-[10px] text-[#81758F] block uppercase">Component</span>
                <span className="font-bold text-[#1B082C]">CMP-001</span>
              </div>
              <div>
                <span className="text-[10px] text-[#81758F] block uppercase">Financial Exposure</span>
                <span className="font-bold text-[#D94B5B]">{isRecovered ? '$0 (Recovered)' : '$200,000'}</span>
              </div>
            </div>

            {/* HUMAN-IN-THE-LOOP APPROVAL ACTION BANNER */}
            {pendingApproval ? (
              <div className="p-4 bg-[#FFFBD1] border border-[#F0E100] rounded-sm space-y-3 font-mono-tech">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-[#1B082C]">⚠️ HUMAN-IN-THE-LOOP APPROVAL REQUIRED</span>
                  <span className="text-[10px] bg-[#834DFB] text-[#F5F3FF] px-2 py-0.5 rounded font-bold">THRESH: $150,000</span>
                </div>
                <p className="text-xs text-[#594B69]">
                  Sentinel proposed emergency spot procurement of CMP-001 from alternate catalog supplier. Estimated action value <strong>${Number(pendingApproval.financial_value).toLocaleString()}</strong> exceeds configured threshold limit.
                </p>

                <div className="flex gap-3 pt-1">
                  <button
                    onClick={() => handleDecision(pendingApproval.id, 'APPROVED')}
                    disabled={deciding}
                    className="px-4 py-2 bg-[#3A9B68] hover:bg-[#2F8256] text-[#F5F3FF] text-xs font-bold rounded shadow-xs transition-colors"
                  >
                    {deciding ? 'EXECUTING...' : '✅ APPROVE RECOVERY ACTION'}
                  </button>
                  <button
                    onClick={() => handleDecision(pendingApproval.id, 'REJECTED')}
                    disabled={deciding}
                    className="px-4 py-2 bg-[#D94B5B] hover:bg-[#B83B4A] text-[#F5F3FF] text-xs font-bold rounded shadow-xs transition-colors"
                  >
                    ❌ REJECT
                  </button>
                </div>
              </div>
            ) : isRecovered ? (
              <div className="p-4 bg-[#E8F8F0] border border-[#3A9B68] text-[#3A9B68] rounded font-mono-tech text-xs font-bold">
                🎉 RECOVERY COMPLETE — Emergency spot buy RFQ generated. Residual exposure reduced to $0.00.
              </div>
            ) : null}
          </Card>
        </div>

        {/* SENTINEL AGENT TIMELINE STREAM */}
        <Card className="p-5 border border-[#DDD5EA] space-y-4">
          <div className="flex items-center justify-between border-b border-[#DDD5EA] pb-3">
            <h3 className="font-mono-tech font-bold text-sm text-[#1B082C]">🤖 SENTINEL AGENT TIMELINE</h3>
            <span className="w-2 h-2 rounded-full bg-[#834DFB] animate-pulse"></span>
          </div>

          <div className="space-y-3 max-h-[350px] overflow-y-auto font-mono-tech text-xs pr-1">
            {timeline?.timeline_steps?.map((step: any, idx: number) => (
              <div key={idx} className="flex items-start gap-3 border-l-2 border-[#834DFB] pl-3 py-1">
                <span className="text-[10px] text-[#81758F] font-semibold">{step.time}</span>
                <div>
                  <div className="font-bold text-[#834DFB] text-[11px] uppercase">{step.step}</div>
                  <div className="text-[#594B69] text-[11px]">{step.message}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default OperatorControlTowerPage;
