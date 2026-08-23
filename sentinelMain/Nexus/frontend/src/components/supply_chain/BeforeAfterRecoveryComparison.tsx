import React from 'react';
import { ProductionPlan } from '../../types/supplyChain';
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
    <div className="bg-nexus-white border border-nexus-blue-20 rounded-[8px] p-5 shadow-sm space-y-4 font-sans">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-nexus-blue-12 pb-3">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 bg-nexus-blue-04 text-nexus-blue rounded-[8px] border border-sky-100">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-nexus-blue font-sans tracking-tight">
              Autonomous Recovery Twin — Before vs. After Impact Analysis
            </h3>
            <p className="text-[11px] text-nexus-blue-60 font-mono">
              Vehicle Assembly Continuity &amp; Production Capacity Verification
            </p>
          </div>
        </div>
        <span className={`px-2.5 py-1 rounded-[8px] text-xs font-mono font-bold border ${
          isRecovered
            ? 'bg-blue-950 text-nexus-white border-slate-900'
            : 'bg-nexus-blue-04 text-nexus-blue border-nexus-blue-20'
        }`}>
          {isRecovered ? 'PRODUCTION RESTORED' : 'RECOVERY SIMULATION'}
        </span>
      </div>

      {/* Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
        
        {/* BEFORE BOX (Disruption State) */}
        <div className="bg-nexus-white p-4 rounded-[8px] border border-nexus-blue-20 space-y-2.5">
          <div className="flex items-center justify-between text-nexus-blue font-bold border-b border-nexus-blue-20/80 pb-1.5">
            <span className="flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-nexus-blue" />
              BEFORE AUTONOMOUS ACTION
            </span>
            <span className="text-[10px] bg-nexus-white px-2 py-0.5 rounded border border-nexus-blue-20 text-nexus-blue font-bold">
              DISRUPTED
            </span>
          </div>

          <div className="space-y-1.5 text-nexus-blue">
            <div className="flex justify-between">
              <span className="text-nexus-blue-60">Target Production:</span>
              <span className="text-nexus-blue font-bold">{plan.target_quantity.toLocaleString()} Vehicles</span>
            </div>
            <div className="flex justify-between">
              <span className="text-nexus-blue-60">Maximum Producible:</span>
              <span className="text-nexus-blue font-bold">850 Vehicles</span>
            </div>
            <div className="flex justify-between">
              <span className="text-nexus-blue-60">Target Shortfall:</span>
              <span className="text-nexus-blue font-bold">-150 Units (-15%)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-nexus-blue-60">Limiting Bottleneck:</span>
              <span className="text-nexus-blue font-bold">ECU (850 Available)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-nexus-blue-60">Operational Status:</span>
              <span className="text-nexus-blue font-bold">LINE STOP AT 8.5 DAYS</span>
            </div>
          </div>
        </div>

        {/* AFTER BOX (Recovered State) */}
        <div className="bg-nexus-blue-04/50 p-4 rounded-[8px] border border-nexus-blue-20 space-y-2.5">
          <div className="flex items-center justify-between text-nexus-blue font-bold border-b border-nexus-blue-20/80 pb-1.5">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-nexus-blue" />
              AFTER AUTONOMOUS RECOVERY
            </span>
            <span className="text-[10px] bg-nexus-white px-2 py-0.5 rounded border border-nexus-blue-20 text-nexus-blue font-bold">
              OPTIMIZED
            </span>
          </div>

          <div className="space-y-1.5 text-nexus-blue">
            <div className="flex justify-between">
              <span className="text-nexus-blue-60">Target Production:</span>
              <span className="text-nexus-blue font-bold">{plan.target_quantity.toLocaleString()} Vehicles</span>
            </div>
            <div className="flex justify-between">
              <span className="text-nexus-blue-60">Maximum Producible:</span>
              <span className="text-nexus-blue font-bold">{recoveredCapacity.toLocaleString()} Vehicles</span>
            </div>
            <div className="flex justify-between">
              <span className="text-nexus-blue-60">Target Shortfall:</span>
              <span className="text-nexus-blue font-bold">0 Units (100% Target Met)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-nexus-blue-60">Limiting Bottleneck:</span>
              <span className="text-nexus-blue font-bold">NONE (Buffers Active)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-nexus-blue-60">Operational Status:</span>
              <span className="text-nexus-blue font-bold">PRODUCTION RESTORED</span>
            </div>
          </div>
        </div>

      </div>

      {/* Avoided Loss & Restored ROI Footer */}
      <div className="bg-nexus-white p-3.5 rounded-[8px] border border-nexus-blue-20 flex flex-col sm:flex-row sm:items-center justify-between gap-2 font-mono text-xs">
        <div className="flex items-center space-x-2 text-nexus-blue">
          <TrendingUp className="w-4 h-4 text-nexus-blue" />
          <span><strong>150 Vehicles Recovered</strong> | Zero Stoppage on Line Alpha</span>
        </div>
        <div className="text-right">
          <span className="text-nexus-blue-60">Avoided Loss: </span>
          <strong className="text-nexus-blue font-bold text-sm">₹13.32 Lakh</strong>
        </div>
      </div>

    </div>
  );
};
