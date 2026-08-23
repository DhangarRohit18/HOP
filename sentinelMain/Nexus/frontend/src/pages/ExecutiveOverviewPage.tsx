import React, { useEffect, useState } from 'react';
import { Card } from '../components/ui/Card';
import { MetricCard } from '../components/ui/MetricCard';
import { PageHeader } from '../components/ui/PageHeader';
import { StatusBadge } from '../components/ui/StatusBadge';

const API_BASE = 'http://localhost:8000/api/v1';

export const ExecutiveOverviewPage: React.FC = () => {
  const [data, setData] = useState<any>(null);

  const fetchExecutiveOverview = async () => {
    try {
      const res = await fetch(`${API_BASE}/executive/overview`, {
        headers: { 'X-User-Email': 'executive@nexus.io' },
      });
      if (res.ok) setData(await res.json());
    } catch (e) {
      console.error('Failed to fetch executive overview', e);
    }
  };

  useEffect(() => {
    fetchExecutiveOverview();
    const interval = setInterval(fetchExecutiveOverview, 5000);
    return () => clearInterval(interval);
  }, []);

  const metrics = data?.business_metrics;
  const isRecovered = metrics?.financial_exposure_usd === 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="EXECUTIVE BUSINESS CONTINUITY OVERVIEW"
        subtitle="High-level operational continuity dashboard, risk exposures, and incident resolution status (READ-ONLY)"
        badge="EXECUTIVE (READ-ONLY)"
      />

      {/* EXECUTIVE KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Production Continuity"
          value={`${metrics?.production_continuity_score ?? 98.4}%`}
          subtext="Target threshold > 95%"
          highlightColor="emerald"
        />
        <MetricCard
          title="Financial SLA Exposure"
          value={isRecovered ? '$0 (RECOVERED)' : `$${(metrics?.financial_exposure_usd ?? 200000).toLocaleString()}`}
          subtext={isRecovered ? 'Mitigation verified' : 'Active risk exposure'}
          highlightColor={isRecovered ? 'emerald' : 'rose'}
        />
        <MetricCard
          title="Recovery Success Rate"
          value="100.0%"
          subtext="Sentinel agent automation"
          highlightColor="indigo"
        />
        <MetricCard
          title="Supplier Risk Index"
          value={metrics?.supplier_risk_index ?? 'LOW'}
          subtext="Evaluated across 120 nodes"
          highlightColor={isRecovered ? 'emerald' : 'amber'}
        />
      </div>

      {/* INCIDENT RECOVERY SUMMARY */}
      <Card className="p-5 border border-[#DDD5EA] space-y-4">
        <div className="flex items-center justify-between border-b border-[#DDD5EA] pb-3">
          <h3 className="font-mono-tech font-bold text-sm text-[#1B082C]">INCIDENT RECOVERY REPORTS</h3>
          <span className="px-2 py-0.5 bg-[#EEE8FF] text-[#834DFB] text-[10px] font-mono-tech font-bold rounded">
            STRICTLY READ-ONLY
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono-tech text-xs">
            <thead>
              <tr className="border-b border-[#DDD5EA] text-[#81758F] uppercase text-[10px]">
                <th className="pb-2">Incident ID</th>
                <th className="pb-2">Disruption Title</th>
                <th className="pb-2">Supplier Code</th>
                <th className="pb-2">Initial Risk</th>
                <th className="pb-2">Current Risk</th>
                <th className="pb-2">Financial Exposure</th>
                <th className="pb-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DDD5EA]/50">
              {data?.incidents_summary?.map((inc: any) => (
                <tr key={inc.incident_id}>
                  <td className="py-3 font-bold text-[#834DFB]">{inc.incident_id}</td>
                  <td className="py-3 font-bold text-[#1B082C]">{inc.title}</td>
                  <td className="py-3 text-[#594B69]">{inc.supplier_code}</td>
                  <td className="py-3 text-[#D94B5B] font-bold">{inc.initial_risk}</td>
                  <td className="py-3 font-bold">
                    <span className={inc.current_risk === 'LOW' ? 'text-[#3A9B68]' : 'text-[#D94B5B]'}>
                      {inc.current_risk}
                    </span>
                  </td>
                  <td className="py-3 font-semibold text-[#1B082C]">
                    ${inc.financial_exposure.toLocaleString()}
                  </td>
                  <td className="py-3">
                    <StatusBadge status={inc.recovery_status === 'RECOVERED' ? 'healthy' : 'critical'} size="sm" />
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

export default ExecutiveOverviewPage;
