import React from 'react';
import { ApprovalBrief } from '../types/supplyChain';
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
  const impactSummary = brief.production_impact_summary || '120 CyberSUV units at risk of line stoppage';
  const reasoning = brief.reason_for_recommendation || brief.summary;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 font-sans animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-xl w-full p-6 shadow-2xl space-y-4">
        {/* Header Alert */}
        <div className="flex items-center space-x-3 border-b border-slate-100 pb-3">
          <div className="p-2.5 bg-blue-50 text-blue-700 rounded-2xl border border-blue-200">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 font-heading">
              Human-in-the-Loop Approval Required
            </h3>
            <p className="text-xs text-slate-500 font-mono">
              Action Firewall: Autonomous spending threshold exceeded
            </p>
          </div>
        </div>

        {/* Operational Context Card */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 text-xs font-mono">
          <div className="flex justify-between items-center text-slate-700">
            <span className="text-slate-500">AFFECTED PART:</span>
            <strong className="text-blue-700">{brief.part_id}</strong>
          </div>
          <div className="flex justify-between items-center text-slate-700">
            <span className="text-slate-500">PRODUCTION IMPACT:</span>
            <strong className="text-slate-900">{impactSummary}</strong>
          </div>
          <div className="flex justify-between items-center text-slate-700">
            <span className="text-slate-500">RECOMMENDED ACTION:</span>
            <strong className="text-blue-700">{strategyName}</strong>
          </div>
        </div>

        {/* Cost vs Threshold Breakdown Grid */}
        <div className="grid grid-cols-3 gap-3 text-xs">
          <div className="bg-white p-3 rounded-2xl border border-slate-200 text-center shadow-sm">
            <span className="text-[10px] text-slate-500 block font-mono">EMERGENCY COST</span>
            <span className="text-base font-bold text-slate-900 font-mono">₹{totalCost.toLocaleString()}</span>
          </div>

          <div className="bg-white p-3 rounded-2xl border border-slate-200 text-center shadow-sm">
            <span className="text-[10px] text-slate-500 block font-mono">AUTONOMOUS LIMIT</span>
            <span className="text-base font-bold text-slate-700 font-mono">₹{autoThreshold.toLocaleString()}</span>
          </div>

          <div className="bg-blue-50 p-3 rounded-2xl border border-blue-200 text-center shadow-sm">
            <span className="text-[10px] text-blue-700 block font-mono font-bold">EXCEEDED BY</span>
            <span className="text-base font-bold text-blue-700 font-mono">+₹{costExceeded.toLocaleString()}</span>
          </div>
        </div>

        {/* Avoided Loss ROI Highlight */}
        <div className="bg-blue-50/70 border border-blue-200 p-3.5 rounded-2xl flex items-center justify-between text-xs shadow-sm">
          <div className="flex items-center space-x-2.5">
            <TrendingUp className="w-5 h-5 text-blue-700" />
            <div>
              <span className="font-bold text-slate-900 block">EXPECTED AVOIDED BUSINESS LOSS</span>
              <span className="text-slate-600">Prevents CyberSUV line stoppage &amp; ₹9.0 Lakh disruption cost</span>
            </div>
          </div>
          <span className="text-base font-extrabold text-blue-700 font-mono">
            +₹{(avoidedLoss / 100000).toFixed(2)} Lakh
          </span>
        </div>

        {/* Reason for Recommendation */}
        <div className="text-xs text-slate-700 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
          <span className="text-slate-500 font-semibold font-mono block mb-1">AGENT REASONING:</span>
          <p className="leading-relaxed">{reasoning}</p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-3 pt-2">
          <button
            onClick={onApprove}
            className="flex-1 py-3 px-4 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-sm flex items-center justify-center space-x-2 transition-all shadow-sm"
          >
            <CheckCircle className="w-4 h-4" />
            <span>APPROVE &amp; DISPATCH PO</span>
          </button>
          <button
            onClick={onReject}
            className="py-3 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-sm flex items-center space-x-1.5 transition-all"
          >
            <XCircle className="w-4 h-4 text-slate-400" />
            <span>REJECT</span>
          </button>
        </div>
      </div>
    </div>
  );
};
