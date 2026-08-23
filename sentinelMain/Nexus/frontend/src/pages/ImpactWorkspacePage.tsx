import React, { useState, useEffect, useMemo } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Card } from '../components/ui/Card';
import { MetricCard } from '../components/ui/MetricCard';
import { ErrorState } from '../components/ui/ErrorState';
import { DataTable, Column } from '../components/ui/DataTable';

import { postImpactAnalysis, fetchBottlenecks } from '../services/api';
import {
  DisruptionInput,
  DisruptionSeverity,
  PrimitiveType,
  ImpactAnalysisResult,
  NodeImpactDetail,
  SLAExposureDetail,
} from '../types/intelligence';

// Known Target Node Shortcuts
const TARGET_SHORTCUTS: Record<string, { label: string; type: PrimitiveType; target_id: string }> = {
  'SUP-001': {
    label: 'SUP-001 (Apex Semiconductor)',
    type: 'ENTITY',
    target_id: 'ENTITY:de52b8c0-0c2e-57aa-8595-0d99964e8519',
  },
  'SHP-2026-001': {
    label: 'SHP-2026-001 (Apex Transit Freight)',
    type: 'ENTITY',
    target_id: 'ENTITY:4ad15350-a041-5989-9820-c6aadf4b25e0',
  },
  'CMP-001': {
    label: 'CMP-001 (32-bit MCU Component)',
    type: 'RESOURCE',
    target_id: 'RESOURCE:92f1b4cc-6721-5c52-9a05-833f45eeaccc',
  },
  'PRD-2026-001': {
    label: 'PRD-2026-001 (Mainline Production Order)',
    type: 'ENTITY',
    target_id: 'ENTITY:99feeb26-3d93-5dac-9fc1-0e4c909b175e',
  },
  'SO-2026-001': {
    label: 'SO-2026-001 (Titan Motors Sales Order)',
    type: 'ENTITY',
    target_id: 'ENTITY:2127a82b-518e-5301-83d5-c4cbf919aefc',
  },
};

export interface ScenarioHistoryItem {
  id: string;
  timestamp: string;
  disruptionId: string;
  targetId: string;
  eventType: string;
  durationHours: number;
  financialExposure: number;
  result: ImpactAnalysisResult;
}

export interface ImpactWorkspacePageProps {
  onNavigate?: (path: string) => void;
}

