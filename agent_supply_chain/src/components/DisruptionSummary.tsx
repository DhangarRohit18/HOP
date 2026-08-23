import React from 'react';
import { DisruptionState, Part } from '../types/supplyChain';
import { AlertOctagon, HelpCircle, Layers, CheckCircle2, ShieldAlert, Cpu, ArrowRight } from 'lucide-react';

interface DisruptionSummaryProps {
  disruptionState: DisruptionState;
  part: Part | undefined;
}

export const DisruptionSummary: React.FC<DisruptionSummaryProps> = ({ disruptionState, part }) => {
  const plan = disruptionState.selected_plan;
  const isApprovalPending = disruptionState.approval_brief?.status === 'PENDING';

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4 font-sans">
      {/* Title Bar */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2 font-heading">
          <AlertOctagon className="w-5 h-5 text-blue-700" />
          Autonomous Disruption Control Briefing
        </h2>
        <span className="text-xs font-mono text-slate-500">
          PART ID: <strong className="text-blue-700">{disruptionState.part_id || 'LEFT_HEADLIGHT'}</strong>
        </span>
      </div>

      {/* 7 Core Executive Questions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
        
        {/* 1. WHAT HAPPENED */}
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
          <span className="text-slate-500 font-semibold uppercase text-[10px] tracking-wider flex items-center gap-1.5 font-mono">
            <HelpCircle className="w-3.5 h-3.5 text-blue-700" /> 1. What Happened?
          </span>
          <p className="text-slate-800 font-medium leading-relaxed">
            {disruptionState.description || 'Supplier SUP-21 delayed 1,000 units of Left Headlight Matrix LED by 5-7 days.'}
          </p>
        </div>

        {/* 2. WHAT IS AFFECTED */}
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
          <span className="text-slate-500 font-semibold uppercase text-[10px] tracking-wider flex items-center gap-1.5 font-mono">
            <Layers className="w-3.5 h-3.5 text-blue-700" /> 2. What is Affected?
          </span>
          <p className="text-slate-800 font-medium leading-relaxed">
            {disruptionState.affected_vehicles ?? 120} vehicles and 2 production orders (<span className="text-blue-700 font-mono font-bold">PROD-882</span> &amp; <span className="text-blue-700 font-mono font-bold">PROD-914</span>).
          </p>
        </div>

        {/* 3. HOW SERIOUS */}
        <div className="bg-blue-50/60 p-3.5 rounded-xl border border-blue-200 space-y-1">
          <span className="text-blue-700 font-semibold uppercase text-[10px] tracking-wider flex items-center gap-1.5 font-mono">
            <ShieldAlert className="w-3.5 h-3.5 text-blue-700" /> 3. How Serious?
          </span>
          <p className="text-slate-800 font-medium leading-relaxed">
            <strong className="text-blue-700">CRITICAL RISK:</strong> Usable stock ({disruptionState.usable_stock ?? 0} units) supports 0 days. Line stoppage in 12 simulated hours.
          </p>
        </div>

        {/* 4. WHAT IS THE AI DOING */}
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
          <span className="text-slate-500 font-semibold uppercase text-[10px] tracking-wider flex items-center gap-1.5 font-mono">
            <Cpu className="w-3.5 h-3.5 text-blue-700" /> 4. What is AI Doing?
          </span>
          <p className="text-slate-800 font-medium leading-relaxed">
            Cross-verifying tracking logs, requesting alternate RFQs, and running 6 Digital Twin recovery simulations.
          </p>
        </div>

        {/* 5. WHAT DID THE AI CHOOSE */}
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
          <span className="text-slate-500 font-semibold uppercase text-[10px] tracking-wider flex items-center gap-1.5 font-mono">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-700" /> 5. What Did AI Choose?
          </span>
          <p className="text-blue-700 font-bold leading-relaxed">
            {plan?.strategy_name || '⭐ Multi-Source Split Order (SUP-42 + SUP-37)'}
          </p>
        </div>

        {/* 6. WHY */}
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
          <span className="text-slate-500 font-semibold uppercase text-[10px] tracking-wider flex items-center gap-1.5 font-mono">
            <HelpCircle className="w-3.5 h-3.5 text-blue-700" /> 6. Why?
          </span>
          <p className="text-slate-800 font-medium leading-relaxed">
            Completely prevents line stoppage, satisfies ISO/Automotive certs, and avoids ₹{(plan?.expected_avoided_loss ?? 732000) / 100000} Lakh in expected business damage.
          </p>
        </div>

      </div>

      {/* 7. WHAT HAPPENS NEXT BAR */}
      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex items-center justify-between text-xs font-mono">
        <div className="flex items-center space-x-2">
          <ArrowRight className="w-4 h-4 text-blue-700" />
          <span className="text-slate-700 font-sans">
            <strong>7. WHAT HAPPENS NEXT?</strong>{' '}
            {isApprovalPending
              ? 'Awaiting Operations Manager approval for ₹168,000 emergency purchase brief.'
              : 'Rechecking Supplier SUP-42 expedited delivery confirmation in 6 simulated hours.'}
          </span>
        </div>
      </div>
    </div>
  );
};
