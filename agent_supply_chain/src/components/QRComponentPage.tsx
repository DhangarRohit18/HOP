import React from 'react';
import { Part, InventoryItem, Supplier } from '../types/supplyChain';
import { calculateSmartOrder } from '../services/orderEngine';
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Package,
  Clock,
  Building,
  Sparkles,
  ArrowLeft,
  QrCode
} from 'lucide-react';

interface QRComponentPageProps {
  part: Part;
  inventory?: InventoryItem;
  supplier?: Supplier;
  onBack: () => void;
  onCreatePO: (partId: string) => void;
}

export const QRComponentPage: React.FC<QRComponentPageProps> = ({
  part,
  inventory,
  supplier,
  onBack,
  onCreatePO
}) => {
  const availableStock = inventory?.available_stock ?? inventory?.usable_stock ?? 0;
  const dailyConsumption = inventory?.daily_usage ?? 30;
  const coverageDays = dailyConsumption > 0 ? (availableStock / dailyConsumption).toFixed(1) : '0';
  const leadTimeDays = supplier?.lead_time_days ?? 7;
  const safetyStock = inventory?.safety_stock ?? 90;

  const smartOrder = calculateSmartOrder(
    availableStock,
    inventory?.incoming_stock ?? 0,
    inventory?.on_order_stock ?? 0,
    dailyConsumption,
    leadTimeDays,
    safetyStock,
    supplier?.min_order_quantity ?? 100,
    supplier?.pack_size ?? 50,
    supplier?.reliability_score ?? 0.85
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 flex flex-col items-center justify-start max-w-lg mx-auto font-sans space-y-5">
      
      {/* Header */}
      <div className="w-full flex items-center justify-between border-b border-slate-800 pb-3">
        <button
          onClick={onBack}
          className="flex items-center space-x-1.5 text-sky-400 hover:text-sky-300 text-xs font-mono font-bold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>BACK TO DASHBOARD</span>
        </button>
        <span className="text-[10px] font-mono bg-sky-950 text-sky-400 px-2.5 py-1 rounded-lg border border-sky-800">
          SUPPLYSHIELD 3D LIVE
        </span>
      </div>

      {/* Component Title Card */}
      <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-2">
        <div className="flex items-center space-x-2">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              part.status === 'RED' ? 'bg-red-500 animate-ping' : 'bg-emerald-400'
            }`}
          ></span>
          <span className="text-xs font-mono font-bold text-slate-400">{part.category}</span>
          <span className="text-xs font-mono px-2 py-0.5 bg-slate-800 rounded text-slate-300">
            {part.criticality}
          </span>
        </div>
        <h1 className="text-xl font-bold text-white tracking-tight">{part.display_name}</h1>
        <p className="text-xs font-mono text-sky-400">PART ID: {part.part_id}</p>
      </div>

      {/* Live Inventory Intelligence */}
      <div className="w-full grid grid-cols-2 gap-3 font-mono text-xs">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <span className="text-[10px] text-slate-400">CURRENT STOCK</span>
          <p className={`text-2xl font-bold ${availableStock === 0 ? 'text-red-400' : 'text-emerald-400'}`}>
            {availableStock} <span className="text-xs text-slate-400 font-normal">UNITS</span>
          </p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <span className="text-[10px] text-slate-400">DAILY CONSUMPTION</span>
          <p className="text-2xl font-bold text-amber-400">
            {dailyConsumption} <span className="text-xs text-slate-400 font-normal">/ DAY</span>
          </p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <span className="text-[10px] text-slate-400">COVERAGE</span>
          <p className={`text-2xl font-bold ${Number(coverageDays) < 3 ? 'text-red-400' : 'text-emerald-400'}`}>
            {coverageDays} <span className="text-xs text-slate-400 font-normal">DAYS</span>
          </p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1">
          <span className="text-[10px] text-slate-400">RECOMMENDED ORDER</span>
          <p className="text-2xl font-bold text-sky-400">
            {smartOrder.recommended_quantity} <span className="text-xs text-slate-400 font-normal">UNITS</span>
          </p>
        </div>
      </div>

      {/* Supplier Card */}
      <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-1 text-xs font-mono">
        <div className="flex justify-between text-slate-400 text-[10px]">
          <span>PRIMARY SUPPLIER</span>
          <span>LEAD TIME</span>
        </div>
        <div className="flex justify-between font-bold text-white text-sm">
          <span>{supplier?.supplier_name || 'Apex Photonics Ltd'}</span>
          <span>{leadTimeDays} DAYS</span>
        </div>
      </div>

      {/* Action Button */}
      <div className="w-full pt-2">
        <button
          onClick={() => onCreatePO(part.part_id)}
          className="w-full py-3.5 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-bold rounded-xl shadow-xl shadow-sky-900/40 text-xs font-mono tracking-wide"
        >
          CREATE PURCHASE ORDER
        </button>
      </div>

    </div>
  );
};
