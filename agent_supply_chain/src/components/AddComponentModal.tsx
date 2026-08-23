import React, { useState } from 'react';
import { Category, CriticalityLevel, Part, InventoryItem, Supplier } from '../types/supplyChain';
import { Plus, X, ShieldAlert, CheckCircle2, AlertCircle } from 'lucide-react';

interface AddComponentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddComponent: (newPart: Part, newInventory: InventoryItem, newSupplier: Supplier) => void;
}

const CATEGORIES: Category[] = [
  'POWERTRAIN',
  'ENERGY',
  'BRAKING_AND_SAFETY',
  'STEERING',
  'ELECTRONICS',
  'ADAS_AND_SENSORS',
  'LIGHTING',
  'WHEELS',
  'TIRES',
  'THERMAL',
  'BODY',
  'INTERIOR'
];

export const AddComponentModal: React.FC<AddComponentModalProps> = ({
  isOpen,
  onClose,
  onAddComponent
}) => {
  const [partId, setPartId] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [category, setCategory] = useState<Category>('ELECTRONICS');
  const [criticality, setCriticality] = useState<CriticalityLevel>('IMPORTANT');
  const [supplierName, setSupplierName] = useState('');
  const [dailyUsage, setDailyUsage] = useState(25);
  const [availableStock, setAvailableStock] = useState(150);
  const [unitCost, setUnitCost] = useState(1800);
  const [leadTimeDays, setLeadTimeDays] = useState(7);
  const [moq, setMoq] = useState(100);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formattedPartId = partId.toUpperCase().trim().replace(/\s+/g, '_');

    if (!formattedPartId || !displayName || !supplierName) {
      setError('Please fill in all mandatory fields.');
      return;
    }

    const newPart: Part = {
      part_id: formattedPartId,
      mesh_name: `Mesh_Custom_${formattedPartId}`,
      display_name: `${displayName} [CUSTOM / PENDING VALIDATION]`,
      category,
      criticality,
      position_3d: [0, 0.5, 0],
      mesh_type: 'box',
      color_default: '#1d4ed8',
      status: 'GREEN',
      severity: 0.0,
      inventory_id: `COMP-CUST-${Date.now().toString().slice(-4)}`,
      supplier_id: `SUP-CUST-${Date.now().toString().slice(-3)}`
    };

    const newInventory: InventoryItem = {
      component_id: newPart.inventory_id,
      part_id: formattedPartId,
      name: displayName,
      total_stock: availableStock + 20,
      available_stock: availableStock,
      usable_stock: availableStock,
      reserved_stock: 20,
      incoming_stock: 0,
      on_order_stock: 0,
      daily_usage: dailyUsage,
      safety_stock: dailyUsage * 3,
      coverage_days: Number((availableStock / dailyUsage).toFixed(1)),
      warehouse: 'Warehouse Alpha',
      last_updated: new Date().toISOString(),
      unit_cost: unitCost
    };

    const newSupplier: Supplier = {
      supplier_id: newPart.supplier_id,
      supplier_name: supplierName,
      component_id: newPart.inventory_id,
      part_id: formattedPartId,
      country: 'India',
      unit_price: unitCost,
      lead_time_days: leadTimeDays,
      available_quantity: 5000,
      quality_score: 0.96,
      reliability_score: 0.92,
      min_order_quantity: moq,
      certifications: ['ISO 9001', 'IATF 16949'],
      historical_delay_rate: 0
    };

    onAddComponent(newPart, newInventory, newSupplier);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm font-sans animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-xl p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 font-heading">Register New Automotive Component</h3>
            <p className="text-xs text-slate-500 font-mono">Status: Marked as Custom / Pending Validation</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl bg-slate-50 text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-all border border-slate-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-blue-700 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-mono">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-600 block mb-1">PART ID (UNIQUE)</label>
              <input
                type="text"
                placeholder="e.g. HUD_MODULE"
                value={partId}
                onChange={(e) => setPartId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:border-blue-700 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="text-slate-600 block mb-1">DISPLAY NAME</label>
              <input
                type="text"
                placeholder="e.g. Augmented Reality HUD"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:border-blue-700 focus:outline-none"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-600 block mb-1">CATEGORY</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as Category)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:border-blue-700 focus:outline-none font-sans"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-slate-600 block mb-1">CRITICALITY</label>
              <select
                value={criticality}
                onChange={(e) => setCriticality(e.target.value as CriticalityLevel)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:border-blue-700 focus:outline-none font-sans"
              >
                <option value="CRITICAL">CRITICAL</option>
                <option value="IMPORTANT">IMPORTANT</option>
                <option value="NON_CRITICAL">NON_CRITICAL</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-600 block mb-1">PRIMARY SUPPLIER</label>
              <input
                type="text"
                placeholder="e.g. Lumax Auto Tech"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:border-blue-700 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="text-slate-600 block mb-1">UNIT COST (₹)</label>
              <input
                type="number"
                value={unitCost}
                onChange={(e) => setUnitCost(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:border-blue-700 focus:outline-none"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-slate-600 block mb-1">DAILY BURN</label>
              <input
                type="number"
                value={dailyUsage}
                onChange={(e) => setDailyUsage(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:border-blue-700 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="text-slate-600 block mb-1">USABLE STOCK</label>
              <input
                type="number"
                value={availableStock}
                onChange={(e) => setAvailableStock(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:border-blue-700 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="text-slate-600 block mb-1">LEAD TIME (DAYS)</label>
              <input
                type="number"
                value={leadTimeDays}
                onChange={(e) => setLeadTimeDays(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:border-blue-700 focus:outline-none"
                required
              />
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 space-y-1">
            <span className="font-bold text-slate-900 block font-sans">Digital Twin &amp; QR Validation:</span>
            <p>
              Registering will generate a live QR endpoint at <code>/component/{partId || 'PART_ID'}</code> and compute dynamic BOM coverage.
            </p>
          </div>

          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs border border-slate-200 font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center space-x-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Register Component</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
