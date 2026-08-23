import React from 'react';
import { RecoveryOption } from '../types/supplyChain';
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
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4 font-sans">
      {/* Title */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center space-x-2">
          <Brain className="w-5 h-5 text-blue-700" />
          <h3 className="text-base font-bold text-slate-900 font-heading">
            Digital Twin Recovery Simulation Matrix
          </h3>
        </div>
        <span className="text-xs text-slate-500">
          Simulated Strategies: <strong className="text-blue-700 font-mono">{options.length} Options Evaluated</strong>
        </span>
      </div>

      {/* Comparison Grid Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-mono text-[11px]">
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
                      ? 'bg-blue-50/70 border-l-4 border-blue-700 text-slate-900'
                      : isRejectedQuality
                      ? 'bg-slate-50 text-slate-400 opacity-70'
                      : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  {/* Strategy Name & Details */}
                  <td className="py-3 px-3">
                    <div className="font-semibold flex items-center gap-1.5 text-slate-900">
                      {isSelected && <Sparkles className="w-3.5 h-3.5 text-blue-700 shrink-0" />}
                      <span>{opt.strategy_name}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-sans mt-0.5 max-w-sm truncate">
                      {opt.description}
                    </p>
                  </td>

                  {/* Lead Time */}
                  <td className="py-3 px-3">
                    <span className="font-bold text-slate-900">{opt.delivery_lead_days} Days</span>
                  </td>

                  {/* Line Stoppage Days */}
                  <td className="py-3 px-3">
                    {opt.production_stoppage_days === 0 ? (
                      <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-bold">
                        0 Days (Safe)
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 font-bold">
                        {opt.production_stoppage_days} Days Stop
                      </span>
                    )}
                  </td>

                  {/* Quality & Reliability Score */}
                  <td className="py-3 px-3">
                    {isRejectedQuality ? (
                      <span className="text-slate-500 flex items-center gap-1 font-bold">
                        <ShieldAlert className="w-3.5 h-3.5 text-slate-400" /> {(opt.quality_score * 100).toFixed(0)}% (FAILS)
                      </span>
                    ) : (
                      <span className="text-blue-700 flex items-center gap-1 font-bold">
                        <Award className="w-3.5 h-3.5" /> {(opt.quality_score * 100).toFixed(0)}% Score
                      </span>
                    )}
                  </td>

                  {/* Total Cost Breakdown */}
                  <td className="py-3 px-3 font-bold text-slate-900">
                    ₹{opt.total_cost.toLocaleString()}
                  </td>

                  {/* Avoided Loss ROI */}
                  <td className="py-3 px-3 font-bold text-blue-700">
                    +₹{(opt.expected_avoided_loss / 100000).toFixed(2)} Lakh
                  </td>

                  {/* Approval Required */}
                  <td className="py-3 px-3 text-center">
                    {opt.approval_required ? (
                      <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-bold text-[10px]">
                        REQUIRED
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px]">
                        AUTONOMOUS
                      </span>
                    )}
                  </td>

                  {/* Status Badge */}
                  <td className="py-3 px-3 text-right font-bold">
                    {isSelected ? (
                      <span className="px-2.5 py-1 rounded-lg bg-blue-700 text-white font-mono text-[10px]">
                        RECOMMENDED
                      </span>
                    ) : isRejectedQuality ? (
                      <span className="text-slate-400 text-[10px]">REJECTED</span>
                    ) : (
                      <span className="text-slate-500 text-[10px]">ALTERNATIVE</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Decision Summary Banner */}
      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between text-xs font-mono">
        <span className="text-slate-600 font-sans">
          Optimal Trade-Off Strategy: <strong className="text-blue-700">Multi-Source Split Order</strong> delivers zero downtime with full automotive certification compliance.
        </span>
        <button
          onClick={() => onSelectOption && onSelectOption(options[0])}
          className="px-3 py-1 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-lg text-xs transition-all shadow-sm flex items-center gap-1 font-mono"
        >
          <span>SELECT STRATEGY</span>
        </button>
      </div>
    </div>
  );
};
