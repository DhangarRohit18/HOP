import React, { useState } from 'react';
import { ProductionPlan } from '../types/supplyChain';
import {
  X,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Car,
  Package,
  Layers,
  ArrowRight,
  TrendingDown,
  Clock
} from 'lucide-react';

interface ProductionPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: ProductionPlan;
  onUpdatePlan: (
    targetQuantity: number,
    productName: string,
    variant: string,
    deadlineDays: number,
    bomMap: Record<string, number>
  ) => void;
}

export const ProductionPlanModal: React.FC<ProductionPlanModalProps> = ({
  isOpen,
  onClose,
  plan,
  onUpdatePlan
}) => {
  const [targetQuantity, setTargetQuantity] = useState<number>(plan.target_quantity || 1000);
  const [productName, setProductName] = useState<string>(plan.product || 'CyberSUV AWD Electric Vehicle');
  const [variant, setVariant] = useState<string>(plan.variant || 'Dual-Motor Performance (85 kWh)');
  const [deadlineDays, setDeadlineDays] = useState<number>(plan.deadline_days || 7);
  const [bomMap, setBomMap] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    plan.components.forEach((c) => {
      map[c.part_id] = c.quantity_per_vehicle || 1;
    });
    return map;
  });

  if (!isOpen) return null;

  const handleBomChange = (partId: string, value: number) => {
    setBomMap((prev) => ({
      ...prev,
      [partId]: Math.max(1, Math.min(4, value))
    }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdatePlan(targetQuantity, productName, variant, deadlineDays, bomMap);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 font-sans animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 max-h-[90vh] flex flex-col">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3.5 flex-shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-2.5 bg-blue-50 text-blue-700 rounded-2xl border border-blue-200">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 font-heading">
                Configure Production Target &amp; Bill of Materials
              </h3>
              <p className="text-xs text-slate-500 font-mono">
                Real-Time Automotive Assembly Capacity Simulator
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-all border border-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin scrollbar-thumb-slate-300 font-mono text-xs">
          
          {/* Product & Variant */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-slate-600 block font-semibold font-sans">VEHICLE MODEL</label>
              <input
                type="text"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:border-blue-700 focus:outline-none font-sans"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-600 block font-semibold font-sans">VARIANT / TRIM</label>
              <input
                type="text"
                value={variant}
                onChange={(e) => setVariant(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:border-blue-700 focus:outline-none font-sans"
                required
              />
            </div>
          </div>

          {/* Target Quantity & Deadline Days */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-slate-600 block font-semibold font-sans">TARGET PRODUCTION (UNITS)</label>
              <input
                type="number"
                min={100}
                max={5000}
                step={50}
                value={targetQuantity}
                onChange={(e) => setTargetQuantity(parseInt(e.target.value) || 1000)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold text-base focus:border-blue-700 focus:outline-none"
                required
              />
              <span className="text-[10px] text-slate-500 block font-sans">
                Controls real-time component shortage calculations across all 27 parts.
              </span>
            </div>

            <div className="space-y-1">
              <label className="text-slate-600 block font-semibold font-sans">DEADLINE (DAYS)</label>
              <input
                type="number"
                min={1}
                max={30}
                value={deadlineDays}
                onChange={(e) => setDeadlineDays(parseInt(e.target.value) || 7)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold text-base focus:border-blue-700 focus:outline-none"
                required
              />
              <span className="text-[10px] text-slate-500 block font-sans">
                Production horizon for burn rate calculations.
              </span>
            </div>
          </div>

          {/* Bill of Materials (BOM) Component Quantities */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 font-heading">
                Bill of Materials (Quantity Per Vehicle)
              </span>
              <span className="text-[11px] text-slate-500">
                {plan.components.length} Subsystems Linked
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 bg-slate-50 rounded-2xl border border-slate-200">
              {plan.components.map((comp) => (
                <div
                  key={comp.part_id}
                  className="flex items-center justify-between p-2 bg-white rounded-xl border border-slate-200"
                >
                  <div className="truncate mr-2">
                    <p className="text-xs font-semibold text-slate-900 truncate font-sans">{comp.display_name}</p>
                    <span className="text-[10px] text-blue-700 font-mono">{comp.part_id}</span>
                  </div>
                  <div className="flex items-center space-x-1 flex-shrink-0">
                    <span className="text-[10px] text-slate-500">Qty:</span>
                    <input
                      type="number"
                      min={1}
                      max={4}
                      value={bomMap[comp.part_id] ?? comp.quantity_per_vehicle ?? 1}
                      onChange={(e) => handleBomChange(comp.part_id, parseInt(e.target.value) || 1)}
                      className="w-12 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-center text-slate-900 font-bold focus:border-blue-700 focus:outline-none"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs border border-slate-200 font-bold font-sans"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center space-x-1.5 font-sans"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Update Production Plan</span>
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};
