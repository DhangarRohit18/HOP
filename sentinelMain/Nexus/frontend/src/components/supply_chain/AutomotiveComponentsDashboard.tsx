import React, { useState, useMemo } from 'react';
import {
  Part,
  InventoryItem,
  Supplier,
  PurchaseOrder,
  Category,
  CriticalityLevel
} from '../../types/supplyChain';
import { calculateSmartOrder } from '../../services/supply_chain/orderEngine';
import {
  Search,
  Filter,
  ArrowUpDown,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Package,
  Clock,
  Building,
  TrendingDown,
  ChevronRight,
  Sparkles,
  Layers,
  BarChart2,
  QrCode
} from 'lucide-react';

interface AutomotiveComponentsDashboardProps {
  parts: Part[];
  inventory: InventoryItem[];
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  selectedPartId: string | null;
  onSelectPart: (partId: string) => void;
  onOpenCreatePO: (partId: string) => void;
  onOpenAddComponent: () => void;
}

const CATEGORIES: { label: string; value: Category | 'ALL' }[] = [
  { label: 'ALL CATEGORIES', value: 'ALL' },
  { label: 'POWERTRAIN', value: 'POWERTRAIN' },
  { label: 'ENERGY', value: 'ENERGY' },
  { label: 'BRAKING & SAFETY', value: 'BRAKING_AND_SAFETY' },
  { label: 'STEERING', value: 'STEERING' },
  { label: 'ELECTRONICS', value: 'ELECTRONICS' },
  { label: 'ADAS & SENSORS', value: 'ADAS_AND_SENSORS' },
  { label: 'LIGHTING', value: 'LIGHTING' },
  { label: 'WHEELS', value: 'WHEELS' },
  { label: 'TIRES', value: 'TIRES' },
  { label: 'THERMAL', value: 'THERMAL' },
  { label: 'BODY', value: 'BODY' },
  { label: 'INTERIOR', value: 'INTERIOR' }
];

type SortKey = 'risk' | 'coverage' | 'available' | 'required' | 'criticality' | 'lead_time';

