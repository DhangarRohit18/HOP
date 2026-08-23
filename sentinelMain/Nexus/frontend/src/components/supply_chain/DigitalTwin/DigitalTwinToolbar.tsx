import React, { useState } from 'react';
import { Part, Category } from '../../../types/supplyChain';
import { Search, Cpu, SlidersHorizontal, ChevronRight, CheckCircle2, AlertTriangle, ShieldAlert } from 'lucide-react';

interface DigitalTwinToolbarProps {
  parts: Part[];
  selectedPartId: string | null;
  onSelectPart: (partId: string) => void;
  selectedCategory: Category | 'ALL';
  onSelectCategory: (category: Category | 'ALL') => void;
  isPanelOpen: boolean;
  onTogglePanel: () => void;
}

const CATEGORIES: { label: string; value: Category | 'ALL' }[] = [
  { label: 'ALL 27 PARTS', value: 'ALL' },
  { label: 'POWERTRAIN', value: 'POWERTRAIN' },
  { label: 'ENERGY', value: 'ENERGY' },
  { label: 'BRAKING & SAFETY', value: 'BRAKING_AND_SAFETY' },
  { label: 'ELECTRONICS', value: 'ELECTRONICS' },
  { label: 'ADAS & SENSORS', value: 'ADAS_AND_SENSORS' },
  { label: 'LIGHTING', value: 'LIGHTING' },
  { label: 'WHEELS', value: 'WHEELS' },
  { label: 'TIRES', value: 'TIRES' },
  { label: 'THERMAL', value: 'THERMAL' },
  { label: 'BODY', value: 'BODY' },
  { label: 'INTERIOR', value: 'INTERIOR' }
];

export const DigitalTwinToolbar: React.FC<DigitalTwinToolbarProps> = ({
  parts,
  selectedPartId,
  onSelectPart,
  selectedCategory,
  onSelectCategory,
  isPanelOpen,
  onTogglePanel
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  const matchedParts = parts.filter(
    (p) =>
      !searchQuery.trim() ||
      p.part_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (matchedParts.length > 0) {
      onSelectPart(matchedParts[0].part_id);
      setShowDropdown(false);
    }
  };

  return (
    <div className="bg-nexus-white rounded-[8px] border border-nexus-blue-20 p-3.5 shadow-sm space-y-3 font-sans">
      
      {/* Top Toolbar Row */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        
        {/* Left Subsystem Title */}
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-nexus-blue-04 text-nexus-blue rounded-[8px] border border-nexus-blue-20">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-nexus-blue font-sans tracking-tight flex items-center gap-2">
              Automotive Concept 3D Digital Twin
            </h2>
          </div>
        </div>

        {/* Center Search Bar with Rich Dropdown */}
        <div className="relative flex-1 max-w-md min-w-[280px]">
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="w-4 h-4 text-nexus-blue-60 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              placeholder="Search component, category, supplier or part ID..."
              className="w-full bg-nexus-white text-xs text-nexus-blue placeholder-slate-400 pl-9 pr-4 py-2.5 rounded-[8px] border border-nexus-blue-20 focus:border-nexus-blue focus:outline-none font-mono transition-all"
            />
          </form>

          {/* Autocomplete Dropdown */}
          {showDropdown && searchQuery.trim() && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-nexus-white border border-nexus-blue-20 rounded-[8px] shadow-sm z-40 max-h-64 overflow-y-auto font-mono text-xs divide-y divide-slate-100">
              {matchedParts.slice(0, 6).map((p) => (
                <button
                  key={p.part_id}
                  onClick={() => {
                    onSelectPart(p.part_id);
                    setSearchQuery(p.display_name);
                    setShowDropdown(false);
                  }}
                  className="w-full p-2.5 text-left hover:bg-nexus-white flex items-center justify-between text-nexus-blue hover:text-nexus-blue transition-all"
                >
                  <div className="space-y-0.5">
                    <span className="font-semibold text-nexus-blue block font-sans">{p.display_name}</span>
                    <span className="text-[10px] text-nexus-blue">{p.part_id} • {p.category}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-[9px] px-2 py-0.5 rounded font-bold bg-nexus-blue-04 text-nexus-blue border border-nexus-blue-20">
                      {p.status}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-nexus-blue-60" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Toggle Panel */}
        <div className="flex items-center space-x-2">
          <button
            onClick={onTogglePanel}
            className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-[8px] text-xs font-semibold font-mono transition-all border ${
              isPanelOpen
                ? 'bg-nexus-blue text-nexus-white border-nexus-blue shadow-sm'
                : 'bg-nexus-white border-nexus-blue-20 text-nexus-blue hover:bg-nexus-white'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>{isPanelOpen ? 'Hide Component Panel' : 'Show Component Panel'}</span>
          </button>
        </div>

      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none pt-1 border-t border-nexus-blue-12 text-[11px] font-mono">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => onSelectCategory(cat.value)}
            className={`px-3 py-1 rounded-[8px] whitespace-nowrap transition-all border ${
              selectedCategory === cat.value
                ? 'bg-nexus-blue border-nexus-blue text-nexus-white font-bold shadow-sm'
                : 'bg-nexus-white border-nexus-blue-20 text-nexus-blue hover:text-nexus-blue hover:bg-nexus-white'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

    </div>
  );
};
