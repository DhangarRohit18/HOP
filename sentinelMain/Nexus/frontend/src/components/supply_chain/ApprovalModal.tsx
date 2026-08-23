import React from 'react';
import { ApprovalBrief } from '../../types/supplyChain';
import { ShieldAlert, CheckCircle, XCircle, DollarSign, TrendingUp, AlertTriangle, ArrowRight } from 'lucide-react';

interface ApprovalModalProps {
  brief: ApprovalBrief | null;
  onApprove: () => void;
  onReject: () => void;
}

export const ApprovalModal: React.FC<ApprovalModalProps> = ({ brief, onApprove, onReject }) => {
  if (!brief) return null;

  const plan = brief.recommended_option;
  const strategyName = plan?.strategy_name || brief.selected_strategy || 'Multi-Source Split PO';
  const totalCost = brief.total_cost ?? brief.procurement_cost ?? 168000;
  const autoThreshold = brief.autonomous_threshold ?? 150000;
  const costExceeded = brief.cost_exceeded_by ?? Math.max(0, totalCost - autoThreshold);
  const avoidedLoss = brief.expected_avoided_loss ?? brief.line_stop_loss_avoided ?? 732000;
  const impactSummary = brief.production_impact_summary || '120 Swift Dzire units at risk of line stoppage';
  const reasoning = brief.reason_for_recommendation || brief.summary;

  return (
    <div className="fixed inset-0 z-50 bg-blue-950/40 backdrop-blur-sm flex items-center justify-center p-4 font-sans animate-fade-in">
      <div className="bg-nexus-white border border-nexus-blue-20 rounded-[8px] max-w-xl w-full p-6 shadow-2xl space-y-4">
        {/* Header Alert */}
        <div className="flex items-center space-x-3 border-b border-nexus-blue-12 pb-3">
          <div className="p-2.5 bg-nexus-blue-04 text-nexus-blue rounded-[8px] border border-nexus-blue-20">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-nexus-blue font-sans tracking-tight">
              Human-in-the-Loop Approval Required
            </h3>
            <p className="text-xs text-nexus-blue-60 font-mono">
              Action Firewall: Autonomous spending threshold exceeded
            </p>
          </div>
        </div>

        {/* Operational Context Card */}
        <div className="bg-nexus-white p-4 rounded-[8px] border border-nexus-blue-20 space-y-2 text-xs font-mono">
          <div className="flex justify-between items-center text-nexus-blue">
            <span className="text-nexus-blue-60">AFFECTED PART:</span>
            <strong className="text-nexus-blue">{brief.part_id}</strong>
          </div>
          <div className="flex justify-between items-center text-nexus-blue">
            <span className="text-nexus-blue-60">PRODUCTION IMPACT:</span>
            <strong className="text-nexus-blue">{impactSummary}</strong>
          </div>
          <div className="flex justify-between items-center text-nexus-blue">
            <span className="text-nexus-blue-60">RECOMMENDED ACTION:</span>
            <strong className="text-nexus-blue">{strategyName}</strong>
          </div>
        </div>

        {/* Cost vs Threshold Breakdown Grid */}
        <div className="grid grid-cols-3 gap-3 text-xs">
          <div className="bg-nexus-white p-3 rounded-[8px] border border-nexus-blue-20 text-center shadow-sm">
            <span className="text-[10px] text-nexus-blue-60 block font-mono">EMERGENCY COST</span>
            <span className="text-base font-bold text-nexus-blue font-mono">₹{totalCost.toLocaleString()}</span>
          </div>

          <div className="bg-nexus-white p-3 rounded-[8px] border border-nexus-blue-20 text-center shadow-sm">
            <span className="text-[10px] text-nexus-blue-60 block font-mono">AUTONOMOUS LIMIT</span>
            <span className="text-base font-bold text-nexus-blue font-mono">₹{autoThreshold.toLocaleString()}</span>
          </div>

          <div className="bg-nexus-blue-04 p-3 rounded-[8px] border border-nexus-blue-20 text-center shadow-sm">
            <span className="text-[10px] text-nexus-blue block font-mono font-bold">EXCEEDED BY</span>
            <span className="text-base font-bold text-nexus-blue font-mono">+₹{costExceeded.toLocaleString()}</span>
          </div>
        </div>

        {/* Avoided Loss ROI Highlight */}
        <div className="bg-nexus-blue-04/70 border border-nexus-blue-20 p-3.5 rounded-[8px] flex items-center justify-between text-xs shadow-sm">
          <div className="flex items-center space-x-2.5">
            <TrendingUp className="w-5 h-5 text-nexus-blue" />
            <div>
              <span className="font-bold text-nexus-blue block">EXPECTED AVOIDED BUSINESS LOSS</span>
              <span className="text-blue-950">Prevents Swift Dzire line stoppage &amp; ₹9.0 Lakh disruption cost</span>
            </div>
          </div>
          <span className="text-base font-extrabold text-nexus-blue font-mono">
            +₹{(avoidedLoss / 100000).toFixed(2)} Lakh
          </span>
        </div>

        {/* Reason for Recommendation */}
        <div className="text-xs text-nexus-blue bg-nexus-white p-3.5 rounded-[8px] border border-nexus-blue-20">
          <span className="text-nexus-blue-60 font-semibold font-mono block mb-1">AGENT REASONING:</span>
          <p className="leading-relaxed">{reasoning}</p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-3 pt-2">
          <button
            onClick={onApprove}
            className="flex-1 py-3 px-4 rounded-[8px] bg-blue-950 hover:bg-blue-950 text-nexus-white font-bold text-sm flex items-center justify-center space-x-2 transition-all shadow-sm"
          >
            <CheckCircle className="w-4 h-4" />
            <span>APPROVE &amp; DISPATCH PO</span>
          </button>
          <button
            onClick={onReject}
            className="py-3 px-4 rounded-[8px] bg-nexus-white hover:bg-slate-100 text-nexus-blue border border-nexus-blue-20 font-bold text-sm flex items-center space-x-1.5 transition-all"
          >
            <XCircle className="w-4 h-4 text-nexus-blue-60" />
            <span>REJECT</span>
          </button>
        </div>
      </div>
    </div>
  );
};
