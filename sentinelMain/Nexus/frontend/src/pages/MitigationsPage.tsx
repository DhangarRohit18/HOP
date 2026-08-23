import React, { useState, useEffect, useCallback } from 'react';
import {
  MitigationSimulationRequest,
  MitigationSimulationResponse,
  MitigationOutcome,
  DisruptionSeverity,
  PrimitiveType,
} from '../types/intelligence';
import { postMitigationSimulation } from '../services/api';
import { PageHeader } from '../components/ui/PageHeader';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Card } from '../components/ui/Card';

export interface MitigationsPageProps {
  onNavigate?: (path: string) => void;
}

const PRESETS = [
  {
    label: 'SUP-001 Outage (Golden Path)',
    target_id: 'ENTITY:de52b8c0-0c2e-57aa-8595-0d99964e8519',
    event_type: 'SUPPLIER_OUTAGE',
    severity: 'CRITICAL' as DisruptionSeverity,
    duration_hours: 200,
  },
  {
    label: 'SHP-2026-001 Shipment Delay',
    target_id: 'ENTITY:4ad15350-a041-5989-9820-c6aadf4b25e0',
    event_type: 'CARRIER_DELAY',
    severity: 'SEVERE' as DisruptionSeverity,
    duration_hours: 96,
  },
  {
    label: 'CMP-001 Material Shortage',
    target_id: 'RESOURCE:92f1b4cc-6721-5c52-9a05-833f45eeaccc',
    event_type: 'MATERIAL_SHORTAGE',
    severity: 'MODERATE' as DisruptionSeverity,
    duration_hours: 120,
  },
];

