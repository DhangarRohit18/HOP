import React, { useState, useEffect } from 'react';
import { InventoryItem, Supplier, SmartOrderRecommendation, PurchaseOrder } from '../../types/supplyChain';
import { calculateSmartOrderRecommendation } from '../../services/supply_chain/orderEngine';
import {
  X,
  Package,
  Truck,
  Clock,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  ShieldCheck,
  Calculator,
  ChevronRight
} from 'lucide-react';

interface CreatePOModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventoryItem?: InventoryItem;
  suppliers: Supplier[];
  autonomousThreshold: number;
  onConfirmOrder: (poData: {
    partId: string;
    componentId: string;
    supplier: Supplier;
    quantity: number;
    shippingMethod: PurchaseOrder['shipping_method'];
    totalCost: number;
  }) => void;
}

export const CreatePOModal: React.FC<CreatePOModalProps> = ({
  isOpen,
  onClose,
  inventoryItem,
  suppliers,
  autonomousThreshold,
  onConfirmOrder
}) => {
  if (!isOpen || !inventoryItem) return null;

  const [recommendation, setRecommendation] = useState<SmartOrderRecommendation>(() =>
    calculateSmartOrderRecommendation(inventoryItem, suppliers, autonomousThreshold)
  );

  const fallbackSupplier: Supplier = suppliers.find((s) => s.part_id === inventoryItem.part_id) || suppliers[0] || {
    supplier_id: 'SUP-21',
    supplier_name: 'Apex Photonics Ltd',
    component_id: inventoryItem.component_id,
    part_id: inventoryItem.part_id,
    reliability_score: 0.85,
    lead_time_days: 7,
    unit_price: inventoryItem.unit_cost || 1200,
    min_order_quantity: 100
  };

  const preferredSup = recommendation.preferred_supplier || fallbackSupplier;

  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(preferredSup.supplier_id);
  const [orderQuantity, setOrderQuantity] = useState<number>(recommendation.recommended_quantity || 100);
  const [shippingMethod, setShippingMethod] = useState<PurchaseOrder['shipping_method']>('AIR_EXPRESS');

  // Candidate suppliers for this component
  const matchingSuppliers = suppliers.filter((s) => s.part_id === inventoryItem.part_id);
  const currentSupplier =
    matchingSuppliers.find((s) => s.supplier_id === selectedSupplierId) ||
    preferredSup;

  useEffect(() => {
    const rec = calculateSmartOrderRecommendation(inventoryItem, suppliers, autonomousThreshold);
    setRecommendation(rec);
    if (rec.preferred_supplier) {
      setSelectedSupplierId(rec.preferred_supplier.supplier_id);
    }
    setOrderQuantity(rec.recommended_quantity || 100);
  }, [inventoryItem, suppliers, autonomousThreshold]);

  const unitCost = currentSupplier.unit_price || inventoryItem.unit_cost || 1200;
  const expediteFee = shippingMethod === 'AIR_EXPRESS' && currentSupplier.expedite_supported ? (currentSupplier.expedite_fee ?? 0) : 0;
  const totalCost = orderQuantity * unitCost + expediteFee;
  const leadDays = shippingMethod === 'AIR_EXPRESS' ? Math.max(2, currentSupplier.lead_time_days - 2) : currentSupplier.lead_time_days;
  const deliveryDate = new Date(Date.now() + leadDays * 86400000).toISOString().split('T')[0];

  const requiresApproval = totalCost > autonomousThreshold;

  const handleConfirm = () => {
    onConfirmOrder({
      partId: inventoryItem.part_id,
      componentId: inventoryItem.component_id,
      supplier: currentSupplier,
      quantity: orderQuantity,
      shippingMethod,
      totalCost
    });
    onClose();
  };

  const formula = recommendation.formula_breakdown || {
    forecast_demand: 210,
    safety_stock: 90,
    lead_time_demand: 210,
    available_stock: inventoryItem.available_stock ?? inventoryItem.usable_stock ?? 0,
    incoming_stock: inventoryItem.incoming_stock ?? 0,
    on_order_stock: inventoryItem.on_order_stock ?? 0
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-blue-950/40 backdrop-blur-sm font-sans animate-fade-in">
      <div className="bg-nexus-white border border-nexus-blue-20 rounded-[8px] w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-nexus-blue-12 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-nexus-blue-04 text-nexus-blue rounded-[8px] border border-nexus-blue-20">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-nexus-blue font-sans tracking-tight">
                Create Autonomous Purchase Order — {inventoryItem.name || inventoryItem.part_id}
              </h3>
              <p className="text-xs text-nexus-blue-60 font-mono">
                Smart Autonomous Reorder Engine &amp; ERP Synchronization
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-[8px] text-nexus-blue-60 hover:text-nexus-blue hover:bg-nexus-blue-12 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 font-sans">
          {/* Smart Order Formula Breakdown Card */}
          <div className="bg-nexus-white p-4 rounded-[8px] border border-nexus-blue-20 space-y-2 text-xs font-mono">
            <div className="flex items-center justify-between border-b border-nexus-blue-20 pb-2">
              <span className="text-nexus-blue font-bold flex items-center gap-1.5 font-sans">
                <Calculator className="w-4 h-4 text-nexus-blue" /> Smart Order Formula Calculation:
              </span>
              <span className="text-nexus-blue font-bold">
                Recommended: {recommendation.recommended_quantity} Units
              </span>
            </div>

            <p className="text-[11px] text-nexus-blue font-sans leading-relaxed">
              {recommendation.reason || 'Calculated optimal reorder lot size based on 7-day demand forecast and lead time.'}
            </p>

            <div className="grid grid-cols-3 md:grid-cols-6 gap-2 pt-2 text-[10px] text-center border-t border-nexus-blue-20">
              <div className="bg-nexus-white p-2 rounded-[8px] border border-nexus-blue-20">
                <span className="text-nexus-blue-60 block">Forecast (7d)</span>
                <strong className="text-nexus-blue">+{formula.forecast_demand}</strong>
              </div>
              <div className="bg-nexus-white p-2 rounded-[8px] border border-nexus-blue-20">
                <span className="text-nexus-blue-60 block">Safety Stock</span>
                <strong className="text-nexus-blue">+{formula.safety_stock}</strong>
              </div>
              <div className="bg-nexus-white p-2 rounded-[8px] border border-nexus-blue-20">
                <span className="text-nexus-blue-60 block">Lead Demand</span>
                <strong className="text-nexus-blue">+{formula.lead_time_demand}</strong>
              </div>
              <div className="bg-nexus-white p-2 rounded-[8px] border border-nexus-blue-20">
                <span className="text-nexus-blue-60 block">Available</span>
                <strong className="text-nexus-blue">-{formula.available_stock}</strong>
              </div>
              <div className="bg-nexus-white p-2 rounded-[8px] border border-nexus-blue-20">
                <span className="text-nexus-blue-60 block">Incoming</span>
                <strong className="text-nexus-blue">-{formula.incoming_stock}</strong>
              </div>
              <div className="bg-nexus-blue-04 p-2 rounded-[8px] border border-nexus-blue-20">
                <span className="text-nexus-blue block font-bold">Net Target</span>
                <strong className="text-nexus-blue font-bold">{recommendation.recommended_quantity}</strong>
              </div>
            </div>
          </div>

          {/* Form Inputs Grid: Supplier, Quantity, Shipping */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
            {/* Supplier Selector */}
            <div className="space-y-1.5">
              <label className="text-nexus-blue font-bold font-sans flex items-center gap-1">
                <Truck className="w-3.5 h-3.5 text-nexus-blue" /> Select Supplier
              </label>
              <select
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(e.target.value)}
                className="w-full bg-nexus-white border border-nexus-blue-20 rounded-[8px] p-2.5 text-nexus-blue focus:border-nexus-blue focus:outline-none font-sans"
              >
                {matchingSuppliers.map((sup) => (
                  <option key={sup.supplier_id} value={sup.supplier_id}>
                    {sup.supplier_name} (₹{sup.unit_price}/u, {sup.lead_time_days}d)
                  </option>
                ))}
              </select>
              <span className="text-[10px] text-nexus-blue-60 block">
                Reliability: {((currentSupplier.reliability_score || 0.8) * 100).toFixed(0)}% • Quality: {(((currentSupplier.quality_score ?? 0.9)) * 100).toFixed(0)}%
              </span>
            </div>

            {/* Quantity Input */}
            <div className="space-y-1.5">
              <label className="text-nexus-blue font-bold font-sans">
                Order Quantity (Units)
              </label>
              <input
                type="number"
                min={currentSupplier.min_order_quantity || 50}
                step={currentSupplier.pack_size || 50}
                value={orderQuantity}
                onChange={(e) => setOrderQuantity(Math.max(1, parseInt(e.target.value) || 0))}
                className="w-full bg-nexus-white border border-nexus-blue-20 rounded-[8px] p-2.5 text-nexus-blue font-bold focus:border-nexus-blue focus:outline-none"
              />
              <span className="text-[10px] text-nexus-blue-60 block">
                MOQ: {currentSupplier.min_order_quantity || 100} • Pack Size: {currentSupplier.pack_size || 50}
              </span>
            </div>

            {/* Shipping Method */}
            <div className="space-y-1.5">
              <label className="text-nexus-blue font-bold font-sans flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-nexus-blue" /> Shipping Speed
              </label>
              <select
                value={shippingMethod}
                onChange={(e) => setShippingMethod(e.target.value as any)}
                className="w-full bg-nexus-white border border-nexus-blue-20 rounded-[8px] p-2.5 text-nexus-blue focus:border-nexus-blue focus:outline-none font-sans"
              >
                <option value="AIR_EXPRESS">Air Express (2–3 Days)</option>
                <option value="EXPEDITE_TRUCK">Expedite Truck (4–5 Days)</option>
                <option value="STANDARD_FREIGHT">Standard Freight (7–10 Days)</option>
              </select>
              <span className="text-[10px] text-nexus-blue-60 block">
                Estimated Delivery: {deliveryDate}
              </span>
            </div>
          </div>

          {/* Cost & Threshold Breakdown Banner */}
          <div className="bg-nexus-white p-4 rounded-[8px] border border-nexus-blue-20 space-y-2 text-xs font-mono">
            <div className="flex justify-between items-center text-sm">
              <span className="text-nexus-blue font-sans">Total Purchase Value:</span>
              <span className="font-bold text-nexus-blue text-base font-sans tracking-tight">₹{totalCost.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center text-[11px] text-nexus-blue-60 font-sans">
              <span>Autonomous Limit: ₹{autonomousThreshold.toLocaleString()}</span>
              <span>
                {requiresApproval ? (
                  <strong className="text-nexus-blue">Requires SC Lead Approval (&gt;₹150k)</strong>
                ) : (
                  <strong className="text-nexus-blue">Auto-Executable by Autonomous Agent</strong>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div className="p-5 border-t border-nexus-blue-12 flex items-center justify-between bg-nexus-white">
          <button
            onClick={onClose}
            className="px-4 py-2.5 bg-nexus-white hover:bg-nexus-blue-12 text-nexus-blue rounded-[8px] text-xs font-mono font-bold transition-all border border-nexus-blue-20"
          >
            CANCEL
          </button>

          <button
            onClick={handleConfirm}
            className="px-6 py-2.5 bg-nexus-blue hover:bg-nexus-blue-dark text-nexus-white rounded-[8px] text-xs font-mono font-bold transition-all shadow-sm flex items-center space-x-1.5"
          >
            <span>{requiresApproval ? 'SUBMIT FOR APPROVAL' : 'CONFIRM & EXECUTE PO'}</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
