import React, { useState } from 'react';
import { Part, InventoryItem, Supplier, PurchaseOrder, ProductionOrder } from '../types/supplyChain';
import { calculateSmartOrder } from '../services/orderEngine';
import { QRCodeComponent } from './qr/QRCodeComponent';
import {
  InventoryDonut,
  CoverageRadialGauge,
  RequiredVsAvailableRadial
} from './charts/CircularGraphs';
import {
  X,
  Package,
  Layers,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  ChevronRight,
  Sparkles,
  Truck,
  DollarSign,
  QrCode,
  ShieldCheck,
  Cpu,
  Info,
  Clock,
  Zap,
  ArrowRight
} from 'lucide-react';

interface ComponentInfoPanelProps {
  part: Part | null;
  allParts?: Part[];
  inventory?: InventoryItem;
  supplier?: Supplier;
  openPOs?: PurchaseOrder[];
  productionOrders?: ProductionOrder[];
  onClose: () => void;
  onSelectPart?: (partId: string) => void;
  onCreatePO?: (partId: string) => void;
  onFocus3D?: (partId: string) => void;
}

type TabType = 'OVERVIEW' | 'INVENTORY' | 'PROCUREMENT' | 'SUPPLIER' | 'QR';

export const ComponentInfoPanel: React.FC<ComponentInfoPanelProps> = ({
  part,
  allParts = [],
  inventory,
  supplier,
  openPOs = [],
  productionOrders = [],
  onClose,
  onSelectPart,
  onCreatePO,
  onFocus3D
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('OVERVIEW');

  // If no part is selected, show clean unselected state
  if (!part) {
    return (
      <div className="bg-white border border-slate-200 rounded-3xl p-6 text-center text-slate-400 shadow-sm h-full flex flex-col items-center justify-center space-y-3 font-sans">
        <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100">
          <Info className="w-8 h-8" />
        </div>
        <h3 className="text-base font-bold text-slate-900 font-heading">No Component Selected</h3>
        <p className="text-xs text-slate-500 max-w-xs leading-relaxed font-sans">
          Click any component on the 3D Concept Car or search by part name to inspect live inventory, circular charts, and procurement intelligence.
        </p>
      </div>
    );
  }

  // Consistent Mathematical Inventory Metrics
  const availableStock = inventory?.available_stock ?? inventory?.usable_stock ?? 0;
  const reservedStock = inventory?.reserved_stock ?? 30;
  const incomingStock = inventory?.incoming_stock ?? 0;
  const onOrderStock = inventory?.on_order_stock ?? 0;
  const dailyConsumption = inventory?.daily_usage ?? 30;
  const safetyStock = inventory?.safety_stock ?? 90;
  const leadTimeDays = supplier?.lead_time_days ?? 7;
  const unitCost = inventory?.unit_cost ?? supplier?.unit_price ?? 1200;
  const moq = supplier?.min_order_quantity ?? 100;
  const supplierReliability = supplier?.reliability_score ?? 0.85;

  const coverageDays = dailyConsumption > 0 ? Number((availableStock / dailyConsumption).toFixed(1)) : 0;

  const smartOrder = calculateSmartOrder(
    availableStock,
    incomingStock,
    onOrderStock,
    dailyConsumption,
    leadTimeDays,
    safetyStock,
    moq,
    supplier?.pack_size ?? 50,
    supplierReliability
  );

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm flex flex-col h-full overflow-hidden font-sans space-y-4">
      
      {/* ─── HEADER: Component Title & Status ─── */}
      <div className="flex items-start justify-between border-b border-slate-100 pb-3 flex-shrink-0">
        <div className="space-y-1">
          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                part.status === 'RED'
                  ? 'bg-red-50 text-red-700 border border-red-200'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}
            >
              {part.status === 'RED' ? '● CRITICAL SHORTAGE' : '● NOMINAL / HEALTHY'}
            </span>
            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[10px] font-mono font-semibold">
              {part.category}
            </span>
          </div>
          <h2 className="text-base font-bold text-slate-900 tracking-tight font-heading">{part.display_name}</h2>
          <p className="text-xs font-mono text-blue-700 font-bold">
            PART ID: {part.part_id}
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-xl bg-slate-50 text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-all border border-slate-200"
          title="Close Inspector"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* ─── NAVIGATION TABS ─── */}
      <div className="flex items-center space-x-1 bg-slate-50 p-1 rounded-xl border border-slate-200 text-[11px] font-mono overflow-x-auto flex-shrink-0 scrollbar-none">
        <button
          onClick={() => setActiveTab('OVERVIEW')}
          className={`px-2.5 py-1 rounded-lg transition-all font-semibold whitespace-nowrap ${
            activeTab === 'OVERVIEW' ? 'bg-blue-700 text-white shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          OVERVIEW
        </button>
        <button
          onClick={() => setActiveTab('INVENTORY')}
          className={`px-2.5 py-1 rounded-lg transition-all font-semibold whitespace-nowrap ${
            activeTab === 'INVENTORY' ? 'bg-blue-700 text-white shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          INVENTORY
        </button>
        <button
          onClick={() => setActiveTab('PROCUREMENT')}
          className={`px-2.5 py-1 rounded-lg transition-all font-semibold whitespace-nowrap ${
            activeTab === 'PROCUREMENT' ? 'bg-blue-700 text-white shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          SMART ORDER
        </button>
        <button
          onClick={() => setActiveTab('SUPPLIER')}
          className={`px-2.5 py-1 rounded-lg transition-all font-semibold whitespace-nowrap ${
            activeTab === 'SUPPLIER' ? 'bg-blue-700 text-white shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          SUPPLIER
        </button>
        <button
          onClick={() => setActiveTab('QR')}
          className={`px-2.5 py-1 rounded-lg transition-all font-semibold whitespace-nowrap flex items-center gap-1 ${
            activeTab === 'QR' ? 'bg-blue-700 text-white shadow-sm font-bold' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <QrCode className="w-3 h-3" />
          <span>QR</span>
        </button>
      </div>

      {/* ─── TAB CONTENT ─── */}
      <div className="flex-1 overflow-y-auto space-y-3 font-sans pr-1 scrollbar-thin scrollbar-thumb-slate-200 text-xs">
        
        {/* OVERVIEW TAB */}
        {activeTab === 'OVERVIEW' && (
          <div className="space-y-3">
            {/* 3 Core Metric Tiles */}
            <div className="grid grid-cols-3 gap-2 text-center font-mono">
              <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200">
                <span className="text-[10px] text-slate-500 block font-sans">Available</span>
                <strong className="text-base text-slate-900 font-heading">{availableStock}</strong>
                <span className="text-[9px] text-slate-400 block">units</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200">
                <span className="text-[10px] text-slate-500 block font-sans">Daily Burn</span>
                <strong className="text-base text-slate-900 font-heading">{dailyConsumption}</strong>
                <span className="text-[9px] text-slate-400 block">units/day</span>
              </div>
              <div className="bg-blue-50 p-2.5 rounded-2xl border border-blue-200">
                <span className="text-[10px] text-blue-700 block font-sans font-bold">Coverage</span>
                <strong className="text-base text-blue-700 font-heading">{coverageDays}d</strong>
                <span className="text-[9px] text-blue-600 block">safe runway</span>
              </div>
            </div>

            {/* Smart Procurement Summary */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1 font-mono text-xs">
              <div className="flex justify-between items-center text-slate-700">
                <span className="text-slate-500 font-sans">Primary Supplier:</span>
                <strong className="text-slate-900">{supplier?.supplier_name || 'Apex Photonics'}</strong>
              </div>
              <div className="flex justify-between items-center text-slate-700">
                <span className="text-slate-500 font-sans">Lead Time:</span>
                <strong className="text-slate-900">{leadTimeDays} Days</strong>
              </div>
              <div className="flex justify-between items-center text-slate-700">
                <span className="text-slate-500 font-sans">Smart Reorder Qty:</span>
                <strong className="text-blue-700">{smartOrder.recommended_quantity} Units</strong>
              </div>
            </div>
          </div>
        )}

        {/* INVENTORY TAB */}
        {activeTab === 'INVENTORY' && (
          <div className="space-y-3 font-mono text-xs">
            <div className="flex justify-center p-2 bg-slate-50 rounded-2xl border border-slate-200">
              <InventoryDonut
                available={availableStock}
                reserved={reservedStock}
                incoming={incomingStock}
                onOrder={onOrderStock}
                size={120}
              />
            </div>
            <div className="space-y-1.5 text-slate-700">
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans">Usable Stock:</span>
                <strong className="text-slate-900">{availableStock} units</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans">Safety Buffer:</span>
                <strong className="text-slate-900">{safetyStock} units</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans">Warehouse:</span>
                <strong className="text-slate-900">{inventory?.warehouse || 'Warehouse Alpha'}</strong>
              </div>
            </div>
          </div>
        )}

        {/* PROCUREMENT TAB */}
        {activeTab === 'PROCUREMENT' && (
          <div className="space-y-2.5 font-mono text-xs">
            <div className="p-3 bg-blue-50 rounded-2xl border border-blue-200 space-y-1">
              <span className="text-[10px] text-blue-700 font-bold font-sans uppercase block">
                Calculated Reorder Recommendation
              </span>
              <p className="text-lg font-bold text-blue-700 font-heading">
                {smartOrder.recommended_quantity} Units
              </p>
              <span className="text-[11px] text-slate-600 font-sans block">
                Estimated Order Value: ₹{(smartOrder.recommended_quantity * unitCost).toLocaleString()}
              </span>
            </div>
          </div>
        )}

        {/* SUPPLIER TAB */}
        {activeTab === 'SUPPLIER' && (
          <div className="space-y-2 font-mono text-xs text-slate-700">
            <div className="flex justify-between">
              <span className="text-slate-500 font-sans">Supplier:</span>
              <strong className="text-slate-900">{supplier?.supplier_name || 'Apex Photonics'}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-sans">Reliability:</span>
              <strong className="text-blue-700">{((supplier?.reliability_score ?? 0.88) * 100).toFixed(0)}%</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-sans">Unit Price:</span>
              <strong className="text-slate-900">₹{unitCost.toLocaleString()}</strong>
            </div>
          </div>
        )}

        {/* QR TAB */}
        {activeTab === 'QR' && (
          <div className="flex flex-col items-center justify-center p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
            <QRCodeComponent
              partId={part.part_id}
              displayName={part.display_name}
              size={120}
            />
            <span className="text-[10px] text-slate-500 font-mono">Scan for mobile floor passport</span>
          </div>
        )}

      </div>

      {/* ─── FOOTER ACTION BUTTON ─── */}
      <div className="pt-2 border-t border-slate-100 flex-shrink-0">
        <button
          onClick={() => onCreatePO && onCreatePO(part.part_id)}
          className="w-full py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-mono font-bold transition-all shadow-sm flex items-center justify-center space-x-1.5"
        >
          <Package className="w-4 h-4" />
          <span>CREATE PURCHASE ORDER</span>
        </button>
      </div>

    </div>
  );
};
