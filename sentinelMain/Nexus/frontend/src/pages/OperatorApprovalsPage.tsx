import React, { useEffect, useState } from 'react';
import { Card } from '../components/ui/Card';
import { PageHeader } from '../components/ui/PageHeader';
import { MetricCard } from '../components/ui/MetricCard';
import { StatusBadge } from '../components/ui/StatusBadge';

const API_BASE = '/api/v1';

// Full demo dataset — shown when backend is unavailable
const DEMO_APPROVALS = [
  {
    id: 'APV-2026-001', incident_id: 'INC-104', requested_action: 'Emergency Spot Procurement — CMP-001 (ECU) from SUP-007',
    reason: 'SUP-001 delay of +4.0 days on PO-2026-001 will breach CMP-001 safety stock. Stock coverage: 4.0 days. Assembly PRD-2026-001 halts in 4 days without intervention.',
    financial_value: 960000, production_impact: 'PRD-2026-001 (400 vehicles)', sla_exposure: 16400000,
    status: 'APPROVED', decided_by: 'operator@nexus.io', decided_at: '2026-08-23T02:16:45Z',
    proposed_supplier: 'SUP-007 (NexaElec)', lead_time: '3 days', unit_premium: '3.8%',
  },
  {
    id: 'APV-2026-002', incident_id: 'INC-105', requested_action: 'Expedited Freight Authorization — CMP-007 (Steering Rack) from SUP-006',
    reason: 'CMP-007 stock at 2.3 days coverage. Regular lead time (10 days) insufficient. Emergency air freight reduces delivery to 5 days.',
    financial_value: 145000, production_impact: 'PRD-2026-005 (100 Ignis vehicles)', sla_exposure: 4200000,
    status: 'PENDING', decided_by: null, decided_at: null,
    proposed_supplier: 'SUP-006 (AxisTech)', lead_time: '5 days (expedited)', unit_premium: '28% freight surcharge',
  },
  {
    id: 'APV-2026-003', incident_id: 'INC-099', requested_action: 'Dual-Source Authorization — CMP-003 (Turbocharger) from SUP-009',
    reason: 'SUP-003 quality non-conformance on batch T-8821. Alternate qualified supplier SUP-009 available with 98.2% quality score.',
    financial_value: 480000, production_impact: 'PRD-2026-003 (150 Brezza vehicles)', sla_exposure: 1800000,
    status: 'REJECTED', decided_by: 'operator@nexus.io', decided_at: '2026-08-22T20:14:00Z',
    proposed_supplier: 'SUP-009 (TurboMax India)', lead_time: '6 days', unit_premium: '12% cost premium',
  },
];

