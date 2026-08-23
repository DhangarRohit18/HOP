import React, { useState, useEffect } from 'react';
import { Part, InventoryItem, Supplier } from '../types/supplyChain';
import { calculateSmartOrder } from '../services/orderEngine';
import {
  InventoryDonut,
  CoverageRadialGauge,
  RequiredVsAvailableRadial
} from './charts/CircularGraphs';
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Package,
  Clock,
  Building,
  Sparkles,
  ArrowLeft,
  QrCode,
  Check,
  RefreshCw
} from 'lucide-react';

interface LiveQRComponentViewProps {
  partId: string;
  parts: Part[];
  inventory: InventoryItem[];
  suppliers: Supplier[];
  onBackToCockpit: () => void;
  onCreatePO: (partId: string) => void;
}

export const LiveQRComponentView: React.FC<LiveQRComponentViewProps> = ({
  partId,
  parts,
  inventory,
  suppliers,
  onBackToCockpit,
  onCreatePO
}) => {
  const [liveData, setLiveData] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const matchedPart = parts.find((p) => p.part_id.toUpperCase() === partId.toUpperCase());
  const matchedInv = inventory.find((i) => i.part_id.toUpperCase() === partId.toUpperCase());
  const matchedSup = suppliers.find((s) => (s.part_id || s.component_id || '').toUpperCase() === partId.toUpperCase());

  // Polling fallback / live fetch
  const refreshLiveComponent = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch(`http://localhost:8000/api/components/${partId}`);
      if (res.ok) {
        const data = await res.json();
        setLiveData(data);
      }
    } catch (e) {
      // Offline / React state fallback
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    refreshLiveComponent();
    const interval = setInterval(refreshLiveComponent, 6000);
    return () => clearInterval(interval);
  }, [partId]);

  if (!matchedPart) {
    return (
      <div className="min-h-screen bg-white text-slate-900 flex flex-col items-center justify-center p-6 text-center space-y-4 font-mono">
        <AlertTriangle className="w-12 h-12 text-blue-700 animate-bounce" />
        <h2 className="text-lg font-bold text-slate-900">Component Not Found</h2>
        <p className="text-xs text-slate-500">
          The scanned component ID <code>{partId}</code> does not exist in the canonical 27-part registry.
        </p>
        <button
          onClick={onBackToCockpit}
          className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold shadow-sm"
        >
          Return to Cockpit
        </button>
      </div>
    );
  }

  const availableStock = liveData?.available_stock ?? matchedInv?.available_stock ?? 0;
  const reservedStock = liveData?.reserved_stock ?? matchedInv?.reserved_stock ?? 30;
  const incomingStock = liveData?.incoming_stock ?? matchedInv?.incoming_stock ?? 0;
  const onOrderStock = liveData?.on_order_stock ?? matchedInv?.on_order_stock ?? 0;
  const dailyConsumption = liveData?.daily_usage ?? matchedInv?.daily_usage ?? 30;
  const leadTimeDays = liveData?.lead_time_days ?? matchedSup?.lead_time_days ?? 7;
  const safetyStock = liveData?.safety_stock ?? matchedInv?.safety_stock ?? 90;
  const coverageDays = dailyConsumption > 0 ? Number((availableStock / dailyConsumption).toFixed(1)) : 0;

  const smartOrder = calculateSmartOrder(
    availableStock,
    incomingStock,
    onOrderStock,
    dailyConsumption,
    leadTimeDays,
    safetyStock,
    matchedSup?.min_order_quantity ?? 100
  );

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col items-center p-4 md:p-6 space-y-4 max-w-xl mx-auto font-sans">
      
      {/* Top Header */}
      <div className="w-full flex items-center justify-between border-b border-slate-200 pb-3">
        <button
          onClick={onBackToCockpit}
          className="flex items-center space-x-1 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 rounded-xl text-xs font-mono font-bold text-slate-700 transition-all border border-slate-200"
        >
          <ArrowLeft className="w-4 h-4 text-blue-700" />
          <span>Back to Control Tower</span>
        </button>

        <div className="flex items-center space-x-2">
          <button
            onClick={refreshLiveComponent}
            className="p-1.5 bg-slate-50 rounded-lg text-slate-600 hover:text-blue-700 border border-slate-200"
            title="Refresh Live Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-700' : ''}`} />
          </button>
          <span className="text-[10px] font-mono bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg border border-blue-200 flex items-center gap-1 font-bold">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></span>
            LIVE QR SYNC
          </span>
        </div>
      </div>

      {/* Title Card */}
      <div className="w-full bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-2">
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-700"></span>
          <span className="text-xs font-mono font-bold text-blue-700">{matchedPart.category}</span>
          <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-100 rounded text-slate-600">
            {matchedPart.criticality}
          </span>
        </div>
        <h1 className="text-lg font-bold text-slate-900 tracking-tight font-heading">{matchedPart.display_name}</h1>
        <p className="text-xs font-mono text-slate-500">PART ID: <strong className="text-blue-700 font-bold">{matchedPart.part_id}</strong></p>
      </div>

      {/* Circular Gauges Row */}
      <div className="w-full grid grid-cols-2 gap-3 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-mono font-bold text-slate-500 mb-2">INVENTORY POSITION</span>
          <InventoryDonut
            available={availableStock}
            reserved={reservedStock}
            incoming={incomingStock}
            onOrder={onOrderStock}
            size={135}
          />
        </div>
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-mono font-bold text-slate-500 mb-2">COVERAGE GAUGE</span>
          <CoverageRadialGauge coverageDays={coverageDays} size={135} />
        </div>
      </div>

      {/* Live Breakdown Cards */}
      <div className="w-full grid grid-cols-2 gap-2.5 font-mono text-xs">
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1">
          <span className="text-[10px] text-slate-500">AVAILABLE STOCK</span>
          <p className="text-xl font-bold text-slate-900">
            {availableStock} <span className="text-xs text-slate-500 font-normal">UNITS</span>
          </p>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1">
          <span className="text-[10px] text-slate-500">DAILY BURN</span>
          <p className="text-xl font-bold text-slate-900">
            {dailyConsumption} <span className="text-xs text-slate-500 font-normal">/ DAY</span>
          </p>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1">
          <span className="text-[10px] text-slate-500">INCOMING SHIPMENTS</span>
          <p className="text-xl font-bold text-slate-900">
            {incomingStock} <span className="text-xs text-slate-500 font-normal">UNITS</span>
          </p>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-1">
          <span className="text-[10px] text-slate-500">RECOMMENDED ORDER</span>
          <p className="text-xl font-bold text-blue-700">
            {smartOrder.recommended_quantity} <span className="text-xs text-slate-500 font-normal">UNITS</span>
          </p>
        </div>
      </div>

      {/* Supplier Info */}
      <div className="w-full bg-white border border-slate-200 rounded-2xl p-4 space-y-1 text-xs font-mono shadow-sm">
        <div className="flex justify-between text-slate-500 text-[10px]">
          <span>PRIMARY SUPPLIER</span>
          <span>LEAD TIME</span>
        </div>
        <div className="flex justify-between font-bold text-slate-900 text-sm">
          <span>{matchedSup?.supplier_name || 'Apex Photonics Ltd'}</span>
          <span>{leadTimeDays} DAYS</span>
        </div>
      </div>

      {/* Action Button */}
      <div className="w-full pt-2">
        <button
          onClick={() => onCreatePO(matchedPart.part_id)}
          className="w-full py-3.5 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl shadow-sm text-xs font-mono tracking-wide flex items-center justify-center space-x-2 transition-all"
        >
          <Package className="w-4 h-4" />
          <span>CREATE PURCHASE ORDER ({smartOrder.recommended_quantity} UNITS)</span>
        </button>
      </div>

    </div>
  );
};
