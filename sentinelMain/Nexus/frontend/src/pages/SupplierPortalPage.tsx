import React, { useEffect, useState } from 'react';
import { Card } from '../components/ui/Card';
import { PageHeader } from '../components/ui/PageHeader';
import { StatusBadge } from '../components/ui/StatusBadge';

const API_BASE = 'http://localhost:8000/api/v1';

export const SupplierPortalPage: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [selectedPo, setSelectedPo] = useState<any>(null);
  const [delayDays, setDelayDays] = useState('5.0');
  const [reasonCode, setReasonCode] = useState('CAPACITY_ISSUE');
  const [notes, setNotes] = useState('Silicon wafer allocation delay at fabrication line.');
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState<any>(null);

  const fetchSupplierDashboard = async () => {
    try {
      const res = await fetch(`${API_BASE}/supplier/dashboard`, {
        headers: { 'X-User-Email': 'supplier_sup001@nexus.io' },
      });
      if (res.ok) {
        setData(await res.json());
      }
    } catch (e) {
      console.error('Failed to fetch supplier portal dashboard', e);
    }
  };

  useEffect(() => {
    fetchSupplierDashboard();
  }, []);

  const handleReportDelay = async () => {
    if (!selectedPo) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/supplier/purchase-orders/${selectedPo.id}/report-delay`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Email': 'supplier_sup001@nexus.io',
        },
        body: JSON.stringify({
          purchase_order_id: selectedPo.id,
          delay_days: parseFloat(delayDays),
          new_eta: new Date(Date.now() + 5 * 86400000).toISOString(),
          reason_code: reasonCode,
          notes: notes,
        }),
      });

      if (res.ok) {
        const result = await res.json();
        setNotification({
          type: 'success',
          title: 'PO DELAY EVENT PUBLISHED TO NEXUS EVENT BUS',
          message: `PO ${result.po_number} marked DELAYED. Sentinel Agent Incident ${result.incident_id} initiated (${result.sentinel_status}).`,
        });
        setSelectedPo(null);
        fetchSupplierDashboard();
      }
    } catch (e) {
      console.error('Failed to report PO delay', e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="SUPPLIER COLLABORATION PORTAL"
        subtitle="Manage open purchase orders, respond to spot RFQs, and publish operational delay signals"
        badge="SUPPLIER PORTAL"
      />

      {notification && (
        <div className="p-4 bg-[#FFFBD1] border border-[#F0E100] text-[#1B082C] rounded space-y-1 font-mono-tech text-xs shadow-xs">
          <div className="font-bold flex items-center gap-2 text-[#834DFB]">
            <span>⚡ {notification.title}</span>
          </div>
          <div>{notification.message}</div>
        </div>
      )}

      {/* Supplier Identity Summary */}
      {data?.supplier_info && (
        <Card className="p-4 border border-[#DDD5EA] bg-[#FFFFFF] flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs font-mono-tech text-[#81758F] uppercase">ACCOUNT RESTATEMENT</div>
            <div className="text-base font-bold font-mono-tech text-[#1B082C]">{data.supplier_info.name}</div>
            <div className="text-xs font-mono-tech text-[#594B69]">{data.supplier_info.supplier_code} • {data.supplier_info.tier}</div>
          </div>
          <div className="flex gap-6 font-mono-tech text-xs">
            <div>
              <div className="text-[10px] text-[#81758F] uppercase">Reliability Score</div>
              <div className="font-bold text-[#3A9B68]">{(data.supplier_info.reliability_score * 100).toFixed(1)}%</div>
            </div>
            <div>
              <div className="text-[10px] text-[#81758F] uppercase">Monthly Capacity</div>
              <div className="font-bold text-[#834DFB]">{data.supplier_info.monthly_capacity_units.toLocaleString()} Units</div>
            </div>
          </div>
        </Card>
      )}

      {/* Purchase Orders Table */}
      <Card className="p-5 border border-[#DDD5EA] space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-mono-tech font-bold text-sm text-[#1B082C]">ACTIVE PURCHASE ORDERS</h3>
          <span className="text-xs font-mono-tech text-[#81758F]">Scoped to SUP-001</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono-tech text-xs">
            <thead>
              <tr className="border-b border-[#DDD5EA] text-[#81758F] uppercase text-[10px]">
                <th className="pb-2">PO Number</th>
                <th className="pb-2">Order Date</th>
                <th className="pb-2">Expected Delivery</th>
                <th className="pb-2">Total Amount</th>
                <th className="pb-2">Status</th>
                <th className="pb-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DDD5EA]/50">
              {data?.purchase_orders.map((po: any) => (
                <tr key={po.id}>
                  <td className="py-3 font-bold text-[#1B082C]">{po.po_number}</td>
                  <td className="py-3 text-[#594B69]">{po.order_date}</td>
                  <td className="py-3 text-[#594B69]">{po.expected_delivery_date}</td>
                  <td className="py-3 text-[#1B082C] font-semibold">${po.total_amount.toLocaleString()}</td>
                  <td className="py-3">
                    <StatusBadge status={po.status === 'DELAYED' ? 'critical' : 'healthy'} size="sm" />
                  </td>
                  <td className="py-3 text-right">
                    <button
                      onClick={() => setSelectedPo(po)}
                      className="px-3 py-1 bg-[#FFFBD1] border border-[#F0E100] text-[#1B082C] hover:bg-[#F0E100] font-mono-tech text-[11px] font-bold rounded transition-colors"
                    >
                      ⚠️ REPORT DELAY
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* REPORT DELAY MODAL */}
      {selectedPo && (
        <div className="fixed inset-0 bg-[#1B082C]/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#FFFFFF] border border-[#DDD5EA] rounded-sm p-6 max-w-lg w-full space-y-4 shadow-md">
            <div className="flex items-center justify-between border-b border-[#DDD5EA] pb-3">
              <h3 className="font-mono-tech font-bold text-base text-[#1B082C]">REPORT PO DELAY (SIGNAL EVENT)</h3>
              <button onClick={() => setSelectedPo(null)} className="text-[#81758F] hover:text-[#1B082C]">✕</button>
            </div>

            <div className="space-y-3 font-mono-tech text-xs">
              <div>
                <label className="block text-[10px] text-[#81758F] uppercase font-bold mb-1">Target Purchase Order</label>
                <div className="p-2 bg-[#FBFAFF] border border-[#DDD5EA] rounded font-bold text-[#1B082C]">{selectedPo.po_number}</div>
              </div>

              <div>
                <label className="block text-[10px] text-[#81758F] uppercase font-bold mb-1">Estimated Delay (Days)</label>
                <input
                  type="number"
                  value={delayDays}
                  onChange={(e) => setDelayDays(e.target.value)}
                  className="w-full p-2 bg-[#FBFAFF] border border-[#DDD5EA] rounded text-[#1B082C] focus:outline-none focus:border-[#834DFB]"
                />
              </div>

              <div>
                <label className="block text-[10px] text-[#81758F] uppercase font-bold mb-1">Reason Category</label>
                <select
                  value={reasonCode}
                  onChange={(e) => setReasonCode(e.target.value)}
                  className="w-full p-2 bg-[#FBFAFF] border border-[#DDD5EA] rounded text-[#1B082C] focus:outline-none focus:border-[#834DFB]"
                >
                  <option value="CAPACITY_ISSUE">Capacity Allocation Limitation</option>
                  <option value="FAB_OUTAGE">Fabrication Line Outage</option>
                  <option value="QUALITY_HOLD">Component Quality Hold</option>
                  <option value="LOGISTICS_DELAY">Logistics Freight Hold</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-[#81758F] uppercase font-bold mb-1">Notes & Details</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-2 bg-[#FBFAFF] border border-[#DDD5EA] rounded text-[#1B082C] h-20 focus:outline-none focus:border-[#834DFB]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setSelectedPo(null)}
                className="px-4 py-2 border border-[#DDD5EA] text-[#594B69] font-mono-tech text-xs font-bold rounded hover:bg-[#F5F3FF]"
              >
                CANCEL
              </button>
              <button
                onClick={handleReportDelay}
                disabled={submitting}
                className="px-4 py-2 bg-[#834DFB] hover:bg-[#7040E5] text-[#F5F3FF] font-mono-tech text-xs font-bold rounded shadow-xs"
              >
                {submitting ? 'PUBLISHING SIGNAL...' : '🚀 SUBMIT SIGNAL EVENT'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplierPortalPage;
