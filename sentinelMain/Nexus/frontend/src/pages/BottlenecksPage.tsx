import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Card } from '../components/ui/Card';
import { MetricCard } from '../components/ui/MetricCard';
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton';
import { ErrorState } from '../components/ui/ErrorState';
import { DataTable, Column } from '../components/ui/DataTable';
import { Drawer } from '../components/ui/Drawer';

import { fetchBottlenecks, fetchCriticalPaths } from '../services/api';
import { BottleneckItem, CriticalPathItem, PrimitiveType } from '../types/intelligence';

export interface BottlenecksPageProps {
  onNavigate?: (path: string) => void;
}

export const BottlenecksPage: React.FC<BottlenecksPageProps> = ({ onNavigate }) => {
  // Data State
  const [bottlenecks, setBottlenecks] = useState<BottleneckItem[]>([]);
  const [criticalPaths, setCriticalPaths] = useState<CriticalPathItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'SEVERITY_DESC' | 'CODE_ASC' | 'CATEGORY_ASC'>('SEVERITY_DESC');

  // Selected Bottleneck Drawer State
  const [selectedItem, setSelectedItem] = useState<BottleneckItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Load bottleneck intelligence from backend API
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [bottlenecksRes, pathsRes] = await Promise.allSettled([
        fetchBottlenecks(),
        fetchCriticalPaths('ENTITY:SUP-001'),
      ]);

      const bList = bottlenecksRes.status === 'fulfilled' ? bottlenecksRes.value : [];
      const pList = pathsRes.status === 'fulfilled' ? pathsRes.value : [];

      setBottlenecks(bList);
      setCriticalPaths(pList);
      setLoading(false);
      setLastUpdated(new Date());
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch bottleneck data from backend API';
      setError(msg);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Derived Critical Path Node Set
  const criticalPathNodeSet = useMemo(() => {
    const set = new Set<string>();
    criticalPaths.forEach((cp) => {
      if (cp.path) cp.path.forEach((nid) => set.add(nid));
    });
    return set;
  }, [criticalPaths]);

  // Dynamic Category Counts
  const categoryCounts = useMemo(() => {
    const map: Record<string, number> = {
      SINGLE_SOURCE_COMPONENT: 0,
      NEAR_CAPACITY_SUPPLIER: 0,
      HIGH_GRAPH_CENTRALITY: 0,
    };
    bottlenecks.forEach((b) => {
      map[b.bottleneck_type] = (map[b.bottleneck_type] || 0) + 1;
    });
    return map;
  }, [bottlenecks]);

  // Dynamic KPI Metrics
  const totalBottlenecks = bottlenecks.length;
  const highSeverityCount = bottlenecks.filter((b) => b.severity === 'HIGH' || b.severity === 'CRITICAL').length;
  const mediumSeverityCount = bottlenecks.filter((b) => b.severity === 'MEDIUM' || b.severity === 'MODERATE').length;
  const singleSourceCount = categoryCounts['SINGLE_SOURCE_COMPONENT'] || 0;

  // Filtered and Deterministically Sorted Bottlenecks
  const processedBottlenecks = useMemo(() => {
    let result = bottlenecks.filter((item) => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        item.business_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.node_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase());

      const itemPrimitive: PrimitiveType = item.node_id.startsWith('RESOURCE') ? 'RESOURCE' : 'ENTITY';
      const matchesType = typeFilter === 'ALL' || itemPrimitive === typeFilter;
      const matchesSeverity = severityFilter === 'ALL' || item.severity === severityFilter;
      const matchesCategory = categoryFilter === 'ALL' || item.bottleneck_type === categoryFilter;

      return matchesSearch && matchesType && matchesSeverity && matchesCategory;
    });

    // Deterministic Sorting
    result.sort((a, b) => {
      if (sortBy === 'SEVERITY_DESC') {
        const rank: Record<string, number> = { CRITICAL: 3, HIGH: 2, MEDIUM: 1, MODERATE: 1, LOW: 0 };
        const rankA = rank[a.severity] || 0;
        const rankB = rank[b.severity] || 0;
        if (rankA !== rankB) return rankB - rankA;
      } else if (sortBy === 'CATEGORY_ASC') {
        const catCompare = a.bottleneck_type.localeCompare(b.bottleneck_type);
        if (catCompare !== 0) return catCompare;
      }
      return a.business_code.localeCompare(b.business_code);
    });

    return result;
  }, [bottlenecks, searchQuery, typeFilter, severityFilter, categoryFilter, sortBy]);

  // Drawer Inspect Handler
  const handleInspect = (item: BottleneckItem) => {
    setSelectedItem(item);
    setIsDrawerOpen(true);
  };

  // DataTable Column Definitions
  const columns: Column<BottleneckItem>[] = [
    {
      header: 'Node ID / Code',
      accessor: (row) => {
        const isCritPath = criticalPathNodeSet.has(row.node_id);
        return (
          <div className="flex items-center gap-2">
            <div>
              <div className="font-mono text-xs font-bold text-[#38BDF8]">{row.business_code}</div>
              <div className="font-mono text-[10px] text-[#6F7B86]">{row.node_id}</div>
            </div>
            {isCritPath && (
              <span className="px-1.5 py-0.5 text-[9px] font-mono bg-[#F4C95D]/10 border border-[#F4C95D]/30 text-[#F4C95D] rounded font-bold">
                CRITICAL PATH
              </span>
            )}
          </div>
        );
      },
    },
    {
      header: 'Primitive Type',
      accessor: (row) => {
        const pType: PrimitiveType = row.node_id.startsWith('RESOURCE') ? 'RESOURCE' : 'ENTITY';
        return <StatusBadge status="info" label={pType} size="sm" />;
      },
    },
    {
      header: 'Bottleneck Category',
      accessor: (row) => (
        <span className="font-mono text-xs font-bold text-[#E8EDF2]">{row.bottleneck_type}</span>
      ),
    },
    {
      header: 'Severity',
      accessor: (row) => <StatusBadge status={row.severity} size="sm" pulse={row.severity === 'CRITICAL'} />,
    },
    {
      header: 'Detection Reason',
      accessor: (row) => <span className="text-xs text-[#AAB5BF]">{row.description}</span>,
    },
    {
      header: 'Actions',
      accessor: (row) => (
        <div className="flex items-center gap-2 font-mono">
          <button
            onClick={() => handleInspect(row)}
            className="px-2 py-1 bg-[#131920] hover:bg-[#171E26] text-[#E8EDF2] border border-[#27313A] text-xs font-bold rounded transition-colors"
          >
            INSPECT
          </button>
          {onNavigate && (
            <>
              <button
                onClick={() => onNavigate('/graph-viewer')}
                className="px-2 py-1 bg-[#38BDF8]/10 hover:bg-[#38BDF8]/20 text-[#38BDF8] border border-[#38BDF8]/30 text-xs font-bold rounded transition-colors"
              >
                GRAPH
              </button>
              <button
                onClick={() => onNavigate('/impact-workspace')}
                className="px-2 py-1 bg-[#D6FF4B]/10 hover:bg-[#D6FF4B]/20 text-[#D6FF4B] border border-[#D6FF4B]/30 text-xs font-bold rounded transition-colors"
              >
                ANALYZE
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 font-mono">
      {/* A. PAGE HEADER */}
      <PageHeader
        title="BOTTLENECK RADAR INTELLIGENCE"
        subtitle="Deterministic identification and prioritization of structural operational bottlenecks across the network."
        badge={<StatusBadge status="info" label="OPERATIONAL RADAR" />}
        actions={
          <div className="flex items-center gap-3">
            {lastUpdated && (
              <span className="text-xs text-[#6F7B86] font-mono hidden sm:inline-block">
                SYNC: {lastUpdated.toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={loadData}
              disabled={loading}
              className="px-3.5 py-1.5 bg-[#131920] hover:bg-[#171E26] border border-[#27313A] text-[#D6FF4B] text-xs font-bold rounded transition-colors duration-150 flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? 'REFRESHING...' : '🔄 REFRESH RADAR'}
            </button>
          </div>
        }
      />

      {/* ERROR STATE */}
      {error && (
        <ErrorState
          title="Bottleneck Intelligence Radar Error"
          message={error}
          onRetry={loadData}
        />
      )}

      {/* B. EXECUTIVE KPI STRIP */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          indexTag="01"
          title="TOTAL BOTTLENECKS"
          value={loading ? '...' : totalBottlenecks}
          subtext="Backend Threshold Triggers"
          highlightColor={totalBottlenecks > 0 ? 'rose' : 'emerald'}
        />

        <MetricCard
          indexTag="02"
          title="HIGH-SEVERITY TRIGGERS"
          value={loading ? '...' : highSeverityCount}
          subtext="Critical Single Sources"
          highlightColor={highSeverityCount > 0 ? 'rose' : 'neutral'}
        />

        <MetricCard
          indexTag="03"
          title="MEDIUM-SEVERITY TRIGGERS"
          value={loading ? '...' : mediumSeverityCount}
          subtext="High Centrality Nodes"
          highlightColor="amber"
        />

        <MetricCard
          indexTag="04"
          title="SINGLE-SOURCE COMPONENTS"
          value={loading ? '...' : singleSourceCount}
          subtext="Zero Catalog Substitutes"
          highlightColor={singleSourceCount > 0 ? 'rose' : 'emerald'}
        />
      </section>

      {/* C. BOTTLENECK RADAR INDEX CARDS */}
      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-nexus-blue font-extrabold">RADAR //</span>
          <h2 className="text-xs font-bold text-nexus-blue uppercase tracking-wider">STRUCTURAL BOTTLENECK RADAR INDEX</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card variant="solid" signalBorder="rose" className="bg-nexus-white border border-nexus-blue-20">
            <div className="flex justify-between items-start">
              <div className="text-xs font-bold text-[#D94B5B] uppercase">Single-Source Components</div>
              <span className="text-[10px] text-nexus-blue-60">CRITICALITY</span>
            </div>
            <div className="text-xl font-bold text-[#D94B5B] my-1 font-mono">
              {categoryCounts['SINGLE_SOURCE_COMPONENT'] || 0} POSITIONS
            </div>
            <div className="text-[10px] text-nexus-blue font-mono mb-1">
              CRITICALITY: ██████████ (100%)
            </div>
            <p className="text-[10px] text-nexus-blue-60">Resource components lacking catalog supplier substitutes.</p>
          </Card>

          <Card variant="solid" signalBorder="amber" className="bg-nexus-white border border-nexus-blue-20">
            <div className="flex justify-between items-start">
              <div className="text-xs font-bold text-nexus-blue uppercase">Near-Capacity Suppliers</div>
              <span className="text-[10px] text-nexus-blue-60">CRITICALITY</span>
            </div>
            <div className="text-xl font-bold text-nexus-blue my-1 font-mono">
              {categoryCounts['NEAR_CAPACITY_SUPPLIER'] || 0} SUPPLIERS
            </div>
            <div className="text-[10px] text-nexus-blue font-mono mb-1">
              CRITICALITY: ████████░░ (80%)
            </div>
            <p className="text-[10px] text-nexus-blue-60">Supplier entities operating at ≥ 90.0% capacity utilization.</p>
          </Card>

          <Card variant="solid" signalBorder="sky" className="bg-nexus-white border border-nexus-blue-20">
            <div className="flex justify-between items-start">
              <div className="text-xs font-bold text-nexus-blue uppercase">High Graph Centrality</div>
              <span className="text-[10px] text-nexus-blue-60">CRITICALITY</span>
            </div>
            <div className="text-xl font-bold text-nexus-blue my-1 font-mono">
              {categoryCounts['HIGH_GRAPH_CENTRALITY'] || 0} NODES
            </div>
            <div className="text-[10px] text-nexus-blue font-mono mb-1">
              CRITICALITY: ██████░░░░ (60%)
            </div>
            <p className="text-[10px] text-nexus-blue-60">Operational nodes with ≥ 5 outgoing dependency edges.</p>
          </Card>
        </div>
      </section>

      {/* D. FILTER & SEARCH TOOLBAR */}
      <Card variant="solid" className="bg-nexus-white border border-nexus-blue-20">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="w-full sm:w-64">
            <label htmlFor="bottleneck-search" className="sr-only">
              Search Bottlenecks
            </label>
            <input
              id="bottleneck-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search code or description..."
              className="w-full bg-nexus-white border border-nexus-blue-20 rounded px-3 py-1.5 text-xs font-mono text-nexus-blue focus:border-nexus-blue focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 font-mono">
            <div>
              <label htmlFor="filter-type" className="sr-only">Filter Primitive Type</label>
              <select
                id="filter-type"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="bg-[#131920] border border-[#27313A] rounded px-3 py-1.5 text-xs text-[#E8EDF2] focus:border-[#D6FF4B] focus:outline-none"
              >
                <option value="ALL">ALL TYPES</option>
                <option value="ENTITY">ENTITY</option>
                <option value="RESOURCE">RESOURCE</option>
              </select>
            </div>

            <div>
              <label htmlFor="filter-severity" className="sr-only">Filter Severity</label>
              <select
                id="filter-severity"
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="bg-[#131920] border border-[#27313A] rounded px-3 py-1.5 text-xs text-[#E8EDF2] focus:border-[#D6FF4B] focus:outline-none"
              >
                <option value="ALL">ALL SEVERITIES</option>
                <option value="HIGH">HIGH</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="CRITICAL">CRITICAL</option>
              </select>
            </div>

            <div>
              <label htmlFor="filter-category" className="sr-only">Filter Category</label>
              <select
                id="filter-category"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-[#131920] border border-[#27313A] rounded px-3 py-1.5 text-xs text-[#E8EDF2] focus:border-[#D6FF4B] focus:outline-none"
              >
                <option value="ALL">ALL CATEGORIES</option>
                <option value="SINGLE_SOURCE_COMPONENT">SINGLE SOURCE</option>
                <option value="NEAR_CAPACITY_SUPPLIER">NEAR CAPACITY</option>
                <option value="HIGH_GRAPH_CENTRALITY">HIGH CENTRALITY</option>
              </select>
            </div>

            <div>
              <label htmlFor="sort-by" className="sr-only">Sort By</label>
              <select
                id="sort-by"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-[#131920] border border-[#27313A] rounded px-3 py-1.5 text-xs text-[#E8EDF2] focus:border-[#D6FF4B] focus:outline-none"
              >
                <option value="SEVERITY_DESC">Sort: Severity (High → Low)</option>
                <option value="CODE_ASC">Sort: Business Code (A → Z)</option>
                <option value="CATEGORY_ASC">Sort: Category</option>
              </select>
            </div>
          </div>
        </div>
      </Card>

      {/* E. MAIN BOTTLENECK TABLE */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-[#E8EDF2] uppercase tracking-wider">
            DETECTED RADAR BOTTLENECKS ({processedBottlenecks.length})
          </h2>
          <span className="text-xs text-[#6F7B86] font-mono">
            Showing {processedBottlenecks.length} of {totalBottlenecks} items
          </span>
        </div>

        <Card padding="none" className="bg-nexus-white">
          {loading ? (
            <div className="p-6">
              <LoadingSkeleton lines={6} />
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={processedBottlenecks}
              keyExtractor={(row) => row.bottleneck_id}
              emptyMessage="No structural network bottlenecks match your filter criteria."
            />
          )}
        </Card>
      </section>

      {/* F. BOTTLENECK DETAILS DRAWER */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={selectedItem?.business_code || 'Bottleneck Detail'}
        subtitle={`ID: ${selectedItem?.bottleneck_id || ''}`}
      >
        {selectedItem ? (
          <div className="space-y-4 text-xs text-[#E8EDF2] font-mono">
            <div className="bg-[#131920] p-3 rounded border border-[#27313A] space-y-2">
              <div className="text-[#6F7B86] text-[10px] uppercase font-bold">Node Overview</div>
              <div><span className="text-[#6F7B86]">Node ID:</span> {selectedItem.node_id}</div>
              <div><span className="text-[#6F7B86]">Business Code:</span> {selectedItem.business_code}</div>
              <div>
                <span className="text-[#6F7B86]">Severity:</span> <StatusBadge status={selectedItem.severity} size="sm" />
              </div>
              {criticalPathNodeSet.has(selectedItem.node_id) && (
                <div className="pt-1">
                  <span className="px-2 py-0.5 text-[10px] bg-[#F4C95D]/10 border border-[#F4C95D]/30 text-[#F4C95D] rounded font-bold">
                    PART OF CRITICAL PATH
                  </span>
                </div>
              )}
            </div>

            <div className="bg-[#131920] p-3 rounded border border-[#27313A] space-y-2">
              <div className="text-[#6F7B86] text-[10px] uppercase font-bold">Detection Reason</div>
              <div className="text-[#E8EDF2] font-bold">{selectedItem.bottleneck_type}</div>
              <p className="text-[#AAB5BF] leading-relaxed font-mono text-[11px]">{selectedItem.description}</p>
            </div>

            <div className="bg-[#D6FF4B]/10 p-3 rounded border border-[#D6FF4B]/30 space-y-1">
              <div className="text-[#D6FF4B] text-[10px] uppercase font-bold">Recommended Radar Investigation</div>
              <p className="text-[#AAB5BF] font-mono text-[11px]">
                Trace this primitive node through the operational dependency graph to inspect downstream customer SLA exposure, or run a hypothetical disruption analysis.
              </p>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              {onNavigate && (
                <>
                  <button
                    onClick={() => {
                      setIsDrawerOpen(false);
                      onNavigate('/graph-viewer');
                    }}
                    className="w-full py-2 bg-[#4F46E5] hover:bg-[#4338CA] text-nexus-white font-bold rounded transition-colors text-center"
                  >
                    Trace in Graph Twin ➔
                  </button>
                  <button
                    onClick={() => {
                      setIsDrawerOpen(false);
                      onNavigate('/impact-workspace');
                    }}
                    className="w-full py-2 bg-[#131920] hover:bg-[#171E26] text-[#E8EDF2] font-bold rounded transition-colors text-center border border-[#27313A]"
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
