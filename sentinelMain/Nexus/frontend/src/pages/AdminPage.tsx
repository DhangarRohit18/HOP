import React, { useEffect, useState } from 'react';
import { Card } from '../components/ui/Card';
import { PageHeader } from '../components/ui/PageHeader';
import { StatusBadge } from '../components/ui/StatusBadge';

const API_BASE = '/api/v1';

export const AdminPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'system' | 'users' | 'rules' | 'audit'>('system');
  const [systemStatus, setSystemStatus] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [thresholdInput, setThresholdInput] = useState('150000');
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const fetchAdminData = async () => {
    try {
      const headers = { 'X-User-Email': 'admin@nexus.io' };
      const [sysRes, usersRes, rulesRes, auditRes] = await Promise.all([
        fetch(`${API_BASE}/admin/system-status`, { headers }),
        fetch(`${API_BASE}/admin/users`, { headers }),
        fetch(`${API_BASE}/admin/rules`, { headers }),
        fetch(`${API_BASE}/admin/audit-logs`, { headers }),
      ]);

      if (sysRes.ok) setSystemStatus(await sysRes.json());
      if (usersRes.ok) setUsers(await usersRes.json());
      if (rulesRes.ok) {
        const rData = await rulesRes.json();
        if (rData.length > 0) {
          setThresholdInput(rData[0].emergency_procurement_threshold.toString());
        }
      }
      if (auditRes.ok) setAuditLogs(await auditRes.json());
    } catch (e) {
      console.error('Failed to fetch admin telemetry', e);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleUpdateRule = async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/rules/RULE-PROC-001`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Email': 'admin@nexus.io',
        },
        body: JSON.stringify({
          emergency_procurement_threshold: parseFloat(thresholdInput),
        }),
      });

      if (res.ok) {
        setSaveMessage('Approval rule updated and persisted to PostgreSQL!');
        setTimeout(() => setSaveMessage(null), 4000);
        fetchAdminData();
      }
    } catch (e) {
      console.error('Failed to update approval rule', e);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="ADMINISTRATION CONTROL CENTER"
        subtitle="System telemetry, operator accounts, persisted approval rules, and platform audit logs"
        badge="ADMIN"
      />

      {/* Tab Selectors */}
      <div className="flex border-b border-[#DDD5EA] space-x-2">
        <button
          onClick={() => setActiveTab('system')}
          className={`px-4 py-2 text-xs font-mono-tech font-bold rounded-t ${
            activeTab === 'system'
              ? 'bg-[#FFFFFF] text-[#834DFB] border-t-2 border-[#834DFB] border-x border-[#DDD5EA]'
              : 'text-[#594B69] hover:text-[#1B082C]'
          }`}
        >
          🖥️ SYSTEM STATUS
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 text-xs font-mono-tech font-bold rounded-t ${
            activeTab === 'users'
              ? 'bg-[#FFFFFF] text-[#834DFB] border-t-2 border-[#834DFB] border-x border-[#DDD5EA]'
              : 'text-[#594B69] hover:text-[#1B082C]'
          }`}
        >
          👥 USERS & OPERATORS ({users.length})
        </button>
        <button
          onClick={() => setActiveTab('rules')}
          className={`px-4 py-2 text-xs font-mono-tech font-bold rounded-t ${
            activeTab === 'rules'
              ? 'bg-[#FFFFFF] text-[#834DFB] border-t-2 border-[#834DFB] border-x border-[#DDD5EA]'
              : 'text-[#594B69] hover:text-[#1B082C]'
          }`}
        >
          ⚙️ APPROVAL RULES
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 text-xs font-mono-tech font-bold rounded-t ${
            activeTab === 'audit'
              ? 'bg-[#FFFFFF] text-[#834DFB] border-t-2 border-[#834DFB] border-x border-[#DDD5EA]'
              : 'text-[#594B69] hover:text-[#1B082C]'
          }`}
        >
          📜 AUDIT LOG ({auditLogs.length})
        </button>
      </div>

      {/* SYSTEM STATUS TAB */}
      {activeTab === 'system' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {systemStatus?.components &&
            Object.entries(systemStatus.components).map(([key, val]: [string, any]) => (
              <Card key={key} className="p-4 space-y-2 border border-[#DDD5EA]">
                <div className="flex items-center justify-between">
                  <span className="font-mono-tech text-xs font-bold text-[#1B082C] uppercase">{key.replace('_', ' ')}</span>
                  <StatusBadge status={val.status === 'HEALTHY' ? 'healthy' : 'degraded'} size="sm" />
                </div>
                <div className="text-[11px] font-mono-tech text-[#594B69]">
                  {Object.entries(val)
                    .filter(([k]) => k !== 'status')
                    .map(([k, v]) => `${k}: ${v}`)
                    .join(' • ')}
                </div>
              </Card>
            ))}
        </div>
      )}

      {/* USERS TAB */}
      {activeTab === 'users' && (
        <Card className="p-4 border border-[#DDD5EA]">
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono-tech text-xs">
              <thead>
                <tr className="border-b border-[#DDD5EA] text-[#81758F] uppercase text-[10px]">
                  <th className="pb-2">User Email</th>
                  <th className="pb-2">Full Name</th>
                  <th className="pb-2">Role</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DDD5EA]/50">
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="py-2.5 font-bold text-[#1B082C]">{u.email}</td>
                    <td className="py-2.5 text-[#594B69]">{u.full_name}</td>
                    <td className="py-2.5">
                      <span className="px-2 py-0.5 bg-[#EEE8FF] text-[#834DFB] rounded border border-[#C9BDD9] text-[10px] font-bold">
                        {u.role}
                      </span>
                    </td>
                    <td className="py-2.5">
                      <span className="text-[#3A9B68] font-bold">ACTIVE</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* APPROVAL RULES TAB */}
      {activeTab === 'rules' && (
        <Card className="p-6 border border-[#DDD5EA] space-y-4 max-w-2xl">
          <div className="space-y-1">
            <h3 className="font-mono-tech font-bold text-[#1B082C] text-sm">EMERGENCY PROCUREMENT APPROVAL RULE</h3>
            <p className="text-xs text-[#594B69]">
              Configures financial threshold above which Sentinel agent recovery proposals require explicit Human-in-the-Loop Operator approval.
            </p>
          </div>

          {saveMessage && (
            <div className="p-3 bg-[#E8F8F0] border border-[#3A9B68] text-[#3A9B68] text-xs font-mono-tech rounded">
              ✅ {saveMessage}
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-mono-tech text-[#81758F] uppercase mb-1 font-bold">
                Threshold Amount ($ USD)
              </label>
              <input
                type="number"
                value={thresholdInput}
                onChange={(e) => setThresholdInput(e.target.value)}
                className="w-full px-3 py-2 bg-[#FBFAFF] border border-[#DDD5EA] rounded font-mono-tech text-sm text-[#1B082C] focus:outline-none focus:border-[#834DFB]"
              />
            </div>

            <button
              onClick={handleUpdateRule}
              className="px-4 py-2 bg-[#834DFB] hover:bg-[#7040E5] text-[#F5F3FF] font-mono-tech text-xs font-bold rounded shadow-xs transition-colors"
            >
              💾 SAVE RULE CONFIGURATION
            </button>
          </div>
        </Card>
      )}

      {/* AUDIT LOG TAB */}
      {activeTab === 'audit' && (
        <Card className="p-4 border border-[#DDD5EA]">
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono-tech text-xs">
              <thead>
                <tr className="border-b border-[#DDD5EA] text-[#81758F] uppercase text-[10px]">
                  <th className="pb-2">Timestamp</th>
                  <th className="pb-2">Actor</th>
                  <th className="pb-2">Role</th>
                  <th className="pb-2">Event</th>
                  <th className="pb-2">Action</th>
                  <th className="pb-2">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DDD5EA]/50">
                {auditLogs.map((log) => (
                  <tr key={log.id}>
                    <td className="py-2.5 text-[#81758F] text-[11px]">{new Date(log.timestamp).toLocaleTimeString()}</td>
                    <td className="py-2.5 font-bold text-[#1B082C]">{log.actor_name}</td>
                    <td className="py-2.5 text-[#834DFB]">{log.role}</td>
                    <td className="py-2.5 text-[#594B69] font-semibold">{log.event_type}</td>
                    <td className="py-2.5 text-[#1B082C]">{log.action}</td>
                    <td className="py-2.5 text-[#3A9B68] font-bold">{log.result}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};

export default AdminPage;
