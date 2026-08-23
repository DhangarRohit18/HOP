import React, { useState, useEffect } from 'react';
import { Part, InventoryItem, Supplier } from '../../types/supplyChain';
import { calculateSmartOrder } from '../../services/supply_chain/orderEngine';
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
      <div className="min-h-screen bg-nexus-white text-nexus-blue flex flex-col items-center justify-center p-6 text-center space-y-4 font-mono">
        <AlertTriangle className="w-12 h-12 text-nexus-blue animate-bounce" />
        <h2 className="text-lg font-bold text-nexus-blue">Component Not Found</h2>
        <p className="text-xs text-nexus-blue-60">
          The scanned component ID <code>{partId}</code> does not exist in the canonical 27-part registry.
        </p>
        <button
          onClick={onBackToCockpit}
          className="px-4 py-2 bg-nexus-blue hover:bg-nexus-blue-dark text-nexus-white rounded-[8px] text-xs font-bold shadow-sm"
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
    <div className="min-h-screen bg-nexus-white text-nexus-blue flex flex-col items-center p-4 md:p-6 space-y-4 max-w-xl mx-auto font-sans">
      
      {/* Top Header */}
      <div className="w-full flex items-center justify-between border-b border-nexus-blue-20 pb-3">
        <button
          onClick={onBackToCockpit}
          className="flex items-center space-x-1 px-3 py-1.5 bg-nexus-white hover:bg-nexus-blue-12 rounded-[8px] text-xs font-mono font-bold text-nexus-blue transition-all border border-nexus-blue-20"
        >
          <ArrowLeft className="w-4 h-4 text-nexus-blue" />
          <span>Back to Control Tower</span>
        </button>

        <div className="flex items-center space-x-2">
          <button
            onClick={refreshLiveComponent}
            className="p-1.5 bg-nexus-white rounded-[8px] text-nexus-blue hover:text-nexus-blue border border-nexus-blue-20"
            title="Refresh Live Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-nexus-blue' : ''}`} />
          </button>
          <span className="text-[10px] font-mono bg-nexus-blue-04 text-nexus-blue px-2.5 py-1 rounded-[8px] border border-nexus-blue-20 flex items-center gap-1 font-bold">
            <span className="w-2 h-2 rounded-[4px] bg-nexus-blue animate-pulse"></span>
            LIVE QR SYNC
          </span>
        </div>
      </div>

      {/* Title Card */}
      <div className="w-full bg-nexus-white border border-nexus-blue-20 rounded-[8px] p-5 shadow-sm space-y-2">
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-[4px] bg-nexus-blue"></span>
          <span className="text-xs font-mono font-bold text-nexus-blue">{matchedPart.category}</span>
          <span className="text-[10px] font-mono px-2 py-0.5 bg-nexus-blue-12 rounded text-nexus-blue">
            {matchedPart.criticality}
          </span>
        </div>
        <h1 className="text-lg font-bold text-nexus-blue tracking-tight font-sans tracking-tight">{matchedPart.display_name}</h1>
        <p className="text-xs font-mono text-nexus-blue-60">PART ID: <strong className="text-nexus-blue font-bold">{matchedPart.part_id}</strong></p>
      </div>

      {/* Circular Gauges Row */}
      <div className="w-full grid grid-cols-2 gap-3 bg-nexus-white border border-nexus-blue-20 rounded-[8px] p-4 shadow-sm">
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-mono font-bold text-nexus-blue-60 mb-2">INVENTORY POSITION</span>
          <InventoryDonut
            available={availableStock}
            reserved={reservedStock}
            incoming={incomingStock}
            onOrder={onOrderStock}
            size={135}
          />
        </div>
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-mono font-bold text-nexus-blue-60 mb-2">COVERAGE GAUGE</span>
          <CoverageRadialGauge coverageDays={coverageDays} size={135} />
        </div>
      </div>

      {/* Live Breakdown Cards */}
      <div className="w-full grid grid-cols-2 gap-2.5 font-mono text-xs">
        <div className="bg-nexus-white border border-nexus-blue-20 rounded-[8px] p-3.5 space-y-1">
          <span className="text-[10px] text-nexus-blue-60">AVAILABLE STOCK</span>
          <p className="text-xl font-bold text-nexus-blue">
            {availableStock} <span className="text-xs text-nexus-blue-60 font-normal">UNITS</span>
          </p>
        </div>
        <div className="bg-nexus-white border border-nexus-blue-20 rounded-[8px] p-3.5 space-y-1">
          <span className="text-[10px] text-nexus-blue-60">DAILY BURN</span>
          <p className="text-xl font-bold text-nexus-blue">
            {dailyConsumption} <span className="text-xs text-nexus-blue-60 font-normal">/ DAY</span>
          </p>
        </div>
        <div className="bg-nexus-white border border-nexus-blue-20 rounded-[8px] p-3.5 space-y-1">
          <span className="text-[10px] text-nexus-blue-60">INCOMING SHIPMENTS</span>
          <p className="text-xl font-bold text-nexus-blue">
            {incomingStock} <span className="text-xs text-nexus-blue-60 font-normal">UNITS</span>
          </p>
        </div>
        <div className="bg-nexus-white border border-nexus-blue-20 rounded-[8px] p-3.5 space-y-1">
          <span className="text-[10px] text-nexus-blue-60">RECOMMENDED ORDER</span>
          <p className="text-xl font-bold text-nexus-blue">
            {smartOrder.recommended_quantity} <span className="text-xs text-nexus-blue-60 font-normal">UNITS</span>
          </p>
        </div>
      </div>

      {/* Supplier Info */}
      <div className="w-full bg-nexus-white border border-nexus-blue-20 rounded-[8px] p-4 space-y-1 text-xs font-mono shadow-sm">
        <div className="flex justify-between text-nexus-blue-60 text-[10px]">
          <span>PRIMARY SUPPLIER</span>
          <span>LEAD TIME</span>
        </div>
        <div className="flex justify-between font-bold text-nexus-blue text-sm">
          <span>{matchedSup?.supplier_name || 'Apex Photonics Ltd'}</span>
          <span>{leadTimeDays} DAYS</span>
        </div>
      </div>

      {/* Action Button */}
      <div className="w-full pt-2">
        <button
          onClick={() => onCreatePO(matchedPart.part_id)}
          className="w-full py-3.5 bg-nexus-blue hover:bg-nexus-blue-dark text-nexus-white font-bold rounded-[8px] shadow-sm text-xs font-mono tracking-wide flex items-center justify-center space-x-2 transition-all"
        >
          <Package className="w-4 h-4" />
          <span>CREATE PURCHASE ORDER ({smartOrder.recommended_quantity} UNITS)</span>
        </button>
      </div>

    </div>
  );
};
