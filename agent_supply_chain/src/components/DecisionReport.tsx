import React from 'react';
import { DisruptionState, Part, RecoveryOption } from '../types/supplyChain';
import { FileCode, Copy, Check } from 'lucide-react';

interface DecisionReportProps {
  disruptionState: DisruptionState;
  part?: Part;
}

export const DecisionReport: React.FC<DecisionReportProps> = ({ disruptionState, part }) => {
  const [copied, setCopied] = React.useState(false);
  const plan = disruptionState.selected_plan;

  const reportText = `DISRUPTION
${disruptionState.description || 'PO-7712 for COMP-104 delayed by 5-7 days due to supplier optics shortage.'}

AFFECTED PART
${part?.display_name || 'Adaptive LED Matrix Headlight (Left)'} [${disruptionState.part_id || 'LEFT_HEADLIGHT'}]

BUSINESS IMPACT
120 CyberSUV vehicles threatened. Line stoppage in 12 hours. Potential ₹9.0 Lakh disruption loss.

CURRENT STATUS
${part?.status || 'BLUE'} - Recovery Plan Selected & Executing

OPTIONS CONSIDERED
1. Wait for Original Supplier (₹0 cost, 3.5 days stoppage, ₹9.0 Lakh loss)
2. Expedite Original Supplier SUP-21 (₹25,000 cost, unverified tracking risk)
3. Western Components SUP-42 Full Order (₹79,200 cost, 4-day lead)
4. Multi-Source Split Order SUP-42 + SUP-37 (₹168,000 cost, 0 days stoppage) [SELECTED]
5. Production Rescheduling (Reallocate stock to high-priority CyberSUV)
6. REJECTED: Budget Direct SUP-18 (Quality score 0.68 - Failed certification)

SELECTED PLAN
${plan?.strategy_name || 'Multi-Source Split Order (SUP-42: 600 units + SUP-37: 300 units)'}

WHY
Minimizes total business impact to ₹0 line stoppage, satisfies IATF-16949 automotive quality requirements, and protects high-priority CyberSUV revenue.

COST
₹${(plan?.total_cost ?? 168000).toLocaleString()} (Includes ₹18,000 expedite fee)

EXPECTED AVOIDED LOSS
₹${((plan?.expected_avoided_loss ?? 732000) / 100000).toFixed(2)} Lakh (Avoids ₹9.0 Lakh stoppage damage)

APPROVAL
${plan?.approval_required ? 'REQUIRED (Exceeds ₹150,000 autonomous threshold by ₹18,000)' : 'NOT REQUIRED (Within Limit)'}

3D STATUS
${part?.status || 'BLUE'} (Visual Twin Highlighted)

NEXT VERIFICATION
Recheck SUP-42 priority air tracking confirmation in 6 simulated hours.

REMAINING RISK
${plan?.remaining_risk || 'Low: Expedited shipment confirmation pending carrier scan.'}

AUDIT TRAIL
19:41:02  ⚠ Disruption detected on PO-7712
19:41:03  🔍 Checking inventory: Usable stock = 0
19:41:05  📡 Tracking verification: Supplier claim contradicted (Label created only)
19:41:09  🔎 Searching alternate certified suppliers
19:41:11  🧠 Simulating 6 recovery strategies in Digital Twin
19:41:13  ⭐ Split-order strategy selected (SUP-42 + SUP-37)
19:41:14  🔐 Approval check triggered (Cost ₹168,000 > ₹150,000 threshold)
19:41:15  👤 Human approval brief generated & ERP updated`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(reportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-xl space-y-3 font-mono">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2 font-heading">
          <FileCode className="w-4 h-4 text-emerald-400" />
          Standard Final Disruption Audit & Decision Format (Section 20)
        </h3>
        <button
          onClick={copyToClipboard}
          className="flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 transition-all border border-slate-700"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied' : 'Copy Format'}</span>
        </button>
      </div>

      <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs text-slate-300 overflow-x-auto leading-relaxed whitespace-pre-wrap select-all max-h-72 overflow-y-auto">
        {reportText}
      </pre>
    </div>
  );
};
