import React from 'react';
import { RecoveryOption } from '../../types/supplyChain';
import { Brain, CheckCircle, ShieldAlert, Award, Lock, Sparkles } from 'lucide-react';

interface RecoveryTwinMatrixProps {
  options: RecoveryOption[];
  selectedOptionId?: string;
  onSelectOption?: (option: RecoveryOption) => void;
}

export const RecoveryTwinMatrix: React.FC<RecoveryTwinMatrixProps> = ({
  options,
  selectedOptionId,
  onSelectOption
}) => {
  return (
    <div className="bg-nexus-white rounded-[8px] border border-nexus-blue-20 p-5 shadow-sm space-y-4 font-sans">
      {/* Title */}
      <div className="flex items-center justify-between border-b border-nexus-blue-12 pb-3">
        <div className="flex items-center space-x-2">
          <Brain className="w-5 h-5 text-nexus-blue" />
          <h3 className="text-base font-bold text-nexus-blue font-sans tracking-tight">
            Digital Twin Recovery Simulation Matrix
          </h3>
        </div>
        <span className="text-xs text-nexus-blue-60">
          Simulated Strategies: <strong className="text-nexus-blue font-mono">{options.length} Options Evaluated</strong>
        </span>
      </div>

      {/* Comparison Grid Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-nexus-blue-20 bg-nexus-white text-nexus-blue font-mono text-[11px]">
              <th className="py-2.5 px-3">Strategy Name</th>
              <th className="py-2.5 px-3">Lead Time</th>
              <th className="py-2.5 px-3">Line Stoppage</th>
              <th className="py-2.5 px-3">Quality &amp; Certs</th>
              <th className="py-2.5 px-3">Procurement + Expedite</th>
              <th className="py-2.5 px-3">Avoided Business Loss</th>
              <th className="py-2.5 px-3 text-center">Approval Req</th>
              <th className="py-2.5 px-3 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-mono">
            {options.map((opt) => {
              const isSelected = selectedOptionId === opt.id || opt.id === 'OPT-SPLIT-ORDER';
              const isRejectedQuality = opt.quality_score < 0.85;

              return (
                <tr
                  key={opt.id}
                  onClick={() => onSelectOption && onSelectOption(opt)}
                  className={`transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-nexus-blue-04/70 border-l-4 border-nexus-blue text-nexus-blue'
                      : isRejectedQuality
                      ? 'bg-nexus-white text-nexus-blue-60 opacity-70'
                      : 'hover:bg-nexus-white text-nexus-blue'
                  }`}
                >
                  {/* Strategy Name & Details */}
                  <td className="py-3 px-3">
                    <div className="font-semibold flex items-center gap-1.5 text-nexus-blue">
                      {isSelected && <Sparkles className="w-3.5 h-3.5 text-nexus-blue shrink-0" />}
                      <span>{opt.strategy_name}</span>
                    </div>
                    <p className="text-[11px] text-nexus-blue-60 font-sans mt-0.5 max-w-sm truncate">
                      {opt.description}
                    </p>
                  </td>

                  {/* Lead Time */}
                  <td className="py-3 px-3">
                    <span className="font-bold text-nexus-blue">{opt.delivery_lead_days} Days</span>
                  </td>

                  {/* Line Stoppage Days */}
                  <td className="py-3 px-3">
                    {opt.production_stoppage_days === 0 ? (
                      <span className="px-2 py-0.5 rounded bg-nexus-blue-04 text-nexus-blue border border-nexus-blue-20 font-bold">
                        0 Days (Safe)
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-nexus-blue-12 text-nexus-blue border border-nexus-blue-20 font-bold">
                        {opt.production_stoppage_days} Days Stop
                      </span>
                    )}
                  </td>

                  {/* Quality & Reliability Score */}
                  <td className="py-3 px-3">
                    {isRejectedQuality ? (
                      <span className="text-nexus-blue-60 flex items-center gap-1 font-bold">
                        <ShieldAlert className="w-3.5 h-3.5 text-nexus-blue-60" /> {(opt.quality_score * 100).toFixed(0)}% (FAILS)
                      </span>
                    ) : (
                      <span className="text-nexus-blue flex items-center gap-1 font-bold">
                        <Award className="w-3.5 h-3.5" /> {(opt.quality_score * 100).toFixed(0)}% Score
                      </span>
                    )}
                  </td>

                  {/* Total Cost Breakdown */}
                  <td className="py-3 px-3 font-bold text-nexus-blue">
                    ₹{opt.total_cost.toLocaleString()}
                  </td>

                  {/* Avoided Loss ROI */}
                  <td className="py-3 px-3 font-bold text-nexus-blue">
                    +₹{(opt.expected_avoided_loss / 100000).toFixed(2)} Lakh
                  </td>

                  {/* Approval Required */}
                  <td className="py-3 px-3 text-center">
                    {opt.approval_required ? (
                      <span className="px-2 py-0.5 rounded bg-nexus-blue-04 text-nexus-blue border border-nexus-blue-20 font-bold text-[10px]">
                        REQUIRED
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-nexus-blue-12 text-nexus-blue text-[10px]">
                        AUTONOMOUS
                      </span>
                    )}
                  </td>

                  {/* Status Badge */}
                  <td className="py-3 px-3 text-right font-bold">
                    {isSelected ? (
                      <span className="px-2.5 py-1 rounded-[8px] bg-nexus-blue text-nexus-white font-mono text-[10px]">
                        RECOMMENDED
                      </span>
                    ) : isRejectedQuality ? (
                      <span className="text-nexus-blue-60 text-[10px]">REJECTED</span>
                    ) : (
                      <span className="text-nexus-blue-60 text-[10px]">ALTERNATIVE</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Decision Summary Banner */}
      <div className="bg-nexus-white p-3 rounded-[8px] border border-nexus-blue-20 flex items-center justify-between text-xs font-mono">
        <span className="text-nexus-blue font-sans">
          Optimal Trade-Off Strategy: <strong className="text-nexus-blue">Multi-Source Split Order</strong> delivers zero downtime with full automotive certification compliance.
        </span>
        <button
          onClick={() => onSelectOption && onSelectOption(options[0])}
          className="px-3 py-1 bg-nexus-blue hover:bg-nexus-blue-dark text-nexus-white font-bold rounded-[8px] text-xs transition-all shadow-sm flex items-center gap-1 font-mono"
        >
          <span>SELECT STRATEGY</span>
        </button>
      </div>
    </div>
  );
};
