import { InventoryItem, Supplier, SmartOrderRecommendation, PurchaseOrder } from '../types/supplyChain';

export function calculateSmartOrderRecommendation(
  inventory: InventoryItem | undefined,
  suppliers: Supplier[],
  autonomousThreshold: number = 150000
): SmartOrderRecommendation {
  const partId = inventory?.part_id || 'LEFT_HEADLIGHT';
  const name = inventory?.name || 'Component';

  // Find candidate suppliers for this component
  const matchingSuppliers = suppliers.filter(s => s.part_id === partId);
  const preferredSupplier =
    matchingSuppliers.find(s => (s.quality_score ?? 0.95) >= 0.90 && s.reliability_score >= 0.80) ||
    matchingSuppliers[0] || {
      supplier_id: 'SUP-42',
      supplier_name: 'Western Components Ltd',
      component_id: inventory?.component_id || 'COMP-104',
      part_id: partId,
      country: 'India',
      unit_price: inventory?.unit_cost || 1200,
      lead_time_days: 4,
      available_quantity: 600,
      capacity_per_month: 2000,
      quality_score: 0.96,
      reliability_score: 0.91,
      min_order_quantity: 300,
      pack_size: 50,
      certifications: ['ISO-9001', 'Automotive-Grade'],
      contact_email: 'sales@westerncomponents.com',
      expedite_supported: true,
      expedite_fee: 18000
    };

  const dailyBurn = inventory?.daily_usage || 30;
  const leadDays = preferredSupplier.lead_time_days || 4;
  const safetyStock = inventory?.safety_stock || (dailyBurn * 3);
  const leadTimeDemand = dailyBurn * leadDays;
  const forecastDemand = dailyBurn * 7; // 7 days planning horizon
  const productionCommitment = dailyBurn * 4;
  const riskBuffer = preferredSupplier.reliability_score < 0.85 ? Math.round(dailyBurn * 2) : 0;
  const availableStock = inventory?.available_stock ?? inventory?.usable_stock ?? 0;
  const incomingStock = inventory?.incoming_stock ?? 0;

  // Formula:
  // Raw Req = Forecast Demand + Safety Stock + Production Commitment + Lead Time Demand + Risk Buffer - Available - Incoming
  const rawRequired =
    forecastDemand + safetyStock + productionCommitment + leadTimeDemand + riskBuffer - availableStock - incomingStock;

  // Apply MOQ & pack size rounding
  const moq = preferredSupplier.min_order_quantity || 100;
  const packSize = preferredSupplier.pack_size || 50;

  let calculatedQty = Math.max(moq, rawRequired);
  calculatedQty = Math.ceil(calculatedQty / packSize) * packSize;

  // Ensure within supplier available capacity
  calculatedQty = Math.min(calculatedQty, preferredSupplier.available_quantity || 1000);

  const unitCost = preferredSupplier.unit_price || inventory?.unit_cost || 1200;
  const totalCost = calculatedQty * unitCost;
  const expediteFee = preferredSupplier.expedite_supported ? (preferredSupplier.expedite_fee ?? 0) : 0;
  const effectiveCost = totalCost + (availableStock === 0 ? expediteFee : 0);

  const deliveryDate = new Date(Date.now() + leadDays * 86400000).toISOString().split('T')[0];

  return {
    part_id: partId,
    component_name: name,
    recommended_quantity: calculatedQty,
    formula_breakdown: {
      forecast_demand: forecastDemand,
      safety_stock: safetyStock,
      production_commitment: productionCommitment,
      lead_time_demand: leadTimeDemand,
      risk_buffer: riskBuffer,
      available_stock: availableStock,
      incoming_stock: incomingStock
    },
    preferred_supplier: preferredSupplier,
    estimated_unit_cost: unitCost,
    estimated_total_cost: effectiveCost,
    estimated_lead_days: leadDays,
    estimated_delivery_date: deliveryDate,
    reason: `Current available inventory (${availableStock} units) is below safety stock requirement (${safetyStock} units). Calculated lead-time demand of ${leadTimeDemand} units and 7-day forecast demand of ${forecastDemand} units requiring ${calculatedQty} units from ${preferredSupplier.supplier_name}.`,
    approval_required: effectiveCost > autonomousThreshold
  };
}

export function createNewPurchaseOrder(
  partId: string,
  componentId: string,
  supplier: Supplier,
  quantity: number,
  shippingMethod: PurchaseOrder['shipping_method'] = 'AIR_EXPRESS',
  autonomousThreshold: number = 150000
): PurchaseOrder {
  const unitPrice = supplier.unit_price;
  const totalValue = quantity * unitPrice + (shippingMethod === 'AIR_EXPRESS' ? (supplier.expedite_fee || 0) : 0);
  const leadDays = shippingMethod === 'AIR_EXPRESS' ? Math.max(2, supplier.lead_time_days - 2) : supplier.lead_time_days;
  const deliveryDate = new Date(Date.now() + leadDays * 86400000).toISOString().split('T')[0];

  return {
    po_id: `PO-${Math.floor(10000 + Math.random() * 90000)}`,
    component_id: componentId,
    part_id: partId,
    supplier_id: supplier.supplier_id,
    supplier_name: supplier.supplier_name,
    quantity,
    unit_price: unitPrice,
    total_value: totalValue,
    currency: 'INR (₹)',
    order_date: new Date().toISOString().split('T')[0],
    expected_delivery: deliveryDate,
    status: 'in_transit',
    priority: totalValue > autonomousThreshold ? 'HIGH' : 'MEDIUM',
    shipping_method: shippingMethod,
    approval_required_above: autonomousThreshold,
    created_by: 'SupplyShield Autonomous Agent',
    created_at: new Date().toISOString(),
    expedite_available: supplier.expedite_supported,
    expedite_fee: supplier.expedite_fee,
    expedite_delivery_days: leadDays
  };
}

export function calculateSmartOrder(
  availableStock: number,
  incomingStock: number,
  onOrderStock: number = 0,
  dailyUsage: number = 30,
  leadTimeDays: number = 7,
  safetyStock: number = 90,
  minOrderQuantity: number = 100,
  packSize: number = 50,
  supplierReliability: number = 0.85
): {
  recommended_quantity: number;
  raw_required: number;
  forecast_7d: number;
  lead_time_demand: number;
} {
  const forecastDemand = dailyUsage * 7;
  const leadTimeDemand = dailyUsage * leadTimeDays;
  const productionCommitment = dailyUsage * 4;
  const riskBuffer = supplierReliability < 0.85 ? Math.ceil(dailyUsage * 2) : 0;

  const rawRequired =
    forecastDemand +
    safetyStock +
    productionCommitment +
    leadTimeDemand +
    riskBuffer -
    availableStock -
    incomingStock -
    onOrderStock;

  let recommended = Math.max(minOrderQuantity, rawRequired);
  recommended = Math.ceil(recommended / packSize) * packSize;

  return {
    recommended_quantity: availableStock === 0 || rawRequired > 0 ? recommended : 0,
    raw_required: rawRequired,
    forecast_7d: forecastDemand,
    lead_time_demand: leadTimeDemand
  };
}