export const AutomotiveComponentsDashboard: React.FC<AutomotiveComponentsDashboardProps> = ({
  parts,
  inventory,
  suppliers,
  purchaseOrders,
  selectedPartId,
  onSelectPart,
  onOpenCreatePO,
  onOpenAddComponent
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | 'ALL'>('ALL');
  const [selectedCriticality, setSelectedCriticality] = useState<CriticalityLevel | 'ALL'>('ALL');
  const [sortKey, setSortKey] = useState<SortKey>('risk');
  const [sortAsc, setSortAsc] = useState(false);

  // Executive KPI Summary Calculations
  const summaryKPIs = useMemo(() => {
    let healthyCount = 0;
    let warningCount = 0;
    let criticalCount = 0;
    let totalRequired = 0;
    let totalOnOrder = 0;
    let totalIncoming = 0;
    let totalExposure = 0;

    parts.forEach((part) => {
      const inv = inventory.find((i) => i.part_id === part.part_id);
      const sup = suppliers.find((s) => s.part_id === part.part_id);

      const avail = inv?.available_stock ?? inv?.usable_stock ?? 0;
      const inc = inv?.incoming_stock ?? 0;
      const onOrd = inv?.on_order_stock ?? 0;
      const burn = inv?.daily_usage ?? 30;
      const unitCost = inv?.unit_cost ?? sup?.unit_price ?? 1200;

      const smart = calculateSmartOrder(
        avail,
        inc,
        onOrd,
        burn,
        sup?.lead_time_days ?? 7,
        inv?.safety_stock ?? 90,
        sup?.min_order_quantity ?? 100
      );

      const covDays = burn > 0 ? avail / burn : 0;

      if (part.status === 'RED' || covDays === 0) {
        criticalCount++;
        totalExposure += (smart.recommended_quantity || 100) * unitCost;
      } else if (part.status === 'YELLOW' || covDays < 3) {
        warningCount++;
      } else {
        healthyCount++;
      }

      totalRequired += smart.recommended_quantity;
      totalOnOrder += onOrd;
      totalIncoming += inc;
    });

    return {
      total: parts.length,
      healthy: healthyCount,
      warning: warningCount,
      critical: criticalCount,
      totalRequired,
      totalOnOrder,
      totalIncoming,
      vehiclesAtRisk: criticalCount > 0 ? 120 : 0,
      exposure: totalExposure
    };
  }, [parts, inventory, suppliers]);

  // Top 5 Critical Action Components
  const criticalActionList = useMemo(() => {
    return parts
      .filter((p) => p.status === 'RED' || p.status === 'YELLOW')
      .slice(0, 5);
  }, [parts]);

  // Filtered & Sorted Component List
  const filteredParts = useMemo(() => {
    return parts
      .filter((part) => {
        const matchesCategory = selectedCategory === 'ALL' || part.category === selectedCategory;
        const matchesCriticality = selectedCriticality === 'ALL' || part.criticality === selectedCriticality;
        const matchesSearch =
          part.part_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          part.display_name.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesCategory && matchesCriticality && matchesSearch;
      })
      .sort((a, b) => {
        const invA = inventory.find((i) => i.part_id === a.part_id);
        const invB = inventory.find((i) => i.part_id === b.part_id);
        const supA = suppliers.find((s) => s.part_id === a.part_id);
        const supB = suppliers.find((s) => s.part_id === b.part_id);

        const covA = invA && invA.daily_usage > 0 ? (invA.available_stock ?? invA.usable_stock) / invA.daily_usage : 0;
        const covB = invB && invB.daily_usage > 0 ? (invB.available_stock ?? invB.usable_stock) / invB.daily_usage : 0;

        let diff = 0;
        if (sortKey === 'risk') {
          const riskA = a.status === 'RED' ? 3 : a.status === 'YELLOW' ? 2 : 1;
          const riskB = b.status === 'RED' ? 3 : b.status === 'YELLOW' ? 2 : 1;
          diff = riskB - riskA;
        } else if (sortKey === 'coverage') {
          diff = covA - covB;
        } else if (sortKey === 'available') {
          diff = (invA?.available_stock ?? 0) - (invB?.available_stock ?? 0);
        } else if (sortKey === 'lead_time') {
          diff = (supA?.lead_time_days ?? 0) - (supB?.lead_time_days ?? 0);
        }
        return sortAsc ? -diff : diff;
      });
  }, [parts, inventory, suppliers, searchTerm, selectedCategory, selectedCriticality, sortKey, sortAsc]);

  return (
    <div className="space-y-6 font-sans">
      
      {/* ─── 1. EXECUTIVE SUPPLY HEALTH SUMMARY CARDS ─── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-nexus-white border border-nexus-blue-20 rounded-[8px] p-4 shadow-sm">
          <p className="text-[11px] font-mono text-nexus-blue-60 font-semibold">TOTAL COMPONENTS</p>
          <p className="text-2xl font-bold font-mono text-nexus-blue mt-1">{summaryKPIs.total}</p>
          <span className="text-[10px] text-nexus-blue font-mono font-medium">100% Registered</span>
        </div>

        <div className="bg-nexus-white border border-nexus-blue-20 rounded-[8px] p-4 shadow-sm">
          <p className="text-[11px] font-mono text-nexus-blue-60 font-semibold">HEALTHY / NORMAL</p>
          <p className="text-2xl font-bold font-mono text-nexus-blue mt-1">{summaryKPIs.healthy}</p>
          <span className="text-[10px] text-nexus-blue-60 font-mono">Coverage &gt; 7 Days</span>
        </div>

        <div className="bg-nexus-white border border-nexus-blue-20 rounded-[8px] p-4 shadow-sm">
          <p className="text-[11px] font-mono text-nexus-blue-60 font-semibold">WARNING / AT RISK</p>
          <p className="text-2xl font-bold font-mono text-nexus-blue mt-1">{summaryKPIs.warning}</p>
          <span className="text-[10px] text-nexus-blue-60 font-mono">Coverage 1–3 Days</span>
        </div>

        <div className="bg-nexus-white border border-nexus-blue-20 rounded-[8px] p-4 shadow-sm">
          <p className="text-[11px] font-mono text-nexus-blue-60 font-semibold">CRITICAL SHORTAGE</p>
          <p className="text-2xl font-bold font-mono text-nexus-blue mt-1">{summaryKPIs.critical}</p>
          <span className="text-[10px] text-nexus-blue font-mono font-bold">Immediate Stoppage</span>
        </div>

        <div className="bg-nexus-white border border-nexus-blue-20 rounded-[8px] p-4 shadow-sm">
          <p className="text-[11px] font-mono text-nexus-blue-60 font-semibold">VEHICLES AT RISK</p>
          <p className="text-2xl font-bold font-mono text-nexus-blue mt-1">{summaryKPIs.vehiclesAtRisk}</p>
          <span className="text-[10px] text-nexus-blue-60 font-mono">Production Line Alpha</span>
        </div>

        <div className="bg-nexus-white border border-nexus-blue-20 rounded-[8px] p-4 shadow-sm">
          <p className="text-[11px] font-mono text-nexus-blue-60 font-semibold">EXPOSURE VALUE</p>
          <p className="text-xl font-bold font-mono text-nexus-blue mt-1">₹{(summaryKPIs.exposure / 1000).toFixed(0)}k</p>
          <span className="text-[10px] text-nexus-blue-60 font-mono">Est. Stoppage Impact</span>
        </div>
      </div>

      {/* ─── 2. TOP ACTION ITEMS (If shortages exist) ─── */}
      {criticalActionList.length > 0 && (
        <div className="bg-nexus-blue-04/60 border border-nexus-blue-20 rounded-[8px] p-4 space-y-3 shadow-sm">
          <div className="flex items-center space-x-2 text-nexus-blue font-mono font-bold text-xs">
            <AlertTriangle className="w-4 h-4 text-nexus-blue" />
            <span>CRITICAL PROCUREMENT ACTIONS REQUIRED (TOP DISRUPTIONS)</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {criticalActionList.map((p) => {
              const inv = inventory.find((i) => i.part_id === p.part_id);
              const sup = suppliers.find((s) => s.part_id === p.part_id);
              const smart = calculateSmartOrder(
                inv?.available_stock ?? 0,
                inv?.incoming_stock ?? 0,
                inv?.on_order_stock ?? 0,
                inv?.daily_usage ?? 30,
                sup?.lead_time_days ?? 7,
                inv?.safety_stock ?? 90,
                sup?.min_order_quantity ?? 100
              );

              return (
                <div
                  key={p.part_id}
                  className="bg-nexus-white border border-nexus-blue-20 p-3.5 rounded-[8px] flex items-center justify-between shadow-sm"
                >
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-nexus-blue">{p.display_name}</p>
                    <p className="text-[11px] font-mono text-nexus-blue">
                      Shortfall: {smart.recommended_quantity} units | 0 Days Coverage
                    </p>
                  </div>
                  <button
                    onClick={() => onOpenCreatePO(p.part_id)}
                    className="px-3 py-1.5 bg-nexus-blue hover:bg-nexus-blue-dark text-nexus-white rounded-[8px] text-xs font-mono font-bold shadow-sm transition-all"
                  >
                    CREATE PO
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── 3. SEARCH & CONTROLS TOOLBAR ─── */}
      <div className="bg-nexus-white border border-nexus-blue-20 rounded-[8px] p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-nexus-blue-60" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search all 27 components (e.g. Battery, Headlight, Brake, ECU)..."
            className="w-full pl-9 pr-4 py-2 bg-nexus-white border border-nexus-blue-20 rounded-[8px] text-xs text-nexus-blue placeholder-slate-400 focus:outline-none focus:border-nexus-blue font-mono"
          />
        </div>

        {/* Criticality Filter & Add Component */}
        <div className="flex items-center space-x-2 flex-wrap gap-y-2">
          
          {/* Criticality Pills */}
          <div className="flex items-center space-x-1 bg-nexus-white p-1 rounded-[8px] border border-nexus-blue-20 text-[11px] font-mono">
            {(['ALL', 'CRITICAL', 'IMPORTANT', 'NON_CRITICAL'] as const).map((crit) => (
              <button
                key={crit}
                onClick={() => setSelectedCriticality(crit)}
                className={`px-2.5 py-1 rounded-[8px] transition-all font-semibold ${
                  selectedCriticality === crit ? 'bg-nexus-blue text-nexus-white shadow-sm' : 'text-nexus-blue hover:text-nexus-blue'
                }`}
              >
                {crit}
              </button>
            ))}
          </div>

          {/* Add Component Action */}
          <button
            onClick={onOpenAddComponent}
            className="flex items-center space-x-1.5 px-3 py-2 bg-nexus-blue-04 hover:bg-nexus-blue-12 text-nexus-blue border border-nexus-blue-20 rounded-[8px] text-xs font-mono font-bold transition-all shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>ADD COMPONENT</span>
          </button>

        </div>

      </div>

      {/* ─── 4. CATEGORY PILLS BAR ─── */}
      <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-[11px] font-mono scrollbar-none">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setSelectedCategory(cat.value)}
            className={`px-3 py-1.5 rounded-[8px] border whitespace-nowrap transition-all ${
              selectedCategory === cat.value
                ? 'bg-nexus-blue text-nexus-white border-nexus-blue shadow-sm font-bold'
                : 'bg-nexus-white text-nexus-blue border-nexus-blue-20 hover:text-nexus-blue hover:bg-nexus-white'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* ─── 5. ALL 27 COMPONENTS TABLE MATRIX ─── */}
      <div className="bg-nexus-white border border-nexus-blue-20 rounded-[8px] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead>
              <tr className="border-b border-nexus-blue-20 bg-nexus-white text-nexus-blue font-mono text-[11px]">
                <th className="py-3.5 px-4">COMPONENT / PART ID</th>
                <th className="py-3.5 px-3">CATEGORY</th>
                <th className="py-3.5 px-3">CRITICALITY</th>
                <th className="py-3.5 px-3 text-right">AVAILABLE</th>
                <th className="py-3.5 px-3 text-right">DAILY BURN</th>
                <th className="py-3.5 px-3 text-right">COVERAGE</th>
                <th className="py-3.5 px-3 text-right">ON ORDER</th>
                <th className="py-3.5 px-3 text-right">REORDER QTY</th>
                <th className="py-3.5 px-3">SUPPLIER</th>
                <th className="py-3.5 px-4 text-center">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredParts.map((part) => {
                const inv = inventory.find((i) => i.part_id === part.part_id);
                const sup = suppliers.find((s) => s.part_id === part.part_id);

                const avail = inv?.available_stock ?? inv?.usable_stock ?? 0;
                const burn = inv?.daily_usage ?? 30;
                const coverage = burn > 0 ? (avail / burn).toFixed(1) : '0';
                const onOrder = inv?.on_order_stock ?? 0;

                const smart = calculateSmartOrder(
                  avail,
                  inv?.incoming_stock ?? 0,
                  onOrder,
                  burn,
                  sup?.lead_time_days ?? 7,
                  inv?.safety_stock ?? 90,
                  sup?.min_order_quantity ?? 100
                );

                const isSelected = selectedPartId === part.part_id;

                return (
                  <tr
                    key={part.part_id}
                    onClick={() => onSelectPart(part.part_id)}
                    className={`cursor-pointer transition-all hover:bg-nexus-white ${
                      isSelected ? 'bg-nexus-blue-04/70 border-l-4 border-nexus-blue' : ''
                    }`}
                  >
                    {/* Component Name & ID */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-0.5">
                        <div className="flex items-center space-x-2">
                          <span
                            className={`w-2 h-2 rounded-[4px] ${
                              part.status === 'RED'
                                ? 'bg-nexus-blue animate-pulse'
                                : 'bg-nexus-blue-42'
                            }`}
                          ></span>
                          <span className="font-bold text-nexus-blue">{part.display_name}</span>
                        </div>
                        <p className="text-[11px] font-mono text-nexus-blue pl-4">{part.part_id}</p>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3.5 px-3">
                      <span className="px-2 py-0.5 bg-nexus-blue-12 text-nexus-blue rounded text-[10px] font-mono">
                        {part.category}
                      </span>
                    </td>

                    {/* Criticality */}
                    <td className="py-3.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                          part.criticality === 'CRITICAL'
                            ? 'bg-nexus-blue-04 text-nexus-blue border border-nexus-blue-20'
                            : 'bg-nexus-blue-12 text-nexus-blue'
                        }`}
                      >
                        {part.criticality}
                      </span>
                    </td>

                    {/* Available */}
                    <td className="py-3.5 px-3 text-right font-mono font-bold text-nexus-blue">
                      <span>{avail}</span>
                    </td>

                    {/* Daily Burn */}
                    <td className="py-3.5 px-3 text-right font-mono text-nexus-blue">
                      {burn} /d
                    </td>

                    {/* Coverage Days */}
                    <td className="py-3.5 px-3 text-right font-mono font-bold">
                      <span className={Number(coverage) < 3 ? 'text-nexus-blue' : 'text-nexus-blue'}>
                        {coverage} d
                      </span>
                    </td>

                    {/* On Order */}
                    <td className="py-3.5 px-3 text-right font-mono text-nexus-blue font-semibold">
                      {onOrder}
                    </td>

                    {/* Reorder Qty */}
                    <td className="py-3.5 px-3 text-right font-mono text-nexus-blue font-bold">
                      {smart.recommended_quantity}
                    </td>

                    {/* Supplier */}
                    <td className="py-3.5 px-3 text-nexus-blue text-xs font-medium">
                      {sup?.supplier_name || 'Apex Photonics'}
                    </td>

                    {/* Action Button */}
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenCreatePO(part.part_id);
                        }}
                        className="px-3 py-1 bg-nexus-blue hover:bg-nexus-blue-dark text-nexus-white rounded-[8px] text-xs font-mono font-semibold transition-all shadow-sm"
                      >
                        CREATE PO
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
