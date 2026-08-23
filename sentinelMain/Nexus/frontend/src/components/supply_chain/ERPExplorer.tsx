import React, { useState } from 'react';
import { InventoryItem, PurchaseOrder, ProductionOrder, SupplierMemoryItem, AuditLogEntry } from '../../types/supplyChain';
import { Database, Package, ShoppingCart, Users, Calendar, FileText } from 'lucide-react';

interface ERPExplorerProps {
  inventory: InventoryItem[];
  purchaseOrders: PurchaseOrder[];
  productionOrders: ProductionOrder[];
  supplierMemory: SupplierMemoryItem[];
  auditTrail: AuditLogEntry[];
}

export const ERPExplorer: React.FC<ERPExplorerProps> = ({
  inventory,
  purchaseOrders,
  productionOrders,
  supplierMemory,
  auditTrail
}) => {
  const [activeTab, setActiveTab] = useState<'inventory' | 'pos' | 'suppliers' | 'production' | 'audit'>('inventory');

  return (
    <div className="bg-nexus-white rounded-[8px] border border-nexus-blue-20 p-5 shadow-sm space-y-4 font-sans">
      {/* Tab Navigation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-nexus-blue-12 pb-3">
        <div className="flex items-center space-x-2">
          <Database className="w-5 h-5 text-nexus-blue" />
          <h3 className="text-base font-bold text-nexus-blue font-sans tracking-tight">
            Simulated ERP System Explorer
          </h3>
        </div>

        <div className="flex items-center space-x-1 bg-nexus-white p-1 rounded-[8px] border border-nexus-blue-20 text-xs overflow-x-auto">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`px-3 py-1.5 rounded-[8px] flex items-center space-x-1.5 transition-all ${
              activeTab === 'inventory' ? 'bg-nexus-blue text-nexus-white font-bold' : 'text-nexus-blue hover:text-nexus-blue'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Inventory ({inventory.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('pos')}
            className={`px-3 py-1.5 rounded-[8px] flex items-center space-x-1.5 transition-all ${
              activeTab === 'pos' ? 'bg-nexus-blue text-nexus-white font-bold' : 'text-nexus-blue hover:text-nexus-blue'
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>Purchase Orders ({purchaseOrders.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('suppliers')}
            className={`px-3 py-1.5 rounded-[8px] flex items-center space-x-1.5 transition-all ${
              activeTab === 'suppliers' ? 'bg-nexus-blue text-nexus-white font-bold' : 'text-nexus-blue hover:text-nexus-blue'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Supplier Memory ({supplierMemory.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('production')}
            className={`px-3 py-1.5 rounded-[8px] flex items-center space-x-1.5 transition-all ${
              activeTab === 'production' ? 'bg-nexus-blue text-nexus-white font-bold' : 'text-nexus-blue hover:text-nexus-blue'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Production Schedule ({productionOrders.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`px-3 py-1.5 rounded-[8px] flex items-center space-x-1.5 transition-all ${
              activeTab === 'audit' ? 'bg-nexus-blue text-nexus-white font-bold' : 'text-nexus-blue hover:text-nexus-blue'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Audit Trail ({auditTrail.length})</span>
          </button>
        </div>
      </div>

      {/* Tab Contents */}
      <div className="overflow-x-auto min-h-[220px]">
        
        {/* INVENTORY TAB */}
        {activeTab === 'inventory' && (
          <table className="w-full text-left text-xs border-collapse font-mono">
            <thead>
              <tr className="border-b border-nexus-blue-20 bg-nexus-white text-nexus-blue text-[11px]">
                <th className="py-2.5 px-3">Comp ID</th>
                <th className="py-2.5 px-3">Part Name</th>
                <th className="py-2.5 px-3">Current Stock</th>
                <th className="py-2.5 px-3">Usable Stock</th>
                <th className="py-2.5 px-3">Daily Burn</th>
                <th className="py-2.5 px-3">Safety Stock</th>
                <th className="py-2.5 px-3">Warehouse</th>
                <th className="py-2.5 px-3 text-right">Unit Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-nexus-blue">
              {inventory.map((item) => (
                <tr key={item.part_id} className="hover:bg-nexus-white">
                  <td className="py-2.5 px-3 text-nexus-blue font-bold">{item.component_id}</td>
                  <td className="py-2.5 px-3 font-sans font-semibold text-nexus-blue">{item.name}</td>
                  <td className="py-2.5 px-3 text-nexus-blue font-bold">{item.current_stock ?? item.total_stock ?? 0}</td>
                  <td className="py-2.5 px-3 text-nexus-blue font-bold">{item.usable_stock}</td>
                  <td className="py-2.5 px-3">{item.daily_usage} /d</td>
                  <td className="py-2.5 px-3">{item.safety_stock}</td>
                  <td className="py-2.5 px-3 text-nexus-blue-60">{item.warehouse}</td>
                  <td className="py-2.5 px-3 text-right text-nexus-blue font-bold">₹{item.unit_cost?.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* PURCHASE ORDERS TAB */}
        {activeTab === 'pos' && (
          <table className="w-full text-left text-xs border-collapse font-mono">
            <thead>
              <tr className="border-b border-nexus-blue-20 bg-nexus-white text-nexus-blue text-[11px]">
                <th className="py-2.5 px-3">PO ID</th>
                <th className="py-2.5 px-3">Supplier Name</th>
                <th className="py-2.5 px-3">Quantity</th>
                <th className="py-2.5 px-3">Expected ETA</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Total Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-nexus-blue">
              {purchaseOrders.map((po) => (
                <tr key={po.po_id} className="hover:bg-nexus-white">
                  <td className="py-2.5 px-3 text-nexus-blue font-bold">{po.po_id}</td>
                  <td className="py-2.5 px-3 font-sans font-semibold text-nexus-blue">{po.supplier_name}</td>
                  <td className="py-2.5 px-3 font-bold">{po.quantity} Units</td>
                  <td className="py-2.5 px-3 text-nexus-blue">{po.expected_delivery}</td>
                  <td className="py-2.5 px-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      po.status === 'completed'
                        ? 'bg-nexus-blue-04 text-nexus-blue border border-nexus-blue-20'
                        : 'bg-nexus-blue-12 text-nexus-blue border border-nexus-blue-20'
                    }`}>
                      {po.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-nexus-blue">
                    ₹{po.total_value.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* SUPPLIER MEMORY TAB */}
        {activeTab === 'suppliers' && (
          <table className="w-full text-left text-xs border-collapse font-mono">
            <thead>
              <tr className="border-b border-nexus-blue-20 bg-nexus-white text-nexus-blue text-[11px]">
                <th className="py-2.5 px-3">Supplier ID</th>
                <th className="py-2.5 px-3">Supplier Name</th>
                <th className="py-2.5 px-3">Total Orders</th>
                <th className="py-2.5 px-3">Delivered On-Time</th>
                <th className="py-2.5 px-3">Delays Logged</th>
                <th className="py-2.5 px-3">Contradictions</th>
                <th className="py-2.5 px-3">Reliability</th>
                <th className="py-2.5 px-3 text-right">Quality Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-nexus-blue">
              {supplierMemory.map((sup) => (
                <tr key={sup.supplier_id} className="hover:bg-nexus-white">
                  <td className="py-2.5 px-3 text-nexus-blue font-bold">{sup.supplier_id}</td>
                  <td className="py-2.5 px-3 font-sans font-semibold text-nexus-blue">{sup.supplier_name}</td>
                  <td className="py-2.5 px-3">{sup.total_orders} Orders</td>
                  <td className="py-2.5 px-3 text-nexus-blue font-bold">{sup.on_time_deliveries}</td>
                  <td className="py-2.5 px-3 text-nexus-blue font-bold">{sup.delayed_deliveries}</td>
                  <td className="py-2.5 px-3 text-nexus-blue font-bold">{sup.contradiction_count}</td>
                  <td className="py-2.5 px-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      sup.historical_reliability > 0.8
                        ? 'bg-nexus-blue-04 text-nexus-blue border border-nexus-blue-20'
                        : 'bg-nexus-blue-12 text-nexus-blue'
                    }`}>
                      {(sup.historical_reliability * 100).toFixed(0)}%
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-nexus-blue">
                    {(sup.quality_rating * 100).toFixed(0)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* PRODUCTION SCHEDULE TAB */}
        {activeTab === 'production' && (
          <table className="w-full text-left text-xs border-collapse font-mono">
            <thead>
              <tr className="border-b border-nexus-blue-20 bg-nexus-white text-nexus-blue text-[11px]">
                <th className="py-2.5 px-3">Order ID</th>
                <th className="py-2.5 px-3">Vehicle Model</th>
                <th className="py-2.5 px-3">Required Part</th>
                <th className="py-2.5 px-3">Planned Units</th>
                <th className="py-2.5 px-3">Deadline</th>
                <th className="py-2.5 px-3">Priority</th>
                <th className="py-2.5 px-3 text-right">Revenue Impact</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-nexus-blue">
              {productionOrders.map((prod) => (
                <tr key={prod.production_order_id} className="hover:bg-nexus-white">
                  <td className="py-2.5 px-3 text-nexus-blue font-bold">{prod.production_order_id}</td>
                  <td className="py-2.5 px-3 font-sans font-semibold text-nexus-blue">{prod.product}</td>
                  <td className="py-2.5 px-3">{prod.required_component || prod.part_id}</td>
                  <td className="py-2.5 px-3 font-bold">{prod.units_planned}</td>
                  <td className="py-2.5 px-3 text-nexus-blue-60">{prod.deadline || prod.scheduled_end}</td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-nexus-blue-04 text-nexus-blue border border-nexus-blue-20">
                      {prod.priority}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-nexus-blue">
                    ₹{((prod.revenue_impact ?? (prod.units_planned * 85000)) / 100000).toFixed(2)} Lakh
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* AUDIT TRAIL TAB */}
        {activeTab === 'audit' && (
          <div className="space-y-3 font-mono text-xs">
            {auditTrail.map((entry) => (
              <div
                key={entry.id}
                className="bg-nexus-white border border-nexus-blue-20 p-4 rounded-[8px] space-y-2 hover:border-blue-950/20 transition-all shadow-sm"
              >
                <div className="flex items-center justify-between border-b border-nexus-blue-20 pb-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-nexus-blue font-bold">{entry.timestamp}</span>
                    <span className="text-nexus-blue-60">•</span>
                    <span className="font-bold text-nexus-blue">{entry.event_name}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-nexus-blue-04 text-nexus-blue border border-nexus-blue-20 font-bold">
                      {entry.action_by}
                    </span>
                  </div>
                  <span className="text-nexus-blue font-bold">
                    Avoided Loss: <strong className="text-nexus-blue">+₹{(entry.avoided_loss / 100000).toFixed(2)} Lakh</strong>
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] text-nexus-blue font-sans">
                  <div>
                    <strong className="text-nexus-blue">Decision Rationale: </strong>
                    <span>{entry.decision_reason}</span>
                  </div>
                  <div>
                    <strong className="text-nexus-blue">Strategy Executed: </strong>
                    <span className="font-mono text-nexus-blue font-bold">{entry.selected_strategy}</span>
                  </div>
                </div>

                <div className="text-[10px] text-nexus-blue-60 pt-1 border-t border-nexus-blue-12 flex items-center justify-between">
                  <span>Part: {entry.part_id} ({entry.category})</span>
                  <span>ERP Modifications: {entry.erp_changes.join(', ')}</span>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
};