export const MitigationsPage: React.FC<MitigationsPageProps> = ({ onNavigate }) => {
  // Scenario Form State (Initial default preset: Golden Path SUP-001)
  const [disruptionId, setDisruptionId] = useState('DIS-HYP-001');
  const [targetType, setTargetType] = useState<PrimitiveType>('ENTITY');
  const [targetId, setTargetId] = useState('ENTITY:de52b8c0-0c2e-57aa-8595-0d99964e8519');
  const [eventType, setEventType] = useState('SUPPLIER_OUTAGE');
  const [severity, setSeverity] = useState<DisruptionSeverity>('CRITICAL');
  const [effectiveAt, setEffectiveAt] = useState('2026-08-01T12:00:00Z');
  const [durationHours, setDurationHours] = useState(200);

  // Result & Execution UX States
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [simulationResult, setSimulationResult] = useState<MitigationSimulationResponse | null>(null);
  const [lastAnalyzed, setLastAnalyzed] = useState<Date | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<MitigationOutcome | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Step 4: Side-by-side Candidate Comparison Selection (Max 3)
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);

  // Update compare selection when simulation result arrives
  useEffect(() => {
    if (simulationResult && simulationResult.candidate_options.length > 0) {
      const initialSelection = simulationResult.candidate_options
        .slice(0, 3)
        .map((c) => c.action_id);
      setSelectedForCompare(initialSelection);
    }
  }, [simulationResult]);

  // Keyboard navigation: ESC closes drawer
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isDrawerOpen) {
        setIsDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDrawerOpen]);

  // Explicit user-triggered simulation execution
  const runSimulation = useCallback(async () => {
    if (durationHours < 0) {
      setError('Duration hours cannot be negative.');
      return;
    }
    setLoading(true);
    setError(null);

    const payload: MitigationSimulationRequest = {
      disruption_id: disruptionId.trim() || 'DIS-HYP-001',
      target_type: targetType,
      target_id: targetId.trim(),
      event_type: eventType.trim(),
      severity,
      effective_at: effectiveAt,
      duration_hours: Number(durationHours),
    };

    try {
      const res = await postMitigationSimulation(payload);
      setSimulationResult(res);
      setLastAnalyzed(new Date());
      setLoading(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to evaluate mitigation strategies.';
      setError(msg);
      setLoading(false);
    }
  }, [disruptionId, targetType, targetId, eventType, severity, effectiveAt, durationHours]);

  const handleApplyPreset = (preset: (typeof PRESETS)[0]) => {
    setTargetId(preset.target_id);
    setEventType(preset.event_type);
    setSeverity(preset.severity);
    setDurationHours(preset.duration_hours);
    if (preset.target_id.startsWith('RESOURCE')) {
      setTargetType('RESOURCE');
    } else {
      setTargetType('ENTITY');
    }
  };

  const toggleCompareCandidate = (actionId: string) => {
    setSelectedForCompare((prev) => {
      if (prev.includes(actionId)) {
        return prev.filter((id) => id !== actionId);
      } else {
        if (prev.length >= 3) return prev;
        return [...prev, actionId];
      }
    });
  };

  const openCandidateDrawer = (candidate: MitigationOutcome) => {
    setSelectedCandidate(candidate);
    setIsDrawerOpen(true);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
  };

  const topRec = simulationResult?.top_recommendation;
  const topOption = simulationResult?.candidate_options.find(
    (c) => c.action_id === topRec?.recommended_action_id
  ) || simulationResult?.candidate_options[0];

  const compareCandidates = (simulationResult?.candidate_options || []).filter((c) =>
    selectedForCompare.includes(c.action_id)
  );

  return (
    <div className="space-y-6 font-mono-tech">
      {/* SECTION 1 — HEADER & PRESET TOOLBAR */}
      <PageHeader
        title="MITIGATION DECISION ENGINE"
        subtitle="Evaluate ranked operational recovery strategies driven by deterministic graph optimization."
        badge={<StatusBadge status="healthy" label="DECISION SUPPORT ONLINE" />}
        actions={
          <div className="flex items-center gap-3 font-mono-tech">
            {lastAnalyzed && (
              <span className="text-xs text-[#6F7B86] hidden sm:inline-block">
                LAST EVALUATION: {lastAnalyzed.toLocaleTimeString()}
              </span>
            )}
            {onNavigate && (
              <button
                onClick={() => onNavigate('/graph-viewer')}
                className="px-3 py-1.5 bg-[#131920] hover:bg-[#171E26] border border-[#27313A] text-[#38BDF8] text-xs font-bold rounded transition-colors"
              >
                TRACE IN GRAPH ➔
              </button>
            )}
            <button
              onClick={runSimulation}
              disabled={loading}
              className="px-3.5 py-1.5 bg-[#834DFB] hover:bg-[#7040E5] text-[#F5F3FF] text-xs font-bold rounded transition-colors duration-150 flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? 'EVALUATING...' : '▶ RUN MITIGATION SIMULATION'}
            </button>
          </div>
        }
      />

      {/* READ-ONLY SAFETY NOTICE */}
      <Card variant="solid" signalBorder="emerald" className="bg-[#FFFFFF] border border-[#DDD5EA]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-xs font-bold text-[#834DFB] tracking-wider">SAFETY BOUNDARY //</span>
            <span className="text-xs text-[#1B082C] font-bold uppercase ml-2">Read-Only Analytical Intelligence Layer</span>
            <p className="text-[11px] text-[#594B69] mt-0.5">
              NEXUS provides decision analysis only — 0 operational execution, 0 automated ERP mutations.
            </p>
          </div>
          <span className="px-2.5 py-0.5 text-[10px] font-mono-tech bg-[#EEE8FF] border border-[#C9BDD9] text-[#834DFB] rounded">
            SIMULATION ONLY
          </span>
        </div>
      </Card>

      {/* FORM INPUT CONSOLE */}
      <Card variant="solid" className="bg-[#FFFFFF] border border-[#DDD5EA] space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[#DDD5EA]">
          <span className="text-xs font-bold text-[#1B082C] uppercase tracking-wider">Scenario Preset Controls</span>
          <div className="flex flex-wrap items-center gap-2">
            {PRESETS.map((p, idx) => (
              <button
                key={idx}
                onClick={() => handleApplyPreset(p)}
                className="px-2.5 py-1 bg-[#FBFAFF] hover:bg-[#EEE8FF] text-[#834DFB] border border-[#DDD5EA] rounded text-xs font-bold"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div>
            <label className="block text-[10px] font-bold text-[#6F7B86] uppercase mb-1">Disruption ID</label>
            <input
              type="text"
              value={disruptionId}
              onChange={(e) => setDisruptionId(e.target.value)}
              className="w-full bg-[#131920] border border-[#27313A] rounded px-3 py-1.5 text-xs text-[#E8EDF2] focus:outline-none focus:border-[#D6FF4B]"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-[#6F7B86] uppercase mb-1">Target ID</label>
            <input
              type="text"
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              className="w-full bg-[#131920] border border-[#27313A] rounded px-3 py-1.5 text-xs text-[#38BDF8] focus:outline-none focus:border-[#D6FF4B]"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-[#6F7B86] uppercase mb-1">Event Type</label>
            <input
              type="text"
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              className="w-full bg-[#131920] border border-[#27313A] rounded px-3 py-1.5 text-xs text-[#E8EDF2] focus:outline-none focus:border-[#D6FF4B]"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-[#6F7B86] uppercase mb-1">Severity</label>
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value as DisruptionSeverity)}
              className="w-full bg-[#131920] border border-[#27313A] rounded px-3 py-1.5 text-xs text-[#E8EDF2] focus:outline-none focus:border-[#D6FF4B]"
            >
              <option value="MINOR">MINOR</option>
              <option value="MODERATE">MODERATE</option>
              <option value="SEVERE">SEVERE</option>
              <option value="CRITICAL">CRITICAL</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-[#6F7B86] uppercase mb-1">Effective At</label>
            <input
              type="text"
              value={effectiveAt}
              onChange={(e) => setEffectiveAt(e.target.value)}
              className="w-full bg-[#131920] border border-[#27313A] rounded px-3 py-1.5 text-xs text-[#E8EDF2] focus:outline-none focus:border-[#D6FF4B]"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-[#6F7B86] uppercase mb-1">Duration (Hours)</label>
            <input
              type="number"
              value={durationHours}
              onChange={(e) => setDurationHours(Number(e.target.value))}
              className="w-full bg-[#131920] border border-[#27313A] rounded px-3 py-1.5 text-xs text-[#E8EDF2] focus:outline-none focus:border-[#D6FF4B]"
            />
          </div>
        </div>
      </Card>

      {/* ERROR STATE */}
      {error && (
        <div className="bg-[#F87171]/10 border border-[#F87171]/30 p-3 rounded text-[#F87171] text-xs font-mono-tech flex items-center justify-between">
          <div>
            <span className="font-bold mr-2">Evaluation Error:</span>
            {error}
          </div>
          <button
            onClick={runSimulation}
            className="px-3 py-1 bg-[#F87171]/20 hover:bg-[#F87171]/30 text-[#F87171] rounded border border-[#F87171]/40 text-xs font-bold"
          >
            Retry Evaluation
          </button>
        </div>
      )}

      {/* SIMULATION RESULTS VIEW */}
      {simulationResult && (
        <div className="space-y-6">
          {/* TOP RECOMMENDED ACTION HERO CARD */}
          {topOption && (
            <Card variant="solid" signalBorder="emerald" className="bg-[#FFFFFF] border border-[#10B981]">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#27313A] pb-3 mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-[#10B981]/20 text-[#34D399] border border-[#10B981]/40 rounded">
                      RECOMMENDED ACTION
                    </span>
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-[#34D399]/20 text-[#34D399] border border-[#34D399]/40 rounded">
                      FEASIBLE
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-[#E8EDF2] tracking-tight">
                    {topOption.action_id} — {topOption.category}
                  </h2>
                </div>

                <div className="text-right font-mono-tech">
                  <div className="text-[10px] text-[#6F7B86]">DECISION SCORE</div>
                  <div className="text-2xl font-extrabold text-[#D6FF4B]">
                    {topOption.ranking_score.toFixed(1)}
                  </div>
                </div>
              </div>

              {/* METRICS GRID */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <div className="bg-[#131920] p-3 rounded border border-[#27313A]">
                  <div className="text-[10px] text-[#6F7B86]">AVOIDED EXPOSURE</div>
                  <div className="text-base font-bold text-[#34D399]">
                    {formatCurrency(topOption.avoided_sla_exposure)}
                  </div>
                </div>

                <div className="bg-[#131920] p-3 rounded border border-[#27313A]">
                  <div className="text-[10px] text-[#6F7B86]">MITIGATION COST</div>
                  <div className="text-base font-bold text-[#E8EDF2]">
                    {formatCurrency(topOption.mitigation_cost)}
                  </div>
                </div>

                <div className="bg-[#131920] p-3 rounded border border-[#27313A]">
                  <div className="text-[10px] text-[#6F7B86]">NET VALUE</div>
                  <div className="text-base font-bold text-[#38BDF8]">
                    {formatCurrency(topOption.net_value)}
                  </div>
                </div>

                <div className="bg-[#131920] p-3 rounded border border-[#27313A]">
                  <div className="text-[10px] text-[#6F7B86]">DELAY REDUCTION</div>
                  <div className="text-base font-bold text-[#F4C95D]">
                    {topOption.delay_reduction_days.toFixed(1)} Days
                  </div>
                </div>
              </div>

              {/* STRUCTURED DECISION EVIDENCE — WHY THIS */}
              {topOption.why_this && (
                <div className="bg-[#131920] border border-[#27313A] rounded p-3 space-y-2">
                  <div className="text-xs font-bold text-[#D6FF4B] uppercase tracking-wider">
                    DECISION EVIDENCE // WHY THIS
                  </div>
                  <div className="text-xs text-[#E8EDF2] font-bold">
                    {topOption.why_this.headline}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                    {topOption.why_this.key_drivers.map((driver, idx) => (
                      <div key={idx} className="bg-[#080B10] p-2 rounded border border-[#27313A] text-xs text-[#AAB5BF]">
                        <span className="text-[#D6FF4B] font-bold mr-1.5">0{idx + 1}</span> {driver}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-3">
                <button
                  onClick={() => openCandidateDrawer(topOption)}
                  className="w-full py-1.5 bg-[#131920] hover:bg-[#171E26] text-[#E8EDF2] font-bold rounded border border-[#27313A] text-xs text-center"
                >
                  INSPECT CANDIDATE DETAILS ➔
                </button>
              </div>
            </Card>
          )}

          {/* CANDIDATE COMPARISON SELECTOR */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-[#E8EDF2] uppercase tracking-wider">
                SIDE-BY-SIDE CANDIDATE MATRIX ({compareCandidates.length} SELECTED)
              </h2>
            </div>

            <div className="flex flex-wrap gap-2">
              {simulationResult.candidate_options.map((cand) => {
                const isSelected = selectedForCompare.includes(cand.action_id);
                return (
                  <button
                    key={cand.action_id}
                    onClick={() => toggleCompareCandidate(cand.action_id)}
                    className={`px-2.5 py-1 rounded text-xs font-bold font-mono-tech border transition-all ${
                      isSelected
                        ? 'bg-[#38BDF8]/20 text-[#38BDF8] border-[#38BDF8]'
                        : 'bg-[#131920] text-[#AAB5BF] border-[#27313A]'
                    }`}
                  >
                    {cand.action_id} ({cand.category})
                  </button>
                );
              })}
            </div>

            {/* COMPARISON CARDS */}
            {compareCandidates.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                {compareCandidates.map((cand) => (
                  <Card key={cand.action_id} variant="solid" className="bg-[#FFFFFF] space-y-3">
                    <div className="flex justify-between items-start border-b border-[#27313A] pb-2">
                      <div>
                        <div className="font-bold text-[#E8EDF2] text-sm">{cand.action_id}</div>
                        <div className="text-[10px] text-[#6F7B86]">{cand.category}</div>
                      </div>
                      <StatusBadge status={cand.feasibility === 'FEASIBLE' ? 'healthy' : 'warning'} label={cand.feasibility} size="sm" />
                    </div>

                    <div className="space-y-1 text-xs font-mono-tech">
                      <div className="flex justify-between">
                        <span className="text-[#6F7B86]">Avoided:</span>
                        <span className="text-[#34D399] font-bold">{formatCurrency(cand.avoided_sla_exposure)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[#6F7B86]">Mitigation Cost:</span>
                        <span className="text-[#E8EDF2]">{formatCurrency(cand.mitigation_cost)}</span>
                      </div>
                      <div className="flex justify-between font-bold border-t border-[#27313A] pt-1">
                        <span className="text-[#38BDF8]">Net Value:</span>
                        <span className="text-[#38BDF8]">{formatCurrency(cand.net_value)}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => openCandidateDrawer(cand)}
                      className="w-full py-1 bg-[#131920] hover:bg-[#171E26] text-[#E8EDF2] text-xs font-bold rounded border border-[#27313A]"
                    >
                      INSPECT ➔
                    </button>
                  </Card>
                ))}
              </div>
            )}
          </section>

          {/* DETERMINISTIC DECISION TRACE */}
          {topOption && topOption.score_breakdown && (
            <Card variant="solid" className="bg-[#FFFFFF] border border-[#27313A] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#E8EDF2] uppercase tracking-wider">
                  DETERMINISTIC DECISION TRACE — SCORE BREAKDOWN
                </span>
                <span className="text-[10px] text-[#6F7B86]">RELATIVE STAGE SCORING</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-xs">
                <div className="bg-[#131920] p-2.5 rounded border border-[#27313A]">
                  <div className="text-[9px] text-[#6F7B86]">FINANCIAL BENEFIT</div>
                  <div className="text-sm font-bold text-[#34D399] mt-0.5">
                    +{topOption.score_breakdown.financial_benefit_score.toFixed(1)}
                  </div>
                </div>

                <div className="bg-[#131920] p-2.5 rounded border border-[#27313A]">
                  <div className="text-[9px] text-[#6F7B86]">DELAY REDUCTION</div>
                  <div className="text-sm font-bold text-[#F4C95D] mt-0.5">
                    +{topOption.score_breakdown.delay_reduction_score.toFixed(1)}
                  </div>
                </div>

                <div className="bg-[#131920] p-2.5 rounded border border-[#27313A]">
                  <div className="text-[9px] text-[#6F7B86]">RISK REDUCTION</div>
                  <div className="text-sm font-bold text-[#38BDF8] mt-0.5">
                    +{topOption.score_breakdown.risk_reduction_score.toFixed(1)}
                  </div>
                </div>

                <div className="bg-[#131920] p-2.5 rounded border border-[#27313A]">
                  <div className="text-[9px] text-[#6F7B86]">COST PENALTY</div>
                  <div className="text-sm font-bold text-[#F87171] mt-0.5">
                    -{topOption.score_breakdown.mitigation_cost_penalty.toFixed(1)}
                  </div>
                </div>

                <div className="bg-[#131920] p-2.5 rounded border border-[#27313A]">
                  <div className="text-[9px] text-[#6F7B86]">CONSTRAINT PENALTY</div>
                  <div className="text-sm font-bold text-[#AAB5BF] mt-0.5">
                    -{topOption.score_breakdown.constraint_penalty.toFixed(1)}
                  </div>
                </div>

                <div className="bg-[#131920] p-2.5 rounded border border-[#D6FF4B]">
                  <div className="text-[9px] text-[#D6FF4B]">FINAL SCORE</div>
                  <div className="text-sm font-extrabold text-[#D6FF4B] mt-0.5">
                    {topOption.score_breakdown.final_decision_score.toFixed(1)}
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* STRUCTURED DECISION EVIDENCE — WHY NOT? */}
          {simulationResult.candidate_options.some((c) => c.why_not) && (
            <section className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#F4C95D] font-extrabold">EVIDENCE //</span>
                <h2 className="text-xs font-bold text-[#E8EDF2] uppercase tracking-wider">
                  DECISION EVIDENCE — REJECTED / CONSTRAINED CANDIDATES (WHY NOT)
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {simulationResult.candidate_options
                  .filter((c) => c.why_not)
                  .map((cand) => (
                    <Card key={cand.action_id} variant="solid" signalBorder="amber" className="bg-[#FFFFFF] space-y-2">
                      <div className="flex items-center justify-between border-b border-[#27313A] pb-2">
                        <span className="font-bold text-[#E8EDF2] text-xs">{cand.action_id} ({cand.category})</span>
                        <StatusBadge status="warning" label={cand.feasibility} size="sm" />
                      </div>
                      <div className="text-xs text-[#AAB5BF]">
                        <strong className="text-[#F4C95D]">Primary Constraint: </strong>
                        {cand.why_not?.primary_reason}
                      </div>
                      <div className="text-[10px] text-[#6F7B86]">
                        Constraint codes: <span className="text-[#38BDF8]">{cand.why_not?.constraint_codes.join(', ')}</span>
                      </div>
                    </Card>
                  ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* CANDIDATE INSPECTOR DRAWER */}
      {isDrawerOpen && selectedCandidate && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs font-mono-tech">
          <div className="w-full max-w-md bg-[#FFFFFF] border-l border-[#27313A] h-full overflow-y-auto p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#27313A] pb-3">
              <div>
                <span className="text-[10px] font-bold text-[#6F7B86] uppercase">CANDIDATE INSPECTOR</span>
                <h3 className="text-lg font-bold text-[#E8EDF2]">{selectedCandidate.action_id}</h3>
              </div>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="p-1 rounded text-[#AAB5BF] hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-[#6F7B86]">Category:</span> <span className="text-[#E8EDF2] font-bold">{selectedCandidate.category}</span></div>
              <div className="flex justify-between"><span className="text-[#6F7B86]">Feasibility:</span> <span className="text-[#34D399] font-bold">{selectedCandidate.feasibility}</span></div>
              <div className="flex justify-between"><span className="text-[#6F7B86]">Decision Score:</span> <span className="text-[#D6FF4B] font-bold">{selectedCandidate.ranking_score.toFixed(1)}</span></div>
            </div>

            <div className="bg-[#131920] p-3 rounded border border-[#27313A] space-y-1.5 text-xs">
              <div className="text-[10px] font-bold text-[#6F7B86] uppercase">FINANCIAL BREAKDOWN</div>
              <div className="flex justify-between"><span className="text-[#6F7B86]">Mitigation Cost:</span> <span className="text-[#E8EDF2]">{formatCurrency(selectedCandidate.mitigation_cost)}</span></div>
              <div className="flex justify-between"><span className="text-[#6F7B86]">Avoided Exposure:</span> <span className="text-[#34D399] font-bold">{formatCurrency(selectedCandidate.avoided_sla_exposure)}</span></div>
              <div className="flex justify-between font-bold border-t border-[#27313A] pt-1"><span className="text-[#38BDF8]">Net Value:</span> <span className="text-[#38BDF8]">{formatCurrency(selectedCandidate.net_value)}</span></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MitigationsPage;