export const OperatorApprovalsPage: React.FC = () => {
  const [approvals, setApprovals] = useState<any[]>(DEMO_APPROVALS);
  const [deciding, setDeciding] = useState<string | null>(null);
  const [notification, setNotification] = useState<any>(null);
  const [detail, setDetail] = useState<any>(null);

  const fetchApprovals = async () => {
    try {
      const res = await fetch(`${API_BASE}/operator/approvals`, { headers: { 'X-User-Email': 'operator@nexus.io' } });
      if (res.ok) { const d = await res.json(); if (d?.length) setApprovals(d); }
    } catch {}
  };

  useEffect(() => {
    fetchApprovals();
    const interval = setInterval(fetchApprovals, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleDecision = async (approvalId: string, decision: 'APPROVED' | 'REJECTED') => {
    setDeciding(approvalId);
    // Optimistically update demo state
    setApprovals(prev => prev.map(a => a.id === approvalId ? {
      ...a, status: decision, decided_by: 'operator@nexus.io', decided_at: new Date().toISOString()
    } : a));
    setNotification({ type: decision === 'APPROVED' ? 'success' : 'warning',
      message: decision === 'APPROVED'
        ? `✅ APPROVED — Sentinel agent executing emergency recovery action for ${approvalId}.`
        : `❌ REJECTED — Approval ${approvalId} declined. Sentinel agent will re-evaluate alternatives.`
    });
    try {
      await fetch(`${API_BASE}/operator/approvals/${approvalId}/decide`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'X-User-Email': 'operator@nexus.io' },
        body: JSON.stringify({ decision }),
      });
    } catch {}
    setDeciding(null);
    setTimeout(() => setNotification(null), 6000);
  };

  const pending = approvals.filter(a => a.status === 'PENDING').length;
  const approved = approvals.filter(a => a.status === 'APPROVED').length;
  const totalExposureCovered = approvals.filter(a => a.status === 'APPROVED').reduce((s, a) => s + a.sla_exposure, 0);

  const statusBg = (s: string) => {
    switch (s) {
      case 'APPROVED': return 'bg-[#ECFDF5] text-[#3A9B68] border-[#A7F3D0]';
      case 'REJECTED': return 'bg-[#FDF2F2] text-[#D94B5B] border-[#F8B4B4]';
      case 'PENDING': return 'bg-[#FFFBEB] text-[#F59E0B] border-[#FCD34D]';
      default: return 'bg-[#F5F3FF] text-[#81758F] border-[#DDD5EA]';
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="HUMAN-IN-THE-LOOP APPROVAL REQUESTS"
        subtitle="Review and decide Sentinel agent emergency recovery proposals exceeding financial threshold rules"
        badge="OPERATOR APPROVALS"
      />

      {/* Notification Banner */}
      {notification && (
        <div className={`p-4 rounded border font-mono-tech text-xs font-bold ${notification.type === 'success' ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#3A9B68]' : 'bg-[#FFFBEB] border-[#FCD34D] text-[#F59E0B]'}`}>
          {notification.message}
        </div>
      )}

      {/* KPI STRIP */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Pending Approvals" value={pending} subtext="Awaiting operator action" highlightColor="amber" />
        <MetricCard title="Approved Actions" value={approved} subtext="Recovery authorized" highlightColor="emerald" />
        <MetricCard title="SLA Exposure Covered" value={`₹${(totalExposureCovered / 10000000).toFixed(1)}Cr`} subtext="By approved actions" highlightColor="indigo" />
        <MetricCard title="Threshold Limit" value="₹5L" subtext="Auto-approve below" highlightColor="rose" />
      </div>

      {/* PENDING APPROVAL BANNERS — prominent display for jury demo */}
      {approvals.filter(a => a.status === 'PENDING').map(app => (
        <Card key={app.id} className="p-5 border-2 border-[#F59E0B] bg-[#FFFDF0] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#F59E0B] animate-ping" />
              <span className="font-mono-tech font-bold text-sm text-[#1B082C]">⚠️ APPROVAL REQUIRED — {app.id}</span>
              <span className="px-2 py-0.5 bg-[#FFFBEB] text-[#F59E0B] border border-[#FCD34D] rounded text-[9px] font-bold font-mono-tech">PENDING</span>
            </div>
            <span className="font-mono-tech text-xs text-[#81758F]">Incident: {app.incident_id}</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono-tech text-xs">
            {[
              ['Proposed Action', app.requested_action],
              ['Financial Value', `₹${(app.financial_value / 1000).toFixed(0)}K`],
              ['SLA Exposure', `₹${(app.sla_exposure / 10000000).toFixed(1)}Cr`],
              ['Production Impact', app.production_impact],
              ['Proposed Supplier', app.proposed_supplier],
              ['Lead Time', app.lead_time],
              ['Cost Premium', app.unit_premium],
            ].map(([k, v]) => (
              <div key={k} className="p-2 bg-white border border-[#DDD5EA] rounded">
                <div className="text-[9px] text-[#81758F] uppercase">{k}</div>
                <div className="font-bold text-[#1B082C] text-xs mt-0.5 leading-tight">{v}</div>
              </div>
            ))}
          </div>

          <div className="p-3 bg-white border border-[#DDD5EA] rounded font-mono-tech text-xs text-[#1B082C]">
            <span className="text-[#81758F] font-bold uppercase text-[10px] block mb-1">Sentinel Reasoning</span>
            {app.reason}
          </div>

          <div className="flex gap-3">
            <button onClick={() => handleDecision(app.id, 'APPROVED')} disabled={!!deciding}
              className="flex-1 px-4 py-2.5 bg-[#3A9B68] hover:bg-[#2F8256] text-white text-xs font-bold rounded font-mono-tech transition-colors disabled:opacity-60">
              {deciding === app.id ? '⏳ EXECUTING...' : '✅ APPROVE RECOVERY ACTION'}
            </button>
            <button onClick={() => handleDecision(app.id, 'REJECTED')} disabled={!!deciding}
              className="px-4 py-2.5 bg-[#D94B5B] hover:bg-[#B83B4A] text-white text-xs font-bold rounded font-mono-tech transition-colors disabled:opacity-60">
              ❌ REJECT
            </button>
          </div>
        </Card>
      ))}

      {/* ALL APPROVALS TABLE */}
      <Card className="p-5 border border-[#DDD5EA] space-y-3">
        <h3 className="font-mono-tech font-bold text-sm text-[#1B082C] border-b border-[#DDD5EA] pb-2">📋 ALL APPROVAL REQUESTS</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono-tech text-xs">
            <thead>
              <tr className="border-b border-[#DDD5EA] text-[#81758F] uppercase text-[10px]">
                <th className="pb-2 pr-4">Approval ID</th>
                <th className="pb-2 pr-4">Action</th>
                <th className="pb-2 pr-4">Value</th>
                <th className="pb-2 pr-4">SLA Exposure</th>
                <th className="pb-2 pr-4">Impact</th>
                <th className="pb-2 pr-4">Status</th>
                <th className="pb-2 pr-4">Decided By</th>
                <th className="pb-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DDD5EA]/50">
              {approvals.map((app) => (
                <tr key={app.id} className="hover:bg-[#FBFAFF] transition-colors">
                  <td className="py-3 pr-4 font-bold text-[#834DFB]">{app.id}</td>
                  <td className="py-3 pr-4 text-[#1B082C] max-w-[200px] font-semibold">{app.requested_action}</td>
                  <td className="py-3 pr-4 font-bold text-[#D94B5B]">₹{(app.financial_value / 1000).toFixed(0)}K</td>
                  <td className="py-3 pr-4 font-bold text-[#1B082C]">₹{(app.sla_exposure / 10000000).toFixed(1)}Cr</td>
                  <td className="py-3 pr-4 text-[#594B69]">{app.production_impact}</td>
                  <td className="py-3 pr-4">
                    <span className={`px-2 py-0.5 rounded border text-[9px] font-bold ${statusBg(app.status)}`}>
                      {app.status}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-[#594B69]">{app.decided_by || '—'}</td>
                  <td className="py-3 text-right">
                    {app.status === 'PENDING' ? (
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => handleDecision(app.id, 'APPROVED')} className="px-2 py-1 bg-[#3A9B68] text-white text-[10px] font-bold rounded">✅</button>
                        <button onClick={() => handleDecision(app.id, 'REJECTED')} className="px-2 py-1 bg-[#D94B5B] text-white text-[10px] font-bold rounded">❌</button>
                      </div>
                    ) : (
                      <button onClick={() => setDetail(app)} className="px-2 py-1 bg-[#EEE8FF] text-[#834DFB] text-[10px] font-bold rounded hover:bg-[#834DFB] hover:text-white transition-colors">
                        📋 DETAIL
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* DETAIL MODAL */}
      {detail && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-[#DDD5EA] rounded-lg p-6 max-w-lg w-full shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#DDD5EA] pb-3">
              <h3 className="font-mono-tech font-bold text-sm text-[#1B082C]">📋 APPROVAL DETAIL // {detail.id}</h3>
              <button onClick={() => setDetail(null)} className="text-[#81758F] hover:text-[#1B082C] text-lg">✕</button>
            </div>
            <div className="space-y-2 font-mono-tech text-xs">
              {[
                ['Action', detail.requested_action], ['Status', detail.status],
                ['Decided By', detail.decided_by || 'Pending'], ['Decided At', detail.decided_at?.replace('T', ' ').replace('Z', '') || '—'],
                ['Financial Value', `₹${(detail.financial_value / 1000).toFixed(0)}K`],
                ['SLA Exposure', `₹${(detail.sla_exposure / 10000000).toFixed(1)}Cr`],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between py-1.5 border-b border-[#DDD5EA]/50">
                  <span className="text-[#81758F]">{k}</span>
                  <span className="font-bold text-[#1B082C]">{v}</span>
                </div>
              ))}
              <div className="p-2 bg-[#FBFAFF] border border-[#DDD5EA] rounded mt-2">
                <div className="text-[9px] text-[#81758F] uppercase mb-1">Sentinel Reasoning</div>
                <div className="text-[#1B082C]">{detail.reason}</div>
              </div>
            </div>
            <button onClick={() => setDetail(null)} className="w-full px-4 py-2 border border-[#DDD5EA] text-[#594B69] text-xs font-bold rounded font-mono-tech">CLOSE</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OperatorApprovalsPage;
