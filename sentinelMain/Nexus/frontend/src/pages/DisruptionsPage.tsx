import React, { useEffect, useState } from 'react';
import { Card } from '../components/ui/Card';
import { PageHeader } from '../components/ui/PageHeader';
import { StatusBadge } from '../components/ui/StatusBadge';

const API_BASE = 'http://localhost:8000/api/v1';

export interface DisruptionsPageProps {
  onNavigate?: (path: string) => void;
}

export const DisruptionsPage: React.FC<DisruptionsPageProps> = ({ onNavigate }) => {
  const [disruptions, setDisruptions] = useState<any[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<any>(null);

  const fetchDisruptions = async () => {
    try {
      const res = await fetch(`${API_BASE}/operator/disruptions`, {
        headers: { 'X-User-Email': 'operator@nexus.io' },
      });
      if (res.ok) setDisruptions(await res.json());
    } catch (e) {
      console.error('Failed to fetch disruptions', e);
    }
  };

  useEffect(() => {
    fetchDisruptions();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="OPERATIONAL DISRUPTION RADAR"
        subtitle="Real-time disruption investigation radar, graph topology analysis, and mitigation tracking"
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

      <Card className="p-5 border border-[#DDD5EA]">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono-tech text-xs">
            <thead>
              <tr className="border-b border-[#DDD5EA] text-[#81758F] uppercase text-[10px]">
                <th className="pb-2">Incident ID</th>
                <th className="pb-2">Disruption Title</th>
                <th className="pb-2">Severity</th>
                <th className="pb-2">Supplier Code</th>
                <th className="pb-2">Target PO</th>
                <th className="pb-2">Component</th>
                <th className="pb-2">Financial Exposure</th>
                <th className="pb-2">Sentinel Status</th>
                <th className="pb-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DDD5EA]/50">
              {disruptions.map((dis) => (
                <tr key={dis.incident_id}>
                  <td className="py-3 font-bold text-[#834DFB]">{dis.incident_id}</td>
                  <td className="py-3 font-bold text-[#1B082C]">{dis.title}</td>
                  <td className="py-3">
                    <span className="px-2 py-0.5 bg-[#FDF2F2] text-[#D94B5B] border border-[#F8B4B4] rounded text-[10px] font-bold">
                      {dis.severity}
                    </span>
                  </td>
                  <td className="py-3 text-[#594B69]">{dis.supplier_code}</td>
                  <td className="py-3 text-[#1B082C]">{dis.po_number}</td>
                  <td className="py-3 text-[#1B082C]">{dis.component_code}</td>
                  <td className="py-3 font-bold text-[#D94B5B]">${dis.financial_exposure.toLocaleString()}</td>
                  <td className="py-3">
                    <StatusBadge status={dis.sentinel_status === 'RECOVERED' ? 'healthy' : 'critical'} size="sm" />
                  </td>
                  <td className="py-3 text-right">
                    <button
                      onClick={() => setSelectedIncident(dis)}
                      className="px-3 py-1 bg-[#EEE8FF] hover:bg-[#834DFB] text-[#834DFB] hover:text-[#F5F3FF] font-mono-tech text-[11px] font-bold rounded transition-colors"
                    >
                      🔍 INVESTIGATE
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* DISRUPTION INVESTIGATION MODAL */}
      {selectedIncident && (
        <div className="fixed inset-0 bg-[#1B082C]/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#FFFFFF] border border-[#DDD5EA] rounded-sm p-6 max-w-2xl w-full space-y-4 shadow-md">
            <div className="flex items-center justify-between border-b border-[#DDD5EA] pb-3">
              <h3 className="font-mono-tech font-bold text-base text-[#1B082C]">
                DISRUPTION INVESTIGATION // {selectedIncident.incident_id}
              </h3>
              <button onClick={() => setSelectedIncident(null)} className="text-[#81758F] hover:text-[#1B082C]">✕</button>
            </div>

            <div className="space-y-4 font-mono-tech text-xs">
              <div className="p-3 bg-[#FBFAFF] border border-[#DDD5EA] rounded-sm space-y-1">
                <span className="text-[10px] text-[#81758F] uppercase font-bold">1. WHAT HAPPENED</span>
                <p className="text-[#1B082C]">
                  Supplier <strong>{selectedIncident.supplier_code}</strong> reported a fabrication allocation delay on <strong>{selectedIncident.po_number}</strong> (+4.0 days).
                </p>
              </div>

              <div className="p-3 bg-[#FBFAFF] border border-[#DDD5EA] rounded-sm space-y-1">
                <span className="text-[10px] text-[#81758F] uppercase font-bold">2. WHAT IS AFFECTED</span>
                <p className="text-[#1B082C]">
                  Component <strong>{selectedIncident.component_code}</strong> coverage dropped to 4.0 days. Assembly order <strong>PRD-2026-001</strong> and customer order <strong>SO-2026-001 (Titan Motors)</strong> exposed.
                </p>
              </div>

              <div className="p-3 bg-[#FBFAFF] border border-[#DDD5EA] rounded-sm space-y-1">
                <span className="text-[10px] text-[#81758F] uppercase font-bold">3. WHY IT MATTERS</span>
                <p className="text-[#D94B5B] font-bold">
                  Total Financial SLA exposure: ${selectedIncident.financial_exposure.toLocaleString()} in liquidated damages if delivery slips past deadline.
                </p>
              </div>

              <div className="p-3 bg-[#EEE8FF] border border-[#C9BDD9] rounded-sm space-y-1">
                <span className="text-[10px] text-[#834DFB] uppercase font-bold">4. SENTINEL RECOVERY PROPOSAL</span>
                <p className="text-[#1B082C]">
                  Emergency spot procurement of {selectedIncident.component_code} from alternate catalog supplier. Action value $180,000.
                </p>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                onClick={() => {
                  setSelectedIncident(null);
                  if (onNavigate) onNavigate('/material-demo');
                }}
                className="px-4 py-2 bg-[#834DFB] text-[#F5F3FF] font-mono-tech text-xs font-bold rounded shadow-xs"
              >
                🏷️ TRACE MATERIAL PASSPORT
              </button>
              <button
                onClick={() => setSelectedIncident(null)}
                className="px-4 py-2 border border-[#DDD5EA] text-[#594B69] font-mono-tech text-xs font-bold rounded hover:bg-[#F5F3FF]"
              >
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DisruptionsPage;
