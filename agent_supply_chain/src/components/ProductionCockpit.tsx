import React from 'react';
import { ProductionPlan } from '../types/supplyChain';
import {
  Car,
  AlertCircle,
  CheckCircle2,
  TrendingDown,
  Sparkles,
  Zap,
  Sliders,
  ChevronRight,
  ShieldAlert,
  Clock,
  Layers,
  ArrowRight
} from 'lucide-react';

interface ProductionCockpitProps {
  plan: ProductionPlan;
  onFocusBottleneck: (partId: string) => void;
  onOpenRecoveryTwin: () => void;
  onOpenPlanConfig: () => void;
}

export const ProductionCockpit: React.FC<ProductionCockpitProps> = ({
  plan,
  onFocusBottleneck,
  onOpenRecoveryTwin,
  onOpenPlanConfig
}) => {
  const isAtRisk = plan.production_status === 'PRODUCTION_AT_RISK';
  const isRecovering = plan.production_status === 'RECOVERY_IN_PROGRESS';
  const isReady = plan.production_status === 'PRODUCTION_READY';

  const bottleneck = plan.primary_bottleneck;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3 font-sans">
      
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-xl bg-sky-50 text-sky-600 border border-sky-100">
            <Car className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900 tracking-tight font-heading">
                {plan.product} ({plan.variant})
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-bold">
                PLAN: {plan.id}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-mono">
              Target Deadline: {plan.deadline_days} Days • Priority: {plan.priority}
            </p>
          </div>
        </div>

        {/* Status Pill & Plan Config CTA */}
        <div className="flex items-center space-x-2 self-start md:self-auto">
          <div className={`px-3 py-1 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 border ${
            isAtRisk
              ? 'bg-slate-900 text-white border-slate-900'
              : isRecovering
              ? 'bg-sky-50 text-sky-700 border-sky-200'
              : 'bg-slate-100 text-slate-800 border-slate-200'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isAtRisk ? 'bg-sky-400 animate-ping' : 'bg-sky-600'}`}></span>
            <span>
              {isAtRisk
                ? 'PRODUCTION AT RISK'
                : isRecovering
                ? 'RECOVERY IN TRANSIT'
                : 'PRODUCTION READY'}
            </span>
          </div>

          <button
            onClick={onOpenPlanConfig}
            className="flex items-center space-x-1 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-mono transition-all border border-slate-200"
            title="Configure Target & Component BOM"
          >
            <Sliders className="w-3.5 h-3.5 text-sky-600" />
            <span className="hidden sm:inline">Configure Plan</span>
          </button>
        </div>
      </div>

      {/* 4 Core Capacity KPI Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono text-xs">
        
        {/* 1. Target Production */}
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-0.5">
          <span className="text-[10px] text-slate-500 font-semibold block">TARGET PRODUCTION</span>
          <p className="text-xl font-bold text-slate-900">
            {plan.target_quantity.toLocaleString()} <span className="text-xs text-slate-500 font-normal">vehicles</span>
          </p>
          <span className="text-[10px] text-sky-600 block font-medium">7-Day Assembly Goal</span>
        </div>

        {/* 2. Maximum Producible Units */}
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-0.5">
          <span className="text-[10px] text-slate-500 font-semibold block">MAX PRODUCIBLE</span>
          <p className="text-xl font-bold text-slate-900">
            {plan.maximum_producible.toLocaleString()} <span className="text-xs text-slate-500 font-normal">vehicles</span>
          </p>
          <span className="text-[10px] text-slate-500 block font-normal">Capacity Cap</span>
        </div>

        {/* 3. Shortfall */}
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-0.5">
          <span className="text-[10px] text-slate-500 font-semibold block">TARGET SHORTFALL</span>
          <p className={`text-xl font-bold ${plan.target_shortfall > 0 ? 'text-sky-700' : 'text-slate-900'}`}>
            {plan.target_shortfall.toLocaleString()} <span className="text-xs text-slate-500 font-normal">units</span>
          </p>
          <span className="text-[10px] text-slate-500 block font-normal">
            {plan.target_shortfall > 0 ? `-${((plan.target_shortfall / plan.target_quantity) * 100).toFixed(0)}% Output Deficit` : '100% Target Met'}
          </span>
        </div>

        {/* 4. Primary Bottleneck Component */}
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-0.5">
          <span className="text-[10px] text-slate-500 font-semibold block">PRIMARY BOTTLENECK</span>
          <p className="text-sm font-bold text-sky-600 truncate mt-1">
            {bottleneck ? bottleneck.part_id : 'NONE (Nominal)'}
          </p>
          <span className="text-[10px] text-slate-500 block truncate">
            {bottleneck ? `Shortage: -${bottleneck.shortage_quantity} units` : 'All 27 Parts Sufficient'}
          </span>
        </div>

      </div>

      {/* Bottleneck Alert & Fast Recovery Trigger Bar */}
      {bottleneck && plan.target_shortfall > 0 && (
        <div className="bg-sky-50 border border-sky-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center space-x-2.5">
            <AlertCircle className="w-4 h-4 text-sky-600 flex-shrink-0" />
            <div className="text-slate-800 text-xs font-sans">
              <span className="font-bold text-sky-700">BOTTLENECK DETECTED: </span>
              <span>
                <strong>{bottleneck.display_name}</strong> limits production to <strong>{plan.maximum_producible}</strong> of <strong>{plan.target_quantity}</strong> vehicles.
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => onFocusBottleneck(bottleneck.part_id)}
              className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 font-bold rounded-lg text-xs transition-all border border-slate-200 flex items-center gap-1 shadow-sm"
              title="Focus 3D camera on bottleneck"
            >
              <span>View in 3D</span>
              <ChevronRight className="w-3.5 h-3.5 text-sky-600" />
            </button>

            <button
              onClick={onOpenRecoveryTwin}
              className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-lg text-xs transition-all shadow-sm flex items-center gap-1.5"
            >
              <Zap className="w-3.5 h-3.5 text-white" />
              <span>SOLVE BOTTLENECK</span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
