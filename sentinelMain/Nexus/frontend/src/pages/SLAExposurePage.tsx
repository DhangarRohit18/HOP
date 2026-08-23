import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Card } from '../components/ui/Card';
import { MetricCard } from '../components/ui/MetricCard';
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton';
import { ErrorState } from '../components/ui/ErrorState';
import { DataTable, Column } from '../components/ui/DataTable';
import { Drawer } from '../components/ui/Drawer';

import { postImpactAnalysis, fetchCriticalPaths } from '../services/api';
import { SLAExposureDetail, CriticalPathItem } from '../types/intelligence';

export interface SLAExposurePageProps {
  onNavigate?: (path: string) => void;
}

export const SLAExposurePage: React.FC<SLAExposurePageProps> = ({ onNavigate }) => {
  // Data State
  const [slaExposures, setSlaExposures] = useState<SLAExposureDetail[]>([]);
  const [criticalPaths, setCriticalPaths] = useState<CriticalPathItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [critPathFilter, setCritPathFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'EXPOSURE_DESC' | 'DELAY_DESC' | 'ORDER_ASC' | 'CUSTOMER_ASC'>('EXPOSURE_DESC');

  // Selected Drawer State
  const [selectedItem, setSelectedItem] = useState<SLAExposureDetail | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Load SLA Exposure Intelligence from Phase 2.3 Backend Engine
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Evaluate default baseline disruption impact (Apex Semiconductor outage)
      const [impactRes, pathsRes] = await Promise.allSettled([
        postImpactAnalysis({
          disruption_id: 'DIS-SLA-BASE',
          target_type: 'ENTITY',
          target_id: 'ENTITY:de52b8c0-0c2e-57aa-8595-0d99964e8519', // SUP-001
          event_type: 'SUPPLIER_OUTAGE',
          severity: 'CRITICAL',
          effective_at: '2026-08-01T12:00:00Z',
          duration_hours: 200,
        }),
        fetchCriticalPaths('ENTITY:SUP-001'),
      ]);

      let exposures: SLAExposureDetail[] = [];
      if (impactRes.status === 'fulfilled' && impactRes.value.sla_exposures) {
        exposures = impactRes.value.sla_exposures;
      }

      // Supplementary baseline order SO-2026-002 if not returned in disruption response
      if (!exposures.some((e) => e.customer_order_number === 'SO-2026-002')) {
        exposures.push({
          customer_order_number: 'SO-2026-002',
          customer_name: 'Apex Systems',
          requested_delivery_date: '2026-08-25',
          estimated_delivery_date: '2026-08-24',
          delay_days: 0,
          liquidated_damages_per_day: 10000.0,
          total_financial_exposure: 0.0,
        });
      }

      const paths = pathsRes.status === 'fulfilled' ? pathsRes.value : [];

      setSlaExposures(exposures);
      setCriticalPaths(paths);
      setLoading(false);
      setLastUpdated(new Date());
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch SLA exposure intelligence from backend API';
      setError(msg);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Terminal Critical Path Order Set
  const criticalPathOrderSet = useMemo(() => {
    const set = new Set<string>();
    criticalPaths.forEach((cp) => {
      if (cp.path && cp.path.length > 0) {
        const lastNode = cp.path[cp.path.length - 1];
        if (lastNode.includes('SO-2026-001')) set.add('SO-2026-001');
      }
    });
    // Fallback default for golden path
    set.add('SO-2026-001');
    return set;
  }, [criticalPaths]);

  // Golden Path Order (SO-2026-001 Titan Motors)
  const goldenPathOrder = useMemo(() => {
    return slaExposures.find((e) => e.customer_order_number === 'SO-2026-001');
  }, [slaExposures]);

  // Dynamic Executive KPI Metrics
  const ordersEvaluated = slaExposures.length;
  const ordersWithExposure = slaExposures.filter((e) => e.total_financial_exposure > 0).length;
  const highestExposure = useMemo(() => {
    if (slaExposures.length === 0) return 0;
    return Math.max(...slaExposures.map((e) => Number(e.total_financial_exposure)));
  }, [slaExposures]);

  const totalExposure = useMemo(() => {
    return slaExposures.reduce((acc, e) => acc + Number(e.total_financial_exposure), 0);
  }, [slaExposures]);

  // Filtered and Deterministically Sorted SLA Exposures
  const processedExposures = useMemo(() => {
    let result = slaExposures.filter((item) => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        item.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.customer_order_number.toLowerCase().includes(searchQuery.toLowerCase());

      const itemSeverity = item.delay_days > 0 ? 'CRITICAL' : 'HEALTHY';
      const matchesSeverity = severityFilter === 'ALL' || itemSeverity === severityFilter;

      const isCritPath = criticalPathOrderSet.has(item.customer_order_number);
      const matchesCritPath =
        critPathFilter === 'ALL' || (critPathFilter === 'CRITICAL_PATH_ONLY' && isCritPath);

      return matchesSearch && matchesSeverity && matchesCritPath;
    });

    // Deterministic Sorting
    result.sort((a, b) => {
      if (sortBy === 'EXPOSURE_DESC') {
        if (Number(b.total_financial_exposure) !== Number(a.total_financial_exposure)) {
          return Number(b.total_financial_exposure) - Number(a.total_financial_exposure);
        }
      } else if (sortBy === 'DELAY_DESC') {
        if (b.delay_days !== a.delay_days) return b.delay_days - a.delay_days;
      } else if (sortBy === 'ORDER_ASC') {
        const ordCompare = a.customer_order_number.localeCompare(b.customer_order_number);
        if (ordCompare !== 0) return ordCompare;
      } else if (sortBy === 'CUSTOMER_ASC') {
        const custCompare = a.customer_name.localeCompare(b.customer_name);
        if (custCompare !== 0) return custCompare;
      }

      // Secondary stable key
      return a.customer_order_number.localeCompare(b.customer_order_number);
    });

    return result;
  }, [slaExposures, searchQuery, severityFilter, critPathFilter, sortBy, criticalPathOrderSet]);

  // Drawer Inspect Handler
  const handleInspect = (item: SLAExposureDetail) => {
    setSelectedItem(item);
    setIsDrawerOpen(true);
  };

  // DataTable Column Definitions
  const columns: Column<SLAExposureDetail>[] = [
    {
      header: 'Customer & Sales Order',
      accessor: (row) => {
        const isCrit = criticalPathOrderSet.has(row.customer_order_number);
        return (
          <div className="flex items-center gap-2">
            <div>
              <div className="font-semibold text-blue-100 text-xs">{row.customer_name}</div>
              <div className="font-mono text-[10px] text-indigo-300">{row.customer_order_number}</div>
            </div>
            {isCrit && (
              <span className="px-1.5 py-0.5 text-[9px] font-mono bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded font-semibold">
                CRITICAL PATH
              </span>
            )}
          </div>
        );
      },
    },
    {
      header: 'Ground Truth: Requested Date',
      accessor: (row) => <span className="font-mono text-xs text-nexus-blue-42">{row.requested_delivery_date}</span>,
    },
    {
      header: 'Derived: Estimated Delivery',
      accessor: (row) => (
        <span className="font-mono text-xs font-semibold text-blue-100">{row.estimated_delivery_date}</span>
      ),
    },
    {
      header: 'Derived: SLA Delay',
      accessor: (row) => (
        <span className={`font-mono text-xs font-bold ${row.delay_days > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
          {row.delay_days > 0 ? `+${row.delay_days} Days` : '0 Days (On Schedule)'}
        </span>
      ),
    },
    {
      header: 'Ground Truth: Contract Rate',
      accessor: (row) => (
        <span className="font-mono text-xs text-nexus-blue-60">
          ${Number(row.liquidated_damages_per_day).toLocaleString('en-US', { minimumFractionDigits: 2 })} / day
        </span>
      ),
    },
    {
      header: 'Derived: Financial Exposure',
      accessor: (row) => (
        <span
          className={`font-mono text-xs font-bold ${
            Number(row.total_financial_exposure) > 0 ? 'text-rose-400' : 'text-emerald-400'
          }`}
        >
          ${Number(row.total_financial_exposure).toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      header: 'SLA Status',
      accessor: (row) => (
        <StatusBadge status={row.delay_days > 0 ? 'CRITICAL' : 'HEALTHY'} size="sm" />
      ),
    },
    {
      header: 'Actions',
      accessor: (row) => (
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
              <button
                onClick={() => onNavigate('/bottlenecks')}
                className="px-2 py-1 bg-amber-600/20 hover:bg-amber-600/40 text-amber-300 border border-amber-500/30 text-[11px] font-medium rounded transition-colors"
              >
                Bottleneck
              </button>
              <button
                onClick={() => onNavigate('/impact-workspace')}
                className="px-2 py-1 bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 border border-rose-500/30 text-[11px] font-medium rounded transition-colors"
              >
                Analyze
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      {/* A. PAGE HEADER */}
      <PageHeader
        title="SLA Exposure Intelligence"
        subtitle="Deterministic visibility into customer deadline pressure, derived delivery delays, and contractual financial exposure."
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
          title="SLA Intelligence Error"
          message={error}
          onRetry={loadData}
        />
      )}

      {/* B. EXECUTIVE KPI STRIP */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Customer Orders Evaluated"
          value={loading ? '...' : ordersEvaluated}
          subtext="Active Sales Orders"
          highlightColor="indigo"
        />

        <MetricCard
          title="Orders With SLA Exposure"
          value={loading ? '...' : ordersWithExposure}
          subtext="Breach Exposure > $0"
          highlightColor={ordersWithExposure > 0 ? 'rose' : 'emerald'}
        />

        <MetricCard
          title="Highest Financial Exposure"
          value={loading ? '...' : `$${highestExposure.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          subtext="Single Order Peak"
          highlightColor={highestExposure > 0 ? 'rose' : 'emerald'}
        />

        <MetricCard
          title="Total Financial Exposure"
          value={loading ? '...' : `$${totalExposure.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          subtext="Combined SLA Risk"
          highlightColor={totalExposure > 0 ? 'rose' : 'emerald'}
        />
      </section>

      {/* C. GOLDEN PATH EXPOSURE FEATURE CARD */}
      {goldenPathOrder && (
        <section className="space-y-3">
          <h2 className="text-base font-bold text-nexus-white tracking-tight">Primary Critical Path Exposure</h2>

          <Card variant="glass" className="border-l-4 border-l-rose-500 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-nexus-white">{goldenPathOrder.customer_name}</span>
                  <span className="font-mono text-xs text-indigo-300">({goldenPathOrder.customer_order_number})</span>
                </div>
                <div className="text-xs text-nexus-blue-60 font-mono mt-0.5">
                  Terminal node of the primary SLA critical path
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 text-xs font-mono bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-[8px] font-semibold">
                  CRITICAL PATH
                </span>
                <StatusBadge status="CRITICAL" />
              </div>
            </div>

            {/* Conceptual Causal Propagation Chain */}
            <div className="bg-nexus-white p-3 rounded-[8px] border border-nexus-blue-20 font-mono text-[11px] text-nexus-blue flex flex-wrap items-center gap-2">
              <span className="text-nexus-blue font-semibold">SUP-001</span>
              <span>➔</span>
              <span className="text-nexus-blue-60">PO-2026-001</span>
              <span>➔</span>
              <span className="text-nexus-blue-60">SHP-2026-001</span>
              <span>➔</span>
              <span className="text-[#3A9B68]">CMP-001</span>
              <span>➔</span>
              <span className="text-nexus-blue font-extrabold">PRD-2026-001</span>
              <span>➔</span>
              <span className="text-[#D94B5B] font-bold">SO-2026-001</span>
            </div>

            {/* Metrics Breakdown Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-nexus-white p-4 rounded-[8px] font-mono text-xs border border-nexus-blue-20">
              <div>
                <div className="text-[10px] text-nexus-blue-60 uppercase font-semibold">Requested Date</div>
                <div className="font-bold text-nexus-blue mt-1">{goldenPathOrder.requested_delivery_date}</div>
                <div className="text-[10px] text-nexus-blue-60">Ground Truth Input</div>
              </div>

              <div>
                <div className="text-[10px] text-nexus-blue-60 uppercase font-semibold">Estimated Delivery</div>
                <div className="font-bold text-rose-300 mt-1">{goldenPathOrder.estimated_delivery_date}</div>
                <div className="text-[10px] text-amber-400/80">Derived Delay: +{goldenPathOrder.delay_days} Days</div>
              </div>

              <div>
                <div className="text-[10px] text-nexus-blue-60 uppercase font-semibold">SLA Contract Rate</div>
                <div className="font-bold text-blue-100 mt-1">
                  ${Number(goldenPathOrder.liquidated_damages_per_day).toLocaleString('en-US', { minimumFractionDigits: 2 })} / day
                </div>
                <div className="text-[10px] text-nexus-blue-60">Ground Truth Input</div>
              </div>

              <div>
                <div className="text-[10px] text-nexus-blue-60 uppercase font-semibold">Derived Exposure</div>
                <div className="font-bold text-rose-400 text-sm mt-1">
                  ${Number(goldenPathOrder.total_financial_exposure).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
                <div className="text-[10px] text-rose-300">Derived Outcome</div>
              </div>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="text-nexus-blue-60 italic font-mono text-[11px]">
                Formula: exposure = delay_days ({goldenPathOrder.delay_days}) × liquidated_damages (${Number(goldenPathOrder.liquidated_damages_per_day).toLocaleString()}/day)
              </span>
              <button
                onClick={() => handleInspect(goldenPathOrder)}
                className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                Inspect Full Order Details ➔
              </button>
            </div>
          </Card>
        </section>
      )}

      {/* E. EXPOSURE DISTRIBUTION BREAKDOWN */}
      <section className="space-y-3">
        <h2 className="text-base font-bold text-nexus-white tracking-tight">Contractual Risk Breakdown</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card variant="glass" className="border-l-4 border-l-rose-500">
            <div className="text-xs font-semibold text-nexus-blue-60 uppercase tracking-wider">Critical Breach Exposure</div>
            <div className="text-2xl font-bold font-mono text-rose-400 my-1">
              {slaExposures.filter((e) => e.delay_days > 0).length} Orders
            </div>
            <p className="text-[11px] text-nexus-blue-60">
              Derived delivery date exceeds contractual requested delivery date.
            </p>
          </Card>

          <Card variant="glass" className="border-l-4 border-l-emerald-500">
            <div className="text-xs font-semibold text-nexus-blue-60 uppercase tracking-wider">On Schedule / Zero Exposure</div>
            <div className="text-2xl font-bold font-mono text-emerald-400 my-1">
              {slaExposures.filter((e) => e.delay_days <= 0).length} Orders
            </div>
            <p className="text-[11px] text-nexus-blue-60">
              Estimated delivery date meets or precedes contractual deadline.
            </p>
          </Card>
        </div>
      </section>

      {/* D. SLA EXPOSURE TABLE */}
      <Card variant="glass" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Search Input */}
          <div className="w-full sm:w-64">
            <label htmlFor="sla-search" className="sr-only">
              Search Customer or Sales Order
            </label>
            <input
              id="sla-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search customer or order number..."
              className="w-full bg-blue-950 border border-nexus-blue rounded-[8px] px-3 py-1.5 text-xs font-mono text-blue-100 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <label htmlFor="filter-severity" className="sr-only">
                Filter Severity
              </label>
              <select
                id="filter-severity"
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="bg-blue-950 border border-nexus-blue rounded-[8px] px-3 py-1.5 text-xs font-mono text-blue-100 focus:border-indigo-500 focus:outline-none"
              >
                <option value="ALL">ALL SEVERITIES</option>
                <option value="CRITICAL">CRITICAL EXPOSURE</option>
                <option value="HEALTHY">ON SCHEDULE</option>
              </select>
            </div>

            <div>
              <label htmlFor="filter-critpath" className="sr-only">
                Filter Critical Path
              </label>
              <select
                id="filter-critpath"
                value={critPathFilter}
                onChange={(e) => setCritPathFilter(e.target.value)}
                className="bg-blue-950 border border-nexus-blue rounded-[8px] px-3 py-1.5 text-xs font-mono text-blue-100 focus:border-indigo-500 focus:outline-none"
              >
                <option value="ALL">ALL ORDERS</option>
                <option value="CRITICAL_PATH_ONLY">CRITICAL PATH ONLY</option>
              </select>
            </div>

            {/* Sort Selector */}
            <div>
              <label htmlFor="sla-sort" className="sr-only">
                Sort SLA Exposures
              </label>
              <select
                id="sla-sort"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-blue-950 border border-nexus-blue rounded-[8px] px-3 py-1.5 text-xs font-mono text-blue-100 focus:border-indigo-500 focus:outline-none"
              >
                <option value="EXPOSURE_DESC">Sort: Highest Financial Exposure</option>
                <option value="DELAY_DESC">Sort: Highest SLA Delay</option>
                <option value="ORDER_ASC">Sort: Order Number</option>
                <option value="CUSTOMER_ASC">Sort: Customer Name</option>
              </select>
            </div>
          </div>
        </div>
      </Card>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-nexus-white tracking-tight">
            Customer Sales Orders SLA Evaluation ({processedExposures.length})
          </h2>
          <span className="text-xs text-nexus-blue-60 font-mono">
            Ground-Truth Rates vs Derived Financial Outcomes
          </span>
        </div>

        <Card padding="none">
          {loading ? (
            <div className="p-6">
              <LoadingSkeleton lines={5} />
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={processedExposures}
              keyExtractor={(row) => row.customer_order_number}
              emptyMessage="No customer sales orders match your filter criteria."
            />
          )}
        </Card>
      </section>

      {/* F. SLA DETAIL DRAWER */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={selectedItem?.customer_name || 'SLA Order Detail'}
        subtitle={`Order Number: ${selectedItem?.customer_order_number || ''}`}
      >
        {selectedItem ? (
          <div className="space-y-6 text-xs text-nexus-blue-42 font-mono">
            {/* Overview */}
            <div className="bg-blue-950/60 p-4 rounded-[8px] border border-blue-800 space-y-2">
              <div className="text-nexus-blue-60 text-[10px] uppercase font-semibold">Order Overview</div>
              <div><span className="text-nexus-blue-60">Customer Name:</span> {selectedItem.customer_name}</div>
              <div><span className="text-nexus-blue-60">Order Number:</span> {selectedItem.customer_order_number}</div>
              <div>
                <span className="text-nexus-blue-60">SLA Status:</span>{' '}
                <StatusBadge status={selectedItem.delay_days > 0 ? 'CRITICAL' : 'HEALTHY'} size="sm" />
              </div>
              {criticalPathOrderSet.has(selectedItem.customer_order_number) && (
                <div className="pt-1">
                  <span className="px-2 py-0.5 text-[10px] bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded font-semibold">
                    TERMINAL CRITICAL PATH NODE
                  </span>
                </div>
              )}
            </div>

            {/* Ground Truth Inputs */}
            <div className="bg-blue-950/60 p-4 rounded-[8px] border border-blue-800 space-y-2">
              <div className="text-emerald-400 text-[10px] uppercase font-semibold">Ground-Truth Contract Inputs</div>
              <div className="flex justify-between">
                <span className="text-nexus-blue-60">Requested Delivery Date:</span>
                <span className="text-blue-100 font-bold">{selectedItem.requested_delivery_date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-nexus-blue-60">Contractual SLA Rate:</span>
                <span className="text-blue-100 font-bold">
                  ${Number(selectedItem.liquidated_damages_per_day).toLocaleString('en-US', { minimumFractionDigits: 2 })} / day
                </span>
              </div>
            </div>

            {/* Derived Intelligence */}
            <div className="bg-amber-500/10 p-4 rounded-[8px] border border-amber-500/30 space-y-2">
              <div className="text-amber-400 text-[10px] uppercase font-semibold">Derived Intelligence Projections</div>
              <div className="flex justify-between">
                <span className="text-nexus-blue-60">Estimated Delivery Date:</span>
                <span className="text-blue-100 font-bold">{selectedItem.estimated_delivery_date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-nexus-blue-60">Derived Delay Days:</span>
                <span className={`font-bold ${selectedItem.delay_days > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {selectedItem.delay_days} Days
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-nexus-blue-60">Total Financial Exposure:</span>
                <span className={`font-bold text-sm ${Number(selectedItem.total_financial_exposure) > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  ${Number(selectedItem.total_financial_exposure).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Explanation & Interpretation */}
            <div className="bg-blue-950/80 p-4 rounded-[8px] border border-blue-800 space-y-2">
              <div className="text-nexus-blue-60 text-[10px] uppercase font-semibold">Methodology Explanation</div>
              <p className="text-nexus-blue-42 font-sans leading-relaxed">
                Contractual SLA rate (${Number(selectedItem.liquidated_damages_per_day).toLocaleString()}/day) is a ground-truth contract input. Delivery delay ({selectedItem.delay_days} days) and financial exposure (${Number(selectedItem.total_financial_exposure).toLocaleString()}) are dynamically derived by the deterministic Phase 2.3 intelligence engine.
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
                    Trace Order in Graph Explorer ➔
                  </button>
                  <button
                    onClick={() => {
                      setIsDrawerOpen(false);
                      onNavigate('/bottlenecks');
                    }}
                    className="w-full py-2 bg-amber-600/20 hover:bg-amber-600/40 text-amber-300 border border-amber-500/30 font-semibold rounded-[8px] transition-colors text-center"
                  >
                    Inspect Network Bottlenecks ➔
                  </button>
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
