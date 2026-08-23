import React from 'react';
import { ProductionPlan } from '../types/supplyChain';
import { CheckCircle2, AlertCircle, ArrowRight, TrendingUp, ShieldCheck, Sparkles } from 'lucide-react';

interface BeforeAfterRecoveryComparisonProps {
  plan: ProductionPlan;
  isRecovered: boolean;
  recoveredCapacity?: number;
}

export const BeforeAfterRecoveryComparison: React.FC<BeforeAfterRecoveryComparisonProps> = ({
  plan,
  isRecovered,
  recoveredCapacity = 1050
}) => {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 font-sans">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 bg-sky-50 text-sky-600 rounded-xl border border-sky-100">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 font-heading">
              Autonomous Recovery Twin — Before vs. After Impact Analysis
            </h3>
            <p className="text-[11px] text-slate-500 font-mono">
              Vehicle Assembly Continuity &amp; Production Capacity Verification
            </p>
          </div>
        </div>
        <span className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border ${
          isRecovered
            ? 'bg-slate-900 text-white border-slate-900'
            : 'bg-sky-50 text-sky-700 border-sky-200'
        }`}>
          {isRecovered ? 'PRODUCTION RESTORED' : 'RECOVERY SIMULATION'}
        </span>
      </div>

      {/* Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
        
        {/* BEFORE BOX (Disruption State) */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2.5">
          <div className="flex items-center justify-between text-slate-900 font-bold border-b border-slate-200/80 pb-1.5">
            <span className="flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-sky-600" />
              BEFORE AUTONOMOUS ACTION
            </span>
            <span className="text-[10px] bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-700 font-bold">
              DISRUPTED
            </span>
          </div>

          <div className="space-y-1.5 text-slate-700">
            <div className="flex justify-between">
              <span className="text-slate-500">Target Production:</span>
              <span className="text-slate-900 font-bold">{plan.target_quantity.toLocaleString()} Vehicles</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Maximum Producible:</span>
              <span className="text-slate-900 font-bold">850 Vehicles</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Target Shortfall:</span>
              <span className="text-sky-700 font-bold">-150 Units (-15%)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Limiting Bottleneck:</span>
              <span className="text-slate-900 font-bold">ECU (850 Available)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Operational Status:</span>
              <span className="text-slate-900 font-bold">LINE STOP AT 8.5 DAYS</span>
            </div>
          </div>
        </div>

        {/* AFTER BOX (Recovered State) */}
        <div className="bg-sky-50/50 p-4 rounded-xl border border-sky-200 space-y-2.5">
          <div className="flex items-center justify-between text-sky-700 font-bold border-b border-sky-200/80 pb-1.5">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-sky-600" />
              AFTER AUTONOMOUS RECOVERY
            </span>
            <span className="text-[10px] bg-white px-2 py-0.5 rounded border border-sky-200 text-sky-700 font-bold">
              OPTIMIZED
            </span>
          </div>

          <div className="space-y-1.5 text-slate-700">
            <div className="flex justify-between">
              <span className="text-slate-500">Target Production:</span>
              <span className="text-slate-900 font-bold">{plan.target_quantity.toLocaleString()} Vehicles</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Maximum Producible:</span>
              <span className="text-sky-700 font-bold">{recoveredCapacity.toLocaleString()} Vehicles</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Target Shortfall:</span>
              <span className="text-slate-900 font-bold">0 Units (100% Target Met)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Limiting Bottleneck:</span>
              <span className="text-slate-900 font-bold">NONE (Buffers Active)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Operational Status:</span>
              <span className="text-sky-700 font-bold">PRODUCTION RESTORED</span>
            </div>
          </div>
        </div>

      </div>

      {/* Avoided Loss & Restored ROI Footer */}
      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 font-mono text-xs">
        <div className="flex items-center space-x-2 text-slate-800">
          <TrendingUp className="w-4 h-4 text-sky-600" />
          <span><strong>150 Vehicles Recovered</strong> | Zero Stoppage on Line Alpha</span>
        </div>
        <div className="text-right">
          <span className="text-slate-500">Avoided Loss: </span>
          <strong className="text-sky-700 font-bold text-sm">₹13.32 Lakh</strong>
        </div>
      </div>

    </div>
  );
};
