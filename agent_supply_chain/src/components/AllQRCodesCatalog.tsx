import React, { useState } from 'react';
import { Part, InventoryItem, Supplier, Category } from '../types/supplyChain';
import { QRCodeComponent } from './qr/QRCodeComponent';
import { Search, Filter, QrCode, Download, Printer, ChevronRight } from 'lucide-react';

interface AllQRCodesCatalogProps {
  parts: Part[];
  inventory: InventoryItem[];
  suppliers: Supplier[];
  onSelectPart: (partId: string) => void;
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

export const AllQRCodesCatalog: React.FC<AllQRCodesCatalogProps> = ({
  parts,
  inventory,
  suppliers,
  onSelectPart
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | 'ALL'>('ALL');

  const filteredParts = parts.filter((p) => {
    const matchesCat = selectedCategory === 'ALL' || p.category === selectedCategory;
    const matchesSearch =
      p.part_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.display_name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="space-y-6 font-sans">
      
      {/* Header Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <QrCode className="w-5 h-5 text-blue-700" />
            <span>Automotive Component QR Codes Catalog</span>
          </h2>
          <p className="text-xs text-slate-500 font-mono">
            Every QR code dynamically encodes the live URL: <code className="text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">/component/:partId</code> for instant mobile scanning.
          </p>
        </div>

        {/* Search */}
        <div className="relative max-w-sm w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search component QR codes..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-700 font-mono"
          />
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-[11px] font-mono scrollbar-none">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setSelectedCategory(cat.value)}
            className={`px-3 py-1.5 rounded-xl border whitespace-nowrap transition-all ${
              selectedCategory === cat.value
                ? 'bg-blue-700 text-white border-blue-700 shadow-sm font-bold'
                : 'bg-white text-slate-600 border-slate-200 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* 27 QR Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredParts.map((part) => {
          const inv = inventory.find((i) => i.part_id === part.part_id);
          const sup = suppliers.find((s) => s.part_id === part.part_id);

          return (
            <div
              key={part.part_id}
              className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:border-blue-300 transition-all flex flex-col justify-between space-y-3"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 truncate">{part.display_name}</h4>
                  <span className="text-[10px] font-mono text-blue-700">{part.part_id}</span>
                </div>
                <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-mono">
                  {part.category}
                </span>
              </div>

              {/* QR Code Graphic */}
              <div className="flex justify-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                <QRCodeComponent
                  partId={part.part_id}
                  displayName={part.display_name}
                  size={140}
                />
              </div>

              {/* Card Footer Details & CTA */}
              <div className="space-y-2 pt-1">
                <div className="flex justify-between text-[11px] font-mono text-slate-500">
                  <span>Available Stock:</span>
                  <strong className="text-slate-900">{inv?.available_stock ?? inv?.usable_stock ?? 0} Units</strong>
                </div>

                <button
                  onClick={() => onSelectPart(part.part_id)}
                  className="w-full py-2 bg-slate-50 hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 rounded-xl text-xs font-mono font-bold transition-all flex items-center justify-center space-x-1"
                >
                  <span>Inspect Digital Twin</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};