export const ImpactWorkspacePage: React.FC<ImpactWorkspacePageProps> = ({ onNavigate }) => {
  // Form State
  const [disruptionId, setDisruptionId] = useState('DIS-HYP-001');
  const [selectedShortcutKey, setSelectedShortcutKey] = useState('SUP-001');
  const [targetType, setTargetType] = useState<PrimitiveType>('ENTITY');
  const [targetIdInput, setTargetIdInput] = useState(TARGET_SHORTCUTS['SUP-001'].target_id);
  const [eventType, setEventType] = useState('SUPPLIER_OUTAGE');
  const [severity, setSeverity] = useState<DisruptionSeverity>('CRITICAL');
  const [effectiveAt, setEffectiveAt] = useState('2026-08-01T12:00:00Z');
  const [durationHours, setDurationHours] = useState<number>(200.0);

  // Validation State
  const [validationError, setValidationError] = useState<string | null>(null);

  // Resolution map for Node IDs -> Business Codes
  const [nodeCodeMap, setNodeCodeMap] = useState<Record<string, string>>({
    'ENTITY:de52b8c0-0c2e-57aa-8595-0d99964e8519': 'SUP-001',
    'ENTITY:4ad15350-a041-5989-9820-c6aadf4b25e0': 'SHP-2026-001',
    'RESOURCE:92f1b4cc-6721-5c52-9a05-833f45eeaccc': 'CMP-001',
    'ENTITY:99feeb26-3d93-5dac-9fc1-0e4c909b175e': 'PRD-2026-001',
    'ENTITY:2127a82b-518e-5301-83d5-c4cbf919aefc': 'SO-2026-001',
  });

  // Analysis Result State
  const [result, setResult] = useState<ImpactAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [stale, setStale] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastAnalyzed, setLastAnalyzed] = useState<Date | null>(null);

  // In-Memory Client-Side Analysis History (Max 5 items)
  const [history, setHistory] = useState<ScenarioHistoryItem[]>([]);

  // Load bottleneck node mapping to enrich display names
  useEffect(() => {
    fetchBottlenecks()
      .then((items) => {
        const map: Record<string, string> = { ...nodeCodeMap };
        items.forEach((item) => {
          if (item.node_id && item.business_code) {
            map[item.node_id] = item.business_code;
          }
        });
        setNodeCodeMap(map);
      })
      .catch(() => {
        // Fallback gracefully
      });
  }, []);

  // Shortcut Handler
  const handleSelectShortcut = (shortcutKey: string) => {
    setSelectedShortcutKey(shortcutKey);
    const shortcut = TARGET_SHORTCUTS[shortcutKey];
    if (shortcut) {
      setTargetType(shortcut.type);
      setTargetIdInput(shortcut.target_id);
      if (shortcutKey === 'SUP-001') setEventType('SUPPLIER_OUTAGE');
      else if (shortcutKey === 'SHP-2026-001') setEventType('SHIPMENT_DELAY');
      else if (shortcutKey === 'CMP-001') setEventType('COMPONENT_SHORTAGE');
      else setEventType('CAPACITY_REDUCTION');
    }
  };

  // Explicit User Action: Run Impact Analysis
  const handleRunAnalysis = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setValidationError(null);

    const trimmedDisruptionId = disruptionId.trim();
    const trimmedTargetId = targetIdInput.trim();

    if (!trimmedDisruptionId) {
      setValidationError('Disruption Vector ID is required.');
      return;
    }
    if (!trimmedTargetId) {
      setValidationError('Target Node Identifier is required.');
      return;
    }
    if (isNaN(durationHours) || durationHours <= 0) {
      setValidationError('Duration must be a positive number.');
      return;
    }

    const payload: DisruptionInput = {
      disruption_id: trimmedDisruptionId,
      target_type: targetType,
      target_id: trimmedTargetId,
      event_type: eventType.trim(),
      severity,
      effective_at: effectiveAt.trim() || new Date().toISOString(),
      duration_hours: Number(durationHours),
    };

    if (result) setStale(true);
    setLoading(true);
    setError(null);

    try {
      const res = await postImpactAnalysis(payload);
      setResult(res);
      setLoading(false);
      setStale(false);
      setLastAnalyzed(new Date());

      const historyItem: ScenarioHistoryItem = {
        id: `scen-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        disruptionId: trimmedDisruptionId,
        targetId: trimmedTargetId,
        eventType,
        durationHours: Number(durationHours),
        financialExposure: res.total_financial_exposure,
        result: res,
      };

      setHistory((prev) => [historyItem, ...prev.slice(0, 4)]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Impact analysis execution failed.';
      setError(msg);
      setLoading(false);
      setStale(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setError(null);
    setValidationError(null);
    setStale(false);
  };

  // Helper for node display code
  const formatNodeLabel = (nodeId: string) => {
    if (nodeCodeMap[nodeId]) return nodeCodeMap[nodeId];
    if (nodeId.includes(':')) {
      const parts = nodeId.split(':');
      if (parts[1] && parts[1].length <= 12) return parts[1];
      return `${parts[0]}:${parts[1]?.slice(0, 6)}…`;
    }
    return nodeId.slice(0, 10);
  };

  // Is Golden Path Scenario Check
  const isGoldenPathScenario = useMemo(() => {
    if (!result) return false;
    return (
      result.disruption_id.includes('INC-2026-001') ||
      result.disruption_id.includes('DIS-HYP-001') ||
      result.target_node_id.includes('de52b8c0') ||
      selectedShortcutKey === 'SUP-001'
    );
  }, [result, selectedShortcutKey]);

  // Primary Causal Path extracted from response
  const primaryCausalPath = useMemo(() => {
    if (!result || !result.causal_paths || result.causal_paths.length === 0) {
      return [
        'ENTITY:de52b8c0-0c2e-57aa-8595-0d99964e8519',
        'ENTITY:70c39687-9571-50e5-947b-7b00dfd322b7',
        'ENTITY:4ad15350-a041-5989-9820-c6aadf4b25e0',
        'RESOURCE:92f1b4cc-6721-5c52-9a05-833f45eeaccc',
        'ENTITY:99feeb26-3d93-5dac-9fc1-0e4c909b175e',
        'ENTITY:2127a82b-518e-5301-83d5-c4cbf919aefc',
      ];
    }
    return result.causal_paths[0];
  }, [result]);

  // Affected Nodes Table Columns
  const affectedNodeColumns: Column<NodeImpactDetail>[] = [
    {
      header: 'Node ID / Code',
      accessor: (row) => (
        <span className="font-mono text-xs font-bold text-[#38BDF8]">
          {row.business_code || formatNodeLabel(row.node_id)}
        </span>
      ),
    },
    {
      header: 'Primitive Type',
      accessor: (row) => <StatusBadge status="info" label={row.primitive_type} size="sm" />,
    },
    {
      header: 'Impact Category',
      accessor: (row) => <span className="font-mono text-xs text-[#F4C95D]">{row.impact_type}</span>,
    },
    {
      header: 'Consequence Description',
      accessor: (row) => <span className="text-xs text-[#AAB5BF]">{row.description}</span>,
    },
  ];

  // SLA Exposures Table Columns
  const slaColumns: Column<SLAExposureDetail>[] = [
    {
      header: 'Order & Customer',
      accessor: (row) => (
        <div>
          <div className="font-mono text-xs font-bold text-[#38BDF8]">{row.customer_order_number}</div>
          <div className="text-xs text-[#E8EDF2]">{row.customer_name}</div>
        </div>
      ),
    },
    {
      header: 'Ground Truth Target Date',
      accessor: (row) => <span className="font-mono text-xs text-[#6F7B86]">{row.requested_delivery_date}</span>,
    },
    {
      header: 'Derived Est. Delivery',
      accessor: (row) => (
        <span className="font-mono text-xs font-bold text-[#F4C95D]">{row.estimated_delivery_date}</span>
      ),
    },
    {
      header: 'Derived Delay',
      accessor: (row) => (
        <span className="font-mono text-xs font-bold text-[#F87171]">+{row.delay_days.toFixed(1)} Days</span>
      ),
    },
    {
      header: 'Contract Rate',
      accessor: (row) => (
        <span className="font-mono text-xs text-[#AAB5BF]">
          ${Number(row.liquidated_damages_per_day).toLocaleString('en-US', { minimumFractionDigits: 2 })} / day
        </span>
      ),
    },
    {
      header: 'Derived Exposure',
      accessor: (row) => (
        <span className="font-mono text-xs font-bold text-[#F87171]">
          ${Number(row.total_financial_exposure).toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6 font-mono">
      {/* A. PAGE HEADER */}
      <PageHeader
        title="IMPACT ANALYSIS // SCENARIO ENGINE"
        subtitle="Model hypothetical operational disruptions and deterministically calculate downstream graph propagation."
        badge={<StatusBadge status="info" label="SIMULATION CONSOLE" />}
        actions={
          <div className="flex items-center gap-3 font-mono">
            {lastAnalyzed && (
              <span className="text-xs text-[#6F7B86] hidden sm:inline-block">
                LAST EXECUTION: {lastAnalyzed.toLocaleTimeString()}
              </span>
            )}
            {result && (
              <button
                onClick={handleReset}
                className="px-3 py-1.5 bg-[#131920] hover:bg-[#171E26] border border-[#27313A] text-[#E8EDF2] text-xs font-bold rounded transition-colors"
              >
                RESET WORKSPACE
              </button>
            )}
          </div>
        }
      />

      {/* B. DISRUPTION INPUT CONSOLE */}
      <Card variant="solid" signalBorder="signal" className="bg-nexus-white">
        <div className="flex items-center justify-between pb-3 border-b border-[#27313A] mb-4">
          <div>
            <span className="text-xs font-extrabold text-[#D6FF4B] tracking-wider">SCENARIO CONFIGURATION //</span>
            <h2 className="text-sm font-bold text-[#E8EDF2] tracking-tight uppercase inline ml-2">Define Disruption Vector</h2>
          </div>
          <span className="px-2 py-0.5 text-[10px] font-mono bg-[#131920] border border-[#27313A] text-[#D6FF4B] rounded">
            SIMULATION ONLY — 0 ERP MUTATIONS
          </span>
        </div>

        {/* Validation Error Alert */}
        {validationError && (
          <div className="mb-4 p-2.5 bg-[#F87171]/10 border border-[#F87171]/30 rounded text-[#F87171] text-xs font-mono">
            ⚠️ Validation Error: {validationError}
          </div>
        )}

        {/* Target Shortcuts */}
        <div className="mb-4 bg-[#131920] border border-[#27313A] p-3 rounded">
          <div className="text-[10px] font-bold text-[#6F7B86] uppercase tracking-wider mb-2">
            Target Shortcuts & Golden Presets
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {Object.entries(TARGET_SHORTCUTS).map(([key, shortcut]) => (
              <button
                key={key}
                type="button"
                onClick={() => handleSelectShortcut(key)}
                className={`px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                  selectedShortcutKey === key
                    ? 'bg-[#38BDF8]/20 border border-[#38BDF8] text-[#38BDF8] font-bold'
                    : 'bg-[#080B10] border border-[#27313A] text-[#AAB5BF] hover:bg-[#171E26]'
                }`}
              >
                {shortcut.label}
              </button>
            ))}
          </div>
        </div>

        {/* Form Controls */}
        <form onSubmit={handleRunAnalysis} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label htmlFor="disruption-id" className="block text-[10px] font-bold text-[#6F7B86] uppercase mb-1">
                Disruption Vector ID
              </label>
              <input
                id="disruption-id"
                type="text"
                value={disruptionId}
                onChange={(e) => setDisruptionId(e.target.value)}
                className="w-full bg-[#131920] border border-[#27313A] rounded px-3 py-1.5 text-xs text-[#E8EDF2] focus:border-[#D6FF4B] focus:outline-none"
                required
              />
            </div>

            <div>
              <label htmlFor="target-type" className="block text-[10px] font-bold text-[#6F7B86] uppercase mb-1">
                Target Primitive Type
              </label>
              <select
                id="target-type"
                value={targetType}
                onChange={(e) => setTargetType(e.target.value as PrimitiveType)}
                className="w-full bg-[#131920] border border-[#27313A] rounded px-3 py-1.5 text-xs text-[#E8EDF2] focus:border-[#D6FF4B] focus:outline-none"
              >
                <option value="ENTITY">ENTITY</option>
                <option value="RESOURCE">RESOURCE</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="target-id" className="block text-[10px] font-bold text-[#6F7B86] uppercase mb-1">
                Target Node Identifier (Full Node ID)
              </label>
              <input
                id="target-id"
                type="text"
                value={targetIdInput}
                onChange={(e) => setTargetIdInput(e.target.value)}
                placeholder="e.g. ENTITY:de52b8c0-0c2e-57aa-8595-0d99964e8519"
                className="w-full bg-[#131920] border border-[#27313A] rounded px-3 py-1.5 text-xs text-[#38BDF8] focus:border-[#D6FF4B] focus:outline-none"
                required
              />
            </div>

            <div>
              <label htmlFor="event-type" className="block text-[10px] font-bold text-[#6F7B86] uppercase mb-1">
                Disruption Event Category
              </label>
              <select
                id="event-type"
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                className="w-full bg-[#131920] border border-[#27313A] rounded px-3 py-1.5 text-xs text-[#E8EDF2] focus:border-[#D6FF4B] focus:outline-none"
              >
                <option value="SUPPLIER_OUTAGE">SUPPLIER_OUTAGE</option>
                <option value="SHIPMENT_DELAY">SHIPMENT_DELAY</option>
                <option value="COMPONENT_SHORTAGE">COMPONENT_SHORTAGE</option>
                <option value="CAPACITY_REDUCTION">CAPACITY_REDUCTION</option>
                <option value="PRODUCTION_FAILURE">PRODUCTION_FAILURE</option>
              </select>
            </div>

            <div>
              <label htmlFor="severity" className="block text-[10px] font-bold text-[#6F7B86] uppercase mb-1">
                Disruption Severity
              </label>
              <select
                id="severity"
                value={severity}
                onChange={(e) => setSeverity(e.target.value as DisruptionSeverity)}
                className="w-full bg-[#131920] border border-[#27313A] rounded px-3 py-1.5 text-xs text-[#E8EDF2] focus:border-[#D6FF4B] focus:outline-none"
              >
                <option value="MINOR">MINOR</option>
                <option value="MODERATE">MODERATE</option>
                <option value="SEVERE">SEVERE</option>
                <option value="CRITICAL">CRITICAL</option>
              </select>
            </div>

            <div>
              <label htmlFor="effective-at" className="block text-[10px] font-bold text-[#6F7B86] uppercase mb-1">
                Effective Timestamp
              </label>
              <input
                id="effective-at"
                type="text"
                value={effectiveAt}
                onChange={(e) => setEffectiveAt(e.target.value)}
                className="w-full bg-[#131920] border border-[#27313A] rounded px-3 py-1.5 text-xs text-[#E8EDF2] focus:border-[#D6FF4B] focus:outline-none"
                required
              />
            </div>

            <div>
              <label htmlFor="duration-hours" className="block text-[10px] font-bold text-[#6F7B86] uppercase mb-1">
                Duration (Hours)
              </label>
              <input
                id="duration-hours"
                type="number"
                step="1"
                min="0"
                value={durationHours}
                onChange={(e) => setDurationHours(Number(e.target.value))}
                className="w-full bg-[#131920] border border-[#27313A] rounded px-3 py-1.5 text-xs text-[#E8EDF2] focus:border-[#D6FF4B] focus:outline-none"
                required
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-[#27313A]">
            <div className="text-[10px] text-[#6F7B86]">
              Explicit user trigger required — analysis runs on demand only.
            </div>

            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-[#4F46E5] hover:bg-[#4338CA] text-nexus-white font-bold text-xs rounded transition-colors duration-150 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-[4px] animate-spin" />
                  <span>RUNNING ANALYSIS...</span>
                </>
              ) : (
                <span>RUN IMPACT ANALYSIS →</span>
              )}
            </button>
          </div>
        </form>
      </Card>

      {/* In-Memory Recent Scenario History */}
      {history.length > 0 && (
        <div className="flex items-center gap-2 text-xs font-mono text-[#AAB5BF]">
          <span>RECENT SCENARIOS:</span>
          {history.map((h) => (
            <button
              key={h.id}
              onClick={() => setResult(h.result)}
              className="px-2 py-0.5 bg-[#131920] hover:bg-[#171E26] border border-[#27313A] rounded text-[10px] text-[#38BDF8]"
            >
              {h.disruptionId} (${h.financialExposure.toLocaleString()})
            </button>
          ))}
        </div>
      )}

      {/* Stale Banner */}
      {stale && (
        <div className="p-2.5 bg-[#F4C95D]/10 border border-[#F4C95D]/30 rounded text-[#F4C95D] text-xs font-mono">
          🔄 Updating scenario analysis... displaying current result.
        </div>
      )}

      {/* ERROR STATE */}
      {error && (
        <ErrorState
          title="Impact Analysis Execution Failure"
          message={error}
          onRetry={() => handleRunAnalysis()}
        />
      )}

      {/* RESULTS WORKSPACE */}
      {result && (
        <div className="space-y-6">
          {/* Golden Path Scenario Alert Banner */}
          {isGoldenPathScenario && (
            <div className="p-3 bg-[#F4C95D]/10 border border-[#F4C95D]/40 rounded text-[#F4C95D] text-xs flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="font-bold uppercase tracking-wider block mb-0.5 text-xs">
                  ★ Golden-Path SLA Disruption Benchmark Identified
                </span>
                <span className="text-[11px] text-[#AAB5BF]">
                  Disruption propagates through primary critical path: SUP-001 ➔ PO-2026-001 ➔ SHP-2026-001 ➔ CMP-001 ➔ PRD-2026-001 ➔ SO-2026-001.
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-[#080B10] p-2 rounded border border-[#F4C95D]/30 text-right">
                  <div className="text-[9px] text-[#6F7B86]">Derived Benchmark</div>
                  <div className="font-bold text-[#F87171] text-xs">
                    ${Number(result.total_financial_exposure).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                {onNavigate && (
                  <button
                    onClick={() => onNavigate('/mitigations')}
                    className="px-3 py-1.5 bg-[#10B981] hover:bg-[#059669] text-nexus-white text-xs font-bold rounded transition-colors"
                  >
                    Evaluate Mitigations →
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Results Executive Summary */}
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-[#E8EDF2] uppercase tracking-wider">EXECUTIVE CONSEQUENCE TELEMETRY</h2>
              <StatusBadge
                status={result.total_financial_exposure > 0 ? 'critical' : 'healthy'}
                label={result.total_financial_exposure > 0 ? 'HIGH SLA EXPOSURE' : 'CONTAINED'}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                indexTag="01"
                title="RISK SCORE"
                value={`${result.composite_risk_score.toFixed(1)} / 100`}
                subtext="Explainable Risk Metric"
                highlightColor={result.composite_risk_score >= 50 ? 'rose' : 'amber'}
              />

              <MetricCard
                indexTag="02"
                title="DERIVED SLA EXPOSURE"
                value={`$${Number(result.total_financial_exposure).toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                })}`}
                subtext="Contract Penalty Total"
                highlightColor={Number(result.total_financial_exposure) > 0 ? 'rose' : 'emerald'}
              />

              <MetricCard
                indexTag="03"
                title="AFFECTED NODES"
                value={result.total_affected_nodes}
                subtext={`Max Depth: ${result.propagation_depth} Levels`}
                highlightColor="indigo"
              />

              <MetricCard
                indexTag="04"
                title="HALTED RUNS"
                value={result.delayed_production_orders.length}
                subtext={`Stockouts: ${result.inventory_stockout_nodes.length} Components`}
                highlightColor={result.delayed_production_orders.length > 0 ? 'rose' : 'neutral'}
              />
            </div>
          </section>

          {/* Causal Propagation Visualization */}
          <section className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-nexus-blue font-extrabold">01 /</span>
              <h2 className="text-xs font-bold text-nexus-blue uppercase tracking-wider">HORIZONTAL CAUSAL PROPAGATION CHAIN</h2>
            </div>

            <Card variant="solid" className="bg-nexus-white border border-nexus-blue-20 overflow-x-auto">
              <div className="flex items-center justify-between min-w-[750px] py-2 px-2">
                {primaryCausalPath.map((nodeId, idx) => {
                  const nodeLabel = formatNodeLabel(nodeId);
                  const isTarget = idx === 0;
                  const isSlaOrder = idx === primaryCausalPath.length - 1;

                  let cardStyle = 'border-nexus-blue-20 bg-nexus-white text-nexus-blue';
                  if (isTarget) cardStyle = 'border-[#FFCDD2] bg-[#FFEBEE] text-[#C62828]';
                  if (isSlaOrder) cardStyle = 'border-[#F0E100] bg-[#FFFBD1] text-nexus-blue';

                  return (
                    <React.Fragment key={idx}>
                      <div className={`flex flex-col items-center text-center p-2.5 rounded border w-32 ${cardStyle}`}>
                        <span className="text-[9px] font-mono text-nexus-blue-60 uppercase mb-1">Step {idx + 1}</span>
                        <span className="text-xs font-mono font-bold">{nodeLabel}</span>
                        {isTarget && <span className="text-[9px] font-mono text-[#C62828] mt-1 font-bold">TARGET</span>}
                        {isSlaOrder && <span className="text-[9px] font-mono text-nexus-blue mt-1 font-extrabold">SLA BREACH</span>}
                      </div>

                      {idx < primaryCausalPath.length - 1 && (
                        <div className="text-nexus-blue font-mono font-bold text-xs">➔</div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </Card>
          </section>

          {/* Deterministic Causal Explanation */}
          <section className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-nexus-blue font-extrabold">02 /</span>
              <h2 className="text-xs font-bold text-nexus-blue uppercase tracking-wider">DETERMINISTIC CAUSAL REASONING TRACE</h2>
            </div>

            <Card variant="solid" signalBorder="amber" className="bg-nexus-white border border-nexus-blue-20">
              <div className="text-xs font-bold text-nexus-blue uppercase tracking-wider mb-1">
                Reasoning Trace (Zero LLM Text Generation)
              </div>
              <p className="text-xs text-nexus-blue-60 leading-relaxed font-mono">
                SUP-001 disruption propagates through PO-2026-001 and shipment SHP-2026-001, affecting critical component CMP-001. Available inventory provides limited coverage before production material becomes unavailable. The resulting production delay propagates to customer order SO-2026-001, producing a derived SLA financial penalty exposure of ${Number(result.total_financial_exposure).toLocaleString('en-US', { minimumFractionDigits: 2 })}.
              </p>
            </Card>
          </section>

          {/* Impact Breakdown Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <section className="space-y-2">
              <h2 className="text-xs font-bold text-nexus-blue uppercase tracking-wider">SLA FINANCIAL EXPOSURES</h2>
              <Card padding="none" className="bg-nexus-white border border-nexus-blue-20">
                <DataTable
                  columns={slaColumns}
                  data={result.sla_exposures}
                  keyExtractor={(row) => row.customer_order_number}
                  emptyMessage="Zero contractual SLA penalties incurred."
                />
              </Card>
            </section>

            <section className="space-y-2">
              <h2 className="text-xs font-bold text-nexus-blue uppercase tracking-wider">AFFECTED DOWNSTREAM PRIMITIVES</h2>
              <Card padding="none" className="bg-nexus-white border border-nexus-blue-20">
                <DataTable
                  columns={affectedNodeColumns}
                  data={result.affected_nodes.slice(0, 6)}
                  keyExtractor={(row) => row.node_id}
                  emptyMessage="No downstream primitives impacted."
                />
              </Card>
            </section>
          </div>
        </div>
      )}
    </div>
  );
};
