import React from 'react';
import { ProductionPlan } from '../../types/supplyChain';
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
    <div className="bg-nexus-white border border-nexus-blue-20 rounded-[8px] p-4 shadow-sm space-y-3 font-sans">
      
      {/* Top Banner Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-nexus-blue-12 pb-3">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-[8px] bg-nexus-blue-04 text-nexus-blue border border-sky-100">
            <Car className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-nexus-blue tracking-tight font-sans tracking-tight">
                {plan.product} ({plan.variant})
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-nexus-blue-12 text-nexus-blue border border-nexus-blue-20 font-bold">
                PLAN: {plan.id}
              </span>
            </div>
            <p className="text-[11px] text-nexus-blue-60 font-mono">
              Target Deadline: {plan.deadline_days} Days • Priority: {plan.priority}
            </p>
          </div>
        </div>

        {/* Status Pill & Plan Config CTA */}
        <div className="flex items-center space-x-2 self-start md:self-auto">
          <div className={`px-3 py-1 rounded-[8px] text-xs font-mono font-bold flex items-center gap-1.5 border ${
            isAtRisk
              ? 'bg-blue-950 text-nexus-white border-slate-900'
              : isRecovering
              ? 'bg-nexus-blue-04 text-nexus-blue border-nexus-blue-20'
              : 'bg-nexus-blue-12 text-nexus-blue border-nexus-blue-20'
          }`}>
            <span className={`w-2 h-2 rounded-[4px] ${isAtRisk ? 'bg-sky-400 animate-ping' : 'bg-blue-950'}`}></span>
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
            className="flex items-center space-x-1 px-3 py-1 bg-nexus-blue-12 hover:bg-slate-200 text-nexus-blue rounded-[8px] text-xs font-mono transition-all border border-nexus-blue-20"
            title="Configure Target & Component BOM"
          >
            <Sliders className="w-3.5 h-3.5 text-nexus-blue" />
            <span className="hidden sm:inline">Configure Plan</span>
          </button>
        </div>
      </div>

      {/* 4 Core Capacity KPI Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono text-xs">
        
        {/* 1. Target Production */}
        <div className="bg-nexus-white p-3 rounded-[8px] border border-nexus-blue-20/80 space-y-0.5">
          <span className="text-[10px] text-nexus-blue-60 font-semibold block">TARGET PRODUCTION</span>
          <p className="text-xl font-bold text-nexus-blue">
            {plan.target_quantity.toLocaleString()} <span className="text-xs text-nexus-blue-60 font-normal">vehicles</span>
          </p>
          <span className="text-[10px] text-nexus-blue block font-medium">7-Day Assembly Goal</span>
        </div>

        {/* 2. Maximum Producible Units */}
        <div className="bg-nexus-white p-3 rounded-[8px] border border-nexus-blue-20/80 space-y-0.5">
          <span className="text-[10px] text-nexus-blue-60 font-semibold block">MAX PRODUCIBLE</span>
          <p className="text-xl font-bold text-nexus-blue">
            {plan.maximum_producible.toLocaleString()} <span className="text-xs text-nexus-blue-60 font-normal">vehicles</span>
          </p>
          <span className="text-[10px] text-nexus-blue-60 block font-normal">Capacity Cap</span>
        </div>

        {/* 3. Shortfall */}
        <div className="bg-nexus-white p-3 rounded-[8px] border border-nexus-blue-20/80 space-y-0.5">
          <span className="text-[10px] text-nexus-blue-60 font-semibold block">TARGET SHORTFALL</span>
          <p className={`text-xl font-bold ${plan.target_shortfall > 0 ? 'text-nexus-blue' : 'text-nexus-blue'}`}>
            {plan.target_shortfall.toLocaleString()} <span className="text-xs text-nexus-blue-60 font-normal">units</span>
          </p>
          <span className="text-[10px] text-nexus-blue-60 block font-normal">
            {plan.target_shortfall > 0 ? `-${((plan.target_shortfall / plan.target_quantity) * 100).toFixed(0)}% Output Deficit` : '100% Target Met'}
          </span>
        </div>

        {/* 4. Primary Bottleneck Component */}
        <div className="bg-nexus-white p-3 rounded-[8px] border border-nexus-blue-20/80 space-y-0.5">
          <span className="text-[10px] text-nexus-blue-60 font-semibold block">PRIMARY BOTTLENECK</span>
          <p className="text-sm font-bold text-nexus-blue truncate mt-1">
            {bottleneck ? bottleneck.part_id : 'NONE (Nominal)'}
          </p>
          <span className="text-[10px] text-nexus-blue-60 block truncate">
            {bottleneck ? `Shortage: -${bottleneck.shortage_quantity} units` : 'All 27 Parts Sufficient'}
          </span>
        </div>

      </div>

      {/* Bottleneck Alert & Fast Recovery Trigger Bar */}
      {bottleneck && plan.target_shortfall > 0 && (
        <div className="bg-nexus-blue-04 border border-nexus-blue-20 rounded-[8px] p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center space-x-2.5">
            <AlertCircle className="w-4 h-4 text-nexus-blue flex-shrink-0" />
            <div className="text-nexus-blue text-xs font-sans">
              <span className="font-bold text-nexus-blue">BOTTLENECK DETECTED: </span>
              <span>
                <strong>{bottleneck.display_name}</strong> limits production to <strong>{plan.maximum_producible}</strong> of <strong>{plan.target_quantity}</strong> vehicles.
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => onFocusBottleneck(bottleneck.part_id)}
              className="px-3 py-1.5 bg-nexus-white hover:bg-nexus-white text-nexus-blue font-bold rounded-[8px] text-xs transition-all border border-nexus-blue-20 flex items-center gap-1 shadow-sm"
              title="Focus 3D camera on bottleneck"
            >
              <span>View in 3D</span>
              <ChevronRight className="w-3.5 h-3.5 text-nexus-blue" />
            </button>

            <button
              onClick={onOpenRecoveryTwin}
              className="px-4 py-1.5 bg-blue-950 hover:bg-nexus-blue text-nexus-white font-bold rounded-[8px] text-xs transition-all shadow-sm flex items-center gap-1.5"
            >
              <Zap className="w-3.5 h-3.5 text-nexus-white" />
              <span>SOLVE BOTTLENECK</span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
