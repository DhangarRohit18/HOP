import React, { useEffect, useState } from 'react';
import { Card } from '../components/ui/Card';
import { PageHeader } from '../components/ui/PageHeader';
import { StatusBadge } from '../components/ui/StatusBadge';

const API_BASE = 'http://localhost:8000/api/v1';

export interface OperatorPurchaseOrdersProps {
  onNavigate?: (path: string) => void;
}

export const OperatorPurchaseOrdersPage: React.FC<OperatorPurchaseOrdersProps> = ({ onNavigate }) => {
  const [pos, setPos] = useState<any[]>([]);

  const fetchPurchaseOrders = async () => {
    try {
      const res = await fetch(`${API_BASE}/operator/purchase-orders`, {
        headers: { 'X-User-Email': 'operator@nexus.io' },
      });
      if (res.ok) setPos(await res.json());
    } catch (e) {
      console.error('Failed to fetch operator purchase orders', e);
    }
  };

  useEffect(() => {
    fetchPurchaseOrders();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="PURCHASE ORDERS RADAR"
        subtitle="Graph procurement tracking, supplier delivery ETAs, schedule delay risk, and financial values"
        badge="OPERATOR POs"
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
                <th className="pb-2">PO Number</th>
                <th className="pb-2">Supplier Code</th>
                <th className="pb-2">Order Date</th>
                <th className="pb-2">Expected Delivery</th>
                <th className="pb-2">Total Amount</th>
                <th className="pb-2">Delay Slip</th>
                <th className="pb-2">Status</th>
                <th className="pb-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DDD5EA]/50">
              {pos.map((p) => (
                <tr key={p.id}>
                  <td className="py-3 font-bold text-[#834DFB]">{p.po_number}</td>
                  <td className="py-3 font-bold text-[#1B082C]">{p.supplier_code}</td>
                  <td className="py-3 text-[#594B69]">{p.order_date}</td>
                  <td className="py-3 text-[#594B69]">{p.expected_delivery_date}</td>
                  <td className="py-3 font-bold text-[#1B082C]">${p.total_amount.toLocaleString()}</td>
                  <td className="py-3 font-bold text-[#D94B5B]">
                    {p.delay_days > 0 ? `+${p.delay_days.toFixed(1)} Days` : 'ON SCHEDULE'}
                  </td>
                  <td className="py-3">
                    <StatusBadge status={p.status === 'DELAYED' ? 'critical' : 'healthy'} size="sm" />
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

export default OperatorPurchaseOrdersPage;
