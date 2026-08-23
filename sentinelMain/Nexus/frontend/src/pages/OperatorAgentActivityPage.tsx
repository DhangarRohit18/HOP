import React, { useEffect, useState } from 'react';
import { Card } from '../components/ui/Card';
import { PageHeader } from '../components/ui/PageHeader';
import { StatusBadge } from '../components/ui/StatusBadge';

const API_BASE = 'http://localhost:8000/api/v1';

export const OperatorAgentActivityPage: React.FC = () => {
  const [runs, setRuns] = useState<any[]>([]);

  const fetchAgentRuns = async () => {
    try {
      const res = await fetch(`${API_BASE}/operator/agent-runs`, {
        headers: { 'X-User-Email': 'operator@nexus.io' },
      });
      if (res.ok) setRuns(await res.json());
    } catch (e) {
      console.error('Failed to fetch agent runs', e);
    }
  };

  useEffect(() => {
    fetchAgentRuns();
    const interval = setInterval(fetchAgentRuns, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="SENTINEL AGENT LIFECYCLE TIMELINE"
        subtitle="Operational event processing runs, graph analysis steps, and automated recovery executions"
        badge="SENTINEL AGENT"
      />

      <div className="space-y-4">
        {runs.map((run) => (
          <Card key={run.id} className="p-5 border border-[#DDD5EA] space-y-3">
            <div className="flex items-center justify-between border-b border-[#DDD5EA] pb-2">
              <div className="flex items-center gap-3">
                <span className="font-mono-tech font-bold text-sm text-[#834DFB]">INCIDENT: {run.incident_id}</span>
                <span className="text-xs font-mono-tech text-[#81758F]">EVENT: {run.event_id || 'PO_DELAYED'}</span>
              </div>
              <StatusBadge status={run.status === 'RECOVERED' ? 'healthy' : 'critical'} />
            </div>

            <div className="space-y-2 font-mono-tech text-xs pt-1">
              {run.timeline_steps?.map((step: any, idx: number) => (
                <div key={idx} className="flex items-start gap-3 border-l-2 border-[#834DFB] pl-3 py-1">
                  <span className="text-[10px] text-[#81758F] font-semibold">{step.time}</span>
                  <div>
                    <span className="font-bold text-[#834DFB] text-[11px] uppercase mr-2">{step.step}:</span>
                    <span className="text-[#1B082C] text-[11px]">{step.message}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default OperatorAgentActivityPage;
