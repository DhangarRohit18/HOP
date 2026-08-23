import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Card } from '../components/ui/Card';
import { LoadingSkeleton } from '../components/ui/LoadingSkeleton';
import { ErrorState } from '../components/ui/ErrorState';
import { Drawer } from '../components/ui/Drawer';

import {
  fetchBottlenecks,
  fetchInventoryRisk,
  fetchNodeGraph,
  fetchNodeDependencies,
} from '../services/api';

import {
  BottleneckItem,
  InventoryRiskItem,
  NodeGraphResponse,
  NodeDependenciesResponse,
  PrimitiveType,
} from '../types/intelligence';

export interface GraphNode {
  id: string;
  code: string;
  type: PrimitiveType;
  x: number;
  y: number;
  severity: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  isBottleneck: boolean;
  bottleneckType?: string;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  leadTimeHours?: number;
  isCriticalPath?: boolean;
}

export const GraphViewerPage: React.FC = () => {
  // Graph State
  const [bottlenecks, setBottlenecks] = useState<BottleneckItem[]>([]);
  const [inventoryRisks, setInventoryRisks] = useState<InventoryRiskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Interaction State
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [traceMode, setTraceMode] = useState<'NONE' | 'CRITICAL_PATH' | 'BOTTLENECKS' | 'UPSTREAM' | 'DOWNSTREAM'>('NONE');
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);

  // Custom node positions state
  const [customLayouts, setCustomLayouts] = useState<Record<string, { x: number; y: number }>>(() => ({
    'ENTITY:SUP-001': { x: 90, y: 260 },
    'ENTITY:PO-2026-001': { x: 230, y: 260 },
    'ENTITY:SHP-2026-001': { x: 380, y: 260 },
    'RESOURCE:CMP-001': { x: 530, y: 260 },
    'ENTITY:PRD-2026-001': { x: 680, y: 260 },
    'ENTITY:SO-2026-001': { x: 830, y: 260 },
    'ENTITY:SUP-002': { x: 90, y: 120 },
    'RESOURCE:CMP-002': { x: 530, y: 120 },
    'ENTITY:SO-2026-002': { x: 830, y: 120 },
    'ENTITY:SUP-003': { x: 90, y: 400 },
    'RESOURCE:CMP-003': { x: 530, y: 400 },
  }));

  // Selected Node Drawer State
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [nodeDetail, setNodeDetail] = useState<NodeGraphResponse | null>(null);
  const [nodeDeps, setNodeDeps] = useState<NodeDependenciesResponse | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Load initial backend graph intelligence
  const loadGraphIntelligence = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [bottlenecksRes, invRes] = await Promise.allSettled([
        fetchBottlenecks(),
        fetchInventoryRisk(),
      ]);

      const botts = bottlenecksRes.status === 'fulfilled' ? bottlenecksRes.value : [];
      const invs = invRes.status === 'fulfilled' && invRes.value ? invRes.value.items : [];

      setBottlenecks(botts);
      setInventoryRisks(invs);
      setLoading(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch graph data from backend API';
      setError(msg);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGraphIntelligence();
  }, [loadGraphIntelligence]);

  // Deterministic Graph Construction & Layout
  const { nodes, edges } = useMemo(() => {
    const nodeMap: Map<string, GraphNode> = new Map();
    const edgeList: GraphEdge[] = [];

    const nodeLayouts: Record<string, { x: number; y: number; code: string; type: PrimitiveType }> = {
      'ENTITY:SUP-001': { x: customLayouts['ENTITY:SUP-001']?.x ?? 90, y: customLayouts['ENTITY:SUP-001']?.y ?? 260, code: 'SUP-001', type: 'ENTITY' },
      'ENTITY:PO-2026-001': { x: customLayouts['ENTITY:PO-2026-001']?.x ?? 230, y: customLayouts['ENTITY:PO-2026-001']?.y ?? 260, code: 'PO-2026-001', type: 'ENTITY' },
      'ENTITY:SHP-2026-001': { x: customLayouts['ENTITY:SHP-2026-001']?.x ?? 380, y: customLayouts['ENTITY:SHP-2026-001']?.y ?? 260, code: 'SHP-2026-001', type: 'ENTITY' },
      'RESOURCE:CMP-001': { x: customLayouts['RESOURCE:CMP-001']?.x ?? 530, y: customLayouts['RESOURCE:CMP-001']?.y ?? 260, code: 'CMP-001', type: 'RESOURCE' },
      'ENTITY:PRD-2026-001': { x: customLayouts['ENTITY:PRD-2026-001']?.x ?? 680, y: customLayouts['ENTITY:PRD-2026-001']?.y ?? 260, code: 'PRD-2026-001', type: 'ENTITY' },
      'ENTITY:SO-2026-001': { x: customLayouts['ENTITY:SO-2026-001']?.x ?? 830, y: customLayouts['ENTITY:SO-2026-001']?.y ?? 260, code: 'SO-2026-001', type: 'ENTITY' },
      'ENTITY:SUP-002': { x: customLayouts['ENTITY:SUP-002']?.x ?? 90, y: customLayouts['ENTITY:SUP-002']?.y ?? 120, code: 'SUP-002', type: 'ENTITY' },
      'RESOURCE:CMP-002': { x: customLayouts['RESOURCE:CMP-002']?.x ?? 530, y: customLayouts['RESOURCE:CMP-002']?.y ?? 120, code: 'CMP-002', type: 'RESOURCE' },
      'ENTITY:SO-2026-002': { x: customLayouts['ENTITY:SO-2026-002']?.x ?? 830, y: customLayouts['ENTITY:SO-2026-002']?.y ?? 120, code: 'SO-2026-002', type: 'ENTITY' },
      'ENTITY:SUP-003': { x: customLayouts['ENTITY:SUP-003']?.x ?? 90, y: customLayouts['ENTITY:SUP-003']?.y ?? 400, code: 'SUP-003', type: 'ENTITY' },
      'RESOURCE:CMP-003': { x: customLayouts['RESOURCE:CMP-003']?.x ?? 530, y: customLayouts['RESOURCE:CMP-003']?.y ?? 400, code: 'RESOURCE:CMP-003', type: 'RESOURCE' },
    };

    const goldenChain = [
      'ENTITY:SUP-001',
      'ENTITY:PO-2026-001',
      'ENTITY:SHP-2026-001',
      'RESOURCE:CMP-001',
      'ENTITY:PRD-2026-001',
      'ENTITY:SO-2026-001',
    ];

    for (let i = 0; i < goldenChain.length - 1; i++) {
      edgeList.push({
        id: `e-golden-${i}`,
        source: goldenChain[i],
        target: goldenChain[i + 1],
        isCriticalPath: true,
      });
    }

    edgeList.push(
      { id: 'e-sub-1', source: 'ENTITY:SUP-002', target: 'RESOURCE:CMP-002' },
      { id: 'e-sub-2', source: 'RESOURCE:CMP-002', target: 'ENTITY:PRD-2026-001' },
      { id: 'e-sub-3', source: 'ENTITY:PRD-2026-001', target: 'ENTITY:SO-2026-002' },
      { id: 'e-sub-4', source: 'ENTITY:SUP-003', target: 'RESOURCE:CMP-003' },
      { id: 'e-sub-5', source: 'RESOURCE:CMP-003', target: 'ENTITY:PRD-2026-001' }
    );

    const bottleneckMap = new Map<string, string>();
    bottlenecks.forEach((b) => bottleneckMap.set(b.node_id, b.bottleneck_type));

    const invRiskMap = new Map<string, string>();
    inventoryRisks.forEach((inv) => {
      if (inv.risk_classification === 'CRITICAL' || inv.risk_classification === 'MODERATE') {
        invRiskMap.set(`RESOURCE:${inv.part_number}`, inv.risk_classification);
      }
    });

    Object.entries(nodeLayouts).forEach(([id, meta]) => {
      let severity: 'HEALTHY' | 'WARNING' | 'CRITICAL' = 'HEALTHY';
      const isBottleneck = bottleneckMap.has(id);

      if (id === 'ENTITY:SUP-001' || id === 'RESOURCE:CMP-001' || invRiskMap.has(id)) {
        severity = 'CRITICAL';
      } else if (isBottleneck) {
        severity = 'WARNING';
      }

      nodeMap.set(id, {
        id,
        code: meta.code,
        type: meta.type,
        x: meta.x,
        y: meta.y,
        severity,
        isBottleneck,
        bottleneckType: bottleneckMap.get(id),
      });
    });

    return {
      nodes: Array.from(nodeMap.values()),
      edges: edgeList,
    };
  }, [bottlenecks, inventoryRisks, customLayouts]);

  // Filtered Nodes
  const filteredNodes = useMemo(() => {
    return nodes.filter((n) => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        n.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.id.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesType = typeFilter === 'ALL' || n.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [nodes, searchQuery, typeFilter]);

  const filteredNodeIds = useMemo(() => new Set(filteredNodes.map((n) => n.id)), [filteredNodes]);

  // Fetch node deep dive details on node selection
  const handleSelectNode = async (nodeId: string) => {
    setSelectedNodeId(nodeId);
    setIsDrawerOpen(true);
    setDrawerLoading(true);

    try {
      const [nodeType, cleanId] = nodeId.includes(':') ? nodeId.split(':') : ['ENTITY', nodeId];
      const [detailRes, depsRes] = await Promise.allSettled([
        fetchNodeGraph(nodeType, cleanId),
        fetchNodeDependencies(nodeType, cleanId),
      ]);

      if (detailRes.status === 'fulfilled') setNodeDetail(detailRes.value);
      if (depsRes.status === 'fulfilled') setNodeDeps(depsRes.value);
      setDrawerLoading(false);
    } catch (err) {
      setDrawerLoading(false);
    }
  };

  // Upstream / Downstream Neighbor sets for selected node
  const activeNeighbors = useMemo(() => {
    if (!selectedNodeId) return { upstream: new Set<string>(), downstream: new Set<string>() };

    const upstream = new Set<string>();
    const downstream = new Set<string>();

    edges.forEach((e) => {
      if (e.target === selectedNodeId) upstream.add(e.source);
      if (e.source === selectedNodeId) downstream.add(e.target);
    });

    return { upstream, downstream };
  }, [selectedNodeId, edges]);

  // Drag Event Handlers
  const handleNodeMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    e.preventDefault();
    setDraggingNodeId(id);
  };

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!draggingNodeId) return;
    
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    
    // Convert client mouse coordinates to relative percentages inside the SVG viewBox coordinates
    const x = ((e.clientX - rect.left) / rect.width) * 920;
    const y = ((e.clientY - rect.top) / rect.height) * 520;
    
    setCustomLayouts((prev) => ({
      ...prev,
      [draggingNodeId]: {
        x: Math.round(Math.max(40, Math.min(880, x))),
        y: Math.round(Math.max(20, Math.min(500, y))),
      },
    }));
  }, [draggingNodeId]);

  const handleMouseUp = useCallback(() => {
    setDraggingNodeId(null);
  }, []);

  // View control handlers
  const handleZoomIn = () => setZoomLevel((z) => Math.min(2.0, z + 0.2));
  const handleZoomOut = () => setZoomLevel((z) => Math.max(0.5, z - 0.2));
  const handleResetView = () => {
    setZoomLevel(1.0);
    setPanOffset({ x: 0, y: 0 });
    setSelectedNodeId(null);
    setTraceMode('NONE');
    setSearchQuery('');
    setTypeFilter('ALL');
    setCustomLayouts({
      'ENTITY:SUP-001': { x: 90, y: 260 },
      'ENTITY:PO-2026-001': { x: 230, y: 260 },
      'ENTITY:SHP-2026-001': { x: 380, y: 260 },
      'RESOURCE:CMP-001': { x: 530, y: 260 },
      'ENTITY:PRD-2026-001': { x: 680, y: 260 },
      'ENTITY:SO-2026-001': { x: 830, y: 260 },
      'ENTITY:SUP-002': { x: 90, y: 120 },
      'RESOURCE:CMP-002': { x: 530, y: 120 },
      'ENTITY:SO-2026-002': { x: 830, y: 120 },
      'ENTITY:SUP-003': { x: 90, y: 400 },
      'RESOURCE:CMP-003': { x: 530, y: 400 },
    });
  };

  return (
    <div className="space-y-6 font-mono">
      {/* A. PAGE HEADER */}
      <PageHeader
        title="DIGITAL TWIN GRAPH EXPLORER"
        subtitle="Explore deterministic supply network relationships, active propagation flows, and critical path nodes."
        badge={<StatusBadge status="info" label="DIGITAL TWIN ONLINE" />}
        actions={
          <div className="flex items-center gap-3 font-mono">
            <button
              onClick={handleResetView}
              className="px-3 py-1.5 bg-[#131920] hover:bg-[#171E26] border border-[#27313A] text-[#E8EDF2] text-xs font-bold rounded transition-colors"
            >
              RESET VIEW
            </button>
            <button
              onClick={loadGraphIntelligence}
              disabled={loading}
              className="px-3.5 py-1.5 bg-nexus-blue hover:bg-[#7040E5] text-nexus-white text-xs font-bold rounded transition-colors duration-150 flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? 'REFRESHING...' : '🔄 REFRESH TWIN'}
            </button>
          </div>
        }
      />

      {/* B. GRAPH TOOLBAR */}
      <Card variant="solid" className="bg-nexus-white border border-nexus-blue-20 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 font-mono">
            <div className="w-56">
              <label htmlFor="graph-search" className="sr-only">
                Search Graph
              </label>
              <input
                id="graph-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search code or ID (e.g. SUP-001)..."
                className="w-full bg-nexus-white border border-nexus-blue-20 rounded px-3 py-1.5 text-xs text-nexus-blue focus:border-nexus-blue focus:outline-none"
              />
            </div>

            <div>
              <label htmlFor="type-filter" className="sr-only">Filter Primitive Type</label>
              <select
                id="type-filter"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="bg-nexus-white border border-nexus-blue-20 rounded px-3 py-1.5 text-xs text-nexus-blue focus:border-nexus-blue focus:outline-none"
              >
                <option value="ALL">ALL TYPES</option>
                <option value="ENTITY">ENTITY</option>
                <option value="RESOURCE">RESOURCE</option>
              </select>
            </div>
          </div>

          {/* Trace Mode Toggles */}
          <div className="flex flex-wrap items-center gap-2 font-mono">
            <button
              onClick={() => setTraceMode(traceMode === 'CRITICAL_PATH' ? 'NONE' : 'CRITICAL_PATH')}
              className={`px-2.5 py-1 rounded text-xs font-bold border transition-colors ${
                traceMode === 'CRITICAL_PATH'
                  ? 'bg-[#FFFBD1] border-[#F0E100] text-nexus-blue'
                  : 'bg-nexus-white border-nexus-blue-20 text-nexus-blue-60 hover:bg-nexus-blue-06'
              }`}
            >
              CRITICAL PATH
            </button>

            <button
              onClick={() => setTraceMode(traceMode === 'BOTTLENECKS' ? 'NONE' : 'BOTTLENECKS')}
              className={`px-2.5 py-1 rounded text-xs font-bold border transition-colors ${
                traceMode === 'BOTTLENECKS'
                  ? 'bg-[#FFEBEE] border-[#FFCDD2] text-[#C62828]'
                  : 'bg-nexus-white border-nexus-blue-20 text-nexus-blue-60 hover:bg-nexus-blue-06'
              }`}
            >
              BOTTLENECKS ({bottlenecks.length})
            </button>

            <button
              onClick={() => setTraceMode(traceMode === 'UPSTREAM' ? 'NONE' : 'UPSTREAM')}
              disabled={!selectedNodeId}
              className={`px-2.5 py-1 rounded text-xs font-bold border transition-colors disabled:opacity-40 ${
                traceMode === 'UPSTREAM'
                  ? 'bg-nexus-blue-06 border-nexus-blue text-nexus-blue'
                  : 'bg-nexus-white border-nexus-blue-20 text-nexus-blue-60 hover:bg-nexus-blue-06'
              }`}
            >
              UPSTREAM
            </button>

            <button
              onClick={() => setTraceMode(traceMode === 'DOWNSTREAM' ? 'NONE' : 'DOWNSTREAM')}
              disabled={!selectedNodeId}
              className={`px-2.5 py-1 rounded text-xs font-bold border transition-colors disabled:opacity-40 ${
                traceMode === 'DOWNSTREAM'
                  ? 'bg-nexus-blue-06 border-nexus-blue text-nexus-blue'
                  : 'bg-nexus-white border-nexus-blue-20 text-nexus-blue-60 hover:bg-nexus-blue-06'
              }`}
            >
              DOWNSTREAM
            </button>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center gap-1 font-mono text-xs text-nexus-blue-60">
            <button
              onClick={handleZoomOut}
              aria-label="Zoom Out"
              className="w-6 h-6 bg-nexus-white border border-nexus-blue-20 rounded hover:bg-nexus-blue-06 flex items-center justify-center font-bold"
            >
              -
            </button>
            <span className="w-12 text-center text-nexus-blue font-bold">{Math.round(zoomLevel * 100)}%</span>
            <button
              onClick={handleZoomIn}
              aria-label="Zoom In"
              className="w-6 h-6 bg-nexus-white border border-nexus-blue-20 rounded hover:bg-nexus-blue-06 flex items-center justify-center font-bold"
            >
              +
            </button>
          </div>
        </div>
      </Card>

      {/* ERROR / LOADING STATES */}
      {error && (
        <ErrorState
          title="Dependency Graph Engine Unavailable"
          message={error}
          onRetry={loadGraphIntelligence}
        />
      )}

      {loading && (
        <Card variant="solid" className="p-8 bg-nexus-white border border-nexus-blue-20">
          <LoadingSkeleton lines={5} height="h-16" />
        </Card>
      )}

      {/* C. NATIVE SVG GRAPH CANVAS */}
      {!loading && !error && (
        <div className="rounded-2xl overflow-hidden border border-cyan-900 shadow-[0_0_60px_rgba(6,182,212,0.15),0_0_120px_rgba(99,102,241,0.08)] relative">
          {/* Scanline overlay */}
          <div
            className="absolute inset-0 z-10 pointer-events-none"
            style={{
              background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px)',
            }}
          />
          <svg
            className="w-full h-[580px] cursor-grab active:cursor-grabbing select-none"
            viewBox="0 0 920 580"
            style={{
              background: 'radial-gradient(ellipse at 30% 40%, rgba(6,182,212,0.06) 0%, rgba(99,102,241,0.05) 40%, #030712 70%)',
              transform: `scale(${zoomLevel}) translate(${panOffset.x}px, ${panOffset.y}px)`,
              transformOrigin: 'center center',
              transition: 'transform 0.2s ease-out',
            }}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <defs>
              {/* Filters */}
              <filter id="neon-cyan" x="-60%" y="-60%" width="220%" height="220%">
                <feGaussianBlur stdDeviation="6" result="blur1" />
                <feGaussianBlur stdDeviation="12" result="blur2" />
                <feMerge><feMergeNode in="blur2" /><feMergeNode in="blur1" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              <filter id="neon-red" x="-60%" y="-60%" width="220%" height="220%">
                <feGaussianBlur stdDeviation="8" result="blur1" />
                <feMerge><feMergeNode in="blur1" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              <filter id="neon-amber" x="-60%" y="-60%" width="220%" height="220%">
                <feGaussianBlur stdDeviation="6" result="blur1" />
                <feMerge><feMergeNode in="blur1" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              <filter id="neon-violet" x="-60%" y="-60%" width="220%" height="220%">
                <feGaussianBlur stdDeviation="10" result="blur1" />
                <feMerge><feMergeNode in="blur1" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              <filter id="edge-glow" x="-30%" y="-300%" width="160%" height="700%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>

              {/* Gradients */}
              <radialGradient id="node-healthy" cx="50%" cy="35%" r="60%">
                <stop offset="0%" stopColor="#22D3EE" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#0E7490" stopOpacity="0.05" />
              </radialGradient>
              <radialGradient id="node-critical" cx="50%" cy="35%" r="60%">
                <stop offset="0%" stopColor="#EF4444" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#7F1D1D" stopOpacity="0.1" />
              </radialGradient>
              <radialGradient id="node-warning" cx="50%" cy="35%" r="60%">
                <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#78350F" stopOpacity="0.08" />
              </radialGradient>
              <radialGradient id="node-selected" cx="50%" cy="35%" r="60%">
                <stop offset="0%" stopColor="#818CF8" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#3730A3" stopOpacity="0.1" />
              </radialGradient>
              <linearGradient id="edge-critical" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.9" />
                <stop offset="50%" stopColor="#A78BFA" stopOpacity="1" />
                <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.9" />
              </linearGradient>
              <linearGradient id="edge-normal" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#1E40AF" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.4" />
              </linearGradient>

              {/* Grid dot pattern */}
              <pattern id="neo-grid" width="50" height="50" patternUnits="userSpaceOnUse">
                <circle cx="0" cy="0" r="1" fill="#06B6D4" opacity="0.4" />
                <circle cx="50" cy="0" r="1" fill="#06B6D4" opacity="0.4" />
                <circle cx="0" cy="50" r="1" fill="#06B6D4" opacity="0.4" />
                <line x1="0" y1="0" x2="50" y2="0" stroke="#0EA5E9" strokeWidth="0.3" opacity="0.12" />
                <line x1="0" y1="0" x2="0" y2="50" stroke="#0EA5E9" strokeWidth="0.3" opacity="0.12" />
              </pattern>

              {/* Arrow Markers */}
              <marker id="arrow-active" viewBox="0 0 10 10" refX="26" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 1 L 9 5 L 0 9 z" fill="#A78BFA" />
              </marker>
              <marker id="arrow-normal" viewBox="0 0 10 10" refX="26" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                <path d="M 0 1 L 9 5 L 0 9 z" fill="#3B82F6" />
              </marker>
            </defs>

            {/* Background dot-grid */}
            <rect width="920" height="580" fill="url(#neo-grid)" />

            {/* Ambient corner accents */}
            <circle cx="0" cy="0" r="200" fill="none" stroke="#06B6D4" strokeWidth="0.5" opacity="0.08" />
            <circle cx="920" cy="580" r="200" fill="none" stroke="#818CF8" strokeWidth="0.5" opacity="0.08" />
            <circle cx="460" cy="290" r="350" fill="none" stroke="#0EA5E9" strokeWidth="0.4" opacity="0.05" />

            {/* ── EDGES ─────────────────────────────────────────── */}
            {edges.map((edge) => {
              const src = nodes.find((n) => n.id === edge.source);
              const tgt = nodes.find((n) => n.id === edge.target);
              if (!src || !tgt) return null;

              const isActive =
                (traceMode === 'CRITICAL_PATH' && edge.isCriticalPath) ||
                (selectedNodeId && (edge.source === selectedNodeId || edge.target === selectedNodeId));

              const mx = (src.x + tgt.x) / 2;
              const my = (src.y + tgt.y) / 2 - 30;
              const curvePath = `M ${src.x} ${src.y} Q ${mx} ${my} ${tgt.x} ${tgt.y}`;

              return (
                <g key={edge.id}>
                  {/* Outer aurora glow */}
                  {isActive && (
                    <path
                      d={curvePath}
                      fill="none"
                      stroke={edge.isCriticalPath ? '#A78BFA' : '#38BDF8'}
                      strokeWidth="8"
                      opacity="0.18"
                      filter="url(#edge-glow)"
                    />
                  )}
                  {/* Core edge line */}
                  <path
                    d={curvePath}
                    fill="none"
                    stroke={isActive ? 'url(#edge-critical)' : 'url(#edge-normal)'}
                    strokeWidth={isActive ? 2.5 : 1.2}
                    strokeDasharray={edge.isCriticalPath ? '8 4' : 'none'}
                    markerEnd={isActive ? 'url(#arrow-active)' : 'url(#arrow-normal)'}
                    opacity={isActive ? 1 : 0.55}
                  />
                  {/* Animated particle pulse */}
                  {isActive && (
                    <>
                      <circle r="4" fill="#A78BFA" filter="url(#neon-violet)" opacity="0.95">
                        <animateMotion path={curvePath} dur="1.6s" repeatCount="indefinite" />
                      </circle>
                      <circle r="2.5" fill="#E0F2FE" opacity="0.8">
                        <animateMotion path={curvePath} dur="1.6s" begin="0.5s" repeatCount="indefinite" />
                      </circle>
                    </>
                  )}
                  {!isActive && (
                    <circle r="2.5" fill="#38BDF8" opacity="0.5">
                      <animateMotion path={curvePath} dur="3s" repeatCount="indefinite" />
                    </circle>
                  )}
                </g>
              );
            })}

            {/* ── NODES ─────────────────────────────────────────── */}
            {nodes.map((node) => {
              const isSelected = selectedNodeId === node.id;
              const isFilteredOut = !filteredNodeIds.has(node.id);
              const isUpstream = activeNeighbors.upstream.has(node.id);
              const isDownstream = activeNeighbors.downstream.has(node.id);

              let neonColor = '#22D3EE';      // cyan – healthy
              let strokeW = '1.5';
              let nodeGrad = 'url(#node-healthy)';
              let filterRef = 'url(#neon-cyan)';
              let textFill = '#67E8F9';

              if (node.severity === 'CRITICAL') {
                neonColor = '#F87171'; nodeGrad = 'url(#node-critical)'; filterRef = 'url(#neon-red)'; textFill = '#FCA5A5';
              } else if (node.severity === 'WARNING') {
                neonColor = '#FBBF24'; nodeGrad = 'url(#node-warning)'; filterRef = 'url(#neon-amber)'; textFill = '#FDE68A';
              }
              if (isSelected) {
                neonColor = '#A78BFA'; nodeGrad = 'url(#node-selected)'; filterRef = 'url(#neon-violet)'; textFill = '#C4B5FD'; strokeW = '2.5';
              } else if (isUpstream || isDownstream) {
                neonColor = '#38BDF8'; textFill = '#BAE6FD';
              }

              // Hexagon path (pointy-top, 36×36 radius)
              const R = 38;
              const hex = Array.from({ length: 6 }, (_, i) => {
                const a = (Math.PI / 3) * i - Math.PI / 6;
                return `${(R * Math.cos(a)).toFixed(2)},${(R * Math.sin(a)).toFixed(2)}`;
              }).join(' ');
              const hexPath = `M ${hex} Z`;

              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  onClick={() => handleSelectNode(node.id)}
                  onMouseDown={(e) => handleNodeMouseDown(e, node.id)}
                  className="cursor-pointer select-none"
                  opacity={isFilteredOut ? 0.15 : 1}
                  style={{ transition: 'opacity 0.3s' }}
                >
                  {/* Outer glow ring */}
                  <polygon
                    points={Array.from({ length: 6 }, (_, i) => {
                      const a = (Math.PI / 3) * i - Math.PI / 6;
                      return `${((R + 10) * Math.cos(a)).toFixed(2)},${((R + 10) * Math.sin(a)).toFixed(2)}`;
                    }).join(' ')}
                    fill="none"
                    stroke={neonColor}
                    strokeWidth="1"
                    opacity="0.2"
                    filter={filterRef}
                  />

                  {/* Rotating orbital ring for selected */}
                  {isSelected && (
                    <ellipse cx="0" cy="0" rx={R + 18} ry="12" fill="none" stroke="#A78BFA" strokeWidth="1.5" strokeDasharray="6 4" opacity="0.7" filter="url(#neon-violet)">
                      <animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="4s" repeatCount="indefinite" />
                    </ellipse>
                  )}

                  {/* Pulsing outer ring for critical */}
                  {node.severity === 'CRITICAL' && (
                    <polygon
                      points={hex}
                      fill="none"
                      stroke="#F87171"
                      strokeWidth="2"
                      opacity="0"
                      filter="url(#neon-red)"
                    >
                      <animate attributeName="opacity" values="0;0.7;0" dur="1.8s" repeatCount="indefinite" />
                      <animateTransform attributeName="transform" type="scale" values="1;1.15;1" dur="1.8s" repeatCount="indefinite" />
                    </polygon>
                  )}

                  {/* Hexagon fill + neon border */}
                  <path d={hexPath} fill={nodeGrad} stroke={neonColor} strokeWidth={strokeW} filter={filterRef} />

                  {/* Inner dark fill for contrast */}
                  <path
                    d={Array.from({ length: 6 }, (_, i) => {
                      const a = (Math.PI / 3) * i - Math.PI / 6;
                      const r = R - 3;
                      return `${(r * Math.cos(a)).toFixed(2)},${(r * Math.sin(a)).toFixed(2)}`;
                    }).join(' ')}
                    fill="#060C1A"
                    opacity="0.7"
                  />

                  {/* Node type label */}
                  <text x="0" y="-12" textAnchor="middle" fill="#E2E8F0" fontSize="7" fontFamily="monospace" fontWeight="bold" letterSpacing="1" style={{ textShadow: '0px 1px 2px rgba(0,0,0,0.8)' }}>
                    {node.type}
                  </text>

                  {/* Node code — main label */}
                  <text x="0" y="4" textAnchor="middle" fill="#FFFFFF" fontSize="11" fontFamily="monospace" fontWeight="900" letterSpacing="0.5" style={{ textShadow: '0px 2px 4px rgba(0,0,0,0.9)' }}>
                    {node.code}
                  </text>

                  {/* Severity badge dot */}
                  <circle cx={R - 6} cy={-(R - 6)} r="6" fill={node.severity === 'CRITICAL' ? '#EF4444' : node.severity === 'WARNING' ? '#F59E0B' : '#10B981'} filter={filterRef} />
                  <circle cx={R - 6} cy={-(R - 6)} r="3" fill="white" opacity="0.5" />

                  {/* Bottleneck marker */}
                  {node.isBottleneck && (
                    <text x={R - 6} y={-(R - 14)} textAnchor="middle" fill="#FCD34D" fontSize="9" fontWeight="900" filter="url(#neon-amber)">!</text>
                  )}
                </g>
              );
            })}

            {/* Legend */}
            <g transform="translate(16, 530)">
              <rect x="-4" y="-14" width="310" height="42" rx="6" fill="#030712" opacity="0.75" stroke="#1E293B" strokeWidth="0.8" />
              {[
                { color: '#22D3EE', label: 'Healthy Node', fx: 'url(#neon-cyan)' },
                { color: '#F87171', label: 'Critical Risk', fx: 'url(#neon-red)' },
                { color: '#FBBF24', label: 'Warning', fx: 'url(#neon-amber)' },
                { color: '#A78BFA', label: 'Selected', fx: 'url(#neon-violet)' },
              ].map((item, i) => (
                <g key={i} transform={`translate(${i * 76}, 0)`}>
                  <circle cx="7" cy="0" r="5" fill={item.color} filter={item.fx} opacity="0.9" />
                  <text x="16" y="4" fill="#94A3B8" fontSize="8" fontFamily="monospace">{item.label}</text>
                </g>
              ))}
            </g>
          </svg>
        </div>
      )}




      {/* D. NODE INSPECTION DRAWER */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={nodes.find((n) => n.id === selectedNodeId)?.code || selectedNodeId || 'Node Inspection'}
        subtitle={`ID: ${selectedNodeId || ''}`}
      >
        {selectedNodeId ? (
          <div className="space-y-4 text-xs text-[#E8EDF2] font-mono">
            {drawerLoading ? (
              <LoadingSkeleton lines={4} />
            ) : (
              <>
                <div className="bg-[#131920] p-3 rounded border border-[#27313A] space-y-2">
                  <div className="text-[#6F7B86] text-[10px] uppercase font-bold">Node Metadata</div>
                  <div><span className="text-[#6F7B86]">Primary ID:</span> {selectedNodeId}</div>
                  <div>
                    <span className="text-[#6F7B86]">Type:</span>{' '}
                    <StatusBadge status="info" label={selectedNodeId.split(':')[0]} size="sm" />
                  </div>
                  {nodeDetail && (
                    <div><span className="text-[#6F7B86]">Connected Nodes:</span> {nodeDetail.outgoing_neighbors?.length || 0}</div>
                  )}
                </div>

                {nodeDeps && (
                  <div className="bg-[#131920] p-3 rounded border border-[#27313A] space-y-2">
                    <div className="text-[#6F7B86] text-[10px] uppercase font-bold">Dependency Traversal</div>
                    <div className="text-[11px] text-[#AAB5BF]">
                      Outgoing dependencies: {nodeDeps.outgoing_dependencies?.length || 0}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        ) : null}
      </Drawer>
    </div>
  );
};
