import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Card } from '../components/ui/Card';
import { MetricCard } from '../components/ui/MetricCard';
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton';
import { ErrorState } from '../components/ui/ErrorState';
import { DataTable, Column } from '../components/ui/DataTable';
import { Drawer } from '../components/ui/Drawer';

import { fetchInventoryRisk, fetchBottlenecks } from '../services/api';
import { InventoryRiskItem, InventoryRiskResponse, BottleneckItem } from '../types/intelligence';

export interface InventoryRiskPageProps {
  onNavigate?: (path: string) => void;
}

export const InventoryRiskPage: React.FC<InventoryRiskPageProps> = ({ onNavigate }) => {
  // Data State
  const [inventoryData, setInventoryData] = useState<InventoryRiskResponse | null>(null);
  const [bottlenecks, setBottlenecks] = useState<BottleneckItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState<string>('ALL');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('ALL');
  const [coverageThreshold, setCoverageThreshold] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'RISK_DESC' | 'COVERAGE_ASC' | 'COVERAGE_DESC' | 'PART_ASC' | 'WH_ASC'>('COVERAGE_ASC');

  // Selected Drawer State
  const [selectedPosition, setSelectedPosition] = useState<InventoryRiskItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Load Inventory Risk Data from backend API
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [invRes, bottlenecksRes] = await Promise.allSettled([
        fetchInventoryRisk(),
        fetchBottlenecks(),
      ]);

      const data = invRes.status === 'fulfilled' ? invRes.value : null;
      const bList = bottlenecksRes.status === 'fulfilled' ? bottlenecksRes.value : [];

      setInventoryData(data);
      setBottlenecks(bList);
      setLoading(false);
      setLastUpdated(new Date());
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch inventory risk intelligence from backend API';
      setError(msg);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Bottleneck Component Code Set
  const bottleneckPartSet = useMemo(() => {
    const set = new Set<string>();
    bottlenecks.forEach((b) => {
      if (b.business_code) set.add(b.business_code);
    });
    return set;
  }, [bottlenecks]);

  // Unique Warehouses for Dropdown Filter
  const availableWarehouses = useMemo(() => {
    if (!inventoryData?.items) return [];
    const whs = new Set(inventoryData.items.map((i) => i.warehouse_code));
    return Array.from(whs).sort();
  }, [inventoryData]);

  // Risk Distribution Counts
  const riskDistribution = useMemo(() => {
    const dist: Record<string, number> = { CRITICAL: 0, LOW: 0, MODERATE: 0, HEALTHY: 0 };
    if (inventoryData?.items) {
      inventoryData.items.forEach((item) => {
        const cls = item.risk_classification || 'HEALTHY';
        dist[cls] = (dist[cls] || 0) + 1;
      });
    }
    return dist;
  }, [inventoryData]);

  // Dynamic KPI Metrics
  const totalPositions = inventoryData?.total_positions_evaluated || 0;
  const criticalCount = inventoryData?.critical_risk_count || 0;
  const lowCoverageCount = (inventoryData?.items || []).filter((i) => i.coverage_days <= 3.0).length;

  const minCoverageDays = useMemo(() => {
    if (!inventoryData?.items || inventoryData.items.length === 0) return 0;
    const coverages = inventoryData.items.map((i) => i.coverage_days);
    return Math.min(...coverages);
  }, [inventoryData]);

  // Critical Positions for Highlight Banner
  const criticalPositions = useMemo(() => {
    if (!inventoryData?.items) return [];
    return inventoryData.items.filter((i) => i.risk_classification === 'CRITICAL');
  }, [inventoryData]);

  // Filtered and Sorted Positions
  const processedItems = useMemo(() => {
    if (!inventoryData?.items) return [];

    let result = inventoryData.items.filter((item) => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        item.component_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.part_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.warehouse_code.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesRisk = riskFilter === 'ALL' || item.risk_classification === riskFilter;
      const matchesWH = warehouseFilter === 'ALL' || item.warehouse_code === warehouseFilter;

      let matchesThreshold = true;
      if (coverageThreshold === 'LE_1') matchesThreshold = item.coverage_days <= 1.0;
      else if (coverageThreshold === 'LE_3') matchesThreshold = item.coverage_days <= 3.0;
      else if (coverageThreshold === 'LE_7') matchesThreshold = item.coverage_days <= 7.0;

      return matchesSearch && matchesRisk && matchesWH && matchesThreshold;
    });

    // Deterministic Sorting
    result.sort((a, b) => {
      if (sortBy === 'COVERAGE_ASC') {
        if (a.coverage_days !== b.coverage_days) return a.coverage_days - b.coverage_days;
      } else if (sortBy === 'COVERAGE_DESC') {
        if (a.coverage_days !== b.coverage_days) return b.coverage_days - a.coverage_days;
      } else if (sortBy === 'RISK_DESC') {
        const rank: Record<string, number> = { CRITICAL: 3, LOW: 2, MODERATE: 1, HEALTHY: 0 };
        const rankA = rank[a.risk_classification] || 0;
        const rankB = rank[b.risk_classification] || 0;
        if (rankA !== rankB) return rankB - rankA;
      } else if (sortBy === 'PART_ASC') {
        const compCompare = a.component_name.localeCompare(b.component_name);
        if (compCompare !== 0) return compCompare;
      } else if (sortBy === 'WH_ASC') {
        const whCompare = a.warehouse_code.localeCompare(b.warehouse_code);
        if (whCompare !== 0) return whCompare;
      }

      // Secondary stable tie-breaker
      return `${a.warehouse_code}-${a.part_number}`.localeCompare(`${b.warehouse_code}-${b.part_number}`);
    });

    return result;
  }, [inventoryData, searchQuery, riskFilter, warehouseFilter, coverageThreshold, sortBy]);

  // Drawer Inspect Handler
  const handleInspect = (item: InventoryRiskItem) => {
    setSelectedPosition(item);
    setIsDrawerOpen(true);
  };

  // DataTable Column Definitions with Visual Separation of Ground Truth vs Derived
  const columns: Column<InventoryRiskItem>[] = [
    {
      header: 'Component & Part',
      accessor: (row) => {
        const isBottleneck = bottleneckPartSet.has(row.part_number);
        return (
          <div className="flex items-center gap-2">
            <div>
              <div className="font-semibold text-blue-100 text-xs">{row.component_name}</div>
              <div className="font-mono text-[10px] text-nexus-blue-60">{row.part_number}</div>
            </div>
            {isBottleneck && (
              <span className="px-1.5 py-0.5 text-[9px] font-mono bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded">
                BOTTLENECK
              </span>
            )}
          </div>
        );
      },
    },
    {
      header: 'Warehouse',
      accessor: (row) => <span className="font-mono text-xs text-nexus-blue-42">{row.warehouse_code}</span>,
    },
    {
      header: 'Ground Truth: On Hand',
      accessor: (row) => (
        <span className="font-mono text-xs text-nexus-blue-42">{row.quantity_on_hand.toLocaleString()}</span>
      ),
    },
    {
      header: 'Ground Truth: Reserved',
      accessor: (row) => (
        <span className="font-mono text-xs text-nexus-blue-60">{row.quantity_reserved.toLocaleString()}</span>
      ),
    },
    {
      header: 'Derived: Usable Stock',
      accessor: (row) => (
        <span className="font-mono text-xs font-semibold text-indigo-300">
          {row.available_inventory.toLocaleString()}
        </span>
      ),
    },
    {
      header: 'Ground Truth: Daily Demand',
      accessor: (row) => (
        <span className="font-mono text-xs text-nexus-blue-60">{row.average_daily_demand.toLocaleString()} / day</span>
      ),
    },
    {
      header: 'Derived: Coverage Days',
      accessor: (row) => (
        <span className="font-mono text-xs font-bold text-amber-400">
          {row.coverage_days === Infinity ? '∞' : `${row.coverage_days.toFixed(2)} Days`}
        </span>
      ),
    },
    {
      header: 'Derived: Stockout Estimate',
      accessor: (row) => (
        <span className="font-mono text-[11px] text-nexus-blue-60">
          {row.estimated_stockout_timestamp
            ? row.estimated_stockout_timestamp.slice(0, 16).replace('T', ' ')
            : 'N/A'}
        </span>
      ),
    },
    {
      header: 'Risk Classification',
      accessor: (row) => <StatusBadge status={row.risk_classification} size="sm" />,
    },
    {
      header: 'Actions',
      accessor: (row) => {
        const isBottleneck = bottleneckPartSet.has(row.part_number);
        return (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => handleInspect(row)}
              className="px-2 py-1 bg-nexus-blue-dark hover:bg-nexus-blue text-blue-100 text-[11px] font-medium rounded transition-colors"
            >
              Inspect
            </button>
            {onNavigate && (
              <>
                <button
                  onClick={() => onNavigate('/graph-viewer')}
                  className="px-2 py-1 bg-blue-950/20 hover:bg-blue-950/40 text-indigo-300 border border-indigo-500/30 text-[11px] font-medium rounded transition-colors"
                >
                  Graph
                </button>
                {isBottleneck && (
                  <button
                    onClick={() => onNavigate('/bottlenecks')}
                    className="px-2 py-1 bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 border border-rose-500/30 text-[11px] font-medium rounded transition-colors"
                  >
                    Bottleneck
                  </button>
                )}
                <button
                  onClick={() => onNavigate('/impact-workspace')}
                  className="px-2 py-1 bg-amber-600/20 hover:bg-amber-600/40 text-amber-300 border border-amber-500/30 text-[11px] font-medium rounded transition-colors"
                >
                  Analyze
                </button>
              </>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-8">
      {/* A. PAGE HEADER */}
      <PageHeader
        title="Inventory Risk Intelligence"
        subtitle="Deterministic visibility into inventory coverage, stockout exposure, and material availability across the operational network."
        badge={<StatusBadge status="info" label="DETERMINISTIC INTELLIGENCE" />}
        actions={
          <div className="flex items-center gap-3">
            {lastUpdated && (
              <span className="text-xs text-nexus-blue-60 font-mono hidden sm:inline-block">
                Updated: {lastUpdated.toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={loadData}
              disabled={loading}
              className="px-4 py-2 bg-blue-950 hover:bg-indigo-500 text-nexus-white text-xs font-semibold rounded-[8px] transition-colors duration-150 flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? 'Refreshing...' : 'Refresh Intelligence'}
            </button>
          </div>
        }
      />

      {/* ERROR STATE */}
      {error && (
        <ErrorState
          title="Inventory Intelligence Error"
          message={error}
          onRetry={loadData}
        />
      )}

      {/* B. EXECUTIVE KPI STRIP */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Positions Evaluated"
          value={loading ? '...' : totalPositions}
          subtext="Warehouse Inventory Balances"
          highlightColor="indigo"
        />

        <MetricCard
          title="Critical Risk Positions"
          value={loading ? '...' : criticalCount}
          subtext="Coverage ≤ 2.0 Days"
          highlightColor={criticalCount > 0 ? 'rose' : 'emerald'}
        />

        <MetricCard
          title="Low-Coverage Positions"
          value={loading ? '...' : lowCoverageCount}
          subtext="Coverage ≤ 3.0 Days"
          highlightColor={lowCoverageCount > 0 ? 'amber' : 'neutral'}
        />

        <MetricCard
          title="Minimum Network Coverage"
          value={loading ? '...' : `${minCoverageDays.toFixed(2)} Days`}
          subtext="CMP-001 Usable Stock Runway"
          highlightColor={minCoverageDays <= 2.0 ? 'rose' : 'emerald'}
        />
      </section>

      {/* G. CRITICAL INVENTORY HIGHLIGHT */}
      {criticalPositions.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-base font-bold text-nexus-white tracking-tight">Critical Stockout Vulnerabilities</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {criticalPositions.map((item) => (
              <Card key={`${item.warehouse_code}-${item.part_number}`} variant="glass" className="border-l-4 border-l-rose-500 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-sm font-bold text-nexus-white">{item.component_name}</div>
                    <div className="text-xs font-mono text-indigo-300">{item.part_number} • {item.warehouse_code}</div>
                  </div>
                  <StatusBadge status="CRITICAL" size="sm" />
                </div>

                <div className="grid grid-cols-3 gap-2 bg-nexus-white p-3 rounded-[8px] font-mono text-xs border border-nexus-blue-20">
                  <div>
                    <div className="text-[10px] text-nexus-blue-60">Usable Stock</div>
                    <div className="font-bold text-nexus-blue">{item.available_inventory}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-nexus-blue-60">Coverage</div>
                    <div className="font-bold text-nexus-blue">{item.coverage_days.toFixed(2)} Days</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-nexus-blue-60">Stockout Est.</div>
                    <div className="font-bold text-[#D94B5B]">
                      {item.estimated_stockout_timestamp ? item.estimated_stockout_timestamp.slice(5, 16).replace('T', ' ') : 'N/A'}
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs">
                  <span className="text-nexus-blue-60 italic">Ground Truth: On Hand {item.quantity_on_hand} | Reserved {item.quantity_reserved}</span>
                  <button
                    onClick={() => handleInspect(item)}
                    className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    Inspect Details ➔
                  </button>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* C. RISK DISTRIBUTION BREAKDOWN */}
      <section className="space-y-3">
        <h2 className="text-base font-bold text-nexus-white tracking-tight">Coverage Risk Distribution</h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card variant="glass" className="border-l-4 border-l-rose-500">
            <div className="text-xs font-semibold text-nexus-blue-60 uppercase tracking-wider">Critical (≤ 2.0 Days)</div>
            <div className="text-2xl font-bold font-mono text-rose-400 my-1">{riskDistribution.CRITICAL || 0}</div>
            <p className="text-[11px] text-nexus-blue-60">Immediate stockout exposure.</p>
          </Card>

          <Card variant="glass" className="border-l-4 border-l-amber-500">
            <div className="text-xs font-semibold text-nexus-blue-60 uppercase tracking-wider">Low (2–5 Days)</div>
            <div className="text-2xl font-bold font-mono text-amber-400 my-1">{riskDistribution.LOW || 0}</div>
            <p className="text-[11px] text-nexus-blue-60">Elevated replenishment risk.</p>
          </Card>

          <Card variant="glass" className="border-l-4 border-l-indigo-500">
            <div className="text-xs font-semibold text-nexus-blue-60 uppercase tracking-wider">Moderate (5–14 Days)</div>
            <div className="text-2xl font-bold font-mono text-indigo-400 my-1">{riskDistribution.MODERATE || 0}</div>
            <p className="text-[11px] text-nexus-blue-60">Standard operational buffer.</p>
          </Card>

          <Card variant="glass" className="border-l-4 border-l-emerald-500">
            <div className="text-xs font-semibold text-nexus-blue-60 uppercase tracking-wider">Healthy (&gt; 14 Days)</div>
            <div className="text-2xl font-bold font-mono text-emerald-400 my-1">{riskDistribution.HEALTHY || 0}</div>
            <p className="text-[11px] text-nexus-blue-60">Optimal coverage runway.</p>
          </Card>
        </div>
      </section>

      {/* E. FILTER & SEARCH TOOLBAR */}
      <Card variant="glass" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Search Input */}
          <div className="w-full sm:w-64">
            <label htmlFor="inv-search" className="sr-only">
              Search Component or Warehouse
            </label>
            <input
              id="inv-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search component or warehouse..."
              className="w-full bg-blue-950 border border-nexus-blue rounded-[8px] px-3 py-1.5 text-xs font-mono text-blue-100 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <label htmlFor="filter-risk" className="sr-only">
                Filter Risk Classification
              </label>
              <select
                id="filter-risk"
                value={riskFilter}
                onChange={(e) => setRiskFilter(e.target.value)}
                className="bg-blue-950 border border-nexus-blue rounded-[8px] px-3 py-1.5 text-xs font-mono text-blue-100 focus:border-indigo-500 focus:outline-none"
              >
                <option value="ALL">ALL RISK LEVELS</option>
                <option value="CRITICAL">CRITICAL</option>
                <option value="LOW">LOW</option>
                <option value="MODERATE">MODERATE</option>
                <option value="HEALTHY">HEALTHY</option>
              </select>
            </div>

            <div>
              <label htmlFor="filter-wh" className="sr-only">
                Filter Warehouse
              </label>
              <select
                id="filter-wh"
                value={warehouseFilter}
                onChange={(e) => setWarehouseFilter(e.target.value)}
                className="bg-blue-950 border border-nexus-blue rounded-[8px] px-3 py-1.5 text-xs font-mono text-blue-100 focus:border-indigo-500 focus:outline-none"
              >
                <option value="ALL">ALL WAREHOUSES</option>
                {availableWarehouses.map((wh) => (
                  <option key={wh} value={wh}>
                    {wh}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="filter-coverage" className="sr-only">
                Filter Coverage Threshold
              </label>
              <select
                id="filter-coverage"
                value={coverageThreshold}
                onChange={(e) => setCoverageThreshold(e.target.value)}
                className="bg-blue-950 border border-nexus-blue rounded-[8px] px-3 py-1.5 text-xs font-mono text-blue-100 focus:border-indigo-500 focus:outline-none"
              >
                <option value="ALL">ALL COVERAGE RUNWAYS</option>
                <option value="LE_1">≤ 1.0 Day Coverage</option>
                <option value="LE_3">≤ 3.0 Days Coverage</option>
                <option value="LE_7">≤ 7.0 Days Coverage</option>
              </select>
            </div>

            {/* Sort Selector */}
            <div>
              <label htmlFor="inv-sort" className="sr-only">
                Sort Inventory Positions
              </label>
              <select
                id="inv-sort"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-blue-950 border border-nexus-blue rounded-[8px] px-3 py-1.5 text-xs font-mono text-blue-100 focus:border-indigo-500 focus:outline-none"
              >
                <option value="COVERAGE_ASC">Sort: Coverage (Low → High)</option>
                <option value="COVERAGE_DESC">Sort: Coverage (High → Low)</option>
                <option value="RISK_DESC">Sort: Risk Severity</option>
                <option value="PART_ASC">Sort: Component Name</option>
                <option value="WH_ASC">Sort: Warehouse</option>
              </select>
            </div>
          </div>
        </div>
      </Card>

      {/* D. MAIN INVENTORY TABLE */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-nexus-white tracking-tight">
            Warehouse Inventory Positions ({processedItems.length})
          </h2>
          <span className="text-xs text-nexus-blue-60 font-mono">
            Ground Truth DB Facts vs Derived Simulation Projections
          </span>
        </div>

        <Card padding="none">
          {loading ? (
            <div className="p-6">
              <LoadingSkeleton lines={6} />
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={processedItems}
              keyExtractor={(row) => `${row.warehouse_code}-${row.part_number}`}
              emptyMessage="No inventory positions match your filter criteria."
            />
          )}
        </Card>
      </section>

      {/* H. INVENTORY DETAIL DRAWER */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={selectedPosition?.component_name || 'Inventory Detail'}
        subtitle={`Part: ${selectedPosition?.part_number || ''} • Warehouse: ${selectedPosition?.warehouse_code || ''}`}
      >
        {selectedPosition ? (
          <div className="space-y-6 text-xs text-nexus-blue-42 font-mono">
            {/* Overview */}
            <div className="bg-blue-950/60 p-4 rounded-[8px] border border-blue-800 space-y-2">
              <div className="text-nexus-blue-60 text-[10px] uppercase font-semibold">Position Overview</div>
              <div><span className="text-nexus-blue-60">Component:</span> {selectedPosition.component_name}</div>
              <div><span className="text-nexus-blue-60">Part Number:</span> {selectedPosition.part_number}</div>
              <div><span className="text-nexus-blue-60">Warehouse:</span> {selectedPosition.warehouse_code}</div>
              <div>
                <span className="text-nexus-blue-60">Risk Classification:</span> <StatusBadge status={selectedPosition.risk_classification} size="sm" />
              </div>
            </div>

            {/* Ground Truth Inputs */}
            <div className="bg-blue-950/60 p-4 rounded-[8px] border border-blue-800 space-y-2">
              <div className="text-emerald-400 text-[10px] uppercase font-semibold">Ground Truth DB Inputs</div>
              <div className="flex justify-between"><span className="text-nexus-blue-60">Quantity On-Hand:</span> <span className="text-blue-100 font-bold">{selectedPosition.quantity_on_hand}</span></div>
              <div className="flex justify-between"><span className="text-nexus-blue-60">Quantity Reserved:</span> <span className="text-blue-100 font-bold">{selectedPosition.quantity_reserved}</span></div>
              <div className="flex justify-between"><span className="text-nexus-blue-60">Average Daily Demand:</span> <span className="text-blue-100 font-bold">{selectedPosition.average_daily_demand} / day</span></div>
            </div>

            {/* Derived Intelligence */}
            <div className="bg-amber-500/10 p-4 rounded-[8px] border border-amber-500/30 space-y-2">
              <div className="text-amber-400 text-[10px] uppercase font-semibold">Derived Intelligence (Phase 2.3 Engine)</div>
              <div className="flex justify-between"><span className="text-nexus-blue-60">Usable Inventory:</span> <span className="text-indigo-300 font-bold">{selectedPosition.available_inventory}</span></div>
              <div className="flex justify-between"><span className="text-nexus-blue-60">Coverage Days:</span> <span className="text-amber-400 font-bold">{selectedPosition.coverage_days.toFixed(2)} Days</span></div>
              <div className="flex justify-between">
                <span className="text-nexus-blue-60">Stockout Timestamp:</span>
                <span className="text-rose-400 font-bold">
                  {selectedPosition.estimated_stockout_timestamp ? selectedPosition.estimated_stockout_timestamp.slice(0, 16).replace('T', ' ') : 'N/A'}
                </span>
              </div>
            </div>

            {/* Explanatory Guidance */}
            <div className="bg-blue-950/80 p-4 rounded-[8px] border border-blue-800 space-y-2">
              <div className="text-nexus-blue-60 text-[10px] uppercase font-semibold">Interpretation & Context</div>
              <p className="text-nexus-blue-42 font-sans leading-relaxed">
                Available usable stock ({selectedPosition.available_inventory} units) provides approximately {selectedPosition.coverage_days.toFixed(2)} days of production coverage at the current deterministic demand rate of {selectedPosition.average_daily_demand} units/day.
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2.5 pt-2">
              {onNavigate && (
                <>
                  <button
                    onClick={() => {
                      setIsDrawerOpen(false);
                      onNavigate('/graph-viewer');
                    }}
                    className="w-full py-2 bg-blue-950 hover:bg-indigo-500 text-nexus-white font-semibold rounded-[8px] transition-colors text-center"
                  >
                    Trace Component in Graph ➔
                  </button>
                  {bottleneckPartSet.has(selectedPosition.part_number) && (
                    <button
                      onClick={() => {
                        setIsDrawerOpen(false);
                        onNavigate('/bottlenecks');
                      }}
                      className="w-full py-2 bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 border border-rose-500/30 font-semibold rounded-[8px] transition-colors text-center"
                    >
                      View Structural Bottleneck Details ➔
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setIsDrawerOpen(false);
                      onNavigate('/impact-workspace');
                    }}
                    className="w-full py-2 bg-nexus-blue-dark hover:bg-nexus-blue text-blue-100 font-semibold rounded-[8px] transition-colors text-center border border-nexus-blue"
                  >
                    Analyze Impact in Workspace ➔
                  </button>
                </>
              )}
            </div>
          </div>
        ) : null}
      </Drawer>
    </div>
  );
};
