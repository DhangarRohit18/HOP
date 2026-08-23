import React from 'react';
import { BlastRadius, SupplierConcentration } from '../types/supplyChain';
import { AlertCircle, ShieldAlert, Target, DollarSign, Layers, Users, Zap } from 'lucide-react';

interface BlastRadiusPanelProps {
  blastRadius?: BlastRadius;
  concentration?: SupplierConcentration;
}

export const BlastRadiusPanel: React.FC<BlastRadiusPanelProps> = ({ blastRadius, concentration }) => {
  if (!blastRadius) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex items-center justify-center text-slate-500 text-xs font-mono">
        Select a component to inspect blast radius &amp; dependency risks.
      </div>
    );
  }

  const criticality = blastRadius.criticality || 'IMPORTANT';
  const isCritical = criticality === 'CRITICAL';
  const isImportant = criticality === 'IMPORTANT';

  const affectedLines = blastRadius.affected_lines ?? 3;
  const affectedVehicles = blastRadius.affected_vehicles ?? blastRadius.total_vehicles_at_risk ?? 120;
  const customerCommitments = blastRadius.affected_customer_commitments ?? 4;
  const financialImpact = blastRadius.estimated_financial_impact ?? blastRadius.financial_exposure_rupees ?? 900000;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4 font-sans">
      {/* Title */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center space-x-2">
          <Target className="w-5 h-5 text-blue-700" />
          <h3 className="text-base font-bold text-slate-900 font-heading">
            Supply-Chain Blast Radius &amp; Concentration Risk
          </h3>
        </div>

        {/* Criticality Badge */}
        <span
          className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider ${
            isCritical
              ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-sm'
              : isImportant
              ? 'bg-slate-100 text-slate-700 border border-slate-200'
              : 'bg-slate-100 text-slate-500'
          }`}
        >
          CRITICALITY: {criticality}
        </span>
      </div>

      {/* Blast Radius Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
          <span className="text-[10px] text-slate-500 block font-sans">AFFECTED LINES</span>
          <span className="text-lg font-bold text-slate-900 flex items-center gap-1.5 mt-0.5 font-heading">
            <Layers className="w-4 h-4 text-blue-700" />
            {affectedLines} Lines
          </span>
        </div>

        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
          <span className="text-[10px] text-slate-500 block font-sans">AFFECTED VEHICLES</span>
          <span className="text-lg font-bold text-slate-900 flex items-center gap-1.5 mt-0.5 font-heading">
            <Zap className="w-4 h-4 text-blue-700" />
            {affectedVehicles} Vehicles
          </span>
        </div>

        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
          <span className="text-[10px] text-slate-500 block font-sans">CUSTOMER COMMITMENTS</span>
          <span className="text-lg font-bold text-slate-900 flex items-center gap-1.5 mt-0.5 font-heading">
            <Users className="w-4 h-4 text-blue-700" />
            {customerCommitments} At Risk
          </span>
        </div>

        <div className="bg-blue-50/70 p-3.5 rounded-xl border border-blue-200">
          <span className="text-[10px] text-blue-700 block font-sans font-bold">ESTIMATED EXPOSURE</span>
          <span className="text-lg font-bold text-blue-700 flex items-center gap-1.5 mt-0.5 font-heading">
            <DollarSign className="w-4 h-4 text-blue-700" />
            ₹{(financialImpact / 100000).toFixed(2)} Lakh
          </span>
        </div>
      </div>

      {/* Supplier Concentration Warning Bar */}
      {concentration && (
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center space-x-3">
            <ShieldAlert className="w-5 h-5 text-blue-700 shrink-0" />
            <div>
              <span className="text-slate-900 font-bold block font-sans">
                SUPPLIER DEPENDENCY RISK: {concentration.primary_supplier_name || 'Apex Photonics Ltd'} ({concentration.share_percentage || 85}% Concentration)
              </span>
              <span className="text-slate-500 text-[11px] font-sans">
                {concentration.recommendation || '85% Single Point of Failure Concentration detected.'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
